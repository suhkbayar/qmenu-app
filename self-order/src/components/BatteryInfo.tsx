import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Battery from 'expo-battery';

export default function BatteryInfo() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchBatteryInfo = async () => {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      setBatteryLevel(level);
      setIsCharging(state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL);
    };

    fetchBatteryInfo();
    const intervalId = setInterval(fetchBatteryInfo, 300000);

    const levelSub = Battery.addBatteryLevelListener(({ batteryLevel }) => setBatteryLevel(batteryLevel));
    const stateSub = Battery.addBatteryStateListener(({ batteryState }) =>
      setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL),
    );

    return () => {
      clearInterval(intervalId);
      levelSub.remove();
      stateSub.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Battery Level: {batteryLevel !== null ? `${Math.round(batteryLevel * 100)}%` : 'Loading...'}</Text>
      <Text>Charging: {isCharging === null ? 'Loading...' : isCharging ? 'Yes' : 'No'}</Text>
    </View>
  );
}
