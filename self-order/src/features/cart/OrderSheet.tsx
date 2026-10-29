import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, useThemeColor } from 'heroui-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { BillBar, OrderedList } from '@/src/features/orders/OrderedList';
import { useTableOrders } from '@/src/features/orders/useTableOrders';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { IMenuProduct } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { useCartTotals } from './cartStore';
import { NewItems, SendBar } from './NewItems';
import { useOrderSheet } from './orderSheetStore';

// Slides in by transform only, which the tablets draw smoothly
const SLIDE_IN_MS = 260;
const SLIDE_OUT_MS = 220;
// The sheet's width (w-115) and a little more, so its rounded edge starts off screen too
const OFFSCREEN_X = 480;

/**
 * The order, over the menu from the right, in one list like a till: the new dishes at the top in
 * their own tint (then Order), what the table has ordered today below them ([+] to have it again),
 * and the bill once nothing new is waiting. Opened from the order bar.
 */
export const OrderSheet = ({ onOpenProduct }: { onOpenProduct: (product: IMenuProduct) => void }) => {
  const open = useOrderSheet((s) => s.open);
  const close = useOrderSheet((s) => s.close);
  useHoldScreensaver(open);
  // Stays mounted while it slides out
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);

  // 0 closed, 1 open. Driven here rather than by an entering animation: one of those once didn't
  // start, leaving the sheet off screen behind the dimmed menu
  const progress = useSharedValue(0);
  useEffect(() => {
    if (open) {
      progress.value = withTiming(1, { duration: SLIDE_IN_MS, easing: Easing.out(Easing.cubic) });
      // However the slide went, the sheet ends up fully on screen
      const id = setTimeout(() => (progress.value = 1), SLIDE_IN_MS + 150);
      return () => clearTimeout(id);
    }
    progress.value = withTiming(0, { duration: SLIDE_OUT_MS, easing: Easing.in(Easing.cubic) });
    const id = setTimeout(() => setShown(false), SLIDE_OUT_MS + 30);
    return () => clearTimeout(id);
  }, [open, progress]);

  const dim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - progress.value) * OFFSCREEN_X }] }));

  if (!shown) return null;

  return (
    <>
      {/* While closing, taps already reach the menu */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(22, 24, 28, 0.45)' }, dim]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
      </Animated.View>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[{ position: 'absolute', top: 0, right: 0, bottom: 0 }, slide]}
      >
        <Sheet onOpenProduct={onOpenProduct} />
      </Animated.View>
    </>
  );
};

const Sheet = ({ onOpenProduct }: { onOpenProduct: (product: IMenuProduct) => void }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const tableName = useSessionStore((s) => s.participant?.table?.name);
  const close = useOrderSheet((s) => s.close);
  const cart = useCartTotals();
  const { current, loading } = useTableOrders();
  const empty = !cart.quantity && !current.length && !loading;

  // [+] again puts the dish among the new ones at the top: scroll up to it
  const scroll = useRef<ScrollView>(null);
  const toTop = useCallback(() => scroll.current?.scrollTo({ y: 0, animated: true }), []);

  return (
    <View className="h-full w-115 rounded-l-[28px] bg-surface">
      <View className="flex-row items-start justify-between gap-4 px-6.5 pb-4 pt-6.5">
        <View className="gap-0.5">
          <Text className="text-[28px] font-bold tracking-tight">{t('mainPage.YourOrder')}</Text>
          {!!tableName && <Text className="text-muted">{t('mainPage.toast_from_table', { table: tableName })}</Text>}
        </View>
        <Button
          isIconOnly
          variant="secondary"
          className="size-12 rounded-full"
          onPress={close}
          accessibilityLabel={t('mainPage.close')}
        >
          <X size={22} color={foreground} />
        </Button>
      </View>

      <ScrollView ref={scroll} className="flex-1" contentContainerClassName="gap-4 px-6.5 pb-5 pt-1">
        {empty && <Text className="mt-10 self-stretch text-center text-muted">{t('mainPage.cartEmpty')}</Text>}
        <NewItems />
        <OrderedList onOpenProduct={onOpenProduct} onAdded={toTop} />
      </ScrollView>

      {cart.quantity > 0 ? <SendBar /> : <BillBar />}
    </View>
  );
};
