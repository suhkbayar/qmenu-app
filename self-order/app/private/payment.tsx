import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';

import Loader from '@/src/components/ui/Loader';
import OrderInfo from '@/src/components/OrderInfo';
import PaymentButton from '@/src/components/payment/PaymentButton';
import PayCashierModal from '@/src/components/modals/PayCashierModal';
import PendingTransactionModal from '@/src/components/modals/PendingTransactionModal';
import McsPaymentModal from '@/src/components/modals/McsPaymentModal';
import { CURRENCY, PAYMENT_TYPE } from '@/src/constants';
import { defaultColor } from '@/src/constants/Colors';
import { GET_PAY_ORDER, VALIDATE_TRANSACTION } from '@/src/graphql/mutations/order';
import { GET_ORDER } from '@/src/graphql/queries';
import { ON_UPDATED_ORDER } from '@/src/graphql/subscriptions';
import { getPayload } from '@/src/providers/auth';
import { useCallStore } from '@/src/store/cart.store';
import { useOrderStore } from '@/src/store/order.store';
import { IOrder, ITransaction } from '@/src/types';
import { launchCardScanner } from '@/src/utils/cardScanner';

const Payment = () => {
  const { t } = useTranslation('language');
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const toast = useToast();
  const { participant } = useCallStore();
  const orderState = useOrderStore((state) => state.orderState);

  const [order, setOrder] = useState<IOrder>();
  const [transaction, setTransaction] = useState<ITransaction>();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [visibleCash, setVisibleCash] = useState(false);
  const [visiblePending, setVisiblePending] = useState(false);
  const [visibleMcs, setVisibleMcs] = useState(false);

  useEffect(() => {
    getPayload().then((p) => setCustomerId(p?.sub ?? null));
  }, []);

  const showWarning = useCallback(
    (msg: string) => {
      toast.show(msg, {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
    [toast],
  );

  const goSuccess = useCallback(() => {
    router.push({ pathname: '/private/payment-success', params: { orderId } });
  }, [orderId]);

  const vatType = participant?.vat ? orderState.vatType : 0;
  const baseInput = { order: orderId, register: orderState.register, vatType };

  const { loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'no-cache',
    onCompleted: (data) => {
      setOrder(data.getOrder);
      if (data.getOrder.paymentState === 'PAID') goSuccess();
    },
  });

  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: customerId },
    skip: !customerId,
    onData: ({ data }) => {
      const updated = data?.data?.onUpdatedOrder?.order;
      if (updated?.id === orderId && updated.paymentState === 'PAID') {
        setVisiblePending(false);
        setVisibleMcs(false);
        goSuccess();
      }
    },
  });

  const [validateTransaction, { loading: validating }] = useMutation(VALIDATE_TRANSACTION, {
    onCompleted(data) {
      const updated = data.validateTransaction;
      if (updated.paymentState === 'PAID') {
        setVisibleMcs(false);
        setVisiblePending(false);
        goSuccess();
      } else {
        const failed = updated.transactions?.find((tx: ITransaction) => tx.id === transaction?.id);
        setVisibleMcs(false);
        showWarning(failed?.comment || t('mainPage.NotPaidDescription'));
      }
    },
    onError(err) {
      setVisibleMcs(false);
      toast.show(err.message, { type: 'danger', placement: 'center', duration: 4000, animationType: 'slide-in' });
    },
  });

  const [payOrder, { loading: paying }] = useMutation(GET_PAY_ORDER, {
    onCompleted(data) {
      if (!data?.payOrder) return;
      const tx: ITransaction = data.payOrder.transaction;
      setTransaction(tx);
      setActiveType(null);
      if (tx?.type === PAYMENT_TYPE.MCS) {
        setVisibleMcs(true);
      } else {
        setVisiblePending(true);
      }
    },
    onError(err) {
      setActiveType(null);
      console.log('payOrder error:', JSON.stringify(err, null, 2));
      console.log('graphQLErrors:', err.graphQLErrors);
      console.log('networkError:', err.networkError);
      showWarning(err.message);
    },
  });

  const [payCash, { loading: cashing }] = useMutation(GET_PAY_ORDER, {
    onCompleted(data) {
      if (data?.payOrder) {
        setVisibleCash(false);
        goSuccess();
      }
    },
    onError(err) {
      showWarning(err.message);
    },
  });

  useEffect(() => {
    if (!visibleMcs || !transaction || !order) return;
    let cancelled = false;

    const runScanner = async () => {
      try {
        const result = await launchCardScanner(order.totalAmount.toString());
        if (cancelled) return;
        const mcsData = JSON.stringify({
          timestamp: new Date().toISOString(),
          response: { payment_status: result.payment_status, response_body: result.response_body || {} },
        });
        validateTransaction({ variables: { id: transaction.id, data: mcsData } });
      } catch (err: any) {
        if (cancelled) return;
        if (err.message === 'CANCELLED') {
          setVisibleMcs(false);
          showWarning(t('mainPage.PaymentCancelled') || 'Payment was cancelled');
          return;
        }
        const errorData = JSON.stringify({
          timestamp: new Date().toISOString(),
          response: { payment_status: false, response_body: { message: err.message || 'Error' } },
        });
        validateTransaction({ variables: { id: transaction.id, data: errorData } });
        setVisibleMcs(false);
        toast.show(err.message || t('mainPage.CardScannerError'), {
          type: 'danger',
          placement: 'center',
          duration: 4000,
          animationType: 'slide-in',
        });
      }
    };

    runScanner();
    return () => {
      cancelled = true;
    };
  }, [visibleMcs, transaction, order]);

  const onSelectBank = useCallback(
    (type: string, id?: string) => {
      if (type === 'Cash') {
        setVisibleCash(true);
        return;
      }
      if (!id) return;
      setActiveType(type);
      console.log('payOrder input:', { ...baseInput, confirm: false, payment: id });
      payOrder({ variables: { input: { ...baseInput, confirm: false, payment: id } } });
    },
    [baseInput, payOrder],
  );

  const onCash = useCallback(() => {
    payCash({ variables: { input: { ...baseInput, confirm: true, payment: '' } } });
  }, [baseInput, payCash]);

  const onRefetch = useCallback(
    (txId: string) => {
      validateTransaction({ variables: { id: txId } }).catch(() => showWarning(t('mainPage.NotPaidDescription')));
    },
    [validateTransaction, showWarning, t],
  );

  const findPayment = (type: string) => participant?.payments.find((p) => p.type === type);

  if (loading || !order) return <Loader />;
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('mainPage.your_payment')}</Text>
        <Text style={styles.amount}>
          {order.grandTotal.toLocaleString()} {CURRENCY}
        </Text>
        <Text style={styles.subtitle}>{t('mainPage.SelectYourPaymentChannel')}</Text>

        <View style={styles.buttons}>
          {(findPayment(PAYMENT_TYPE.QPay) || findPayment(PAYMENT_TYPE.QPay2)) && (
            <PaymentButton
              type="QPay"
              id={(findPayment(PAYMENT_TYPE.QPay) || findPayment(PAYMENT_TYPE.QPay2))?.id}
              onSelect={onSelectBank}
              loading={paying && activeType === 'QPay'}
            />
          )}
          {findPayment(PAYMENT_TYPE.MPY) && (
            <PaymentButton
              type="MPY"
              id={findPayment(PAYMENT_TYPE.MPY)?.id}
              onSelect={onSelectBank}
              loading={paying && activeType === 'MPY'}
            />
          )}
          {findPayment(PAYMENT_TYPE.MCS) && (
            <PaymentButton
              type="MCS"
              id={findPayment(PAYMENT_TYPE.MCS)?.id}
              onSelect={onSelectBank}
              loading={paying && activeType === 'MCS'}
            />
          )}
          {findPayment(PAYMENT_TYPE.Toki) && (
            <PaymentButton
              type="Toki"
              id={findPayment(PAYMENT_TYPE.Toki)?.id}
              onSelect={onSelectBank}
              loading={paying && activeType === 'Toki'}
            />
          )}
          {!participant?.advancePayment && <PaymentButton type="Cash" onSelect={onSelectBank} />}
        </View>

        <OrderInfo order={order} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>
      </View>

      <PendingTransactionModal
        visible={visiblePending}
        loading={validating}
        transaction={transaction as ITransaction}
        onClose={() => setVisiblePending(false)}
        refetch={onRefetch}
      />
      <McsPaymentModal
        visible={visibleMcs}
        loading={validating}
        transaction={transaction as ITransaction}
        onClose={() => setVisibleMcs(false)}
      />
      <PayCashierModal
        visible={visibleCash}
        loading={cashing}
        onClose={() => setVisibleCash(false)}
        onConfirm={onCash}
      />
    </View>
  );
};

export default Payment;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'space-between' },
  content: { alignItems: 'center', paddingTop: 100 },
  title: { fontSize: 20, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
  amount: { fontSize: 24, fontWeight: '700', color: '#facc15', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  buttons: { flexDirection: 'row', gap: 16 },
  footer: { flexDirection: 'row', padding: 24 },
  backBtn: { backgroundColor: '#f3f4f6', paddingVertical: 18, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
});
