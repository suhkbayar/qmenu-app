import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button, cn, useThemeColor } from 'heroui-native';
import { router } from 'expo-router';
import { History, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { lineTotal } from '@/src/features/cart/totals';
import { AddAgainButton, useAddAgain } from '@/src/features/cart/useAddAgain';
import { useOpenCategories } from '@/src/features/menu/useMenu';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { formatMoney, formatTime } from '@/src/lib/format';
import { getCdnImageUrl } from '@/src/lib/image';
import { findDesserts } from '@/src/lib/menu';
import { IMenuProduct, IOrder, IOrderItem } from '@/src/types';
import { Appear } from '@/src/ui/Appear';
import { Image } from '@/src/ui/Image';
import { Spinner } from '@/src/ui/Spinner';
import { Text } from '@/src/ui/Text';
import { BillButtons } from './BillButtons';
import { NEUTRAL_TONE, ORDER_STATE_LABEL, ORDER_STATE_TONE } from './orderStatus';
import { itemsByTime, useTableOrders } from './useTableOrders';

/**
 * The order panel under the new dishes: the current guests' orders like a ticket at the till, each
 * item with the time it was ordered and [+] to have it again, which puts it up among the new dishes
 * (`onAdded`). Earlier guests' orders are only in the order history.
 */
export const OrderedList = ({
  onOpenProduct,
  onAdded,
}: {
  onOpenProduct: (product: IMenuProduct) => void;
  onAdded: () => void;
}) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const { orders, current, loading, refetch } = useTableOrders();
  const { productOf, addAgain } = useAddAgain(onOpenProduct);
  const waiting = loading && !orders.length;
  // Opened before the orders had loaded: they fade in where the spinner was
  const [fadeIn] = useState(waiting);
  const orderAgain = (product: IMenuProduct) => {
    addAgain(product);
    onAdded();
  };

  // Fresh statuses every time it opens
  useEffect(() => {
    refetch().catch(() => {});
  }, []);

  if (waiting) return <Spinner className="mt-10 self-center" />;
  if (!orders.length) return null;

  const list = (
    <>
      {current.length > 0 && (
        <Text className="mt-1 text-sm font-bold uppercase tracking-wide text-muted" numberOfLines={1}>
          {t('mainPage.ordered')}
        </Text>
      )}
      {current.map((order) => (
        <OrderCard key={order.id} order={order} productOf={productOf} onAddAgain={orderAgain} />
      ))}
      <DessertCard orders={current} onAdd={orderAgain} />
      {/* Every order today, earlier ones too: for when a guest says they ordered but it isn't here */}
      <Button variant="ghost" className="self-center" onPress={() => router.push('/history')}>
        <History size={18} color={foreground} />
        <Button.Label numberOfLines={1}>{t('mainPage.orderHistory')}</Button.Label>
      </Button>
    </>
  );
  // The same gap as the sheet's own list
  return fadeIn ? (
    <Appear duration={180} className="gap-4">
      {list}
    </Appear>
  ) : (
    list
  );
};

/**
 * The order panel's footer while nothing new is waiting to be sent: the bill, paid here or asked
 * for from staff. Nothing once everything is paid.
 */
export const BillBar = () => {
  const { t } = useTranslation('language');
  const { due, toPay } = useTableOrders();
  if (!(due > 0 && toPay)) return null;

  return (
    <View className="gap-4 border-t border-border px-6.5 pb-6.5 pt-4.5">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-muted">{t('mainPage.AmountPaid')}</Text>
        <Text className="text-3xl font-bold tracking-tight">{formatMoney(due)}</Text>
      </View>
      {/* Several unpaid orders are paid one at a time, oldest first */}
      <BillButtons order={toPay} />
    </View>
  );
};

const OrderCard = ({
  order,
  productOf,
  onAddAgain,
}: {
  order: IOrder;
  productOf: (item: IOrderItem) => IMenuProduct | undefined;
  onAddAgain: (product: IMenuProduct) => void;
}) => {
  const tone = ORDER_STATE_TONE[order.state] ?? NEUTRAL_TONE;

  return (
    <View className="gap-3 rounded-[22px] border border-border p-4.5">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-lg font-bold">#{order.number?.slice(-4)}</Text>
        {/* Drawn anew for each state: a changed colour class could keep the old colour on the tablets */}
        <Text key={order.state} className={cn('overflow-hidden rounded-full px-3 py-1 text-sm font-semibold', tone)}>
          {ORDER_STATE_LABEL[order.state] ?? order.state}
        </Text>
      </View>
      {/* Like a till's ticket: each line with the time it was ordered, the latest on top */}
      {itemsByTime(order.items).map((item) => {
        const product = productOf(item);
        return (
          <View key={item.id ?? item.uuid} className="min-h-10 flex-row items-center gap-3">
            <Text className="w-12 text-sm font-semibold text-muted">
              {item.createdAt ? formatTime(item.createdAt) : ''}
            </Text>
            <View className="min-w-0 flex-1">
              <Text>
                {item.quantity} × {item.name}
              </Text>
              {!!item.comment && (
                <Text className="text-sm italic text-muted" numberOfLines={2}>
                  {item.comment}
                </Text>
              )}
            </View>
            <Text className="font-semibold">{formatMoney(item.total ?? lineTotal(item))}</Text>
            {product && <AddAgainButton onPress={() => onAddAgain(product)} />}
          </View>
        );
      })}
    </View>
  );
};

/**
 * Once something has reached the table and no dessert is on the order: a quiet "something sweet?"
 * with three of the menu's desserts, one tap each. Never a pop-up; nothing if the menu has no
 * dessert category.
 */
const DessertCard = ({ orders, onAdd }: { orders: IOrder[]; onAdd: (product: IMenuProduct) => void }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const hidePrice = useSessionStore((s) => s.config?.hidePrice === true);
  // Only desserts on the menu right now (a dessert menu with its own hours)
  const categories = useOpenCategories(useSessionStore((s) => s.participant?.menu?.categories));
  const desserts = useMemo(() => findDesserts(categories), [categories]);

  const items = orders.flatMap((order) => order.items);
  const served = orders.some((order) => order.state === 'DELIVERED') || items.some((item) => item.state === 'DELIVERED');
  const dessertIds = new Set(desserts.map((product) => product.productId));
  const hasDessert = items.some((item) => !!item.productId && dessertIds.has(item.productId));
  if (!served || hasDessert || !desserts.length) return null;

  return (
    <View className="gap-3 rounded-[22px] bg-accent-tint p-4">
      <Text className="text-lg font-bold">{t('mainPage.dessertPrompt')}</Text>
      <View className="flex-row gap-2.5">
        {desserts.slice(0, 3).map((product) => (
          <View key={product.productId} className="w-[31.5%] gap-1.5 rounded-2xl bg-surface p-2">
            <Image
              source={product.image ? { uri: getCdnImageUrl(product.image, 'sm') } : require('@/assets/images/noImage.jpg')}
              className="h-16 w-full rounded-xl bg-surface-tertiary"
              contentFit="cover"
            />
            <Text className="text-sm font-semibold" numberOfLines={1}>
              {product.name}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold">
                {hidePrice ? '' : formatMoney(product.variants?.[0]?.salePrice ?? 0)}
              </Text>
              <Button
                isIconOnly
                className="size-9 rounded-full"
                onPress={() => onAdd(product)}
                accessibilityLabel={t('mainPage.add')}
              >
                <Plus size={16} color={accentForeground} strokeWidth={2.4} />
              </Button>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
