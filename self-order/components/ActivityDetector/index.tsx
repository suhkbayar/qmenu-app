import React, { useRef, useEffect, ReactNode } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';

interface ActivityDetectorProps {
  children: ReactNode;
  onActivity: () => void;
  excludeViews?: string[]; // Optional array of testIDs to exclude from activity detection
}

/**
 * A component that detects user activity on the screen and calls the onActivity callback
 * This is useful to help reset the screensaver timer when ANY interaction happens
 */
const ActivityDetector = ({ children, onActivity, excludeViews = [] }: ActivityDetectorProps) => {
  // Track last activity time
  const lastActivityTime = useRef<number>(Date.now());

  // Create a debounced version of onActivity to prevent excessive calls
  const debouncedOnActivity = () => {
    const now = Date.now();
    // Only trigger if at least 100ms has passed since the last activity
    // This prevents overwhelming the app with activity events
    if (now - lastActivityTime.current > 100) {
      lastActivityTime.current = now;
      onActivity();
    }
  };

  // Create pan responder to detect any touch activity
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: debouncedOnActivity,
      onPanResponderMove: debouncedOnActivity,
      onPanResponderRelease: debouncedOnActivity,
    }),
  ).current;

  // Detect scroll, touch, and other interactions
  const handleInteraction = (event: GestureResponderEvent) => {
    // Check if the event originated from an excluded view
    const target = event.target as any;
    if (target && excludeViews.includes(target.testID)) {
      return false;
    }

    debouncedOnActivity();
    return false; // Allow the event to continue to children
  };

  // Setup event listeners for keyboard/input activity
  useEffect(() => {
    // Create listeners for text input focus, keyboard events, etc.
    const cleanup = () => {
      // Clean up any event listeners if needed
    };

    return cleanup;
  }, []);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ActivityDetector;
