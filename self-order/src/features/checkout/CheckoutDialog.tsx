import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useApolloClient } from '@apollo/client';
import { Button, Dialog, Spinner, cn, useThemeColor } from 'heroui-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  QrCode,
  ReceiptText,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useCSSVariable } from 'uniwind';
import { lineTotal } from '@/src/features/cart/totals';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { QuizBanner } from '@/src/features/quiz/QuizBanner';
import { useServiceRequest } from '@/src/features/service/useServiceRequest';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { formatMoney } from '@/src/lib/format';
import { IOrder, ITransaction } from '@/src/types';
import { Image } from '@/src/ui/Image';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { Text } from '@/src/ui/Text';
import { useCheckout } from './checkoutStore';
import { ReceiptPicker, useReceipt } from './ReceiptPicker';
import { PaymentMethod, usePayment } from './usePayment';

// After paying, the menu comes back by itself for the next guest
const BACK_TO_MENU_SECONDS = 30;
// These banks send the QR as base64 image data; the others send an image URL
const BASE64_QR = ['QPay', 'QPay2', 'MPY'];

/**
 * Paying for an order, in one dialog and one column: the amount, the receipt and a method → QR /
 * card → done. Only a payment leads to done (with the eBarimt receipt); an order sent to be paid
 * later just shows in the order panel.
 */
