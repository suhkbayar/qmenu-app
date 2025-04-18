import { useCallStore } from '@/cache/cart.store';
import Loader from '@/components/Loader';
import PaymentModal from '@/components/Modal/PendingTransaction';
import QpayForm from '@/components/PaymentForms/qpay';
import { emptyOrder, PAYMENT_TYPE } from '@/constants';
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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useToast } from 'react-native-toast-notifications';

const Payment = () => {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<IOrder>();
  const toast = useToast();
  const { setOrderState } = useOrder();
  const { setDrawerVisible } = useDraw();
  const [transaction, setTransaction] = useState<ITransaction>();
  const [visiblePending, setVisiblePending] = useState(false);
  const { participant } = useCallStore();
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayload = async () => {
      const payload = await getPayload();
      setCustomerId(payload?.sub ?? null);
    };

    fetchPayload();
  }, []);

  useEffect(() => {
    console.log('customerId', customerId);
  }, [customerId]);

  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: customerId },
    skip: !customerId,
    onData: ({ client, data }) => {
      console.log('📡 Subscription Data:', data);

      const updatedData = data?.data?.onUpdatedOrder;
      if (!updatedData) return;

      const { event, order: subscriptionOrder } = updatedData;

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
          setVisiblePending(false);
          router.push({
            pathname: '/private/payment-success',
            params: { orderId: orderId },
          });
        }

        console.log('✅ Cache updated for both getOrders and getOrder');
      } catch (err) {
        console.error('❌ Cache update failed:', err);
      }
    },
    onError: (err) => {
      console.error('❌ Subscription error:', err.message);
    },
  });

  const { loading } = useQuery(GET_ORDER, {
    variables: { id: orderId },
    skip: !orderId,
    onCompleted: (data) => {
      setOrder(data.getOrder);

      if (data?.getOrder.paymentState === 'PAID') {
        setVisiblePending(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      }
    },
  });

  const [payOrderByPayment, { loading: paying }] = useMutation(GET_PAY_ORDER, {
    onCompleted: (data) => {
      if (data && data?.payOrder) {
        setTransaction(data.payOrder.transaction);
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

  const [validateTransaction, { loading: validating }] = useMutation(VALIDATE_TRANSACTION, {
    onCompleted(data) {
      if (data.validateTransaction.paymentState === 'PAID') {
        setVisiblePending(false);
        router.push({
          pathname: '/private/payment-success',
          params: { orderId: orderId },
        });
      } else if (data.validateTransaction.paymentState !== 'PAID') {
        toast.show('   Таны төлбөр төлөгдөөгүй байна.', {
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
      vatType: 0,
    };

    payOrderByPayment({
      variables: {
        input: { ...input },
      },
    });
  };

  const onSelectBank = (type?: any, id?: string) => {
    if (id) {
      onSubmit(id);
    }
  };

  const onRefetch = async (transactionId: string) => {
    try {
      await validateTransaction({ variables: { id: transactionId } });
    } catch (error) {
      toast.show('   Таны төлбөр төлөгдөөгүй байна.', {
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
        <Text style={styles.title}>Таны төлбөр</Text>
        <Text style={styles.amount}>{order.totalAmount.toFixed(2)} MNT</Text>

        <Text style={styles.subtitle}>Та төлбөрийн сувагaa сонгоно уу.</Text>
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
            loading={paying}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={() => router.back()}>
          <Text style={styles.footerButtonText}>Буцах</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => {
            router.push('/');
            setOrderState(emptyOrder);
            setDrawerVisible(false);
          }}
        >
          <Text style={styles.footerButtonText}>Шинэ захиалга</Text>
        </TouchableOpacity>
      </View>

      {transaction && (
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
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 24,
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
