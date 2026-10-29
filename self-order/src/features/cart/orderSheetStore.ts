import { create } from 'zustand';

type OrderSheetState = {
  open: boolean;
  show: () => void;
  close: () => void;
};

/** The order sheet over the menu: what's about to be sent and what's been ordered, opened from the order bar. */
export const useOrderSheet = create<OrderSheetState>()((set) => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
}));
