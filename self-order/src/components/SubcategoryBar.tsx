import React, { memo } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IMenuCategory } from '@/src/types';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';

type Props = {
  childrenCats: IMenuCategory[];
  activeChildId?: string | null;
  onSelectChild: (child: IMenuCategory, index: number) => void;
};

export default memo(function SubcategoryBar({ childrenCats, activeChildId, onSelectChild }: Props) {
  const { theme } = useThemeStore();
  if (!childrenCats?.length) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {childrenCats.map((c, idx) => {
          const active = activeChildId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.pill, { backgroundColor: theme.backgroundSecondary }, active && { backgroundColor: theme.primary }]}
              onPress={() => onSelectChild(c, idx)}
              activeOpacity={0.75}
            >
              <Text style={[styles.label, { color: theme.textSecondary }, active && styles.labelActive]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  row: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  pillActive: {
    backgroundColor: defaultColor,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#444' },
  labelActive: { color: '#fff', fontWeight: '700' },
});
