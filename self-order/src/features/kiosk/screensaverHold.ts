import { useEffect } from 'react';
import { create } from 'zustand';

// How many open panels and dialogs are keeping the screensaver away
const useHolds = create<{ count: number }>()(() => ({ count: 0 }));

/**
 * While `active` (a panel or dialog is open), the screensaver doesn't come on. Someone scanning the
 * payment QR with their phone, or reading the order, isn't touching the screen but is still there:
 * the screensaver is only for the bare menu nobody is using.
 */
export const useHoldScreensaver = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    useHolds.setState((s) => ({ count: s.count + 1 }));
    return () => useHolds.setState((s) => ({ count: s.count - 1 }));
  }, [active]);
};

/** True while any panel or dialog holds the screensaver back. */
export const useScreensaverHeld = () => useHolds((s) => s.count > 0);
