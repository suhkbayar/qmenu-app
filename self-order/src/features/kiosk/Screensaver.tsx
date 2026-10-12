import { ReactNode, useCallback, useEffect, useState } from 'react';
import { AppState, Keyboard, StyleSheet, View } from 'react-native';
import { cn } from 'heroui-native';
import { useEventListener } from 'expo';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, { Easing, SlideInRight } from 'react-native-reanimated';
import { Image } from '@/src/ui/Image';
import { useActivity } from './activity';

/** One of the branch's tablet banners: a picture, or a video. */
export type Banner = { uri: string; video: boolean };

// The upload keeps its file name (…/<uuid>/promo.mp4), so a video banner is known by its extension
const VIDEO_FILE = /\.(mp4|m4v|mov|webm)$/i;

export const toBanner = (uri: string): Banner => ({ uri, video: VIDEO_FILE.test(uri.split('?')[0]) });

type Props = {
  children: ReactNode;
  /** The branch's banners; with none, the screensaver never shows */
  banners: Banner[];
  /** Idle time before the screensaver starts */
  delay?: number;
  /** Time each picture stays up; a video plays to its end */
  interval?: number;
  /** Shown over the slides while the screensaver is on (what to do) */
  overlay?: ReactNode;
};

const enter = SlideInRight.duration(800).easing(Easing.out(Easing.cubic));

/**
 * After a while without touches, covers the screen with a slideshow of the branch's banners: each
 * picture for `interval`, each video (muted) to its end. Any touch ends it.
 */
export const Screensaver = ({ children, banners, delay = 30000, interval = 8000, overlay }: Props) => {
  const [idle, setIdle] = useState(false);
  const [index, setIndex] = useState(0);

  // Restart the idle timer on any touch (dialogs included), on keyboard use and when the app comes back
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      clearTimeout(timer);
      setIdle(false);
      timer = setTimeout(() => setIdle(true), delay);
    };
    reset();
    const appState = AppState.addEventListener('change', reset);
    const keyboard = Keyboard.addListener('keyboardDidShow', reset);
    const unsubscribe = useActivity.subscribe(reset);
    return () => {
      clearTimeout(timer);
      appState.remove();
      keyboard.remove();
      unsubscribe();
    };
  }, [delay]);

  // Download the pictures ahead of time so each slide is ready when it comes up (videos are cached
  // the first time they play)
  useEffect(() => {
    const pictures = banners.filter((banner) => !banner.video).map((banner) => banner.uri);
    if (pictures.length) ExpoImage.prefetch(pictures);
  }, [banners]);

  const banner = banners.length ? banners[index % banners.length] : undefined;
  const next = useCallback(() => setIndex((i) => i + 1), []);

  // A picture moves on after `interval`; a video when it ends
  useEffect(() => {
    if (!idle || banners.length < 2 || banner?.video) return;
    const id = setTimeout(next, interval);
    return () => clearTimeout(id);
  }, [idle, index, banners.length, banner?.video, interval, next]);

  const showing = idle && !!banner;

  return (
    <View className={cn('flex-1', showing && 'bg-black')}>
      <View className={cn('flex-1', showing && 'opacity-0')}>{children}</View>
      {showing && (
        <Animated.View key={index} entering={enter} style={StyleSheet.absoluteFill}>
          {banner.video ? (
            // The only banner: it loops instead of moving on
            <VideoSlide uri={banner.uri} loop={banners.length < 2} retryAfter={interval} onEnd={next} />
          ) : (
            <Image source={{ uri: banner.uri }} className="size-full" contentFit="cover" />
          )}
        </Animated.View>
      )}
      {showing && overlay}
    </View>
  );
};

/**
 * A video banner, muted, from the start. Cached on the tablet after the first play, so it isn't
 * downloaded again every time the screensaver comes on. One that can't play moves on after
 * `retryAfter`, so a broken file doesn't hold up the slideshow (or reload over and over).
 */
const VideoSlide = ({
  uri,
  loop,
  retryAfter,
  onEnd,
}: {
  uri: string;
  loop: boolean;
  retryAfter: number;
  onEnd: () => void;
}) => {
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.muted = true;
    p.loop = loop;
    p.play();
  });

  useEventListener(player, 'playToEnd', onEnd);
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') setFailed(true);
  });

  useEffect(() => {
    if (!failed) return;
    const id = setTimeout(onEnd, retryAfter);
    return () => clearTimeout(id);
  }, [failed]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      // A texture moves with the slide-in animation; Android's default surface doesn't
      surfaceType="textureView"
    />
  );
};
