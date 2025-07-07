import 'react-native-get-random-values';
import '../utils/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
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
import SubscriptionProvider from '@/providers/subscription';
import { Camera } from 'expo-camera';
import { ValidProvider } from '@/context/ValidContext';
import { getStorage } from '@/cache';
import { useTranslation } from 'react-i18next';
import { OrderProvider } from '@/providers/OrderProvider';
import { LogBox, Platform } from 'react-native';
import { DrawerProvider } from '@/providers/drawerProvider';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
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
    const requestPermission = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(status === 'granted');
      }
    };
    requestPermission();
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
                <OrderProvider>
                  <DrawerProvider>
                    <CartProvider>
                      <SubscriptionProvider>
                        <ToastProvider
                          renderType={{
                            custom_type: (toast: ToastProps) => (
                              <CustomToast type={toast.type ?? 'default'} message={toast.message} />
                            ),
                          }}
                        >
                          <StatusBar hidden />
                          <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="index" />
                            <Stack.Screen name="public" />
                            <Stack.Screen name="private" />
                          </Stack>
                        </ToastProvider>
                      </SubscriptionProvider>
                    </CartProvider>
                  </DrawerProvider>
                </OrderProvider>
              </ValidProvider>
            </PaperProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}
