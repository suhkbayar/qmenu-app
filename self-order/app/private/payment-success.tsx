import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useLazyQuery } from '@apollo/client';
import { GET_ORDER } from '@/graphql/query';
import { IOrder } from '@/types';
import Loader from '@/components/Loader';
import { useOrder } from '@/providers/OrderProvider';
import { useDraw } from '@/providers/drawerProvider';
import { emptyOrder } from '@/constants';
import { useTranslation } from 'react-i18next';

const PaymentSuccess = () => {
  const { orderId } = useLocalSearchParams();
  const { t } = useTranslation('language');
  const { setOrderState } = useOrder();
  const { setDrawerVisible } = useDraw();
  const [order, setOrder] = useState<IOrder>();

  const [getOrder, { loading }] = useLazyQuery(GET_ORDER, {
    onCompleted: (data) => {
      setOrder(data.getOrder);
    },
  });

  useEffect(() => {
    if (orderId) {
      getOrder({
        variables: {
          id: orderId,
        },
      });
    }
  }, [orderId]);

  if (loading || !order) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon source="check-circle" size={180} color="#4ade80" />
      </View>
      <Text style={styles.title}>{t('mainPage.YourOrderSuccess')}</Text>
      <Text style={styles.label}>
        {t('mainPage.YourOrderNumber')}: <Text style={styles.value}>{order?.number?.slice(-4)}</Text>
      </Text>
      <Text style={styles.label}>
        {t('mainPage.AmountPaid2')}: <Text style={styles.value}>{Number(order.paidAmount).toFixed(2)} MNT</Text>
      </Text>
      <Button
        mode="contained"
        style={styles.newOrderBtn}
        onPress={() => {
          router.push('/');
          setOrderState(emptyOrder);
          setDrawerVisible(false);
        }}
      >
        Шинэ захиалга
      </Button>
    </View>
  );
};

export default PaymentSuccess;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 8,
  },
  value: {
    fontWeight: 'bold',
    color: '#111827',
  },
  newOrderBtn: {
    marginTop: 32,
    backgroundColor: '#facc15',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 24,
  },
});
