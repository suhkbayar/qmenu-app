import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOrderStore } from '@/src/store/order.store';
import { useThemeStore } from '@/src/store/theme.store';

const OrderFloatingButton = memo(() => {
  const router = useRouter();
  const { t } = useTranslation('language');
  const totalQuantity = useOrderStore((s) => s.orderState.totalQuantity);
  const totalAmount = useOrderStore((s) => s.orderState.totalAmount);

  const { theme } = useThemeStore();
  const handlePress = useCallback(() => router.push({ pathname: '/private/draft-order' }), [router]);

  if (!totalQuantity) return null;

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: theme.danger }]} onPress={handlePress} activeOpacity={0.85}>
      <Text style={styles.label}>
        {t('mainPage.Order')} ({totalQuantity})
      </Text>
      <Text style={styles.price}>{(totalAmount || 0).toLocaleString()}₮</Text>
    </TouchableOpacity>
  );
});

export default OrderFloatingButton;

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#EB1833',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  label: { color: 'white', fontSize: 16, fontWeight: '600' },
  price: { color: 'white', fontSize: 18, fontWeight: '600' },
});
