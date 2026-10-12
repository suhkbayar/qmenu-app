import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Spinner, cn, useThemeColor } from 'heroui-native';
import { router } from 'expo-router';
import { Gift, History, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useOrderSheet } from '@/src/features/cart/orderSheetStore';
import { lineTotal } from '@/src/features/cart/totals';
import { AddAgainButton, useAddAgain } from '@/src/features/cart/useAddAgain';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { formatMoney, formatTime } from '@/src/lib/format';
import { getCdnImageUrl } from '@/src/lib/image';
import { findDesserts } from '@/src/lib/menu';
import { IMenuProduct, IOrder, IOrderItem } from '@/src/types';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';
import { BillButtons } from './BillButtons';
import { NEUTRAL_TONE, ORDER_STATE_LABEL, ORDER_STATE_TONE } from './orderStatus';
import { isReceivedGift, itemsByTime, useTableOrders } from './useTableOrders';

/**
 * The order sheet's Захиалсан tab: the current guests' orders like a ticket at the till, each item
 * with the time it was ordered and [+] to order it again; and while something is unpaid, the bill:
 * paying it here or asking staff for it. Earlier guests' orders are only in the order history.
 */
export const OrderedTab = ({ onOpenProduct }: { onOpenProduct: (product: IMenuProduct) => void }) => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const { orders, current, ownTableId, loading, refetch, due, toPay } = useTableOrders();
  const { productOf, addAgain } = useAddAgain(onOpenProduct);
  const show = useOrderSheet((s) => s.show);
  // Into the cart, and over to Сагс where it's waiting with the Order button
  const orderAgain = (product: IMenuProduct) => {
    show('cart');
    addAgain(product);
  };

  // Fresh statuses every time it opens
  useEffect(() => {
    refetch().catch(() => {});
  }, []);

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6.5 py-5">
        {loading && !orders.length && <Spinner className="mt-10 self-center" />}
        {!loading && !current.length && <Text className="mt-10 text-center text-muted">{t('mainPage.noActiveOrders')}</Text>}
        {current.map((order) =>
          isReceivedGift(order, ownTableId) ? (
            <ReceivedGiftCard key={order.id} order={order} ownTableId={ownTableId!} />
          ) : (
            <OrderCard key={order.id} order={order} productOf={productOf} onAddAgain={orderAgain} />
          ),
        )}
        <DessertCard
          orders={current.filter((order) => !isReceivedGift(order, ownTableId))}
          onAdd={orderAgain}
        />
        {/* Every order today, earlier ones too: for when a guest says they ordered but it isn't here */}
        {orders.length > 0 && (
          <Button variant="ghost" className="self-center" onPress={() => router.push('/history')}>
            <History size={18} color={foreground} />
            <Button.Label numberOfLines={1}>{t('mainPage.orderHistory')}</Button.Label>
          </Button>
        )}
      </ScrollView>

      {/* Only while something is left to pay: once everything is paid there's no bill to ask for */}
      {due > 0 && !!toPay && (
        <View className="gap-4 border-t border-border px-6.5 pb-6.5 pt-4.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-muted">{t('mainPage.AmountPaid')}</Text>
            <Text className="text-3xl font-bold tracking-tight">{formatMoney(due)}</Text>
          </View>
          {/* Several unpaid orders are paid one at a time, oldest first */}
          <BillButtons order={toPay} />
        </View>
      )}
    </>
  );
};

/** A gift another table sent us: who from, the gifted dishes and how they're coming along. No prices, no paying. */
const ReceivedGiftCard = ({ order, ownTableId }: { order: IOrder; ownTableId: string }) => {
  const { t } = useTranslation('language');
  const tone = ORDER_STATE_TONE[order.state] ?? NEUTRAL_TONE;
  const gift = order.gifts?.find((g) => g.toTableId === ownTableId);
  const giftedIds = new Set(gift?.itemIds ?? []);
  const items = order.items.filter((item) => giftedIds.has(item.id ?? '') && item.state !== 'RETURN');

  return (
    <View className="gap-3 rounded-[22px] bg-gift-soft p-4.5">
      <View className="flex-row items-center gap-3">
        {/* White on the red, as a fixed colour: theme text colours on fills were unreliable */}
        <View className="size-10 items-center justify-center rounded-xl bg-gift">
          <Gift size={20} color="#FFFFFF" strokeWidth={2.3} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-gift-text" numberOfLines={1}>
            {t('mainPage.gift_toast_eyebrow')}
          </Text>
          <Text className="text-lg font-bold" numberOfLines={1}>
            {gift?.anonymous || !gift?.fromTableName
              ? t('mainPage.toast_from_anonymous')
              : t('mainPage.toast_from_table', { table: gift.fromTableName })}
          </Text>
        </View>
        <Text className={cn('overflow-hidden rounded-full px-3 py-1 text-sm font-semibold', tone)}>
          {ORDER_STATE_LABEL[order.state] ?? order.state}
        </Text>
      </View>
      {items.map((item) => (
        <Text key={item.id ?? item.uuid}>
          {item.quantity} × {item.name}
        </Text>
      ))}
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
        <Text className={cn('overflow-hidden rounded-full px-3 py-1 text-sm font-semibold', tone)}>
          {ORDER_STATE_LABEL[order.state] ?? order.state}
        </Text>
      </View>
      {/* Like a till's ticket: each line with the time it was ordered, in that order */}
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
  const categories = useSessionStore((s) => s.participant?.menu?.categories);
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
