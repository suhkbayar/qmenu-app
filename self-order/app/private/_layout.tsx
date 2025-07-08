import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
export default function PrivateLayout() {
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
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="order" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
