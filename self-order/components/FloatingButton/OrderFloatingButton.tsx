import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ICustomerOrder } from '@/types';
import CustomBadge from '../Badge';

type Props = {
  order: ICustomerOrder;
};

const OrderFloatingButton = memo(({ order }: Props) => {
  const router = useRouter();
  const showBadge = (order?.totalQuantity || 0) > 0;

  const handlePress = useCallback(() => {
    router.push({ pathname: '/private/draft-order' });
  }, [router]);

  return (
    <View style={styles.container}>
      <FAB animated={false} icon="cart-outline" style={styles.fab} onPress={handlePress} color="white" />
      {showBadge && <CustomBadge value={order?.totalQuantity || 0} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    backgroundColor: '#EB1833',
    width: 70,
    height: 70,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OrderFloatingButton;
