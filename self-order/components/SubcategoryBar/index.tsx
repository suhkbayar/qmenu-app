import React from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IMenuCategory } from '@/types';

type Props = {
  childrenCats: IMenuCategory[];
  activeChildId?: string | null;
  onSelectChild: (child: IMenuCategory, index: number) => void;
};

export default function SubcategoryBar({ childrenCats, activeChildId, onSelectChild }: Props) {
  if (!childrenCats?.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {childrenCats.map((c, idx) => {
          const active = activeChildId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.item, active && styles.active]}
              onPress={() => onSelectChild(c, idx)}
            >
              <Text style={[styles.text, active && styles.activeText]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8, backgroundColor: '#fff' },
  row: { paddingHorizontal: 8, gap: 8 },
  item: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f0f0f0' },
  active: { backgroundColor: '#222' },
  text: { fontSize: 14, color: '#333' },
  activeText: { color: '#fff', fontWeight: '600' },
});
