import React, { useRef, ReactNode } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';

interface Props {
  children: ReactNode;
  onActivity: () => void;
  excludeViews?: string[];
}

const ActivityDetector = ({ children, onActivity, excludeViews = [] }: Props) => {
  const lastActivityTime = useRef(Date.now());

  const debouncedOnActivity = () => {
    const now = Date.now();
    if (now - lastActivityTime.current > 100) {
      lastActivityTime.current = now;
      onActivity();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: debouncedOnActivity,
      onPanResponderMove: debouncedOnActivity,
      onPanResponderRelease: debouncedOnActivity,
    }),
  ).current;

  const handleInteraction = (event: GestureResponderEvent) => {
    const target = event.target as any;
    if (target && excludeViews.includes(target.testID)) return false;
    debouncedOnActivity();
    return false;
  };

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
      onTouchStart={handleInteraction}
      onTouchMove={handleInteraction}
      onTouchEnd={handleInteraction}
    >
      {children}
    </View>
  );
};

export default ActivityDetector;

const styles = StyleSheet.create({ container: { flex: 1 } });
