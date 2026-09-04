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
import { CURRENCY, TABLE_MESSAGE_STICKERS, TYPE } from '@/src/constants';
import Medallion from '@/src/components/ui/Medallion';
import { useThemeStore } from '@/src/store/theme.store';
import { useGiftTheme } from '@/src/hooks/useGiftTheme';
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
  const participant = useCallStore((s) => s.participant);
  const config = useCallStore((s) => s.config);
  const { theme } = useThemeStore();
  const g = useGiftTheme();
  const giftEnabled = config?.giftOrder === true;
  const orderState = useOrderStore((s) => s.orderState);
  const setOrderState = useOrderStore((s) => s.setOrderState);
  const giftStickerId = useOrderStore((s) => s.giftStickerId);
  const giftAnonymous = useOrderStore((s) => s.giftAnonymous);
  const giftSticker = TABLE_MESSAGE_STICKERS.find((s) => s.id === giftStickerId);
  const clearGift = useOrderStore((s) => s.clearGift);
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

      clearGift();
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

  const giftItems = useMemo(
    () => (giftEnabled ? orderState.items.filter((i) => i.giftToTableId) : []),
    [orderState.items, giftEnabled],
  );

  useEffect(() => {
    if (giftEnabled) return;
    const state = useOrderStore.getState();
    if (state.giftTarget || state.orderState.items.some((i) => i.giftToTableId)) clearGift();
  }, [giftEnabled, orderState.items, clearGift]);

  const preparedItems = useMemo(
    () =>
      orderState.items.map(({ id, quantity, comment, options, giftToTableId }) => ({
        id,
        quantity,
        comment,
        options: options?.map(({ id, value }) => ({ id, value })) || [],
        ...(giftEnabled && giftToTableId
          ? {
              giftToTableId,
              giftStickerId: giftStickerId || undefined,
              giftAnonymous: giftAnonymous || undefined,
            }
          : {}),
      })),
    [orderState.items, giftEnabled, giftStickerId, giftAnonymous],
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
  }, [participant, preparedItems, createOrder, serviceType, giftEnabled]);

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
        const idx = prev.items.findIndex((i) => i.id === variant.id && !i.giftToTableId);
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
        const idx = prev.items.findIndex((i) => i.productId === productId && !i.giftToTableId);
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
  const itemCount = orderState.totalQuantity || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon source="close" color={theme.textSecondary} size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.leftCol}>
          {giftItems.length > 0 && (
            <View style={[styles.giftRibbon, { backgroundColor: g.gold + '14', borderColor: g.gold + '4d' }]}>
              <View style={[styles.giftRibbonBar, { backgroundColor: g.gold }]} />
              <Medallion glyph="gift-outline" size={40} solid />

              <View style={styles.giftRibbonText}>
                <Text style={[styles.giftRibbonTitle, { color: theme.text }]} numberOfLines={1}>
                  {t('mainPage.gift_banner', {
                    n: giftItems.length,
                    table: giftItems[0].giftToTableName,
                    defaultValue: `${giftItems.length} item(s) → Table ${giftItems[0].giftToTableName}`,
                  })}
                </Text>
                {!!giftSticker && (
                  <Text style={[styles.giftRibbonMessage, { color: theme.textMuted }]} numberOfLines={1}>
                    “{t(`mainPage.${giftSticker.labelKey}`)}”
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={clearGift}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.giftRibbonCancel, { borderColor: g.gold + '66' }]}
                activeOpacity={0.7}
              >
                <Icon source="close" size={18} color={g.goldText} />
                <Text style={[styles.giftRibbonCancelText, { color: g.goldText }]}>
                  {t('mainPage.gift_cancel', 'Cancel gift')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.listWrap}>
            <DraftList items={orderState.items || []} increase={increase} decrease={decrease} />
          </View>
          {crossSells.length > 0 && (
            <View style={[styles.crossSection, { borderTopColor: theme.border }]}>
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

        <View style={[styles.rightCol, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          {isEmpty(orderState.items) ? (
            <View style={styles.emptyWrap}>
              <Icon source="cart-outline" size={72} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('mainPage.noItems')}</Text>
            </View>
          ) : (
            <View style={styles.summaryWrap}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{t('mainPage.OrderSummary')}</Text>
              {showTakeAway && (
                <View style={styles.serviceSection}>
                  <Text style={[styles.serviceLabel, { color: theme.textMuted }]}>{t('mainPage.OrderType')}</Text>
                  <View
                    style={[
                      styles.serviceTrack,
                      { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                    ]}
                  >
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
                  <Text style={[styles.totalLabel, { color: theme.textMuted }]}>{t('mainPage.totalItems')}</Text>
                  <Text style={[styles.totalSubValue, { color: theme.text }]}>{itemCount}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.grandLabel, { color: theme.text }]}>{t('mainPage.Total')}</Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>{totalPrice}</Text>
                </View>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: theme.primary },
              isDisabled && [styles.disabledBtn, { backgroundColor: theme.border }],
            ]}
            onPress={onSubmit}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            {!loading && !isDisabled && <Icon source="check-circle-outline" size={24} color="#fff" />}
            <Text style={styles.submitBtnText}>{loading ? t('mainPage.loading') : t('mainPage.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: theme.primary + '1a' }]}>
              <Icon source="cash-register" size={52} color={theme.primary} />
            </View>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerText: { fontWeight: '800', fontSize: 26 },
  headerSubtext: { fontSize: 16, fontWeight: '500', marginTop: 2 },
  closeBtn: { padding: 10, borderRadius: 24 },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24, gap: 24 },
  leftCol: { flex: 1, flexDirection: 'column' },
  listWrap: { flex: 1 },
  crossSection: { paddingTop: 18, marginTop: 8, minHeight: 190, borderTopWidth: 1 },
  crossTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14 },
  crossRow: { flexDirection: 'row', gap: 22 },
  crossCard: { marginRight: 12, width: 260, marginBottom: 8 },
  rightCol: {
    width: '36%',
    minWidth: 380,
    maxWidth: 460,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    padding: 24,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryWrap: { flex: 1 },
  summaryTitle: { fontSize: 24, fontWeight: '800', marginBottom: 22 },
  serviceSection: { marginBottom: 24 },
  serviceLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  serviceTrack: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  serviceSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  serviceText: { fontSize: 18, fontWeight: '700' },
  giftRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    paddingVertical: 14,
    paddingLeft: 20,
    paddingRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  giftRibbonBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  giftRibbonText: { flex: 1 },
  giftRibbonTitle: { fontSize: 18, fontWeight: '800' },
  giftRibbonMessage: { fontSize: 15, fontStyle: 'italic', marginTop: 3 },
  giftRibbonCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  giftRibbonCancelText: { fontSize: 15, fontWeight: '700' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 19, textAlign: 'center' },
  totals: { marginTop: 'auto', paddingTop: 20, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 17, fontWeight: '600' },
  totalSubValue: { fontSize: 17, fontWeight: '700' },
  grandLabel: { fontSize: 21, fontWeight: '800' },
  totalValue: { fontSize: 28, fontWeight: '800' },
  submitBtn: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 64,
    marginTop: 20,
  },
  disabledBtn: {},
  submitBtnText: { color: 'white', fontSize: 20, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: { borderRadius: 24, padding: 40, width: 500, alignItems: 'center' },
  modalIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 26, fontWeight: '800', marginBottom: 10 },
  modalMessage: { fontSize: 17, textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  modalTotal: { fontSize: 34, fontWeight: '800', marginBottom: 28 },
  modalButtons: { flexDirection: 'row', gap: 16, width: '100%' },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 17,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 17, fontWeight: '600' },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});
