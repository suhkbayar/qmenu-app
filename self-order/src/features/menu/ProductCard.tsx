import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatMoney } from '@/src/lib/format';
import { CDN_SIZE, getCdnImageUrl } from '@/src/lib/image';
import { isSoldOut, isUnavailable } from '@/src/lib/menu';
import { IMenuProduct } from '@/src/types';
import { Image } from '@/src/ui/Image';

// Line height of the name, which always takes two lines
const NAME_LINE = 25;
/**
 * Height of everything under the photo: padding (12 + 14), two lines of name (50) and the bottom
 * row (52), plus room between them. The list adds this to the photo to know each row's height.
 */
export const CARD_INFO_HEIGHT = 136;

/**
 * The photo's width to height. 16:10, wide and low, so three cards across stay about as tall as four
 * at 4:3 were. The list works out each row's height from it.
 */
export const PHOTO_RATIO = 16 / 10;

const NO_IMAGE = require('@/assets/images/noImage.jpg');
// The photo grows with the card
const PHOTO = { aspectRatio: PHOTO_RATIO };
const NAME = { lineHeight: NAME_LINE, height: NAME_LINE * 2 };
// Android's own touch ripple, drawn natively over the photo or button
const RIPPLE = { color: 'rgba(0,0,0,0.12)', foreground: true };

/** The card's words in the guest's language, looked up once by the list for all of its cards */
export type CardLabels = { soldOut: string; add: string; decrease: string; increase: string };

type Props = {
  product: IMenuProduct;
  /** Quantity of this product's line in the cart (simple products only) */
  quantity: number;
  /** false when the table can only browse the menu */
  orderable: boolean;
  hidePrice?: boolean;
  /** The CDN size that matches the card's width on this screen */
  imageSize: CDN_SIZE;
  labels: CardLabels;
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

/**
 * A dish in the menu: photo, name, price and +, or − n + once it's in the cart. React Native's own
 * views with classes, and the words handed in by the list: it draws dozens of these while the guest
 * scrolls, so a card has no animations, icons or hooks of its own to set up.
 */
export const ProductCard = memo(
  ({ product, quantity, orderable, hidePrice, imageSize, labels, onOpen, onAdd, onQuantityChange }: Props) => {
    // Either way it can't be added; only a sold-out one says Дууссан
    const unavailable = isUnavailable(product);
    const soldOut = isSoldOut(product);

    return (
      // Flat card (a hairline, no shadow): shadows on dozens of cards are costly to draw on Android
      <View className="flex-1 overflow-hidden rounded-[22px] border border-surface-tertiary bg-surface">
        <Pressable
          disabled={unavailable}
          onPress={() => onOpen(product)}
          android_ripple={RIPPLE}
          accessibilityRole="button"
          accessibilityLabel={product.name}
        >
          <Image
            source={product.image ? { uri: getCdnImageUrl(product.image, imageSize) } : NO_IMAGE}
            className="w-full bg-surface-tertiary"
            style={PHOTO}
            contentFit="cover"
            transition={150}
            recyclingKey={product.productId}
          />
          {!!product.bonus && (
            <View className="absolute left-2.5 top-2.5 h-8 justify-center rounded-full bg-accent px-3">
              <Text className="font-bold text-sm text-accent-foreground" numberOfLines={1}>
                {product.bonus}
              </Text>
            </View>
          )}
          {soldOut && (
            <View className="absolute inset-0 items-center justify-center bg-background/75">
              <View className="h-8.5 justify-center rounded-full border border-border bg-surface px-3.5">
                <Text className="font-bold text-sm text-foreground">{labels.soldOut}</Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Just the name, price and +: the description is on the product's own screen. Every card is
            the same height (the list knows each row's height up front): the name always takes two
            lines, and the bottom row is one line. */}
        <View className="flex-1 justify-between px-4 pb-3.5 pt-3">
          <Text className="font-semibold text-[19px] text-foreground" style={NAME} numberOfLines={2}>
            {product.name}
          </Text>
          {/* Keyed, so switching between the stepper and the + draws a new row rather than changing the
              classes of the old one (changed colour classes have come out wrong on the tablets) */}
          {orderable && quantity > 0 && !unavailable ? (
            // In the cart: the whole row is the stepper (a price range beside it wouldn't fit)
            <View key="stepper" className="h-13 flex-row items-center justify-between rounded-full bg-surface-secondary p-1">
              <Pressable
                onPress={() => onQuantityChange(product, quantity - 1)}
                android_ripple={RIPPLE}
                className="size-11 items-center justify-center overflow-hidden rounded-full bg-surface"
                accessibilityRole="button"
                accessibilityLabel={labels.decrease}
              >
                <Mark size={20} color="bg-foreground" />
              </Pressable>
              <Text className="font-bold text-xl text-foreground">{quantity}</Text>
              <Pressable
                onPress={() => onQuantityChange(product, quantity + 1)}
                android_ripple={RIPPLE}
                className="size-11 items-center justify-center overflow-hidden rounded-full bg-accent"
                accessibilityRole="button"
                accessibilityLabel={labels.increase}
              >
                <Mark plus size={20} color="bg-accent-foreground" />
              </Pressable>
            </View>
          ) : (
            <View key="price" className="h-13 flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 font-bold text-xl text-foreground" numberOfLines={1}>
                {hidePrice ? '' : priceLabel(product)}
              </Text>
              {orderable &&
                (unavailable ? (
                  // Unavailable: grey and greyed out rather than the yellow add button
                  <View
                    key="off"
                    className="size-13 items-center justify-center rounded-full bg-surface-secondary opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel={labels.add}
                    accessibilityState={{ disabled: true }}
                  >
                    <Mark plus size={24} color="bg-muted" />
                  </View>
                ) : (
                  <Pressable
                    key="on"
                    onPress={() => onAdd(product)}
                    android_ripple={RIPPLE}
                    className="size-13 items-center justify-center overflow-hidden rounded-full bg-accent"
                    accessibilityRole="button"
                    accessibilityLabel={labels.add}
                  >
                    <Mark plus size={24} color="bg-accent-foreground" />
                  </Pressable>
                ))}
            </View>
          )}
        </View>
      </View>
    );
  },
);

/**
 * + or −: two rounded bars the size of the icon set's, in a background colour class. Cheaper to
 * draw than an SVG icon on every card.
 */
const Mark = ({ plus = false, size, color }: { plus?: boolean; size: number; color: string }) => {
  const length = Math.round(size * 0.68);
  const thickness = size / 10;
  const bar = `absolute rounded-full ${color}`;
  return (
    <View style={{ width: size, height: size }}>
      <View
        className={bar}
        style={{ left: (size - length) / 2, top: (size - thickness) / 2, width: length, height: thickness }}
      />
      {plus && (
        <View
          className={bar}
          style={{ left: (size - thickness) / 2, top: (size - length) / 2, width: thickness, height: length }}
        />
      )}
    </View>
  );
};
