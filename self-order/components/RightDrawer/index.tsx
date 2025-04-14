import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, Pressable } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.4;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const RightDrawer: React.FC<Props> = ({ visible, onClose, children }) => {
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <>
      {visible && <Pressable style={styles.overlay} onPress={onClose} />}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    elevation: 8,
    zIndex: 2,
    padding: 16,
  },
});

export default RightDrawer;
