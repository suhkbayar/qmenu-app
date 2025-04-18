import * as React from 'react';
import RightDrawer from '../RightDrawer';
import { Icon, Text } from 'react-native-paper';
import DraftList from '../Card/DraftCard';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { defaultColor } from '@/constants/Colors';
import { ICustomerOrder, IOrder, IOrderItem } from '@/types';
import { CURRENCY, TYPE } from '@/constants';
import { CREATE_ORDER } from '@/graphql/mutation/order';
import { useMutation } from '@apollo/client';
import { GET_ORDERS } from '@/graphql/query';
import { router } from 'expo-router';
import { isEmpty } from 'lodash';
import { useCallStore } from '@/cache/cart.store';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  onClose: () => void;
  order: ICustomerOrder;
  setOrder: (order: ICustomerOrder) => void;
};

const DraftOrder = ({ order, visible, onClose, setOrder }: Props) => {
  const { t } = useTranslation('language');
  const { participant } = useCallStore();
  const [createOrder, { loading }] = useMutation(CREATE_ORDER, {
    update(cache, { data: { createOrder } }) {
      const caches = cache.readQuery<{ getOrders: IOrder[] }>({ query: GET_ORDERS });
      if (caches && caches.getOrders) {
        cache.writeQuery({
          query: GET_ORDERS,
          data: { getOrders: caches.getOrders.concat([createOrder]) },
        });
      }
    },
    onCompleted: async (data) => {
      // if (participant?.vat) {
      //   router.push('/private/vat');
      // } else {
      router.push({
        pathname: '/private/payment',
        params: { orderId: data.createOrder.id },
      });
      // }
    },
  });

  const calculateTotals = (items: IOrderItem[]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const grandTotal = totalAmount; // You can add tax/fees here if needed

    return { totalAmount, grandTotal, totalQuantity };
  };

  const increase = (uuid: string) => {
    const updatedItems = order.items.map((item) =>
      item.uuid === uuid ? { ...item, quantity: item.quantity + 1 } : item,
    );

    const totals = calculateTotals(updatedItems);
    setOrder({ ...order, items: updatedItems, ...totals });
  };

  const decrease = (uuid: string) => {
    const updatedItems = order.items
      .map((item) => {
        if (item.uuid === uuid) {
          if (item.quantity === 1) return null;
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      })
      .filter(Boolean) as IOrderItem[];

    const totals = calculateTotals(updatedItems);
    setOrder({ ...order, items: updatedItems, ...totals });
  };

  const onSubmit = () => {
    if (isEmpty(order.items) && isEmpty(participant)) return;

    let items = order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      comment: item.comment,
      options: item.options.map((option) => ({
        id: option.id,
        value: option.value,
      })),
    }));

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
          items: items,
        },
      },
    });
  };
  return (
    <RightDrawer visible={visible} onClose={onClose}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 14,
        }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon source="close" color={defaultColor} size={22} />
        </TouchableOpacity>
      </View>
      <DraftList items={order.items} decrease={decrease} increase={increase} />
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.smallButton} onPress={() => onSubmit()}>
          <Text style={styles.smallButtonText}>{t('mainPage.Order')}</Text>
          <Text style={styles.price}>
            {order.totalAmount.toLocaleString()} {CURRENCY}
          </Text>
        </TouchableOpacity>
      </View>
    </RightDrawer>
  );
};

const styles = StyleSheet.create({
  addButtonContainer: {
    padding: 10,
  },
  price: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  smallButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  smallButton: {
    backgroundColor: defaultColor,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    borderColor: defaultColor,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DraftOrder;
