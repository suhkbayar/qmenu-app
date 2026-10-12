import { useCartStore } from '@/src/features/cart/cartStore';
import { useCheckout } from '@/src/features/checkout/checkoutStore';

/** True while a guest is building an order or paying. Updates never restart the app then. */
export const useGuestBusy = () => {
  const cartEmpty = useCartStore((s) => s.items.length === 0);
  const paying = useCheckout((s) => !!s.orderId);
  return !cartEmpty || paying;
};
