import { NativeModules, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import type * as NetInfoModule from '@react-native-community/netinfo';
import { useThemeStore } from '@/src/store/theme.store';

const NetInfo: typeof NetInfoModule | null = NativeModules.RNCNetInfo
  ? require('@react-native-community/netinfo')
  : null;

type Props = { style?: StyleProp<ViewStyle>; iconSize?: number };

const wifiIcon = (strength: number) =>
  strength > 75
    ? 'wifi-strength-4'
    : strength > 50
      ? 'wifi-strength-3'
      : strength > 25
        ? 'wifi-strength-2'
        : 'wifi-strength-1';

const NetworkStatusIconInner = ({ netInfo, style, iconSize = 28 }: Props & { netInfo: typeof NetInfoModule }) => {
  const { NetInfoStateType, useNetInfo } = netInfo;
  const { theme } = useThemeStore();
  const net = useNetInfo();

  const offline = net.isConnected === false || net.isInternetReachable === false;
  const strength = net.type === NetInfoStateType.wifi ? (net.details?.strength ?? 100) : 100;

  const icon =
    net.isConnected === false
      ? 'wifi-strength-off-outline'
      : net.isInternetReachable === false
        ? 'wifi-strength-alert-outline'
        : net.type === NetInfoStateType.ethernet
          ? 'ethernet'
          : net.type === NetInfoStateType.cellular
            ? 'signal-cellular-3'
            : wifiIcon(strength);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        { backgroundColor: theme.backgroundSecondary, borderColor: offline ? theme.danger : theme.border },
        style,
      ]}
    >
      <Icon source={icon} size={iconSize} color={offline ? theme.danger : theme.text} />
    </View>
  );
};

const NetworkStatusIcon = (props: Props) => (NetInfo ? <NetworkStatusIconInner netInfo={NetInfo} {...props} /> : null);

export default NetworkStatusIcon;

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
