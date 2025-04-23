import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';

type Props = {
  onSelect: (type: string, id?: string) => void;
};

const CashForm = ({ onSelect }: Props) => {
  const { t } = useTranslation('language');
  return (
    <TouchableOpacity style={styles.paymentButton} onPress={() => onSelect('Cash', '1')}>
      <MaterialCommunityIcons name="cash-register" size={60} color="#fff" />
      <Text style={styles.paymentText}>{t('mainPage.PayAtTheBoxOffice')}</Text>
    </TouchableOpacity>
  );
};

export default CashForm;

const styles = StyleSheet.create({
  paymentButton: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    elevation: 2,
    width: 160,
  },

  paymentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});
