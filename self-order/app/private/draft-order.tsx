import React, { useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useCallStore } from '@/cache/cart.store';
import { useOrder } from '@/providers/OrderProvider';
import { IOrder, IOrderItem } from '@/types';
import { isEmpty } from 'lodash';
import { CURRENCY, TYPE } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import DraftList from '@/components/Card/DraftCard';
import RecommendedCard from '@/components/Card/RecommendedCard';
import { useLazyQuery, useMutation } from '@apollo/client';
import { CREATE_ORDER } from '@/graphql/mutation/order';
import { GET_ORDERS } from '@/graphql/query';
import { GET_CROSS_SELLS } from '@/graphql/query/product';

const DraftOrderPage = () => {
  const { orderState, setOrderState } = useOrder();
  const { participant, order } = useCallStore();
  const { t } = useTranslation('language');
  const router = useRouter();

  const [getCrossSells, { data: cross }] = useLazyQuery(GET_CROSS_SELLS);
  const [createOrder, { loading }] = useMutation(CREATE_ORDER, {
    update(cache, { data: { createOrder } }) {
      const existing = cache.readQuery<{ getOrders: IOrder[] }>({ query: GET_ORDERS });
      if (existing?.getOrders) {
        cache.writeQuery({
          query: GET_ORDERS,
          data: { getOrders: [...existing.getOrders, createOrder] },
        });
      }
    },
    onCompleted: async (data) => {
      const path = participant?.vat ? '/private/vat' : '/private/payment';
      router.push({ pathname: path, params: { orderId: data.createOrder.id } });
    },
  });

  useEffect(() => {
    if (!isEmpty(orderState.items) && participant?.menu?.id) {
      const productIds = orderState.items.map((item) => item.productId).filter(Boolean);
      if (productIds.length > 0) {
        getCrossSells({ variables: { menuId: participant.menu.id, ids: productIds } });
      }
    }
  }, [orderState.items, participant?.menu?.id, getCrossSells]);

  const calculateTotals = useCallback((items: IOrderItem[]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    return { totalAmount, grandTotal: totalAmount, totalQuantity };
  }, []);

  const increase = useCallback(
    (uuid: string) => {
      setOrderState((prev) => {
        const updatedItems = prev.items.map((item) =>
          item.uuid === uuid ? { ...item, quantity: item.quantity + 1 } : item,
        );
        const totals = calculateTotals(updatedItems);
        return { ...prev, items: updatedItems, ...totals };
      });
    },
    [setOrderState, calculateTotals],
  );

  const decrease = useCallback(
    (uuid: string) => {
      setOrderState((prev) => {
        const updatedItems = prev.items
          .map((item) => {
            if (item.uuid === uuid) {
              if (item.quantity > 1) {
                return { ...item, quantity: item.quantity - 1 };
              } else {
                return null;
              }
            }
            return item;
          })
          .filter((item): item is IOrderItem => item !== null);

        const totals = calculateTotals(updatedItems);
        return { ...prev, items: updatedItems, ...totals };
      });
    },
    [setOrderState, calculateTotals],
  );

  const preparedItems = useMemo(() => {
    return orderState.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      comment: item.comment,
      options: item.options?.map((opt) => ({ id: opt.id, value: opt.value })) || [],
    }));
  }, [orderState.items]);

  const onSubmit = useCallback(() => {
    if (isEmpty(orderState.items) || isEmpty(participant)) {
      return;
    }

    createOrder({
      variables: {
        participant: participant?.id,
        input: {
          type: TYPE.DINIG,
          deliveryDate: '',
          contact: '',
          address: '',
          name: '',
          comment: '',
          guests: 1,
          items: preparedItems,
        },
      },
    });
  }, [orderState.items, participant, preparedItems, createOrder]);

  const formattedPrice = useMemo(() => {
    return `${(orderState.totalAmount || 0).toLocaleString()} ${CURRENCY}`;
  }, [orderState.totalAmount]);

  const addToCart = useCallback(
    (variant: any, productId: string) => {
      const newItem: IOrderItem = {
        id: variant.id,
        uuid: `${variant.id}-${Date.now()}`,
        productId: productId,
        name: variant.name || cross?.getCrossSells?.find((p: any) => p.productId === productId)?.name || '',
        price: variant.price || 0,
        quantity: 1,
        comment: '',
        options: [],
        discount: 0,
        state: '',
        image: cross?.getCrossSells?.find((p: any) => p.productId === productId)?.image,
        reason: '',
      };

      setOrderState((prev) => {
        const existingItemIndex = prev.items.findIndex((item) => item.id === variant.id);
        let updatedItems;

        if (existingItemIndex >= 0) {
          updatedItems = prev.items.map((item, index) =>
            index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item,
          );
        } else {
          updatedItems = [...prev.items, newItem];
        }

        const totals = calculateTotals(updatedItems);
        return { ...prev, items: updatedItems, ...totals };
      });
    },
    [setOrderState, calculateTotals, cross?.getCrossSells],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setOrderState((prev) => {
        const existingItemIndex = prev.items.findIndex((item) => item.productId === productId);
        let updatedItems;

        if (existingItemIndex >= 0) {
          const existingItem = prev.items[existingItemIndex];
          if (existingItem.quantity > 1) {
            updatedItems = prev.items.map((item, index) =>
              index === existingItemIndex ? { ...item, quantity: item.quantity - 1 } : item,
            );
          } else {
            updatedItems = prev.items.filter((_, index) => index !== existingItemIndex);
          }
        } else {
          updatedItems = prev.items;
        }

        const totals = calculateTotals(updatedItems);
        return { ...prev, items: updatedItems, ...totals };
      });
    },
    [setOrderState, calculateTotals],
  );

  const renderRecommendations = useCallback(() => {
    if (isEmpty(cross?.getCrossSells)) return null;

    const limited = cross.getCrossSells.slice(0, 3);
    return (
      <View style={styles.crossSellSection}>
        <Text style={styles.crossSellTitle}>{t('mainPage.recommendedForYou')}</Text>
        <View style={styles.recommendationsContainer}>
          {limited.map((product: any) => (
            <View key={product.id} style={styles.recommendationCard}>
              <RecommendedCard
                isFullWidth={false}
                product={product}
                orderItem={orderState.items?.find((item) => item.productId === product.id)}
                onAdd={addToCart}
                onRemove={removeFromCart}
              />
            </View>
          ))}
        </View>
      </View>
    );
  }, [cross?.getCrossSells, t, orderState.items, addToCart, removeFromCart]);

  const renderOrderSummary = () => {
    if (isEmpty(orderState.items)) {
      return (
        <View style={styles.emptyOrderContainer}>
          <Text style={styles.emptyOrderText}>{t('mainPage.noItems') || 'No items in order'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.orderSummaryContainer}>
        <Text style={styles.orderSummaryTitle}>{t('mainPage.OrderSummary') || 'Order Summary'}</Text>
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('mainPage.totalItems') || 'Total Items'}:</Text>
            <Text style={styles.totalValue}>{orderState.totalQuantity || 0}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('mainPage.Total') || 'Total Amount'}:</Text>
            <Text style={styles.totalValue}>{formattedPrice}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isEmpty(orderState.items) || isEmpty(participant) || loading) && styles.disabledButton,
          ]}
          onPress={onSubmit}
          disabled={isEmpty(orderState.items) || isEmpty(participant) || loading}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Text style={styles.submitButtonText}>
            {loading ? t('mainPage.loading') || 'Loading...' : t('mainPage.Order')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon source="close" color={defaultColor} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.leftColumn}>
          <View style={styles.productListContainer}>
            <DraftList items={orderState.items || []} increase={increase} decrease={decrease} />
          </View>

          {renderRecommendations()}
        </View>

        <View style={styles.rightColumn}>{renderOrderSummary()}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftColumn: {
    flex: 1,

    flexDirection: 'column',
  },
  productListContainer: {
    flex: 1,
    padding: 16,
  },
  productScrollView: {
    flex: 1,
  },
  rightColumn: {
    width: 370,
    backgroundColor: '#f9f9f9',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 24,
    height: 670,
    marginRight: 30,
    marginLeft: 30,
    borderRadius: 20,
  },
  orderSummaryContainer: {
    flex: 1,
    maxHeight: '80%',
    justifyContent: 'flex-start',
    width: '100%',
  },
  orderSummaryScroll: {
    flex: 1,
    maxHeight: 400,
  },
  orderSummaryTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
    textAlign: 'center',
  },
  emptyOrderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyOrderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  orderSummaryItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginRight: 8,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: defaultColor,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  quantityText: {
    fontSize: 30,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  unitPrice: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  totalContainer: {
    marginTop: 16,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: defaultColor,
  },
  submitButton: {
    backgroundColor: defaultColor,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    borderColor: '#cccccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  submitButtonPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  crossSellSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,

    minHeight: 160,
  },
  crossSellTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  recommendationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recommendationCard: {
    marginRight: 12,
    width: 200,
    marginBottom: 8,
  },
});

export default DraftOrderPage;
