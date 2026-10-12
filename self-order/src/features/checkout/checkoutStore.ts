import { create } from 'zustand';

type CheckoutState = {
  /** The order being paid; null = checkout closed */
  orderId: string | null;
  /** The order was just sent to be paid at the end: open straight on the done step */
  payLater: boolean;
  open: (orderId: string, options?: { payLater?: boolean }) => void;
  close: () => void;
};

/** Which order the checkout dialog is showing. Opened after ordering, or from My orders to pay. */
export const useCheckout = create<CheckoutState>()((set) => ({
  orderId: null,
  payLater: false,
  open: (orderId, options) => set({ orderId, payLater: options?.payLater ?? false }),
  close: () => set({ orderId: null, payLater: false }),
}));
