import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { ScrollView, View, StyleSheet, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { ICustomerOrder, IMenuCategory, IMenuProduct, IOrderItem, IParticipant } from '@/types';
import { isEmpty } from 'lodash';
import ProductCard from '@/components/Card/ProductCard';
import { emptyOrder } from '@/constants';
import OrderFloatingButton from '@/components/FloatingButton/OrderFloatingButton';
import DraftOrder from '@/components/DraftOrder';

// Memoized category component for better performance
const CategorySection = memo(
  ({
    category,
    onLayout,
    orderItems,
    drawerVisible,
    onQuantityChange,
  }: {
    category: IMenuCategory;
    orderItems: IOrderItem[];
    onLayout: (event: any) => void;
    drawerVisible: boolean;
    onQuantityChange: (product: IMenuProduct, quantity: number) => void;
  }) => {
    return (
      <View key={category.id} onLayout={onLayout} style={{ marginBottom: 32 }}>
        <FlatList
          data={category.products}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              onQuantityChange={onQuantityChange}
              drawerVisible={drawerVisible}
              orderItem={orderItems.find((orderItem) => orderItem.productId === item.productId)}
              product={item}
            />
          )}
          numColumns={4}
          columnWrapperStyle={{ justifyContent: 'center', alignSelf: 'flex-start' }}
          scrollEnabled={false}
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
        />
      </View>
    );
  },
);

type Props = {
  participant: IParticipant;
};

const ContainerContent = ({ participant }: Props) => {
  const scrollRef = useRef<ScrollView>(null);
  const sectionLayouts = useRef<{ [key: string]: number }>({});
  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const productQuantities = useRef<Record<string, number>>({});
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [orderState, setOrderState] = useState<ICustomerOrder>();

  useEffect(() => {
    if (!participant || isEmpty(participant.menu)) return;

    const filtered = participant.menu.categories.filter((category) => {
      const allInactive = (products: IMenuProduct[]) => products.every((product) => product.state !== 'ACTIVE');
      const hasActiveProducts = !allInactive(category.products ?? []);
      const hasActiveChildren = category.children.some((child: IMenuCategory) => !allInactive(child.products ?? []));

      return isEmpty(category.children) ? hasActiveProducts : hasActiveProducts || hasActiveChildren;
    });

    setCategories(filtered);
  }, [participant]);

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

  const onQuantityChange = useCallback((product: IMenuProduct, quantity: number) => {
    productQuantities.current[product.productId] = quantity;
    // You can batch sync globally here using requestIdleCallback or throttling
    requestIdleCallback(() => {
      const variant = product.variants?.[0];

      if (!variant) return;

      setOrderState((prev) => {
        if (!prev) return undefined;

        const newItems = [...prev.items];
        const existingIndex = newItems.findIndex((item) => item.productId === product.productId);

        if (quantity > 0) {
          const item = {
            id: variant.id,
            uuid: existingIndex >= 0 ? newItems[existingIndex].uuid : variant.id,
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
          newItems.splice(existingIndex, 1);
        }

        // Recalculate totals
        let totalAmount = 0;
        let totalQuantity = 0;

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
    });
  }, []);

  useEffect(() => {
    if (isEmpty(orderState)) {
      setOrderState(emptyOrder);
    }
  }, [orderState]);

  // Memoize onScroll handler
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    const visibleCategory = Object.entries(sectionLayouts.current)
      .sort((a, b) => a[1] - b[1])
      .reduce((prev, [_, y], idx) => {
        if (scrollY + 100 >= y) return idx;
        return prev;
      }, 0);

    setActiveIndex(visibleCategory);
  }, []);

  // Create category layout handlers
  const createLayoutHandler = useCallback((categoryId: string) => {
    return (event: any) => {
      sectionLayouts.current[categoryId] = event.nativeEvent.layout.y;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Sidebar categories={categories} activeIndex={activeIndex} onSelect={scrollToCategory} />
      <View style={styles.content}>
        <Header categories={categories} activeIndex={activeIndex} />
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 100, marginTop: 4, marginLeft: 6 }}
        >
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              drawerVisible={drawerVisible}
              onQuantityChange={onQuantityChange}
              category={category}
              orderItems={orderState?.items ?? []}
              onLayout={createLayoutHandler(category.id)}
            />
          ))}
        </ScrollView>
      </View>
      {orderState && <OrderFloatingButton setDrawerVisible={setDrawerVisible} order={orderState} />}
      {orderState && (
        <DraftOrder
          order={orderState}
          setOrder={setOrderState}
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
        />
      )}
    </View>
  );
};

// Wrap the component with the CartProvider
const Container = (props: Props) => <ContainerContent {...props} />;

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
});

export default Container;
