import { useMemo } from 'react';
import { create } from 'zustand';
import { IMenuProduct, IMenuVariant, IOrderItem } from '@/src/types';
import { generateUUID } from '@/src/lib/uuid';
import { cartTotals } from './totals';

/** Another table that items are gifted to */
export interface IGiftTarget {
  id: string;
  name: string;
}

interface CartState {
  items: IOrderItem[];
  giftTarget: IGiftTarget | null;
  giftStickerId: string | null;
  giftAnonymous: boolean;

  /** Simple products (one variant, no options) have a single cart line; this sets its quantity. 0 removes it. */
  setProductQuantity: (product: IMenuProduct, quantity: number) => void;
  /** Adds a line configured on the product screen (chosen variant and options). */
  addItem: (item: IOrderItem) => void;
  /** Adds `delta` to a line's quantity; the line is removed when it reaches 0. */
  changeQuantity: (uuid: string, delta: number) => void;
  removeItems: (uuids: string[]) => void;
  /** The kitchen note on a line ("no onion"); empty removes it. */
  setComment: (uuid: string, comment: string) => void;
  /** Empties the cart after an order is placed. */
  clear: () => void;

  setGiftTarget: (target: IGiftTarget | null) => void;
  setGiftSticker: (stickerId: string | null) => void;
  setGiftAnonymous: (anonymous: boolean) => void;
  /** Gifts a simple product to another table, as its own line. */
  addGiftItem: (product: IMenuProduct, quantity: number, target: IGiftTarget) => void;
  /** Gifts a line configured on the product screen to another table. */
  addGiftOrderItem: (item: IOrderItem, target: IGiftTarget) => void;
  /** Cancels the gift: gifted lines become normal lines again. */
  clearGift: () => void;
}

const emptyCart = {
  items: [] as IOrderItem[],
  giftTarget: null,
  giftStickerId: null,
  giftAnonymous: false,
};

// A cart line for a simple product's only variant
const simpleLine = (product: IMenuProduct, variant: IMenuVariant, quantity: number, gift?: IGiftTarget): IOrderItem => {
  return {
    id: variant.id,
    uuid: generateUUID(),
    productId: product.productId,
    name: variant.name || product.name,
    price: variant.salePrice,
    quantity,
    // variant.options is what's on offer, not the guest's picks; products with options go through addItem
    options: [],
    image: product.image ?? '',
    comment: '',
    discount: 0,
    reason: '',
    state: 'DRAFT',
    giftToTableId: gift?.id,
    giftToTableName: gift?.name,
  };
};

export const useCartStore = create<CartState>()((set) => ({
  ...emptyCart,

  setProductQuantity: (product, quantity) =>
    set((state) => {
      const variant = product.variants?.[0];
      if (!variant) return state;
      const index = state.items.findIndex((item) => item.id === variant.id && !item.giftToTableId);

      if (index < 0) return quantity > 0 ? { items: [...state.items, simpleLine(product, variant, quantity)] } : state;
      if (quantity <= 0) return { items: state.items.filter((_, n) => n !== index) };
      return { items: state.items.map((item, n) => (n === index ? { ...item, quantity } : item)) };
    }),

  addItem: (item) => set((state) => ({ items: [...state.items, item] })),

  changeQuantity: (uuid, delta) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.uuid === uuid ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    })),

  removeItems: (uuids) => set((state) => ({ items: state.items.filter((item) => !uuids.includes(item.uuid)) })),

  setComment: (uuid, comment) =>
    set((state) => ({ items: state.items.map((item) => (item.uuid === uuid ? { ...item, comment } : item)) })),

  clear: () => set(emptyCart),

  setGiftTarget: (giftTarget) => set({ giftTarget }),
  setGiftSticker: (giftStickerId) => set({ giftStickerId }),
  setGiftAnonymous: (giftAnonymous) => set({ giftAnonymous }),

  addGiftItem: (product, quantity, target) =>
    set((state) => {
      const variant = product.variants?.[0];
      return variant ? { items: [...state.items, simpleLine(product, variant, quantity, target)] } : state;
    }),

  addGiftOrderItem: (item, target) =>
    set((state) => ({
      items: [
        ...state.items,
        { ...item, uuid: generateUUID(), giftToTableId: target.id, giftToTableName: target.name },
      ],
    })),

  clearGift: () =>
    set((state) => ({
      giftTarget: null,
      giftStickerId: null,
      giftAnonymous: false,
      items: state.items.map((item) =>
        item.giftToTableId ? { ...item, giftToTableId: undefined, giftToTableName: undefined } : item,
      ),
    })),
}));

/** Item count and amount, calculated from the lines (never stored, so they can't drift apart). */
export const useCartTotals = () => {
  const items = useCartStore((s) => s.items);
  return useMemo(() => cartTotals(items), [items]);
};
