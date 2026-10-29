import { create } from 'zustand';
import { IOrder } from '@/src/types';

type CheckoutState = {
  /** The order being paid; null = checkout closed */
  orderId: string | null;
  /**
   * The order as the tablet already has it (from the orders list, or just placed): the checkout opens
   * on it instead of a spinner, while the server's latest copy loads
   */
  preview: IOrder | null;
  open: (orderId: string, options?: { order?: IOrder | null }) => void;
  close: () => void;
};

/** Which order the checkout dialog is showing. Opened after ordering (paying first), or to pay the bill. */
export const useCheckout = create<CheckoutState>()((set) => ({
  orderId: null,
  preview: null,
  open: (orderId, options) => set({ orderId, preview: options?.order ?? null }),
  close: () => set({ orderId: null, preview: null }),
}));
