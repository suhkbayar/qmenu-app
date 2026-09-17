import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';

export const MBANK_QUIZ_URL = 'https://m-quiz-web-pre-new-web.apps.testocp.mbank.local/';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MbankQuizModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation('language');
  const { theme } = useThemeStore();
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

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" supportedOrientations={['landscape']}>
      <View style={[styles.wrap, { backgroundColor: theme.background }]}>
        <View style={[styles.topBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Mbank Quiz</Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            activeOpacity={0.7}
          >
            <Icon source="close" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>

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
              src={MBANK_QUIZ_URL}
              style={{ border: 0, width: '100%', height: '100%' }}
              onLoad={() => setLoading(false)}
            />
          ) : (
            <WebView
              key={reloadKey}
              source={{ uri: MBANK_QUIZ_URL }}
              style={styles.webview}
              onLoadEnd={() => setLoading(false)}
              onError={({ nativeEvent }) => {
                console.warn('[MbankQuiz] load failed', nativeEvent);
                setErrorDetail(
                  [
                    nativeEvent.description,
                    nativeEvent.code != null ? `code ${nativeEvent.code}` : null,
                    nativeEvent.url,
                  ]
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
      </View>
    </Modal>
  );
};

export default MbankQuizModal;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 0.4 },
  closeBtn: {
    height: 58,
    minWidth: 58,
    borderRadius: 16,
    borderWidth: 1,
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
