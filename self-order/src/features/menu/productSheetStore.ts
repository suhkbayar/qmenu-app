import { create } from 'zustand';
import { IMenuProduct } from '@/src/types';

type ProductSheetState = {
  /** The dish being shown; null = closed */
  product: IMenuProduct | null;
  open: (product: IMenuProduct) => void;
  close: () => void;
};

/**
 * Which dish the menu's product sheet shows: opened from a card, or [+] on a dish with options. Kept
 * here rather than in the menu screen, so opening and closing one redraws only the sheet.
 */
export const useProductSheet = create<ProductSheetState>()((set) => ({
  product: null,
  open: (product) => set({ product }),
  close: () => set({ product: null }),
}));
