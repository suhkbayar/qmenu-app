import { Stack } from 'expo-router';

export default function PrivateLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="draft-order" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="vat" />
      <Stack.Screen name="product-info" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
