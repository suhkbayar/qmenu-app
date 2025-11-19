import { useCallStore } from '@/cache/cart.store';
import Loader from '@/components/Loader';
import PayCashierModal from '@/components/Modal/PayCashierModal';
import PaymentModal from '@/components/Modal/PendingTransaction';
import McsPaymentModal from '@/components/Modal/McsPaymentModal';
import OrderInfo from '@/components/OrderInfo';
import CashForm from '@/components/PaymentForms/cash';
import QpayForm from '@/components/PaymentForms/qpay';
import McsForm from '@/components/PaymentForms/mcs';
import { CURRENCY, emptyOrder, PAYMENT_TYPE } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import { GET_PAY_ORDER, VALIDATE_TRANSACTION } from '@/graphql/mutation/order';
import { GET_ORDER, GET_ORDERS } from '@/graphql/query';
import { ON_UPDATED_ORDER } from '@/graphql/subscription';
import { getPayload } from '@/providers/auth';
import { useDraw } from '@/providers/drawerProvider';
import { useOrder } from '@/providers/OrderProvider';
import { IOrder, ITransaction } from '@/types';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Icon } from 'react-native-paper';
import { useToast } from 'react-native-toast-notifications';
import { launchCardScanner } from '@/utils/cardScanner';

const Payment = () => {
  const { t } = useTranslation('language');
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<IOrder>();
  const toast = useToast();
  const { orderState, setOrderState } = useOrder();
  const { setDrawerVisible } = useDraw();
  const [transaction, setTransaction] = useState<ITransaction>();
  const [visiblePending, setVisiblePending] = useState(false);
  const { participant } = useCallStore();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [visibleCash, setVisibleCash] = useState(false);
  const [visibleMcs, setVisibleMcs] = useState(false);
  const [activePaymentType, setActivePaymentType] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayload = async () => {
      const payload = await getPayload();
      setCustomerId(payload?.sub ?? null);
    };

    fetchPayload();
  }, []);

  useEffect(() => {
    const handleMcsPayment = async () => {
      if (visibleMcs && transaction && order) {
        try {
          console.log('🔵 [MCS] Launching card scanner with amount:', order.totalAmount);
          console.log('🔵 [MCS] Transaction ID:', transaction.id);
          console.log('🔵 [MCS] Order ID:', order.id);

          // Launch the card scanner with the payment amount
          const result = await launchCardScanner(order.totalAmount.toString());

          console.log('🟢 [MCS] Card scanner returned successfully');
          console.log('🟢 [MCS] Payment status from native module:', result.payment_status);
          console.log('🟢 [MCS] Full result:', JSON.stringify(result, null, 2));

          // Now we can properly check payment_status from native module
          if (result.payment_status) {
            console.log('✅ [MCS] Payment successful from card scanner');
            console.log('🔄 [MCS] Validating transaction on backend:', transaction.id);
            await validateTransaction({ variables: { id: transaction.id } });
            console.log('✅ [MCS] Validation mutation called');
          } else {
            // Payment was not successful or user cancelled
            console.log('⚠️ [MCS] Payment not successful or cancelled');
            console.log('🔄 [MCS] Validating transaction anyway to check backend state');
            await validateTransaction({ variables: { id: transaction.id } });
          }
        } catch (error: any) {
          console.error('🔴 [MCS] Card scanner error:', error);
          console.error('🔴 [MCS] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
          setVisibleMcs(false);
          toast.show(error.message || t('mainPage.CardScannerError'), {
            type: 'danger',
            placement: 'center',
            duration: 4000,
            animationType: 'slide-in',
          });
        }
      }
    };

    handleMcsPayment();
  }, [visibleMcs, transaction, order]);

  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: customerId },
    skip: !customerId,
    onData: ({ client, data }) => {
      console.log('📡 [SUBSCRIPTION] Data received:', data);
      console.log('📡 [SUBSCRIPTION] Customer ID:', customerId);

      const updatedData = data?.data?.onUpdatedOrder;
      if (!updatedData) {
        console.log('⚠️ [SUBSCRIPTION] No updated data in subscription response');
        return;
      }

      const { event, order: subscriptionOrder } = updatedData;
      console.log('📡 [SUBSCRIPTION] Event:', event);
      console.log('📡 [SUBSCRIPTION] Order ID:', subscriptionOrder?.id);
      console.log('📡 [SUBSCRIPTION] Order payment state:', subscriptionOrder?.paymentState);

      try {
        // 1️⃣ Update GET_ORDERS (list)
        const cacheList = client.readQuery<{ getOrders: IOrder[] }>({
          query: GET_ORDERS,
        });

        if (cacheList?.getOrders) {
          let updatedOrders = [...cacheList.getOrders];
          const index = updatedOrders.findIndex((order) => order.id === subscriptionOrder.id);
          const exists = index !== -1;

          switch (event) {
            case 'CREATED':
              if (!exists) {
                updatedOrders.push(subscriptionOrder);
              }
              break;

            case 'UPDATED':
              if (exists) {
                updatedOrders[index] = subscriptionOrder;
              } else {
                updatedOrders.push(subscriptionOrder);
              }
              break;

            case 'DELETE':
              updatedOrders = updatedOrders.filter((order) => order.id !== subscriptionOrder.id);
              break;
          }

          client.writeQuery({
            query: GET_ORDERS,
            data: { getOrders: updatedOrders },
          });
        }

        // 2️⃣ Update GET_ORDER (single)
        if (event === 'UPDATED' || event === 'CREATED') {
          client.writeQuery({
            query: GET_ORDER,
            variables: { id: subscriptionOrder.id },
            data: { getOrder: subscriptionOrder },
          });
        } else if (event === 'DELETE') {
          // Optionally clear GET_ORDER if needed
          client.writeQuery({
            query: GET_ORDER,
            variables: { id: subscriptionOrder.id },
            data: { getOrder: null },
          });
        }
        if (subscriptionOrder.id === orderId) {
          console.log('✅ [SUBSCRIPTION] Order matches current orderId, navigating to success');
          console.log('✅ [SUBSCRIPTION] Closing modals and navigating...');
          setVisiblePending(false);
          setVisibleMcs(false);
          router.push({
            pathname: '/private/payment-success',
            params: { orderId: orderId },
          });
        } else {
          console.log('ℹ️ [SUBSCRIPTION] Order does not match current orderId');
          console.log('ℹ️ [SUBSCRIPTION] Current:', orderId, 'Received:', subscriptionOrder.id);
        }

        console.log('✅ [SUBSCRIPTION] Cache updated for both getOrders and getOrder');
      } catch (err) {
        console.error('❌ [SUBSCRIPTION] Cache update failed:', err);
        console.error('❌ [SUBSCRIPTION] Error details:', err);
      }
    },
    onError: (err) => {
      console.error('🔴 [SUBSCRIPTION] Subscription error occurred');
      console.error('🔴 [SUBSCRIPTION] Error message:', err.message);
      console.error('🔴 [SUBSCRIPTION] Error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        extraInfo: err.extraInfo,
      });
    },
  });

  const { loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    onCompleted: (data) => {
      setOrder(data.getOrder);

      if (data?.getOrder.paymentState === 'PAID') {
        setVisiblePending(false);
        setVisibleMcs(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      }
    },
  });

  const [payOrderByCash, { loading: cashing }] = useMutation(GET_PAY_ORDER, {
    onCompleted: (data) => {
      if (data && data?.payOrder) {
        setVisibleCash(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      }

      setVisiblePending(true);
    },
    onError(err) {
      toast.show(err.message, {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const [payOrderByPayment, { loading: paying }] = useMutation(GET_PAY_ORDER, {
    onCompleted: (data) => {
      console.log('💳 [PAYMENT] Payment mutation completed');
      console.log('💳 [PAYMENT] Response data:', JSON.stringify(data, null, 2));

      if (data && data?.payOrder) {
        const transaction = data.payOrder.transaction;
        console.log('💳 [PAYMENT] Transaction created:', {
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
        });

        setTransaction(transaction);

        if (transaction.type === PAYMENT_TYPE.MCS) {
          console.log('💳 [PAYMENT] MCS payment type detected, showing MCS modal');
          setVisibleMcs(true);
        } else {
          console.log('💳 [PAYMENT] Non-MCS payment type, showing pending modal');
          setVisiblePending(true);
        }
      }
      setActivePaymentType(null);
    },
    onError(err) {
      console.error('🔴 [PAYMENT] Payment mutation error:', err.message);
      console.error('🔴 [PAYMENT] Error details:', err);
      setActivePaymentType(null);
      toast.show(err.message, {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const [validateTransaction, { loading: validating }] = useMutation(VALIDATE_TRANSACTION, {
    onCompleted(data) {
      console.log('✔️ [VALIDATE] Validation mutation completed');
      console.log('✔️ [VALIDATE] Response data:', JSON.stringify(data, null, 2));
      console.log('✔️ [VALIDATE] Payment state:', data.validateTransaction.paymentState);

      if (data.validateTransaction.paymentState === 'PAID') {
        console.log('✅ [VALIDATE] Order is PAID, navigating to success screen');
        setVisiblePending(false);
        setVisibleMcs(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      } else if (data.validateTransaction.paymentState !== 'PAID') {
        console.log('⚠️ [VALIDATE] Order is NOT paid yet, state:', data.validateTransaction.paymentState);
        toast.show(t('mainPage.NotPaidDescription'), {
          type: 'warning',
          icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
          placement: 'top',
          warningColor: defaultColor,
          duration: 4000,
          animationType: 'slide-in',
        });
      }
    },
    onError(err) {
      console.error('🔴 [VALIDATE] Validation mutation error:', err.message);
      console.error('🔴 [VALIDATE] Error details:', err);
      toast.show(err.message, {
        type: 'danger',
        placement: 'center',
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const onSubmit = async (paymentId: string) => {
    if (!order) return;

    let input = {
      confirm: false,
      order: order.id,
      payment: paymentId,
      register: orderState.register,
      vatType: participant?.vat ? orderState.vatType : 0,
    };

    payOrderByPayment({
      variables: {
        input: { ...input },
      },
    });
  };

  const onCash = async () => {
    if (!order) return;

    let input = {
      confirm: true,
      order: order.id,
      payment: '',
      register: orderState.register,
      vatType: participant?.vat ? orderState.vatType : 0,
    };

    payOrderByCash({
      variables: {
        input: { ...input },
      },
    });
  };

  const onSelectBank = async (type?: any, id?: string) => {
    console.log('🏦 [SELECT_BANK] Payment method selected:', type, 'Payment ID:', id);

    if (type === 'Cash') {
      console.log('🏦 [SELECT_BANK] Cash payment selected');
      setVisibleCash(true);
      return;
    }

    if (type === 'MCS') {
      // For MCS, first create the transaction, then launch scanner
      console.log('🏦 [SELECT_BANK] MCS payment selected');
      if (id) {
        console.log('🏦 [SELECT_BANK] Creating MCS transaction...');
        setActivePaymentType(type);
        onSubmit(id);
      } else {
        console.warn('🏦 [SELECT_BANK] No payment ID provided for MCS');
      }
      return;
    }

    if (id) {
      console.log('🏦 [SELECT_BANK] Other payment type:', type);
      setActivePaymentType(type);
      onSubmit(id);
    }
  };

  const onRefetch = async (transactionId: string) => {
    try {
      await validateTransaction({ variables: { id: transactionId } });
    } catch (error) {
      toast.show(t('mainPage.NotPaidDescription'), {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    }
  };

  if (loading || !order) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('mainPage.your_payment')}</Text>
        <Text style={styles.amount}>
          {order.totalAmount.toLocaleString()} {CURRENCY}
        </Text>
        <Text style={styles.subtitle}>{t('mainPage.SelectYourPaymentChannel')}</Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
          }}
        >
          <QpayForm
            id={
              participant?.payments.find(
                (payment) => payment.type === PAYMENT_TYPE.QPay || payment.type === PAYMENT_TYPE.QPay2,
              )?.id
            }
            onSelect={onSelectBank}
            loading={paying && activePaymentType === 'Khan bank'}
          />
          <McsForm
            id={participant?.payments.find((payment) => payment.type === PAYMENT_TYPE.MCS)?.id}
            onSelect={onSelectBank}
            loading={paying && activePaymentType === 'MCS'}
          />
          {!participant?.advancePayment && <CashForm onSelect={onSelectBank} />}
        </View>
        {order && <OrderInfo order={order} />}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => router.back()}>
          <Text style={styles.footerButtonText}>{t('mainPage.GoBack')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => {
            router.push('/');
            setOrderState(emptyOrder);
            setDrawerVisible(false);
          }}
        >
          <Text style={styles.footerButtonText}>{t('mainPage.NewOrder')}</Text>
        </TouchableOpacity>
      </View>

      {transaction && transaction.type !== PAYMENT_TYPE.MCS && (
        <PaymentModal
          loading={validating}
          visible={visiblePending}
          onClose={() => {
            setVisiblePending(false);
          }}
          transaction={transaction}
          refetch={(transactionId) => {
            onRefetch(transactionId);
          }}
        />
      )}

      {transaction && transaction.type === PAYMENT_TYPE.MCS && (
        <McsPaymentModal
          loading={validating}
          visible={visibleMcs}
          onClose={() => {
            setVisibleMcs(false);
          }}
          transaction={transaction}
          refetch={(transactionId) => {
            onRefetch(transactionId);
          }}
        />
      )}

      <PayCashierModal
        visible={visibleCash}
        loading={cashing}
        onClose={() => {
          setVisibleCash(false);
        }}
        onConfirm={() => onCash()}
      />
    </View>
  );
};

export default Payment;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingTop: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '20%',
    gap: 16,
  },

  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  paymentButton: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 2,
    width: 160,
  },
  paymentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  footerButton: {
    backgroundColor: '#f3f4f6', // light gray
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  footerButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
});
