import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { FlatList, View, StyleSheet, ViewToken } from 'react-native';
import { Text } from 'react-native-paper';
import Header from '@/src/components/Header';
import Sidebar from '@/src/components/Sidebar';
import SubcategoryBar from '@/src/components/SubcategoryBar';
import { IMenuCategory, IMenuProduct, IOrderItem, IParticipant } from '@/src/types';
import ProductCard from '@/src/components/cards/ProductCard';
import { useTranslation } from 'react-i18next';
import { useOrderStore } from '@/src/store/order.store';
import { useThemeStore } from '@/src/store/theme.store';
import { isCurrentlyOpen } from '@/src/utils';

const NUM_COLS = 3;
const ROW_HEIGHT = 378;
const HEADER_HEIGHT = 60;
const SUB_HEADER_HEIGHT = 50;

type ListRow =
  | { type: 'header'; key: string; categoryId: string; label: string; isSubCategory: boolean; height: number }
  | { type: 'row'; key: string; rowKey: string; items: IMenuProduct[]; height: number };

function buildRows(categories: IMenuCategory[]): ListRow[] {
  const rows: ListRow[] = [];
  let seq = 0;

  for (const parent of categories) {
    rows.push({
      type: 'header',
      key: `h${seq++}`,
      categoryId: parent.id,
      label: parent.name,
      isSubCategory: false,
      height: HEADER_HEIGHT,
    });

    if (parent.children?.length) {
      for (const child of parent.children) {
        rows.push({
          type: 'header',
          key: `h${seq++}`,
          categoryId: child.id,
          label: child.name,
          isSubCategory: true,
          height: SUB_HEADER_HEIGHT,
        });
        const products = child.products?.filter((p: IMenuProduct) => p.state === 'ACTIVE') ?? [];
        for (let i = 0; i < products.length; i += NUM_COLS) {
          const chunk = products.slice(i, i + NUM_COLS);
          rows.push({ type: 'row', key: `r${seq++}`, rowKey: `${child.id}-${i}`, items: chunk, height: ROW_HEIGHT });
        }
      }
    } else {
      const products = parent.products?.filter((p: IMenuProduct) => p.state === 'ACTIVE') ?? [];
      for (let i = 0; i < products.length; i += NUM_COLS) {
        const chunk = products.slice(i, i + NUM_COLS);
        rows.push({ type: 'row', key: `r${seq++}`, rowKey: `${parent.id}-${i}`, items: chunk, height: ROW_HEIGHT });
      }
    }
  }

  return rows;
}

const SectionHeader = memo(({ label, isSubCategory }: { label: string; isSubCategory: boolean }) => {
  const { theme } = useThemeStore();
  return (
    <View style={[styles.sectionHeader, isSubCategory && styles.sectionHeaderSub]}>
      <Text style={[isSubCategory ? styles.sectionLabelSub : styles.sectionLabel, { color: isSubCategory ? theme.textMuted : theme.text }]}>{label}</Text>
    </View>
  );
});

const GridRow = memo(
  ({
    items,
    rowKey,
    orderItemsMap,
    updateQuantity,
  }: {
    items: IMenuProduct[];
    rowKey: string;
    orderItemsMap: Record<string, IOrderItem>;
    updateQuantity: (product: IMenuProduct, quantity: number) => void;
  }) => (
    <View style={styles.row}>
      {items.map((p, i) => (
        <View key={`${rowKey}-${i}`} style={styles.cell}>
          <ProductCard product={p} orderItem={orderItemsMap[p.productId]} onQuantityChange={updateQuantity} />
        </View>
      ))}
      {Array.from({ length: NUM_COLS - items.length }).map((_, i) => (
        <View key={`pad-${i}`} style={styles.cell} />
      ))}
    </View>
  ),
  (prev, next) =>
    prev.items === next.items &&
    prev.items.every((p) => prev.orderItemsMap[p.productId]?.quantity === next.orderItemsMap[p.productId]?.quantity),
);

