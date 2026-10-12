import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_PIN_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

type PinLockState = {
  /** Wrong PINs in a row */
  failures: number;
  /** While in the future, the PIN can't be entered */
  lockedUntil: number;
  fail: () => void;
  reset: () => void;
};

/** Wrong admin PIN attempts. After 5 in a row the PIN is locked for 5 minutes, and a restart doesn't clear it. */
export const usePinLock = create<PinLockState>()(
  persist(
    (set) => ({
      failures: 0,
      lockedUntil: 0,
      fail: () =>
        set((s) =>
          s.failures + 1 >= MAX_PIN_ATTEMPTS
            ? { failures: 0, lockedUntil: Date.now() + LOCK_MS }
            : { failures: s.failures + 1 },
        ),
      reset: () => set({ failures: 0, lockedUntil: 0 }),
    }),
    {
      name: 'admin-pin-lock',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ failures, lockedUntil }) => ({ failures, lockedUntil }),
    },
  ),
);
