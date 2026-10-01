import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { EmojiAnim } from '@/src/constants';

const DURATION: Record<EmojiAnim, number> = {
  beat: 620,
  shake: 260,
  pop: 800,
  float: 1100,
};

type Props = {
  emoji: string;
  anim: EmojiAnim;
  size?: number;
  delay?: number;
};

const AnimatedEmoji = ({ emoji, anim, size = 46, delay = 0 }: Props) => {
  const v = useSharedValue(0);

  useEffect(() => {
    const start = setTimeout(() => {
      v.value = withRepeat(withTiming(1, { duration: DURATION[anim], easing: Easing.inOut(Easing.quad) }), -1, true);
    }, delay);

    return () => {
      clearTimeout(start);
      cancelAnimation(v);
    };
  }, [anim, delay]);

  const style = useAnimatedStyle(() => {
    const p = v.value;
    switch (anim) {
      case 'beat':
        return { transform: [{ scale: 1 + p * 0.24 }] };
      case 'shake':
        return { transform: [{ rotate: `${-11 + p * 22}deg` }] };
      case 'pop':
        return { transform: [{ scale: 1 + p * 0.2 }, { rotate: `${-6 + p * 12}deg` }] };
      case 'float':
      default:
        return { transform: [{ translateY: -p * 9 }] };
    }
  });

  return <Animated.Text style={[{ fontSize: size, lineHeight: size * 1.25 }, style]}>{emoji}</Animated.Text>;
};

export default AnimatedEmoji;
