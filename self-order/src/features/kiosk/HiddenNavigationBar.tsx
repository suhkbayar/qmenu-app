import { useEffect } from 'react';
import { AppState, Keyboard, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { addVisibilityListener } from 'expo-navigation-bar';

// Straight to the native module: expo-navigation-bar's own setter remembers it already hid the bar
// and does nothing the next time, so once Android brought the bar back it stayed
const native =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<{ setHidden: (hidden: boolean) => Promise<void> }>('ExpoNavigationBar')
    : null;

// A swipe up from the edge shows the bar for a moment; it goes again after this long
const REHIDE_AFTER_MS = 3000;
// And a check this often for anything that slipped past the events (hiding a hidden bar does nothing)
const CHECK_EVERY_MS = 5000;

const hide = () => {
  // While the keyboard is up Android needs the bar (to close it); the keyboard closing re-hides it
  if (!Keyboard.isVisible()) native?.setHidden(true).catch(() => {});
};

/**
 * Keeps Android's navigation bar, with its Back button, hidden. Kiosk mode takes away Home and
 * Recents but never Back, so the bar itself has to stay hidden, and Android brings it back on its
 * own: when the kiosk lock comes on (at start, also after an update reopens the app), after the card
 * payment app, after the keyboard or a system dialog. Each time it's hidden again.
 */
export const HiddenNavigationBar = () => {
  useEffect(() => {
    if (!native) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(hide, REHIDE_AFTER_MS);
    };

    hide();
    soon();
    const visibility = addVisibilityListener(({ visibility }) => visibility === 'visible' && soon());
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      hide();
      soon();
    });
    const keyboard = Keyboard.addListener('keyboardDidHide', soon);
    const check = setInterval(hide, CHECK_EVERY_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(check);
      visibility.remove();
      appState.remove();
      keyboard.remove();
    };
  }, []);

  return null;
};
