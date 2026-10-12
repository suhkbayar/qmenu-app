import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { isOffline, subscribeNetwork } from '@/src/lib/network';
import { Text } from '@/src/ui/Text';

// Short drops are common on restaurant Wi-Fi; only show the notice if the server stays unreachable
const GRACE_MS = 4000;

/** A banner at the bottom of the screen while requests to the server keep failing. */
export const OfflineNotice = () => {
  const { t } = useTranslation('language');
  const dangerForeground = useThemeColor('danger-foreground');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = (offline: boolean) => {
      clearTimeout(timer);
      if (!offline) return setVisible(false);
      timer = setTimeout(() => setVisible(isOffline()), GRACE_MS);
    };
    apply(isOffline());
    const unsubscribe = subscribeNetwork(apply);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}
    >
      <View className="flex-row items-center gap-2.5 rounded-full bg-danger px-5 py-3 shadow-lg">
        <WifiOff size={20} color={dangerForeground} />
        <Text className="font-semibold text-danger-foreground">{t('mainPage.no_internet')}</Text>
      </View>
    </Animated.View>
  );
};
