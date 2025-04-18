import { useCallStore } from '@/cache/cart.store';
import { defaultColor } from '@/constants/Colors';
import { IMenuCategory } from '@/types';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';

type Props = {
  categories: IMenuCategory[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

const Sidebar = ({ categories, activeIndex, onSelect }: Props) => {
  const { participant } = useCallStore();

  return (
    <View style={styles.sidebar}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: participant?.branch?.logo }} style={styles.logo} resizeMode="contain" />
        </View>
        {categories.map((item, idx) => {
          const isActive = activeIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onSelect(idx)}
              style={[styles.itemContainer, isActive && styles.activeItem]}
              activeOpacity={0.8}
            >
              <View style={styles.itemContent}>
                <Text style={[styles.label, isActive && styles.activeLabel]}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 140,
    backgroundColor: '#f3f4f6',
  },
  scroll: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  itemContainer: {
    width: 110,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  activeItem: {
    backgroundColor: defaultColor,
    borderRadius: 8,
  },
  itemContent: {
    alignItems: 'center',
  },
  iconBox: {
    backgroundColor: '#1f2a38',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  label: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  activeLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
    right: -6,
    top: '120%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#f5f5f5',
    transform: [{ rotate: '180deg' }],
  },
});

export default Sidebar;
