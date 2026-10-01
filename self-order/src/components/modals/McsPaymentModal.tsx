import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ITransaction } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/src/store/theme.store';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  transaction: ITransaction;
};

const McsPaymentModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation('language');
  const { theme, isDark } = useThemeStore();

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal} theme={{ colors: { backdrop: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' } }}>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon source="close" color={theme.textSecondary} size={20} />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="credit-card-scan-outline" size={120} color={theme.primary} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{t('mainPage.WaitingForCardScan')}</Text>
        <Text style={[styles.instruction, { color: theme.textMuted }]}>{t('mainPage.PleaseInsertOrTapCard')}</Text>
        <View style={styles.status}>
          <ActivityIndicator animating size="large" color={theme.primary} />
          <Text style={[styles.statusText, { color: theme.textMuted }]}>{t('mainPage.ProcessingPayment')}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default McsPaymentModal;

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center' },
  container: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 480,
  },
  closeButton: { position: 'absolute', top: 10, right: 10, borderRadius: 20, padding: 6, zIndex: 10 },
  iconContainer: { marginTop: 20, marginBottom: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  instruction: { textAlign: 'center', fontSize: 16, marginBottom: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingVertical: 12 },
  statusText: { fontSize: 14 },
});
