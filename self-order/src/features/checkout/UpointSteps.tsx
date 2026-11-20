import { RefObject, useEffect, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client';
import { Button, Tabs, useThemeColor } from 'heroui-native';
import {
  CircleAlert,
  Clock,
  CreditCard,
  LucideIcon,
  Lock,
  RefreshCw,
  Smartphone,
  Ticket,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useCSSVariable } from 'uniwind';
import { GET_PAY_ORDER } from '@/src/graphql/mutations/order';
import { CHECK_UPOINT_QR, GET_BALANCE_UPOINT, GET_UPOINT_QR } from '@/src/graphql/queries';
import { formatMoney } from '@/src/lib/format';
import { IUpointBalance } from '@/src/types';
import { Image } from '@/src/ui/Image';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { StepHeader } from './StepHeader';
import { Receipt, usePayment } from './usePayment';

export const UPOINT_LOGO = require('@/assets/icon/upoint.png');

const CARD_LENGTH = 16;
const PHONE_LENGTH = 8;
const PIN_LENGTH = 4;
const COUPON_MAX_LENGTH = 32;
// Points pay for at most half the order (the server's rule as well)
const SPEND_RATE = 0.5;
// U-Point doesn't call back once the QR is scanned, so it's asked this often while the QR is up
const QR_CHECK_MS = 3_000;
// A QR nobody scans stops being asked about after this long; the guest can get a new one
const QR_GIVE_UP_MS = 180_000;

type Payment = ReturnType<typeof usePayment>;
/** Sign in by scanning a QR with the U-Point app, or with a card number or phone and the PIN */
type UpointTab = 'qr' | 'card' | 'phone';

/** 1234567812345678 → "••••••••••••5678" */
const maskCard = (code: string) => code.replace(/\d(?=\d{4})/g, '•');

/**
 * U-Point: the guest scans a QR with the U-Point app, or types their card number or phone and PIN, to
 * find the account and its balance. Then the points are spent (up to half the order; the rest is paid
 * as usual) or collected with this order.
 */
export const UpointStep = ({ payment, receipt }: { payment: Payment; receipt: Receipt }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const [tab, setTab] = useState<UpointTab>('qr');
  const [number, setNumber] = useState('');
  const [pin, setPin] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<IUpointBalance | null>(null);
  const pinRef = useRef<TextInput>(null);

  const [getBalance, { loading: checking }] = useLazyQuery<{ getBalanceUpoint: IUpointBalance }>(
    GET_BALANCE_UPOINT,
    { fetchPolicy: 'network-only' },
  );
  const [payOrder, { loading: spending }] = useMutation(GET_PAY_ORDER);

  const paymentId = payment.rewards.upoint;
  const numberLength = tab === 'card' ? CARD_LENGTH : PHONE_LENGTH;
  const numberValid = number.length === numberLength;
  const pinValid = pin.length === PIN_LENGTH;
  // Spending waits for the payment, then for the receipt if that paid the whole order
  const busy = spending || payment.checking;

  const spendAmount =
    balance && payment.order
      ? Math.floor(
          Math.min(Number(balance.balance), Number(payment.order.grandTotal) * SPEND_RATE, payment.amountDue),
        )
      : 0;

  const switchTab = (next: UpointTab) => {
    if (next === tab) return;
    setTab(next);
    setNumber('');
    setAttempted(false);
    setError(null);
  };

  const changeNumber = (next: string) => {
    setError(null);
    setNumber(next);
    // The whole number typed: on to the PIN
    if (next.length === numberLength && number.length < numberLength) pinRef.current?.focus();
  };

  const checkBalance = async () => {
    setAttempted(true);
    if (!paymentId || !numberValid || !pinValid) return;
    setError(null);
    let message: string | null = null;
    try {
      const { data, error: queryError } = await getBalance({
        variables: {
          input: {
            order: payment.orderId,
            payment: paymentId,
            pin_code: pin,
            card_number: tab === 'card' ? number : '',
            mobile: tab === 'phone' ? number : '',
          },
        },
      });
      if (data?.getBalanceUpoint && !queryError) setBalance(data.getBalanceUpoint);
      else message = queryError?.message || t('setup.actionFailed');
    } catch (err) {
      message = (err as Error).message || t('setup.actionFailed');
    }
    // The PIN is never kept; a wrong one is typed again
    setPin('');
    setAttempted(false);
    if (message) {
      setError(message);
      pinRef.current?.focus();
    }
  };

  const spend = () => {
    if (!balance || !paymentId) return;
    setError(null);
    payOrder({
      variables: { input: { ...payment.rewardInput(paymentId, receipt), code: balance.code || number } },
      onCompleted: (data) => payment.rewardPaid(data?.payOrder),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <>
      <StepHeader title="U-Point" onBack={payment.back} />
      <ScrollView className="flex-1" contentContainerClassName="gap-5" keyboardShouldPersistTaps="handled">
        {balance ? (
          <>
            <View className="items-center gap-2 rounded-3xl bg-background p-6">
              <Image source={UPOINT_LOGO} className="size-16" contentFit="contain" />
              {/* Full width: Android cuts off a centred label sized to its own text */}
              <Text className="self-stretch text-center text-lg text-muted" numberOfLines={1}>
                {balance.code ? maskCard(balance.code) : balance.phone}
              </Text>
              <Text className="mt-2 self-stretch text-center text-muted">{t('mainPage.upointBalance')}</Text>
              <Text className="self-stretch text-center text-5xl font-bold tracking-tight">
                {Math.floor(Number(balance.balance ?? 0)).toLocaleString('en-US')}
              </Text>
              <Text className="self-stretch text-center text-lg leading-7 text-muted">
                {spendAmount >= 1
                  ? t('mainPage.upointSpendHint', { amount: formatMoney(spendAmount) })
                  : t('mainPage.upointNotEnough')}
              </Text>
            </View>
            {!!error && <ErrorNote message={error} />}
            <View className="flex-row gap-3">
              <Button
                size="lg"
                className="h-15 flex-1 rounded-[18px]"
                isDisabled={busy || spendAmount < 1}
                onPress={spend}
              >
                {busy ? (
                  <Spinner color={accentForeground} />
                ) : (
                  <Button.Label numberOfLines={1} className="font-bold">
                    {t('mainPage.upointSpend')}
                  </Button.Label>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-15 flex-1 rounded-[18px] border-2 border-foreground"
                isDisabled={busy}
                onPress={payment.collectPoints}
              >
                <Button.Label numberOfLines={1} className="font-bold">
                  {t('mainPage.upointCollect')}
                </Button.Label>
              </Button>
            </View>
          </>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(value) => switchTab(value as UpointTab)} className="w-full">
              <Tabs.List className="w-full">
                <Tabs.Indicator />
                <Tabs.Trigger value="qr" className="flex-1">
                  <Tabs.Label numberOfLines={1}>{t('mainPage.upointQrTab')}</Tabs.Label>
                </Tabs.Trigger>
                <Tabs.Trigger value="card" className="flex-1">
                  <Tabs.Label numberOfLines={1}>{t('mainPage.card')}</Tabs.Label>
                </Tabs.Trigger>
                <Tabs.Trigger value="phone" className="flex-1">
                  <Tabs.Label numberOfLines={1}>{t('mainPage.upointPhone')}</Tabs.Label>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs>
            {tab === 'qr' && paymentId ? (
              <QrSignIn payment={payment} paymentId={paymentId} onSignedIn={setBalance} />
            ) : (
              <>
                <CodeInput
                  key={tab}
                  value={number}
                  onChange={changeNumber}
                  placeholder={tab === 'card' ? t('mainPage.upointCardNumber') : t('mainPage.upointPhoneNumber')}
                  icon={tab === 'card' ? CreditCard : Smartphone}
                  maxLength={numberLength}
                  digits
                  error={
                    attempted &&
                    !numberValid &&
                    (tab === 'card' ? t('mainPage.upointCardInvalid') : t('mainPage.upointPhoneInvalid'))
                  }
                  onSubmit={() => pinRef.current?.focus()}
                />
                <CodeInput
                  value={pin}
                  onChange={(next) => {
                    setError(null);
                    setPin(next);
                  }}
                  placeholder={t('mainPage.upointPin')}
                  icon={Lock}
                  maxLength={PIN_LENGTH}
                  digits
                  secure
                  error={attempted && !pinValid && t('mainPage.upointPinInvalid')}
                  inputRef={pinRef}
                  onSubmit={checkBalance}
                />
                {!!error && <ErrorNote message={error} />}
                <Button size="lg" className="h-15 rounded-[18px]" isDisabled={checking} onPress={checkBalance}>
                  {checking ? (
                    <Spinner color={accentForeground} />
                  ) : (
                    <Button.Label numberOfLines={1} className="font-bold">
                      {t('mainPage.upointCheckBalance')}
                    </Button.Label>
                  )}
                </Button>
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
};

/**
 * The sign-in QR: the guest scans it with the U-Point app, and their account comes back by itself.
 * U-Point doesn't call back, so the server is asked every few seconds until it's scanned. A bad, used
 * or long-unscanned QR can be swapped for a new one.
 */
const QrSignIn = ({
  payment,
  paymentId,
  onSignedIn,
}: {
  payment: Payment;
  paymentId: string;
  onSignedIn: (balance: IUpointBalance) => void;
}) => {
  const { t } = useTranslation('language');
  const apollo = useApolloClient();
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped by "New QR"
  const [attempt, setAttempt] = useState(0);

  // A new QR on opening, and on "New QR"
  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setError(null);
    apollo
      .query<{ getUpointQr: { qr_string: string } }>({
        query: GET_UPOINT_QR,
        variables: { input: { order: payment.orderId, payment: paymentId } },
        fetchPolicy: 'no-cache',
      })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.getUpointQr?.qr_string) setQr(data.getUpointQr.qr_string);
        else setError(t('setup.actionFailed'));
      })
      .catch((err: Error) => !cancelled && setError(err.message || t('setup.actionFailed')));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Asked one after another (never two at once) until scanned, given up after a while
  useEffect(() => {
    if (!qr || error) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const giveUp = Date.now() + QR_GIVE_UP_MS;

    const check = async () => {
      try {
        const { data } = await apollo.query<{ checkUpointQr: IUpointBalance | null }>({
          query: CHECK_UPOINT_QR,
          variables: { input: { order: payment.orderId, payment: paymentId, qr_string: qr } },
          fetchPolicy: 'no-cache',
        });
        if (cancelled) return;
        if (data?.checkUpointQr) return onSignedIn(data.checkUpointQr);
      } catch (err) {
        if (cancelled) return;
        // The server's answer (a bad or used QR) ends this QR; a dropped connection is just asked again
        const answered = !!(err as { graphQLErrors?: unknown[] }).graphQLErrors?.length;
        if (answered) return setError((err as Error).message || t('setup.actionFailed'));
      }
      if (Date.now() > giveUp) return setError(t('mainPage.upointQrExpired'));
      timer = setTimeout(check, QR_CHECK_MS);
    };

    timer = setTimeout(check, QR_CHECK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [qr, error]);

  return (
    <View className="gap-4">
      {/* QR codes need a white background to scan, also in dark mode */}
      <View className="self-center rounded-3xl border border-border bg-white p-4">
        {qr && !error ? (
          <QRCode value={qr} size={232} />
        ) : (
          <View className="size-58 items-center justify-center">
            {error ? <RefreshCw size={56} color={muted} strokeWidth={1.6} /> : <Spinner />}
          </View>
        )}
      </View>
      {error ? (
        <>
          <ErrorNote message={error} />
          <Button
            size="lg"
            variant="outline"
            className="h-15 rounded-[18px] border-2 border-foreground"
            onPress={() => setAttempt((n) => n + 1)}
          >
            <RefreshCw size={20} color={foreground} />
            <Button.Label numberOfLines={1} className="font-bold">
              {t('mainPage.upointNewQr')}
            </Button.Label>
          </Button>
        </>
      ) : (
        <>
          <Text className="text-center text-xl font-semibold">{t('mainPage.upointScanWithApp')}</Text>
          <View className="self-center">
            <ScanWaiting />
          </View>
        </>
      )}
    </View>
  );
};

/** "Waiting for the scan" under the QR, like the bank QR's "waiting for payment". */
const ScanWaiting = () => {
  const { t } = useTranslation('language');
  const pending = useCSSVariable('--color-pending') as string;
  return (
    <View className="flex-row items-center gap-2.5 rounded-full bg-pending-soft px-4.5 py-3">
      <Clock size={20} color={pending} />
      <Text className="font-semibold text-pending">{t('mainPage.upointWaitingScan')}</Text>
    </View>
  );
};

/** A U-Point coupon: the guest's phone and the coupon's code take its amount off the order. */
export const UpointCouponStep = ({ payment, receipt }: { payment: Payment; receipt: Receipt }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  const [payOrder, { loading }] = useMutation(GET_PAY_ORDER);

  const paymentId = payment.rewards.coupon;
  const phoneValid = phone.length === PHONE_LENGTH;
  const busy = loading || payment.checking;

  const changePhone = (next: string) => {
    setError(null);
    setPhone(next);
    // The whole number typed: on to the code
    if (next.length === PHONE_LENGTH && phone.length < PHONE_LENGTH) codeRef.current?.focus();
  };

  const submit = () => {
    setAttempted(true);
    if (!paymentId || !phoneValid || !code) return;
    setError(null);
    payOrder({
      variables: { input: { ...payment.rewardInput(paymentId, receipt), code, phone } },
      onCompleted: (data) => payment.rewardPaid(data?.payOrder),
      onError: (err) => setError(err.message),
    });
  };

  return (
    <>
      <StepHeader title={t('mainPage.upointCoupon')} onBack={payment.back} />
      <ScrollView className="flex-1" contentContainerClassName="gap-5" keyboardShouldPersistTaps="handled">
        <CodeInput
          value={phone}
          onChange={changePhone}
          placeholder={t('mainPage.upointPhoneNumber')}
          icon={Smartphone}
          maxLength={PHONE_LENGTH}
          digits
          error={attempted && !phoneValid && t('mainPage.upointPhoneInvalid')}
          onSubmit={() => codeRef.current?.focus()}
        />
        <CodeInput
          value={code}
          onChange={(next) => {
            setError(null);
            setCode(next);
          }}
          placeholder={t('mainPage.couponCode')}
          icon={Ticket}
          maxLength={COUPON_MAX_LENGTH}
          error={attempted && !code && t('mainPage.couponRequired')}
          inputRef={codeRef}
          onSubmit={submit}
        />
        {!!error && <ErrorNote message={error} />}
        <Button size="lg" className="h-15 rounded-[18px]" isDisabled={busy} onPress={submit}>
          {busy ? (
            <Spinner color={accentForeground} />
          ) : (
            <Button.Label numberOfLines={1} className="font-bold">
              {t('mainPage.useCoupon')}
            </Button.Label>
          )}
        </Button>
      </ScrollView>
    </>
  );
};

/** A server's answer the guest can act on (wrong PIN, coupon already used…). */
const ErrorNote = ({ message }: { message: string }) => {
  const danger = useThemeColor('danger');
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-3.5">
      <CircleAlert size={22} color={danger} />
      <Text className="min-w-0 flex-1 font-semibold" style={{ color: danger }}>
        {message}
      </Text>
    </View>
  );
};

/** A card number, phone, PIN or coupon code, on the system keyboard (the number pad for digits). */
const CodeInput = ({
  value,
  onChange,
  placeholder,
  icon: Icon,
  maxLength,
  digits,
  secure,
  error,
  inputRef,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  maxLength: number;
  /** Digits only, on the number pad */
  digits?: boolean;
  /** Hidden as it's typed (the PIN) */
  secure?: boolean;
  /** Shown under the field, which turns red */
  error?: string | false;
  inputRef?: RefObject<TextInput | null>;
  /** The keyboard's enter key */
  onSubmit?: () => void;
}) => {
  const [muted, foreground, danger, border] = useThemeColor(['muted', 'foreground', 'danger', 'border']);
  return (
    <View className="gap-1.5">
      <View
        className="h-15 flex-row items-center gap-3 rounded-2xl border-2 bg-surface px-4"
        // Through style: a toggled colour class can go missing on the tablets
        style={{ borderColor: error ? danger : border }}
      >
        <Icon size={22} color={muted} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChange(digits ? text.replace(/\D/g, '') : text.replace(/\s/g, ''))}
          keyboardType={digits ? 'number-pad' : 'default'}
          secureTextEntry={secure}
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={muted}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          className="flex-1 text-lg font-semibold"
          // Typed text in the theme's colour through style; unset, Android draws it black
          style={{ color: foreground }}
        />
      </View>
      {!!error && (
        <Text className="text-sm" style={{ color: danger }}>
          {error}
        </Text>
      )}
    </View>
  );
};
