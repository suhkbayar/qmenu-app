import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
import RightDrawer from './RightDrawer';
import { Icon, Text } from 'react-native-paper';
import DraftList from './cards/DraftCard';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { defaultColor } from '@/src/constants/Colors';
import { ICustomerOrder, IOrderItem } from '@/src/types';
import { CURRENCY, TYPE } from '@/src/constants';
import { CREATE_ORDER } from '@/src/graphql/mutations/order';
import { useMutation } from '@apollo/client';
import { router } from 'expo-router';
import { isEmpty } from 'lodash';
import { useCallStore } from '@/src/store/cart.store';
import { useTranslation } from 'react-i18next';
import { useOrderStore } from '@/src/store/order.store';

type Props = {
  visible: boolean;
  onCloseModal: () => void;
};

const DraftOrder = memo(({ visible, onCloseModal }: Props) => {
  const orderState = useOrderStore((state) => state.orderState);
  const setOrderState = useOrderStore((state) => state.setOrderState);
  const { t } = useTranslation('language');
  const participant = useCallStore((s) => s.participant);

  const [createOrder, { loading }] = useMutation(CREATE_ORDER, {
    onCompleted: async (data) => {
      const path = participant?.vat ? '/private/vat' : '/private/payment';
      router.push({ pathname: path, params: { orderId: data.createOrder.id } });
      await onCloseModal();
    },
  });

  const calculateTotals = useCallback((items: IOrderItem[]) => ({
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    grandTotal: items.reduce((sum, item) => sum + item.quantity * item.price, 0),
  }), []);

  const increase = useCallback((uuid: string) => {
    setOrderState((prev: ICustomerOrder) => {
      const updatedItems = prev.items.map((item) =>
        item.uuid === uuid ? { ...item, quantity: item.quantity + 1 } : item,
      );
      return { ...prev, items: updatedItems, ...calculateTotals(updatedItems) };
    });
  }, [calculateTotals, setOrderState]);

  const decrease = useCallback((uuid: string) => {
    setOrderState((prev: ICustomerOrder) => {
      const updatedItems = prev.items
        .map((item) => (item.uuid === uuid ? (item.quantity === 1 ? null : { ...item, quantity: item.quantity - 1 }) : item))
        .filter(Boolean) as IOrderItem[];
      return { ...prev, items: updatedItems, ...calculateTotals(updatedItems) };
    });
  }, [calculateTotals, setOrderState]);

  const preparedItems = useMemo(() => {
    if (isEmpty(orderState.items)) return [];
    return orderState.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      comment: item.comment,
      options: item.options.map((opt) => ({ id: opt.id, value: opt.value })),
    }));
  }, [orderState.items]);

  const onSubmit = useCallback(() => {
    if (isEmpty(orderState.items) || isEmpty(participant)) return;
    createOrder({
      variables: {
        participant: participant?.id,
        input: { type: TYPE.DINIG, deliveryDate: '', contact: '', address: '', name: '', comment: '', guests: 1, items: preparedItems },
      },
    });
  }, [orderState.items, participant, preparedItems, createOrder]);

  const formattedPrice = useMemo(() => `${orderState.totalAmount.toLocaleString()} ${CURRENCY}`, [orderState.totalAmount]);

  return (
    <RightDrawer visible={visible} onClose={onCloseModal}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity onPress={onCloseModal} style={{ padding: 10 }}>
          <Icon source="close" color={defaultColor} size={28} />
        </TouchableOpacity>
      </View>
      <DraftList items={orderState.items} decrease={decrease} increase={increase} />
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={isEmpty(orderState.items) || isEmpty(participant) || loading}
        >
          <Text style={styles.submitText}>{t('mainPage.Order')}</Text>
          <Text style={styles.submitPrice}>{formattedPrice}</Text>
        </TouchableOpacity>
      </View>
    </RightDrawer>
  );
});

export default DraftOrder;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerText: { fontWeight: 'bold', fontSize: 18 },
  footer: { padding: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  submitButton: { backgroundColor: defaultColor, borderRadius: 999, paddingVertical: 16, paddingHorizontal: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: 'white', fontSize: 18, fontWeight: '500' },
  submitPrice: { color: 'white', fontSize: 18, fontWeight: '700' },
});
