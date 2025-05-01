import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons'; // or 'react-native-vector-icons/Ionicons'
import { useCallStore } from '@/cache/cart.store';
import { defaultColor } from '@/constants/Colors';
import { IMenuCategory } from '@/types';

type Props = {
  categories: IMenuCategory[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

const Sidebar = ({ categories, activeIndex, onSelect }: Props) => {
  const { participant } = useCallStore();
  // console.log('Sidebar activeIndex:', activeIndex);
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    setShowScrollTop(y > 10); // Show scroll-to-top if not at the top
    setShowScrollBottom(y + layoutHeight < contentHeight - 10); // Show scroll-to-bottom if not at the bottom
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.sidebar}>
      <View style={{ padding: 10 }}>
        <View style={styles.logoContainer}>
          <Image source={{ uri: participant?.branch?.logo }} style={styles.logo} resizeMode="cover" />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity style={[styles.scrollButton, { top: 238 }]} onPress={scrollToTop}>
          <Ionicons name="arrow-up-circle" size={30} color="#888" />
        </TouchableOpacity>
      )}

      {/* Scroll to Bottom Button */}
      {showScrollBottom && (
        <TouchableOpacity style={[styles.scrollButton, { bottom: 10 }]} onPress={scrollToBottom}>
          <Ionicons name="arrow-down-circle" size={30} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: '#f3f4f6',
    borderTopRightRadius: 19,
    borderBottomRightRadius: 19,
    position: 'relative',
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 60, // So button doesn't block last item
  },
  scrollButton: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -15 }], // Half of icon size (30/2) to center it perfectly
    zIndex: 10,
  },

  logoContainer: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  logo: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  itemContainer: {
    width: '100%',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  activeItem: {
    backgroundColor: defaultColor,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  itemContent: {
    alignItems: 'center',
  },
  label: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'right',
  },
  activeLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'right',
  },
});

export default Sidebar;
