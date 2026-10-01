import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeStore } from '@/src/store/theme.store';

const shortId = (id: string | null) => (id ? id.replace(/-/g, '').slice(0, 8) : null);

const pad = (n: number) => String(n).padStart(2, '0');

const formatDate = (date: Date | null) =>
  date
    ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    : null;

const describeUpdate = () => {
  if (!Updates.isEnabled) return 'updates off';
  if (Updates.isEmbeddedLaunch) return 'embedded';
  return `OTA ${shortId(Updates.updateId) ?? '?'}`;
};

export default function VersionBadge() {
  const { theme } = useThemeStore();

  const parts = [`v${Constants.expoConfig?.version ?? '?'}`, describeUpdate()];
  if (Updates.channel) parts.push(Updates.channel);
  const created = formatDate(Updates.createdAt);
  if (created) parts.push(created);

  return (
    <View style={styles.wrap}>
      <Text selectable style={[styles.text, { color: theme.textMuted }]}>
        {parts.join('  ·  ')}
      </Text>
      {Updates.isEmergencyLaunch && (
        <Text selectable style={[styles.text, styles.warn]}>
          fallback: {Updates.emergencyLaunchReason ?? 'unknown reason'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  text: { fontSize: 13, letterSpacing: 0.3 },
  warn: { color: '#dc2626', fontWeight: '600' },
});
