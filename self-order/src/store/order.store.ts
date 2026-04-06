import create from 'zustand';
import { ICustomerOrder, IOrderItem } from '@/src/types/order';
import { emptyOrder } from '@/src/constants';
import { IMenuProduct } from '@/src/types';
import { generateUUID } from '@/src/utils';

interface IOrderStore {
  orderState: ICustomerOrder;
  setOrderState: (order: ICustomerOrder | ((prev: ICustomerOrder) => ICustomerOrder)) => void;
  updateQuantity: (product: IMenuProduct, quantity: number) => void;
  clearOrder: () => void;
}

export const useOrderStore = create<IOrderStore>((set: any) => ({
  orderState: emptyOrder,

  setOrderState: (order: ICustomerOrder | ((prev: ICustomerOrder) => ICustomerOrder)) => {
    if (typeof order === 'function') {
      set((state: IOrderStore) => ({ orderState: order(state.orderState) }));
    } else {
      set({ orderState: order });
    }
  },

  updateQuantity: (product: IMenuProduct, quantity: number) => {
    set((state: IOrderStore) => {
      const newItems = [...state.orderState.items];
      const existingIndex = newItems.findIndex((item) => item.productId === product.productId);

      if (quantity > 0) {
        if (!product?.variants?.length) return state;

        const variant = product.variants[0];
        const item: IOrderItem = {
          id: variant.id,
          uuid: existingIndex >= 0 ? newItems[existingIndex].uuid : generateUUID(),
          productId: product.productId,
          name: variant.name,
          reason: '',
          state: 'DRAFT',
          quantity: quantity,
          options: variant.options ?? [],
          price: variant.salePrice,
          discount: 0,
          image: product.image ?? '',
        };

        if (existingIndex >= 0) {
          newItems[existingIndex] = item;
        } else {
          newItems.push(item);
        }
      } else if (existingIndex >= 0) {
        newItems.splice(existingIndex, 1);
      }

      let totalAmount = 0;
      let totalQuantity = 0;
      for (const item of newItems) {
        const optionTotal = item.options?.reduce((sum: number, opt: any) => sum + (opt.price || 0), 0) ?? 0;
        totalAmount += (item.price + optionTotal) * item.quantity;
        totalQuantity += item.quantity;
      }

      return {
        orderState: {
          ...state.orderState,
          items: newItems,
          totalAmount,
          grandTotal: totalAmount,
          totalQuantity,
        },
      };
    });
  },

  clearOrder: () => set({ orderState: { ...emptyOrder, items: [] } }),
}));
