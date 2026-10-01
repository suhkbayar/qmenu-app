import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ITransaction } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/src/store/theme.store';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  refetch: (transactionId: any) => void;
  transaction?: ITransaction;
};

const base64Types = ['QPay', 'QPay2', 'MPY'];

const PendingTransactionModal = ({ visible, onClose, refetch, transaction, loading }: Props) => {
  const { t } = useTranslation('language');
  const { theme, isDark } = useThemeStore();
  const isBase64 = base64Types.includes(transaction?.type || '');


  if (!transaction) return null;

  const linkImage = transaction.links?.[0]?.link;
  const qrUri = transaction.image
    ? (isBase64 ? `data:image/png;base64,${transaction.image}` : transaction.image)
    : (linkImage ? `data:image/png;base64,${linkImage}` : null);

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal} theme={{ colors: { backdrop: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' } }}>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}>
          <Icon source="close" color={theme.textSecondary} size={20} />
        </TouchableOpacity>
        <View style={styles.qrContainer}>
          <Image source={{ uri: qrUri ?? '' }} style={styles.qrImage} />
        </View>
        <Text style={[styles.instruction, { color: theme.textMuted }]}>{t('mainPage.scan_qr_code')}</Text>
        <TouchableOpacity style={[styles.paidButton, { backgroundColor: theme.primary }]} onPress={() => refetch(transaction.id)}>
          {loading && <ActivityIndicator animating size="small" color="#fff" />}
          <Text style={styles.paidText}>{t('mainPage.Paid')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default PendingTransactionModal;

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center' },
  container: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 420,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  qrContainer: { marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  qrImage: { width: 200, height: 200, resizeMode: 'contain', borderRadius: 10 },
  instruction: { marginTop: 20, textAlign: 'center', color: '#6b7280', fontSize: 16 },
  paidButton: {
    marginTop: 20,
    borderRadius: 10,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  paidText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
