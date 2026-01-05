import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { FlatList, ScrollView, View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { IMenuCategory, IMenuProduct, IOrderItem, IParticipant } from '@/types';
import { isEmpty } from 'lodash';
import ProductCard from '@/components/Card/ProductCard';
import { emptyOrder } from '@/constants';
import OrderFloatingButton from '@/components/FloatingButton/OrderFloatingButton';
import { useTranslation } from 'react-i18next';
import { useOrder } from '@/providers/OrderProvider';
import { generateUUID, isCurrentlyOpen } from '@/utils';
import { useQuery } from '@apollo/client';
import { GET_ORDERS } from '@/graphql/query';

interface ContainerProps {
  participant: IParticipant;
}

const NUM_COLS = 3;

const MemoizedProductCard = memo(
  ({ product, orderItem, onQuantityChange, languageKey }: any) => (
    <ProductCard
      product={product}
      orderItem={orderItem}
      onQuantityChange={onQuantityChange}
      drawerVisible={false}
      languageKey={languageKey}
    />
  ),
  (prev, next) =>
    prev.languageKey === next.languageKey &&
    prev.product.id === next.product.id &&
    prev.orderItem?.quantity === next.orderItem?.quantity,
);

const ContainerContent: React.FC<ContainerProps> = ({ participant }) => {
  const { i18n } = useTranslation();
  useQuery(GET_ORDERS);
  const { orderState, setOrderState } = useOrder();

  const [collapsedMenu, setCollapsedMenu] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const listRef = useRef<FlatList<IMenuProduct>>(null);
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdates = useRef<Record<string, number>>({});

  // ✅ Extract categories (memoized once)
  const categories = useMemo<IMenuCategory[]>(() => {
    const menu = participant?.menu;
    if (!menu?.categories?.length) return [];

    return menu.categories
      .filter((cat: IMenuCategory) => isCurrentlyOpen(cat.timetable))
      .map((cat: IMenuCategory) => ({
        ...cat,
        children: cat.children?.filter((c: IMenuCategory) => isCurrentlyOpen(c.timetable)) ?? [],
      }));
  }, [participant?.menu, i18n.language]);

  // ✅ Build category → products map ONCE
  const categoryProductsMap = useMemo(() => {
    const map = new Map<string, IMenuProduct[]>();

    categories.forEach((parent) => {
      // Parent products
      if (parent.products?.length) {
        const activeProducts = parent.products.filter((p) => p.state === 'ACTIVE');
        map.set(parent.id, activeProducts);
      }

      // Child products
      parent.children?.forEach((child: IMenuCategory) => {
        if (child.products?.length) {
          const activeProducts = child.products.filter((p) => p.state === 'ACTIVE');
          map.set(child.id, activeProducts);
        }
      });
    });

    return map;
  }, [categories]);

  // ✅ Initialize first category
  useEffect(() => {
    if (!categories.length || activeParentId) return;

    const first = categories[0];
    setActiveParentId(first.id);
    setActiveCategoryId(first.children?.length ? first.children[0].id : first.id);
  }, [categories, activeParentId]);

  const activeParent = useMemo(
    () => categories.find((c) => c.id === activeParentId) ?? null,
    [categories, activeParentId],
  );

  // ✅ Sub-tabs (only if parent has children)
  const subTabs = useMemo(() => {
    if (!activeParent?.children?.length) return [];
    return activeParent.children.map((child: any) => ({
      label: child.name,
      categoryId: child.id,
    }));
  }, [activeParent]);

  // ✅ Get products for active category (instant lookup)
  const displayedProducts = useMemo(() => {
    if (!activeCategoryId) return [];
    return categoryProductsMap.get(activeCategoryId) || [];
  }, [activeCategoryId, categoryProductsMap]);

  // ✅ Reset scroll to top when category changes
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [activeCategoryId]);

  // ✅ Handle category click from sidebar
  const onSelectCategory = useCallback(
    (parentId: string) => {
      const parent = categories.find((c) => c.id === parentId);
      if (!parent) return;

      setActiveParentId(parentId);
      setActiveCategoryId(parent.children?.length ? parent.children[0].id : parent.id);
    },
    [categories],
  );

  // ✅ Handle sub-tab click
  const onSelectTab = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
  }, []);

  // ✅ Order management
  const orderItemsMap = useMemo(() => {
    const map: Record<string, IOrderItem> = {};
    orderState?.items?.forEach((item) => {
      if (item.productId) map[item.productId] = item;
    });
    return map;
  }, [orderState?.items]);

  const onQuantityChange = useCallback(
    (product: IMenuProduct, quantity: number) => {
      pendingUpdates.current[product.productId] = quantity;
      if (updateTimeout.current) clearTimeout(updateTimeout.current);

      updateTimeout.current = setTimeout(() => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {};

        setOrderState((prev) => {
          if (!prev) return emptyOrder;

          const newItems = [...prev.items];
          let totalAmount = 0;
          let totalQuantity = 0;

          Object.entries(updates).forEach(([productId, qty]) => {
            const existingIndex = newItems.findIndex((item) => item.productId === productId);

            if (qty > 0) {
              // Find product in current displayed products
              const prod = displayedProducts.find((p) => p.productId === productId);
              if (!prod?.variants?.length) return;

              const variant = prod.variants[0];
              const item: IOrderItem = {
                id: variant.id,
                uuid: existingIndex >= 0 ? newItems[existingIndex].uuid : generateUUID(),
                productId: prod.productId,
                name: variant.name,
                reason: '',
                state: 'DRAFT',
                quantity: qty,
                options: variant.options ?? [],
                price: variant.salePrice,
                discount: 0,
                image: prod.image ?? '',
              };

              if (existingIndex >= 0) newItems[existingIndex] = item;
              else newItems.push(item);
            } else if (existingIndex >= 0) {
              newItems.splice(existingIndex, 1);
            }
          });

          newItems.forEach((item) => {
            const optionTotal = item.options?.reduce((sum, opt) => sum + (opt.price || 0), 0) ?? 0;
            totalAmount += (item.price + optionTotal) * item.quantity;
            totalQuantity += item.quantity;
          });

          return { ...prev, items: newItems, totalAmount, grandTotal: totalAmount, totalQuantity };
        });
      }, 150);
    },
    [displayedProducts, setOrderState],
  );

  useEffect(() => {
    if (isEmpty(orderState)) setOrderState(emptyOrder);
  }, [orderState, setOrderState]);

  // ✅ Cleanup
  useEffect(() => {
    return () => {
      if (updateTimeout.current) clearTimeout(updateTimeout.current);
    };
  }, []);

  // ✅ Render product in grid
  const renderItem = useCallback(
    ({ item }: { item: IMenuProduct }) => (
      <View style={styles.gridCell}>
        <MemoizedProductCard
          product={item}
          orderItem={orderItemsMap[item.productId]}
          onQuantityChange={onQuantityChange}
          languageKey={i18n.language}
        />
      </View>
    ),
    [orderItemsMap, onQuantityChange, i18n.language],
  );

  const keyExtractor = useCallback((item: IMenuProduct) => item.productId, []);

  // ✅ Empty state
  const ListEmptyComponent = useMemo(() => <View style={styles.emptyState}></View>, []);

  return (
    <View style={styles.container}>
      {!collapsedMenu && (
        <Sidebar categories={categories} activeCategoryId={activeParentId} onSelect={onSelectCategory} />
      )}

      <View style={styles.content}>
        <Header
          collapsedMenu={collapsedMenu}
          setCollapsedMenu={setCollapsedMenu}
          categories={categories}
          activeIndex={Math.max(
            0,
            categories.findIndex((c) => c.id === activeParentId),
          )}
          activeParentId={activeParentId}
          activeCategoryId={activeCategoryId}
          refreshLanguage={() => {}}
        />

        {/* Sub-tabs (only if parent has children) */}
        {subTabs.length > 0 && (
          <View style={styles.subTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsRow}>
              {subTabs.map((tab: any) => {
                const isActive = tab.categoryId === activeCategoryId;
                return (
                  <Text
                    key={tab.categoryId}
                    onPress={() => onSelectTab(tab.categoryId)}
                    style={[styles.subTab, isActive && styles.subTabActive]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ✅ Simple FlatList - Only renders current category */}
        <FlatList
          ref={listRef}
          data={displayedProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={<View style={{ height: 80 }} />}
          // ✅ Performance optimizations
          removeClippedSubviews
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={50}
          initialNumToRender={18}
          windowSize={5}
          // ✅ Fixed item layout for better performance
          getItemLayout={(data, index) => ({
            length: 340, // Card height + margin
            offset: 340 * Math.floor(index / NUM_COLS),
            index,
          })}
        />
      </View>

      {orderState && <OrderFloatingButton order={orderState} />}
    </View>
  );
};

const Container = memo(ContainerContent);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flex: 1 },
  content: { flex: 1, backgroundColor: '#fff' },

  listContent: {
    paddingHorizontal: 24,
    paddingTop: 6,
  },

  gridCell: {
    width: `${100 / NUM_COLS}%`,
    paddingHorizontal: 8,
    marginBottom: 16,
  },

  subTabsContainer: {
    paddingHorizontal: 26,
    paddingTop: 2,
    paddingBottom: 10,
  },
  subTabsRow: { gap: 8 },
  subTab: {
    paddingVertical: 20,
    paddingHorizontal: 34,
    borderRadius: 999,
    backgroundColor: '#F1F2F6',
    color: '#444',
    fontWeight: '700',
    fontSize: 15,
  },
  subTabActive: {
    backgroundColor: '#ffd54f',
    color: '#222',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
});

export default Container;
