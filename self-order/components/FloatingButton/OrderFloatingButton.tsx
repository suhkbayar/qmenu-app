import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOrderStore } from '@/cache/order.store';

const OrderFloatingButton = memo(() => {
  const router = useRouter();
  const { t } = useTranslation('language');

  const totalQuantity = useOrderStore((state) => state.orderState.totalQuantity);
  const totalAmount = useOrderStore((state) => state.orderState.totalAmount);
  const showButton = (totalQuantity || 0) > 0;

  const handlePress = useCallback(() => {
    router.push({ pathname: '/private/draft-order' });
  }, [router]);

  if (!showButton) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
        <Text style={styles.label}>{t('mainPage.Order')}</Text>
        <Text style={styles.price}>{(totalAmount || 0).toLocaleString()}₮ ({totalQuantity})</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  button: {
    backgroundColor: '#EB1833',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OrderFloatingButton;
