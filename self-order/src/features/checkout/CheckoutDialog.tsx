import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useApolloClient } from '@apollo/client';
import { Button, useThemeColor } from 'heroui-native';
import { Check, ChevronDown, ChevronUp, CircleAlert, Clock, CreditCard, ReceiptText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useCSSVariable } from 'uniwind';
import { PAYMENT_TYPE } from '@/src/constants';
import { useCartStore } from '@/src/features/cart/cartStore';
import { lineTotal } from '@/src/features/cart/totals';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { QuizBanner } from '@/src/features/quiz/QuizBanner';
import { useServiceRequest } from '@/src/features/service/useServiceRequest';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { formatMoney } from '@/src/lib/format';
import { IOrder, ITransaction } from '@/src/types';
import { Appear } from '@/src/ui/Appear';
import { Image } from '@/src/ui/Image';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { MotionDialog } from '@/src/ui/MotionDialog';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { useCheckout } from './checkoutStore';
import { MethodTile, Tile, useMethodLook } from './MethodTile';
import { ReceiptPicker, useReceipt } from './ReceiptPicker';
import { StepHeader } from './StepHeader';
import { UPOINT_LOGO, UpointSignIn } from './UpointSignIn';
import { UpointSpend } from './UpointSpend';
import { amountDue, usePayment } from './usePayment';

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
  const wide = useCheckout((s) => s.wide);
  // Scanning the QR with a phone means no touches here: no screensaver over a payment
  useHoldScreensaver(!!orderId);
  // The last order stays on the card while it fades out
  const last = useRef({ orderId, preview });
  if (orderId) last.current = { orderId, preview };
  const shown = last.current;

  const close = () => {
    const { cart, settled } = useCheckout.getState();
    // Left before paying anything: the order isn't going ahead, so its items go back in the cart
    if (cart && !settled) useCartStore.getState().restore(cart);
    useCheckout.getState().close();
    // The order bar and sheet show the new state
    apollo.refetchQueries({ include: [GET_TABLET_ORDERS] }).catch(() => {});
  };

  return (
    // No closing by tapping outside: it's too easy to lose a payment that way. 820×700, or 1200×740 for
    // the U-Point discounts beside the payment; smaller on a smaller screen.
    <MotionDialog
      isOpen={!!orderId}
      onOpenChange={(open) => !open && close()}
      closeOnBackdrop={false}
      className="overflow-hidden p-0"
      style={{
        width: Math.min(wide ? 1200 : 820, window.width - 48),
        height: Math.min(wide ? 740 : 700, window.height - 40),
      }}
    >
      {/* A fresh checkout per order */}
      {shown.orderId && (
        <Checkout key={shown.orderId} orderId={shown.orderId} preview={shown.preview} onClose={close} />
      )}
    </MotionDialog>
  );
};

