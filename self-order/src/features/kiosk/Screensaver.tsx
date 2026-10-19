import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Keyboard, StyleSheet, View } from 'react-native';
import { cn } from 'heroui-native';
import { useEventListener } from 'expo';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import Animated, { Easing, SlideInRight } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { Image } from '@/src/ui/Image';
import { useActivity } from './activity';

/**
 * One of the branch's tablet banners: a picture, a video file, or a YouTube video, each by its
 * link (a video is linked from wherever it's hosted, not uploaded).
 */
export type Banner =
  | { uri: string; kind: 'image' }
  | { uri: string; kind: 'video' }
  | { uri: string; kind: 'youtube'; youtubeId: string };

// A video file is known by its extension
const VIDEO_FILE = /\.(mp4|m4v|mov|webm)$/i;
// A YouTube link in any of its forms (watch, youtu.be, shorts, embed, live): the 11-character id
const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i;

export const toBanner = (uri: string): Banner => {
  const youtubeId = uri.match(YOUTUBE_ID)?.[1];
  if (youtubeId) return { uri, kind: 'youtube', youtubeId };
  return { uri, kind: VIDEO_FILE.test(uri.split(/[?#]/)[0]) ? 'video' : 'image' };
};

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
  /** Video banners play with sound, at a low volume (the branch's BANNER_SOUND setting); muted otherwise */
  sound?: boolean;
};

// Low enough to be background in a restaurant, with several tablets playing at once
const BANNER_VOLUME = 0.35;

const enter = SlideInRight.duration(800).easing(Easing.out(Easing.cubic));

/**
 * After a while without touches, covers the screen with a slideshow of the branch's banners: each
 * picture for `interval`, each video (a file or YouTube; muted unless banner sound is on) to its
 * end. Any touch ends it.
 */
export const Screensaver = ({ children, banners, delay = 30000, interval = 8000, overlay, sound = false }: Props) => {
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

  // Download the pictures ahead of time so each slide is ready when it comes up (video files are
  // cached the first time they play; YouTube streams each time)
  useEffect(() => {
    const pictures = banners.filter((banner) => banner.kind === 'image').map((banner) => banner.uri);
    if (pictures.length) ExpoImage.prefetch(pictures);
  }, [banners]);

  const banner = banners.length ? banners[index % banners.length] : undefined;
  const next = useCallback(() => setIndex((i) => i + 1), []);
  const isPicture = banner?.kind === 'image';

  // A picture moves on after `interval`; a video when it ends
  useEffect(() => {
    if (!idle || banners.length < 2 || !isPicture) return;
    const id = setTimeout(next, interval);
    return () => clearTimeout(id);
  }, [idle, index, banners.length, isPicture, interval, next]);

  const showing = idle && !!banner;
  // The only banner: a video loops instead of moving on
  const loop = banners.length < 2;

  return (
    <View className={cn('flex-1', showing && 'bg-black')}>
      <View className={cn('flex-1', showing && 'opacity-0')}>{children}</View>
      {showing && (
        <Animated.View key={index} entering={enter} style={StyleSheet.absoluteFill}>
          {banner.kind === 'video' ? (
            <VideoSlide uri={banner.uri} loop={loop} sound={sound} retryAfter={interval} onEnd={next} />
          ) : banner.kind === 'youtube' ? (
            <YouTubeSlide id={banner.youtubeId} loop={loop} sound={sound} retryAfter={interval} onEnd={next} />
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
 * A video banner from the start, muted unless the branch turned banner sound on. Cached on the
 * tablet after the first play, so it isn't downloaded again every time the screensaver comes on.
 * One that can't play moves on after `retryAfter`, so a broken file doesn't hold up the slideshow
 * (or reload over and over). A touch ends the screensaver, and the sound with it.
 */
const VideoSlide = ({
  uri,
  loop,
  sound,
  retryAfter,
  onEnd,
}: {
  uri: string;
  loop: boolean;
  sound: boolean;
  retryAfter: number;
  onEnd: () => void;
}) => {
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.muted = !sound;
    p.volume = BANNER_VOLUME;
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

// The page the YouTube player runs on says it's from here: YouTube refuses to play embeds that
// don't say where they're embedded
const YOUTUBE_ORIGIN = 'https://qmenu.mn';

/**
 * The YouTube player (its IFrame API) as just the video: no controls, no captions, starting at
 * once, unmuted at the banner volume when banner sound is on. Tells the app when the video ends,
 * or loops it as the only banner, and when it can't play.
 *
 * YouTube draws its own things along the player's edges (the title and channel along the top, its
 * logo and the info icon in the corners), and none of them can be turned off any more. So the
 * player covers the screen and is drawn a fifth larger than it, which puts those edges off screen,
 * and stays hidden until the video is playing (before that it shows the title and a play button).
 */
const youtubeHtml = (id: string, sound: boolean, loop: boolean) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden}
#player{position:absolute;top:50%;left:50%;
  width:max(100vw,calc(100vh*16/9));height:max(100vh,calc(100vw*9/16));
  transform:translate(-50%,-50%) scale(1.2);opacity:0;transition:opacity .4s;pointer-events:none}
</style>
</head><body><div id="player"></div><script>
var post = function (message) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(message); };
var player = null;
// Seen only while the video plays: stopped, YouTube shows its play button and the title over it
var show = function (on) { document.getElementById('player').style.opacity = on ? 1 : 0; };
// YouTube has no setting that turns captions off (only one that forces them on), so they're switched
// off through the player itself, again each time they could have come back on
var noCaptions = function () {
  if (!player) return;
  try { player.unloadModule('captions'); } catch (e) {}
  try { player.unloadModule('cc'); } catch (e) {}
  try { player.setOption('captions', 'track', {}); } catch (e) {}
  try { player.setOption('cc', 'track', {}); } catch (e) {}
};
var api = document.createElement('script');
api.src = 'https://www.youtube.com/iframe_api';
api.onerror = function () { post('error'); };
document.head.appendChild(api);
function onYouTubeIframeAPIReady() {
  new YT.Player('player', {
    videoId: '${id}', width: '100%', height: '100%',
    playerVars: { autoplay: 1, mute: ${sound ? 0 : 1}, controls: 0, disablekb: 1, fs: 0, rel: 0,
      iv_load_policy: 3, cc_load_policy: 0, cc_lang_pref: 'zz', modestbranding: 1, playsinline: 1,
      ${loop ? `loop: 1, playlist: '${id}',` : ''} origin: '${YOUTUBE_ORIGIN}' },
    events: {
      onReady: function (e) {
        player = e.target;
        noCaptions();
        ${sound ? `player.unMute(); player.setVolume(${Math.round(BANNER_VOLUME * 100)});` : 'player.mute();'}
        player.playVideo();
        // Captions can come on a moment after the video starts: switched off again for its first seconds
        var checks = 0;
        var watch = setInterval(function () { noCaptions(); if (++checks >= 20) clearInterval(watch); }, 500);
        // Still not playing (starting with sound was refused): it starts muted rather than waiting for a tap
        setTimeout(function () {
          if (player.getPlayerState() !== YT.PlayerState.PLAYING) { player.mute(); player.playVideo(); }
        }, 3000);
      },
      // The captions module loads on its own: switched off again whenever it does
      onApiChange: noCaptions,
      onStateChange: function (e) {
        if (e.data === YT.PlayerState.PLAYING) { noCaptions(); show(true); return; }
        // Paused (nobody can tap it): hidden and played on
        if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) { show(false); player.playVideo(); return; }
        if (e.data !== YT.PlayerState.ENDED) return;
        // Hidden before YouTube's end screen (more videos) can show
        show(false);
        ${loop ? 'player.seekTo(0); player.playVideo();' : "post('ended');"}
      },
      onError: function () { post('error'); }
    }
  });
}
</script></body></html>`;

/**
 * A YouTube banner, streamed from YouTube every time it plays (it isn't kept on the tablet), in a
 * web view. Touches go to a cover over it, so a tap ends the screensaver as on any slide. One that
 * can't play (no connection, a private or removed video) moves on after `retryAfter`.
 */
const YouTubeSlide = ({
  id,
  loop,
  sound,
  retryAfter,
  onEnd,
}: {
  id: string;
  loop: boolean;
  sound: boolean;
  retryAfter: number;
  onEnd: () => void;
}) => {
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => youtubeHtml(id, sound, loop), [id, sound, loop]);

  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(onEnd, retryAfter);
    return () => clearTimeout(timer);
  }, [failed]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        source={{ html, baseUrl: YOUTUBE_ORIGIN }}
        style={styles.youtube}
        javaScriptEnabled
        // Starts by itself, with sound when that's on: nobody taps play on a screensaver
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'ended') onEnd();
          else if (e.nativeEvent.data === 'error') setFailed(true);
        }}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
      {/* Over the player, so a tap reaches the app (and ends the screensaver), not YouTube */}
      <View style={StyleSheet.absoluteFill} />
    </View>
  );
};

const styles = StyleSheet.create({
  youtube: { flex: 1, backgroundColor: '#000' },
});
