import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { FAB, Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem, IMenuVariant } from '@/types';
import { CalculateProductPrice } from '@/tools/calculate';
import { defaultColor } from '@/constants/Colors';
import { router } from 'expo-router';
import { useCallStore } from '@/cache/cart.store';
import { isConfigurable } from '@/utils';
import { getCdnImageUrl } from '@/utils/image';

interface Props {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
}

interface PriceComponentProps {
  variants: IMenuVariant[];
}

interface ProductImageProps {
  source: { uri: string };
  style: object;
  onPress: () => void;
}

const MemoizedPriceComponent = memo(({ variants }: PriceComponentProps) => (
  <CalculateProductPrice variants={variants} />
));

const ProductImage = memo(({ source, style, onPress }: ProductImageProps) => (
  <Pressable onPress={onPress}>
    <Image source={source} style={style} contentFit="cover" transition={200} />
  </Pressable>
));

const ProductCard: React.FC<Props> = ({ product, orderItem, onQuantityChange }) => {
  const { participant } = useCallStore();
  const [loading, setLoading] = useState<boolean>(false);

  const quantity = orderItem?.quantity || 0;

  const goProductInfo = useCallback(() => {
    if (loading) return;

    setLoading(true);
    router.push({
      pathname: '/private/product-info',
      params: {
        product: JSON.stringify({
          ...product,
          image: product?.image,
        }),
      },
    });

    setTimeout(() => {
      setLoading(false);
    }, 300);
  }, [loading, product]);

  const increase = useCallback(() => {
    if (loading) return;

    const t0 = performance.now();
    const { variants } = product;
    if (!variants || variants.length === 0) return;

    if (variants.length > 1 || variants[0]?.options?.length > 0) {
      goProductInfo();
    } else {
      onQuantityChange(product, quantity + 1);
    }
  }, [loading, product, quantity, onQuantityChange, goProductInfo]);

  const decrease = useCallback(() => {
    if (quantity === 0) return;

    onQuantityChange(product, quantity - 1);
  }, [quantity, product, onQuantityChange]);

  const imageSource = product.image
    ? { uri: getCdnImageUrl(product.image, 'md') }
    : require('../../../assets/images/noImage.jpg');

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
            <TouchableOpacity activeOpacity={0.7} onPress={decrease}>
              <FAB animated={false} icon="minus" size="small" style={styles.secondfab} color={defaultColor} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={increase}>
              <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={increase}>
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
    width: '100%',
    marginVertical: 7,
    marginHorizontal: 7,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
    backgroundColor: '#fff',
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

export default memo(
  ProductCard,
  (prevProps, nextProps) =>
    prevProps.product.id === nextProps.product.id && prevProps.orderItem?.quantity === nextProps.orderItem?.quantity,
);
