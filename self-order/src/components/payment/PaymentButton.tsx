import { useThemeStore } from '@/src/store/theme.store';
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
  QPay: <MaterialCommunityIcons name="qrcode-scan" size={72} color="#fff" />,
  MCS: <MaterialCommunityIcons name="credit-card-scan" size={72} color="#fff" />,
  Toki: <Image source={require('@/assets/icon/new_toki.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />,
  Cash: <MaterialCommunityIcons name="cash-register" size={72} color="#fff" />,
  MPY: <Image source={require('@/assets/icon/mpay.png')} style={{ width: 140, height: 72 }} resizeMode="contain" />,
};

const PaymentButton = ({ type, id, loading = false, onSelect }: Props) => {
  const { t } = useTranslation('language');
  const { theme, isDark } = useThemeStore();

  const labelMap: Record<PaymentType, string> = {
    QPay: 'QPay',
    MCS: t('mainPage.CardScanner'),
    Toki: 'Toki',
    Cash: t('mainPage.PayAtTheBoxOffice'),
    MPY: 'М Банк',
  };

  const bgColors: Record<PaymentType, string> = {
    QPay: theme.primary,
    MCS: theme.primary,
    Toki: theme.primary,
    Cash: theme.primary,
    MPY: '#1dc9a7',
  };

  const handlePress = () => {
    if (type === 'Cash') onSelect('Cash', '1');
    else onSelect(type, id);
  };

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: bgColors[type] }]} onPress={handlePress}>
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
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    width: 190,
  },
  label: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
});
