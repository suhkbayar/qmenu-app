import { create } from 'zustand';
import { IOrder } from '@/src/types';

type CheckoutState = {
  /** The order being paid; null = checkout closed */
  orderId: string | null;
  /** The order was just sent to be paid later: open straight on the done step */
  payLater: boolean;
  /**
   * The order as the tablet already has it (from the orders list, or just placed): the checkout opens
   * on it instead of a spinner, while the server's latest copy loads
   */
  preview: IOrder | null;
  open: (orderId: string, options?: { payLater?: boolean; order?: IOrder | null }) => void;
  close: () => void;
};

/** Which order the checkout dialog is showing. Opened after ordering, or from My orders to pay. */
export const useCheckout = create<CheckoutState>()((set) => ({
  orderId: null,
  payLater: false,
  preview: null,
  open: (orderId, options) => set({ orderId, payLater: options?.payLater ?? false, preview: options?.order ?? null }),
  close: () => set({ orderId: null, payLater: false, preview: null }),
}));
