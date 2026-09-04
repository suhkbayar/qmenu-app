import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { IMenuProduct } from '@/src/types/menu';
import { IOrderItem } from '@/src/types/order';
import { isEmpty } from 'lodash';
import { useTranslation } from 'react-i18next';
import { MenuItemState } from '@/src/constants/index';
import { useCallStore } from '@/src/store/cart.store';
import { isConfigurable } from '@/src/utils';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import ProductDetailsScreen from '@/app/private/product-info';
import Icon from '@react-native-vector-icons/feather';

const CARD_WIDTH = 260;
const IMAGE_HEIGHT = 150;

type Props = {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  isFullWidth?: boolean;
  onAdd?: (variant: any, productId: string) => void;
  onRemove?: (productId: string) => void;
};

const RecommendedCard = ({ product, orderItem, onAdd, onRemove }: Props) => {
  const { t } = useTranslation('language');
  const participant = useCallStore((s) => s.participant);
  const config = useCallStore((s) => s.config);
  const add = useCallStore((s) => s.add);
  const remove = useCallStore((s) => s.remove);
  const { theme } = useThemeStore();
  const [visible, setVisible] = useState(false);
  const [animatedValue] = useState(new Animated.Value(1));

  useEffect(() => {
    if (orderItem?.quantity) {
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1.15, duration: 60, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [orderItem?.quantity]);

  const onSelect = (productId: string) => {
    if (product?.state !== MenuItemState.ACTIVE) return;
    if (!product?.variants?.length) return;
    if (product.variants.length > 1) {
      setVisible(true);
    } else {
      product.variants.forEach((item: any) => {
        if (item.options?.length > 0) {
          setVisible(true);
        } else if (product.variants?.[0]) {
          onAdd ? onAdd(product.variants[0], productId) : add(product.variants[0], productId);
        }
      });
    }
  };

  const onRemoveItem = () => {
    onRemove ? onRemove(product.productId) : remove(product as any);
  };

  const minPrice = Math.min(...(product.variants ?? []).map((v) => v.salePrice));

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {product.bonus && (
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>{product.bonus}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.imageContainer} onPress={() => setVisible(true)} activeOpacity={0.9}>
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          {!isEmpty(product.variants) && (
            <View style={styles.imageOverlay}>
              <View style={styles.badgeRow}>
                {(product.variants?.[0]?.calorie ?? 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{product.variants?.[0].calorie} kcal</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.footer}>
            {!config?.hidePrice && <Text style={styles.price}>{minPrice.toLocaleString()}₮</Text>}
            {participant?.orderable && (
              <View style={styles.action}>
                {orderItem ? (
                  <View style={[styles.quantityRow, { backgroundColor: theme.backgroundSecondary }]}>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.primary }]} onPress={onRemoveItem}>
                      <Icon name="minus" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
                      <Text style={[styles.qty, { color: theme.text }]}>{orderItem.quantity}</Text>
                    </Animated.View>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: theme.primary }]} onPress={() => onSelect(product.productId)}>
                      <Icon name="plus" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={() => (!isConfigurable(product) ? onSelect(product.productId) : setVisible(true))}
                  >
                    <Icon name="plus" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {visible && <ProductDetailsScreen visible={visible} onClose={() => setVisible(false)} product={product} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#bdc1caff',
  },
  ribbon: {
    position: 'absolute',
    top: 10,
    right: -22,
    backgroundColor: '#FF6B6B',
    paddingVertical: 4,
    paddingHorizontal: 28,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  ribbonText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  imageContainer: { width: '100%', height: IMAGE_HEIGHT },
  image: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  badgeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  badge: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  content: { padding: 14, paddingTop: 12 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 10,
    minHeight: 46,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 17, fontWeight: '700', color: defaultColor },
  action: {},
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 6,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: defaultColor, // overridden inline
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 16, fontWeight: '700', color: '#333', minWidth: 26, textAlign: 'center' },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: defaultColor,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});

export default RecommendedCard;
