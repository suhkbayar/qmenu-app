import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  cancelAnimation,
  interpolate,
  Easing,
} from 'react-native-reanimated';

type Props = {
  emoji: string;
  count?: number;
  radius?: number;
};

const Particle = ({
  emoji,
  angle,
  distance,
  size,
  delay,
}: {
  emoji: string;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(p);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.7, 1], [0, 1, 0.9, 0]),
    transform: [
      { translateX: Math.cos(angle) * distance * p.value },
      { translateY: Math.sin(angle) * distance * p.value + interpolate(p.value, [0, 1], [0, 26]) },
      { scale: interpolate(p.value, [0, 0.2, 1], [0.3, 1, 0.65]) },
      { rotate: `${interpolate(p.value, [0, 1], [0, angle > 0 ? 90 : -90])}deg` },
    ],
  }));

  return <Animated.Text style={[styles.particle, { fontSize: size }, style]}>{emoji}</Animated.Text>;
};

const EmojiBurst = ({ emoji, count = 12, radius = 150 }: Props) => (
  <View pointerEvents="none" style={styles.wrap}>
    {Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.22;
      const distance = radius * (0.55 + ((i * 37) % 45) / 100);
      const size = 18 + ((i * 13) % 16);
      return <Particle key={i} emoji={emoji} angle={angle} distance={distance} size={size} delay={i * 28} />;
    })}
  </View>
);

export default EmojiBurst;

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
});
