import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Battery from 'expo-battery';

export default function BatteryInfoScreen() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean | null>(null);
  useEffect(() => {
    const fetchBatteryInfo = async () => {
      const level = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();
      setBatteryLevel(level);
      setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL);
    };

    fetchBatteryInfo();

    const intervalId = setInterval(fetchBatteryInfo, 300); // every 5 min

    const batteryLevelSubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(batteryLevel);
    });

    const chargingSubscription = Battery.addBatteryStateListener(({ batteryState }) => {
      setIsCharging(batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL);
    });

    return () => {
      clearInterval(intervalId);
      batteryLevelSubscription.remove();
      chargingSubscription.remove();
    };
  }, []);
  console.log('Battery level:', batteryLevel);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Battery Level: {batteryLevel !== null ? `${Math.round(batteryLevel * 100)}%` : 'Loading...'}</Text>
      <Text>Charging: {isCharging === null ? 'Loading...' : isCharging ? 'Yes' : 'No'}</Text>
    </View>
  );
}
