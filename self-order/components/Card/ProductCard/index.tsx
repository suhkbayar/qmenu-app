import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ImageSourcePropType, Pressable } from 'react-native';
import { FAB, Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem, IMenuVariant } from '@/types';
import { CalculateProductPrice } from '@/tools/calculate';
import { defaultColor } from '@/constants/Colors';
import { router } from 'expo-router';
import { useCallStore } from '@/cache/cart.store';
import { isConfigurable } from '@/utils';

interface Props {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  drawerVisible: boolean;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
  languageKey?: string; // Add a language key prop to force re-renders on language change
}

// Fix the variants typing
interface PriceComponentProps {
  variants: IMenuVariant[];
}

interface ProductImageProps {
  source: ImageSourcePropType;
  style: object;
  onPress: () => void;
}

// Memoize the CalculateProductPrice component to prevent re-renders
const MemoizedPriceComponent = memo(({ variants }: PriceComponentProps) => (
  <CalculateProductPrice variants={variants} />
));

// Memoize the product image to prevent re-renders
const ProductImage = memo(({ source, style, onPress }: ProductImageProps) => (
  <Pressable onPress={onPress}>
    <Image source={source} style={style} resizeMode="cover" />
  </Pressable>
));

const ProductCard: React.FC<Props> = ({ product, orderItem, drawerVisible, onQuantityChange, languageKey }) => {
  const [quantity, setQuantity] = useState<number>(0);
  const { participant } = useCallStore();
  const [loading, setLoading] = useState<boolean>(false);

  const increase = useCallback(() => {
    if (loading) return;

    const { variants } = product;
    if (!variants || variants.length === 0) return;

    if (variants.length > 1) {
      goProductInfo();
    } else {
      if (variants[0]?.options?.length > 0) {
        goProductInfo();
      } else {
        const newQty = quantity + 1;
        setQuantity(newQty);
        onQuantityChange(product, newQty);
      }
    }
  }, [loading, product, quantity, onQuantityChange]);

  useEffect(() => {
    if (product?.productId && orderItem?.productId) {
      const newQuantity = orderItem ? orderItem.quantity : 0;
      if (newQuantity !== quantity) {
        setQuantity(newQuantity);
      }
    } else {
      setQuantity(0);
    }
  }, [orderItem]);

  const decrease = useCallback(() => {
    if (quantity === 0) return;
    const newQty = quantity - 1;
    setQuantity(newQty);
    onQuantityChange(product, newQty);
  }, [quantity, product, onQuantityChange]);

  const goProductInfo = useCallback(async () => {
    if (loading) return;

    try {
      setLoading(true);
      await router.push({
        pathname: '/private/product-info',
        params: { product: JSON.stringify(product) },
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Use setTimeout to ensure the navigation has time to complete
      // before allowing another navigation attempt
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }
  }, [loading, product]);

  // Prepare image source only once
  const imageSource = product.image ? { uri: product.image } : require('../../../assets/images/noImage.jpg');

  // Only render controls if the participant is orderable
  const renderControls = () => {
    if (!participant?.orderable) return null;

    if (isConfigurable(product)) {
      return (
        <View style={styles.addButtonContainer}>
          {product.variants && <MemoizedPriceComponent variants={product.variants} />}
          <TouchableOpacity onPress={increase}>
            <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.addButtonContainer}>
        {product.variants && <MemoizedPriceComponent variants={product.variants} />}
        {quantity > 0 ? (
          <View style={styles.quantityControls}>
            <TouchableOpacity activeOpacity={10} onPress={decrease}>
              <FAB animated={false} icon="minus" size="small" style={styles.secondfab} color={defaultColor} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity activeOpacity={10} onPress={increase}>
              <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={10} onPress={increase}>
            <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <ProductImage source={imageSource} style={styles.image} onPress={increase} />

      <TouchableOpacity style={styles.infoButton} onPress={goProductInfo}>
        <View style={styles.infoButtonBg}>
          <Icon source="eye" size={30} color="#bababa" />
        </View>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
      </View>

      {renderControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '32%',
    backgroundColor: '#fff',
    marginVertical: 7,
    marginHorizontal: 7,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
  },
  image: {
    height: 220,
    width: '100%',
  },
  infoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  infoButtonBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
    padding: 6,
  },
  info: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 0,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    color: '#77798c',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  fab: {
    backgroundColor: defaultColor,
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondfab: {
    backgroundColor: 'white',
    width: 56,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 20,
    color: '#555',
    fontWeight: '700',
  },
  addButtonContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

// Export a memoized component with custom comparison function
export default memo(ProductCard, (prevProps, nextProps) => {
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

  // Check other props that would cause a re-render
  return (
    prevProps.drawerVisible === nextProps.drawerVisible &&
    prevProps.product.id === nextProps.product.id &&
    prevProps.orderItem?.quantity === nextProps.orderItem?.quantity
  );
});
