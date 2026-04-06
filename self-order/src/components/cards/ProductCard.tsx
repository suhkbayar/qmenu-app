import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { FAB, Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem, IMenuVariant } from '@/src/types';
import { CURRENCY } from '@/src/constants';
import { defaultColor } from '@/src/constants/Colors';
import { router } from 'expo-router';
import { useCallStore } from '@/src/store/cart.store';
import { isConfigurable } from '@/src/utils';
import { getCdnImageUrl } from '@/src/utils/image';

interface Props {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
}

const MemoizedPrice = memo(({ variants }: { variants: IMenuVariant[] }) => {
  const min = Math.min(...variants.map((v) => v.salePrice));
  const max = Math.max(...variants.map((v) => v.salePrice));
  const label =
    min === max ? `${min.toLocaleString()}${CURRENCY}` : `${min.toLocaleString()} - ${max.toLocaleString()}${CURRENCY}`;
  return <Text style={{ fontSize: 15, fontWeight: '700', color: '#333' }}>{label}</Text>;
});

const ProductImage = memo(({ source, style, onPress }: { source: any; style: object; onPress: () => void }) => (
  <Pressable onPress={onPress}>
    <Image source={source} style={style} contentFit="cover" transition={200} />
  </Pressable>
));

const ProductCard: React.FC<Props> = ({ product, orderItem, onQuantityChange }) => {
  const { participant } = useCallStore();
  const [loading, setLoading] = useState(false);
  const quantity = orderItem?.quantity || 0;

  const goProductInfo = useCallback(() => {
    if (loading) return;
    setLoading(true);
    router.push({
      pathname: '/private/product-info',
      params: { product: JSON.stringify({ ...product, image: product?.image }) },
    });
    setTimeout(() => setLoading(false), 300);
  }, [loading, product]);

  const increase = useCallback(() => {
    if (loading) return;
    const { variants } = product;
    if (!variants?.length) return;
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
        <View style={styles.controls}>
          {product.variants && <MemoizedPrice variants={product.variants} />}
          <TouchableOpacity onPress={increase}>
            <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.controls}>
        {product.variants && <MemoizedPrice variants={product.variants} />}
        {quantity > 0 ? (
          <View style={styles.quantityRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={decrease}>
              <FAB animated={false} icon="minus" size="small" style={styles.fabOutline} color={defaultColor} />
            </TouchableOpacity>
            <Text style={styles.qty}>{quantity}</Text>
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
      {product.bonus && (
        <View style={styles.bonusTag}>
          <Text style={styles.bonusText}>{product.bonus}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.infoButton} onPress={goProductInfo}>
        <View style={styles.infoButtonBg}>
          <Icon source="eye-outline" size={24} color="#fff" />
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
  image: { height: 220, width: '100%' },
  infoButton: { position: 'absolute', top: 8, right: 8 },
  infoButtonBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  info: { paddingHorizontal: 10, paddingVertical: 6, paddingBottom: 0, gap: 4 },
  name: { fontSize: 18, fontWeight: '700', color: '#333' },
  description: { fontSize: 14, fontWeight: '600', color: '#77798c' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  fab: {
    backgroundColor: defaultColor,
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabOutline: {
    backgroundColor: 'white',
    width: 56,
    height: 56,
    borderRadius: 999,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qty: { fontSize: 20, color: '#555', fontWeight: '700' },
  controls: { padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bonusTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  bonusText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

export default memo(
  ProductCard,
  (prev, next) =>
    prev.product.productId === next.product.productId && prev.orderItem?.quantity === next.orderItem?.quantity,
);
