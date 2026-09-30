import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import { useQuizStore } from '@/src/store/quiz.store';
import { useCallStore } from '@/src/store/cart.store';

export const MBANK_QUIZ_URL = 'https://quiz.m-bank.mn/';

const MbankQuizModal = () => {
  const mounted = useQuizStore((s) => s.mounted);
  if (!mounted) return null;
  return <QuizOverlay />;
};

const QuizOverlay = () => {
  const { t } = useTranslation('language');
  const { theme } = useThemeStore();
  const visible = useQuizStore((s) => s.visible);
  const closeQuiz = useQuizStore((s) => s.closeQuiz);
  const branchName = useCallStore((s) => s.participant?.branch?.name);
  const quizUrl = branchName ? `${MBANK_QUIZ_URL}?deviceId=${encodeURIComponent(branchName)}` : MBANK_QUIZ_URL;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => {
    setFailed(false);
    setErrorDetail(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeQuiz();
      return true;
    });
    return () => sub.remove();
  }, [visible, closeQuiz]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }, !visible && styles.hidden]}>
      <View style={styles.body}>
        {failed ? (
          <View style={styles.center}>
            <Icon source="wifi-off" size={48} color={theme.textMuted} />
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              {t('mainPage.quiz_load_error', 'Хуудсыг ачааллахад алдаа гарлаа')}
            </Text>
            {errorDetail ? (
              <Text style={[styles.errorDetail, { color: theme.textMuted }]} selectable>
                {errorDetail}
              </Text>
            ) : null}
            <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
              <Text style={styles.retryText}>{t('mainPage.retry', 'Дахин оролдох')}</Text>
            </TouchableOpacity>
          </View>
        ) : Platform.OS === 'web' ? (
          <iframe
            key={reloadKey}
            src={quizUrl}
            style={{ border: 0, width: '100%', height: '100%' }}
            onLoad={() => setLoading(false)}
          />
        ) : (
          <WebView
            key={reloadKey}
            source={{ uri: quizUrl }}
            style={styles.webview}
            onLoadEnd={() => setLoading(false)}
            onError={({ nativeEvent }) => {
              console.warn('[MbankQuiz] load failed', nativeEvent);
              setErrorDetail(
                [nativeEvent.description, nativeEvent.code != null ? `code ${nativeEvent.code}` : null, nativeEvent.url]
                  .filter(Boolean)
                  .join('\n'),
              );
              setLoading(false);
              setFailed(true);
            }}
            onHttpError={({ nativeEvent }) => {
              console.warn('[MbankQuiz] http error', nativeEvent.statusCode, nativeEvent.url);
              setErrorDetail(`HTTP ${nativeEvent.statusCode}\n${nativeEvent.url}`);
              setLoading(false);
            }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            originWhitelist={['*']}
          />
        )}

        {loading && !failed ? (
          <View style={[styles.loader, { backgroundColor: theme.background }]} pointerEvents="none">
            <ActivityIndicator size="large" color={defaultColor} />
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={closeQuiz}
        style={styles.closeBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon source="close" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default MbankQuizModal;

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  webview: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 18, fontWeight: '600' },
  errorDetail: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { backgroundColor: defaultColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
