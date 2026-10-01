import create from 'zustand';
import { IGiftTarget } from '@/src/store/order.store';

export type ComposerMode = 'order' | 'message' | 'sit';

interface ITableMessageStore {
  composerOpen: boolean;
  composerTarget: IGiftTarget | null;
  composerMode: ComposerMode;
  replyToGiftId: string | null;
  sitRequest: { fromTableId: string; fromTableName: string } | null;
  openSitRequest: (request: { fromTableId: string; fromTableName: string }) => void;
  closeSitRequest: () => void;
  openComposer: (target?: IGiftTarget | null, replyToGiftId?: string | null) => void;
  openSitComposer: () => void;
  closeComposer: () => void;
}

export const useTableMessageStore = create<ITableMessageStore>((set: any) => ({
  composerOpen: false,
  composerTarget: null,
  composerMode: 'order',
  replyToGiftId: null,
  sitRequest: null,
  openSitRequest: (request: { fromTableId: string; fromTableName: string }) =>
    set({ sitRequest: request }),
  closeSitRequest: () => set({ sitRequest: null }),
  openComposer: (target: IGiftTarget | null = null, replyToGiftId: string | null = null) =>
    set({
      composerOpen: true,
      composerTarget: target,
      replyToGiftId,
      composerMode: target ? 'message' : 'order',
    }),
  openSitComposer: () =>
    set({ composerOpen: true, composerTarget: null, replyToGiftId: null, composerMode: 'sit' }),
  closeComposer: () =>
    set({ composerOpen: false, composerTarget: null, replyToGiftId: null, composerMode: 'order' }),
}));
