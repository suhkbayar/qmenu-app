import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { Button, cn, useThemeColor } from 'heroui-native';
import { PartyPopper, RefreshCw, Reply } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { useSocialStore } from '@/src/features/social/socialStore';
import { Sticker } from '@/src/features/social/Sticker';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { formatDateTime, formatMoney } from '@/src/lib/format';
import { getPayload } from '@/src/providers/auth';
import { IOrder } from '@/src/types';
import { parseOrderItemData } from '@/src/lib/orderItemData';
import { ORDER_STATE_LABEL, PAYMENT_STATE_LABEL } from '@/src/features/orders/orderStatus';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { ScreenHeader } from '@/src/ui/ScreenHeader';
import { Text } from '@/src/ui/Text';
import { NEUTRAL_TONE, ORDER_STATE_TONE, PAYMENT_STATE_TONE } from './orderStatus';
import { lineTotal } from '@/src/features/cart/totals';

/** This tablet's last orders, including gifts it sent and gifts it received. */
export const OrderHistoryScreen = () => {
  const { t } = useTranslation('language');
  const foreground = useThemeColor('foreground');
  const muted = useThemeColor('muted');
  const [ownTableId, setOwnTableId] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery(GET_TABLET_ORDERS, {
    variables: { limit: 10 },
    fetchPolicy: 'network-only',
  });
  const orders: IOrder[] = data?.getTabletOrders ?? [];

  useEffect(() => {
    getPayload().then((payload) => setOwnTableId(payload?.table ?? null));
  }, []);

  // After replying to a gift from here (its card), reload so its Reply button goes away
  const cardOpen = useSocialStore((s) => s.inbox.length > 0);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !cardOpen) refetch();
    wasOpen.current = cardOpen;
  }, [cardOpen, refetch]);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title={t('mainPage.orderHistory')}
        right={
          <Button isIconOnly variant="secondary" className="size-13 rounded-2xl" onPress={() => refetch()}>
            <RefreshCw size={22} color={foreground} />
          </Button>
        }
      />
      {loading && !orders.length ? (
        <LogoLoader className="mt-20 self-center" />
      ) : orders.length ? (
        <ScrollView contentContainerClassName="flex-row flex-wrap gap-4 p-6">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} ownTableId={ownTableId} />
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center gap-4">
          <PartyPopper size={90} color={muted} strokeWidth={1.2} />
          <Text className="text-lg text-muted">{t('mainPage.noOrderHistory')}</Text>
        </View>
      )}
    </View>
  );
};

const Chip = ({ label, tone }: { label: string; tone: string }) => (
  <Text className={cn('overflow-hidden rounded-full px-3 py-1 text-sm font-semibold', tone)}>{label}</Text>
);

const OrderCard = ({ order, ownTableId }: { order: IOrder; ownTableId: string | null }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const receive = useSocialStore((s) => s.receive);

  // An order with gifts: this table either sent them, or received them (the order is another table's)
  const gifts = order.gifts ?? [];
  const giftedIds = new Set(gifts.flatMap((g) => g.itemIds ?? []));
  const giftItems = order.items.filter((item) => giftedIds.has(item.id ?? ''));
  const isGift = giftItems.length > 0;
  const received = isGift && !!ownTableId && order.table?.id !== ownTableId;
  const gift = gifts.find((g) => (received ? g.toTableId === ownTableId : true));
  const sticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === gift?.stickerId);
  const fromName = gift?.fromTableName ?? order.table?.name ?? '';

  // A recipient sees only the dishes gifted to them, and no prices
  const ownIds = new Set(gift?.itemIds ?? []);
  const items = received ? order.items.filter((item) => ownIds.has(item.id ?? '')) : order.items;

  return (
    <View className="w-[49%] overflow-hidden rounded-3xl border border-border bg-surface">
      {isGift && (
        <View className="flex-row items-center gap-3 bg-gift-soft px-4 py-3">
          <Sticker id={sticker?.id ?? 'GIFT'} size={34} />
          <View className="flex-1">
            <Text className="font-bold" numberOfLines={1}>
              {received
                ? t('mainPage.history_gift_from', { table: fromName, defaultValue: `Gift from Table ${fromName}` })
                : t('mainPage.history_gift_sent', {
                    table: parseOrderItemData(giftItems[0]?.data).giftToTableName,
                    defaultValue: `Sent to Table ${parseOrderItemData(giftItems[0]?.data).giftToTableName}`,
                  })}
            </Text>
            {!!sticker && (
              <Text className="text-sm italic text-muted" numberOfLines={1}>
                “{t(`mainPage.${sticker.labelKey}`)}”
              </Text>
            )}
          </View>
          {received && !!gift?.fromTableId && !gift.respondedAt && (
            <Button
              size="sm"
              className="rounded-xl"
              // Opens the gift's card again, with its one-tap replies
              onPress={() =>
                receive({
                  kind: 'gift',
                  giftId: gift.id,
                  stickerId: gift.stickerId,
                  fromTableId: gift.fromTableId,
                  fromTableName: fromName,
                  itemsSummary: items.map((item) => `${item.quantity} × ${item.name}`).join(', '),
                })
              }
            >
              <Reply size={18} color={accentForeground} />
              <Button.Label numberOfLines={1} className="font-bold">{t('mainPage.reply_action', 'Reply')}</Button.Label>
            </Button>
          )}
        </View>
      )}

      <View className="flex-row items-start justify-between gap-3 border-b border-border px-5 py-4">
        <View>
          <Text className="text-xl font-bold">#{order.number?.slice(-4)}</Text>
          <Text className="text-sm text-muted">{formatDateTime(order.createdAt)}</Text>
        </View>
        <View className="flex-row flex-wrap justify-end gap-1.5">
          {!!order.state && (
            <Chip
              label={ORDER_STATE_LABEL[order.state] ?? order.state}
              tone={ORDER_STATE_TONE[order.state] ?? NEUTRAL_TONE}
            />
          )}
          {!!order.paymentState && (
            <Chip
              label={PAYMENT_STATE_LABEL[order.paymentState] ?? order.paymentState}
              tone={PAYMENT_STATE_TONE[order.paymentState] ?? NEUTRAL_TONE}
            />
          )}
        </View>
      </View>

      <View className="gap-2.5 px-5 py-4">
        {items.map((item, index) => (
          <View key={item.id ?? index} className="flex-row justify-between gap-3">
            <View className="flex-1">
              <Text>
                <Text className="font-bold">{item.quantity}× </Text>
                {item.variantName || item.name}
              </Text>
              {!!item.options?.length && (
                <Text className="text-sm text-muted" numberOfLines={2}>
                  {item.options.map((o) => o.value || o.name).join(', ')}
                </Text>
              )}
            </View>
            {!received && <Text className="font-semibold">{formatMoney(item.total ?? lineTotal(item))}</Text>}
          </View>
        ))}
      </View>

      {!received && (
        <View className="flex-row items-baseline justify-between border-t border-border px-5 py-3.5">
          <Text className="text-muted">{t('mainPage.Total')}</Text>
          <Text className="text-xl font-bold">{formatMoney(order.grandTotal)}</Text>
        </View>
      )}
    </View>
  );
};
