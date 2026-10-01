import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageSourcePropType, Animated, Easing, Dimensions, AppState, Keyboard } from 'react-native';

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

  const slideshowInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const resetTimer = useCallback(() => {
    if (idleTimeout.current) clearTimeout(idleTimeout.current);
    stopSlideshow();
    setIsInactive(false);

    idleTimeout.current = setTimeout(() => {
      setIsInactive(true);
      startSlideshow();
    }, delay);
  }, [delay]);

  const resetRef = useRef(resetTimer);
  useEffect(() => {
    resetRef.current = resetTimer;
  }, [resetTimer]);

  useEffect(() => {
    const reset = () => resetRef.current();
    reset();
    const appStateListener = AppState.addEventListener('change', reset);
    const keyboardListener = Keyboard.addListener('keyboardDidShow', reset);
    return () => {
      if (idleTimeout.current) clearTimeout(idleTimeout.current);
      if (slideshowInterval.current) clearInterval(slideshowInterval.current);
      appStateListener.remove();
      keyboardListener.remove();
    };
  }, []);

  const startSlideshow = () => {
    if (imagesRef.current.length === 0) return;
    setIsImageLoaded(false);
    if (imagesRef.current.length === 1) return; // stay on single image, no cycling
    slideshowInterval.current = setInterval(() => {
      setIsImageLoaded(false);
      setImageIndex((prev) => (prev + 1) % imagesRef.current.length);
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
    if (isInactive && isImageLoaded) animateImage();
  }, [imageIndex, isImageLoaded, isInactive]);

  const handleTouch = () => resetTimer();

  const showScreensaver = isInactive && images.length > 0;

  return (
    <View style={[styles.container, showScreensaver && styles.containerActive]} onTouchStart={handleTouch}>
      <View style={[styles.contentContainer, showScreensaver && styles.hidden]}>{children}</View>
      {showScreensaver && (
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={handleTouch}
        >
          <Animated.Image
            key={imageIndex}
            source={images[imageIndex]}
            onLoad={() => setIsImageLoaded(true)}
            style={[
              StyleSheet.absoluteFillObject,
              styles.screensaverImage,
              { opacity: isImageLoaded ? opacityAnim : 0, transform: [{ translateX: translateXAnim }] },
            ]}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerActive: { backgroundColor: 'black' },
  contentContainer: { flex: 1 },
  hidden: { opacity: 0 },
  screensaverImage: { width: '100%', height: '100%' },
});
