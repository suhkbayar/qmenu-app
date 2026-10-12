import { useEffect } from 'react';
import { View } from 'react-native';
import { Pointer } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/src/features/cart/cartStore';
import { useTableOrders } from '@/src/features/orders/useTableOrders';
import { Text } from '@/src/ui/Text';
import { useLanguage } from './useLanguage';

// The language the menu goes back to between guests
const DEFAULT_LANGUAGE = 'mn';
// How long the table must look free first (screensaver on, nothing in the cart or on its way)
const RESET_AFTER_MS = 3 * 60 * 1000;
// Fixed colours: over a photo, in either theme
const INK = '#16181C';
const PAPER = '#FFFFFF';
const YELLOW = '#FFC300';

/**
 * Over the screensaver's banners: what to do (tap to order). Once the table has looked free for a
 * few minutes, the menu goes back to Mongolian for the next guests. A table that's still eating
 * keeps its language.
 */
export const IdleOverlay = () => {
  const { t } = useTranslation('language');
  const { current, change } = useLanguage();
  // What's already loaded: the screensaver comes and goes too often to ask the server each time
  const { activeItems } = useTableOrders({ cacheOnly: true });
  const cartEmpty = useCartStore((s) => s.items.length === 0);
  const tableFree = cartEmpty && activeItems === 0;

  useEffect(() => {
    if (!tableFree || current.code === DEFAULT_LANGUAGE) return;
    const id = setTimeout(() => change(DEFAULT_LANGUAGE), RESET_AFTER_MS);
    return () => clearTimeout(id);
  }, [tableFree, current.code]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 40 }} className="items-center">
      <View className="h-19 flex-row items-center gap-3.5 rounded-full pl-3 pr-8" style={{ backgroundColor: YELLOW }}>
        <View className="size-13 items-center justify-center rounded-full" style={{ backgroundColor: INK }}>
          <Pointer size={26} color={PAPER} />
        </View>
        <Text className="text-[22px] font-bold" style={{ color: INK }}>
          {t('mainPage.tapToOrder')}
        </Text>
      </View>
    </View>
  );
};
