import { create } from 'zustand';

let started = false;

/** The app's first screen is up: from now on a crash shows the error page instead (see below). */
export const markAppStarted = () => {
  started = true;
};

const defaultHandler = ErrorUtils.getGlobalHandler();

/**
 * A crash before the app's first screen goes to React Native as before, where expo-updates rolls a
 * broken update back to the previous one. Returns whether it was handed over.
 */
export const handOverIfStarting = (error: Error) => {
  if (started) return false;
  defaultHandler(error, true);
  return true;
};

/** A crash outside any screen's drawing (a button, a timer), shown over the app by CrashOverlay. */
export const useCrash = create<{ error: Error | null }>()(() => ({ error: null }));

// On a fatal error React Native shuts the app's JavaScript down, and expo-updates, past its startup
// window, drops the error rather than crashing: tablets were left on a blank screen for good. The
// error page goes over the app instead, which keeps running until it restarts.
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (!isFatal) return defaultHandler(error, isFatal);
  const crash = error instanceof Error ? error : new Error(String(error));
  if (!handOverIfStarting(crash)) useCrash.setState({ error: crash });
});
