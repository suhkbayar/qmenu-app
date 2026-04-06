import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ITransaction } from '@/src/types';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  transaction: ITransaction;
};

const McsPaymentModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation('language');

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon source="close" color="#4B5563" size={20} />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="credit-card-scan-outline" size={120} color="#facc15" />
        </View>
        <Text style={styles.title}>{t('mainPage.WaitingForCardScan')}</Text>
        <Text style={styles.instruction}>{t('mainPage.PleaseInsertOrTapCard')}</Text>
        <View style={styles.status}>
          <ActivityIndicator animating size="large" color="#facc15" />
          <Text style={styles.statusText}>{t('mainPage.ProcessingPayment')}</Text>
        </View>
      </View>
    </Modal>
  );
};

export default McsPaymentModal;

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center' },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 480,
  },
  closeButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f3f4f6', borderRadius: 20, padding: 6, zIndex: 10 },
  iconContainer: { marginTop: 20, marginBottom: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  instruction: { textAlign: 'center', color: '#6b7280', fontSize: 16, marginBottom: 24 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingVertical: 12 },
  statusText: { color: '#6b7280', fontSize: 14 },
});
