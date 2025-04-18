import { CURRENCY } from '@/constants';
import { defaultColor } from '@/constants/Colors';
import { IOrderItem } from '@/types';
import React from 'react';
import { FlatList, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';

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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity
          onPress={() => {
            decrease(item.uuid);
          }}
          style={[styles.button, styles.buttonWhite]}
        >
          <Icon source="minus" color={defaultColor} size={16} />
        </TouchableOpacity>

        <Text style={{ fontSize: 16, color: '#555', fontWeight: '600' }}>{item.quantity}</Text>
        <TouchableOpacity
          onPress={() => {
            increase(item.uuid);
          }}
          style={styles.fullAddButton}
        >
          <Icon source="plus" color="#fff" size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.uuid}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 8 }}
    />
  );
}
const styles = StyleSheet.create({
  fullAddButton: {
    backgroundColor: defaultColor,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  buttonWhite: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: defaultColor,
  },
});
