import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Tabs, useThemeColor } from 'heroui-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { OrderedTab } from '@/src/features/orders/OrderedTab';
import { useTableOrders } from '@/src/features/orders/useTableOrders';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { IMenuProduct } from '@/src/types';
import { Text } from '@/src/ui/Text';
import { CartTab } from './CartTab';
import { useCartTotals } from './cartStore';
import { OrderSheetTab, useOrderSheet } from './orderSheetStore';

// Slides in by transform only, which the tablets draw smoothly
const slideIn = SlideInRight.duration(260).easing(Easing.out(Easing.cubic));
const slideOut = SlideOutRight.duration(220).easing(Easing.in(Easing.cubic));

/**
 * The order, over the menu from the right, in two tabs with one job each: Сагс (what's about to be
 * sent, then Order) and Захиалсан (what the table has ordered today, [+] to have it again, then
 * settling up). Opened from the order bar; after an order is sent it shows Захиалсан.
 */
export const OrderSheet = ({ onOpenProduct }: { onOpenProduct: (product: IMenuProduct) => void }) => {
  const open = useOrderSheet((s) => s.open);
  const close = useOrderSheet((s) => s.close);

  return (
    <>
      {/* Two siblings so each animates out */}
      {open && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(180)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(22, 24, 28, 0.45)' }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} />
        </Animated.View>
      )}
      {open && (
        <Animated.View entering={slideIn} exiting={slideOut} style={{ position: 'absolute', top: 0, right: 0, bottom: 0 }}>
          <Sheet onOpenProduct={onOpenProduct} />
        </Animated.View>
      )}
    </>
  );
};

const Sheet = ({ onOpenProduct }: { onOpenProduct: (product: IMenuProduct) => void }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const tableName = useSessionStore((s) => s.participant?.table?.name);
  const tab = useOrderSheet((s) => s.tab);
  const show = useOrderSheet((s) => s.show);
  const close = useOrderSheet((s) => s.close);
  const cart = useCartTotals();
  const { activeItems } = useTableOrders();

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

      <View className="px-6.5">
        <Tabs value={tab} onValueChange={(value) => show(value as OrderSheetTab)}>
          <Tabs.List className="w-full">
            <Tabs.Indicator />
            <Tabs.Trigger value="cart" className="flex-1">
              <Tabs.Label numberOfLines={1}>
                {t('mainPage.cartTab')} · {cart.quantity}
              </Tabs.Label>
            </Tabs.Trigger>
            <Tabs.Trigger value="ordered" className="flex-1">
              <Tabs.Label numberOfLines={1}>
                {t('mainPage.ordered')} · {activeItems}
              </Tabs.Label>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </View>

      {tab === 'cart' ? <CartTab /> : <OrderedTab onOpenProduct={onOpenProduct} />}
    </View>
  );
};
