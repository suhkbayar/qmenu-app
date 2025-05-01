import React from 'react';
import { Modal } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCallStore } from '@/cache/cart.store';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons'; // or 'react-native-vector-icons/Ionicons'

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
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={'#e0ad07'} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoMessage}>
              {t('qr_info_text', 'QR кодыг уншуулснаар та захиалга хийх боломжтой')}
            </Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <QRCode value={targetLink} size={260} />
        </View>

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
    maxWidth: 380,
    zIndex: 1001,
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 6,
    zIndex: 1010,
  },
  qrContainer: {
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    width: 200,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1', // light yellow background
    borderColor: '#FFC300',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  infoMessage: {
    color: '#e0ad07',
  },
  paidButton: {
    marginTop: 50,
    width: '90%',
    backgroundColor: '#facc15',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  paidText: {
    color: '#fff',
    fontWeight: '600',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 16,
  },
});
