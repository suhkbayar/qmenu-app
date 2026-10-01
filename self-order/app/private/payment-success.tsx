import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { router, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { useApolloClient, useQuery } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

import Loader from '@/src/components/ui/Loader';
import { GET_ORDER } from '@/src/graphql/queries';
import { useDraw } from '@/src/providers/DrawerProvider';
import { useOrderStore } from '@/src/store/order.store';
import { moneyFormat } from '@/src/utils';
import { useThemeStore } from '@/src/store/theme.store';

const REDIRECT_SECONDS = 30;

const PaymentSuccess = () => {
  const { orderId } = useGlobalSearchParams<{ orderId: string }>();
  const { t } = useTranslation('language');
  const apolloClient = useApolloClient();
  const clearOrder = useOrderStore((s) => s.clearOrder);
  const { setDrawerVisible } = useDraw();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  const { theme } = useThemeStore();

  const { data, loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'no-cache',
  });

  const order = data?.getOrder;

  const goHome = useCallback(() => {
    clearOrder();
    setDrawerVisible(false);
    apolloClient.clearStore();
    router.dismissAll();
    router.replace('/private');
  }, [clearOrder, setDrawerVisible, apolloClient]);

  useFocusEffect(
    useCallback(() => {
      if (!order) return;
      setCountdown(REDIRECT_SECONDS);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(goHome, REDIRECT_SECONDS * 1000);

      return () => {
        clearInterval(interval);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [order, goHome]),
  );

  if (loading || !order) return <Loader />;

  const hasVat = order.vatBillId && order.vatData;

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Icon source="check-circle" size={200} color="#4ade80" />

        <Text style={[styles.title, { color: theme.textSecondary }]}>{t('mainPage.YourOrderSuccess')}</Text>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('mainPage.YourOrderNumber')}:{' '}
          <Text style={[styles.value, { color: theme.text }]}>#{order.number?.slice(-4)}</Text>
        </Text>
        <Text style={[styles.label, { color: theme.textMuted }]}>
          {t('mainPage.AmountPaid2')}:{' '}
          <Text style={[styles.value, { color: theme.text }]}>{Number(order.paidAmount).toLocaleString()}₮</Text>
        </Text>
        <Text style={[styles.countdown, { color: theme.textMuted }]}>
          {countdown} секундийн дараа шинэ захиалга руу шилжинэ...
        </Text>

        {hasVat && (
          <View style={[styles.vatBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Image source={require('../../assets/icon/eBarimt_logo.png')} style={styles.vatLogo} resizeMode="contain" />
            <View style={[styles.qrWrap, { backgroundColor: theme.card }]}>
              <QRCode value={order.vatData} size={170} />
            </View>
            <Text style={[styles.vatLabel, { color: theme.textMuted }]}>
              ДДТД: <Text style={[styles.vatValue, { color: theme.text }]}>{order.vatBillId}</Text>
            </Text>
            {order.vatLottery && (
              <Text style={[styles.vatLabel, { color: theme.textMuted }]}>
                Сугалааны №: <Text style={[styles.vatValue, { color: theme.text }]}>{order.vatLottery}</Text>
              </Text>
            )}
            <Text style={[styles.vatLabel, { color: theme.textMuted }]}>
              Бүртгэх дүн:{' '}
              <Text style={[styles.vatValue, { color: theme.text }]}>
                {moneyFormat(Number(order.vatIncludeAmount))}
              </Text>
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          style={styles.newOrderBtn}
          labelStyle={styles.newOrderBtnLabel}
          contentStyle={styles.newOrderBtnContent}
          onPress={goHome}
        >
          {t('mainPage.NewOrder')}
        </Button>
      </View>
    </ScrollView>
  );
};

export default PaymentSuccess;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '700', marginBottom: 26, marginTop: 26 },
  label: { fontSize: 20, marginBottom: 10 },
  value: { fontWeight: 'bold' },
  countdown: { marginTop: 26, fontSize: 18 },
  vatBox: { marginTop: 34, padding: 26, borderRadius: 18, alignItems: 'center', width: '100%', maxWidth: 440 },
  vatLogo: { width: 140, height: 48, marginBottom: 18 },
  qrWrap: { padding: 18, borderRadius: 14, marginBottom: 18 },
  vatLabel: { fontSize: 16, marginBottom: 6 },
  vatValue: { fontWeight: '600' },
  newOrderBtn: { marginTop: 34, backgroundColor: '#facc15', borderRadius: 12 },
  newOrderBtnLabel: { fontSize: 19, fontWeight: '700' },
  newOrderBtnContent: { paddingVertical: 10, paddingHorizontal: 20 },
});
