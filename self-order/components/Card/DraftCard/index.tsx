import { CURRENCY } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import { IOrderItem } from '@/types';
import React from 'react';
import { FlatList, View, Image, StyleSheet } from 'react-native';
import { Text, FAB } from 'react-native-paper';

type Props = {
  items: IOrderItem[];
  increase: (uuid: string) => void;
  decrease: (uuid: string) => void;
};

export default function DraftList({ items, increase, decrease }: Props) {
  const renderItem = ({ item }: any) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
      }}
    >
      <Image
        source={item.image ? { uri: item.image } : require('../../../assets/images/noImage.jpg')}
        style={{ width: 64, height: 64, borderRadius: 8, marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
        <Text style={{ color: '#374151', fontSize: 16 }}>
          {item.price.toLocaleString()} {CURRENCY}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <FAB
          animated
          icon="minus"
          size="small"
          style={styles.secondfab}
          onPress={() => {
            decrease(item.uuid);
          }}
          color={defaultColor}
        />

        <Text style={{ fontSize: 16, color: '#555', fontWeight: '700' }}>{item.quantity}</Text>

        <FAB
          animated
          icon="plus"
          size="small"
          style={styles.fab}
          onPress={() => {
            increase(item.uuid);
          }}
          color="white"
        />
      </View>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.uuid}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 8, marginHorizontal: 14 }}
    />
  );
}
const styles = StyleSheet.create({
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
