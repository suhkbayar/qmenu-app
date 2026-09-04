import { Stack } from 'expo-router';
import TableMessageListener from '@/src/components/TableMessageListener';
import TableMessageComposer from '@/src/components/TableMessageComposer';
import SitRequestModal from '@/src/components/modals/SitRequestModal';
import { useCallStore } from '@/src/store/cart.store';

export default function PrivateLayout() {
  const giftEnabled = useCallStore((s) => s.config?.giftOrder === true);
  const sitEnabled = useCallStore((s) => s.config?.sitTogether === true);

  return (
    <>
      {(giftEnabled || sitEnabled) && (
        <>
          <TableMessageListener />
          <TableMessageComposer />
          <SitRequestModal />
        </>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="draft-order" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="payment-success" />
        <Stack.Screen name="vat" />
        <Stack.Screen name="product-info" />
        <Stack.Screen name="history" />
      </Stack>
    </>
  );
}
