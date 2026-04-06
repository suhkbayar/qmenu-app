import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useLazyQuery, useMutation } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';
import { isEmpty } from 'lodash';

import DraftList from '@/src/components/cards/DraftCard';
import RecommendedCard from '@/src/components/cards/RecommendedCard';
import { CURRENCY, TYPE } from '@/src/constants';
import { defaultColor } from '@/src/constants/Colors';
import { GET_CROSS_SELLS } from '@/src/graphql/queries/product';
import { CREATE_ORDER, GET_PAY_ORDER } from '@/src/graphql/mutations/order';
import { useCallStore } from '@/src/store/cart.store';
import { useOrderStore } from '@/src/store/order.store';
import { IMenuProduct, IOrderItem } from '@/src/types';

const calcTotals = (items: IOrderItem[]) => ({
  totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
  totalAmount: items.reduce((s, i) => s + i.quantity * i.price, 0),
  grandTotal: items.reduce((s, i) => s + i.quantity * i.price, 0),
});

const DraftOrderPage = () => {
  const { t } = useTranslation('language');
  const toast = useToast();
  const { participant } = useCallStore();
  const orderState = useOrderStore((s) => s.orderState);
  const setOrderState = useOrderStore((s) => s.setOrderState);

  const [getCrossSells, { data: cross }] = useLazyQuery(GET_CROSS_SELLS);

  const [createOrder, { loading: creating }] = useMutation(CREATE_ORDER, {
    onCompleted(data) {
      const orderId = data.createOrder.id;

      const path = participant?.vat ? '/private/vat' : '/private/payment';
      router.push({ pathname: path, params: { orderId } });
    },
    onError(err) {
      toast.show(err.message || t('mainPage.orderCreationFailed'), {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
    },
  });

  const loading = creating;

  useEffect(() => {
    if (isEmpty(orderState.items) || !participant?.menu?.id) return;
    const ids = orderState.items.map((i) => i.productId).filter(Boolean);
    if (ids.length > 0) getCrossSells({ variables: { menuId: participant.menu.id, ids } });
  }, [orderState.items, participant?.menu?.id]);

  const update = useCallback(
    (uuid: string, delta: 1 | -1) => {
      setOrderState((prev) => {
        const updated = prev.items
          .map((i) =>
            i.uuid !== uuid
              ? i
              : delta === 1
                ? { ...i, quantity: i.quantity + 1 }
                : i.quantity > 1
                  ? { ...i, quantity: i.quantity - 1 }
                  : null,
          )
          .filter((i): i is IOrderItem => i !== null);
        return { ...prev, items: updated, ...calcTotals(updated) };
      });
    },
    [setOrderState],
  );

  const increase = useCallback((uuid: string) => update(uuid, 1), [update]);
  const decrease = useCallback((uuid: string) => update(uuid, -1), [update]);

  const preparedItems = useMemo(
    () =>
      orderState.items.map(({ id, quantity, comment, options }) => ({
        id,
        quantity,
        comment,
        options: options?.map(({ id, value }) => ({ id, value })) || [],
      })),
    [orderState.items],
  );

  const doCreateOrder = useCallback(() => {
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
  }, [participant, preparedItems, createOrder]);

  const onSubmit = useCallback(() => {
    if (isEmpty(orderState.items) || isEmpty(participant)) return;
    else doCreateOrder();
  }, [orderState.items, participant, doCreateOrder]);

  const addToCart = useCallback(
    (variant: { id: string; name?: string; price?: number }, productId: string) => {
      const cp = cross?.getCrossSells?.find((p: { productId: string }) => p.productId === productId);
      const newItem: IOrderItem = {
        id: variant.id,
        uuid: `${variant.id}-${Date.now()}`,
        productId,
        name: variant.name || cp?.name || '',
        price: variant.price || 0,
        quantity: 1,
        comment: '',
        options: [],
        discount: 0,
        state: '',
        image: cp?.image,
        reason: '',
      };
      setOrderState((prev) => {
        const idx = prev.items.findIndex((i) => i.id === variant.id);
        const updated =
          idx >= 0
            ? prev.items.map((i, n) => (n === idx ? { ...i, quantity: i.quantity + 1 } : i))
            : [...prev.items, newItem];
        return { ...prev, items: updated, ...calcTotals(updated) };
      });
    },
    [setOrderState, cross?.getCrossSells],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      setOrderState((prev) => {
        const idx = prev.items.findIndex((i) => i.productId === productId);
        if (idx < 0) return prev;
        const item = prev.items[idx];
        const updated =
          item.quantity > 1
            ? prev.items.map((i, n) => (n === idx ? { ...i, quantity: i.quantity - 1 } : i))
            : prev.items.filter((_, n) => n !== idx);
        return { ...prev, items: updated, ...calcTotals(updated) };
      });
    },
    [setOrderState],
  );

  const crossSells = cross?.getCrossSells?.slice(0, 3) ?? [];
  const totalPrice = `${(orderState.totalAmount || 0).toLocaleString()} ${CURRENCY}`;
  const isDisabled = isEmpty(orderState.items) || isEmpty(participant) || loading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon source="close" color={defaultColor} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.leftCol}>
          <View style={styles.listWrap}>
            <DraftList items={orderState.items || []} increase={increase} decrease={decrease} />
          </View>
          {crossSells.length > 0 && (
            <View style={styles.crossSection}>
              <Text style={styles.crossTitle}>{t('mainPage.recommendedForYou')}</Text>
              <View style={styles.crossRow}>
                {crossSells.map((p: IMenuProduct) => (
                  <View key={p.id} style={styles.crossCard}>
                    <RecommendedCard
                      isFullWidth={false}
                      product={p}
                      orderItem={orderState.items?.find((i) => i.productId === p.productId)}
                      onAdd={addToCart}
                      onRemove={removeFromCart}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.rightCol}>
          {isEmpty(orderState.items) ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{t('mainPage.noItems')}</Text>
            </View>
          ) : (
            <View style={styles.summaryWrap}>
              <Text style={styles.summaryTitle}>{t('mainPage.OrderSummary')}</Text>
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('mainPage.totalItems')}:</Text>
                  <Text style={styles.totalValue}>{orderState.totalQuantity || 0}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('mainPage.Total')}:</Text>
                  <Text style={styles.totalValue}>{totalPrice}</Text>
                </View>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, isDisabled && styles.disabledBtn]}
            onPress={onSubmit}
            disabled={isDisabled}
          >
            <Text style={styles.submitBtnText}>{loading ? t('mainPage.loading') : t('mainPage.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DraftOrderPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerText: { fontWeight: 'bold', fontSize: 18 },
  closeBtn: { padding: 10, borderRadius: 20 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  leftCol: { flex: 1, flexDirection: 'column' },
  listWrap: { flex: 1, padding: 16 },
  crossSection: { paddingVertical: 16, paddingHorizontal: 16, minHeight: 160 },
  crossTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  crossRow: { flexDirection: 'row', flexWrap: 'wrap' },
  crossCard: { marginRight: 12, width: 200, marginBottom: 8 },
  rightCol: {
    width: 370,
    backgroundColor: '#f9f9f9',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 24,
    height: 670,
    marginHorizontal: 30,
    borderRadius: 20,
  },
  summaryWrap: { flex: 1, maxHeight: '80%' },
  summaryTitle: { fontSize: 30, fontWeight: 'bold', marginBottom: 16, color: '#000', textAlign: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  totals: { marginTop: 16, marginBottom: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: defaultColor },
  submitBtn: {
    backgroundColor: defaultColor,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    marginTop: 10,
  },
  disabledBtn: { backgroundColor: '#cccccc' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: 420, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  modalMsg: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 16 },
  modalTotal: { fontSize: 28, fontWeight: 'bold', color: defaultColor, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: { fontSize: 16, color: '#555' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: defaultColor, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
