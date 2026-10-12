import { useMemo } from 'react';
import { View } from 'react-native';
import { useQuery } from '@apollo/client';
import * as Haptics from 'expo-haptics';
import { Button, useThemeColor } from 'heroui-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/src/features/cart/cartStore';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { GET_CROSS_SELLS } from '@/src/graphql/queries';
import { formatMoney } from '@/src/lib/format';
import { getCdnImageUrl } from '@/src/lib/image';
import { indexProducts, isConfigurable, isUnavailable } from '@/src/lib/menu';
import { IMenuProduct } from '@/src/types';
import { Image } from '@/src/ui/Image';
import { Text } from '@/src/ui/Text';

/**
 * On a product's screen: up to two things that go with it (the restaurant's own pairings), each
 * added with one tap. Here, while the guest is choosing, because that's when a suggestion helps;
 * never in the cart, at checkout or as a pop-up. Only simple dishes that can be ordered now.
 */
export const Pairings = ({ product }: { product: IMenuProduct }) => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const menuId = useSessionStore((s) => s.participant?.menu?.id);
  const categories = useSessionStore((s) => s.participant?.menu?.categories);
  const hidePrice = useSessionStore((s) => s.config?.hidePrice === true);
  const menu = useMemo(() => indexProducts(categories), [categories]);
  const items = useCartStore((s) => s.items);
  const setProductQuantity = useCartStore((s) => s.setProductQuantity);

  const { data } = useQuery(GET_CROSS_SELLS, {
    variables: { menuId, ids: [product.productId] },
    skip: !menuId,
  });
  // The menu's own copy of each: its current price, and whether it can be ordered now
  const pairings = ((data?.getCrossSells ?? []) as IMenuProduct[])
    .map((suggested) => menu.get(suggested.productId))
    .filter(
      (p): p is IMenuProduct =>
        !!p && p.productId !== product.productId && !isUnavailable(p) && !isConfigurable(p),
    )
    .slice(0, 2);

  if (!pairings.length) return null;

  // One more on its cart line (the one its card's stepper shows), or a new line
  const add = (pairing: IMenuProduct) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const line = items.find((item) => item.id === pairing.variants?.[0]?.id && !item.giftToTableId);
    setProductQuantity(pairing, (line?.quantity ?? 0) + 1);
  };

  return (
    <View className="gap-2.5">
      <Text className="text-lg font-bold">{t('mainPage.pairings')}</Text>
      <View className="flex-row gap-2.5">
        {pairings.map((pairing) => {
          const inCart = items.find((item) => item.id === pairing.variants?.[0]?.id && !item.giftToTableId)?.quantity;
          return (
            <View key={pairing.productId} className="flex-1 flex-row items-center gap-3 rounded-[18px] border border-border p-2">
              <Image
                source={pairing.image ? { uri: getCdnImageUrl(pairing.image, 'sm') } : require('@/assets/images/noImage.jpg')}
                className="size-13 rounded-[14px] bg-surface-tertiary"
                contentFit="cover"
              />
              <View className="min-w-0 flex-1">
                <Text className="font-semibold" numberOfLines={1}>
                  {pairing.name}
                </Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {hidePrice ? '' : formatMoney(pairing.variants?.[0]?.salePrice ?? 0)}
                  {inCart ? ` · ${inCart} ×` : ''}
                </Text>
              </View>
              <Button
                isIconOnly
                className="size-11 rounded-full"
                onPress={() => add(pairing)}
                accessibilityLabel={t('mainPage.add')}
              >
                <Plus size={18} color={accentForeground} strokeWidth={2.4} />
              </Button>
            </View>
          );
        })}
      </View>
    </View>
  );
};
