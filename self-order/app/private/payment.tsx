import { useCallStore } from '@/cache/cart.store';
import Loader from '@/components/Loader';
import PayCashierModal from '@/components/Modal/PayCashierModal';
import PaymentModal from '@/components/Modal/PendingTransaction';
import McsPaymentModal from '@/components/Modal/McsPaymentModal';
import OrderInfo from '@/components/OrderInfo';
import CashForm from '@/components/PaymentForms/cash';
import QpayForm from '@/components/PaymentForms/qpay';
import McsForm from '@/components/PaymentForms/mcs';
import TokiForm from '@/components/PaymentForms/toki';
import { CURRENCY, PAYMENT_TYPE } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import { GET_PAY_ORDER, VALIDATE_TRANSACTION } from '@/graphql/mutation/order';
import { GET_ORDER } from '@/graphql/query';
import { ON_UPDATED_ORDER } from '@/graphql/subscription';
import { getPayload } from '@/providers/auth';
import { useDraw } from '@/providers/drawerProvider';
import { useOrderStore } from '@/cache/order.store';
import { IOrder, ITransaction } from '@/types';
import { useMutation, useQuery, useSubscription, useApolloClient } from '@apollo/client';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useToast } from 'react-native-toast-notifications';
import { launchCardScanner } from '@/utils/cardScanner';

const Payment = () => {
  const { t } = useTranslation('language');
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<IOrder>();
  const toast = useToast();
  const apolloClient = useApolloClient();
  const orderState = useOrderStore((state) => state.orderState);
  const clearOrder = useOrderStore((state) => state.clearOrder);
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
          const result = await launchCardScanner(order.totalAmount.toString());

          const mcsData = JSON.stringify({
            timestamp: new Date().toISOString(),
            response: {
              payment_status: result.payment_status,
              response_body: result.response_body || {},
            },
          });

          await validateTransaction({
            variables: {
              id: transaction.id,
              data: mcsData,
            },
          });
        } catch (error: any) {
          if (error.message === 'CANCELLED') {
            setVisibleMcs(false);
            toast.show(t('mainPage.PaymentCancelled') || 'Payment was cancelled', {
              type: 'warning',
              icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
              placement: 'top',
              warningColor: defaultColor,
              duration: 4000,
              animationType: 'slide-in',
            });
            return;
          }

          const errorData = JSON.stringify({
            timestamp: new Date().toISOString(),
            response: {
              payment_status: false,
              response_body: {
                message: error.message || 'Error',
              },
            },
          });

          try {
            await validateTransaction({
              variables: {
                id: transaction.id,
                data: errorData,
              },
            });
          } catch (validationError) {
            console.error('Failed to update transaction:', validationError);
          }

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
    onData: ({ data }) => {
      const updatedData = data?.data?.onUpdatedOrder;
      if (!updatedData) return;

      const { order: subscriptionOrder } = updatedData;

      if (subscriptionOrder.id === orderId && subscriptionOrder.paymentState === 'PAID') {
        setVisiblePending(false);
        setVisibleMcs(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      }
    },
  });

  const { loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    fetchPolicy: 'no-cache',
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
      if (data && data?.payOrder) {
        const transaction = data.payOrder.transaction;
        setTransaction(transaction);

        if (transaction.type === PAYMENT_TYPE.MCS) {
          setVisibleMcs(true);
        } else {
          setVisiblePending(true);
        }
      }
      setActivePaymentType(null);
    },
    onError(err) {
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
      const updatedOrder = data.validateTransaction;

      if (updatedOrder.paymentState === 'PAID') {
        setVisibleMcs(false);
        setVisiblePending(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      } else {
        const failedTransaction = updatedOrder.transactions?.find((t: ITransaction) => t.id === transaction?.id);

        const errorMessage = failedTransaction?.comment || t('mainPage.NotPaidDescription');

        setVisibleMcs(false);
        toast.show(errorMessage, {
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
      setVisibleMcs(false);
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
    if (type === 'Cash') {
      setVisibleCash(true);
      return;
    }

    if (type === 'MCS') {
      if (id) {
        setActivePaymentType(type);
        onSubmit(id);
      }
      return;
    }

    if (id) {
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
          {order.grandTotal.toLocaleString()} {CURRENCY}
        </Text>
        <Text style={styles.subtitle}>{t('mainPage.SelectYourPaymentChannel')}</Text>
        <View
          style={{
            flexDirection: 'row',
            gap: 16,
          }}
        >
          {participant?.payments.find(
            (payment) => payment.type === PAYMENT_TYPE.QPay || payment.type === PAYMENT_TYPE.QPay2,
          ) && (
            <QpayForm
              id={
                participant?.payments.find(
                  (payment) => payment.type === PAYMENT_TYPE.QPay || payment.type === PAYMENT_TYPE.QPay2,
                )?.id
              }
              onSelect={onSelectBank}
              loading={paying && activePaymentType === 'Khan bank'}
            />
          )}

          {participant?.payments.find((payment) => payment.type === PAYMENT_TYPE.MCS) && (
            <McsForm
              id={participant?.payments.find((payment) => payment.type === PAYMENT_TYPE.MCS)?.id}
              onSelect={onSelectBank}
              loading={paying && activePaymentType === 'MCS'}
            />
          )}
          {participant?.payments.find((payment) => payment.type === PAYMENT_TYPE.Toki) && (
            <TokiForm
              id={participant?.payments.find((payment) => payment.type === PAYMENT_TYPE.Toki)?.id}
              onSelect={onSelectBank}
              loading={paying && activePaymentType === 'Toki'}
            />
          )}
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
            clearOrder();
            setDrawerVisible(false);

            apolloClient.clearStore();

            router.dismissAll();
            router.replace('/private');
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
          // refetch={(transactionId) => {
          //   onRefetch(transactionId);
          // }}
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
