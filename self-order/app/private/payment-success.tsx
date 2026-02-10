import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { useQuery, useApolloClient } from '@apollo/client';
import { GET_ORDER } from '@/graphql/query';
import Loader from '@/components/Loader';
import { useOrderStore } from '@/cache/order.store';
import { useDraw } from '@/providers/drawerProvider';
import { useTranslation } from 'react-i18next';

const PaymentSuccess = () => {
  const params = useGlobalSearchParams();
  const orderId = params.orderId as string;
  const { t } = useTranslation('language');
  const apolloClient = useApolloClient();
  const clearOrder = useOrderStore((state) => state.clearOrder);
  const { setDrawerVisible } = useDraw();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'no-cache',
  });

  const order = data?.getOrder;

  useFocusEffect(
    useCallback(() => {
      if (!order) return;

      timerRef.current = setTimeout(() => {
        clearOrder();
        setDrawerVisible(false);

        apolloClient.clearStore();

        router.dismissAll();
        router.replace('/private');
      }, 30000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [order, orderId, clearOrder, setDrawerVisible, apolloClient]),
  );

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
          clearOrder();
          setDrawerVisible(false);

          apolloClient.clearStore();

          router.dismissAll();
          router.replace('/private');
        }}
      >
        {t('mainPage.NewOrder')}
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
