import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useApolloClient } from '@apollo/client';
import { Button, cn, useThemeColor } from 'heroui-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCSSVariable } from 'uniwind';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { CHECK_UPOINT_COUPON } from '@/src/graphql/queries';
import { formatMoney } from '@/src/lib/format';
import { IUpointCoupon } from '@/src/types';
import { Appear } from '@/src/ui/Appear';
import { Image } from '@/src/ui/Image';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { CodeKeyboard, applyKey } from './Keypad';
import { MethodTile } from './MethodTile';
import { ReceiptPicker, useReceipt } from './ReceiptPicker';
import { StepHeader } from './StepHeader';
import { Note, StepBadge, UPOINT_LOGO, maskTail } from './UpointSignIn';
import { PaymentMethod, UpointMode, usePayment } from './usePayment';

const COUPON_MAX_LENGTH = 32;

type Payment = ReturnType<typeof usePayment>;

/**
 * Signed in to U-Point by QR or card: the discounts (left) beside the payment (right), on one screen.
 * The guest collects or spends points (collect unless they choose), picks coupons, and sees what's
 * left to pay as they go. Nothing is applied until "Pay": coupons, then points, then the method.
 */
export const UpointSpend = ({
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
  const [accentForeground, muted] = useThemeColor(['accent-foreground', 'muted']);
  const [chosen, setChosen] = useState<{ method: PaymentMethod; paymentId: string } | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);

  const { upoint, discounts } = payment;
  if (!upoint) return null;

  // Coupons and points cover it all: no method needed
  const nothingLeft = discounts.toPay <= 0;
  const canPay = !payment.paying && receipt.ready && (nothingLeft || !!chosen);
  const balance = Math.floor(Number(upoint.account.balance ?? 0));

  return (
    <View className="flex-1">
      <View className="flex-1 gap-5 px-8 py-7">
        <StepHeader
          title={t('mainPage.checkoutTitle')}
          onBack={payment.back}
          onClose={onClose}
          extra={
            <View className="h-11 flex-row items-center gap-2 rounded-full bg-surface-secondary px-3.5">
              <Image source={UPOINT_LOGO} className="size-6" contentFit="contain" />
              <Text className="font-semibold text-muted">{maskTail(upoint.account.code || upoint.account.phone)}</Text>
            </View>
          }
        />

        <View className="flex-1 flex-row gap-6">
          {/* 1. The discounts */}
          <View className="flex-1 gap-4">
            <View className="flex-row items-center gap-2.5">
              <StepBadge n={1} />
              <Text className="text-lg font-bold">{t('mainPage.rewards')}</Text>
              <View className="rounded-full bg-pending-soft px-3 py-1">
                <Text className="text-xs font-semibold">{t('mainPage.beforePayment')}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3.5 rounded-3xl bg-background p-4">
              <View className="size-13 items-center justify-center rounded-2xl bg-white">
                <Image source={UPOINT_LOGO} className="size-9" contentFit="contain" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-muted">{t('mainPage.upointBalance')}</Text>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-3xl font-bold">{balance.toLocaleString('en-US')}</Text>
                  <Text className="font-semibold text-muted">{t('mainPage.points')}</Text>
                </View>
              </View>
              <ModeSwitch
                mode={payment.mode}
                onChange={payment.setMode}
                spendDisabled={balance < 1 || payment.upointSpent || payment.paying}
              />
            </View>

            {!!payment.rewards.coupon && (
              <>
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-lg font-bold">{t('mainPage.availableCoupons')}</Text>
                  <Pressable
                    onPress={() => setCouponOpen(true)}
                    disabled={payment.paying}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <Text className="font-bold underline">{t('mainPage.addCouponCode')}</Text>
                  </Pressable>
                </View>
                <ScrollView className="flex-1" contentContainerClassName="gap-2.5">
                  {payment.coupons.length > 0 ? (
                    payment.coupons.map((coupon) => {
                      const selected = payment.selectedCoupons.includes(coupon.code);
                      return (
                        <CouponRow
                          // Drawn anew when chosen: a fill changed in place can hide the label
                          key={`${coupon.code}-${selected}`}
                          coupon={coupon}
                          selected={selected}
                          locked={payment.appliedCoupons.includes(coupon.code) || payment.paying}
                          onToggle={() => payment.toggleCoupon(coupon.code)}
                        />
                      );
                    })
                  ) : (
                    <Text className="self-stretch py-6 text-center" style={{ color: muted }}>
                      {t('mainPage.couponNone')}
                    </Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>

          <View className="w-px bg-border" />

          {/* 2. The payment */}
          <View className="w-125 gap-4">
            <View className="flex-row items-center gap-2.5">
              <StepBadge n={2} />
              <Text className="text-lg font-bold">{t('mainPage.checkoutTitle')}</Text>
            </View>
            <ScrollView className="flex-1" contentContainerClassName="gap-4">
              <View className="gap-1.5 rounded-3xl bg-background p-5">
                <AmountLine label={t('mainPage.Total')} amount={discounts.total} />
                {discounts.coupons > 0 && <AmountLine label={t('mainPage.coupon')} amount={discounts.coupons} off />}
                {discounts.points > 0 && <AmountLine label="U-Point" amount={discounts.points} off />}
                <View className="mt-2 flex-row items-end justify-between gap-3 border-t border-border pt-3">
                  <Text className="text-lg font-bold">{t('mainPage.AmountPaid')}</Text>
                  <Text className="text-4xl font-bold tracking-tight">{formatMoney(discounts.toPay)}</Text>
                </View>
              </View>

              {vatBranch && <ReceiptPicker receipt={receipt} />}

              {!nothingLeft && (
                <View className="gap-3">
                  <Text className="text-lg font-bold">{t('mainPage.paymentMethod')}</Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {payment.methods.map(({ method, paymentId }) => {
                      const selected = chosen?.method === method;
                      return (
                        <MethodTile
                          // Drawn anew when chosen: a border changed in place can hide the label
                          key={`${method}-${selected}`}
                          method={method}
                          compact
                          selected={selected}
                          disabled={payment.paying}
                          onPress={() => setChosen({ method, paymentId })}
                        />
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <Button
              size="lg"
              className="h-16 rounded-[20px]"
              isDisabled={!canPay}
              onPress={() =>
                payment.pay(chosen?.method ?? null, nothingLeft ? null : (chosen?.paymentId ?? null), receipt.receipt)
              }
            >
              {payment.paying ? (
                <Spinner color={accentForeground} />
              ) : (
                <Button.Label numberOfLines={1} className="text-lg font-bold">
                  {nothingLeft ? t('mainPage.payNow') : t('mainPage.payWithAmount', { amount: formatMoney(discounts.toPay) })}
                </Button.Label>
              )}
            </Button>
          </View>
        </View>
      </View>

      {couponOpen && <CouponDialog payment={payment} onClose={() => setCouponOpen(false)} />}
    </View>
  );
};

/** Collect (the default) or spend: one or the other per payment. */
const ModeSwitch = ({
  mode,
  onChange,
  spendDisabled,
}: {
  mode: UpointMode;
  onChange: (mode: UpointMode) => void;
  spendDisabled: boolean;
}) => {
  const { t } = useTranslation('language');
  const [accent, accentForeground, foreground, surface] = useThemeColor([
    'accent',
    'accent-foreground',
    'foreground',
    'surface',
  ]);
  return (
    <View className="flex-row gap-1 rounded-2xl p-1" style={{ backgroundColor: surface }}>
      {(['collect', 'spend'] as const).map((value) => {
        const active = mode === value;
        const disabled = value === 'spend' && spendDisabled;
        return (
          <Pressable
            // Drawn anew when it changes, and colours through style: a toggled fill can hide the label
            key={`${value}-${active}`}
            onPress={() => onChange(value)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            className={cn('h-11 items-center justify-center rounded-xl px-4.5', disabled && 'opacity-40')}
            style={{ backgroundColor: active ? accent : 'transparent' }}
          >
            <Text className="font-bold" style={{ color: active ? accentForeground : foreground }}>
              {value === 'collect' ? t('mainPage.upointCollectShort') : t('mainPage.upointSpendShort')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** "2026-12-31…" → "2026.12.31" */
const shortDate = (date?: string | null) => (date ? date.slice(0, 10).replace(/-/g, '.') : '');

/** A coupon: its amount, what it's for and until when; "Use" or "✓ Applied" (tap again to undo). */
const CouponRow = ({
  coupon,
  selected,
  locked,
  onToggle,
}: {
  coupon: IUpointCoupon;
  selected: boolean;
  locked: boolean;
  onToggle: () => void;
}) => {
  const { t } = useTranslation('language');
  const [accent, accentForeground, foreground, border, secondary] = useThemeColor([
    'accent',
    'accent-foreground',
    'foreground',
    'border',
    'surface-secondary',
  ]);
  const tint = useCSSVariable('--color-accent-tint') as string;
  const until = shortDate(coupon.expireDate);

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl border-2 p-3"
      style={{ borderColor: selected ? accent : border, backgroundColor: selected ? tint : undefined }}
    >
      <View
        className="h-11 min-w-18 items-center justify-center rounded-xl px-2"
        style={{ backgroundColor: selected ? accent : secondary }}
      >
        <Text className="text-sm font-bold" style={{ color: selected ? accentForeground : foreground }} numberOfLines={1}>
          {formatMoney(coupon.amount)}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-bold" style={{ color: foreground }} numberOfLines={1}>
          {coupon.name || t('mainPage.couponDiscount', { amount: formatMoney(coupon.amount) })}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {until ? t('mainPage.couponUntil', { date: until }) : coupon.code}
        </Text>
      </View>
      {selected ? (
        <Button
          variant="outline"
          className="h-11 rounded-xl border-2 border-foreground px-3.5"
          isDisabled={locked}
          onPress={onToggle}
        >
          <Check size={16} color={foreground} />
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.couponUsed')}
          </Button.Label>
        </Button>
      ) : (
        <Button className="h-11 rounded-xl px-4.5" isDisabled={locked} onPress={onToggle}>
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.couponUse')}
          </Button.Label>
        </Button>
      )}
    </View>
  );
};

/** A line of the payment summary; discounts in green with a minus. */
const AmountLine = ({ label, amount, off }: { label: string; amount: number; off?: boolean }) => {
  const positive = useCSSVariable('--color-positive') as string;
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="min-w-0 flex-1 text-muted">{label}</Text>
      <Text className="font-semibold" style={off ? { color: positive } : undefined}>
        {off ? '−' : ''}
        {formatMoney(amount)}
      </Text>
    </View>
  );
};

/**
 * Typing a coupon code on the screen's keyboard. "Check" asks the server about the code without using
 * it: a good one joins the list, chosen; a bad or expired one says so.
 */
const CouponDialog = ({ payment, onClose }: { payment: Payment; onClose: () => void }) => {
  const { t } = useTranslation('language');
  const apollo = useApolloClient();
  const [foreground, muted, accentForeground] = useThemeColor(['foreground', 'muted', 'accent-foreground']);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!code || checking || !payment.upoint) return;
    setChecking(true);
    setError(null);
    try {
      const { data } = await apollo.query<{ checkUpointCoupon: IUpointCoupon }>({
        query: CHECK_UPOINT_COUPON,
        variables: { input: { order: payment.orderId, code, phone: payment.upoint.account.phone } },
        fetchPolicy: 'no-cache',
      });
      if (!data?.checkUpointCoupon) throw new Error(t('mainPage.couponInvalid'));
      payment.addCoupon(data.checkUpointCoupon);
      onClose();
    } catch (err) {
      // The server's answer means the code is no good; anything else is the connection
      const answered = !!(err as { graphQLErrors?: unknown[] }).graphQLErrors?.length;
      setError(answered ? t('mainPage.couponInvalid') : t('setup.actionFailed'));
    } finally {
      setChecking(false);
    }
  };

  return (
    // Over the whole checkout, dimmed behind
    <Appear
      duration={150}
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <View className="w-190 gap-4 rounded-[28px] bg-surface p-7">
        <View className="flex-row items-center gap-3">
          <Text className="min-w-0 flex-1 text-2xl font-bold">{t('mainPage.enterCouponTitle')}</Text>
          <Button
            isIconOnly
            variant="secondary"
            className="size-12 rounded-full"
            onPress={onClose}
            accessibilityLabel={t('mainPage.close')}
          >
            <X size={22} color={foreground} />
          </Button>
        </View>
        <Text className="text-muted">{t('mainPage.enterCouponHint')}</Text>
        <View className="h-15 justify-center rounded-2xl border-2 px-5" style={{ borderColor: foreground }}>
          <Text
            className="text-3xl font-bold tracking-[4px]"
            style={{ color: code ? foreground : muted }}
            numberOfLines={1}
          >
            {code || t('mainPage.couponCode')}
          </Text>
        </View>
        {!!error && <Note tone="danger" message={error} />}
        <CodeKeyboard
          onKey={(key) => {
            setError(null);
            setCode(applyKey(code, key, COUPON_MAX_LENGTH));
          }}
        />
        <View className="flex-row gap-3">
          <Button
            size="lg"
            variant="outline"
            className="h-14 flex-1 rounded-[18px] border-2 border-foreground"
            onPress={onClose}
          >
            <Button.Label numberOfLines={1} className="font-bold">
              {t('setup.cancel')}
            </Button.Label>
          </Button>
          <Button size="lg" className="h-14 flex-[2] rounded-[18px]" isDisabled={!code || checking} onPress={check}>
            {checking ? (
              <Spinner color={accentForeground} />
            ) : (
              <Button.Label numberOfLines={1} className="font-bold">
                {t('mainPage.couponCheck')}
              </Button.Label>
            )}
          </Button>
        </View>
      </View>
    </Appear>
  );
};
