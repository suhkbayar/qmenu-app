import { create } from 'zustand';

/** The order sheet's two tabs: what's about to be sent, and what the table has ordered */
export type OrderSheetTab = 'cart' | 'ordered';

type OrderSheetState = {
  open: boolean;
  tab: OrderSheetTab;
  /** Opens the sheet on a tab (or switches to it when open) */
  show: (tab: OrderSheetTab) => void;
  close: () => void;
};

/** The order sheet over the menu: opened from the order bar, and on Захиалсан after an order is sent. */
export const useOrderSheet = create<OrderSheetState>()((set) => ({
  open: false,
  tab: 'cart',
  show: (tab) => set({ open: true, tab }),
  close: () => set({ open: false }),
}));
