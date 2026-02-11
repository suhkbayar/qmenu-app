import { TouchableOpacity, StyleSheet, Text, ActivityIndicator, Image } from 'react-native';

type Props = {
  id?: string;
  onSelect: (type: string, id?: string) => void;
  loading: boolean;
};

const TokiForm = ({ id, onSelect, loading }: Props) => {
  return (
    <TouchableOpacity style={styles.paymentButton} onPress={() => onSelect('Toki', id)}>
      <Image source={require('@/assets/icon/new_toki.png')} style={styles.logo} resizeMode="contain" />
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
        <Text style={styles.paymentText}>Toki</Text>
      )}
    </TouchableOpacity>
  );
};

export default TokiForm;

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
  logo: {
    width: 60,
    height: 60,
  },
  paymentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
});
