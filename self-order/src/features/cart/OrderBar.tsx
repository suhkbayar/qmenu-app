import { View } from 'react-native';
import { Button, PressableFeedback, cn, useThemeColor } from 'heroui-native';
import { ChevronRight, ReceiptText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCheckout } from '@/src/features/checkout/checkoutStore';
import { ORDER_STATE_LABEL, ORDER_STATE_TONE } from '@/src/features/orders/orderStatus';
import { useTableOrders } from '@/src/features/orders/useTableOrders';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { formatMoney } from '@/src/lib/format';
import { Text } from '@/src/ui/Text';
import { useCartTotals } from './cartStore';
import { useOrderSheet } from './orderSheetStore';

// Fixed colours on the fills: theme text colours on filled shapes came out wrong on the tablets
const INK = '#16181C';
const PAPER = '#FFFFFF';
const FLOAT = { elevation: 8, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } };

/**
 * Along the bottom of the menu, the one place the order lives: the cart while there's something in
 * it ("3 · Сагс харах · 45,000₮"), otherwise the table's orders still in the kitchen or unpaid, with
 * Pay. Tapping it opens the order sheet on that tab. Hidden (but kept mounted, so it doesn't reload
 * the orders every time) while the sheet is open.
 */
export const OrderBar = ({ hidden }: { hidden: boolean }) => {
  const { t } = useTranslation('language');
  const [foreground, muted] = useThemeColor(['foreground', 'muted']);
  const cart = useCartTotals();
  // Always on screen, so it's the one that loads the table's orders for the sheet and the rest
  const { activeItems, due, toPay, comingState } = useTableOrders({ fresh: true });
  const canPayHere = useSessionStore((s) => (s.participant?.payments?.length ?? 0) > 0);
  const show = useOrderSheet((s) => s.show);
  const openCheckout = useCheckout((s) => s.open);

  if (hidden) return null;

  if (cart.quantity > 0) {
    return (
      <View className="rounded-3xl bg-accent" style={FLOAT}>
        <PressableFeedback
          onPress={() => show('cart')}
          accessibilityRole="button"
          className="h-20 flex-row items-center gap-4 rounded-3xl pl-3.5 pr-6"
        >
          <View className="size-13 items-center justify-center rounded-2xl" style={{ backgroundColor: INK }}>
            <Text className="text-xl font-bold" style={{ color: PAPER }}>
              {cart.quantity}
            </Text>
          </View>
          <Text className="flex-1 text-xl font-bold" style={{ color: INK }} numberOfLines={1}>
            {t('mainPage.viewCart')}
          </Text>
          <Text className="text-2xl font-bold tracking-tight" style={{ color: INK }}>
            {formatMoney(cart.amount)}
          </Text>
          <ChevronRight size={24} color={INK} strokeWidth={2.4} />
        </PressableFeedback>
      </View>
    );
  }

  if (!activeItems) return null;

  return (
    <View className="h-20 flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-3.5" style={FLOAT}>
      <PressableFeedback
        onPress={() => show('ordered')}
        accessibilityRole="button"
        className="h-16 min-w-0 flex-1 flex-row items-center gap-3.5 rounded-2xl px-1"
      >
        <View className="size-13 items-center justify-center rounded-2xl bg-surface-secondary">
          <ReceiptText size={24} color={foreground} />
        </View>
        <Text className="shrink text-lg font-bold" numberOfLines={1}>
          {t('mainPage.myOrders')} ({activeItems})
        </Text>
        {/* Where it is in the kitchen, so the table needn't ask; gone once everything is served */}
        {!!comingState && (
          <Text
            className={cn('overflow-hidden rounded-full px-3 py-1 text-sm font-semibold', ORDER_STATE_TONE[comingState])}
            numberOfLines={1}
          >
            {ORDER_STATE_LABEL[comingState] ?? comingState}
          </Text>
        )}
        <View className="flex-1" />
        {due > 0 ? (
          <Text className="text-2xl font-bold tracking-tight">{formatMoney(due)}</Text>
        ) : (
          <ChevronRight size={24} color={muted} />
        )}
      </PressableFeedback>
      {due > 0 && canPayHere && !!toPay?.id && (
        <Button size="lg" className="h-14 rounded-[18px] px-7.5" onPress={() => openCheckout(toPay.id!)}>
          <Button.Label numberOfLines={1} className="font-bold">
            {t('mainPage.pay')}
          </Button.Label>
        </Button>
      )}
    </View>
  );
};
