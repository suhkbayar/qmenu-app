import React from 'react';
import { Modal, Icon } from 'react-native-paper';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { ITransaction } from '../../types';
import { useTranslation } from 'react-i18next';
import { defaultColor } from '@/constants/Colors';

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
        <View style={styles.qrContainer}>
          <Image source={require('../../assets/icon/point2.png')} style={styles.qrImage} />
        </View>
        <Text style={styles.instruction}>{t('mainPage.PayAtTheBoxOffice')}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 20,
            width: '100%',
          }}
        >
          <TouchableOpacity style={styles.secondPaidButton} onPress={onClose}>
            <Text style={styles.secondPaidText}>Үгүй</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.paidButton} onPress={onConfirm}>
            {loading && <ActivityIndicator animating={true} size="small" color="#fff" />}
            <Text style={styles.paidText}>Тийм</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PayCashierModal;

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
    fontWeight: '700',
    fontSize: 19,
  },
  secondPaidButton: {
    marginTop: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: defaultColor,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  paidButton: {
    marginTop: 20,
    backgroundColor: defaultColor,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
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

  secondPaidText: {
    color: defaultColor,
    fontWeight: '600',
    justifyContent: 'center',
    fontSize: 16,
  },
});
