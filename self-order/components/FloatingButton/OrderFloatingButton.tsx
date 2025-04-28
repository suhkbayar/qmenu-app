import React, { useCallback, memo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { ICustomerOrder } from '@/types';
import CustomBadge from '../Badge';
import DraftOrder from '../DraftOrder';

type Props = {
  order: ICustomerOrder;
  drawStore: (value: boolean) => void;
};

// Make sure to export a function component, not an object
const OrderFloatingButton = memo(({ order }: Props) => {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handlePress = useCallback(() => {
    setDrawerVisible(true);
  }, [setDrawerVisible]);

  const onCloseModal = useCallback(() => {
    setDrawerVisible(false);
  }, [setDrawerVisible]);

  const showBadge = (order?.totalQuantity || 0) > 0;

  return (
    <View style={styles.container}>
      <FAB animated={false} icon="cart-outline" style={styles.fab} onPress={handlePress} color="white" />
      {showBadge && <CustomBadge value={order?.totalQuantity || 0} />}
      <DraftOrder visible={drawerVisible} onCloseModal={onCloseModal} />
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OrderFloatingButton;
