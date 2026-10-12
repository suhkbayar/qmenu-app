import { memo } from 'react';
import { View } from 'react-native';
import { Button, PressableFeedback, useThemeColor } from 'heroui-native';
import { Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/src/lib/format';
import { isSoldOut, isUnavailable } from '@/src/lib/menu';
import { IMenuProduct } from '@/src/types';
import { CDN_SIZE, getCdnImageUrl } from '@/src/lib/image';
import { Image } from '@/src/ui/Image';
import { Stepper } from '@/src/ui/Stepper';
import { Text } from '@/src/ui/Text';

type Props = {
  product: IMenuProduct;
  /** Quantity of this product's line in the cart (simple products only) */
  quantity: number;
  /** false when the table can only browse the menu */
  orderable: boolean;
  hidePrice?: boolean;
  /** The CDN size that matches the card's width on this screen */
  imageSize: CDN_SIZE;
  onOpen: (product: IMenuProduct) => void;
  onAdd: (product: IMenuProduct) => void;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
};

const priceLabel = (product: IMenuProduct) => {
  const prices = (product.variants ?? []).map((v) => v.salePrice);
  if (!prices.length) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${min.toLocaleString('en-US')} – ${formatMoney(max)}`;
};

export const ProductCard = memo(
  ({ product, quantity, orderable, hidePrice, imageSize, onOpen, onAdd, onQuantityChange }: Props) => {
    const { t } = useTranslation('language');
    const [accentForeground, muted] = useThemeColor(['accent-foreground', 'muted']);
    // Either way it can't be added; only a sold-out one says Дууссан
    const unavailable = isUnavailable(product);
    const soldOut = isSoldOut(product);

    return (
      // Flat card (a hairline, no shadow): shadows on dozens of cards are costly to draw on Android
      <View className="flex-1 overflow-hidden rounded-[22px] border border-surface-tertiary bg-surface">
        <PressableFeedback onPress={() => !unavailable && onOpen(product)} accessibilityLabel={product.name}>
          {/* 4:3, so the photo grows with the card */}
          <Image
            source={
              product.image ? { uri: getCdnImageUrl(product.image, imageSize) } : require('@/assets/images/noImage.jpg')
            }
            className="w-full bg-surface-tertiary"
            style={{ aspectRatio: 4 / 3 }}
            contentFit="cover"
            transition={150}
            recyclingKey={product.productId}
          />
          {!!product.bonus && (
            <View className="absolute left-2.5 top-2.5 h-8 justify-center rounded-full bg-accent px-3">
              <Text className="text-sm font-bold text-accent-foreground" numberOfLines={1}>
                {product.bonus}
              </Text>
            </View>
          )}
          {soldOut && (
            <View className="absolute inset-0 items-center justify-center bg-background/75">
              <View className="h-8.5 justify-center rounded-full border border-border bg-surface px-3.5">
                <Text className="text-sm font-bold">{t('mainPage.soldOut')}</Text>
              </View>
            </View>
          )}
        </PressableFeedback>

        {/* Just the name, price and +: the description is on the product's own screen */}
        <View className="flex-1 gap-1 px-4.5 pb-4 pt-3.5">
          <Text className="text-[19px] font-semibold leading-snug" numberOfLines={2}>
            {product.name}
          </Text>
          {/* On narrow cards the stepper drops below the price rather than cutting it off */}
          <View className="mt-auto flex-row flex-wrap items-center justify-between gap-2 pt-2">
            <Text className="shrink-0 text-xl font-bold">{hidePrice ? '' : priceLabel(product)}</Text>
            {orderable &&
              (quantity > 0 && !unavailable ? (
                <View className="ml-auto">
                  <Stepper
                    quantity={quantity}
                    onIncrease={() => onQuantityChange(product, quantity + 1)}
                    onDecrease={() => onQuantityChange(product, quantity - 1)}
                  />
                </View>
              ) : (
                // Unavailable: grey and greyed out rather than the yellow add button
                <Button
                  isIconOnly
                  isDisabled={unavailable}
                  variant={unavailable ? 'secondary' : 'primary'}
                  className="ml-auto size-13 rounded-full"
                  onPress={() => onAdd(product)}
                  accessibilityLabel={t('mainPage.add')}
                >
                  <Plus size={24} color={unavailable ? muted : accentForeground} strokeWidth={2.4} />
                </Button>
              ))}
          </View>
        </View>
      </View>
    );
  },
);
