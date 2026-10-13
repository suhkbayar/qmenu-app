import { Ref, memo, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, PixelRatio, Text, View, ViewToken } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/src/features/cart/cartStore';
import { QuizBanner } from '@/src/features/quiz/QuizBanner';
import { CDN_SIZE } from '@/src/lib/image';
import { isConfigurable } from '@/src/lib/menu';
import { IMenuProduct } from '@/src/types';
import { CARD_INFO_HEIGHT, CardLabels, PHOTO_RATIO, ProductCard } from './ProductCard';
import { SubcategoryChips } from './SubcategoryChips';
import { GridRow } from './useMenu';

export type ProductGridHandle = {
  /** Scrolls so that row is at the top, e.g. a category's title */
  scrollToRow: (index: number) => void;
};

type Props = {
  ref?: Ref<ProductGridHandle>;
  /** The grid's width in dp */
  width: number;
  /** Cards to a row; the rows were built with the same number (see gridColumns) */
  columns: number;
  rows: GridRow[];
  orderable: boolean;
  hidePrice?: boolean;
  onOpenProduct: (product: IMenuProduct) => void;
  /** The row now at the top of the grid (the last row once the end is reached) */
  onTopRowChange?: (row: GridRow) => void;
  /** The guest started dragging the list */
  onUserScroll?: () => void;
  /** A subcategory button was tapped */
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void;
};

// Cards are at least this wide; the grid fits as many as the space allows (3 at 1280dp, which
// leaves room for a price range, e.g. a dish with sizes, beside the +)
const MIN_CARD_WIDTH = 300;
const PADDING = 16;
// The space around each card (p-2 on both sides)
const CARD_GAP = 16;
// The card's hairline border, top and bottom
const CARD_BORDER = 2;
// Width of the CDN's small image
const SM_IMAGE_WIDTH = 400;

// Every row's height is fixed and known up front, as in the old app's list: a category tap goes
// straight to where it is, and scrolling never measures anything
const QUIZ_HEIGHT = 104;
const SECTION_HEIGHT = 72;
const SECTION_TABS_HEIGHT = 56;
const SUBSECTION_HEIGHT = 52;
// Room at the end for the order bar along the bottom
const FOOTER_HEIGHT = 128;

// A row counts as on screen once half of it shows
const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

/** How many cards fit across a grid this wide */
export const gridColumns = (width: number) => Math.max(2, Math.floor((width - PADDING * 2) / MIN_CARD_WIDTH));

const heightOf = (row: GridRow, productRowHeight: number) => {
  switch (row.type) {
    case 'products':
      return productRowHeight;
    case 'quiz':
      return QUIZ_HEIGHT;
    case 'subsection':
      return SUBSECTION_HEIGHT;
    case 'section':
      return SECTION_HEIGHT + (row.subcategories.length ? SECTION_TABS_HEIGHT : 0);
  }
};

