import { useRef } from 'react';
import LottieView, { type AnimationObject } from 'lottie-react-native';

/**
 * Google's Noto Animated Emoji (CC BY 4.0, credited in the admin dialog) as Lottie: vector, so sharp
 * at any size and the same on every tablet. Each file is loaded the first time it's shown.
 */
const SOURCES: Record<string, () => AnimationObject> = {
  ACQUAINT: () => require('@/assets/stickers/smiling.json'),
  FORYOU: () => require('@/assets/stickers/champagne.json'),
  SMILE: () => require('@/assets/stickers/wink.json'),
  PARTY: () => require('@/assets/stickers/party-popper.json'),
  BIRTHDAY: () => require('@/assets/stickers/birthday-cake.json'),
  THANKS: () => require('@/assets/stickers/smiling-hearts.json'),
  LETSMEET: () => require('@/assets/stickers/grinning.json'),
  // For a gift or message that came without a sticker
  GIFT: () => require('@/assets/stickers/wrapped-gift.json'),
  LETTER: () => require('@/assets/stickers/love-letter.json'),
};

type Props = {
  /** A TABLE_MESSAGE_STICKERS id, or GIFT / LETTER. An id this app doesn't know shows the gift. */
  id: string;
  size?: number;
  /** How many times it plays when it appears, then it rests; 0 shows it still */
  plays?: number;
};

/** A sticker emoji: still, or played a few times. Never loops, so it doesn't keep the tablet redrawing. */
export const Sticker = ({ id, size = 48, plays = 0 }: Props) => {
  const ref = useRef<LottieView>(null);
  const left = useRef(plays);

  return (
    <LottieView
      ref={ref}
      source={(SOURCES[id] ?? SOURCES.GIFT)()}
      autoPlay={plays > 0}
      loop={false}
      progress={plays > 0 ? undefined : 0}
      onAnimationFinish={(cancelled) => {
        left.current -= 1;
        if (!cancelled && left.current > 0) ref.current?.play();
      }}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
};
