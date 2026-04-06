import React, { useContext, useEffect, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import * as Battery from 'expo-battery';
import { router } from 'expo-router';

import Container from '@/src/components/Container';
import HelpFloatingButton from '@/src/components/HelpFloatingButton';
import OrderFloatingButton from '@/src/components/OrderFloatingButton';
import Loader from '@/src/components/ui/Loader';
import { emptyOrder } from '@/src/constants';
import { GET_BANNERS, GET_BRANCH } from '@/src/graphql/queries';
import { UPDATE_BATTERY } from '@/src/graphql/mutations/table';
import { AuthContext } from '@/src/providers/auth';
import ScreensaverWrapper from '@/src/providers/ScreensaverWrapper';
import { useCallStore } from '@/src/store/cart.store';
import { getStorage } from '@/src/store/storage';
import { useLazyQuery, useMutation } from '@apollo/client';

const Private = () => {
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const { signOut } = useContext(AuthContext);
  const { setParticipant, order, load, setTables } = useCallStore();

  // Load participantId from storage once on mount
  useEffect(() => {
    getStorage('participantId').then((id) => {
      if (id) setParticipantId(id);
    });
  }, []);

  const { data, loading } = useQuery(GET_BRANCH, {
    variables: { id: participantId },
    skip: !participantId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 600000,
    onError() {
      signOut();
      router.navigate('/');
    },
  });

  const [getBanners] = useLazyQuery(GET_BANNERS, { fetchPolicy: 'network-only' });

  // When participant data arrives, sync to store
  useEffect(() => {
    if (!data?.getParticipant) return;
    const p = data.getParticipant;
    setParticipant(p);
    if (p.orderable && !order) load(emptyOrder);
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
  const tableId = data?.getParticipant?.table?.id;

  useEffect(() => {
    if (Platform.OS === 'web' || !tableId) return;
    const push = async () => {
      const state = await Battery.getPowerStateAsync();
      const percent = Math.round((state?.batteryLevel ?? 0) * 100);
      const charging =
        state?.batteryState === Battery.BatteryState.CHARGING || state?.batteryState === Battery.BatteryState.FULL;
      sendBattery({ variables: { id: tableId, battery: percent, charging } });
    };
    push();
    const id = setInterval(push, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [tableId]);

  const participant = data?.getParticipant;

  if (!participantId || (loading && !participant)) return <Loader />;

  return (
    <SafeAreaView style={styles.fill}>
      <ScreensaverWrapper images={images} delay={10000} interval={5000}>
        {participant && <Container participant={participant} />}
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
