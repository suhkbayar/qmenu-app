import * as Updates from 'expo-updates';
import { Kiosk } from '@/modules/kiosk';
import { useThemeStore } from '@/src/ui/themeStore';

// The theme's --background and --accent (src/global.css)
const BACKGROUND = { light: '#f5f3ee', dark: '#121110' };
const ACCENT = '#ffc300';

/**
 * Restarts the app; a downloaded update starts with it. Where the build can, in a fresh process.
 * expo's reload instead restarts React inside the running app, behind a white screen it takes away
 * once the new JavaScript has run: when that restart went wrong after an update, tablets stayed
 * white for good. Builds without the fresh restart still reload, on the app's own background.
 */
export const restartApp = (): Promise<void> => {
  if (Kiosk.canRestartApp()) return Kiosk.restartApp();
  const isDark = useThemeStore.getState().isDark;
  return Updates.reloadAsync({
    reloadScreenOptions: {
      backgroundColor: isDark ? BACKGROUND.dark : BACKGROUND.light,
      spinner: { color: ACCENT, size: 'large' },
    },
  });
};
