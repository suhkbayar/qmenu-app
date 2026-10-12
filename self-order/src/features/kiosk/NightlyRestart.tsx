import { useEffect, useRef } from 'react';
import * as Updates from 'expo-updates';
import { useActivity } from './activity';
import { useGuestBusy } from './useGuestBusy';

// Restart between these hours (tablet time), when restaurants are closed
const FROM_HOUR = 3;
const UNTIL_HOUR = 5;
// Only when nobody has touched the tablet for this long
const IDLE_MS = 10 * 60 * 1000;
// Longer than the window, so the app that starts after a restart doesn't restart again that night
const MIN_UPTIME_MS = 3 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 5 * 60 * 1000;

/**
 * Restarts the app once a night while the tablet is idle, so a tablet left on for weeks starts each
 * day with fresh memory and connections, and picks up any downloaded update. Release builds only.
 */
export const NightlyRestart = () => {
  const guestBusy = useGuestBusy();
  const busy = useRef(guestBusy);
  busy.current = guestBusy;

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const hour = new Date().getHours();
      if (hour < FROM_HOUR || hour >= UNTIL_HOUR) return;
      if (Date.now() - startedAt < MIN_UPTIME_MS) return;
      if (busy.current || Date.now() - useActivity.getState().lastTouch < IDLE_MS) return;
      Updates.reloadAsync().catch(() => {});
    }, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  return null;
};
