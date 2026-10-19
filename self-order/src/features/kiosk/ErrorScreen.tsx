import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { Text } from '@/src/ui/Text';
import { SecretTap } from './AdminExit';
import { handOverIfStarting } from './crash';

// Unattended tablets restart by themselves, so none is left on this page
const AUTO_RESTART_S = 30;

/**
 * Shown instead of the app, or the part of it, that hit an error, so a tablet is never left on a
 * blank screen: the error, for staff to photograph for support, and a restart, which also happens by
 * itself. Plain components only, as the app's base setup may be what failed.
 */
export const ErrorScreen = ({ error, retry }: ErrorBoundaryProps) => {
  const { t } = useTranslation('language');
  const [muted, accentForeground] = useThemeColor(['muted', 'accent-foreground']);
  const [restarting, setRestarting] = useState(false);
  const [seconds, setSeconds] = useState(AUTO_RESTART_S);

  // Before the first screen, expo-updates gets the crash, to roll a broken update back
  useEffect(() => {
    handOverIfStarting(error);
  }, [error]);

  // A fresh start of the app; where that isn't possible (development), draw it again
  const restart = () => {
    if (restarting) return;
    setRestarting(true);
    Updates.reloadAsync().catch(() => {
      setRestarting(false);
      setSeconds(AUTO_RESTART_S);
      retry();
    });
  };

  useEffect(() => {
    if (restarting) return;
    if (seconds <= 0) return restart();
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, restarting]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-8">
      {/* The way into the admin dialog, as the screen with the logo is gone */}
      <SecretTap>
        <TriangleAlert size={72} color={muted} strokeWidth={1.4} />
      </SecretTap>
      <Text className="self-stretch text-center text-3xl font-bold">{t('setup.errorTitle')}</Text>
      <Text className="max-w-140 self-stretch text-center text-muted" numberOfLines={4}>
        {error.message}
      </Text>
      <Pressable
        onPress={restart}
        disabled={restarting}
        className="mt-2 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-accent px-8"
      >
        {restarting && <ActivityIndicator color={accentForeground} />}
        <Text className="font-bold" style={{ color: accentForeground }} numberOfLines={1}>
          {restarting ? t('setup.restartApp') : `${t('setup.restartApp')} (${seconds})`}
        </Text>
      </Pressable>
    </View>
  );
};
