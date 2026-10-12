import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import { TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { MARK_GIFT_SEEN } from '@/src/graphql/mutations/gift';
import { GET_PENDING_GIFTS } from '@/src/graphql/queries/gift';
import { ON_TABLE_EVENT } from '@/src/graphql/subscriptions/tableMessage';
import { getPayload } from '@/src/providers/auth';
import { useSocialStore } from './socialStore';

type Identity = { branch: string; table: string };

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const Subscription = ({
  identity,
  onEvent,
  onFailure,
}: {
  identity: Identity;
  onEvent: (event: any) => void;
  onFailure: () => void;
}) => {
  useSubscription(ON_TABLE_EVENT, {
    variables: identity,
    onError(error) {
      console.error('onTableEvent subscription failed:', error.message);
      onFailure();
    },
    onData({ data }) {
      const event = data?.data?.onTableEvent;
      if (event) onEvent(event);
    },
  });
  return null;
};

/**
 * Receives gifts, messages and sit-together events for this table and queues them for IncomingMessages.
 * Reconnects with backoff when the subscription drops, and when the app comes back to the screen;
 * each (re)connect also loads gifts that arrived while it was offline.
 */
export const TableEventListener = () => {
  const receive = useSocialStore((s) => s.receive);
  const [identity, setIdentity] = useState<Identity | null>(null);
  // Bumping this remounts the subscription, which reconnects it
  const [epoch, setEpoch] = useState(0);
  const failures = useRef(0);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPayload().then((payload) => {
      if (payload?.branch && payload?.table) setIdentity({ branch: payload.branch, table: payload.table });
    });
  }, []);

  const [markSeen] = useMutation(MARK_GIFT_SEEN, { onError: () => {} });

  const [loadPending] = useLazyQuery(GET_PENDING_GIFTS, {
    fetchPolicy: 'network-only',
    onCompleted(data) {
      for (const gift of data?.getPendingGifts ?? []) {
        receive({
          kind: 'gift',
          giftId: gift.id,
          stickerId: gift.stickerId,
          fromTableId: gift.fromTableId,
          fromTableName: gift.fromTableName,
          anonymous: gift.anonymous === true,
          itemsSummary: gift.itemsSummary,
        });
        markSeen({ variables: { id: gift.id } });
      }
    },
  });

  const clearReconnect = useCallback(() => {
    if (reconnect.current) clearTimeout(reconnect.current);
    reconnect.current = null;
  }, []);

  useEffect(() => {
    let previous = AppState.currentState;
    const listener = AppState.addEventListener('change', (state) => {
      const wasAway = previous !== 'active';
      previous = state;
      if (state !== 'active' || !wasAway) return;
      clearReconnect();
      failures.current = 0;
      setEpoch((n) => n + 1);
    });
    return () => {
      listener.remove();
      clearReconnect();
    };
  }, [clearReconnect]);

  const handleFailure = useCallback(() => {
    if (reconnect.current) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** failures.current, RECONNECT_MAX_MS);
    failures.current += 1;
    reconnect.current = setTimeout(() => {
      reconnect.current = null;
      setEpoch((n) => n + 1);
    }, delay);
  }, []);

  const handleEvent = useCallback(
    (event: any) => {
      failures.current = 0;
      const from = { fromTableId: event.fromTableId, fromTableName: event.fromTableName };

      if (event.kind === 'SIT_REQUEST') return receive({ kind: 'sit-request', ...from });
      if (event.kind === 'SIT_REPLY') return receive({ kind: 'sit-reply', accepted: event.accepted, ...from });

      const isGift = event.kind === 'GIFT';
      receive({
        kind: isGift ? 'gift' : 'message',
        giftId: isGift ? event.id : undefined,
        stickerId: event.stickerId,
        anonymous: event.anonymous === true,
        itemsSummary: event.itemsSummary,
        isReply: TABLE_MESSAGE_STICKERS.some((s) => s.id === event.stickerId && s.tone === 'REPLY'),
        ...from,
      });
      if (isGift) markSeen({ variables: { id: event.id } });
    },
    [receive, markSeen],
  );

  useEffect(() => {
    if (identity) loadPending();
  }, [identity, epoch]);

  if (!identity) return null;
  return <Subscription key={epoch} identity={identity} onEvent={handleEvent} onFailure={handleFailure} />;
};
