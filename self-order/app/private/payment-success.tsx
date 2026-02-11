import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Text, Image, ScrollView } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { useQuery, useApolloClient } from '@apollo/client';
import { GET_ORDER } from '@/graphql/query';
import Loader from '@/components/Loader';
import { useOrderStore } from '@/cache/order.store';
import { useDraw } from '@/providers/drawerProvider';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { moneyFormat } from '@/utils';

const REDIRECT_SECONDS = 30;

const PaymentSuccess = () => {
  const params = useGlobalSearchParams();
  const orderId = params.orderId as string;
  const { t } = useTranslation('language');
  const apolloClient = useApolloClient();
  const clearOrder = useOrderStore((state) => state.clearOrder);
  const { setDrawerVisible } = useDraw();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  const { data, loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'no-cache',
  });

  const order = data?.getOrder;

  useFocusEffect(
    useCallback(() => {
      if (!order) return;

      setCountdown(REDIRECT_SECONDS);

      const intervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        clearOrder();
        setDrawerVisible(false);

        apolloClient.clearStore();

        router.dismissAll();
        router.replace('/private');
      }, REDIRECT_SECONDS * 1000);

      return () => {
        clearInterval(intervalId);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [order, orderId, clearOrder, setDrawerVisible, apolloClient]),
  );

  if (loading || !order) return <Loader />;

  const hasVat = order?.vatBillId && order?.vatData;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Icon source="check-circle" size={180} color="#4ade80" />
        </View>
        <Text style={styles.title}>{t('mainPage.YourOrderSuccess')}</Text>
        <Text style={styles.label}>
          {t('mainPage.YourOrderNumber')}: <Text style={styles.value}>{order?.number?.slice(-4)}</Text>
        </Text>
        <Text style={styles.label}>
          {t('mainPage.AmountPaid2')}: <Text style={styles.value}>{Number(order.paidAmount).toLocaleString()}₮</Text>
        </Text>

        <Text style={styles.countdownText}>{countdown} секундийн дараа шинэ захиалга руу шилжинэ...</Text>

        {hasVat && (
          <View style={styles.vatSection}>
            <Image source={require('../../assets/icon/eBarimt_logo.png')} style={styles.vatLogo} resizeMode="contain" />
            <View style={styles.qrContainer}>
              <QRCode value={order.vatData} size={150} />
            </View>
            <Text style={styles.vatLabel}>
              ДДТД: <Text style={styles.vatValue}>{order.vatBillId}</Text>
            </Text>
            {order.vatLottery && (
              <Text style={styles.vatLabel}>
                Сугалааны №: <Text style={styles.vatValue}>{order.vatLottery}</Text>
              </Text>
            )}
            <Text style={styles.vatLabel}>
              Бүртгэх дүн: <Text style={styles.vatValue}>{moneyFormat(Number(order.vatIncludeAmount))}</Text>
            </Text>
          </View>
        )}

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
    </ScrollView>
  );
};

export default PaymentSuccess;

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  vatSection: {
    marginTop: 32,
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  vatLogo: {
    width: 120,
    height: 40,
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  vatLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  vatValue: {
    fontWeight: '600',
    color: '#111827',
  },
  countdownText: {
    marginTop: 24,
    fontSize: 16,
    color: '#9ca3af',
  },
});
