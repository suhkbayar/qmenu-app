import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { FAB, Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem, IMenuVariant } from '@/src/types';
import { CURRENCY, MenuItemState } from '@/src/constants';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
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
  const { theme } = useThemeStore();
  const min = Math.min(...variants.map((v) => v.salePrice));
  const max = Math.max(...variants.map((v) => v.salePrice));
  const label =
    min === max ? `${min.toLocaleString()}${CURRENCY}` : `${min.toLocaleString()} - ${max.toLocaleString()}${CURRENCY}`;
  return <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>{label}</Text>;
});

const ProductImage = memo(({ source, style }: { source: any; style: object }) => (
  <Pressable>
    <Image source={source} style={style} contentFit="cover" transition={200} />
  </Pressable>
));

const ProductCard: React.FC<Props> = ({ product, orderItem, onQuantityChange }) => {
  const participant = useCallStore((s) => s.participant);
  const { theme } = useThemeStore();
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

  const isDisabled = product.state === MenuItemState.DISABLED;

  const renderControls = () => {
    if (!participant?.orderable) return null;

    if (isDisabled) {
      return (
        <View style={styles.controls}>
          {product.variants && <MemoizedPrice variants={product.variants} />}
          <FAB animated={false} icon="plus" size="small" style={[styles.fab, { backgroundColor: '#ccc' }]} color="white" />
        </View>
      );
    }

    if (isConfigurable(product)) {
      return (
        <View style={styles.controls}>
          {product.variants && <MemoizedPrice variants={product.variants} />}
          <TouchableOpacity onPress={increase}>
            <FAB animated={false} icon="plus" size="small" style={[styles.fab, { backgroundColor: theme.primary }]} color="white" />
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
              <FAB
                animated={false}
                icon="minus"
                size="small"
                style={[styles.fabOutline, { backgroundColor: theme.card, borderColor: theme.border }]}
                color={theme.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.qty, { color: theme.text }]}>{quantity}</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={increase}>
              <FAB animated={false} icon="plus" size="small" style={[styles.fab, { backgroundColor: theme.primary }]} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.7} onPress={increase}>
            <FAB animated={false} icon="plus" size="small" style={[styles.fab, { backgroundColor: theme.primary }]} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <ProductImage source={imageSource} style={styles.image} />
      {product.bonus && (
        <View style={styles.bonusTag}>
          <Text style={styles.bonusText}>{product.bonus}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.infoButton} onPress={goProductInfo}>
        <View style={styles.infoButtonBg}>
          <Icon source="eye-outline" size={26} color="#fff" />
        </View>
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
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
    marginVertical: 8,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
  },
  image: { height: 236, width: '100%' },
  infoButton: { position: 'absolute', top: 8, right: 8 },
  infoButtonBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  info: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 0, gap: 5 },
  name: { fontSize: 19, fontWeight: '700', lineHeight: 24 },
  description: { fontSize: 15, fontWeight: '600', lineHeight: 19 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  fab: {
    backgroundColor: defaultColor, // overridden inline via theme.primary where needed
    width: 60,
    height: 60,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabOutline: {
    backgroundColor: 'white',
    width: 60,
    height: 60,
    borderRadius: 999,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qty: { fontSize: 22, fontWeight: '700' },
  controls: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  bonusText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default memo(
  ProductCard,
  (prev, next) =>
    prev.product.productId === next.product.productId &&
    prev.product.state === next.product.state &&
    prev.orderItem?.quantity === next.orderItem?.quantity,
);
