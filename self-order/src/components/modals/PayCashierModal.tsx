import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { defaultColor } from '@/src/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const PayCashierModal = ({ visible, onClose, loading, onConfirm }: Props) => {
  const { t } = useTranslation('language');

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon source="close" color="#4B5563" size={20} />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="cash-register" size={160} color={defaultColor} />
        </View>
        <Text style={styles.instruction}>{t('mainPage.PayAtTheBoxOffice')}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>{t('mainPage.No')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            {loading && <ActivityIndicator animating size="small" color="#fff" />}
            <Text style={styles.confirmText}>{t('mainPage.Yes')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PayCashierModal;

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center' },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 420,
  },
  closeButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#f3f4f6', borderRadius: 20, padding: 6, zIndex: 10 },
  iconContainer: { justifyContent: 'center', alignItems: 'center' },
  instruction: { textAlign: 'center', color: '#6b7280', fontWeight: '700', fontSize: 19 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelButton: { marginTop: 20, backgroundColor: 'white', borderWidth: 1, borderColor: defaultColor, borderRadius: 10, width: '48%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40 },
  confirmButton: { marginTop: 20, backgroundColor: defaultColor, borderRadius: 10, width: '48%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40 },
  cancelText: { color: defaultColor, fontWeight: '600', fontSize: 16 },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
