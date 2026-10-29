import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Button, cn, useThemeColor } from 'heroui-native';
import { WifiOff, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { useHoldScreensaver } from '@/src/features/kiosk/screensaverHold';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { LogoLoader } from '@/src/ui/LogoLoader';
import { Text } from '@/src/ui/Text';
import { MBANK_QUIZ_URL, useQuizStore } from './quizStore';

/**
 * The Mbank quiz web page over the whole app. After it's closed it stays loaded for 5 minutes, so a
 * guest coming back keeps their progress, then it's unloaded (see quizStore).
 */
export const QuizOverlay = () => {
  const mounted = useQuizStore((s) => s.mounted);
  return mounted ? <QuizPage /> : null;
};

const QuizPage = () => {
  const { t } = useTranslation('language');
  const muted = useThemeColor('muted');
  const visible = useQuizStore((s) => s.visible);
  const closeQuiz = useQuizStore((s) => s.closeQuiz);
  // Reading a question is no touch either; the screensaver's videos mustn't play under the quiz
  useHoldScreensaver(visible);
  const branchName = useSessionStore((s) => s.participant?.branch?.name);
  const url = branchName ? `${MBANK_QUIZ_URL}?deviceId=${encodeURIComponent(branchName)}` : MBANK_QUIZ_URL;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Changing the key remounts the WebView, which reloads the page
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeQuiz();
      return true;
    });
    return () => sub.remove();
  }, [visible, closeQuiz]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  return (
    <View style={StyleSheet.absoluteFill} className={cn('bg-background', !visible && 'hidden')}>
      {error !== null ? (
        <View className="flex-1 items-center justify-center gap-4 px-10">
          <WifiOff size={48} color={muted} />
          <Text className="text-lg font-semibold">{t('mainPage.quiz_load_error')}</Text>
          {!!error && (
            <Text selectable className="text-center text-sm text-muted">
              {error}
            </Text>
          )}
          <Button size="lg" className="rounded-2xl px-10" onPress={retry}>
            <Button.Label numberOfLines={1} className="font-bold">{t('mainPage.retry')}</Button.Label>
          </Button>
        </View>
      ) : (
        <WebView
          key={reloadKey}
          source={{ uri: url }}
          style={{ flex: 1 }}
          onLoadEnd={() => setLoading(false)}
          onError={({ nativeEvent }) => {
            console.warn('[MbankQuiz] load failed', nativeEvent);
            const code = nativeEvent.code != null ? `code ${nativeEvent.code}` : null;
            setError([nativeEvent.description, code, nativeEvent.url].filter(Boolean).join('\n'));
            setLoading(false);
          }}
          onHttpError={({ nativeEvent }) => {
            console.warn('[MbankQuiz] http error', nativeEvent.statusCode, nativeEvent.url);
            setLoading(false);
          }}
          // Android shut the page down (low memory): the error screen takes the dead web view's place
          // at once, as using it can crash the app, and Retry starts a fresh one
          onRenderProcessGone={({ nativeEvent }) => {
            console.warn('[MbankQuiz] web view gone', nativeEvent.didCrash);
            setError('');
            setLoading(false);
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          originWhitelist={['*']}
        />
      )}

      {loading && error === null && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center bg-background">
          <LogoLoader />
        </View>
      )}

      <Button
        isIconOnly
        onPress={closeQuiz}
        accessibilityLabel={t('mainPage.close')}
        className="absolute right-4 top-4 size-14 rounded-full border border-white/25"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        hitSlop={12}
      >
        <X size={30} color="#fff" />
      </Button>
    </View>
  );
};
