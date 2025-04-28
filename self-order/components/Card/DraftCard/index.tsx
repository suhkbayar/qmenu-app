import { CURRENCY } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import { IOrderItem } from '@/types';
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB } from 'react-native-paper';

type Props = {
  items: IOrderItem[];
  increase: (uuid: string) => void;
  decrease: (uuid: string) => void;
};

// Create a memoized Item component to prevent re-renders
const OrderListItem = memo(
  ({ item, onIncrease, onDecrease }: { item: IOrderItem; onIncrease: () => void; onDecrease: () => void }) => {
    const imageSource = useMemo(
      () => (item.image ? { uri: item.image } : require('../../../assets/images/noImage.jpg')),
      [item.image],
    );

    const formattedPrice = useMemo(() => `${item.price.toLocaleString()} ${CURRENCY}`, [item.price]);

    return (
      <View style={styles.itemContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          defaultSource={require('../../../assets/images/noImage.jpg')}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>
        <View style={styles.controlsContainer}>
          <TouchableOpacity activeOpacity={10} onPress={onDecrease}>
            <FAB animated={false} icon="minus" size="small" style={styles.secondfab} color={defaultColor} />
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity activeOpacity={10} onPress={onIncrease}>
            <FAB animated={false} icon="plus" size="small" style={styles.fab} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const DraftList = ({ items, increase, decrease }: Props) => {
  // Create a memoized keyExtractor function
  const keyExtractor = useCallback((item: IOrderItem) => item.uuid, []);

  // Create a memoized renderItem function to prevent recreating on each render
  const renderItem = useCallback(
    ({ item }: { item: IOrderItem }) => {
      // Create handler functions here, bound to the specific item
      const handleIncrease = () => increase(item.uuid);
      const handleDecrease = () => decrease(item.uuid);

      return <OrderListItem item={item} onIncrease={handleIncrease} onDecrease={handleDecrease} />;
    },
    [increase, decrease],
  );

  // Use getItemLayout for better performance
  const getItemLayout = useCallback(
    (data: ArrayLike<IOrderItem> | null | undefined, index: number) => ({
      length: 88,
      offset: 88 * index,
      index,
    }),
    [],
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
    marginHorizontal: 14,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  price: {
    color: '#374151',
    fontSize: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quantity: {
    fontSize: 16,
    color: '#555',
    fontWeight: '700',
  },
  secondfab: {
    backgroundColor: 'white',
    width: 46,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    height: 46,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    backgroundColor: defaultColor,
    width: 46,
    height: 46,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(DraftList);
