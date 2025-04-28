import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ITransaction } from '../../types';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  refetch: (transactionId: any) => void;
  transaction: ITransaction;
};

const base64Types = ['QPay', 'QPay2'];

const PaymentModal = ({ visible, onClose, refetch, transaction, loading }: Props) => {
  const isBase64 = base64Types.includes(transaction?.type || '');
  const { t } = useTranslation('language');

  const renderQR = () => {
    if (isBase64) {
      return <Image source={{ uri: `data:image/jpeg;base64,${transaction.image}` }} style={styles.qrImage} />;
    } else {
      return <Image source={{ uri: transaction.image }} style={styles.qrImage} />;
    }
  };

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon source="close" color="#4B5563" size={20} />
        </TouchableOpacity>
        <View style={styles.qrContainer}>{renderQR()}</View>
        <Text style={styles.instruction}>{t('mainPage.scan_qr_code')}</Text>

        <TouchableOpacity style={styles.paidButton} onPress={() => refetch(transaction.id)}>
          {loading && <ActivityIndicator animating={true} size="small" color="#fff" />}
          <Text style={styles.paidText}>{t('mainPage.Paid')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default PaymentModal;

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    backgroundColor: '#fff',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  qrContainer: {
    marginTop: 0,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    borderRadius: 10,
  },
  cardContainer: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
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
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  paidText: {
    color: '#fff',
    fontWeight: '600',
    justifyContent: 'center',
    fontSize: 16,
  },
});
