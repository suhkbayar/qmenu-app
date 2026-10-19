import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { API_URL } from '@/src/constants';

type Listener = (offline: boolean) => void;

// Whether the tablet can reach the QMenu server, for the whole app. Set by requests to the server (any
// answer, or none at all), by checkConnection(), and by Android only when Wi-Fi itself goes or the
// internet is confirmed back (see below).
let offline = false;
// When the tablet was last known online; a request sent before then that fails late doesn't count
let onlineAt = 0;
const listeners = new Set<Listener>();

export const isOffline = () => offline;

const setOffline = (next: boolean) => {
  if (offline === next) return;

  offline = next;
  listeners.forEach((listener) => listener(offline));
};

/** The server answered (any status, errors too), or Android confirmed the internet: online. */
export const markOnline = () => {
  onlineAt = Date.now();
  setOffline(false);
};

/**
 * A request sent at `sentAt` got no answer: offline, unless the tablet has been online since it was
 * sent. A slow failure from before the internet came back once brought the banner back for good.
 */
export const markNoAnswer = (sentAt: number) => {
  if (sentAt > onlineAt) setOffline(true);
};

export const subscribeNetwork = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** True while the tablet is offline, updating as that changes. */
export const useNoInternet = () => useSyncExternalStore(subscribeNetwork, isOffline);

// Android's word is taken when Wi-Fi drops and when the internet is confirmed back. Its "connected, no
// internet" isn't: it tests by reaching Google, which fails on some networks whose internet works.
// Our own requests decide that case.
NetInfo.addEventListener((state) => {
  if (state.isInternetReachable === true) markOnline();
  else if (state.isConnected === false) setOffline(true);
});

const CHECK_TIMEOUT_MS = 8000;

/**
 * Tries the QMenu server itself; any answer means online. A plain GET, like the app's own requests
 * (an empty HEAD never got through on the tablets); AppSync turns it away as malformed, before any
 * resolver. Resolves to whether the tablet is online now.
 */
export const checkConnection = async () => {
  const sentAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    await fetch(API_URL, { headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal });
    markOnline();
  } catch {
    markNoAnswer(sentAt);
  } finally {
    clearTimeout(timer);
  }
  return !offline;
};

// While offline, try the server every few seconds. Nothing else may say the internet is back: Android
// doesn't notice when only the router's line was down, and a screen may make no requests. Nothing
// runs while online.
const PROBE_EVERY_MS = 10 * 1000;
let probe: ReturnType<typeof setInterval> | undefined;
subscribeNetwork((nowOffline) => {
  clearInterval(probe);
  if (nowOffline) probe = setInterval(checkConnection, PROBE_EVERY_MS);
});
