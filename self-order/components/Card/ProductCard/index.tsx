import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { FAB, Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem } from '@/types';
import { CalculateProductPrice } from '@/tools/calculate';
import { defaultColor } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useCallStore } from '@/cache/cart.store';
import { isConfigurable } from '@/utils';
interface Props {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  drawerVisible: boolean;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
}

const ProductCard: React.FC<Props> = ({ product, orderItem, drawerVisible, onQuantityChange }) => {
  const [quantity, setQuantity] = useState(0);
  const { participant } = useCallStore();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('language');

  const increase = () => {
    if (loading) return;

    const { variants } = product;
    if (!variants || variants.length === 0) return;
    if (variants.length > 1) {
      goProductInfo();
    } else {
      variants.forEach((item) => {
        if (item?.options?.length > 0) {
          goProductInfo();
          return;
        } else {
          const newQty = quantity + 1;
          setQuantity(newQty);
          onQuantityChange(product, newQty);
        }
      });
    }
  };

  useEffect(() => {
    if (drawerVisible) {
      if (orderItem) {
        setQuantity(orderItem.quantity);
      } else {
        setQuantity(0);
      }
    }
  }, [orderItem, drawerVisible]);

  const decrease = () => {
    if (quantity === 0) return;
    const newQty = quantity - 1;
    setQuantity(newQty);
    onQuantityChange(product, newQty);
  };

  const goProductInfo = async () => {
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
  };

  return (
    <>
      <View style={styles.card}>
        <TouchableOpacity onPress={increase}>
          <Image
            source={product.image ? { uri: product.image } : require('../../../assets/images/noImage.jpg')}
            style={styles.image}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
            }}
            onPress={() => {
              goProductInfo();
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)', // semi-transparent white background
                borderRadius: 4,
                padding: 6,
              }}
            >
              <Icon source="eye" size={20} color="#bababa" />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>

          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        </View>

        {participant?.orderable && (
          <>
            {isConfigurable(product) ? (
              <View style={styles.addButtonContainer}>
                {product.variants && <CalculateProductPrice variants={product.variants} />}

                <FAB animated icon="plus" size="small" style={styles.fab} onPress={increase} color="white" />
              </View>
            ) : (
              <View style={styles.addButtonContainer}>
                {product.variants && <CalculateProductPrice variants={product.variants} />}
                {quantity > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 18,
                    }}
                  >
                    <FAB
                      animated
                      icon="minus"
                      size="small"
                      style={styles.secondfab}
                      onPress={decrease}
                      color={defaultColor}
                    />
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <FAB animated icon="plus" size="small" style={styles.fab} onPress={increase} color="white" />
                  </View>
                ) : (
                  <FAB animated icon="plus" size="small" style={styles.fab} onPress={increase} color="white" />
                )}
              </View>
            )}
          </>
        )}
      </View>
    </>
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
  smallButton: {
    display: 'flex',
  },
  smallButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  image: {
    height: 220,
    width: '100%',
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
  price: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f44336',
    color: '#fff',
  },
  quantityContainer: {
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    width: '88%',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  button: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonWhite: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: defaultColor,
  },
  buttonColored: {
    backgroundColor: defaultColor,
  },
  icon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
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
  buttonContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  fullAddButton: {
    backgroundColor: defaultColor,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProductCard;
