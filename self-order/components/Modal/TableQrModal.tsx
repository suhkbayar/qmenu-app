import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCallStore } from '@/cache/cart.store';
import QRCode from 'react-native-qrcode-svg';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const TableQrModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation('language');
  const { participant } = useCallStore();

  const targetLink = `https://qr.qmenu.mn/qr/${participant?.table?.code}`;

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon source="close" color="#4B5563" size={28} />
        </TouchableOpacity>

        <View style={styles.qrContainer}>
          <QRCode value={targetLink} size={200} />
        </View>

        <Text style={styles.instruction}>QR кодыг уншуулан захиалга хийх боломжтой</Text>

        <TouchableOpacity style={styles.paidButton} onPress={onClose}>
          <Text style={styles.paidText}>{t('mainPage.Close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default TableQrModal;

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 420,
    zIndex: 1001,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 6,
    zIndex: 1010,
  },
  qrContainer: {
    marginTop: 20,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    width: 200,
  },
  instruction: {
    marginTop: 20,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
  },
  paidButton: {
    marginTop: 20,
    backgroundColor: '#facc15',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  paidText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
