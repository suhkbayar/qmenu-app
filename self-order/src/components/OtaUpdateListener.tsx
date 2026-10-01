import { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
// Never interrupt a customer who is paying — the modal waits until they're back on the menu
const CHECKOUT_PATHS = ['/private/draft-order', '/private/vat', '/private/payment', '/private/payment-success'];

// Check and download in the background — nothing is shown until the download finishes.
// Errors surface through Updates.useUpdates() (checkError / downloadError), e.g. on the PIN screen.
export const checkForUpdate = () =>
  Updates.checkForUpdateAsync()
    .then((update) => (update.isAvailable ? Updates.fetchUpdateAsync() : null))
    .catch(() => {});

// Rendered as its own component so update state changes don't re-render the app tree
const OtaUpdateListener = () => {
  const { t } = useTranslation('language');
  const { isUpdatePending } = Updates.useUpdates();
  const pathname = usePathname();
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    checkForUpdate();
    const id = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    // Also check whenever the app comes back to the screen, e.g. staff press Home after the PIN exit
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const apply = () => {
    setRestarting(true);
    Updates.reloadAsync().catch(() => setRestarting(false));
  };

  return (
    <Modal visible={isUpdatePending && !CHECKOUT_PATHS.includes(pathname)} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{t('mainPage.update_title', 'New version available')}</Text>
          <Text style={styles.body}>
            {t('mainPage.update_body', 'Tap Update to restart the app. It takes a few seconds.')}
          </Text>
          <Pressable style={[styles.button, restarting && styles.buttonDisabled]} onPress={apply} disabled={restarting}>
            <Text style={styles.buttonText}>{t('mainPage.update_button', 'Update')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default OtaUpdateListener;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 300, gap: 16 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 15, color: '#666', textAlign: 'center' },
  button: { padding: 12, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
