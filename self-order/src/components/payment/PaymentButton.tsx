import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, StyleSheet, Text, ActivityIndicator, Image } from 'react-native';

type PaymentType = 'QPay' | 'MCS' | 'Toki' | 'Cash' | 'MPY';

type Props = {
  type: PaymentType;
  id?: string;
  loading?: boolean;
  onSelect: (type: string, id?: string) => void;
};

const icons: Record<PaymentType, React.ReactNode> = {
  QPay: <MaterialCommunityIcons name="qrcode-scan" size={60} color="#fff" />,
  MCS: <MaterialCommunityIcons name="credit-card-scan" size={60} color="#fff" />,
  Toki: <Image source={require('@/assets/icon/new_toki.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />,
  Cash: <MaterialCommunityIcons name="cash-register" size={60} color="#fff" />,
  MPY: <Image source={require('@/assets/icon/mpay.png')} style={{ width: 60, height: 60 }} resizeMode="contain" />,
};

const PaymentButton = ({ type, id, loading = false, onSelect }: Props) => {
  const { t } = useTranslation('language');

  const labelMap: Record<PaymentType, string> = {
    QPay: 'QPay',
    MCS: t('mainPage.CardScanner'),
    Toki: 'Toki',
    Cash: t('mainPage.PayAtTheBoxOffice'),
    MPY: 'MPay',
  };

  const handlePress = () => {
    if (type === 'Cash') onSelect('Cash', '1');
    else onSelect(type, id);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      {icons[type]}
      {loading ? (
        <ActivityIndicator animating size="large" color="#fff" style={{ marginTop: 8 }} />
      ) : (
        <Text style={styles.label}>{labelMap[type]}</Text>
      )}
    </TouchableOpacity>
  );
};

export default PaymentButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    width: 160,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
