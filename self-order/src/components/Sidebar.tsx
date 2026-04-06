import React, { useRef, useState, useEffect, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '@/src/store/cart.store';
import { defaultColor } from '@/src/constants/Colors';
import { IMenuCategory } from '@/src/types';

type Props = {
  categories: IMenuCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
};

const Sidebar = memo(({ categories, activeCategoryId, onSelect }: Props) => {
  const { participant } = useCallStore();
  const scrollRef = useRef<ScrollView>(null);
  const itemOffsetsRef = useRef<Record<string, number>>({});
  const [showScrollTop,    setShowScrollTop]    = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  useEffect(() => {
    if (!activeCategoryId) return;
    const y = itemOffsetsRef.current[activeCategoryId];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
    }
  }, [activeCategoryId]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    setShowScrollTop(y > 10);
    setShowScrollBottom(y + layoutHeight < contentHeight - 10);
  };

  return (
    <View style={styles.sidebar}>
      <View style={{ padding: 10 }}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: participant?.branch?.logo }} style={styles.logo} resizeMode="cover" />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} onScroll={handleScroll} scrollEventThrottle={16}>
        {categories.map((item) => {
          const isActive = activeCategoryId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelect(item.id)}
              onLayout={(e) => { itemOffsetsRef.current[item.id] = e.nativeEvent.layout.y; }}
              style={[styles.item, isActive && styles.activeItem]}
              activeOpacity={0.8}
            >
              <Text style={[styles.label, isActive && styles.activeLabel]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showScrollTop && (
        <TouchableOpacity style={[styles.scrollBtn, { top: 238 }]} onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}>
          <Ionicons name="arrow-up-circle" size={30} color="#888" />
        </TouchableOpacity>
      )}
      {showScrollBottom && (
        <TouchableOpacity style={[styles.scrollBtn, { bottom: 10 }]} onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <Ionicons name="arrow-down-circle" size={30} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default Sidebar;

const styles = StyleSheet.create({
  sidebar:       { width: 260, backgroundColor: '#f3f4f6', borderTopRightRadius: 19, borderBottomRightRadius: 19, position: 'relative' },
  scroll:        { alignItems: 'center', paddingBottom: 60 },
  scrollBtn:     { position: 'absolute', left: '50%', transform: [{ translateX: -15 }], zIndex: 10 },
  logoContainer: { width: '100%', borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 4 },
  logo:          { width: '100%', height: 220, borderRadius: 10 },
  item:          { width: '100%', marginBottom: 20, paddingVertical: 16, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  activeItem:    { backgroundColor: defaultColor, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  label:         { color: '#333', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  activeLabel:   { color: 'white', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
});
