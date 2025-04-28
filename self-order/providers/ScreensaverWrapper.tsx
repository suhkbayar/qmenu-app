import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  ImageSourcePropType,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';

interface ScreensaverWrapperProps {
  children: React.ReactNode;
  images: ImageSourcePropType[]; // accepts { uri: string } or require()
  delay?: number; // optional inactivity time before screensaver
  interval?: number; // optional image switch time
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

  // Animation references
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  // Timers
  const inactivityTimeout = useRef<number | null>(null);
  const slideshowInterval = useRef<number | null>(null);

  // Activity tracking
  const isUserActive = useRef<boolean>(true);
  const lastActivityTimestamp = useRef<number>(Date.now());

  // Function to handle user activity
  const handleUserActivity = () => {
    // Record activity time
    lastActivityTimestamp.current = Date.now();
    isUserActive.current = true;

    // If screensaver is active, disable it
    if (isInactive) {
      setIsInactive(false);
      stopSlideshow();
    }

    // Clear any existing timeout
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
      inactivityTimeout.current = null;
    }

    // Set new timeout to start tracking inactivity
    inactivityTimeout.current = setTimeout(() => {
      // Only mark as inactive if there was truly no activity
      if (Date.now() - lastActivityTimestamp.current >= delay) {
        isUserActive.current = false;
        setIsInactive(true);
        startSlideshow();
      }
    }, delay);
  };

  // Create pan responder to detect any gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleUserActivity,
      onPanResponderMove: handleUserActivity,
      onPanResponderRelease: handleUserActivity,
    }),
  ).current;

  // Animate image with fadeInRight effect
  const animateImage = () => {
    // Reset animation values
    opacityAnim.setValue(0);
    translateXAnim.setValue(Dimensions.get('window').width);

    // Run parallel animations
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

  // Start slideshow
  const startSlideshow = () => {
    if (images.length === 0) return;

    // Set initial image
    setIsImageLoaded(false);

    // Set up interval for image rotation
    slideshowInterval.current = setInterval(() => {
      // Only change image if user is still inactive
      if (!isUserActive.current) {
        setIsImageLoaded(false);
        setImageIndex((prev) => (prev + 1) % images.length);
      } else {
        // If user became active, stop slideshow
        stopSlideshow();
      }
    }, interval);
  };

  // Stop slideshow
  const stopSlideshow = () => {
    if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
  };

  // Listen for touch events anywhere in the app
  const onTouchEvent = (event: GestureResponderEvent) => {
    handleUserActivity();
    return false; // Allow the event to continue to children
  };

  // Set up and clean up
  useEffect(() => {
    // Start tracking inactivity
    handleUserActivity();

    // Listen for dimension changes
    const dimensionHandler = Dimensions.addEventListener('change', () => {
      if (!isImageLoaded || !isInactive) {
        translateXAnim.setValue(Dimensions.get('window').width);
      }
    });

    // Clean up
    return () => {
      if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
      if (slideshowInterval.current) clearInterval(slideshowInterval.current);
      dimensionHandler.remove();
    };
  }, []);

  // Watch for image changes to trigger animation
  useEffect(() => {
    if (isInactive && isImageLoaded) {
      animateImage();
    }
  }, [imageIndex, isImageLoaded, isInactive]);

  // Return early if no images
  if (images.length === 0) return <View style={{ flex: 1 }}>{children}</View>;

  return (
    <TouchableWithoutFeedback onPress={handleUserActivity}>
      <View
        style={styles.container}
        {...panResponder.panHandlers}
        onTouchStart={onTouchEvent}
        onTouchMove={onTouchEvent}
        onTouchEnd={onTouchEvent}
      >
        {/* Main app content */}
        <View style={[styles.contentContainer, isInactive && styles.hidden]}>{children}</View>

        {/* Screensaver overlay */}
        {isInactive && (
          <Animated.Image
            source={images[imageIndex]}
            onLoad={() => {
              setIsImageLoaded(true);
            }}
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
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black', // ensures black background always
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
