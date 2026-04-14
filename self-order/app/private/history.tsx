import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View, FlatList } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { GET_TABLET_ORDERS } from '@/src/graphql/queries';
import { defaultColor } from '@/src/constants/Colors';
import { moneyFormat } from '@/src/utils/moneyFormat';
import Loader from '@/src/components/ui/Loader';
import { IOrder, IOrderItem } from '@/src/types';
import { useThemeStore } from '@/src/store/theme.store';
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
  t: (key: string) => string;
}

const OrderCard = ({ order, t }: OrderCardProps) => {
  const { theme } = useThemeStore();
  const stateColor = ORDER_STATE_COLOR[order.state] || '#6b7280';
  const paymentColor = PAYMENT_STATE_COLOR[order.paymentState] || '#6b7280';
  return (
    <View style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
        {order.items?.map((item: IOrderItem, index: number) => (
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
            <Text style={[styles.itemPrice, { color: theme.text }]}>{moneyFormat(item.price * item.quantity)}₮</Text>
          </View>
        ))}
      </View>

      <View style={[styles.orderFooter, { borderTopColor: theme.border }]}>
        <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>{t('mainPage.Total')}</Text>
        <Text style={[styles.totalAmount, { color: theme.primary }]}>{moneyFormat(order.grandTotal)}₮</Text>
      </View>
    </View>
  );
};

const HistoryPage = () => {
  const { t } = useTranslation('language');
  const router = useRouter();
  const { theme } = useThemeStore();

  const { data, loading, refetch } = useQuery(GET_TABLET_ORDERS, {
    variables: { limit: 10 },
    fetchPolicy: 'network-only',
  });

  const orders = data?.getTabletOrders || [];

  const renderOrderItem = useCallback(({ item }: { item: IOrder }) => <OrderCard order={item} t={t} />, [t]);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon source="history" size={80} color="#d1d5db" />
      <Text style={styles.emptyText}>{t('mainPage.noOrderHistory')}</Text>
    </View>
  );

  if (loading) return <Loader />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#111827',
  },
  refreshButton: {
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  orderCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stateBadges: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: defaultColor,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  orderItems: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  itemQuantity: {
    fontSize: 17,
    fontWeight: '700',
    color: defaultColor,
    marginRight: 10,
    minWidth: 32,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 17,
    color: '#1f2937',
    fontWeight: '500',
    lineHeight: 22,
  },
  itemOptions: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
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
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 20,
    fontWeight: '500',
  },
});

export default HistoryPage;
