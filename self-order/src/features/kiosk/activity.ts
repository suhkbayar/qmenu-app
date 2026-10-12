import { create } from 'zustand';

/** Last time anyone touched the screen, anywhere, dialogs included. The screensaver waits on it. */
export const useActivity = create<{ lastTouch: number }>()(() => ({ lastTouch: Date.now() }));

export const markActivity = () => useActivity.setState({ lastTouch: Date.now() });
