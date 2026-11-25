import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { gql, useApolloClient, useLazyQuery, useQuery } from '@apollo/client';
import { router } from 'expo-router';
import { useActivity } from '@/src/features/kiosk/activity';
import { Banner, toBanner } from '@/src/features/kiosk/Screensaver';
import { useBatteryReport } from '@/src/features/kiosk/useBatteryReport';
import { GET_BANNERS, GET_BRANCH } from '@/src/graphql/queries';
import { ON_UPDATED_MENU } from '@/src/graphql/subscriptions';
import { MenuItemState } from '@/src/constants';
import { isOffline, subscribeNetwork } from '@/src/lib/network';
import { getStorage, removeStorage } from '@/src/lib/storage';
import { AuthContext, onSessionEnd } from '@/src/providers/auth';
import { useValid } from '@/src/providers/ValidProvider';
import { useSessionStore } from './sessionStore';

// A full reload waits until the tablet has been left alone this long (the screensaver is up by then),
// checked this often
const QUIET_MS = 15 * 1000;
const QUIET_CHECK_MS = 5 * 1000;
// Offline at least this long, the tablet may have missed menu edits: the menu is reloaded
const MISSED_EDITS_MS = 60 * 1000;
// Offline at start-up: try loading the table again this often
const COLD_RETRY_MS = 5000;
// The branch closed for now: checked again this often, so the menu comes back by itself when it opens
const CLOSED_RETRY_MS = 60 * 1000;

/**
 * Why the menu can't be shown: the branch's QMenu plan ran out, or the branch is closed or inactive.
 * The tablet stays on its table either way.
 */
export type SessionBlock = 'plan' | 'closed';

// The server's error codes: plan expired; branch closed, inactive; the table or its channel is gone
const PLAN_EXPIRED = 'PE0001';
const BRANCH_UNAVAILABLE = ['BR0002', 'BR0004'];
const TABLE_GONE = 'CE0004';
// The table and menu are reloaded this often while the tablet is in use. Menu and settings changes
// come in live (the menu event), so this only catches what isn't sent that way (photos, product
// details) and anything missed while offline.
const BRANCH_POLL_MS = 30 * 60 * 1000;
// Untouched this long (night, a quiet spell), the tablet stops reloading until someone touches it
const IDLE_MS = 30 * 60 * 1000;

// A dish's availability, as kept in the menu
const DISH_STATE = gql`
  fragment DishState on MenuProduct {
    id
    state
  }
`;

