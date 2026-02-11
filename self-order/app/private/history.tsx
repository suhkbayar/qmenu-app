import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View, FlatList } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { GET_TABLET_ORDERS } from '@/graphql/query';
import { defaultColor } from '@/constants/Colors';
import { moneyFormat } from '@/utils/moneyFormat';
import Loader from '@/components/Loader';
import { IOrder, IOrderItem } from '@/types';

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
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{order.number?.slice(-4)}</Text>
        <Text style={styles.orderDate}>{formatDate(order.createdAt?.toString() || '')}</Text>
      </View>

      <View style={styles.orderItems}>
        {order.items?.map((item: IOrderItem, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.variantName || item.name}
                </Text>
                {item.options && item.options.length > 0 && (
                  <Text style={styles.itemOptions} numberOfLines={2}>
                    {item.options.map((opt: any) => opt.value || opt.name).join(', ')}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.itemPrice}>{moneyFormat(item.price * item.quantity)}₮</Text>
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>{t('mainPage.Total')}</Text>
        <Text style={styles.totalAmount}>{moneyFormat(order.grandTotal)}₮</Text>
      </View>
    </View>
  );
};

const HistoryPage = () => {
  const { t } = useTranslation('language');
  const router = useRouter();

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon source="arrow-left" size={24} color="#333" />
          <Text style={styles.backText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{t('mainPage.orderHistory')}</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshButton}>
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
