import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Text,
  SectionList,
  InteractionManager,
  Platform,
} from 'react-native';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { IMenuCategory, IMenuProduct, IOrderItem, IParticipant, ICustomerOrder } from '@/types';
import { isEmpty } from 'lodash';
import ProductCard from '@/components/Card/ProductCard';
import { emptyOrder } from '@/constants';
import OrderFloatingButton from '@/components/FloatingButton/OrderFloatingButton';
import { useTranslation } from 'react-i18next';
import { useOrder } from '@/providers/OrderProvider';
import { generateUUID } from '@/utils';
import { useQuery } from '@apollo/client';
import { GET_ORDERS } from '@/graphql/query';
import i18n from '@/utils/i18n';
import OpacityLoader from '@/components/Loader/OpacityLoader';

interface ProductCardProps {
  product: IMenuProduct;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
  drawerVisible: boolean;
  orderItem?: IOrderItem;
  languageKey?: string; // Add a language key prop to force re-renders on language change
}

interface CategorySectionProps {
  category: IMenuCategory;
  onLayout: (event: any) => void;
  orderItems: IOrderItem[];
  drawerVisible: boolean;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
}

interface ContainerProps {
  participant: IParticipant;
}

// Memoized product card component
const MemoizedProductCard = memo(
  ({ product, onQuantityChange, drawerVisible, orderItem, languageKey }: ProductCardProps) => (
    <ProductCard
      onQuantityChange={onQuantityChange}
      drawerVisible={drawerVisible}
      orderItem={orderItem}
      product={product}
      languageKey={languageKey}
    />
  ),
  (prevProps: ProductCardProps, nextProps: ProductCardProps) => {
    // Force re-render if language changes
    if (prevProps.languageKey !== nextProps.languageKey) {
      return false;
    }

    // Force re-render if product name or description changes
    if (
      prevProps.product.name !== nextProps.product.name ||
      prevProps.product.description !== nextProps.product.description
    ) {
      return false;
    }

    // Only re-render if these props change
    return (
      prevProps.drawerVisible === nextProps.drawerVisible &&
      prevProps.product.id === nextProps.product.id &&
      prevProps.orderItem?.quantity === nextProps.orderItem?.quantity
    );
  },
);

