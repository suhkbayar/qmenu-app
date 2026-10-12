import { View, useWindowDimensions } from 'react-native';
import * as Updates from 'expo-updates';
import { formatDateTime } from '@/src/lib/format';
import { Text } from '@/src/ui/Text';
import { appVersion, describeUpdate } from './appUpdate';

/**
 * App version and build, the running OTA update and its channel, and the screen size in dp, so
 * support staff can tell what a tablet is on.
 */
export const VersionBadge = () => {
  const { width, height } = useWindowDimensions();
  const parts = [`v${appVersion()}`, describeUpdate()];
  if (Updates.channel) parts.push(Updates.channel);
  if (Updates.createdAt) parts.push(formatDateTime(Updates.createdAt));
  parts.push(`${Math.round(width)}×${Math.round(height)}dp`);

  return (
    <View className="items-center gap-0.5">
      <Text selectable className="text-sm tracking-wide text-muted">
        {parts.join('  ·  ')}
      </Text>
      {/* Their licence (CC BY 4.0) asks for a credit; the stickers in social/Sticker */}
      <Text className="text-xs text-muted">Emoji: Google Noto Animated Emoji, CC BY 4.0</Text>
      {Updates.isEmergencyLaunch && (
        <Text selectable className="text-sm font-semibold text-danger">
          fallback: {Updates.emergencyLaunchReason ?? 'unknown reason'}
        </Text>
      )}
    </View>
  );
};