const Checkout = ({ orderId, preview, onClose }: { orderId: string; preview: IOrder | null; onClose: () => void }) => {
  // Sent to be paid at the cashier: the checkout closes, the order panel shows it unpaid
  const payment = usePayment(orderId, preview, () => {
    useCheckout.getState().setSettled();
    onClose();
  });
  const receipt = useReceipt();
  const { order, step } = payment;

  // Money moved on the order, or it's paid: closing no longer puts its items back in the cart
  useEffect(() => {
    if (payment.settled || step === 'done') useCheckout.getState().setSettled();
  }, [payment.settled, step]);

  // Paying needs the server's copy; once paid, the done page stays up even if a reload fails
  const failed = payment.failed && (step !== 'done' || !order);
  const loading = !failed && (payment.loading || !order);
  const phase = failed ? 'failed' : loading ? 'loading' : step;

  // The discounts beside the payment need the wide dialog; every other step the usual one
  useEffect(() => {
    useCheckout.getState().setWide(phase === 'spend');
  }, [phase]);

  // Each step fades in over the last (a shared value on a fresh view, never a layout animation)
  return (
    <Appear key={phase} duration={180} className="flex-1">
      {failed ? (
        <LoadFailed onRetry={payment.retry} onClose={onClose} />
      ) : loading || !order ? (
        <View className="flex-1 items-center justify-center">
          <LogoLoader />
        </View>
      ) : step === 'done' ? (
        <Done order={order} onClose={onClose} />
      ) : step === 'spend' ? (
        // Its own padding: the coupon code dialog covers the whole checkout
        <UpointSpend payment={payment} receipt={receipt} onClose={onClose} />
      ) : (
        <View className="flex-1 gap-5.5 px-8 py-7">
          {step === 'pay' && <PayStep payment={payment} receipt={receipt} onClose={onClose} />}
          {step === 'qr' && <QrStep payment={payment} />}
          {step === 'card' && <CardStep payment={payment} />}
          {step === 'upoint' && <UpointSignIn payment={payment} />}
        </View>
      )}
    </Appear>
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
// Parts of the order paid with U-Point points or a U-Point coupon
const REWARD_PAYMENTS = [PAYMENT_TYPE.UPT, PAYMENT_TYPE.UPC];

/**
 * What there is to pay, big, with the charges and city tax in it always in view (fees out of sight
 * are what guests distrust); the dishes only when the guest asks (Дэлгэрэнгүй). Once part is paid
 * with U-Point, the total and that part show too, and the big amount is what's left.
 */
const AmountCard = ({ order }: { order: IOrder }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const [details, setDetails] = useState(false);
  // All the order's charges together, on one line
  const charges = (order.charges ?? [])
    .filter((charge) => charge.state === ACTIVE_CHARGE)
    .reduce((sum, charge) => sum + Number(charge.amount), 0);
  const rewardsPaid = (order.transactions ?? []).filter(
    (tx) => tx.state === 'PAID' && REWARD_PAYMENTS.includes(tx.type),
  );
  const Chevron = details ? ChevronUp : ChevronDown;

  return (
    <View className="gap-4 rounded-3xl bg-background p-5.5">
      <View className="flex-row items-end justify-between gap-4">
        <View className="gap-1">
          <Text className="text-muted">{t('mainPage.AmountPaid')}</Text>
          <Text className="text-5xl font-bold tracking-tight">{formatMoney(amountDue(order))}</Text>
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
      {/* Paid with U-Point: the whole total, then each part paid */}
      {rewardsPaid.length > 0 && (
        <View className="gap-1.5 border-t border-border pt-3">
          <SummaryRow label={t('mainPage.Total')} amount={order.grandTotal} />
          {rewardsPaid.map((tx) => (
            <SummaryRow
              key={tx.id}
              label={tx.type === PAYMENT_TYPE.UPC ? t('mainPage.coupon') : 'U-Point'}
              amount={Number(tx.amount)}
              minus
            />
          ))}
        </View>
      )}
    </View>
  );
};

const SummaryRow = ({ label, amount, minus }: { label: string; amount: number; minus?: boolean }) => (
  <View className="flex-row justify-between gap-3">
    <Text className="min-w-0 flex-1 text-muted" numberOfLines={2}>
      {label}
    </Text>
    <Text className="font-semibold">
      {minus ? '−' : ''}
      {formatMoney(amount)}
    </Text>
  </View>
);

/**
 * Step 1: what there is to pay, U-Point before anything else ("use it before paying"), the eBarimt
 * receipt and how to pay. Tapping a method starts the payment. Signed in to U-Point by phone, the
 * guest only collects points: the U-Point part goes, and what's left to pay shows by the methods.
 */
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
  const collectOnly = payment.upoint?.via === 'phone';

  return (
    <>
      <StepHeader title={t('mainPage.checkoutTitle')} onClose={onClose} />
      {/* Scrolls if the details, a taxpayer's register and the methods don't fit */}
      <ScrollView className="flex-1" contentContainerClassName="gap-6" keyboardShouldPersistTaps="handled">
        {!!payment.order && <AmountCard order={payment.order} />}
        {payment.upToDate && !collectOnly && <Rewards payment={payment} disabled={!receipt.ready} />}
        {vatBranch && <ReceiptPicker receipt={receipt} />}
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-lg font-bold">{t('mainPage.paymentMethod')}</Text>
            {collectOnly && (
              <View className="flex-row items-baseline gap-1.5">
                <Text className="text-muted">{t('mainPage.toPayShort')}</Text>
                <Text className="font-bold">{formatMoney(payment.amountDue)}</Text>
              </View>
            )}
          </View>
          {payment.upToDate ? (
            // Fading in over the spinner they replace
            <Appear duration={180} className="flex-row flex-wrap gap-3">
              {payment.methods.map(({ method, paymentId }) => (
                <MethodTile
                  key={method}
                  method={method}
                  loading={payment.pendingMethod === method}
                  disabled={!!payment.pendingMethod || !receipt.ready}
                  onPress={() => payment.pay(method, paymentId, receipt.receipt)}
                />
              ))}
            </Appear>
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

/**
 * U-Point, above the payment methods, with a reminder to use it before paying (coupons and points come
 * off first). One tile: signing in, or back to the discounts once signed in. Points spent on the order
 * already can't be spent again.
 */
const Rewards = ({ payment, disabled }: { payment: Payment; disabled: boolean }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  if (!payment.rewards.upoint) return null;
  const state = payment.upointSpent ? 'spent' : payment.upoint ? 'signed' : 'none';

  return (
    <Appear duration={180} className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-bold">{t('mainPage.rewards')}</Text>
        <View className="flex-row items-center gap-2 rounded-full bg-pending-soft px-3.5 py-1.5">
          <CircleAlert size={16} color={foreground} />
          <Text className="text-sm font-semibold">{t('mainPage.rewardsHint')}</Text>
        </View>
      </View>
      <View className="flex-row">
        <Tile
          // Drawn anew when it changes: a fill or border changed in place can hide the label
          key={`upoint-${state}`}
          name={state === 'spent' ? t('mainPage.upointSpent') : state === 'signed' ? 'U-Point ✓' : 'U-Point'}
          mark={<Image source={UPOINT_LOGO} className="size-12" contentFit="contain" />}
          // Outlined in yellow to catch the eye, as long as it can be used
          selected={state !== 'spent'}
          disabled={disabled || !!payment.pendingMethod || state === 'spent'}
          onPress={payment.openUpoint}
        />
      </View>
    </Appear>
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
        {/* The payment's own amount: what's left after any U-Point discounts */}
        <Text className="text-4xl font-bold tracking-tight">
          {formatMoney(Number(payment.transaction?.amount) || payment.amountDue)}
        </Text>
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
        <Text className="text-4xl font-bold tracking-tight">
          {formatMoney(Number(payment.transaction?.amount) || payment.amountDue)}
        </Text>
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