// Main container content component
const ContainerContent: React.FC<ContainerProps> = ({ participant }) => {
  // Hooks and state
  const { i18n } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const { data } = useQuery(GET_ORDERS);
  const { orderState, setOrderState } = useOrder();
  const sectionLayouts = useRef<Record<string, number>>({});
  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [collapsedMenu, setCollapsedMenu] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Ref to track the source of the activeIndex change
  const activeIndexSource = useRef<'scroll' | 'click' | null>(null);
  // Timestamp to track when the last manual selection happened
  const lastClickTime = useRef<number>(0);
  // Lock period after a manual selection (ms)
  const CLICK_LOCK_PERIOD = 800;

  const [showDraw, setShowDraw] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const pendingUpdates = useRef<Record<string, number>>({});
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter categories efficiently
  const filterCategories = useCallback((menu: any): IMenuCategory[] => {
    if (!menu || !menu.categories) return [];

    return menu.categories.filter((category: IMenuCategory) => {
      const hasActiveProducts = category.products?.some((p) => p.state === 'ACTIVE') || false;
      const hasActiveChildren =
        category.children?.some((child: IMenuCategory) => child.products?.some((p) => p.state === 'ACTIVE') || false) ||
        false;

      return hasActiveProducts || hasActiveChildren;
    });
  }, []);

  // Simplified menu processing - no client-side translation
  useEffect(() => {
    if (!participant || isEmpty(participant.menu)) return;

    try {
      const filtered = filterCategories(participant.menu);
      setCategories(filtered);
    } catch (error) {
      console.error('Error processing menu:', error);
      setCategories([]);
    }
  }, [participant, i18n.language, filterCategories, refreshTrigger]);

  // Clean up any pending timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
    };
  }, []);

  // Refresh language callback - triggers menu re-processing
  const refreshLanguage = useCallback(() => {
    setLoading(true);
    // Small delay to ensure participant data is updated
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
      setLoading(false);
    }, 500);
  }, []);

  // NEW APPROACH: Scroll to category implementation
  // const scrollToCategory = useCallback(
  //   (index: number) => {
  //     // Mark that this activeIndex change comes from a click
  //     activeIndexSource.current = 'click';
  //     // Update timestamp to block scroll events
  //     lastClickTime.current = Date.now();

  //     // Update the active index immediately
  //     setActiveIndex(index);

  //     // Scroll to the category
  //     const catId = categories[index]?.id;
  //     const y = sectionLayouts.current[catId];

  //     if (typeof y === 'number') {
  //       // Disable onScroll temporarily while we perform programmatic scrolling
  //       scrollRef.current?.scrollTo({ y, animated: true });
  //     }
  //   },
  //   [categories],
  // );

  const onQuantityChange = useCallback(
    (product: IMenuProduct, quantity: number) => {
      // Track pending update
      pendingUpdates.current[product.productId] = quantity;

      // Clear existing timeout to batch updates
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }

      // Process batched updates
      updateTimeout.current = setTimeout(() => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {};

        setOrderState((prev?: ICustomerOrder) => {
          if (!prev) return emptyOrder;

          // Clone order items array
          const newItems = [...prev.items];
          let totalAmount = 0;
          let totalQuantity = 0;

          // Process all updates in one batch
          Object.entries(updates).forEach(([productId, quantity]) => {
            const existingIndex = newItems.findIndex((item) => item.productId === productId);

            if (quantity > 0) {
              // Find product info
              const product = categories
                .flatMap((cat) => [
                  ...(cat.products ?? []),
                  ...(cat.children ?? []).flatMap((c: any) => c.products ?? []),
                ])
                .find((p) => p.productId === productId);

              if (!product || !product.variants?.length) return;

              const variant = product.variants[0];

              // Create or update item
              const item: IOrderItem = {
                id: variant.id,
                uuid: existingIndex >= 0 ? newItems[existingIndex].uuid : generateUUID(),
                productId: product.productId,
                name: variant.name,
                reason: '',
                state: 'DRAFT',
                quantity,
                options: isEmpty(variant.options) ? [] : variant.options,
                price: variant.salePrice,
                discount: 0,
                image: product.image ?? '',
              };

              if (existingIndex >= 0) {
                newItems[existingIndex] = item;
              } else {
                newItems.push(item);
              }
            } else if (existingIndex >= 0) {
              // Remove item if quantity is zero
              newItems.splice(existingIndex, 1);
            }
          });

          // Calculate totals in one pass
          for (const item of newItems) {
            const optionTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) ?? 0;
            totalAmount += (item.price + optionTotal) * item.quantity;
            totalQuantity += item.quantity;
          }

          return {
            ...prev,
            items: newItems,
            totalAmount,
            grandTotal: totalAmount,
            totalQuantity,
          };
        });
      }, 150);
    },
    [categories, setOrderState],
  );

  // Initialize empty order if needed
  useEffect(() => {
    if (isEmpty(orderState)) {
      setOrderState(emptyOrder);
    }
  }, [orderState, setOrderState]);

  // NEW APPROACH: Scroll handler with time-based lockout
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Check if we're within the lock period after a manual selection
      const now = Date.now();
      if (now - lastClickTime.current < CLICK_LOCK_PERIOD) {
        // We're in the lock period after a click, don't process scroll events
        return;
      }

      const scrollY = event.nativeEvent.contentOffset.y;

      // Find visible category with binary search
      const layoutEntries = Object.entries(sectionLayouts.current).sort((a, b) => Number(a[1]) - Number(b[1]));

      if (layoutEntries.length === 0) return;

      let low = 0;
      let high = layoutEntries.length - 1;
      let result = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (layoutEntries[mid][1] <= scrollY + 100) {
          result = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      // Only update if different from current index
      if (result !== activeIndex) {
        // Mark that this change comes from scroll
        activeIndexSource.current = 'scroll';
        setActiveIndex(result);
      }
    },
    [activeIndex],
  );

  // Memoize categories to prevent unnecessary re-renders
  // const memoizedCategories = useMemo(() => categories, [categories]);

  const chunkIntoRows = <T,>(arr: T[], size = 2): T[][] => {
    const rows: T[][] = [];
    for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
    return rows;
  };

  type MenuSection = {
    key: string;
    title: string;
    parentCategoryId: string;
    isParent?: boolean;
    data: IMenuProduct[][];
    subId: string | null;
  };

  const listRef = useRef<SectionList<IMenuProduct[]>>(null);
  const pendingTargetIdxRef = useRef<number | null>(null);

  const [sections, setSections] = useState<MenuSection[]>([]);

  const [contentWidth, setContentWidth] = useState(0);

  const H_PADDING = 24; // page left/right padding
  const GAP = 16; // space between cards in a row
  const NUM_COLS = 3;

  useEffect(() => {
    const mk: MenuSection[] = [];
    categories.forEach((cat) => {
      const parent = cat.products ?? [];
      if (parent.length) {
        mk.push({
          key: `parent-${cat.id}`,
          title: cat.name,
          parentCategoryId: cat.id,
          isParent: true,
          subId: null,
          data: chunkIntoRows(parent, NUM_COLS), // <— use numCols
        });
      }
      (cat.children ?? []).forEach((sub: any) => {
        const prods = sub.products ?? [];
        if (prods.length) {
          mk.push({
            key: `child-${sub.id}`,
            title: sub.name,
            parentCategoryId: cat.id,
            subId: sub.id,
            data: chunkIntoRows(prods, NUM_COLS), // <— use numCols
          });
        }
      });
    });
    setSections(mk);
  }, [categories, NUM_COLS]);

  const categoryIdToFirstSectionIndex = useMemo(() => {
    const m = new Map<string, number>();
    sections.forEach((s, i) => {
      if (!m.has(s.parentCategoryId)) m.set(s.parentCategoryId, i);
    });
    return m;
  }, [sections]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ section?: any; index: number | null }> }) => {
      if (!viewableItems?.length) return;

      const first = viewableItems[0];
      const s: MenuSection | undefined = first.section;
      if (!s) return;

      // update parent category
      const parentIdx = categories.findIndex((c) => c.id === s.parentCategoryId);
      if (parentIdx >= 0 && parentIdx !== activeIndex) {
        setActiveIndex(parentIdx);
      }

      // if we’re inside the current parent, update sub highlight
      if (parentIdx === activeIndex) {
        setActiveSubId(s.subId ?? null);
      }
    },
    [categories, activeIndex],
  );

  const subTabs = useMemo(() => {
    const parent = categories[activeIndex];
    if (!parent) return [];
    const tabs: { id: string | null; label: string }[] = [];

    // include parent’s own products if any
    if ((parent.products?.length ?? 0) > 0) {
      tabs.push({ id: null, label: parent.name });
    }

    (parent.children ?? []).forEach((child: any) => {
      if ((child.products?.length ?? 0) > 0) {
        tabs.push({ id: child.id, label: child.name });
      }
    });
    return tabs;
  }, [categories, activeIndex]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 5,
    minimumViewTime: 50,
  }).current;

  const lastTargetSectionRef = useRef<number | null>(null);

  const safeScrollToLocation = (sectionIndex: number) => {
    lastTargetSectionRef.current = sectionIndex; // remember target
    const doScroll = () =>
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0,
        animated: true,
      });

    InteractionManager.runAfterInteractions(() => {
      doScroll();
      setTimeout(doScroll, 120);
    });
  };

  const onIndexFailed = useCallback(() => {
    // wait a moment for more items to measure, then retry the last target section
    setTimeout(() => {
      const sec = lastTargetSectionRef.current ?? 0;
      listRef.current?.scrollToLocation({
        sectionIndex: sec,
        itemIndex: 0,
        viewPosition: 0,
        animated: true,
      });
    }, 150);
  }, []);

  const scrollToCategory = useCallback(
    (idx: number) => {
      const cat = categories[idx];
      if (!cat) return;
      const secIndex = categoryIdToFirstSectionIndex.get(cat.id);
      if (secIndex == null) return;
      setActiveIndex(idx);
      safeScrollToLocation(secIndex);
    },
    [categories, categoryIdToFirstSectionIndex],
  );

  const scrollToSub = useCallback(
    (subId: string | null) => {
      const parent = categories[activeIndex];
      if (!parent) return;
      const targetSecIndex = sections.findIndex((s) => s.parentCategoryId === parent.id && s.subId === subId);
      if (targetSecIndex < 0) return;
      setActiveSubId(subId);
      safeScrollToLocation(targetSecIndex);
    },
    [sections, categories, activeIndex],
  );

  const orderItemsMap = useMemo(() => {
    const m: Record<string, IOrderItem> = {};
    (orderState?.items ?? []).forEach((it) => {
      if (it.productId) m[it.productId] = it;
    });
    return m;
  }, [orderState?.items]);

  // renderRow: no contentWidth math needed
  const renderRow = useCallback(
    ({ item: row }: { item: IMenuProduct[] }) => {
      return (
        <View style={styles.gridRow}>
          {row.map((p) => (
            <View key={p.productId || p.id} style={styles.gridCell}>
              <MemoizedProductCard
                onQuantityChange={onQuantityChange}
                drawerVisible={showDraw}
                orderItem={orderItemsMap[p.productId]}
                product={p}
                languageKey={i18n.language}
              />
            </View>
          ))}
        </View>
      );
    },
    [onQuantityChange, showDraw, orderItemsMap, i18n.language],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: MenuSection }) => (
      <View style={{ paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 }}>
        <Text style={{ fontSize: section.isParent ? 18 : 16, fontWeight: section.isParent ? '700' : '600' }}>
          {section.title}
        </Text>
      </View>
    ),
    [],
  );

  // ---- add a robust onScrollToIndexFailed handler ----
  const handleScrollToIndexFailed = useCallback(
    (info: { highestMeasuredFrameIndex: number; averageItemLength: number; index: number }) => {
      // Scroll a bit closer, then retry
      setTimeout(() => {
        listRef.current?.scrollToLocation({
          sectionIndex: info.index,
          itemIndex: 0,
          viewPosition: 0,
          animated: true,
        });
      }, 250);
    },
    [],
  );

  return (
    <View style={styles.container}>
      <OpacityLoader visible={loading} opacity={0.7} />
      {!collapsedMenu && <Sidebar categories={categories} activeIndex={activeIndex} onSelect={scrollToCategory} />}
      <View style={styles.content} onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
        <Header
          collapsedMenu={collapsedMenu}
          setCollapsedMenu={setCollapsedMenu}
          categories={categories}
          activeIndex={activeIndex}
          refreshLanguage={refreshLanguage}
        />
        {subTabs.length > 1 && (
          <View style={styles.subTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsRow}>
              {subTabs.map((t) => {
                const active = activeSubId === t.id;
                return (
                  <Text
                    key={t.id ?? 'parent'}
                    onPress={() => scrollToSub(t.id)}
                    style={[styles.subTab, active && styles.subTabActive]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                );
              })}
            </ScrollView>
          </View>
        )}
        <SectionList
          ref={listRef}
          sections={sections}
          extraData={{ activeIndex, activeSubId }}
          keyExtractor={(_, idx) => `row-${idx}`}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentContainerStyle={{ paddingBottom: 100, marginTop: 4, paddingHorizontal: 24 }}
          onScrollToIndexFailed={onIndexFailed}
        />
      </View>

      {orderState && <OrderFloatingButton drawStore={setShowDraw} order={orderState} />}
    </View>
  );
};

// Wrap with memo for performance
const Container = memo(ContainerContent);

const NUM_COLS = 3;
const GAP = 16;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  itemContent: {
    alignItems: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GAP / 2, // to simulate gap
    marginBottom: GAP,
  },
  gridCell: {
    paddingHorizontal: GAP / 2,
    width: `${100 / NUM_COLS}%`, // <= no contentWidth dependency
  },
  subTabsContainer: {
    paddingHorizontal: 26,
    paddingTop: 2,
    paddingBottom: 10,
  },
  subTabsRow: {
    gap: 8,
  },
  subTab: {
    paddingVertical: 20,
    paddingHorizontal: 34,
    borderRadius: 999,
    backgroundColor: '#F1F2F6',
    color: '#444',
    fontWeight: '700',
    overflow: 'hidden',
    fontSize: 15,
  },
  subTabActive: {
    backgroundColor: '#ffd54f',
    color: '#222',
  },
});

export default Container;
