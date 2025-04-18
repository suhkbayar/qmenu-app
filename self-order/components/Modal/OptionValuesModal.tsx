import { defaultColor } from '@/constants/Colors';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Modal } from 'react-native-paper';

type Props = {
  visible: boolean;
  values: string[];
  onClose: () => void;
  onSelectValue: (value: string) => void;
};

const OptionValuesModal = ({ visible, values, onClose, onSelectValue }: Props) => {
  const { t } = useTranslation('language');

  return (
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modal}>
      <View style={styles.container}>
        <Text style={styles.title}>{'Сонголт'}</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {values.map((value, index) => (
            <View key={value}>
              <TouchableOpacity onPress={() => onSelectValue(value)} style={styles.valueButton}>
                <Text style={styles.valueText}>{value}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>{t('mainPage.Close')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1f2937',
  },
  scroll: {
    width: '100%',
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: 10,
    alignContent: 'center',
  },
  valueButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  valueButtonPressed: {
    backgroundColor: '#fef3c7',
  },
  valueText: {
    fontSize: 16,
    color: '#111827',
    alignItems: 'center',
    alignContent: 'center',
    alignSelf: 'center',
  },
  closeButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    backgroundColor: defaultColor,
    borderRadius: 10,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default OptionValuesModal;
