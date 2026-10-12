import { View } from 'react-native';
import { NetInfoStateType, useNetInfo } from '@react-native-community/netinfo';
import { cn, useThemeColor } from 'heroui-native';
import { EthernetPort, SignalHigh, Wifi, WifiHigh, WifiLow, WifiOff, WifiZero } from 'lucide-react-native';

const wifiIcon = (strength: number) =>
  strength > 75 ? Wifi : strength > 50 ? WifiHigh : strength > 25 ? WifiLow : WifiZero;

/** The tablet's connection: Wi-Fi strength, cable or mobile data, red when there is no internet. */
export const NetworkIndicator = ({ className }: { className?: string }) => {
  const [foreground, danger] = useThemeColor(['foreground', 'danger']);
  const net = useNetInfo();

  const offline = net.isConnected === false || net.isInternetReachable === false;
  const Icon = offline
    ? WifiOff
    : net.type === NetInfoStateType.ethernet
      ? EthernetPort
      : net.type === NetInfoStateType.cellular
        ? SignalHigh
        : wifiIcon(net.type === NetInfoStateType.wifi ? (net.details.strength ?? 100) : 100);

  return (
    <View
      pointerEvents="none"
      className={cn(
        'size-13 items-center justify-center rounded-2xl border bg-surface',
        offline ? 'border-danger' : 'border-border',
        className,
      )}
    >
      <Icon size={24} color={offline ? danger : foreground} />
    </View>
  );
};
