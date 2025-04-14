import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { IMenuProduct, IOrderItem } from '@/types';
import { CalculateProductPrice } from '@/tools/calculate';
import { defaultColor } from '@/constants/Colors';

interface Props {
  product: IMenuProduct;
  orderItem?: IOrderItem;
  drawerVisible: boolean;
  onQuantityChange: (product: IMenuProduct, quantity: number) => void;
}

const ProductCard: React.FC<Props> = ({ product, orderItem, drawerVisible, onQuantityChange }) => {
  const [visible, setVisible] = useState(false);
  const [quantity, setQuantity] = useState(0);

  const increase = () => {
    const { variants } = product;
    if (!variants || variants.length === 0) return;

    if (variants.length > 1) {
      setVisible(true);
    } else {
      variants.forEach((item) => {
        if (item?.options?.length > 0) {
          setVisible(true);
          return;
        }
      });
    }

    const newQty = quantity + 1;
    setQuantity(newQty);

    onQuantityChange(product, newQty);
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

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={increase}>
        <Image
          source={product.image ? { uri: product.image } : require('../../../assets/images/noImage.jpg')}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
        {product.variants && <CalculateProductPrice variants={product.variants} />}
      </View>

      {quantity > 0 ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => {
              decrease();
            }}
            style={[styles.button, styles.buttonWhite]}
          >
            <Icon source="minus" color={defaultColor} size={16} />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{quantity}</Text>

          <TouchableOpacity
            onPress={() => {
              increase();
            }}
            style={styles.fullAddButton}
          >
            <Icon source="plus" color="#fff" size={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.smallButton} onPress={increase}>
            <Icon source="cart-outline" color={defaultColor} size={16} />
            <Text style={styles.smallButtonText}>Захиалах</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '23%',
    backgroundColor: '#fff',
    marginVertical: 7,
    marginHorizontal: 7,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    position: 'relative',
  },

  smallButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    borderColor: defaultColor,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  smallButtonText: {
    color: defaultColor,
    fontSize: 12,
    fontWeight: '500',
  },
  image: {
    height: 120,
    width: '100%',
  },
  info: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 0,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  description: {
    fontSize: 13,
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
  button: {
    borderRadius: 12,
    paddingVertical: 6,
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
    fontSize: 16,
    color: '#555',
  },
  addButtonContainer: {
    padding: 10,
  },
  buttonContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullAddButton: {
    backgroundColor: defaultColor,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProductCard;
