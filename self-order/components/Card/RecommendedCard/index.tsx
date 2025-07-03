import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { IMenuProduct } from '@/types/menu';
import { isEmpty } from 'lodash';
import { CalculateProductMinPrice, isConfigurable } from '@/tools/calculate';
import { useTranslation } from 'react-i18next';
import { MenuItemState } from '@/constants/index';
import { IOrderItem } from '@/types/order';

import { useCallStore } from '@/cache/cart.store';
import ProductDetailsScreen from '@/app/private/product-info';
import Icon from '@react-native-vector-icons/feather';
import PlusIcon from '@react-native-vector-icons/feather';
import MinusIcon from '@react-native-vector-icons/feather';
import { defaultColor } from '@/constants/Colors';
const { width: screenWidth } = Dimensions.get('window');

type Props = {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  isFullWidth?: boolean;
  onAdd?: (variant: any, productId: string) => void;
  onRemove?: (productId: string) => void;
};

const RecommendedCard = ({ product, orderItem, isFullWidth, onAdd, onRemove }: Props) => {
  const { t } = useTranslation('language');
  const { participant, config } = useCallStore();

  const [visible, setVisible] = useState(false);
  const { add, remove } = useCallStore();
  const [animatedValue] = useState(new Animated.Value(1));

  useEffect(() => {
    if (orderItem?.quantity) {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.2,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [orderItem?.quantity]);

  const onSelect = (productId: string) => {
    if (product?.state !== MenuItemState.ACTIVE) return;
    if (!product || !product.variants || product.variants.length === 0) return;

    if (product.variants.length > 1) {
      setVisible(true);
    } else {
      product.variants.forEach((item: any) => {
        if (item.options?.length > 0) {
          setVisible(true);
        } else {
          if (product.variants && product.variants[0]) {
            // Use the passed onAdd function if available, otherwise fallback to store
            if (onAdd) {
              onAdd(product.variants[0], productId);
            } else {
              add(product.variants[0], productId);
            }
          }
        }
      });
    }
  };

  const onRemoveItem = (item: any) => {
    // Use the passed onRemove function if available, otherwise fallback to store
    if (onRemove) {
      onRemove(product.productId);
    } else {
      remove(item);
    }
  };

  const onCloseProduct = () => {
    setVisible(false);
  };

  const getCardWidth = () => {
    if (isFullWidth) return screenWidth - 1105;
    return;
  };

  const cardStyle = {
    backgroundColor: config?.cardBackgroundColor || '#ffffff',
    borderColor: config?.textColor || '#000000',
    width: getCardWidth(),
  };

  const textStyle = {
    color: config?.textColor || '#000000',
  };

  return (
    <>
      <View style={[styles.container, { width: getCardWidth() }]}>
        <View style={[styles.card, cardStyle]}>
          {product.bonus && (
            <View style={styles.ribbon}>
              <Text style={styles.ribbonText}>{product.bonus}</Text>
            </View>
          )}

          {!config || !config.hideImage ? (
            <TouchableOpacity style={styles.imageContainer} onPress={() => setVisible(true)}>
              <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />

              {!isEmpty(product.variants) && (
                <View style={styles.imageOverlay}>
                  <View style={styles.badgeContainer}>
                    {product.variants && product.variants[0]?.calorie > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{product.variants[0].calorie} kcal</Text>
                      </View>
                    )}
                    <View style={[styles.badge, styles.servingsBadge]}>
                      <Icon name="user" size={8} color="#ffffff" />
                      <Text style={styles.badgeText}>
                        {product.variants?.[0]?.servings?.[0] === product.variants?.[0]?.servings?.[1]
                          ? product.variants?.[0]?.servings?.[0]
                          : `${product.variants?.[0]?.servings?.[0]}-${product.variants?.[0]?.servings?.[1]}`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}

          <View style={styles.content}>
            <Text style={[styles.title, textStyle]} numberOfLines={2}>
              {!isEmpty(product.name) && product.name}
            </Text>

            <View style={styles.footer}>
              <Text style={[styles.price, textStyle]}>
                {!config?.hidePrice && CalculateProductMinPrice(product.variants ?? [], config ?? undefined)}
              </Text>

              {participant?.orderable && (
                <View style={styles.actionContainer}>
                  {orderItem ? (
                    <View style={styles.quantityContainer}>
                      {/* <TouchableOpacity
                        style={[styles.quantityButton, { borderColor: textStyle.color }]}
                        onPress={() => onRemoveItem(product)}
                      >
                        <MinusIcon name="minus" size={14} color={textStyle.color} />
                      </TouchableOpacity> */}

                      <Animated.View style={{ transform: [{ scale: animatedValue }] }}>
                        <Text style={[styles.quantity, textStyle]}>{orderItem.quantity}</Text>
                      </Animated.View>

                      <TouchableOpacity
                        style={[styles.quantityButton, { borderColor: textStyle.color }]}
                        onPress={() => onSelect(product.productId)}
                      >
                        <PlusIcon name="plus" size={14} style={styles.buttonAddStyleWhite} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addButton, { borderColor: textStyle.color }]}
                      onPress={() => (!isConfigurable(product) ? onSelect(product.productId) : setVisible(true))}
                    >
                      <PlusIcon name="plus" size={14} style={styles.buttonAddStyleWhite} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {visible && <ProductDetailsScreen visible={visible} onClose={onCloseProduct} product={product} />}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
  buttonAddStyleWhite: {
    color: 'white',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  ribbon: {
    position: 'absolute',
    top: 8,
    right: -25,
    backgroundColor: '#FF6B6B',
    paddingVertical: 4,
    paddingHorizontal: 25,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ribbonText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  imageContainer: {
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backdropFilter: 'blur(10px)',
  },
  servingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  spacer: {
    height: 6,
  },
  content: {
    padding: 10,
    paddingTop: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',

    lineHeight: 20,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 8,
    fontWeight: '500',
    color: '#2E7D32',
  },
  actionContainer: {
    marginLeft: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityButton: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: defaultColor,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    borderWidth: 0,
    borderColor: '#FFC300',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
    backgroundColor: defaultColor,
    elevation: 2,
  },
});

export default RecommendedCard;