const ContainerContent: React.FC<{ participant: IParticipant }> = ({ participant }) => {
  const { i18n } = useTranslation();
  const { theme } = useThemeStore();
  const orderItems = useOrderStore((s) => s.orderState.items);
  const updateQuantity = useOrderStore((s) => s.updateQuantity);

  const listRef = useRef<FlatList<ListRow>>(null);
  const [collapsedMenu, setCollapsedMenu] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const jumping = useRef(false);

  const categories = useMemo<IMenuCategory[]>(() => {
    const cats = participant?.menu?.categories;
    if (!cats?.length) return [];
    return cats
      .filter((c: IMenuCategory) => isCurrentlyOpen(c.timetable))
      .map((c: IMenuCategory) => ({
        ...c,
        children: c.children?.filter((ch: IMenuCategory) => isCurrentlyOpen(ch.timetable)) ?? [],
      }));
  }, [participant?.menu, i18n.language]);

  const rows = useMemo(() => buildRows(categories), [categories]);

  const offsets = useMemo(() => {
    let acc = 0;
    return rows.map((r) => {
      const o = acc;
      acc += r.height;
      return o;
    });
  }, [rows]);

  const getItemLayout = useCallback(
    (_: any, i: number) => ({ length: rows[i]?.height ?? ROW_HEIGHT, offset: offsets[i] ?? 0, index: i }),
    [rows, offsets],
  );

  const categoryIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r, i) => {
      if (r.type === 'header' && !map.has(r.categoryId)) map.set(r.categoryId, i);
    });
    return map;
  }, [rows]);

  const rowActiveCatIds = useMemo(() => {
    let cur = categories[0]?.id ?? '';
    return rows.map((r) => {
      if (r.type === 'header') cur = r.categoryId;
      return cur;
    });
  }, [rows, categories]);

  const rowActiveCatIdsRef = useRef(rowActiveCatIds);
  useEffect(() => {
    rowActiveCatIdsRef.current = rowActiveCatIds;
  }, [rowActiveCatIds]);

  useEffect(() => {
    if (categories.length && !activeCatId) setActiveCatId(categories[0].id);
  }, [categories]);

  const activeParentId = useMemo(() => {
    if (!activeCatId) return null;
    const direct = categories.find((c) => c.id === activeCatId);
    if (direct) return direct.id;
    const parent = categories.find((c) => c.children?.some((ch: IMenuCategory) => ch.id === activeCatId));
    return parent?.id ?? null;
  }, [activeCatId, categories]);

  const activeParent = useMemo(
    () => categories.find((c) => c.id === activeParentId) ?? null,
    [categories, activeParentId],
  );

  const orderItemsMap = useMemo<Record<string, IOrderItem>>(() => {
    const map: Record<string, IOrderItem> = {};
    for (const item of orderItems ?? []) {
      if (item.productId) map[item.productId] = item;
    }
    return map;
  }, [orderItems]);

  const updateRef = useRef(updateQuantity);
  useEffect(() => {
    updateRef.current = updateQuantity;
  }, [updateQuantity]);

  const scrollTo = useCallback(
    (categoryId: string) => {
      const index = categoryIndexMap.get(categoryId);
      if (index == null) return;
      jumping.current = true;
      setActiveCatId(categoryId);
      listRef.current?.scrollToIndex({ index, animated: true });
      setTimeout(() => {
        jumping.current = false;
      }, 600);
    },
    [categoryIndexMap],
  );

  const viewConfig = useRef({ itemVisiblePercentThreshold: 20 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (jumping.current || !viewableItems.length) return;
    const id = rowActiveCatIdsRef.current[viewableItems[0].index ?? 0];
    if (id) setActiveCatId(id);
  });

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === 'header') return <SectionHeader label={item.label} isSubCategory={item.isSubCategory} />;
      return (
        <GridRow
          items={item.items}
          rowKey={item.rowKey}
          orderItemsMap={orderItemsMap}
          updateQuantity={updateRef.current}
        />
      );
    },
    [orderItemsMap],
  );

  const activeIndex = Math.max(
    0,
    categories.findIndex((c) => c.id === activeParentId),
  );

  return (
    <View style={styles.container}>
      {!collapsedMenu && <Sidebar categories={categories} activeCategoryId={activeParentId} onSelect={scrollTo} />}

      <View style={[styles.content, { backgroundColor: theme.background }]}>
        <Header
          collapsedMenu={collapsedMenu}
          setCollapsedMenu={setCollapsedMenu}
          categories={categories}
          activeIndex={activeIndex}
          activeParentId={activeParentId}
          activeCategoryId={activeCatId}
          refreshLanguage={() => {}}
        />

        <SubcategoryBar
          childrenCats={activeParent?.children ?? []}
          activeChildId={activeCatId}
          onSelectChild={(child) => scrollTo(child.id)}
        />

        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          extraData={orderItemsMap}
          contentContainerStyle={styles.list}
          ListFooterComponent={<View style={{ height: 80 }} />}
          removeClippedSubviews
          maxToRenderPerBatch={9}
          updateCellsBatchingPeriod={50}
          initialNumToRender={12}
          windowSize={7}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewConfig.current}
        />
      </View>
    </View>
  );
};

export default memo(ContainerContent);

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flex: 1 },
  content: { flex: 1, backgroundColor: '#fff' },
  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  row: { flexDirection: 'row' },
  cell: { width: `${100 / NUM_COLS}%`, paddingHorizontal: 8, marginBottom: 16 },
  sectionHeader: { height: HEADER_HEIGHT, paddingHorizontal: 8, justifyContent: 'center' },
  sectionHeaderSub: { height: SUB_HEADER_HEIGHT, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 22, fontWeight: '800', color: '#222' },
  sectionLabelSub: { fontSize: 17, fontWeight: '700', color: '#666' },
});
