import { ReactNode, useEffect, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Dialog, cn } from 'heroui-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const OPEN_MS = 220;
const CLOSE_MS = 160;

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tapping the dim backdrop closes it (the default) */
  closeOnBackdrop?: boolean;
  /** The card's classes: width, padding, gap, layout */
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A dialog that fades in and grows a little as it opens, and fades out before it goes. heroui's
 * Dialog does the rest (portal, back button, Dialog.Title and friends) with its own open and close
 * animation off: that one is a layout animation, which on the tablets left dialogs stuck on screen
 * and crashed the app ("addViewAt: failed to insert view"). This runs on a shared value, on views
 * that stay put, and a timer makes sure it always ends fully open or fully gone.
 */
export const MotionDialog = ({ isOpen, onOpenChange, closeOnBackdrop = true, className, style, children }: Props) => {
  // Stays mounted while it fades out
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);

  const progress = useSharedValue(0);
  useEffect(() => {
    if (isOpen) {
      progress.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
      const id = setTimeout(() => (progress.value = 1), OPEN_MS + 150);
      return () => clearTimeout(id);
    }
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.quad) });
    const id = setTimeout(() => setMounted(false), CLOSE_MS + 20);
    return () => clearTimeout(id);
  }, [isOpen, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const card = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.96 + 0.04 * progress.value }],
  }));

  // While it fades out it no longer takes taps, so a quick second tap reaches what's underneath
  const pointerEvents = isOpen ? 'auto' : 'none';

  return (
    <Dialog isOpen={mounted} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          animation={false}
          isAnimatedStyleActive={false}
          isCloseOnPress={closeOnBackdrop}
          pointerEvents={pointerEvents}
          // heroui draws the backdrop with a Reanimated component, so an animated style works; its
          // props are just typed for plain styles
          style={backdrop as unknown as ViewStyle}
        />
        <Dialog.Content
          animation={false}
          isSwipeable={false}
          background={null}
          className="self-center bg-transparent p-0"
          pointerEvents="box-none"
        >
          {/* heroui's card look (dialog__content), on the animated layer */}
          <Animated.View
            pointerEvents={pointerEvents}
            className={cn('rounded-3xl bg-overlay p-5', className)}
            style={[style, card]}
          >
            {children}
          </Animated.View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
