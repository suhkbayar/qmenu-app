import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import * as Battery from 'expo-battery';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import Container from '@/src/components/Container';
import HelpFloatingButton from '@/src/components/HelpFloatingButton';
import OrderFloatingButton from '@/src/components/OrderFloatingButton';
import Loader from '@/src/components/ui/Loader';
import PlanExpired from '@/src/components/ui/PlanExpired';
import { emptyOrder } from '@/src/constants';
import { GET_BANNERS, GET_BRANCH } from '@/src/graphql/queries';
import { ON_UPDATED_MENU } from '@/src/graphql/subscriptions';
import { UPDATE_BATTERY } from '@/src/graphql/mutations/table';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { AuthContext, getDeviceId, getPayload, onSessionEnd, setSession } from '@/src/providers/auth';
import ScreensaverWrapper from '@/src/providers/ScreensaverWrapper';
import { useValid } from '@/src/providers/ValidProvider';
import { useCallStore } from '@/src/store/cart.store';
import { getStorage, removeStorage } from '@/src/store/storage';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';

const MENU_REFETCH_QUIET_MS = 4000;
const MENU_REFETCH_MAX_WAIT_MS = 15000;
const COLD_RETRY_MS = 5000;

const Private = () => {
  const { pid } = useLocalSearchParams<{ pid?: string }>();
  const [participantId, setParticipantId] = useState<string | null>(pid ?? null);
  const [planExpired, setPlanExpired] = useState(false);
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const { signOut } = useContext(AuthContext);
  const { setValid } = useValid();
  const setParticipant = useCallStore((s) => s.setParticipant);
  const setTables = useCallStore((s) => s.setTables);
  const load = useCallStore((s) => s.load);

  useEffect(() => {
    if (participantId) return;
    getStorage('participantId').then((id) => {
      if (id) setParticipantId(id);
    });
  }, [participantId]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/public');
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const leave = useCallback(() => {
    signOut();
    setValid(false);
    removeStorage('participantId');
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  }, [signOut, setValid]);

  useEffect(() => onSessionEnd(leave), [leave]);

  const { data, refetch, error } = useQuery(GET_BRANCH, {
    variables: { id: participantId },
    skip: !participantId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 600000,
    onError(error) {
      if (error.graphQLErrors?.some((e: any) => e.errorType === 'PE0001')) {
        setPlanExpired(true);
        return;
      }

      if (error.networkError) return;

      leave();
    },
  });

  const branchId = data?.getParticipant?.branch?.id;
  const hasMenu = !!data?.getParticipant;

  useEffect(() => {
    if (!participantId || hasMenu || !error?.networkError) return;
    const id = setTimeout(() => {
      refetch().catch(() => {});
    }, COLD_RETRY_MS);
    return () => clearTimeout(id);
  }, [participantId, hasMenu, error, refetch]);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstPendingAt = useRef<number | null>(null);

  const scheduleMenuRefetch = useCallback(() => {
    if (!participantId) return;

    const now = Date.now();
    if (firstPendingAt.current === null) firstPendingAt.current = now;

    const waited = now - firstPendingAt.current;
    const delay = Math.min(MENU_REFETCH_QUIET_MS, Math.max(0, MENU_REFETCH_MAX_WAIT_MS - waited));

    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      firstPendingAt.current = null;
      refetch().catch(() => {});
    }, delay);
  }, [participantId, refetch]);

  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    },
    [],
  );

  useSubscription(ON_UPDATED_MENU, {
    variables: { branch: branchId },
    skip: !branchId,
    onData: scheduleMenuRefetch,
  });

  const [getBanners] = useLazyQuery(GET_BANNERS, { fetchPolicy: 'network-only' });

  // When participant data arrives, sync to store
  useEffect(() => {
    if (!data?.getParticipant) return;
    setPlanExpired(false);
    const p = data.getParticipant;
    setParticipant(p);
    if (p.orderable && !useCallStore.getState().order) load(emptyOrder);
    if (p.table) {
      setTables([
        {
          id: p.id,
          branchName: p.branch.name,
          branchId: p.branch.id,
          branchLogo: p.branch.logo,
          tableName: p.table.name,
          tableId: p.table.id,
          code: p.table.code,
        },
      ]);
    }
  }, [data]);

  // Fetch banners once participantId is ready
  useEffect(() => {
    if (!participantId) return;
    getBanners().then(({ data: bannerData }) => {
      const urls = (bannerData?.getBanners ?? [])
        .filter((b: { image: string; type: string }) => b.image && b.type === 'TB')
        .map((b: { image: string }) => ({ uri: b.image }));
      setImages(urls);
    });
  }, [participantId]);

  // Battery reporting
  const [sendBattery] = useMutation(UPDATE_BATTERY);
  const [getTabletToken] = useMutation(CURRENT_TOKEN);
  const tableId = data?.getParticipant?.table?.id;
  const tableCode = data?.getParticipant?.table?.code;

  useEffect(() => {
    if (Platform.OS === 'web' || !tableId) return;
    let cancelled = false;
    const push = async () => {
      const payload = await getPayload();
      if (!payload || payload.table !== tableId) return;

      if (!payload.device) {
        if (!tableCode) return;
        const { data: res } = await getTabletToken({
          variables: { code: tableCode, type: 'TB', device: await getDeviceId() },
        });
        await setSession(res.getToken.token, res.getToken.id);
      }

      const state = await Battery.getPowerStateAsync();
      const percent = Math.round((state?.batteryLevel ?? 0) * 100);
      const charging =
        state?.batteryState === Battery.BatteryState.CHARGING || state?.batteryState === Battery.BatteryState.FULL;
      await sendBattery({ variables: { id: tableId, battery: percent, charging } });
    };
    const run = () =>
      push().catch((err) => {
        if (cancelled) return;

        if (!err?.graphQLErrors?.some((e: any) => ['TL0003', 'TL0004'].includes(e.errorType))) return;
        leave();
      });
    run();
    const id = setInterval(run, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tableId, tableCode]);

  const participant = data?.getParticipant;

  if (planExpired) {
    return (
      <SafeAreaView style={styles.fill}>
        <PlanExpired onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  if (!participantId || !participant) return <Loader />;

  return (
    <SafeAreaView style={styles.fill}>
      <ScreensaverWrapper images={images} delay={10000} interval={5000}>
        <Container participant={participant} />
        <OrderFloatingButton />
        <HelpFloatingButton />
      </ScreensaverWrapper>
    </SafeAreaView>
  );
};

export default Private;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
