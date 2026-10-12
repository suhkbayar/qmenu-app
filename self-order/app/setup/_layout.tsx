import { Stack } from 'expo-router';

/** Staff's screens: link this tablet to a table by its code, typed or scanned. */
export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}
