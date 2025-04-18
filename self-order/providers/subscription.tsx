import React, { useContext, ReactNode, useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { ON_UPDATED_ORDER } from '../graphql/subscription/order';
import { GET_ORDERS } from '../graphql/query';
import { IOrder } from '../types';
import { AuthContext, getPayload } from './auth';

interface Props {
  children: ReactNode;
}

const SubscriptionProvider: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);

  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayload = async () => {
      const payload = await getPayload();
      setCustomerId(payload?.sub ?? null);
    };

    if (isAuthenticated) {
      fetchPayload();
    }
  }, [isAuthenticated]);

  useSubscription(ON_UPDATED_ORDER, {
    variables: { customer: customerId },
    skip: !customerId,
    onData: ({ client, data }) => {
      if (!data?.data) return;

      const { event, order: subscriptionOrder } = data.data.onUpdatedOrder;

      const cacheData = client.readQuery<{ getOrders: IOrder[] }>({
        query: GET_ORDERS,
      });

      if (!cacheData?.getOrders) return;

      let updatedOrders = cacheData.getOrders.map((order) =>
        order.id === subscriptionOrder.id ? subscriptionOrder : order,
      );

      const orderExists = cacheData.getOrders.some((order) => order.id === subscriptionOrder.id);

      switch (event) {
        case 'CREATED':
        case 'UPDATED':
          if (!orderExists) {
            updatedOrders = [...updatedOrders, subscriptionOrder];
          }
          break;
        case 'DELETE':
          updatedOrders = updatedOrders.filter((order) => order.id !== subscriptionOrder.id);
          break;
        default:
          return;
      }

      client.writeQuery({
        query: GET_ORDERS,
        data: { getOrders: updatedOrders },
      });
    },
  });

  // Optional cleanup effect
  useEffect(() => {
    return () => {
      // Perform cleanup if needed in future
    };
  }, []);

  return <>{children}</>;
};

export default SubscriptionProvider;
