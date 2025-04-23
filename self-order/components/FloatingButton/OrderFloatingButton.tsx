import { FAB } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { ICustomerOrder } from '@/types';
import CustomBadge from '../Badge';

type Props = {
  order: ICustomerOrder;
  setDrawerVisible: (visible: boolean) => void;
};

const OrderFloatingButton = ({ order, setDrawerVisible }: Props) => {
  return (
    <>
      <View style={styles.container}>
        <FAB
          icon="cart-outline"
          style={styles.fab}
          onPress={() => {
            setDrawerVisible(true);
          }}
          color="white"
        />
        {order?.totalQuantity > 0 && <CustomBadge value={order?.totalQuantity} />}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,

    bottom: 16,
  },
  fab: {
    backgroundColor: '#EB1833',
    width: 66,
    height: 66,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 14,
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: '#EB1833',
    color: 'white',
    fontWeight: '700',
  },
});

export default OrderFloatingButton;