export const ProductGrid = memo(
  ({
    ref,
    width,
    columns,
    rows,
    orderable,
    hidePrice,
    onOpenProduct,
    onTopRowChange,
    onUserScroll,
    onSelectSubcategory,
  }: Props) => {
    const { t, i18n } = useTranslation('language');
    const items = useCartStore((s) => s.items);
    const setProductQuantity = useCartStore((s) => s.setProductQuantity);
    const listRef = useRef<FlatList<GridRow>>(null);

    // A card's size, and with it a product row's height: the photo's height follows the card's width
    const cardWidth = (width - PADDING * 2) / columns - CARD_GAP;
    const productRowHeight = Math.ceil(cardWidth / PHOTO_RATIO) + CARD_INFO_HEIGHT + CARD_BORDER + CARD_GAP;
    // Photos the size the cards are drawn at: the 800 px ones only on screens that need them
    const imageSize: CDN_SIZE = PixelRatio.getPixelSizeForLayoutSize(cardWidth) > SM_IMAGE_WIDTH * 1.1 ? 'md' : 'sm';

    // Where every row starts, worked out once per menu
    const layout = useMemo(() => {
      let offset = 0;
      return rows.map((row) => {
        const length = heightOf(row, productRowHeight);
        const entry = { length, offset };
        offset += length;
        return entry;
      });
    }, [rows, productRowHeight]);
    const getItemLayout = useCallback(
      (_: unknown, index: number) => ({ ...(layout[index] ?? { length: 0, offset: 0 }), index }),
      [layout],
    );

    // The cards' words, looked up here once rather than in every card
    const labels: CardLabels = useMemo(
      () => ({
        soldOut: t('mainPage.soldOut'),
        add: t('mainPage.add'),
        decrease: t('mainPage.decrease'),
        increase: t('mainPage.increase'),
      }),
      [t, i18n.language],
    );

    useImperativeHandle(ref, () => ({
      scrollToRow: (index) => listRef.current?.scrollToIndex({ index, animated: true }),
    }));

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
    // FlatList wants the same function for its whole life, so it reads everything through refs
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<GridRow>[] }) => {
      const first = viewableItems.reduce<ViewToken<GridRow> | null>(
        (top, token) => (token.index !== null && (top?.index == null || token.index < top.index) ? token : top),
        null,
      );
      if (!first?.item) return;
      topRow.current = first.item;
      report.current();
    }).current;
    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const end = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
      if (end === atEnd.current) return;
      atEnd.current = end;
      report.current();
    }, []);

    // Nothing here depends on where the list is scrolled to, so scrolling never redraws the rows
    const renderItem = useCallback(
      ({ item }: { item: GridRow }) => {
        switch (item.type) {
          case 'quiz':
            return (
              <View className="justify-center px-2" style={{ height: QUIZ_HEIGHT }}>
                <QuizBanner />
              </View>
            );
          case 'section':
            return (
              <View className="justify-end gap-3 px-2 pb-2" style={{ height: heightOf(item, productRowHeight) }}>
                <Text className="font-bold text-3xl tracking-tight text-foreground" numberOfLines={1}>
                  {item.title}
                </Text>
                {/* The highlighted one is in the pinned copy above the list, once this title scrolls away */}
                {item.subcategories.length > 0 && (
                  <SubcategoryChips
                    subcategories={item.subcategories}
                    activeId={null}
                    onSelect={(subcategoryId) => onSelectSubcategory(item.categoryId, subcategoryId)}
                  />
                )}
              </View>
            );
          case 'subsection':
            return (
              <View className="justify-end px-2 pb-1" style={{ height: SUBSECTION_HEIGHT }}>
                <Text className="font-semibold text-xl text-foreground" numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            );
          case 'products':
            return (
              <ProductRow
                products={item.products}
                columns={columns}
                height={productRowHeight}
                quantities={quantities}
                orderable={orderable}
                hidePrice={hidePrice}
                imageSize={imageSize}
                labels={labels}
                onOpen={onOpenProduct}
                onAdd={add}
                onQuantityChange={setProductQuantity}
              />
            );
        }
      },
      [columns, productRowHeight, quantities, orderable, hidePrice, imageSize, labels, onOpenProduct, add, setProductQuantity, onSelectSubcategory],
    );

    return (
      <FlatList
        ref={listRef}
        data={rows}
        renderItem={renderItem}
        keyExtractor={(row) => row.key}
        getItemLayout={getItemLayout}
        extraData={quantities}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        onScroll={onScroll}
        scrollEventThrottle={100}
        onScrollBeginDrag={onUserScroll}
        // As the old app's list: only what's near the screen is kept drawn
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: PADDING }}
        ListFooterComponent={<View style={{ height: FOOTER_HEIGHT }} />}
        ListEmptyComponent={
          <Text className="mt-16 text-center font-normal text-lg text-muted">{t('mainPage.noResults')}</Text>
        }
      />
    );
  },
);

type RowProps = {
  products: IMenuProduct[];
  columns: number;
  height: number;
  quantities: Record<string, number>;
  orderable: boolean;
  hidePrice?: boolean;
  imageSize: CDN_SIZE;
  labels: CardLabels;
  onOpen: (product: IMenuProduct) => void;
  onAdd: (product: IMenuProduct) => void;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
};

/**
 * One row of cards, a fixed height. Adding a dish to the cart redraws only the row it's in: the
 * rest compare equal (same dishes, same quantities) and are skipped.
 */
const ProductRow = memo(
  ({ products, columns, height, quantities, orderable, hidePrice, imageSize, labels, onOpen, onAdd, onQuantityChange }: RowProps) => {
    const cell = { width: `${100 / columns}%` as const };
    return (
      <View className="flex-row" style={{ height }}>
        {products.map((product) => (
          <View key={product.productId} className="p-2" style={cell}>
            <ProductCard
              product={product}
              quantity={quantities[product.productId] ?? 0}
              orderable={orderable}
              hidePrice={hidePrice}
              imageSize={imageSize}
              labels={labels}
              onOpen={onOpen}
              onAdd={onAdd}
              onQuantityChange={onQuantityChange}
            />
          </View>
        ))}
      </View>
    );
  },
  (prev, next) =>
    prev.products === next.products &&
    prev.columns === next.columns &&
    prev.height === next.height &&
    prev.orderable === next.orderable &&
    prev.hidePrice === next.hidePrice &&
    prev.imageSize === next.imageSize &&
    prev.labels === next.labels &&
    prev.onOpen === next.onOpen &&
    prev.onAdd === next.onAdd &&
    prev.onQuantityChange === next.onQuantityChange &&
    prev.products.every((product) => prev.quantities[product.productId] === next.quantities[product.productId]),
);
