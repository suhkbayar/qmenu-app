import 'react-native-get-random-values';
import '../utils/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ApolloProvider } from '@apollo/client';
import client from '@/providers/client';
import { AuthProvider } from '@/providers/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { ToastProvider } from 'react-native-toast-notifications';
import { ToastProps } from 'react-native-toast-notifications/lib/typescript/toast';
import CustomToast from '@/components/CustomToast';
import * as NavigationBar from 'expo-navigation-bar';
import { CartProvider } from '@/context/CartContext';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Camera } from 'expo-camera';
import { ValidProvider } from '@/context/ValidContext';
import { getStorage } from '@/cache';
import { useTranslation } from 'react-i18next';
import { LogBox, Platform, Pressable, StyleSheet } from 'react-native';
import { useKioskExit } from '@/hooks/useKioskExit';
import KioskPinModal from '@/components/KioskPinModal';
import { KioskModule } from '@/modules/KioskModule';
import { DrawerProvider } from '@/providers/drawerProvider';
import * as Updates from 'expo-updates';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
  });

  LogBox.ignoreLogs([
    'Warning: bound renderChildren: Support for defaultProps will be removed from function components in a future major release.',
  ]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync();
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    NavigationBar.setVisibilityAsync('hidden'); // hides the soft nav bar
  }, []);

  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setBackgroundColorAsync('#FF000000');
          await NavigationBar.setButtonStyleAsync('light');
          await NavigationBar.setVisibilityAsync('hidden');
        } catch (e) {
          console.warn('Navigation bar hide failed:', e);
        }
      }
    };
    hideNavigationBar();
  }, []);

  useEffect(() => {
    const fetchLanguage = async () => {
      const cachedLanguage = await getStorage('language');
      if (cachedLanguage) {
        i18n.changeLanguage(cachedLanguage.toLowerCase());
      }
    };

    fetchLanguage();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('transparent'); // optional
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      KioskModule.startKiosk().catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function checkForUpdates() {
      if (!__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (e) {
          console.warn('Update check failed:', e);
        }
      }
    }
    checkForUpdates();
  }, []);

  if (!loaded) {
    return null;
  }

  const CustomDefaultTheme = {
    ...DefaultTheme, // Extend DefaultTheme
    colors: {
      ...DefaultTheme.colors, // Spread existing colors
      background: 'rgb(255, 255, 255)',
    },
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : CustomDefaultTheme}>
      <ApolloProvider client={client}>
        <AuthProvider>
          <SafeAreaProvider>
            <PaperProvider>
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
