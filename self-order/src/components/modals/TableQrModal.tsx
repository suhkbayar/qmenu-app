import React from 'react';
import { Modal } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCallStore } from '@/src/store/cart.store';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const TableQrModal = ({ visible, onClose }: Props) => {
  const { t } = useTranslation('language');
  const participant = useCallStore((s) => s.participant);
  const targetLink = `https://qr.qmenu.mn/qr/${participant?.table?.code}`;

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#e0ad07" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoText}>{t('qr_info_text', 'QR кодыг уншуулснаар та захиалга хийх боломжтой')}</Text>
          </View>
        </View>
        <View style={styles.qrContainer}>
          <QRCode value={targetLink} size={260} />
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{t('mainPage.Close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default TableQrModal;

const styles = StyleSheet.create({
  modal: { justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 380,
    zIndex: 1001,
  },
  infoBox: { flexDirection: 'row', backgroundColor: '#FFF8E1', borderColor: '#FFC300', borderWidth: 1, borderRadius: 6, padding: 10, alignItems: 'center', marginBottom: 20, width: '100%' },
  infoText: { color: '#e0ad07' },
  qrContainer: { marginTop: 30, justifyContent: 'center', alignItems: 'center', height: 200, width: 200 },
  closeBtn: { marginTop: 50, width: '90%', backgroundColor: '#facc15', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40 },
  closeBtnText: { color: '#fff', fontWeight: '600', textAlign: 'center', fontSize: 16 },
});
