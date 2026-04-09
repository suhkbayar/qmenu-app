import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/src/store/theme.store';
import { Colors } from '@/src/constants/Colors';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const PayCashierModal = ({ visible, onClose, loading, onConfirm }: Props) => {
  const { t } = useTranslation('language');
  const { theme, isDark } = useThemeStore();

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal} theme={{ colors: { backdrop: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' } }}>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: theme.backgroundSecondary }]}
        >
          <Icon source="close" color={theme.textSecondary} size={20} />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="cash-register" size={160} color={theme.primary} />
        </View>
        <Text style={[styles.instruction, { color: theme.textMuted }]}>{t('mainPage.PayAtTheBoxOffice')}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.primary }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: theme.primary }]}>{t('mainPage.No')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmButton, { backgroundColor: theme.primary }]} onPress={onConfirm}>
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 420,
  },
  closeButton: { position: 'absolute', top: 10, right: 10, borderRadius: 20, padding: 6, zIndex: 10 },
  iconContainer: { justifyContent: 'center', alignItems: 'center' },
  instruction: { textAlign: 'center', color: '#6b7280', fontWeight: '700', fontSize: 19 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelButton: {
    marginTop: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  confirmButton: {
    marginTop: 20,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  cancelText: { fontWeight: '600', fontSize: 16 },
  confirmText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
