import 'react-native-get-random-values';
import '@/src/utils/i18n';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import 'react-native-reanimated';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ToastProvider } from 'react-native-toast-notifications';
import type { ToastProps } from 'react-native-toast-notifications/lib/typescript/toast';
import { Camera } from 'expo-camera';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SystemUI from 'expo-system-ui';
import * as Updates from 'expo-updates';

import CustomToast from '@/src/components/ui/CustomToast';
import KioskPinModal from '@/src/components/KioskPinModal';
import client from '@/src/providers/apolloClient';
import { AuthProvider } from '@/src/providers/auth';
import { CartProvider } from '@/src/providers/CartProvider';
import { DrawerProvider } from '@/src/providers/DrawerProvider';
import { ValidProvider } from '@/src/providers/ValidProvider';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { useKioskExit } from '@/src/hooks/useKioskExit';
import { KioskModule } from '@/src/modules/KioskModule';
import { getStorage } from '@/src/store/storage';
import { useTranslation } from 'react-i18next';

SplashScreen.preventAutoHideAsync();

// Apply Inter font globally to all RN Text and TextInput
(Text as any).defaultProps = { ...(Text as any).defaultProps, style: { fontFamily: 'Inter-Regular' } };
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, style: { fontFamily: 'Inter-Regular' } };

const paperTheme = {
  ...MD3LightTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    default: { ...MD3LightTheme.fonts.default, fontFamily: 'Inter-Regular' },
    bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: 'Inter-Regular' },
    bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: 'Inter-Regular' },
    bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: 'Inter-Regular' },
    labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: 'Inter-Medium' },
    labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: 'Inter-Medium' },
    labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: 'Inter-SemiBold' },
    titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: 'Inter-SemiBold' },
    titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: 'Inter-Bold' },
    titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: 'Inter-Bold' },
    headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: 'Inter-Bold' },
    headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: 'Inter-ExtraBold' },
    headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: 'Inter-ExtraBold' },
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'rgb(255, 255, 255)' },
};

function KioskOverlay() {
  const { handleSecretTap, pinVisible, handlePinSubmit, handlePinCancel } = useKioskExit();
  return (
    <>
      <Pressable onPress={handleSecretTap} style={styles.hiddenTap} />
      <KioskPinModal visible={pinVisible} onSubmit={handlePinSubmit} onCancel={handlePinCancel} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { i18n } = useTranslation();

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Inter-Regular': { uri: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2' },
    'Inter-Medium': { uri: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2' },
    'Inter-SemiBold': { uri: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2' },
    'Inter-Bold': { uri: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2' },
    'Inter-ExtraBold': { uri: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hiJ-Ek-_EeA.woff2' },
  });

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync();

    // Load stored language
    getStorage('language').then((lang) => {
      if (lang) i18n.changeLanguage(lang.toLowerCase());
    });

    // Camera permission
    Camera.requestCameraPermissionsAsync();

    // Lock landscape
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    // Transparent system UI
    SystemUI.setBackgroundColorAsync('transparent');

    // Kiosk mode
    if (Platform.OS === 'android') {
      KioskModule.startKiosk().catch(() => {});
    }

    // Hide Android nav bar
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#FF000000')
        .then(() => NavigationBar.setButtonStyleAsync('light'))
        .then(() => NavigationBar.setVisibilityAsync('hidden'))
        .catch(() => {});
    }

    // OTA updates
    if (!__DEV__) {
      Updates.checkForUpdateAsync()
        .then(async (update) => {
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        })
        .catch(() => {});
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : CustomDefaultTheme}>
      <ApolloProvider client={client}>
        <AuthProvider>
          <SafeAreaProvider>
            <PaperProvider theme={paperTheme}>
              <ValidProvider>
                <DrawerProvider>
                  <CartProvider>
                    <ToastProvider
                      renderType={{
                        custom_type: (toast: ToastProps) => (
                          <CustomToast type={toast.type ?? 'default'} message={toast.message} />
                        ),
                      }}
                    >
                      <StatusBar hidden />
                      <KioskOverlay />
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Screen name="public" />
                        <Stack.Screen name="private" />
                      </Stack>
                    </ToastProvider>
                  </CartProvider>
                </DrawerProvider>
              </ValidProvider>
            </PaperProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  hiddenTap: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -30 }],
    width: 60,
    height: 60,
    zIndex: 999,
  },
});
