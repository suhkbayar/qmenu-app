import { View } from 'react-native';
import { LogoLoader } from './LogoLoader';

/** A full screen loader, for while a screen's data loads. */
export const LoadingScreen = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <LogoLoader size={120} />
  </View>
);
