import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, AppState } from 'react-native';
import { getStorage } from '@/cache';
import { useCallStore } from '@/cache/cart.store';
import { GET_BANNERS, GET_BRANCH } from '@/graphql/query';
import { useLazyQuery } from '@apollo/client';
import { isEmpty } from 'lodash';

// Components
import HelpFloatingButton from '@/components/FloatingButton/HelpFloatingButton';
import Loader from '@/components/Loader';
import Container from '@/template/container';
import { AuthContext } from '@/providers/auth';
import { router } from 'expo-router';
import { emptyOrder } from '@/constants';
import { ICustomerTable } from '@/types';

// Import the refined components
import ScreensaverWrapper from '@/providers/ScreensaverWrapper';
import ActivityDetector from '@/components/ActivityDetector';
import TableQrFloatingButton from '@/components/FloatingButton/TableQrFloatingButtin';

// Create memoized components to prevent unnecessary re-renders
const MemoizedContainer = React.memo(({ participant }: any) => <Container participant={participant} />);

const MemoizedHelpButton = React.memo(() => <HelpFloatingButton />);
const MemoizedTableButton = React.memo(() => <TableQrFloatingButton />);

const Private = () => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<any[]>([]);
  const [isUserActive, setIsUserActive] = useState(true);
  const inactivityTimer = useRef<number | null>(null);

  const { signOut } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const { setParticipant, order, load, setTables } = useCallStore();

  // Handle user activity
  const handleUserActivity = useCallback(() => {
    // Reset user activity state
    setIsUserActive(true);

    // Clear any existing inactivity timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    // Set new inactivity timer
    inactivityTimer.current = setTimeout(() => {
      setIsUserActive(false);
    }, 30000); // 30 seconds of inactivity before screensaver can appear
  }, []);

  // Query for banners (which will be used as screensaver images)
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

  // Query for branch data
  const [getBranch, { loading: loadBranch, data }] = useLazyQuery(GET_BRANCH, {
    fetchPolicy: 'network-only',
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

  // Handle app state changes
  const handleAppStateChange = useCallback(
    (nextAppState: string) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, refresh data and reset activity
        refreshData();
        handleUserActivity();
      }

      appState.current = nextAppState as any;
    },
    [handleUserActivity],
  );

  // Refresh data function
  const refreshData = useCallback(async () => {
    const participantId = await getParticipantId();
    if (participantId) {
      getBranch({ variables: { id: participantId } });
      getBanners();
    }
  }, [getBranch, getBanners]);

  // Initial setup and cleanup
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
    handleUserActivity(); // Initialize activity tracking

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, []);

  if (loading || loadBranch || loadBanners) return <Loader />;

  const participantData = data?.getParticipant;

  return (
    <ActivityDetector onActivity={handleUserActivity}>
      <ScreensaverWrapper
        images={images}
        delay={50000} // Short delay because we're controlling inactivity in this component
        interval={5000} // Change image every 5 seconds
      >
        <SafeAreaView style={styles.safeArea}>
          {participantData && <MemoizedContainer participant={participantData} />}
          <MemoizedTableButton />
          <MemoizedHelpButton />
        </SafeAreaView>
      </ScreensaverWrapper>
    </ActivityDetector>
  );
};

export default Private;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
