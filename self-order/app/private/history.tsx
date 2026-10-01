import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View, FlatList } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@apollo/client';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { defaultColor } from '@/src/constants/Colors';
import { moneyFormat } from '@/src/utils/moneyFormat';
import Loader from '@/src/components/ui/Loader';
import { IOrder, IOrderItem } from '@/src/types';
import { useThemeStore } from '@/src/store/theme.store';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
import { useTableMessageStore } from '@/src/store/tableMessage.store';
import { getPayload } from '@/src/providers/auth';
import { parseOrderItemData } from '@/src/utils/orderItemData';
import AnimatedEmoji from '@/src/components/ui/AnimatedEmoji';
import { GIFT_EMOJI, TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { ORDER_STATE_COLOR, ORDER_STATE_LABEL, PAYMENT_STATE_COLOR, PAYMENT_STATE_LABEL } from '@/src/utils/orderState';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface OrderCardProps {
  order: IOrder;
  t: (key: string, opts?: any) => string;
  highlighted: boolean;
  ownTableId: string | null;
}

const OrderCard = ({ order, t, highlighted, ownTableId }: OrderCardProps) => {
  const { theme } = useThemeStore();
  const g = useGiftTheme();
  const openComposer = useTableMessageStore((s) => s.openComposer);
  const stateColor = ORDER_STATE_COLOR[order.state] || '#6b7280';
  const paymentColor = PAYMENT_STATE_COLOR[order.paymentState] || '#6b7280';

  const gifts = order.gifts ?? [];
  const giftedIds = new Set(gifts.flatMap((g) => g.itemIds ?? []));
  const giftItems = (order.items ?? []).filter((item: IOrderItem) => giftedIds.has(item.id ?? ''));
  const isGift = giftItems.length > 0;

  const isRecipient = isGift && !!ownTableId && order.table?.id !== ownTableId;
  const isSender = isGift && !isRecipient;

  const gift = gifts.find((g) => (isRecipient ? g.toTableId === ownTableId : true)) ?? undefined;
  const ownIds = new Set(gift?.itemIds ?? []);

  const visibleItems = isRecipient
    ? (order.items ?? []).filter((item: IOrderItem) => ownIds.has(item.id ?? ''))
    : (order.items ?? []);

  const giftToTableName = parseOrderItemData(giftItems[0]?.data).giftToTableName;

  const giftFromTableName = gift?.fromTableName ?? order.table?.name;
  const giftSticker = TABLE_MESSAGE_STICKERS.find((st) => st.id === gift?.stickerId);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!highlighted) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      4,
      true,
    );
  }, [highlighted]);

  const highlightStyle = useAnimatedStyle(() => ({
    shadowOpacity: highlighted ? 0.15 + pulse.value * 0.4 : 0.06,
    shadowRadius: highlighted ? 8 + pulse.value * 10 : 8,
  }));

  return (
    <Animated.View
      style={[
        styles.orderCard,
        { backgroundColor: theme.card, borderColor: highlighted ? g.gold : theme.border },
        highlighted && [styles.orderCardHighlighted, { shadowColor: g.gold }],
        highlightStyle,
      ]}
    >
      {isGift && (
        <View style={[styles.giftBanner, { backgroundColor: g.gold + '1c' }]}>
          <View style={styles.giftBannerEmoji}>
            <AnimatedEmoji emoji={giftSticker?.emoji ?? GIFT_EMOJI} anim={giftSticker?.anim ?? 'pop'} size={30} />
          </View>
          <View style={styles.giftBannerTextWrap}>
            <Text style={styles.giftBannerTitle} numberOfLines={1}>
              {isSender
                ? t('mainPage.history_gift_sent', {
                    table: giftToTableName,
                    defaultValue: `Sent to Table ${giftToTableName}`,
                  })
                : t('mainPage.history_gift_from', {
                    table: giftFromTableName,
                    defaultValue: `Gift from Table ${giftFromTableName}`,
                  })}
            </Text>
            {!!giftSticker && (
              <Text style={styles.giftBannerMessage} numberOfLines={1}>
                “{t(`mainPage.${giftSticker.labelKey}`)}”
              </Text>
            )}
          </View>

          {isRecipient && !!gift?.fromTableId && !gift.respondedAt && (
            <TouchableOpacity
              onPress={() => openComposer({ id: gift.fromTableId!, name: giftFromTableName ?? '' }, gift.id)}
              activeOpacity={0.85}
              style={[styles.giftReplyButton, { backgroundColor: g.gold }]}
            >
              <Icon source="reply" size={18} color={g.onGold} />
              <Text style={[styles.giftReplyText, { color: g.onGold }]}>{t('mainPage.reply_action', 'Reply')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.orderHeader, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.orderNumber, { color: theme.primary }]}>#{order.number?.slice(-4)}</Text>
          <Text style={[styles.orderDate, { color: theme.textMuted }]}>
            {formatDate(order.createdAt?.toString() || '')}
          </Text>
        </View>
        <View style={styles.stateBadges}>
          {order.state ? (
            <View style={[styles.badge, { backgroundColor: stateColor + '22', borderColor: stateColor }]}>
              <Text style={[styles.badgeText, { color: stateColor }]}>
                {ORDER_STATE_LABEL[order.state] ?? order.state}
              </Text>
            </View>
          ) : null}
          {order.paymentState ? (
            <View style={[styles.badge, { backgroundColor: paymentColor + '22', borderColor: paymentColor }]}>
              <Text style={[styles.badgeText, { color: paymentColor }]}>
                {PAYMENT_STATE_LABEL[order.paymentState] ?? order.paymentState}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.orderItems}>
        {visibleItems.map((item: IOrderItem, index: number) => (
          <View key={index} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
            <View style={styles.itemLeft}>
              <Text style={[styles.itemQuantity, { color: theme.primary }]}>{item.quantity}x</Text>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
                  {item.variantName || item.name}
                </Text>
                {item.options && item.options.length > 0 && (
                  <Text style={[styles.itemOptions, { color: theme.textMuted }]} numberOfLines={2}>
                    {item.options.map((opt: any) => opt.value || opt.name).join(', ')}
                  </Text>
                )}
              </View>
            </View>
            {!isRecipient && (
              <Text style={[styles.itemPrice, { color: theme.text }]}>{moneyFormat(item.price * item.quantity)}₮</Text>
            )}
          </View>
        ))}
      </View>

      {!isRecipient && (
        <View style={[styles.orderFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>{t('mainPage.Total')}</Text>
          <Text style={[styles.totalAmount, { color: theme.primary }]}>{moneyFormat(order.grandTotal)}₮</Text>
        </View>
      )}
    </Animated.View>
  );
};

const HistoryPage = () => {
  const { t } = useTranslation('language');
  const router = useRouter();
  const { theme } = useThemeStore();
  const { highlightOrderId } = useLocalSearchParams<{ highlightOrderId?: string }>();

  const { data, loading, refetch } = useQuery(GET_TABLET_ORDERS, {
    variables: { limit: 10 },
    fetchPolicy: 'network-only',
  });

  const [ownTableId, setOwnTableId] = useState<string | null>(null);
  useEffect(() => {
    getPayload().then((payload) => setOwnTableId(payload?.table ?? null));
  }, []);

  const composerOpen = useTableMessageStore((s) => s.composerOpen);
  const wasComposerOpen = useRef(false);

  useEffect(() => {
    if (wasComposerOpen.current && !composerOpen) refetch();
    wasComposerOpen.current = composerOpen;
  }, [composerOpen, refetch]);

  const orders = data?.getTabletOrders || [];

  const renderOrderItem = useCallback(
    ({ item }: { item: IOrder }) => (
      <OrderCard
        order={item}
        t={t}
        highlighted={!!highlightOrderId && item.id === highlightOrderId}
        ownTableId={ownTableId}
      />
    ),
    [t, highlightOrderId, ownTableId],
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon source="party-popper" size={90} color={theme.border} />
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('mainPage.noOrderHistory')}</Text>
    </View>
  );

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon source="arrow-left" size={24} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.text }]}>{t('mainPage.orderHistory')}</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={[styles.refreshButton, { backgroundColor: theme.backgroundTertiary }]}
        >
          <Icon source="refresh" size={24} color={defaultColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id || ''}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 26,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backText: {
    fontSize: 19,
    fontWeight: '600',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 14,
  },
  listContent: {
    padding: 22,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  orderCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    width: '48%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardHighlighted: {
    borderWidth: 2,
    elevation: 8,
  },
  giftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  giftBannerEmoji: { marginRight: 12 },
  giftBannerTextWrap: { flex: 1 },
  giftReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginLeft: 12,
  },
  giftReplyText: { fontSize: 15, fontWeight: '700' },
  giftBannerTitle: { fontSize: 16, fontWeight: '800', color: '#8a5a00' },
  giftBannerMessage: { fontSize: 15, fontStyle: 'italic', color: '#8a5a00', marginTop: 3 },
  stateBadges: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  orderNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: defaultColor,
  },
  orderDate: {
    fontSize: 15,
    fontWeight: '500',
  },
  orderItems: {
    marginBottom: 18,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  itemQuantity: {
    fontSize: 18,
    fontWeight: '700',
    color: defaultColor,
    marginRight: 10,
    minWidth: 34,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 24,
  },
  itemOptions: {
    fontSize: 15,
    marginTop: 5,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    marginTop: 4,
    borderTopWidth: 2,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: defaultColor,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    marginTop: 22,
    fontWeight: '500',
  },
});

export default HistoryPage;
