import { defaultColor } from '@/src/constants/Colors';
import { ActivityIndicator } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useThemeStore } from '@/src/store/theme.store';

const Loader = () => {
  const { theme } = useThemeStore();
  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]}>
      <ActivityIndicator animating size="large" color={defaultColor} />
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
});
