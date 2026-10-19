import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCheckout } from '@/src/features/checkout/checkoutStore';
import { checkConnection, isOffline, subscribeNetwork } from '@/src/lib/network';
import { Text } from '@/src/ui/Text';

// Short drops are common on restaurant Wi-Fi; only show the notice if the server stays unreachable
const GRACE_MS = 4000;

/**
 * A banner at the bottom of the screen while the tablet is offline. Plain show and hide, no
 * animation, so it can only ever be on screen while the app is offline.
 */
export const OfflineNotice = () => {
  const { t } = useTranslation('language');
  const dangerForeground = useThemeColor('danger-foreground');
  const [visible, setVisible] = useState(false);
  // Not over the payment dialog: it has its own "couldn't load" state with a retry
  const paying = useCheckout((s) => !!s.orderId);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let active = true;
    const apply = (offline: boolean) => {
      clearTimeout(timer);
      const current = ++attempt;
      if (!offline) return setVisible(false);
      // Shown only once the server really can't be reached, so a false alarm never shows it (a
      // server that answers clears the flag, which hides it again)
      timer = setTimeout(() => {
        checkConnection().then((online) => {
          if (active && current === attempt && !online) setVisible(true);
        });
      }, GRACE_MS);
    };
    apply(isOffline());
    const unsubscribe = subscribeNetwork(apply);
    return () => {
      active = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (!visible || paying) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}
    >
      <View className="flex-row items-center gap-2.5 rounded-full bg-danger px-5 py-3 shadow-lg">
        <WifiOff size={20} color={dangerForeground} />
        <Text className="font-semibold text-danger-foreground" numberOfLines={1}>
          {t('mainPage.no_internet')}
        </Text>
      </View>
    </View>
  );
};