export const CheckoutDialog = () => {
  const apollo = useApolloClient();
  const window = useWindowDimensions();
  const orderId = useCheckout((s) => s.orderId);
  const preview = useCheckout((s) => s.preview);
  // Scanning the QR with a phone means no touches here: no screensaver over a payment
  useHoldScreensaver(!!orderId);

  const close = () => {
    useCheckout.getState().close();
    // The order bar and sheet show the new state
    apollo.refetchQueries({ include: [GET_TABLET_ORDERS] }).catch(() => {});
  };

  return (
    <Dialog isOpen={!!orderId} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        {/* No closing by tapping outside: it's too easy to lose a payment that way. And no open or
            close animation: heroui's is a layout animation, and this dialog's content changes while it
            runs (the methods replace their spinner as the order arrives). That is the likeliest cause
            of the black screen some merchants' tablets showed on Pay. */}
        <Dialog.Overlay isCloseOnPress={false} animation={false} />
        {/* 820×700, smaller on a smaller screen */}
        <Dialog.Content
          animation={false}
          isSwipeable={false}
          className="self-center overflow-hidden p-0"
          style={{ width: Math.min(820, window.width - 48), height: Math.min(700, window.height - 40) }}
        >
          {/* A fresh checkout per order */}
          {orderId && <Checkout key={orderId} orderId={orderId} preview={preview} onClose={close} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

const Checkout = ({ orderId, preview, onClose }: { orderId: string; preview: IOrder | null; onClose: () => void }) => {
  const payment = usePayment(orderId, preview);
  const receipt = useReceipt();
  const { order, step } = payment;

  // Paying needs the server's copy; once paid, the done page stays up even if a reload fails
  if (payment.failed && (step !== 'done' || !order)) return <LoadFailed onRetry={payment.retry} onClose={onClose} />;

  if (payment.loading || !order) {
    return (
      <View className="flex-1 items-center justify-center">
        <LogoLoader />
      </View>
    );
  }

  if (step === 'done') return <Done order={order} onClose={onClose} />;

  return (
    <View className="flex-1 gap-5.5 px-8 py-7">
      {step === 'pay' && <PayStep payment={payment} receipt={receipt} onClose={onClose} />}
      {step === 'qr' && <QrStep payment={payment} />}
      {step === 'card' && <CardStep payment={payment} />}
    </View>
  );
};

type Payment = ReturnType<typeof usePayment>;

/**
 * The order couldn't be opened: no connection, or the server won't give this tablet an order placed
 * before it signed in again. The guest can try again, or ask staff for the bill instead.
 */
const LoadFailed = ({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) => {
  const { t } = useTranslation('language');
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const { send, pending } = useServiceRequest();

  return (
    <View className="flex-1 gap-5.5 px-8 py-7">
      <StepHeader title={t('mainPage.checkoutTitle')} onClose={onClose} />
      <View className="flex-1 items-center justify-center gap-5">
        <View className="size-24 items-center justify-center rounded-full bg-surface-secondary">
          <ReceiptText size={44} color={muted} strokeWidth={1.8} />
        </View>
        {/* Full width: Android cuts off a centred label sized to its own text */}
        <Text className="self-stretch px-10 text-center text-xl leading-8">{t('mainPage.orderLoadFailed')}</Text>
      </View>
      <View className="flex-row gap-3">
        <Button
          size="lg"
          variant="outline"
          className="h-15 flex-1 rounded-[18px] border-2 border-foreground"
          isDisabled={!!pending}
          onPress={() => send('bill')}
        >
          {pending === 'bill' ? <Spinner /> : <ReceiptText size={20} color={foreground} />}
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.request_bill')}
          </Button.Label>
        </Button>
        <Button size="lg" className="h-15 flex-1 rounded-[18px]" onPress={onRetry}>
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.retry')}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
};

// A charge in effect (A = active; inactive, pending and cancelled ones aren't in the total)
const ACTIVE_CHARGE = 'A';

/**
 * What there is to pay, big, with the charges and city tax in it always in view (fees out of sight
 * are what guests distrust); the dishes only when the guest asks (Дэлгэрэнгүй).
 */
const AmountCard = ({ order }: { order: IOrder }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const [details, setDetails] = useState(false);
  // All the order's charges together, on one line
  const charges = (order.charges ?? [])
    .filter((charge) => charge.state === ACTIVE_CHARGE)
    .reduce((sum, charge) => sum + Number(charge.amount), 0);
  const Chevron = details ? ChevronUp : ChevronDown;

  return (
    <View className="gap-4 rounded-3xl bg-background p-5.5">
      <View className="flex-row items-end justify-between gap-4">
        <View className="gap-1">
          <Text className="text-muted">{t('mainPage.AmountPaid')}</Text>
          <Text className="text-5xl font-bold tracking-tight">{formatMoney(order.grandTotal)}</Text>
        </View>
        <Button variant="outline" className="h-12 rounded-2xl px-4" onPress={() => setDetails((open) => !open)}>
          <Button.Label numberOfLines={1}>{t('mainPage.details')}</Button.Label>
          <Chevron size={18} color={foreground} />
        </Button>
      </View>
      {details && (
        <View className="gap-3 border-t border-border pt-4">
          {order.items
            .filter((item) => item.state !== 'RETURN')
            .map((item) => (
              <View key={item.id ?? item.uuid} className="flex-row justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text>
                    {item.quantity} × {item.name}
                  </Text>
                  {!!item.comment && (
                    <Text className="text-sm italic text-muted" numberOfLines={2}>
                      {item.comment}
                    </Text>
                  )}
                </View>
                <Text className="font-semibold">{formatMoney(item.total ?? lineTotal(item))}</Text>
              </View>
            ))}
        </View>
      )}
      {/* Charges and city tax are part of the total, each on its own line */}
      {(charges > 0 || order.cityTax > 0) && (
        <View className="gap-1.5 border-t border-border pt-3">
          {charges > 0 && <SummaryRow label={t('mainPage.charge')} amount={charges} />}
          {order.cityTax > 0 && <SummaryRow label={t('mainPage.cityTax')} amount={order.cityTax} />}
        </View>
      )}
    </View>
  );
};

const SummaryRow = ({ label, amount }: { label: string; amount: number }) => (
  <View className="flex-row justify-between gap-3">
    <Text className="min-w-0 flex-1 text-muted" numberOfLines={2}>
      {label}
    </Text>
    <Text className="font-semibold">{formatMoney(amount)}</Text>
  </View>
);

const StepHeader = ({ title, onBack, onClose }: { title: string; onBack?: () => void; onClose?: () => void }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  return (
    <View className="flex-row items-center gap-3.5">
      {onBack && (
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 rounded-full"
          onPress={onBack}
          accessibilityLabel={t('mainPage.GoBack')}
        >
          <ArrowLeft size={22} color={foreground} />
        </Button>
      )}
      <Text className="flex-1 text-3xl font-bold tracking-tight" numberOfLines={1}>
        {title}
      </Text>
      {onClose && (
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 rounded-full"
          onPress={onClose}
          accessibilityLabel={t('mainPage.close')}
        >
          <X size={22} color={foreground} />
        </Button>
      )}
    </View>
  );
};

/** Step 1: the eBarimt receipt and how to pay. Tapping a method starts the payment. */
const PayStep = ({
  payment,
  receipt,
  onClose,
}: {
  payment: Payment;
  receipt: ReturnType<typeof useReceipt>;
  onClose: () => void;
}) => {
  const { t } = useTranslation('language');
  const vatBranch = useSessionStore((s) => s.participant?.vat === true);

  return (
    <>
      <StepHeader title={t('mainPage.checkoutTitle')} onClose={onClose} />
      {/* Scrolls if the details, a taxpayer's register and the methods don't fit */}
      <ScrollView className="flex-1" contentContainerClassName="gap-6" keyboardShouldPersistTaps="handled">
        {!!payment.order && <AmountCard order={payment.order} />}
        {vatBranch && <ReceiptPicker receipt={receipt} />}
        <View className="gap-3">
          <Text className="text-lg font-bold">{t('mainPage.paymentMethod')}</Text>
          {payment.upToDate ? (
            <View className="flex-row flex-wrap gap-3">
              {payment.methods.map(({ method, paymentId }) => (
                <MethodTile
                  key={method}
                  method={method}
                  loading={payment.pendingMethod === method}
                  disabled={!!payment.pendingMethod || !receipt.ready}
                  onPress={() => payment.select(method, paymentId, receipt.receipt)}
                />
              ))}
            </View>
          ) : (
            <View className="h-36 items-center justify-center rounded-3xl border border-border bg-surface">
              <Spinner />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
};

// М Банк's brand green, behind its wordmark
const MBANK_GREEN = '#21CDA8';
// Android's own touch ripple: the tiles are plain views, so the dialog has less to set up as it opens
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

type MethodLook = {
  name: string;
  mark: ReactNode;
  /** The mark's background when it's a brand colour; otherwise the neutral surface */
  markColor?: string;
};

/** How each payment method is shown: its name and its mark (brand logo or an icon). */
const useMethodLook = (method: PaymentMethod): MethodLook => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const icon = (Icon: typeof QrCode) => <Icon size={36} color={foreground} />;
  switch (method) {
    case 'MPY':
      return {
        name: 'М Банк',
        // The "M pay" wordmark in white with a see-through box, so the green shows inside it. (Tinting
        // the black original turned its white box solid and hid the M.)
        mark: <Image source={require('@/assets/icon/mpay-white.png')} className="h-7 w-15" contentFit="contain" />,
        markColor: MBANK_GREEN,
      };
    case 'Toki':
      return {
        name: 'Toki',
        // Already a yellow square: it fills the whole mark
        mark: <Image source={require('@/assets/icon/new_toki.png')} className="size-full" contentFit="cover" />,
      };
    case 'MST':
      return { name: 'QR Pay', mark: icon(QrCode) };
    case 'QPay':
      return { name: 'QPay', mark: icon(QrCode) };
    case 'MCS':
      return { name: t('mainPage.card'), mark: icon(CreditCard) };
  }
};

const MethodTile = ({
  method,
  loading,
  disabled,
  onPress,
}: {
  method: PaymentMethod;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const look = useMethodLook(method);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={RIPPLE}
      accessibilityRole="button"
      accessibilityLabel={look.name}
      accessibilityState={{ disabled }}
      // Mark on top and the name under it, so the logo can be big and the text still has the full width
      className={cn(
        'h-36 w-[31.8%] items-center justify-center gap-3 overflow-hidden rounded-3xl border border-border bg-surface px-3',
        disabled && !loading && 'opacity-50',
      )}
    >
      <View
        className="size-17 items-center justify-center overflow-hidden rounded-[20px] bg-surface-secondary"
        style={look.markColor ? { backgroundColor: look.markColor } : undefined}
      >
        {loading ? <Spinner /> : look.mark}
      </View>
      {/* Full card width: Android cuts off a centred label sized to its own text */}
      <Text className="self-stretch text-center text-lg font-bold" numberOfLines={1}>
        {look.name}
      </Text>
    </Pressable>
  );
};

const qrImage = (transaction?: ITransaction) => {
  const image = transaction?.image;
  const link = transaction?.links?.[0]?.link;
  if (image) return BASE64_QR.includes(transaction?.type ?? '') ? `data:image/png;base64,${image}` : image;
  return link ? `data:image/png;base64,${link}` : null;
};

/** "Waiting for payment" under the QR and the card reader. */
const Waiting = () => {
  const { t } = useTranslation('language');
  const pending = useCSSVariable('--color-pending') as string;
  return (
    <View className="flex-row items-center gap-2.5 rounded-full bg-pending-soft px-4.5 py-3">
      <Clock size={20} color={pending} />
      <Text className="font-semibold text-pending">{t('mainPage.waitingPayment')}</Text>
    </View>
  );
};

/** Step 2a: the bank QR. The subscription moves on by itself once paid; "Check payment" is the fallback. */
const QrStep = ({ payment }: { payment: Payment }) => {
  const { t } = useTranslation('language');
  const look = useMethodLook(payment.method ?? 'QPay');
  const qr = qrImage(payment.transaction);
  return (
    <>
      <StepHeader title={look.name} onBack={payment.back} />
      <View className="flex-1 items-center justify-center gap-4.5">
        <Text className="text-4xl font-bold tracking-tight">{formatMoney(payment.order?.grandTotal ?? 0)}</Text>
        {/* QR codes need a white background to scan, also in dark mode */}
        <View className="rounded-3xl border border-border bg-white p-4">
          {qr ? (
            <Image source={{ uri: qr }} className="size-64" contentFit="contain" />
          ) : (
            <View className="size-64 items-center justify-center">
              <Spinner />
            </View>
          )}
        </View>
        <Text className="text-xl font-semibold">{t('mainPage.scanWithBank')}</Text>
        <Waiting />
      </View>
      <Button
        size="lg"
        variant="outline"
        className="h-15 rounded-[18px] border-2 border-foreground"
        isDisabled={payment.checking}
        onPress={payment.checkPaid}
      >
        {payment.checking ? (
          <Spinner />
        ) : (
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.checkPayment')}
          </Button.Label>
        )}
      </Button>
    </>
  );
};

/** Step 2b: the card reader app is open; its result comes back to usePayment. */
const CardStep = ({ payment }: { payment: Payment }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  return (
    <>
      <StepHeader title={t('mainPage.card')} onBack={payment.back} />
      <View className="flex-1 items-center justify-center gap-4.5">
        <Text className="text-4xl font-bold tracking-tight">{formatMoney(payment.order?.grandTotal ?? 0)}</Text>
        <View className="size-64 items-center justify-center rounded-[28px] bg-background">
          <CreditCard size={110} color={foreground} strokeWidth={1.2} />
        </View>
        <Text className="text-xl font-semibold">{t('mainPage.tapCard')}</Text>
        <Waiting />
      </View>
    </>
  );
};

/**
 * Step 3, once paid: thanks, the order number, the eBarimt receipt and the Mbank quiz. Back to the
 * menu by itself after 30 s.
 */
const Done = ({ order, onClose }: { order: IOrder; onClose: () => void }) => {
  const { t } = useTranslation('language');
  const positive = useCSSVariable('--color-positive') as string;
  const [seconds, setSeconds] = useState(BACK_TO_MENU_SECONDS);

  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    const leave = setTimeout(onClose, BACK_TO_MENU_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(leave);
    };
  }, []);

  const hasReceipt = !!order.vatBillId && !!order.vatData;

  return (
    <View className="flex-1 flex-row items-center gap-14 p-12">
      <View className="flex-1 gap-4.5">
        <View className="size-24 items-center justify-center rounded-full bg-positive-soft">
          <Check size={52} color={positive} strokeWidth={2.4} />
        </View>
        <Text className="text-[44px] font-bold tracking-tight">{t('mainPage.thanks')}</Text>
        <Text className="text-xl leading-7 text-muted">{t('mainPage.paidSent')}</Text>
        <View className="flex-row items-baseline gap-3">
          <Text className="text-muted">{t('mainPage.orderNumberLabel')}</Text>
          <Text className="text-[40px] font-bold tracking-tight">#{order.number?.slice(-4)}</Text>
        </View>
        <Button size="lg" className="mt-3 h-16 self-start rounded-[20px] px-8" onPress={onClose}>
          <Button.Label numberOfLines={1} className="text-lg font-bold">
            {t('mainPage.backToMenuIn', { seconds })}
          </Button.Label>
        </Button>
        {/* The quiz opens over the menu, so this dialog closes first */}
        <View className="mt-2">
          <QuizBanner onPlay={onClose} />
        </View>
      </View>

      {hasReceipt && (
        <View className="w-75 items-center gap-3.5 rounded-3xl border border-border p-6">
          <Text className="text-lg font-bold">{t('mainPage.eBarimt')}</Text>
          {/* QR codes need a white background to scan, also in dark mode */}
          <View className="rounded-2xl bg-white p-3">
            <QRCode value={order.vatData} size={180} />
          </View>
          <ReceiptRow label={t('mainPage.vatBillId')} value={order.vatBillId} />
          {!!order.vatLottery && <ReceiptRow label={t('mainPage.vatLottery')} value={order.vatLottery} />}
          <ReceiptRow label={t('mainPage.vatAmount')} value={formatMoney(Number(order.vatIncludeAmount))} />
        </View>
      )}
    </View>
  );
};

const ReceiptRow = ({ label, value }: { label: string; value: string }) => (
  <View className="w-full flex-row justify-between gap-4">
    <Text className="text-sm text-muted">{label}</Text>
    <Text className="shrink text-right text-sm font-semibold" numberOfLines={2}>
      {value}
    </Text>
  </View>
);
