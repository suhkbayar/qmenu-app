import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ICustomerOrder } from '@/types';
import { emptyOrder } from '@/constants';

interface OrderContextType {
  orderState: ICustomerOrder;
  setOrderState: React.Dispatch<React.SetStateAction<ICustomerOrder>>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [orderState, setOrderState] = useState<ICustomerOrder>(emptyOrder);

  return <OrderContext.Provider value={{ orderState, setOrderState }}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