/** A menu event: what changed (MENU, CATEGORY, PRODUCT), how, the new state, and which ones */
type MenuEvent = { type?: string | null; action?: string | null; state?: string | null; ids?: (string | null)[] | null };
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
  const [blocked, setBlocked] = useState<SessionBlock | null>(null);
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

  const { data, refetch } = useQuery(GET_BRANCH, {
    variables: { id: participantId },
    skip: !participantId,
    fetchPolicy: 'cache-and-network',
    // Only a table that's gone signs the tablet out to the table-code screen. Anything else (offline, a
    // slow or failing server, say during an update) keeps it on its table: signing out 600 tablets for
    // a passing error would leave staff re-entering every code.
    onError(error) {
      const codes: string[] = (error.graphQLErrors ?? []).map((e: any) => e.errorType);
      if (codes.includes(PLAN_EXPIRED)) return setBlocked('plan');
      if (codes.some((code) => BRANCH_UNAVAILABLE.includes(code))) return setBlocked('closed');
      if (codes.includes(TABLE_GONE)) leave();
    },
  });

  const participant = data?.getParticipant;
  const branchId = participant?.branch?.id;

  // Asks for the table again; an answer clears the plan or closed screen (the answer can be the same as
  // the copy already kept, which wouldn't count as new data)
  const checkAgain = useCallback(
    () =>
      refetch().then((result) => {
        if (result.data?.getParticipant) setBlocked(null);
        return result;
      }),
    [refetch],
  );

  // Nothing loaded yet (started without a connection, e.g. just after the tablet was switched on):
  // keep trying every few seconds, and at once when the connection is back. On a timer, not on each
  // failure: a failure just like the one before doesn't redraw, so after a reboot the first retry was
  // also the last, and the tablet showed loading for good though the internet was back.
  // A closed branch is checked again now and then, so the menu comes back by itself when it reopens.
  useEffect(() => {
    if (!participantId || blocked === 'plan' || (data && blocked !== 'closed')) return;
    const retry = () => checkAgain().catch(() => {});
    const id = setInterval(retry, blocked === 'closed' ? CLOSED_RETRY_MS : COLD_RETRY_MS);
    const unsubscribeNetwork = subscribeNetwork((offline) => {
      if (!offline) retry();
    });
    return () => {
      clearInterval(id);
      unsubscribeNetwork();
    };
  }, [participantId, data, blocked, checkAgain]);

  // The restaurant's tablet banners (pictures or videos) become the screensaver. Loaded with the
  // table, and again with every reload below, so a new banner shows without restarting the app.
  const [getBanners] = useLazyQuery(GET_BANNERS, { fetchPolicy: 'network-only' });
  const loadBanners = useCallback(() => {
    getBanners()
      .then(({ data: bannerData }) => {
        const banners: Banner[] = (bannerData?.getBanners ?? [])
          .filter((b: { image: string; type: string }) => b.image && b.type === 'TB')
          .map((b: { image: string }) => toBanner(b.image));
        // The same list keeps the same array, so a slideshow that's on isn't restarted
        setScreensaverBanners((current) =>
          current.length === banners.length && current.every((b, i) => b.uri === banners[i].uri) ? current : banners,
        );
      })
      .catch(() => {});
  }, [getBanners]);

  useEffect(() => {
    if (participantId) loadBanners();
  }, [participantId, loadBanners]);

  // When the table and menu were last asked for: the reloads below go by it
  const lastLoad = useRef(Date.now());
  const reload = useCallback(() => {
    lastLoad.current = Date.now();
    refetch().catch(() => {});
    loadBanners();
  }, [refetch, loadBanners]);

  /**
   * A full reload (the whole menu downloaded, stored and drawn again) is a big job for a small tablet:
   * done while a guest was using it, the screen froze for a moment. So it waits until the tablet has
   * been left alone a little (the screensaver is up by then), whatever asked for it: a menu edit other
   * than a dish's availability (that's set in place, below), a time offline long enough to have missed
   * edits, or the routine reload every 30 minutes for what isn't sent live (photos, product details).
   * Left alone 30 minutes or more (night, a quiet spell), the routine one waits for the next guest to
   * finish: 600 tablets reloading around the clock was most of what they cost the server.
   */
  const reloadWanted = useRef(false);
  const requestReload = useCallback(() => {
    reloadWanted.current = true;
  }, []);

  useEffect(() => {
    if (!participantId) return;
    lastLoad.current = Date.now();
    const id = setInterval(() => {
      const untouched = Date.now() - useActivity.getState().lastTouch;
      if (untouched < QUIET_MS) return;
      const routine = Date.now() - lastLoad.current >= BRANCH_POLL_MS && untouched < IDLE_MS;
      if (!reloadWanted.current && !routine) return;
      reloadWanted.current = false;
      reload();
    }, QUIET_CHECK_MS);
    return () => clearInterval(id);
  }, [participantId, reload]);

  /**
   * Dishes switched on or off, or sold out: just their state, in place, so only those cards are drawn
   * again. Answers whether any of them is on this tablet's menu (the event can list other branches'
   * dishes too).
   */
  const setDishStates = useCallback(
    (ids: string[], state: string) => {
      let found = false;
      apollo.cache.batch({
        update(cache) {
          for (const id of ids) {
            const entity = cache.identify({ __typename: 'MenuProduct', id });
            // On this tablet's menu (a dish already in that state counts too)
            if (!entity || !cache.readFragment({ id: entity, fragment: DISH_STATE })) continue;
            found = true;
            cache.modify({ id: entity, fields: { state: () => state } });
          }
        },
      });
      return found;
    },
    [apollo],
  );

  // A menu event: a dish's availability is set in place; anything else, a reload once left alone. A
  // dish switched on that this tablet doesn't have yet (or removed) needs the reload too.
  const onMenuEvent = useRef<(event?: MenuEvent | null) => void>(() => {});
  onMenuEvent.current = (event) => {
    const ids = (event?.ids ?? []).filter((id): id is string => !!id);
    if (event?.type === 'PRODUCT' && ids.length) {
      if (event.action === 'DELETE') {
        setDishStates(ids, MenuItemState.INACTIVE);
      } else if (event.state && setDishStates(ids, event.state)) {
        return;
      }
    }
    requestReload();
  };

  // Menu edits and the channel's settings (payments, configs, ordering on or off) come in here.
  // Tablets stay on all day, so a dropped connection mustn't end it: it reconnects with backoff, and
  // straight away when the network comes back.
  useEffect(() => {
    if (!branchId) return;
    let subscription: { unsubscribe: () => void } | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let stopped = false;
    // Since when the tablet has been offline, to tell a real outage from a blip
    let offlineSince: number | null = isOffline() ? Date.now() : null;

    const connect = () => {
      subscription?.unsubscribe();
      subscription = apollo.subscribe({ query: ON_UPDATED_MENU, variables: { branch: branchId } }).subscribe({
        next: (result) => {
          failures = 0;
          onMenuEvent.current(result.data?.onUpdatedMenu);
        },
        // No reload on each retry: with the connection down for long, that would reload the whole
        // menu every 30 s. The reload comes when the network is back.
        error: () => {
          if (stopped) return;
          clearTimeout(retry);
          retry = setTimeout(connect, Math.min(RECONNECT_BASE_MS * 2 ** failures++, RECONNECT_MAX_MS));
        },
      });
    };

    connect();
    const unsubscribeNetwork = subscribeNetwork((offline) => {
      if (offline) {
        offlineSince ??= Date.now();
        return;
      }
      const downFor = offlineSince === null ? 0 : Date.now() - offlineSince;
      offlineSince = null;
      clearTimeout(retry);
      failures = 0;
      connect();
      // Down long enough to have missed menu edits: a reload, once the tablet is left alone. Not for a
      // blip (one slow request on busy Wi-Fi counts as offline), which reloaded the menu over and over.
      if (downFor >= MISSED_EDITS_MS) requestReload();
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
    setBlocked(null);
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

  useBatteryReport(participant?.table?.id, participant?.table?.code, leave);

  return { participant, blocked, retry: checkAgain, screensaverBanners };
};
