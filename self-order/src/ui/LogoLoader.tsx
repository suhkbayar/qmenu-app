import { useEffect } from 'react';
import { View } from 'react-native';
import { cn } from 'heroui-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Image } from './Image';

// The QMenu logo's red
const BRAND_RED = '#EB1833';
const RING_TRACK = 'rgba(235, 24, 51, 0.12)';

type Props = {
  /** Outer size in dp (the circling arc); the logo sits inside it */
  size?: number;
  /** Placement only, e.g. margins */
  className?: string;
};

/**
 * The QMenu logo with a red arc circling it, for whole screens or sections that are loading.
 * Drawn natively and turned on the UI thread, so it stays sharp and smooth even while the app is
 * busy (an animated GIF was grainy and stuttered). Buttons keep a Spinner.
 */
export const LogoLoader = ({ size = 96, className }: Props) => {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const stroke = Math.max(3, Math.round(size / 28));

  return (
    <View
      accessibilityRole="progressbar"
      className={cn('items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: RING_TRACK,
            borderTopColor: BRAND_RED,
          },
          ringStyle,
        ]}
      />
      {/* The logo file has 20% empty margin, so at 90% of the ring it sits well inside it */}
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={{ width: size * 0.9, height: size * 0.9 }}
        contentFit="contain"
      />
    </View>
  );
};
