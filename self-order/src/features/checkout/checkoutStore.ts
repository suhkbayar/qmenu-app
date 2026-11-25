import { create } from 'zustand';
import { CartSnapshot } from '@/src/features/cart/cartStore';
import { IOrder } from '@/src/types';

type CheckoutState = {
  /** The order being paid; null = checkout closed */
  orderId: string | null;
  /**
   * The order as the tablet already has it (from the orders list, or just placed): the checkout opens
   * on it instead of a spinner, while the server's latest copy loads
   */
  preview: IOrder | null;
  /** The step needs the wide dialog: U-Point discounts beside the payment */
  wide: boolean;
  /**
   * The cart the order was just placed from (paying first). The cart empties as the checkout opens;
   * if the guest leaves before paying, it's put back, so nothing has to be added again.
   */
  cart: CartSnapshot | null;
  /** Money moved on the order (a payment started, coupons or points used), or it was sent: no putting back */
  settled: boolean;
  open: (orderId: string, options?: { order?: IOrder | null; cart?: CartSnapshot }) => void;
  close: () => void;
  setWide: (wide: boolean) => void;
  setSettled: () => void;
};

/** Which order the checkout dialog is showing. Opened after ordering (paying first), or to pay the bill. */
export const useCheckout = create<CheckoutState>()((set) => ({
  orderId: null,
  preview: null,
  wide: false,
  cart: null,
  settled: false,
  open: (orderId, options) =>
    set({ orderId, preview: options?.order ?? null, wide: false, cart: options?.cart ?? null, settled: false }),
  close: () => set({ orderId: null, preview: null, wide: false, cart: null, settled: false }),
  setWide: (wide) => set({ wide }),
  setSettled: () => set({ settled: true }),
}));
