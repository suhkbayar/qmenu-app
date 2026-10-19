import { View } from 'react-native';
import { SecretTap } from '@/src/features/kiosk/AdminExit';
import { LogoLoader } from './LogoLoader';

/**
 * A full screen loader, for while a screen's data loads. Its logo is a way into the admin dialog
 * too: started without internet, the tablet waits here, and staff still need to get out.
 */
export const LoadingScreen = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <SecretTap>
      <LogoLoader size={120} />
    </SecretTap>
  </View>
);
