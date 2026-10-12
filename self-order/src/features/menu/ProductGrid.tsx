import { Ref, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, PixelRatio, View } from 'react-native';
import { FlashList, FlashListRef, ViewToken } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { cn } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/src/features/cart/cartStore';
import { QuizBanner } from '@/src/features/quiz/QuizBanner';
import { IMenuProduct } from '@/src/types';
import { CDN_SIZE } from '@/src/lib/image';
import { isConfigurable } from '@/src/lib/menu';
import { Text } from '@/src/ui/Text';
import { ProductCard } from './ProductCard';
import { SubcategoryChips } from './SubcategoryChips';
import { GridRow } from './useMenu';

export type ProductGridHandle = {
  /** Smoothly scrolls so that row is at the top, e.g. a category's title */
  scrollToRow: (index: number) => void;
};

type Props = {
  ref?: Ref<ProductGridHandle>;
  /** The grid's width in dp, known up front so a width change re-lays out once, not twice */
  width: number;
  rows: GridRow[];
  orderable: boolean;
  hidePrice?: boolean;
  onOpenProduct: (product: IMenuProduct) => void;
  /** The row now at the top of the grid (the last row once the end is reached) */
  onTopRowChange?: (row: GridRow) => void;
  /** The guest started dragging the list */
  onUserScroll?: () => void;
  /** The category and subcategory at the top, for highlighting its subcategory button */
  activeCategoryId?: string;
  activeSubcategoryId: string | null;
  /** A subcategory button was tapped */
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void;
};

// Cards are at least this wide; the grid fits as many columns as the space allows (3 at 1280dp:
// big photos and big buttons, easy to tap)
const MIN_CARD_WIDTH = 300;
const PADDING = 16;
// The space around each card (p-2 on both sides)
const CARD_GAP = 16;
// Width of the CDN's small image
const SM_IMAGE_WIDTH = 400;
// A row counts as on screen once half of it shows
const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

export const ProductGrid = ({
  ref,
  width,
  rows,
  orderable,
  hidePrice,
  onOpenProduct,
  onTopRowChange,
  onUserScroll,
  activeCategoryId,
  activeSubcategoryId,
  onSelectSubcategory,
}: Props) => {
  const { t } = useTranslation('language');
  const columns = Math.max(2, Math.floor((width - PADDING * 2) / MIN_CARD_WIDTH));
  const items = useCartStore((s) => s.items);
  const setProductQuantity = useCartStore((s) => s.setProductQuantity);
  const listRef = useRef<FlashListRef<GridRow>>(null);

  // Straight there: an animated scroll draws every card on the way, which lagged on long menus
  useImperativeHandle(ref, () => ({
    scrollToRow: (index) => listRef.current?.scrollToIndex({ index, animated: false }),
  }));

  // Photos the size the cards are drawn at: the 800 px ones only on screens that need them
  const cardWidth = (width - PADDING * 2) / columns - CARD_GAP;
  const imageSize: CDN_SIZE = PixelRatio.getPixelSizeForLayoutSize(cardWidth) > SM_IMAGE_WIDTH * 1.1 ? 'md' : 'sm';

  // Quantity shown on each card: the product's first non-gift line (the one setProductQuantity changes)
  const quantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      if (item.productId && !item.giftToTableId && map[item.productId] === undefined)
        map[item.productId] = item.quantity;
    }
    return map;
  }, [items]);

  const add = useCallback(
    (product: IMenuProduct) => {
      if (isConfigurable(product)) return onOpenProduct(product);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setProductQuantity(product, 1);
    },
    [onOpenProduct, setProductQuantity],
  );

  // Which row is at the top. At the very end the last rows can't reach the top, so the last
  // row counts as current once the list can't scroll further.
  const topRow = useRef<GridRow | null>(null);
  const atEnd = useRef(false);
  const report = useRef(() => {});
  report.current = () => {
    const row = atEnd.current ? rows.at(-1) : topRow.current;
    if (row) onTopRowChange?.(row);
  };
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<GridRow>[] }) => {
    const first = viewableItems.reduce<ViewToken<GridRow> | null>(
      (top, token) => (token.index !== null && (top?.index == null || token.index < top.index) ? token : top),
      null,
    );
    if (!first?.item) return;
    topRow.current = first.item;
    report.current();
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const end = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
    if (end === atEnd.current) return;
    atEnd.current = end;
    report.current();
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: GridRow; index: number }) =>
      item.type === 'quiz' ? (
        <View className="px-2 pb-2">
          <QuizBanner />
        </View>
      ) : item.type === 'section' ? (
        <View className={cn('gap-3 px-2 pb-2', index === 0 ? 'pt-1' : index === 1 ? 'pt-3' : 'pt-9')}>
          <Text className="text-3xl font-bold tracking-tight" numberOfLines={1}>
            {item.title}
          </Text>
          {item.subcategories.length > 0 && (
            <SubcategoryChips
              subcategories={item.subcategories}
              activeId={item.categoryId === activeCategoryId ? activeSubcategoryId : null}
              onSelect={(subcategoryId) => onSelectSubcategory(item.categoryId, subcategoryId)}
            />
          )}
        </View>
      ) : item.type === 'subsection' ? (
        <Text className="px-2 pb-1 pt-4 text-xl font-semibold" numberOfLines={1}>
          {item.title}
        </Text>
      ) : (
        <View className="flex-1 p-2">
          <ProductCard
            product={item.product}
            quantity={quantities[item.product.productId] ?? 0}
            orderable={orderable}
            hidePrice={hidePrice}
            imageSize={imageSize}
            onOpen={onOpenProduct}
            onAdd={add}
            onQuantityChange={setProductQuantity}
          />
        </View>
      ),
    [
      quantities,
      orderable,
      hidePrice,
      imageSize,
      onOpenProduct,
      add,
      setProductQuantity,
      activeCategoryId,
      activeSubcategoryId,
      onSelectSubcategory,
    ],
  );
  // Redraw rows when a card's quantity or the highlighted subcategory changes
  const extraData = useMemo(
    () => ({ quantities, activeCategoryId, activeSubcategoryId }),
    [quantities, activeCategoryId, activeSubcategoryId],
  );

  return (
    <View className="flex-1">
      <FlashList
        ref={listRef}
        data={rows}
        numColumns={columns}
        renderItem={renderItem}
        extraData={extraData}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.type}
        overrideItemLayout={(layout, row) => {
          if (row.type !== 'product') layout.span = columns;
        }}
        viewabilityConfig={VIEWABILITY}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onScrollBeginDrag={onUserScroll}
        // Space below the top bar for the first row (the quiz banner or the first category's title), and
        // at the end room for the order bar along the bottom
        contentContainerStyle={{ paddingHorizontal: PADDING, paddingTop: 16, paddingBottom: 128 }}
        ListEmptyComponent={<Text className="mt-16 text-center text-lg text-muted">{t('mainPage.noResults')}</Text>}
      />
    </View>
  );
};
