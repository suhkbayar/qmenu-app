import { useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { Button, useThemeColor } from 'heroui-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { indexProducts, isConfigurable, isUnavailable } from '@/src/lib/menu';
import { IMenuProduct, IOrderItem } from '@/src/types';
import { useCartStore } from './cartStore';

/**
 * Ordering a dish again straight from an order (another round of beers) instead of finding it on the
 * menu. A simple dish goes into the cart; one with choices (variants, options) opens its product
 * screen. Only what's still on the menu, and not switched off or sold out, can go in again.
 */
export const useAddAgain = (onOpenProduct: (product: IMenuProduct) => void) => {
  const orderable = useSessionStore((s) => s.participant?.orderable === true);
  const categories = useSessionStore((s) => s.participant?.menu?.categories);
  const products = useMemo(() => indexProducts(categories), [categories]);
  // Ordered items name their product: a fallback for servers that don't send its id yet, used only
  // when no other product on the menu has the same name
  const byName = useMemo(() => {
    const names = new Map<string, IMenuProduct | null>();
    for (const product of products.values()) names.set(product.name, names.has(product.name) ? null : product);
    return names;
  }, [products]);

  /** The menu product an ordered item can be added again as; undefined when it can't */
  const productOf = (item: IOrderItem) => {
    if (!orderable) return undefined;
    const product = item.productId ? products.get(item.productId) : byName.get(item.name);
    return product && !isUnavailable(product) ? product : undefined;
  };

  const addAgain = (product: IMenuProduct) => {
    if (isConfigurable(product)) return onOpenProduct(product);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // One more on the product's cart line (the one its card's stepper shows), or a new line
    const { items, setProductQuantity } = useCartStore.getState();
    const line = items.find((item) => item.id === product.variants?.[0]?.id && !item.giftToTableId);
    setProductQuantity(product, (line?.quantity ?? 0) + 1);
  };

  return { productOf, addAgain };
};

/** The [+] beside an ordered item: the same yellow add button as on the menu's cards. */
export const AddAgainButton = ({ onPress }: { onPress: () => void }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  return (
    <Button isIconOnly className="size-10 rounded-full" onPress={onPress} accessibilityLabel={t('mainPage.addAgain')}>
      <Plus size={18} color={accentForeground} strokeWidth={2.4} />
    </Button>
  );
};
