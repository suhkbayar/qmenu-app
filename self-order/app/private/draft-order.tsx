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
import { useThemeStore } from '@/src/store/theme.store';
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
  const { theme } = useThemeStore();
  const orderState = useOrderStore((s) => s.orderState);
  const setOrderState = useOrderStore((s) => s.setOrderState);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const showTakeAway = useMemo(() => participant?.services?.includes(TYPE.TAKE_AWAY) ?? false, [participant?.services]);
  const [serviceType, setServiceType] = useState<string>(TYPE.DINIG);

  const [getCrossSells, { data: cross }] = useLazyQuery(GET_CROSS_SELLS);

  const [payCash, { loading: cashing }] = useMutation(GET_PAY_ORDER, {
    onCompleted(data) {
      if (data?.payOrder) {
        setConfirmVisible(false);
        router.push({ pathname: '/private/payment-success', params: { orderId: data.payOrder.order.id } });
      }
    },
    onError(err) {
      setConfirmVisible(false);
      toast.show(err.message, { type: 'danger', placement: 'top', duration: 4000 });
    },
  });

  const [createOrder, { loading: creating }] = useMutation(CREATE_ORDER, {
    onCompleted(data) {
      const orderId = data.createOrder.id;
      const hasPayments = (participant?.payments?.length ?? 0) > 0;
      if (hasPayments) {
        const path = participant?.vat ? '/private/vat' : '/private/payment';
        router.push({ pathname: path, params: { orderId } });
      } else {
        payCash({
          variables: {
            input: { order: orderId, confirm: true, payment: '', vatType: participant?.vat ? orderState.vatType : 0 },
          },
        });
      }
    },
    onError(err) {
      setConfirmVisible(false);
      toast.show(err.message || t('mainPage.orderCreationFailed'), {
        type: 'danger',
        placement: 'top',
        duration: 4000,
      });
    },
  });

  const loading = creating || cashing;

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
          type: serviceType,
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
  }, [participant, preparedItems, createOrder, serviceType]);

  const onSubmit = useCallback(() => {
    if (isEmpty(orderState.items) || isEmpty(participant)) return;
    const hasPayments = (participant.payments?.length ?? 0) > 0;
    if (!hasPayments && !participant.advancePayment) {
      setConfirmVisible(true);
    } else {
      doCreateOrder();
    }
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon source="close" color={theme.primary} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.leftCol}>
          <View style={styles.listWrap}>
            <DraftList items={orderState.items || []} increase={increase} decrease={decrease} />
          </View>
          {crossSells.length > 0 && (
            <View style={styles.crossSection}>
              <Text style={[styles.crossTitle, { color: theme.text }]}>{t('mainPage.recommendedForYou')}</Text>
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

        <View style={[styles.rightCol, { backgroundColor: theme.backgroundSecondary }]}>
          {isEmpty(orderState.items) ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('mainPage.noItems')}</Text>
            </View>
          ) : (
            <View style={styles.summaryWrap}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{t('mainPage.OrderSummary')}</Text>
              {showTakeAway && (
                <View style={styles.serviceSection}>
                  <Text style={[styles.serviceLabel, { color: theme.textMuted }]}>{t('mainPage.OrderType')}</Text>
                  <View style={[styles.serviceTrack, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {[TYPE.DINIG, TYPE.TAKE_AWAY].map((type) => {
                      const active = serviceType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.serviceSegment, active && { backgroundColor: theme.primary }]}
                          onPress={() => setServiceType(type)}
                          activeOpacity={0.9}
                        >
                          <Icon
                            source={type === TYPE.TAKE_AWAY ? 'bag-personal-outline' : 'silverware-fork-knife'}
                            size={22}
                            color={active ? '#fff' : theme.textMuted}
                          />
                          <Text style={[styles.serviceText, { color: active ? '#fff' : theme.textMuted }]}>
                            {t(`mainPage.${type}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={[styles.totals, { borderTopColor: theme.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.text }]}>{t('mainPage.totalItems')}:</Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>{orderState.totalQuantity || 0}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: theme.text }]}>{t('mainPage.Total')}:</Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>{totalPrice}</Text>
                </View>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary }, isDisabled && styles.disabledBtn]}
            onPress={onSubmit}
            disabled={isDisabled}
          >
            <Text style={styles.submitBtnText}>{loading ? t('mainPage.loading') : t('mainPage.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('mainPage.confirmOrder') || 'Confirm Order'}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textMuted }]}>
              {t('mainPage.cashierPayMessage') || 'Your order will be placed. Please pay at the cashier.'}
            </Text>
            <Text style={[styles.modalTotal, { color: theme.primary }]}>{totalPrice}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setConfirmVisible(false)}
                disabled={loading}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>
                  {t('mainPage.cancel') || 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: theme.primary }]}
                onPress={doCreateOrder}
                disabled={loading}
              >
                <Text style={styles.modalConfirmText}>
                  {loading ? t('mainPage.loading') || 'Loading...' : t('mainPage.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  crossRow: { flexDirection: 'row', gap: 20 },
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
  serviceSection: { marginBottom: 20 },
  serviceLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  serviceTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  serviceSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  serviceText: { fontSize: 16, fontWeight: '700' },
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
  modalBox: { borderRadius: 16, padding: 32, width: 420, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  modalMsg: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  modalTotal: { fontSize: 28, fontWeight: 'bold', marginBottom: 24 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
