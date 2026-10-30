import { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  /** fade (default); zoom: also grows from 85%; right: slides in from the right edge; top: fades in sliding down a little */
  from?: 'fade' | 'zoom' | 'right' | 'top';
  duration?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Its content animates in once, as it appears. Driven by a shared value rather than Reanimated's
 * entering layout animations: one of those left the order sheet off screen, and they were running
 * when tablets went to a blank screen they couldn't leave. However the animation goes, a timer
 * makes sure it ends fully shown.
 */
export const Appear = ({ from = 'fade', duration = 200, className, style, children }: Props) => {
  const { width } = useWindowDimensions();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(() => (shown.value = 1), duration + 150);
    return () => clearTimeout(id);
  }, [duration, shown]);

  const animated = useAnimatedStyle(() => {
    if (from === 'right') return { transform: [{ translateX: (1 - shown.value) * width }] };
    if (from === 'zoom') return { opacity: shown.value, transform: [{ scale: 0.85 + 0.15 * shown.value }] };
    if (from === 'top') return { opacity: shown.value, transform: [{ translateY: (shown.value - 1) * 24 }] };
    return { opacity: shown.value };
  });

  return (
    <Animated.View className={className} style={[style, animated]}>
      {children}
    </Animated.View>
  );
};
