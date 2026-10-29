import { ReactNode, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { useApolloClient } from '@apollo/client';
import { router } from 'expo-router';
import { Button, Dialog, Spinner, cn, useThemeColor, useToast } from 'heroui-native';
import { Armchair, LogOut, RefreshCw, RotateCcw, Settings, Wifi } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { create } from 'zustand';
import { Kiosk } from '@/modules/kiosk';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_PARTICIPANT_CONFIGS } from '@/src/graphql/queries';
import { IParticipant } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { useAppUpdate } from './appUpdate';
import { MAX_PIN_ATTEMPTS, usePinLock } from './pinLock';
import { useHoldScreensaver } from './screensaverHold';
import { checkForUpdate } from './UpdatePrompt';
import { VersionBadge } from './VersionBadge';

// QMenu support's code, for branches without an ADMIN_PIN. Set as an EAS environment variable,
// never in git; builds and updates without it simply don't accept a support code.
const SUPPORT_PIN = process.env.EXPO_PUBLIC_SUPPORT_PIN;
const TAPS_REQUIRED = 10;
const TAP_WINDOW_MS = 3000;
// Waiting longer than this for the server's PIN, the one the tablet last loaded is used instead
const PIN_FETCH_TIMEOUT_MS = 5000;

const adminPinOf = (configs?: IParticipant['configs']) => configs?.find((c) => c.name === 'ADMIN_PIN')?.value;

/** 75000 → "1:15" */
const formatCountdown = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const useAdminDialog = create<{ open: boolean }>()(() => ({ open: false }));

/**
 * The secret way into the admin dialog: wraps a logo, and 10 taps in quick succession (each within
 * 3 seconds of the last) open it. Looks and feels like a plain image to guests.
 */
export const SecretTap = ({ children }: { children: ReactNode }) => {
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const tap = () => {
    if (Platform.OS !== 'android') return;
    taps.current += 1;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => (taps.current = 0), TAP_WINDOW_MS);
    if (taps.current >= TAPS_REQUIRED) {
      taps.current = 0;
      clearTimeout(timer.current);
      useAdminDialog.setState({ open: true });
    }
  };

  return (
    <Pressable onPress={tap} accessible={false}>
      {children}
    </Pressable>
  );
};

/**
 * Staff's way in, after the logo taps (SecretTap): the branch's ADMIN_PIN or QMenu support's code,
 * then a menu (restart the app, Wi-Fi and other settings, another table, leaving kiosk mode). The
 * dialog also shows the version and can check for updates.
 */
export const AdminExit = () => {
  const open = useAdminDialog((s) => s.open);
  return <AdminDialog isOpen={open} onClose={() => useAdminDialog.setState({ open: false })} />;
};

const AdminDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation('language');
  const [muted, foreground, accentForeground] = useThemeColor(['muted', 'foreground', 'accent-foreground']);
  const apollo = useApolloClient();
  const participantId = useSessionStore((s) => s.participant?.id);
  const adminPin = useSessionStore((s) => adminPinOf(s.participant?.configs));
  const { failures, lockedUntil, fail, reset } = usePinLock();
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checked, setChecked] = useState(false);
  // The right PIN is in: the menu instead of the PIN field
  const [unlocked, setUnlocked] = useState(false);
  useHoldScreensaver(isOpen);
  const [now, setNow] = useState(Date.now);
  const lockedFor = lockedUntil - now;
  const locked = lockedFor > 0;
  const noPin = !adminPin && !SUPPORT_PIN;

  // Tick the countdown while the PIN is locked
  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen, lockedUntil]);
  const { isChecking, isDownloading, isUpdatePending, isUpdateAvailable, checkError, downloadError } =
    Updates.useUpdates();
  const appUpdate = useAppUpdate();

  const updateStatus = isChecking
    ? t('setup.updateChecking')
    : isDownloading
      ? t('setup.updateDownloading')
      : isUpdatePending
        ? t('setup.updateReady')
        : downloadError
          ? t('setup.updateFailed', { message: downloadError.message })
          : checkError
            ? t('setup.updateFailed', { message: checkError.message })
            : checked && !isUpdateAvailable
              ? t('setup.upToDate')
              : null;

  /**
   * The branch's PIN as set on the server now. The tablet otherwise reloads its branch only every 10
   * minutes, so a PIN staff just changed wouldn't work yet (and the old one still would). The answer
   * also updates the tablet's copy. Offline, or with no answer in time, the PIN it last loaded.
   */
  const currentAdminPin = async () => {
    if (!participantId) return adminPin;
    try {
      const request = apollo.query({
        query: GET_PARTICIPANT_CONFIGS,
        variables: { id: participantId },
        fetchPolicy: 'network-only',
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), PIN_FETCH_TIMEOUT_MS),
      );
      const { data } = await Promise.race([request, timeout]);
      return adminPinOf(data?.getParticipant?.configs);
    } catch {
      return adminPin;
    }
  };

  // Opening the dialog loads the current settings, e.g. a PIN set for the first time enables the field
  useEffect(() => {
    if (isOpen) currentAdminPin();
  }, [isOpen]);

  const close = () => {
    setPin('');
    setWrong(false);
    setChecked(false);
    setUnlocked(false);
    onClose();
  };

  const submit = async () => {
    if (locked || !pin || verifying) return;
    let ok = pin === SUPPORT_PIN;
    if (!ok) {
      setVerifying(true);
      ok = pin === (await currentAdminPin());
      setVerifying(false);
    }
    if (!ok) {
      fail();
      setPin('');
      setWrong(true);
      return;
    }
    reset();
    setPin('');
    setUnlocked(true);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        {/* A stray tap after the ten on the logo shouldn't close it; Cancel does */}
        <Dialog.Overlay isCloseOnPress={false} />
        <Dialog.Content isSwipeable={false} className={cn('gap-4 self-center p-7', unlocked ? 'w-170' : 'w-110')}>
          <Dialog.Title className="text-center text-2xl">{t('setup.adminAccess')}</Dialog.Title>

          {unlocked ? (
            <AdminMenu onDone={close} />
          ) : (
            <>
              <View className="gap-2">
                <TextInput
                  value={pin}
                  onChangeText={(value) => {
                    setPin(value);
                    setWrong(false);
                  }}
                  onSubmitEditing={submit}
                  placeholder={t('setup.enterPin')}
                  placeholderTextColor={muted}
                  secureTextEntry
                  keyboardType="number-pad"
                  autoFocus
                  editable={!locked && !noPin}
                  className={cn(
                    'h-15 rounded-2xl border bg-surface px-4 text-center font-normal text-2xl text-foreground',
                    wrong || locked ? 'border-danger' : 'border-border',
                    (locked || noPin) && 'opacity-50',
                  )}
                  // Typed text in the theme's colour through style; unset, Android draws it black
                  style={{ letterSpacing: 6, color: foreground }}
                />
                {locked ? (
                  <Text className="text-center text-sm font-medium text-danger">
                    {t('setup.pinLocked', { time: formatCountdown(lockedFor) })}
                  </Text>
                ) : noPin ? (
                  <Text className="text-center text-sm font-medium text-muted">{t('setup.noPin')}</Text>
                ) : (
                  wrong && (
                    <Text className="text-center text-sm font-medium text-danger">
                      {t('setup.wrongPin', { count: MAX_PIN_ATTEMPTS - failures })}
                    </Text>
                  )
                )}
              </View>

              <View className="flex-row gap-3">
                <Button size="lg" variant="secondary" className="flex-1 rounded-2xl" onPress={close}>
                  <Button.Label numberOfLines={1}>{t('setup.cancel')}</Button.Label>
                </Button>
                <Button
                  size="lg"
                  className="flex-1 rounded-2xl"
                  isDisabled={!pin || locked || verifying}
                  onPress={submit}
                >
                  {/* Spinners default to the brand yellow, which vanishes on the yellow button */}
                  {verifying && <Spinner size="sm" color={accentForeground} />}
                  <Button.Label numberOfLines={1} className="font-bold">
                    {t('setup.continue')}
                  </Button.Label>
                </Button>
              </View>
            </>
          )}

          <View className="items-center gap-1.5 border-t border-border pt-4">
            <Button
              variant="ghost"
              isDisabled={isChecking || isDownloading}
              onPress={() => Promise.all([checkForUpdate(), appUpdate.check()]).finally(() => setChecked(true))}
            >
              {isChecking || isDownloading ? <Spinner size="sm" /> : <RefreshCw size={18} color={foreground} />}
              <Button.Label numberOfLines={1}>{t('setup.checkUpdate')}</Button.Label>
            </Button>
            {!!updateStatus && <Text className="text-center text-sm text-muted">{updateStatus}</Text>}
            {/* A new APK: support can install it right away instead of waiting for the tablet to be idle */}
            {!!appUpdate.available && (
              <Button size="sm" variant="secondary" isDisabled={appUpdate.installing} onPress={appUpdate.install}>
                {appUpdate.installing && <Spinner size="sm" />}
                <Button.Label numberOfLines={1}>
                  {t('setup.installBuild', { version: appUpdate.available })}
                </Button.Label>
              </Button>
            )}
            {!!appUpdate.error && <Text className="text-center text-sm text-danger">{appUpdate.error}</Text>}
            <VersionBadge />
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

type AdminAction = 'restart' | 'wifi' | 'settings' | 'table' | 'exit';

const ADMIN_ACTIONS: { id: AdminAction; labelKey: string; Icon: LucideIcon }[] = [
  { id: 'restart', labelKey: 'setup.appRestart', Icon: RotateCcw },
  { id: 'wifi', labelKey: 'setup.wifiSettings', Icon: Wifi },
  { id: 'settings', labelKey: 'setup.deviceSettings', Icon: Settings },
  { id: 'table', labelKey: 'setup.changeTable', Icon: Armchair },
  { id: 'exit', labelKey: 'setup.exitKiosk', Icon: LogOut },
];

// Android's own touch ripple, as on the other tiles
const RIPPLE = { color: 'rgba(0,0,0,0.08)', foreground: true };

/**
 * What staff can do once the PIN is in, as big tiles, so nobody at the restaurant needs to know
 * Android: restart the app, fix the Wi-Fi or other settings, pick another table, or leave kiosk mode.
 * Settings are outside the kiosk lock, so the lock comes off first; Home brings the app back, locked.
 */
const AdminMenu = ({ onDone }: { onDone: () => void }) => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const foreground = useThemeColor('foreground');
  const [busy, setBusy] = useState<AdminAction | null>(null);

  const openSettings = async (intent: string) => {
    await Kiosk.stop();
    await Linking.sendIntent(intent);
  };

  const run = async (action: AdminAction) => {
    if (busy) return;
    setBusy(action);
    try {
      if (action === 'restart') await Updates.reloadAsync();
      else if (action === 'wifi') await openSettings('android.settings.WIFI_SETTINGS');
      else if (action === 'settings') await openSettings('android.settings.SETTINGS');
      else if (action === 'table') router.replace('/setup');
      else await Kiosk.stop();
      onDone();
    } catch {
      toast.show({ variant: 'danger', label: t(action === 'exit' ? 'setup.exitFailed' : 'setup.actionFailed') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-3">
      {ADMIN_ACTIONS.map(({ id, labelKey, Icon }) => (
        <Pressable
          key={id}
          onPress={() => run(id)}
          disabled={!!busy}
          android_ripple={RIPPLE}
          accessibilityRole="button"
          className={cn(
            'h-28 w-[31.8%] items-center justify-center gap-2.5 overflow-hidden rounded-3xl border border-border bg-surface px-3',
            !!busy && busy !== id && 'opacity-50',
          )}
        >
          {busy === id ? <Spinner /> : <Icon size={28} color={foreground} />}
          {/* Full tile width: Android cuts off a centred label sized to its own text */}
          <Text className="self-stretch text-center font-semibold" numberOfLines={2}>
            {t(labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};
