import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLazyQuery, useQuery, useSubscription } from '@apollo/client';
import { router } from 'expo-router';
import { Banner, toBanner } from '@/src/features/kiosk/Screensaver';
import { useBatteryReport } from '@/src/features/kiosk/useBatteryReport';
import { GET_BANNERS, GET_BRANCH } from '@/src/graphql/queries';
import { ON_UPDATED_MENU } from '@/src/graphql/subscriptions';
import { getStorage, removeStorage } from '@/src/lib/storage';
import { AuthContext, onSessionEnd } from '@/src/providers/auth';
import { useValid } from '@/src/providers/ValidProvider';
import { useSessionStore } from './sessionStore';

// Menu edits come in bursts: wait for a quiet moment, but never longer than the max
const MENU_REFETCH_QUIET_MS = 4000;
const MENU_REFETCH_MAX_WAIT_MS = 15000;
// Offline at start-up: try loading the table again this often
const COLD_RETRY_MS = 5000;
const BRANCH_POLL_MS = 10 * 60 * 1000;

/**
 * This tablet's table: loads it (branch, menu, config) into the session store, keeps the menu fresh
 * when the restaurant edits it, reports the battery, and signs out to the table-code screen when the
 * table is gone. Also loads the screensaver's banners.
 *
 * `pid` is the participant just logged in as; otherwise the one saved on the tablet.
 */
export const useTableSession = (pid?: string) => {
  const [participantId, setParticipantId] = useState<string | null>(pid ?? null);
  const [planExpired, setPlanExpired] = useState(false);
  const [screensaverBanners, setScreensaverBanners] = useState<Banner[]>([]);
  const { signOut } = useContext(AuthContext);
  const { setValid } = useValid();
  const setParticipant = useSessionStore((s) => s.setParticipant);
  const setTables = useSessionStore((s) => s.setTables);

  useEffect(() => {
    if (participantId) return;
    getStorage('participantId').then((id) => {
      if (id) setParticipantId(id);
    });
  }, [participantId]);

  const leave = useCallback(() => {
    signOut();
    setValid(false);
    removeStorage('participantId');
    if (router.canDismiss()) router.dismissAll();
    router.replace('/setup');
  }, [signOut, setValid]);

  useEffect(() => onSessionEnd(leave), [leave]);

  const { data, refetch, error } = useQuery(GET_BRANCH, {
    variables: { id: participantId },
    skip: !participantId,
    fetchPolicy: 'cache-and-network',
    pollInterval: BRANCH_POLL_MS,
    onError(error) {
      if (error.graphQLErrors?.some((e: any) => e.errorType === 'PE0001')) {
        setPlanExpired(true);
        return;
      }
      // Offline: keep what's cached, the cold retry below tries again
      if (error.networkError) return;
      leave();
    },
  });

  const participant = data?.getParticipant;
  const branchId = participant?.branch?.id;

  // Started without a connection and nothing cached: keep trying
  useEffect(() => {
    if (!participantId || participant || !error?.networkError) return;
    const id = setTimeout(() => refetch().catch(() => {}), COLD_RETRY_MS);
    return () => clearTimeout(id);
  }, [participantId, participant, error, refetch]);

  // The restaurant edited the menu: reload it once the edits settle
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

  // Into the session store, for the rest of the app
  useEffect(() => {
    if (!participant) return;
    setPlanExpired(false);
    setParticipant(participant);
    if (participant.table) {
      setTables([
        {
          id: participant.id,
          branchName: participant.branch.name,
          branchId: participant.branch.id,
          branchLogo: participant.branch.logo,
          tableName: participant.table.name,
          tableId: participant.table.id,
          code: participant.table.code,
        },
      ]);
    }
  }, [data]);

  // The restaurant's tablet banners (pictures or videos) become the screensaver
  const [getBanners] = useLazyQuery(GET_BANNERS, { fetchPolicy: 'network-only' });
  useEffect(() => {
    if (!participantId) return;
    getBanners().then(({ data: bannerData }) => {
      const banners = (bannerData?.getBanners ?? [])
        .filter((b: { image: string; type: string }) => b.image && b.type === 'TB')
        .map((b: { image: string }) => toBanner(b.image));
      setScreensaverBanners(banners);
    });
  }, [participantId]);

  useBatteryReport(participant?.table?.id, participant?.table?.code, leave);

  return { participant, planExpired, retry: refetch, screensaverBanners };
};
