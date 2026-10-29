import 'react-native-get-random-values';
import '@/src/i18n';
import '@/src/global.css';
// First, so a crash anywhere after this shows the error page rather than a blank screen
import { markAppStarted, useCrash } from '@/src/features/kiosk/crash';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ApolloProvider } from '@apollo/client';
// One import per weight, so only these four go into the bundle (the package has nine)
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { Camera } from 'expo-camera';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { HeroUINativeProvider, useThemeColor } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';
import { Kiosk } from '@/modules/kiosk';
import { markActivity } from '@/src/features/kiosk/activity';
import { AdminExit } from '@/src/features/kiosk/AdminExit';
import { EXTRA_ALLOWED_APPS } from '@/src/features/kiosk/allowedApps';
import { AppUpdater } from '@/src/features/kiosk/AppUpdater';
import { ErrorScreen } from '@/src/features/kiosk/ErrorScreen';
import { HiddenNavigationBar } from '@/src/features/kiosk/HiddenNavigationBar';
import { NightlyRestart } from '@/src/features/kiosk/NightlyRestart';
import { OfflineNotice } from '@/src/features/kiosk/OfflineNotice';
import { UpdatePrompt } from '@/src/features/kiosk/UpdatePrompt';
import { QuizOverlay } from '@/src/features/quiz/QuizOverlay';
import client from '@/src/providers/apolloClient';
import { AuthProvider } from '@/src/providers/auth';
import { getStorage } from '@/src/lib/storage';
import { ValidProvider, useValid } from '@/src/providers/ValidProvider';
import { LoadingScreen } from '@/src/ui/LoadingScreen';
import { useThemeStore } from '@/src/ui/themeStore';

SplashScreen.preventAutoHideAsync();

// An error anywhere in the app (the menu and setup screens have their own) shows what went wrong and
// restarts, never a blank screen
export { ErrorScreen as ErrorBoundary };

/** True once the saved light/dark choice has been read, so the first frame is drawn in the right theme. */
const useThemeLoaded = () => {
  const [loaded, setLoaded] = useState(useThemeStore.persist.hasHydrated);
  useEffect(() => {
    if (useThemeStore.persist.hasHydrated()) setLoaded(true);
    return useThemeStore.persist.onFinishHydration(() => setLoaded(true));
  }, []);
  return loaded;
};

export default function RootLayout() {
  // A kiosk: the screen never times out while the app is up. The power button and a flat battery
  // still turn it off.
  useKeepAwake();
  const { i18n } = useTranslation();
  const isDark = useThemeStore((s) => s.isDark);
  const themeLoaded = useThemeLoaded();
  // Builds from 2.0.5 on embed Onest too; loading it here also covers older builds via OTA.
  // A font that fails to load falls back to the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold });
  const ready = themeLoaded && (fontsLoaded || !!fontError);

  useEffect(() => {
    Uniwind.setTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (!ready) return;
    markAppStarted();
    SplashScreen.hideAsync();
    getStorage('language').then((lang) => {
      if (lang) i18n.changeLanguage(lang.toLowerCase());
    });
    Camera.requestCameraPermissionsAsync();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    SystemUI.setBackgroundColorAsync('transparent');
    if (Platform.OS === 'android') Kiosk.start(EXTRA_ALLOWED_APPS).catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    // Every touch, dialogs included, keeps the screensaver away
    <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={markActivity}>
      <ApolloProvider client={client}>
        <AuthProvider>
          <SafeAreaProvider>
            <HeroUINativeProvider>
              <ValidProvider>
                <NavigationTheme isDark={isDark}>
                  <StatusBar hidden />
                  <HiddenNavigationBar />
                  <Routes />
                  <QuizOverlay />
                  <OfflineNotice />
                  <UpdatePrompt />
                  <AppUpdater />
                  <NightlyRestart />
                  <AdminExit />
                </NavigationTheme>
              </ValidProvider>
            </HeroUINativeProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ApolloProvider>
      {/* Last, so it covers everything, dialogs included */}
      <CrashOverlay />
    </GestureHandlerRootView>
  );
}

/** A crash outside any screen's drawing (a button, a timer): the error page over the app (see crash.ts). */
const CrashOverlay = () => {
  const error = useCrash((s) => s.error);
  if (!error) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <ErrorScreen error={error} retry={async () => useCrash.setState({ error: null })} />
    </View>
  );
};

/**
 * (menu): the guests' screens, at / and /history. setup: staff link the tablet to a table, at /setup.
 * The menu's layout sends a tablet without a table session to setup; until that's known, a loader.
 */
const Routes = () => {
  const { valid } = useValid();
  if (valid === null) return <LoadingScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
};

/** Screen transitions show the navigator's background; match it to the app theme. */
const NavigationTheme = ({ isDark, children }: { isDark: boolean; children: ReactNode }) => {
  const background = useThemeColor('background');
  const theme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background } };
  }, [isDark, background]);
  return <ThemeProvider value={theme}>{children}</ThemeProvider>;
};
