import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View, Text, AppState } from 'react-native';
import { getStorage } from '@/cache';
import { useCallStore } from '@/cache/cart.store';
import { GET_BANNERS, GET_BRANCH } from '@/graphql/query';
import { useLazyQuery, useMutation } from '@apollo/client';
import { isEmpty } from 'lodash';
import HelpFloatingButton from '@/components/FloatingButton/HelpFloatingButton';
import Loader from '@/components/Loader';
import Container from '@/template/container';
import { AuthContext } from '@/providers/auth';
import { router } from 'expo-router';
import { emptyOrder } from '@/constants';
import { ICustomerTable } from '@/types';
import * as Battery from 'expo-battery';

import ScreensaverWrapper from '@/providers/ScreensaverWrapper';
import TableQrFloatingButton from '@/components/FloatingButton/TableQrFloatingButtin';
import { UPDATE_BATTERY } from '@/graphql/mutation/table';

const MemoizedContainer = React.memo(({ participant }: any) => <Container participant={participant} />);

const MemoizedHelpButton = React.memo(() => <HelpFloatingButton />);
const MemoizedTableButton = React.memo(() => <TableQrFloatingButton />);

const Private = () => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<any[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { signOut } = useContext(AuthContext);
  const { setParticipant, order, load, setTables } = useCallStore();

  const [getBanners, { loading: loadBanners }] = useLazyQuery(GET_BANNERS, {
    fetchPolicy: 'network-only',
    onCompleted(data) {
      let imageUrls: string[] = [];
      data.getBanners.forEach((banner: any) => {
        if (banner.image && banner.type === 'TB') {
          imageUrls.push(banner.image);
        }
      });
      const screensaverImages = imageUrls.map((url) => ({ uri: url }));
      setImages(screensaverImages);
    },
    onError(err) {
      console.log(err, 'error fetching banners');
    },
  });

  const [getBranch, { loading: loadBranch, data }] = useLazyQuery(GET_BRANCH, {
    fetchPolicy: 'cache-and-network', // Use cache while updating in background
    pollInterval: 600000, // 10 minutes instead of 3 - reduces network load
    onCompleted(data) {
      setParticipant(data.getParticipant);
      if (data.getParticipant.orderable && isEmpty(order)) {
        load(emptyOrder);
      }

      if (data.getParticipant.table) {
        const incomingTables: ICustomerTable[] = [
          {
            id: data.getParticipant.id,
            branchName: data.getParticipant.branch.name,
            branchId: data.getParticipant.branch.id,
            branchLogo: data.getParticipant.branch.logo,
            tableName: data.getParticipant.table.name,
            tableId: data.getParticipant.table.id,
            code: data.getParticipant.table.code,
          },
        ];

        setTables(incomingTables);
      }
    },
    onError(err) {
      console.log(err, 'error fetching branch');
      signOut();
      router.navigate('/');
    },
  });

  const getParticipantId = async () => {
    return await getStorage('participantId');
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const participantId = await getParticipantId();
      if (participantId) {
        getBranch({ variables: { id: participantId } });
        getBanners();
      }
      setLoading(false);
    };

    fetchInitialData();

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);

  const [sendBattery] = useMutation(UPDATE_BATTERY);
  const tableId = data?.getParticipant?.table?.id;

  useEffect(() => {
    if (Platform.OS === 'web' || !tableId || !sendBattery) return;

    const push = async () => {
      const state = await Battery.getPowerStateAsync();
      const percent = Math.round((state?.batteryLevel ?? 0) * 100);
      const charging =
        state?.batteryState === Battery.BatteryState.CHARGING || state?.batteryState === Battery.BatteryState.FULL;
      await sendBattery({ variables: { id: tableId, battery: percent, charging } });
    };

    push();
    const id = setInterval(push, 5 * 60 * 1000);

    return () => clearInterval(id);
  }, [tableId, sendBattery]);

  if (loading || loadBranch || loadBanners) return <Loader />;

  const participantData = data?.getParticipant;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreensaverWrapper images={images} delay={300000} interval={5000}>
        {participantData && <MemoizedContainer participant={participantData} />}
        <MemoizedTableButton />
        <MemoizedHelpButton />
      </ScreensaverWrapper>
    </SafeAreaView>
  );
};

export default Private;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
