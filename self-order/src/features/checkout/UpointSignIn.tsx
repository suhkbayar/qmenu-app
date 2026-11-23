import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { Button, Tabs, useThemeColor } from 'heroui-native';
import { CircleAlert, CreditCard, LucideIcon, QrCode, RefreshCw, Smartphone, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { useCSSVariable } from 'uniwind';
import { CHECK_UPOINT_QR, GET_BALANCE_UPOINT, GET_UPOINT_QR } from '@/src/graphql/queries';
import { IUpointBalance } from '@/src/types';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { NumberPad, applyKey } from './Keypad';
import { StepHeader } from './StepHeader';
import { usePayment } from './usePayment';

export const UPOINT_LOGO = require('@/assets/icon/upoint.png');

const CARD_LENGTH = 16;
const PHONE_LENGTH = 8;
const PIN_LENGTH = 4;
// U-Point doesn't call back once the QR is scanned, so it's asked this often while the QR is up
const QR_CHECK_MS = 3_000;
// A QR nobody scans stops being asked about after this long; the guest can get a new one
const QR_GIVE_UP_MS = 180_000;
const QR_SIZE = 230;

type Payment = ReturnType<typeof usePayment>;
/** QR first (it can spend and collect); a phone can only collect */
type Tab = 'qr' | 'phone' | 'card';

/** "••••8893": the end of a card or phone number, enough for the guest to recognise it */
export const maskTail = (value?: string | null) => (value ? `••••${value.slice(-4)}` : '');

/**
 * Signing in to U-Point: scan a QR with the U-Point app, or type a phone or card number and the PIN on
 * the screen's own pad. By QR or card the guest goes on to the discounts; by phone, back to paying.
 */
export const UpointSignIn = ({ payment }: { payment: Payment }) => {
  const { t } = useTranslation('language');
  const [tab, setTab] = useState<Tab>('qr');
  const paymentId = payment.rewards.upoint;

  return (
    <>
      <StepHeader title="U-Point" onBack={payment.back} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="w-full">
        <Tabs.List className="w-full">
          <Tabs.Indicator />
          <TabTrigger value="qr" icon={QrCode} label={t('mainPage.upointQrTab')} />
          <TabTrigger value="phone" icon={Smartphone} label={t('mainPage.upointPhone')} />
          <TabTrigger value="card" icon={CreditCard} label={t('mainPage.card')} />
        </Tabs.List>
      </Tabs>
      {!!paymentId &&
        (tab === 'qr' ? (
          <QrSignIn payment={payment} paymentId={paymentId} />
        ) : (
          // A fresh form per tab
          <PinSignIn key={tab} via={tab} payment={payment} paymentId={paymentId} />
        ))}
    </>
  );
};

const TabTrigger = ({ value, icon: Icon, label }: { value: Tab; icon: LucideIcon; label: string }) => {
  const foreground = useThemeColor('foreground');
  return (
    <Tabs.Trigger value={value} className="flex-1">
      <View className="flex-row items-center gap-2">
        <Icon size={18} color={foreground} />
        <Tabs.Label numberOfLines={1}>{label}</Tabs.Label>
      </View>
    </Tabs.Trigger>
  );
};

/**
 * The sign-in QR, with how to scan it. The guest's account comes back by itself: the server is asked
 * every few seconds (U-Point doesn't call back), and "Continue" asks at once. A bad, used or
 * long-unscanned QR can be swapped for a new one.
 */
const QrSignIn = ({ payment, paymentId }: { payment: Payment; paymentId: string }) => {
  const { t } = useTranslation('language');
  const apollo = useApolloClient();
  const [foreground, muted, accentForeground] = useThemeColor(['foreground', 'muted', 'accent-foreground']);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "Not scanned yet", after "Continue"
  const [notice, setNotice] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  // Bumped by "New QR"
  const [attempt, setAttempt] = useState(0);
  // One check at a time, and none after signing in: U-Point answers a second check of a used QR with an error
  const inFlight = useRef(false);
  const signedIn = useRef(false);

  // A new QR on opening, and on "New QR"
  useEffect(() => {
    let cancelled = false;
    setQr(null);
    setError(null);
    setNotice(null);
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

  /** Asks whether the QR was scanned; answers whether to keep asking */
  const check = async (current: string, manual: boolean): Promise<boolean> => {
    if (inFlight.current || signedIn.current) return !signedIn.current;
    inFlight.current = true;
    if (manual) setAsking(true);
    try {
      const { data } = await apollo.query<{ checkUpointQr: IUpointBalance | null }>({
        query: CHECK_UPOINT_QR,
        variables: { input: { order: payment.orderId, payment: paymentId, qr_string: current } },
        fetchPolicy: 'no-cache',
      });
      if (data?.checkUpointQr) {
        signedIn.current = true;
        payment.signedIn(data.checkUpointQr, 'qr');
        return false;
      }
      if (manual) setNotice(t('mainPage.upointNotScanned'));
      return true;
    } catch (err) {
      // The server's answer (a bad or used QR) ends this QR; a dropped connection is just asked again
      if ((err as { graphQLErrors?: unknown[] }).graphQLErrors?.length) {
        setError((err as Error).message || t('setup.actionFailed'));
        return false;
      }
      if (manual) setNotice(t('setup.actionFailed'));
      return true;
    } finally {
      inFlight.current = false;
      if (manual) setAsking(false);
    }
  };

  // Asked one after another until scanned, given up after a while
  useEffect(() => {
    if (!qr || error) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const giveUp = Date.now() + QR_GIVE_UP_MS;

    const poll = async () => {
      const again = await check(qr, false);
      if (cancelled || !again) return;
      if (Date.now() > giveUp) return setError(t('mainPage.upointQrExpired'));
      timer = setTimeout(poll, QR_CHECK_MS);
    };

    timer = setTimeout(poll, QR_CHECK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [qr, error]);

  return (
    <View className="flex-1 gap-5">
      <View className="flex-1 flex-row items-center justify-center gap-12 rounded-3xl bg-background px-8">
        {/* QR codes need a white background to scan, also in dark mode */}
        <View className="rounded-3xl bg-white p-5">
          {qr && !error ? (
            <QRCode value={qr} size={QR_SIZE} />
          ) : (
            <View className="items-center justify-center" style={{ width: QR_SIZE, height: QR_SIZE }}>
              {error ? <RefreshCw size={56} color={muted} strokeWidth={1.6} /> : <Spinner />}
            </View>
          )}
        </View>
        <View className="w-80 gap-4">
          <Text className="text-2xl font-bold leading-8">{t('mainPage.upointQrTitle')}</Text>
          {[t('mainPage.upointQrStep1'), t('mainPage.upointQrStep2'), t('mainPage.upointQrStep3')].map((label, i) => (
            <View key={label} className="flex-row items-center gap-3">
              <StepBadge n={i + 1} />
              <Text className="min-w-0 flex-1 text-lg">{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {!!(error || notice) && <Note tone={error ? 'danger' : 'warning'} message={(error ?? notice)!} />}

      {error ? (
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
      ) : (
        <Button
          size="lg"
          className="h-15 rounded-[18px]"
          isDisabled={!qr || asking}
          onPress={() => {
            setNotice(null);
            if (qr) check(qr, true);
          }}
        >
          {asking ? (
            <Spinner color={accentForeground} />
          ) : (
            <Button.Label numberOfLines={1} className="font-bold">
              {t('setup.continue')}
            </Button.Label>
          )}
        </Button>
      )}
    </View>
  );
};

/**
 * A phone or card number and the PIN, typed on the screen's pad (tap a field to type into it). The
 * phone tab warns first that a phone can only collect points.
 */
const PinSignIn = ({ via, payment, paymentId }: { via: 'phone' | 'card'; payment: Payment; paymentId: string }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const [number, setNumber] = useState('');
  const [pin, setPin] = useState('');
  const [field, setField] = useState<'number' | 'pin'>('number');
  const [error, setError] = useState<string | null>(null);

  const [getBalance, { loading }] = useLazyQuery<{ getBalanceUpoint: IUpointBalance }>(GET_BALANCE_UPOINT, {
    fetchPolicy: 'network-only',
  });

  const length = via === 'card' ? CARD_LENGTH : PHONE_LENGTH;
  const valid = number.length === length && pin.length === PIN_LENGTH;

  const onKey = (key: string) => {
    setError(null);
    if (field === 'number') {
      const next = applyKey(number, key, length);
      setNumber(next);
      // The whole number typed: on to the PIN
      if (next.length === length && number.length < length) setField('pin');
    } else {
      setPin(applyKey(pin, key, PIN_LENGTH));
    }
  };

  const submit = async () => {
    if (!valid || loading) return;
    setError(null);
    let message: string | null = null;
    try {
      const { data, error: queryError } = await getBalance({
        variables: {
          input: {
            order: payment.orderId,
            payment: paymentId,
            pin_code: pin,
            card_number: via === 'card' ? number : '',
            mobile: via === 'phone' ? number : '',
          },
        },
      });
      if (data?.getBalanceUpoint && !queryError) return payment.signedIn(data.getBalanceUpoint, via);
      message = queryError?.message || t('setup.actionFailed');
    } catch (err) {
      message = (err as Error).message || t('setup.actionFailed');
    }
    // The PIN is never kept; a wrong one is typed again
    setPin('');
    setField('pin');
    setError(message);
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
      {via === 'phone' && <Note tone="warning" icon={TriangleAlert} message={t('mainPage.upointPhoneOnlyCollect')} />}
      <View className="w-110 gap-3 self-center">
        <PadField
          label={via === 'card' ? t('mainPage.upointCardNumber') : t('mainPage.upointPhoneNumber')}
          value={number}
          placeholder={via === 'card' ? t('mainPage.upointCardPlaceholder') : t('mainPage.upointPhonePlaceholder')}
          active={field === 'number'}
          onPress={() => setField('number')}
        />
        <PadField
          label={t('mainPage.upointPin')}
          value={pin}
          placeholder="••••"
          masked
          active={field === 'pin'}
          onPress={() => setField('pin')}
        />
        {!!error && <Note tone="danger" message={error} />}
        <NumberPad onKey={onKey} />
        <Button size="lg" className="h-14 rounded-[18px]" isDisabled={!valid || loading} onPress={submit}>
          {loading ? (
            <Spinner color={accentForeground} />
          ) : (
            <Button.Label numberOfLines={1} className="font-bold">
              {t('setup.continue')}
            </Button.Label>
          )}
        </Button>
      </View>
    </ScrollView>
  );
};

/** A field the pad types into; the one being typed into has a dark border. */
const PadField = ({
  label,
  value,
  placeholder,
  masked,
  active,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  masked?: boolean;
  active: boolean;
  onPress: () => void;
}) => {
  const [foreground, border, muted] = useThemeColor(['foreground', 'border', 'muted']);
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-muted">{label}</Text>
      <Pressable
        // Drawn anew when it changes, and colours through style: a toggled colour can go missing on the tablets
        key={`${active}`}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        className="h-12 justify-center rounded-2xl border-2 bg-surface px-4"
        style={{ borderColor: active ? foreground : border }}
      >
        <Text className="text-xl font-semibold tracking-wider" style={{ color: value ? foreground : muted }} numberOfLines={1}>
          {value ? (masked ? '•'.repeat(value.length) : value) : placeholder}
        </Text>
      </Pressable>
    </View>
  );
};

/** A yellow numbered circle: the QR's steps, and the two halves of the discounts screen. */
export const StepBadge = ({ n }: { n: number }) => {
  const [accent, accentForeground] = useThemeColor(['accent', 'accent-foreground']);
  return (
    <View className="size-7 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
      <Text className="self-stretch text-center text-sm font-bold" style={{ color: accentForeground }}>
        {n}
      </Text>
    </View>
  );
};

/** A message on a tinted strip: a warning (phone only collects, not scanned yet) or an error. */
export const Note = ({
  message,
  tone,
  icon: Icon = CircleAlert,
}: {
  message: string;
  tone: 'warning' | 'danger';
  icon?: LucideIcon;
}) => {
  const [danger, foreground, secondary] = useThemeColor(['danger', 'foreground', 'surface-secondary']);
  const pendingSoft = useCSSVariable('--color-pending-soft') as string;
  const warning = tone === 'warning';
  return (
    <View
      // Colours through style: the same strip turns from a warning to an error on the QR tab
      className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: warning ? pendingSoft : secondary }}
    >
      <Icon size={20} color={warning ? foreground : danger} />
      <Text className="min-w-0 flex-1 font-semibold" style={{ color: warning ? foreground : danger }}>
        {message}
      </Text>
    </View>
  );
};
