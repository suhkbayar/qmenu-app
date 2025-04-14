import { Stack } from 'expo-router';

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="order" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
