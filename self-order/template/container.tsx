import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { ScrollView, View, StyleSheet, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { IMenuCategory, IMenuProduct, IOrderItem, IParticipant, ICustomerOrder } from '@/types';
import { isEmpty } from 'lodash';
import ProductCard from '@/components/Card/ProductCard';
import { emptyOrder } from '@/constants';
import OrderFloatingButton from '@/components/FloatingButton/OrderFloatingButton';
import { fetchBatchTranslations } from '@/tools';
import { useTranslation } from 'react-i18next';
import { useOrder } from '@/providers/OrderProvider';
import { generateUUID } from '@/utils';
import { useQuery } from '@apollo/client';
import { GET_ORDERS } from '@/graphql/query';
import i18n from '@/utils/i18n';
import OpacityLoader from '@/components/Loader/OpacityLoader';

// Define interfaces for component props
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

// Optimized category section component
const CategorySection = memo(
  ({ category, onLayout, orderItems, drawerVisible, onQuantityChange }: CategorySectionProps) => {
    // Create a lookup map for order items for faster access
    const orderItemsMap = useMemo(() => {
      const map: Record<string, IOrderItem> = {};
      orderItems.forEach((item) => {
        if (item.productId) map[item.productId] = item;
      });
      return map;
    }, [orderItems]);

    const currentLanguage = i18n.language;

    return (
      <View key={category.id} onLayout={onLayout} style={{ marginBottom: 32 }}>
        <FlatList
          data={category.products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemoizedProductCard
              onQuantityChange={onQuantityChange}
              drawerVisible={drawerVisible}
              orderItem={orderItemsMap[item.productId]}
              product={item}
              languageKey={currentLanguage}
            />
          )}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'center', alignSelf: 'flex-start' }}
          scrollEnabled={false}
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          windowSize={3}
        />
      </View>
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
  const isTranslating = useRef<boolean>(false);

  const [showDraw, setShowDraw] = useState(false);

  const [loading, setLoading] = useState<boolean>(false);

  const pendingUpdates = useRef<Record<string, number>>({});
  const updateTimeout = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);

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

  useEffect(() => {
    if (!participant || isEmpty(participant.menu) || isTranslating.current) return;

    const processMenu = async () => {
      try {
        isTranslating.current = true;
        const filtered = filterCategories(participant.menu);

        // Skip translation if source language or no categories
        if (i18n.language === 'mn' || filtered.length === 0) {
          setCategories(filtered);
          return;
        }

        // Collect all unique texts to translate (using Set for deduplication)
        const textsSet = new Set<string>();
        filtered.forEach((category: IMenuCategory) => {
          if (category.name) textsSet.add(category.name);
          category.products?.forEach((product: IMenuProduct) => {
            if (product.name) textsSet.add(product.name);
            if (product.description) textsSet.add(product.description);
          });
        });

        // Convert Set to Array
        const textsToTranslate = Array.from(textsSet);

        // Only translate what's needed
        const translations = await fetchBatchTranslations(textsToTranslate);

        // Apply translations efficiently
        const translatedCategories = filtered.map((category: IMenuCategory) => ({
          ...category,
          name: translations[category.name] || category.name,
          products: category.products?.map((product: IMenuProduct) => ({
            ...product,
            name: translations[product.name] || product.name,
            description: translations[product.description] || product.description,
          })),
        }));

        setCategories(translatedCategories);
      } catch (error) {
        console.error('Error processing menu:', error);
        // Fallback to untranslated if error
        const filtered = filterCategories(participant.menu);
        setCategories(filtered);
      } finally {
        setLoading(false);
        isTranslating.current = false;
      }
    };

    processMenu();
  }, [participant, i18n.language, filterCategories]);

  // Scroll to category implementation
  const scrollToCategory = useCallback(
    (index: number) => {
      const catId = categories[index]?.id;
      const y = sectionLayouts.current[catId];
      if (typeof y === 'number') {
        scrollRef.current?.scrollTo({ y, animated: true });
        setActiveIndex(index);
      }
    },
    [categories],
  );

  // Optimize quantity changes with efficient batching
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
              const product = categories.flatMap((cat) => cat.products || []).find((p) => p.productId === productId);

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

  // Efficient scroll handling with throttling
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 50) return;

    lastScrollTime.current = now;
    const scrollY = event.nativeEvent.contentOffset.y;

    // Find visible category with binary search
    const layoutEntries = Object.entries(sectionLayouts.current).sort((a, b) => Number(a[1]) - Number(b[1]));

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

    setActiveIndex(result);
  }, []);

  // Create category layout handler
  const createLayoutHandler = useCallback((categoryId: string) => {
    return (event: any) => {
      sectionLayouts.current[categoryId] = event.nativeEvent.layout.y;
    };
  }, []);

  const refreshLanguage = useCallback(() => {
    setLoading(true);
  }, [setLoading]);

  // Memoize categories to prevent unnecessary re-renders
  const memoizedCategories = useMemo(() => categories, [categories]);

  return (
    <View style={styles.container}>
      <OpacityLoader visible={loading} opacity={0.7} />
      <Sidebar categories={memoizedCategories} activeIndex={activeIndex} onSelect={scrollToCategory} />

      <View style={styles.content}>
        <Header categories={memoizedCategories} activeIndex={activeIndex} refreshLanguage={refreshLanguage} />

        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={50}
          contentContainerStyle={{ paddingBottom: 100, marginTop: 4, marginLeft: 6 }}
        >
          {memoizedCategories.map((category) => (
            <CategorySection
              key={category.id}
              drawerVisible={showDraw}
              onQuantityChange={onQuantityChange}
              category={category}
              orderItems={orderState?.items ?? []}
              onLayout={createLayoutHandler(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      {orderState && <OrderFloatingButton drawStore={setShowDraw} order={orderState} />}
    </View>
  );
};

// Wrap with memo for performance
const Container = memo(ContainerContent);

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
});

export default Container;
