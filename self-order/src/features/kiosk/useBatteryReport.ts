import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useMutation } from '@apollo/client';
import * as Battery from 'expo-battery';
import { UPDATE_BATTERY } from '@/src/graphql/mutations/table';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { getDeviceId, getPayload, setSession } from '@/src/providers/auth';
import { appVersion, describeUpdate } from './appUpdate';

const EVERY_MS = 5 * 60 * 1000;

/**
 * Every 5 minutes, tells the server this tablet's battery level and whether it's charging, so staff
 * can see which tablets need charging, and the app version, so we can see which tablets run v2.
 * A table removed or moved to another tablet calls onRevoked.
 */
export const useBatteryReport = (tableId?: string, tableCode?: string, onRevoked?: () => void) => {
  const [sendBattery] = useMutation(UPDATE_BATTERY);
  const [getTabletToken] = useMutation(CURRENT_TOKEN);
  const revoked = useRef(onRevoked);
  revoked.current = onRevoked;

  useEffect(() => {
    if (Platform.OS === 'web' || !tableId) return;
    let cancelled = false;

    const push = async () => {
      const payload = await getPayload();
      if (!payload || payload.table !== tableId) return;

      // Sessions from before devices were tracked: get a token that carries this tablet's id
      if (!payload.device) {
        if (!tableCode) return;
        const { data } = await getTabletToken({
          variables: { code: tableCode, type: 'TB', device: await getDeviceId() },
        });
        await setSession(data.getToken.token, data.getToken.id);
      }

      const state = await Battery.getPowerStateAsync();
      const percent = Math.round((state?.batteryLevel ?? 0) * 100);
      const charging =
        state?.batteryState === Battery.BatteryState.CHARGING || state?.batteryState === Battery.BatteryState.FULL;
      await sendBattery({
        variables: { id: tableId, battery: percent, charging, appVersion: `${appVersion()} ${describeUpdate()}` },
      });
    };

    const run = () =>
      push().catch((error) => {
        if (cancelled) return;
        if (error?.graphQLErrors?.some((e: any) => ['TL0003', 'TL0004'].includes(e.errorType))) revoked.current?.();
      });
    run();
    const id = setInterval(run, EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tableId, tableCode]);
};
