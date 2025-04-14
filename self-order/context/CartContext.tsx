import React, { createContext, useState, useContext, useCallback, ReactNode, useMemo } from 'react';
import { ICustomerOrder, IOrderItem } from '../types/order';
import { IMenuVariant } from '../types/menu';
import { isEmpty } from 'lodash';
import { generateUUID } from '../utils';

interface CartContextType {
  order: ICustomerOrder;
  orderItems: Record<string, IOrderItem>; // Pre-indexed items for fast lookup
  add: (variant: IMenuVariant, productId?: string) => void;
  remove: (variant: IMenuVariant) => void;
  removeOrderItem: (uuid: string) => void;
}

// Initial order state
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
  // Use a single state update approach for better performance
  const [orderState, setOrderState] = useState<{
    order: ICustomerOrder;
    orderItems: Record<string, IOrderItem>;
  }>({
    order: initialOrder,
    orderItems: {},
  });

  // Extract values from state for convenience
  const { order, orderItems } = orderState;

  // Add item - optimized for speed
  const add = useCallback((variant: IMenuVariant, productId?: string) => {
    if (!variant || order.state === 'COMPLETED') return;
    // Use functional update to ensure we're working with latest state
    setOrderState((current) => {
      const { order, orderItems } = current;

      // Find if item already exists by variant id
      const existingItem = order.items.find((item) => item.state === 'DRAFT' && item.id === variant.id);

      let newItems: IOrderItem[];
      let newOrderItems = { ...orderItems };
      if (existingItem) {
        // Update existing item - we map to create new references
        newItems = order.items.map((item) => {
          if (item.state === 'DRAFT' && item.id === variant.id) {
            const updatedItem = {
              ...item,
              quantity: item.quantity + 1,
            };
            // Update the lookup as well
            if (productId) {
              newOrderItems[productId] = updatedItem;
            }
            return updatedItem;
          }
          return item;
        });
      } else {
        // Create new item
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

        // Add to items array
        newItems = [...order.items, newItem];

        // Add to lookup table
        if (productId) {
          newOrderItems[productId] = newItem;
        }
      }

      // Fast calculation of totals
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of newItems) {
        if (item.state !== 'RETURN') {
          const optionTotal = isEmpty(item.options) ? 0 : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);

          totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
          totalQuantity += item.quantity;
        }
      }

      // Create new order with updated values
      const newOrder = {
        ...order,
        items: newItems,
        totalAmount,
        grandTotal: totalAmount,
        totalQuantity,
      };

      // Return new state object
      return {
        order: newOrder,
        orderItems: newOrderItems,
      };
    });
  }, []);

  // Remove item - optimized for speed
  const remove = useCallback((variant: IMenuVariant) => {
    if (!variant || !variant.productId) return;

    setOrderState((current) => {
      const { order, orderItems } = current;

      // Find the specific item to update
      const itemToUpdate = order.items.find((item) => item.productId === variant.productId);

      if (!itemToUpdate) {
        return current; // Return unchanged state if item not found
      }

      // Create new arrays/objects to maintain immutability
      let newItems = [...order.items];
      let newOrderItems = { ...orderItems };

      // Update the specific item and handle removal if quantity becomes zero
      newItems = newItems
        .map((item) => {
          if (item.productId === variant.productId) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);

      // Update or remove from lookup object
      if (itemToUpdate.quantity <= 1) {
        // If we're removing the last one, delete from lookup
        delete newOrderItems[variant.productId];
      } else {
        // Otherwise update the lookup with decremented quantity
        newOrderItems[variant.productId] = {
          ...itemToUpdate,
          quantity: itemToUpdate.quantity - 1,
        };
      }

      // Recalculate totals
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of newItems) {
        if (item.state !== 'RETURN') {
          const optionTotal = isEmpty(item.options) ? 0 : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);

          totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
          totalQuantity += item.quantity;
        }
      }

      // Create new order with updated values
      const newOrder = {
        ...order,
        items: newItems,
        totalAmount,
        grandTotal: totalAmount,
        totalQuantity,
      };

      // Return new state object
      return {
        order: newOrder,
        orderItems: newOrderItems,
      };
    });
  }, []);

  // Remove order item by uuid
  const removeOrderItem = useCallback((uuid: string) => {
    setOrderState((current) => {
      const { order, orderItems } = current;

      // Find the item to remove
      const itemToRemove = order.items.find((item) => item.uuid === uuid);

      // Remove from lookup if found
      let newOrderItems = { ...orderItems };
      if (itemToRemove?.productId) {
        delete newOrderItems[itemToRemove.productId];
      }

      // Filter out the item and recalculate totals in one pass
      let newItems: IOrderItem[] = [];
      let totalAmount = 0;
      let totalQuantity = 0;

      for (const item of order.items) {
        if (item.uuid !== uuid) {
          newItems.push(item);

          // Calculate totals while we're iterating
          if (item.state !== 'RETURN') {
            const optionTotal = isEmpty(item.options)
              ? 0
              : item.options.reduce((sum, opt) => sum + (opt.price || 0), 0);

            totalAmount += Math.abs(optionTotal + item.price) * item.quantity;
            totalQuantity += item.quantity;
          }
        }
      }

      // Create new order with updated values
      const newOrder = {
        ...order,
        items: newItems,
        totalAmount,
        grandTotal: totalAmount,
        totalQuantity,
      };

      // Return new state object
      return {
        order: newOrder,
        orderItems: newOrderItems,
      };
    });
  }, []);

  // Pack values for provider
  const contextValue = useMemo(
    () => ({
      order,
      orderItems,
      add,
      remove,
      removeOrderItem,
    }),
    [order, orderItems, add, remove, removeOrderItem],
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
};

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
