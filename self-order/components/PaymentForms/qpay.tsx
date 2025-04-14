import { defaultColor } from '@/constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';

type Props = {
  id?: string;
  onSelect: (type: string, id?: string) => void;
  loading: boolean;
};

const QpayForm = ({ id, onSelect, loading }: Props) => {
  return (
    <TouchableOpacity style={styles.paymentButton} onPress={() => onSelect('Khan bank', id)}>
      <MaterialCommunityIcons name="qrcode-scan" size={60} color="#fff" />
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
        <Text style={styles.paymentText}>QPay</Text>
      )}
    </TouchableOpacity>
  );
};

export default QpayForm;

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
  },
});
