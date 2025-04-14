import { defaultColor } from '@/constants/Colors';
import { ActivityIndicator } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

const Loader = () => {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator animating={true} size="large" color={defaultColor} />
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
});
