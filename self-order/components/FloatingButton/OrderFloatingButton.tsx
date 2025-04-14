import { FAB, Badge } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { defaultColor } from '@/constants/Colors';
import { ICustomerOrder } from '@/types';

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
        {order?.items.length > 0 && <Badge style={styles.badge}>{order?.items.length}</Badge>}
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
    backgroundColor: defaultColor,
    width: 56,
    height: 56,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'red',
    color: 'white',
  },
});

export default OrderFloatingButton;
