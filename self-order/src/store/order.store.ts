import create from 'zustand';
import { ICustomerOrder, IOrderItem } from '@/src/types/order';
import { emptyOrder } from '@/src/constants';
import { IMenuProduct } from '@/src/types';
import { generateUUID } from '@/src/utils';

export interface IGiftTarget {
  id: string;
  name: string;
}

interface IOrderStore {
  orderState: ICustomerOrder;
  setOrderState: (order: ICustomerOrder | ((prev: ICustomerOrder) => ICustomerOrder)) => void;
  updateQuantity: (product: IMenuProduct, quantity: number) => void;
  clearOrder: () => void;
  giftTarget: IGiftTarget | null;
  giftStickerId: string | null;
  giftAnonymous: boolean;
  setGiftTarget: (target: IGiftTarget | null) => void;
  setGiftSticker: (stickerId: string | null) => void;
  setGiftAnonymous: (anonymous: boolean) => void;
  setItemGift: (uuid: string, target: IGiftTarget | null) => void;
  splitItemGift: (uuid: string, quantity: number, target: IGiftTarget) => void;
  addGiftItem: (product: IMenuProduct, quantity: number, target: IGiftTarget) => void;
  /** For products the guest had to configure — carries the chosen variant and options. */
  addGiftOrderItem: (item: IOrderItem, target: IGiftTarget) => void;
  clearGift: () => void;
}

const withGiftItem = (order: ICustomerOrder, item: IOrderItem): ICustomerOrder => {
  const items = [...order.items, item];

  let totalAmount = 0;
  let totalQuantity = 0;
  for (const line of items) {
    const optionTotal = line.options?.reduce((sum: number, opt: any) => sum + (opt.price || 0), 0) ?? 0;
    totalAmount += (line.price + optionTotal) * line.quantity;
    totalQuantity += line.quantity;
  }

  return { ...order, items, totalAmount, grandTotal: totalAmount, totalQuantity };
};

export const useOrderStore = create<IOrderStore>((set: any) => ({
  orderState: emptyOrder,
  giftTarget: null,
  giftStickerId: null,
  giftAnonymous: false,
  setGiftTarget: (target: IGiftTarget | null) => set({ giftTarget: target }),
  setGiftSticker: (stickerId: string | null) => set({ giftStickerId: stickerId }),
  setGiftAnonymous: (anonymous: boolean) => set({ giftAnonymous: anonymous }),

  setItemGift: (uuid: string, target: IGiftTarget | null) =>
    set((state: IOrderStore) => {
      const items = state.orderState.items;
      const index = items.findIndex((i: IOrderItem) => i.uuid === uuid);
      if (index < 0) return state;

      const updated = { ...items[index], giftToTableId: target?.id, giftToTableName: target?.name };

      if (!target) {
        const twin = items.findIndex(
          (i: IOrderItem, n: number) => n !== index && i.id === updated.id && !i.giftToTableId,
        );
        if (twin >= 0) {
          const merged = items
            .map((i: IOrderItem, n: number) => (n === twin ? { ...i, quantity: i.quantity + updated.quantity } : i))
            .filter((_: IOrderItem, n: number) => n !== index);
          return { orderState: { ...state.orderState, items: merged } };
        }
      }

      return {
        orderState: {
          ...state.orderState,
          items: items.map((i: IOrderItem, n: number) => (n === index ? updated : i)),
        },
      };
    }),

  splitItemGift: (uuid: string, quantity: number, target: IGiftTarget) =>
    set((state: IOrderStore) => {
      const items = state.orderState.items;
      const index = items.findIndex((i: IOrderItem) => i.uuid === uuid);
      if (index < 0) return state;

      const source = items[index];

      if (quantity >= source.quantity) {
        return {
          orderState: {
            ...state.orderState,
            items: items.map((i: IOrderItem, n: number) =>
              n === index ? { ...i, giftToTableId: target.id, giftToTableName: target.name } : i,
            ),
          },
        };
      }

      const kept = { ...source, quantity: source.quantity - quantity };
      const gifted: IOrderItem = {
        ...source,
        uuid: generateUUID(),
        quantity,
        giftToTableId: target.id,
        giftToTableName: target.name,
      };

      const next = [...items];
      next.splice(index, 1, kept, gifted);
      return { orderState: { ...state.orderState, items: next } };
    }),

  clearGift: () =>
    set((state: IOrderStore) => ({
      giftTarget: null,
      giftStickerId: null,
      giftAnonymous: false,
      orderState: {
        ...state.orderState,
        items: state.orderState.items.map((item: IOrderItem) =>
          item.giftToTableId ? { ...item, giftToTableId: undefined, giftToTableName: undefined } : item,
        ),
      },
    })),

  setOrderState: (order: ICustomerOrder | ((prev: ICustomerOrder) => ICustomerOrder)) => {
    if (typeof order === 'function') {
      set((state: IOrderStore) => ({ orderState: order(state.orderState) }));
    } else {
      set({ orderState: order });
    }
  },

  addGiftItem: (product: IMenuProduct, quantity: number, target: IGiftTarget) =>
    set((state: IOrderStore) => {
      const variant = product?.variants?.[0];
      if (!variant) return state;

      const item: IOrderItem = {
        id: variant.id,
        uuid: generateUUID(),
        productId: product.productId,
        name: variant.name,
        reason: '',
        state: 'DRAFT',
        quantity,
        // variant.options is the list on offer, not the guest's picks. Anything
        // needing a choice goes through addGiftOrderItem instead.
        options: [],
        price: variant.salePrice,
        discount: 0,
        image: product.image ?? '',
        giftToTableId: target.id,
        giftToTableName: target.name,
      };

      return { orderState: withGiftItem(state.orderState, item) };
    }),

  addGiftOrderItem: (item: IOrderItem, target: IGiftTarget) =>
    set((state: IOrderStore) => ({
      orderState: withGiftItem(state.orderState, {
        ...item,
        uuid: generateUUID(),
        giftToTableId: target.id,
        giftToTableName: target.name,
      }),
    })),

  updateQuantity: (product: IMenuProduct, quantity: number) => {
    set((state: IOrderStore) => {
      const newItems = [...state.orderState.items];
      const existingIndex = newItems.findIndex((item) => item.productId === product.productId && !item.giftToTableId);

      if (quantity > 0) {
        if (!product?.variants?.length) return state;

        const variant = product.variants[0];
        const existing = existingIndex >= 0 ? newItems[existingIndex] : null;
        const item: IOrderItem = {
          id: variant.id,
          uuid: existing ? existing.uuid : generateUUID(),
          productId: product.productId,
          name: variant.name,
          reason: '',
          state: 'DRAFT',
          quantity: quantity,
          options: variant.options ?? [],
          price: variant.salePrice,
          discount: 0,
          image: product.image ?? '',
          giftToTableId: existing?.giftToTableId,
          giftToTableName: existing?.giftToTableName,
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

  clearOrder: () => set({ orderState: { ...emptyOrder, items: [] }, giftTarget: null, giftStickerId: null, giftAnonymous: false }),
}));
