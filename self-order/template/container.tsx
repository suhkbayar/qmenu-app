import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { FlatList, ScrollView, View, StyleSheet, Text } from 'react-native';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { IMenuCategory, IMenuProduct, IOrderItem, IParticipant } from '@/types';
import ProductCard from '@/components/Card/ProductCard';
import { emptyOrder } from '@/constants';
import OrderFloatingButton from '@/components/FloatingButton/OrderFloatingButton';
import { useTranslation } from 'react-i18next';
import { useOrderStore } from '@/cache/order.store';
import { isCurrentlyOpen } from '@/utils';

interface ContainerProps {
  participant: IParticipant;
}

const NUM_COLS = 3;

const SubTab = memo(({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
  <Text
    onPress={onPress}
    style={[
      {
        paddingVertical: 20,
        paddingHorizontal: 34,
        borderRadius: 999,
        backgroundColor: isActive ? '#ffd54f' : '#F1F2F6',
        color: isActive ? '#222' : '#444',
        fontWeight: '700',
        fontSize: 15,
      },
    ]}
    numberOfLines={1}
  >
    {label}
  </Text>
));

const ContainerContent: React.FC<ContainerProps> = ({ participant }) => {
  const { i18n } = useTranslation();

  const orderItems = useOrderStore((state) => state.orderState.items);
  const updateQuantity = useOrderStore((state) => state.updateQuantity);

  const [collapsedMenu, setCollapsedMenu] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

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

  const categoryProductsMap = useMemo(() => {
    const map = new Map<string, IMenuProduct[]>();

    categories.forEach((parent) => {
      if (parent.products?.length) {
        const activeProducts = parent.products.filter((p) => p.state === 'ACTIVE');
        map.set(parent.id, activeProducts);
      }

      parent.children?.forEach((child: IMenuCategory) => {
        if (child.products?.length) {
          const activeProducts = child.products.filter((p) => p.state === 'ACTIVE');
          map.set(child.id, activeProducts);
        }
      });
    });

    return map;
  }, [categories]);

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

  const subTabs = useMemo(() => {
    if (!activeParent?.children?.length) return [];
    return activeParent.children.map((child: any) => ({
      label: child.name,
      categoryId: child.id,
    }));
  }, [activeParent]);

  const displayedProducts = useMemo(() => {
    if (!activeCategoryId) return [];
    return categoryProductsMap.get(activeCategoryId) || [];
  }, [activeCategoryId, categoryProductsMap]);

  const onSelectCategory = useCallback(
    (parentId: string) => {
      const parent = categories.find((c) => c.id === parentId);
      if (!parent) return;

      setActiveParentId(parentId);
      setActiveCategoryId(parent.children?.length ? parent.children[0].id : parent.id);
    },
    [categories],
  );

  const onSelectTab = useCallback((categoryId: string) => {
    setActiveCategoryId(categoryId);
  }, []);

  const emptyMap = useMemo<Record<string, IOrderItem>>(() => ({}), []);
  const orderItemsMap = useMemo(() => {
    if (!orderItems?.length) return emptyMap;

    const map: Record<string, IOrderItem> = {};
    orderItems.forEach((item: IOrderItem) => {
      if (item.productId) map[item.productId] = item;
    });
    return map;
  }, [orderItems, emptyMap]);

  const onQuantityChange = updateQuantity;

  const renderItem = useCallback(
    ({ item }: { item: IMenuProduct }) => (
      <View style={styles.gridCell}>
        <ProductCard product={item} orderItem={orderItemsMap[item.productId]} onQuantityChange={onQuantityChange} />
      </View>
    ),
    [orderItemsMap, onQuantityChange],
  );

  const keyExtractor = useCallback((item: IMenuProduct) => item.productId, []);

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
              {subTabs.map((tab: any) => (
                <SubTab
                  key={tab.categoryId}
                  label={tab.label}
                  isActive={tab.categoryId === activeCategoryId}
                  onPress={() => onSelectTab(tab.categoryId)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ✅ Simple FlatList - Only renders current category */}
        <FlatList
          data={displayedProducts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={<View style={{ height: 80 }} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={5}
          getItemLayout={(data, index) => ({
            length: 340,
            offset: 340 * Math.floor(index / NUM_COLS),
            index,
          })}
        />
      </View>

      <OrderFloatingButton />
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
