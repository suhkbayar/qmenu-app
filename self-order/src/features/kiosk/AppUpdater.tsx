import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { Text } from '@/src/ui/Text';
import { useActivity } from './activity';
import { useAppUpdate } from './appUpdate';
import { useGuestBusy } from './useGuestBusy';

const FIRST_CHECK_DELAY_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Installing restarts the app, so wait until nobody has touched the tablet for this long
const IDLE_MS = 2 * 60 * 1000;

/** Looks for a new APK every few hours and installs it when the tablet is idle. */
export const AppUpdater = () => {
  const { t } = useTranslation('language');
  const { available, installing, check, install } = useAppUpdate();
  const guestBusy = useGuestBusy();

  useEffect(() => {
    const first = setTimeout(check, FIRST_CHECK_DELAY_MS);
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [check]);

  useEffect(() => {
    if (!available || installing || guestBusy) return;
    const installIfIdle = () => {
      if (Date.now() - useActivity.getState().lastTouch >= IDLE_MS) install();
    };
    installIfIdle();
    const id = setInterval(installIfIdle, 30 * 1000);
    return () => clearInterval(id);
  }, [available, installing, guestBusy, install]);

  if (!installing) return null;

  // Downloading and installing takes a minute or two; tell anyone who walks up
  return (
    <View style={StyleSheet.absoluteFill} className="items-center justify-center gap-3 bg-background">
      <LogoLoader />
      <Text className="mt-2 text-2xl font-bold">{t('setup.appUpdating')}</Text>
      <Text className="text-muted">{t('setup.appUpdatingBody')}</Text>
    </View>
  );
};
