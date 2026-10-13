import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { useActivity } from '@/src/features/kiosk/activity';
import { Banner, toBanner } from '@/src/features/kiosk/Screensaver';
import { useBatteryReport } from '@/src/features/kiosk/useBatteryReport';
import { GET_BANNERS, GET_BRANCH } from '@/src/graphql/queries';
import { ON_UPDATED_MENU } from '@/src/graphql/subscriptions';
import { subscribeNetwork } from '@/src/lib/network';
import { getStorage, removeStorage } from '@/src/lib/storage';
import { AuthContext, onSessionEnd } from '@/src/providers/auth';
import { useValid } from '@/src/providers/ValidProvider';
import { useSessionStore } from './sessionStore';

// Menu edits come in bursts: wait for a quiet moment, but never longer than the max
const MENU_REFETCH_QUIET_MS = 4000;
const MENU_REFETCH_MAX_WAIT_MS = 15000;
// Offline at start-up: try loading the table again this often
const COLD_RETRY_MS = 5000;
// The table and menu are reloaded this often while the tablet is in use. Menu and settings changes
// come in live (the menu event), so this only catches what isn't sent that way (photos, product
// details) and anything missed while offline.
const BRANCH_POLL_MS = 30 * 60 * 1000;
const POLL_CHECK_MS = 5 * 60 * 1000;
// Untouched this long (night, a quiet spell), the tablet stops reloading until someone touches it
const IDLE_MS = 30 * 60 * 1000;
// The menu event subscription, after it drops: retried after 1 s, then twice as long each time, up to 30 s
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

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
  const apollo = useApolloClient();
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

  // When the table and menu were last asked for: the reloads below go by it
  const lastLoad = useRef(Date.now());
  const reload = useCallback(() => {
    lastLoad.current = Date.now();
    refetch().catch(() => {});
  }, [refetch]);

  // Every 30 minutes while the tablet is in use. Untouched for 30 minutes (night, a quiet spell), it
  // waits instead, and reloads at the first touch if the menu is older than that: 600 tablets
  // reloading the whole menu around the clock was most of what they cost the server.
  useEffect(() => {
    if (!participantId) return;
    lastLoad.current = Date.now();
    // A reload for a menu event counts too, so one isn't followed by another straight after
    const id = setInterval(() => {
      const inUse = Date.now() - useActivity.getState().lastTouch < IDLE_MS;
      if (inUse && Date.now() - lastLoad.current >= BRANCH_POLL_MS) reload();
    }, POLL_CHECK_MS);
    const unsubscribe = useActivity.subscribe(() => {
      if (Date.now() - lastLoad.current >= BRANCH_POLL_MS) reload();
    });
    return () => {
      clearInterval(id);
      unsubscribe();
    };
  }, [participantId, reload]);

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
      reload();
    }, delay);
  }, [participantId, reload]);

  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    },
    [],
  );

  // The latest, so the subscription below doesn't restart when it changes
  const onMenuEvent = useRef(scheduleMenuRefetch);
  onMenuEvent.current = scheduleMenuRefetch;

  // Menu edits and the channel's settings (payments, configs, ordering on or off) come in here.
  // Tablets stay on all day, so a dropped connection mustn't end it: it reconnects with backoff, and
  // straight away when the network comes back, then reloads for whatever changed while it was down.
  useEffect(() => {
    if (!branchId) return;
    let subscription: { unsubscribe: () => void } | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let stopped = false;

    const connect = () => {
      subscription?.unsubscribe();
      subscription = apollo.subscribe({ query: ON_UPDATED_MENU, variables: { branch: branchId } }).subscribe({
        next: () => {
          failures = 0;
          onMenuEvent.current();
        },
        // No reload on each retry: with the connection down for long, that would reload the whole
        // menu every 30 s. The reload comes when the network is back, or with the 10-minute poll.
        error: () => {
          if (stopped) return;
          clearTimeout(retry);
          retry = setTimeout(connect, Math.min(RECONNECT_BASE_MS * 2 ** failures++, RECONNECT_MAX_MS));
        },
      });
    };

    connect();
    const unsubscribeNetwork = subscribeNetwork((offline) => {
      if (offline) return;
      clearTimeout(retry);
      failures = 0;
      connect();
      onMenuEvent.current();
    });

    return () => {
      stopped = true;
      subscription?.unsubscribe();
      clearTimeout(retry);
      unsubscribeNetwork();
    };
  }, [apollo, branchId]);

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
