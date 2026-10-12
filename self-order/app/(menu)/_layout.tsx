import { Redirect, Stack } from 'expo-router';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GiftDialog } from '@/src/features/social/GiftDialog';
import { IncomingMessages } from '@/src/features/social/IncomingMessages';
import { SitDialog } from '@/src/features/social/SitDialog';
import { TableEventListener } from '@/src/features/social/TableEventListener';
import { useValid } from '@/src/providers/ValidProvider';

/** Guests' screens: they need a table session, so without one the tablet goes to setup. */
export default function MenuLayout() {
  const { valid } = useValid();
  const giftEnabled = useSessionStore((s) => s.config?.giftOrder === true);
  const sitEnabled = useSessionStore((s) => s.config?.sitTogether === true);

  if (!valid) return <Redirect href="/setup" />;

  return (
    <>
      {/* Paying happens in the checkout dialog on the menu; history is the only other screen */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
      </Stack>
      {/* Gifts and sit-together, when the branch has them switched on. After the screens, so the
          answer banner sits on top of them. */}
      {(giftEnabled || sitEnabled) && (
        <>
          <TableEventListener />
          {giftEnabled && <GiftDialog />}
          {sitEnabled && <SitDialog />}
          <IncomingMessages />
        </>
      )}
    </>
  );
}
