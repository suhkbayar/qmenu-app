import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ImageSourcePropType,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  AppState,
  Keyboard,
} from 'react-native';

interface ScreensaverWrapperProps {
  children: React.ReactNode;
  images: ImageSourcePropType[];
  delay?: number;
  interval?: number;
}

export default function ScreensaverWrapper({
  children,
  images,
  delay = 30000,
  interval = 5000,
}: ScreensaverWrapperProps) {
  const [isInactive, setIsInactive] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  const slideshowInterval = useRef<NodeJS.Timeout | null>(null);
  const idleTimeout = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (idleTimeout.current) {
      clearTimeout(idleTimeout.current);
    }
    if (isInactive) {
      setIsInactive(false);
      stopSlideshow();
    }

    idleTimeout.current = setTimeout(() => {
      setIsInactive(true);
      startSlideshow();
    }, delay);
  };

  useEffect(() => {
    resetTimer();

    const appStateListener = AppState.addEventListener('change', resetTimer);
    const keyboardListener = Keyboard.addListener('keyboardDidShow', resetTimer);

    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      if (slideshowInterval.current) clearInterval(slideshowInterval.current);
      appStateListener.remove();
      keyboardListener.remove();
    };
  }, []);

  // Detect pan (swipe / scroll) without blocking touch events
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => resetTimer(),
      onPanResponderMove: () => resetTimer(),
      onPanResponderRelease: () => resetTimer(),
      onShouldBlockNativeResponder: () => false, // <- important
    }),
  ).current;

  const startSlideshow = () => {
    if (images.length === 0) return;
    setIsImageLoaded(false);

    slideshowInterval.current = setInterval(() => {
      setIsImageLoaded(false);
      setImageIndex((prev) => (prev + 1) % images.length);
    }, interval);
  };

  const stopSlideshow = () => {
    if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
  };

  const animateImage = () => {
    opacityAnim.setValue(0);
    translateXAnim.setValue(Dimensions.get('window').width);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateXAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

  useEffect(() => {
    if (isInactive && isImageLoaded) {
      animateImage();
    }
  }, [imageIndex, isImageLoaded, isInactive]);

  const handleTouch = (event: GestureResponderEvent) => {
    resetTimer();
  };

  if (images.length === 0) return <View style={{ flex: 1 }}>{children}</View>;

  return (
    <View style={styles.container} {...panResponder.panHandlers} onTouchStart={handleTouch}>
      {/* Main App Content */}
      <View style={[styles.contentContainer, isInactive && styles.hidden]}>{children}</View>

      {/* Screensaver */}
      {isInactive && (
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={handleTouch}
        >
          <Animated.Image
            source={images[imageIndex]}
            onLoad={() => setIsImageLoaded(true)}
            style={[
              StyleSheet.absoluteFillObject,
              styles.screensaverImage,
              {
                opacity: isImageLoaded ? opacityAnim : 0,
                transform: [{ translateX: translateXAnim }],
              },
            ]}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  hidden: {
    opacity: 0,
  },
  screensaverImage: {
    width: '100%',
    height: '100%',
  },
});
