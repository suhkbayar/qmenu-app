import { CURRENCY } from '@/src/constants';
import { defaultColor } from '@/src/constants/Colors';
import { IOrderItem } from '@/src/types';
import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useThemeStore } from '@/src/store/theme.store';

type Props = {
  items: IOrderItem[];
  increase: (uuid: string) => void;
  decrease: (uuid: string) => void;
};

const OrderListItem = memo(
  ({ item, onIncrease, onDecrease }: { item: IOrderItem; onIncrease: () => void; onDecrease: () => void }) => {
    const { theme } = useThemeStore();
    const imageSource = useMemo(
      () => (item.image ? { uri: item.image } : require('../../../assets/images/noImage.jpg')),
      [item.image],
    );
    const formattedPrice = useMemo(() => `${item.price.toLocaleString()} ${CURRENCY}`, [item.price]);

    return (
      <View style={styles.item}>
        <Image
          source={imageSource}
          style={styles.image}
          defaultSource={require('../../../assets/images/noImage.jpg')}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.price, { color: theme.textSecondary }]}>{formattedPrice}</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity activeOpacity={10} onPress={onDecrease}>
            <FAB animated={false} icon="minus" size="small" style={[styles.fabOutline, { backgroundColor: theme.card, borderColor: theme.border }]} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}</Text>
          <TouchableOpacity activeOpacity={10} onPress={onIncrease}>
            <FAB animated={false} icon="plus" size="small" style={[styles.fab, { backgroundColor: theme.primary }]} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const DraftList = ({ items, increase, decrease }: Props) => {
  const keyExtractor = useCallback((item: IOrderItem) => item.uuid, []);

  const renderItem = useCallback(
    ({ item }: { item: IOrderItem }) => (
      <OrderListItem item={item} onIncrease={() => increase(item.uuid)} onDecrease={() => decrease(item.uuid)} />
    ),
    [increase, decrease],
  );

  const getItemLayout = useCallback((_: any, index: number) => ({ length: 88, offset: 88 * index, index }), []);

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: { paddingVertical: 8, marginHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  info: { flex: 1 },
  name: { fontWeight: 'bold', fontSize: 16 },
  price: { color: '#374151', fontSize: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qty: { fontSize: 16, color: '#555', fontWeight: '700' },
  fabOutline: {
    backgroundColor: 'white',
    width: 46,
    height: 46,
    borderRadius: 999,
    borderColor: '#f0f0f0',
    borderWidth: 1,
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
