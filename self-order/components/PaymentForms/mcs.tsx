import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';

type Props = {
  id?: string;
  onSelect: (type: string, id?: string) => void;
  loading: boolean;
};

const McsForm = ({ id, onSelect, loading }: Props) => {
  const { t } = useTranslation('language');
  return (
    <TouchableOpacity style={styles.paymentButton} onPress={() => onSelect('MCS', id)}>
      <MaterialCommunityIcons name="credit-card-scan" size={60} color="#fff" />
      {loading ? (
        <ActivityIndicator
          animating={true}
          style={{
            marginTop: 8,
          }}
          size="large"
          color="#fff"
        />
      ) : (
        <Text style={styles.paymentText}>{t('mainPage.CardScanner')}</Text>
      )}
    </TouchableOpacity>
  );
};

export default McsForm;

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
    marginTop: 8,
    textAlign: 'center',
  },
});
