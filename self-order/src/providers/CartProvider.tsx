import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import { ICustomerOrder, IOrderItem } from '@/src/types/order';
import { IMenuVariant } from '@/src/types/menu';
import { isEmpty } from 'lodash';
import { generateUUID } from '@/src/utils';

interface CartContextType {
  order: ICustomerOrder;
  orderItems: Record<string, IOrderItem>;
  add: (variant: IMenuVariant, productId?: string) => void;
  remove: (variant: IMenuVariant) => void;
  removeOrderItem: (uuid: string) => void;
}

const initialOrder: ICustomerOrder = {
  id: 'new-order',
  items: [],
  totalAmount: 0,
  grandTotal: 0,
  totalQuantity: 0,
  state: 'DRAFT',
};

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orderState, setOrderState] = useState<{
    order: ICustomerOrder;
    orderItems: Record<string, IOrderItem>;
  }>({ order: initialOrder, orderItems: {} });

  const { order, orderItems } = orderState;

  const add = useCallback((variant: IMenuVariant, productId?: string) => {
    if (!variant || order.state === 'COMPLETED') return;
    setOrderState((current) => {
      const { order, orderItems } = current;
      const existingItem = order.items.find((item) => item.state === 'DRAFT' && item.id === variant.id);

      let newItems: IOrderItem[];
      let newOrderItems = { ...orderItems };

      if (existingItem) {
        newItems = order.items.map((item) => {
          if (item.state === 'DRAFT' && item.id === variant.id) {
            const updatedItem = { ...item, quantity: item.quantity + 1 };
            if (productId) newOrderItems[productId] = updatedItem;
            return updatedItem;
          }
          return item;
        });
      } else {
        const newItem: IOrderItem = {
          id: variant.id,
          uuid: generateUUID(),
          productId: productId ?? '',
          name: variant.name,
          reason: '',
          state: 'DRAFT',
          quantity: 1,
          options: isEmpty(variant.options) ? [] : variant.options,
          price: variant.salePrice,
          discount: 0,
          image: '',
        };
        newItems = [...order.items, newItem];
        if (productId) newOrderItems[productId] = newItem;
      }

      let totalAmount = 0;
      let totalQuantity = 0;
      for (const item of newItems) {
        if (item.state !== 'RETURN') {
          const optionTotal = isEmpty(item.options) ? 0 : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);
          totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
          totalQuantity += item.quantity;
        }
      }

      return { order: { ...order, items: newItems, totalAmount, grandTotal: totalAmount, totalQuantity }, orderItems: newOrderItems };
    });
  }, []);

  const remove = useCallback((variant: IMenuVariant) => {
    if (!variant || !variant.productId) return;
    setOrderState((current) => {
      const { order, orderItems } = current;
      const itemToUpdate = order.items.find((item) => item.productId === variant.productId);
      if (!itemToUpdate) return current;

      let newItems = order.items
        .map((item) => item.productId === variant.productId ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0);
      let newOrderItems = { ...orderItems };

      if (itemToUpdate.quantity <= 1) {
        delete newOrderItems[variant.productId];
      } else {
        newOrderItems[variant.productId] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
      }

      let totalAmount = 0;
      let totalQuantity = 0;
      for (const item of newItems) {
        if (item.state !== 'RETURN') {
          const optionTotal = isEmpty(item.options) ? 0 : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);
          totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
          totalQuantity += item.quantity;
        }
      }

      return { order: { ...order, items: newItems, totalAmount, grandTotal: totalAmount, totalQuantity }, orderItems: newOrderItems };
    });
  }, []);

  const removeOrderItem = useCallback((uuid: string) => {
    setOrderState((current) => {
      const { order, orderItems } = current;
      const itemToRemove = order.items.find((item) => item.uuid === uuid);

      let newOrderItems = { ...orderItems };
      if (itemToRemove?.productId) delete newOrderItems[itemToRemove.productId];

      let newItems: IOrderItem[] = [];
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of order.items) {
        if (item.uuid !== uuid) {
          newItems.push(item);
          if (item.state !== 'RETURN') {
            const optionTotal = isEmpty(item.options) ? 0 : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);
            totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
            totalQuantity += item.quantity;
          }
        }
      }

      return { order: { ...order, items: newItems, totalAmount, grandTotal: totalAmount, totalQuantity }, orderItems: newOrderItems };
    });
  }, []);

  const contextValue = useMemo(
    () => ({ order, orderItems, add, remove, removeOrderItem }),
    [order, orderItems, add, remove, removeOrderItem],
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === null) throw new Error('useCart must be used within a CartProvider');
  return context;
};
