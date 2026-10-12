import { create } from 'zustand';

/**
 * Which dialog is open:
 * - gift: pick a table, a dish and a sticker; the gift goes out with this table's next order
 * - sit: invite another table to sit together
 */
export type Composer = 'gift' | 'sit';

/** Something another table sent to this one. */
export type IncomingMessage = {
  key: string;
  kind: 'gift' | 'message' | 'sit-request' | 'sit-reply';
  fromTableId?: string | null;
  fromTableName: string;
  stickerId?: string | null;
  giftId?: string;
  anonymous?: boolean;
  itemsSummary?: string | null;
  /** sit-reply: whether they said yes */
  accepted?: boolean;
  /** The message is itself a reply, so it can't be replied to */
  isReply?: boolean;
};

type SocialState = {
  composer: Composer | null;
  /** Incoming messages, shown one at a time, oldest first */
  inbox: IncomingMessage[];
  openComposer: (composer: Composer) => void;
  closeComposer: () => void;
  receive: (message: Omit<IncomingMessage, 'key'>) => void;
  dismiss: (key: string) => void;
};

let messageSeq = 0;

export const useSocialStore = create<SocialState>()((set) => ({
  composer: null,
  inbox: [],
  openComposer: (composer) => set({ composer }),
  closeComposer: () => set({ composer: null }),
  receive: (message) => set((s) => ({ inbox: [...s.inbox, { ...message, key: `msg-${(messageSeq += 1)}` }] })),
  dismiss: (key) => set((s) => ({ inbox: s.inbox.filter((m) => m.key !== key) })),
}));
