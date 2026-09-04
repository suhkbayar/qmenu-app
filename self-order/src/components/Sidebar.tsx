import React, { useRef, useState, useEffect, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useCallStore } from '@/src/store/cart.store';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import { IMenuCategory } from '@/src/types';

type Props = {
  categories: IMenuCategory[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
};

const Sidebar = memo(({ categories, activeCategoryId, onSelect }: Props) => {
  const participant = useCallStore((s) => s.participant);
  const { theme } = useThemeStore();
  const scrollRef = useRef<ScrollView>(null);
  const itemOffsetsRef = useRef<Record<string, number>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
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
    <View style={[styles.sidebar, { backgroundColor: theme.sidebarBackground }]}>
      <View style={{ padding: 10 }}>
        <View style={[styles.logoContainer, { backgroundColor: theme.card }]}>
          <Image source={{ uri: participant?.branch?.logo }} style={styles.logo} resizeMode="cover" />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {categories.map((item) => {
          const isActive = activeCategoryId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelect(item.id)}
              onLayout={(e) => {
                itemOffsetsRef.current[item.id] = e.nativeEvent.layout.y;
              }}
              style={[styles.item, isActive && { backgroundColor: theme.primary, borderTopRightRadius: 12, borderBottomRightRadius: 12 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.label, { color: theme.text }, isActive && styles.activeLabel]}>{item.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollBtn, { top: 250 }]}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        >
          <Ionicons name="arrow-up-circle" size={34} color={theme.textMuted} />
        </TouchableOpacity>
      )}
      {showScrollBottom && (
        <TouchableOpacity
          style={[styles.scrollBtn, { bottom: 10 }]}
          onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Ionicons name="arrow-down-circle" size={34} color={theme.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default Sidebar;

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    borderBottomRightRadius: 19,
    position: 'relative',
  },
  scroll: { alignItems: 'center', paddingBottom: 60 },
  scrollBtn: { position: 'absolute', left: '50%', transform: [{ translateX: -17 }], zIndex: 10 },
  logoContainer: {
    width: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    elevation: 4,
  },
  logo: { width: '100%', height: 230, borderRadius: 12 },
  item: {
    width: '100%',
    marginBottom: 22,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeItem: { backgroundColor: defaultColor, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  label: { fontWeight: 'bold', fontSize: 20, textAlign: 'center' },
  activeLabel: { color: 'white', fontWeight: 'bold', fontSize: 20, textAlign: 'center' },
});
