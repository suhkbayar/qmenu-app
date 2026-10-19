import { Stack } from 'expo-router';

// An error on these screens shows what went wrong and a restart, never a blank screen
export { ErrorScreen as ErrorBoundary } from '@/src/features/kiosk/ErrorScreen';

/** Staff's screens: link this tablet to a table by its code, typed or scanned. */
export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}
