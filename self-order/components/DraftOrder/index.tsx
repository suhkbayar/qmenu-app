import * as React from 'react';
import { memo, useCallback, useMemo } from 'react';
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
import { useOrder } from '@/providers/OrderProvider';

type Props = {
  visible: boolean;
  onCloseModal: () => void;
};

const DraftOrder = memo(({ visible, onCloseModal }: Props) => {
  const { orderState, setOrderState } = useOrder();
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
      const path = participant?.vat ? '/private/vat' : '/private/payment';

      router.push({
        pathname: path,
        params: { orderId: data.createOrder.id },
      });

      await onCloseModal();
    },
  });

  // Memoize this function to prevent recreating it on each render
  const calculateTotals = useCallback((items: IOrderItem[]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const grandTotal = totalAmount; // You can add tax/fees here if needed

    return { totalAmount, grandTotal, totalQuantity };
  }, []);

  // Memoize these handlers to prevent recreating them on each render
  const increase = useCallback(
    (uuid: string) => {
      setOrderState((prevOrder: ICustomerOrder) => {
        const updatedItems = prevOrder.items.map((item) =>
          item.uuid === uuid ? { ...item, quantity: item.quantity + 1 } : item,
        );

        const totals = calculateTotals(updatedItems);
        return { ...prevOrder, items: updatedItems, ...totals };
      });
    },
    [calculateTotals, setOrderState],
  );

  const decrease = useCallback(
    (uuid: string) => {
      setOrderState((prevOrder: ICustomerOrder) => {
        const updatedItems = prevOrder.items
          .map((item) => {
            if (item.uuid === uuid) {
              if (item.quantity === 1) return null;
              return { ...item, quantity: item.quantity - 1 };
            }
            return item;
          })
          .filter(Boolean) as IOrderItem[];

        const totals = calculateTotals(updatedItems);
        return { ...prevOrder, items: updatedItems, ...totals };
      });
    },
    [calculateTotals, setOrderState],
  );

  // Memoize this to avoid recreating the order items on each render
  const preparedItems = useMemo(() => {
    if (isEmpty(orderState.items)) return [];

    return orderState.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      comment: item.comment,
      options: item.options.map((option) => ({
        id: option.id,
        value: option.value,
      })),
    }));
  }, [orderState.items]);

  const onSubmit = useCallback(() => {
    if (isEmpty(orderState.items) || isEmpty(participant)) return;

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

  // Memoize formatted price to avoid recalculation
  const formattedPrice = useMemo(() => {
    return `${orderState.totalAmount.toLocaleString()} ${CURRENCY}`;
  }, [orderState.totalAmount]);

  const onClose = useCallback(() => {
    onCloseModal();
  }, [onCloseModal]);

  return (
    <RightDrawer visible={visible} onClose={onClose}>
      {/* Always render header for immediate response */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{t('mainPage.YourOrder')}</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
          <Icon source="close" color={defaultColor} size={28} />
        </TouchableOpacity>
      </View>
      <DraftList items={orderState.items} decrease={decrease} increase={increase} />
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={onSubmit}
          disabled={isEmpty(orderState.items) || isEmpty(participant) || loading}
        >
          <Text style={styles.smallButtonText}>{t('mainPage.Order')}</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </TouchableOpacity>
      </View>
    </RightDrawer>
  );
});

const styles = StyleSheet.create({
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
  loadingPlaceholder: {
    height: 300,
  },
  addButtonContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
