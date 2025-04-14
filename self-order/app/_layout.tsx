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
import SubscriptionProvider from '@/providers/subscription';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    NavigationBar.setVisibilityAsync('hidden'); // hides the soft nav bar
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
            </PaperProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  );
}
