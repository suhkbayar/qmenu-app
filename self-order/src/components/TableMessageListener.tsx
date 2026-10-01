import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useLazyQuery, useMutation, useSubscription } from '@apollo/client';
import { useToast } from 'react-native-toast-notifications';
import { ON_TABLE_EVENT } from '@/src/graphql/subscriptions/tableMessage';
import { GET_PENDING_GIFTS } from '@/src/graphql/queries/gift';
import { MARK_GIFT_SEEN } from '@/src/graphql/mutations/gift';
import { getPayload } from '@/src/providers/auth';
import { TableMessageToastProps } from '@/src/components/ui/TableMessageToast';
import { TABLE_MESSAGE_STICKERS } from '@/src/constants';
import { useTableMessageStore } from '@/src/store/tableMessage.store';

type Identity = { branch: string; table: string };

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

const TableEventSubscription = ({
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

    onError: (error) => {
      console.error('onTableEvent subscription failed:', error.message);
      onFailure();
    },
    onData: ({ data }) => {
      const event = data?.data?.onTableEvent;
      if (event) onEvent(event);
    },
  });

  return null;
};

const TableMessageListener = () => {
  const toast = useToast();
  const openSitRequest = useTableMessageStore((s) => s.openSitRequest);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [epoch, setEpoch] = useState(0);
  const failures = useRef(0);
  const reconnect = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback(
    (data: TableMessageToastProps) => {
      toast.show('', { type: 'table_message', placement: 'center', duration: 0, data } as any);
    },
    [toast],
  );

  useEffect(() => {
    getPayload().then((payload) => {
      if (payload?.branch && payload?.table) {
        setIdentity({ branch: payload.branch, table: payload.table });
      }
    });
  }, []);

  const [markSeen] = useMutation(MARK_GIFT_SEEN, { onError: () => {} });

  const [loadPending] = useLazyQuery(GET_PENDING_GIFTS, {
    fetchPolicy: 'network-only',
    onCompleted(data) {
      (data?.getPendingGifts ?? []).forEach((gift: any) => {
        showMessage({
          giftId: gift.id,
          stickerId: gift.stickerId,
          fromTableId: gift.fromTableId,
          fromTableName: gift.fromTableName,
          isAnonymous: gift.anonymous === true,
          itemsSummary: gift.itemsSummary,
          isGift: true,
        });
        markSeen({ variables: { id: gift.id } });
      });
    },
  });

  const clearReconnect = useCallback(() => {
    if (reconnect.current) {
      clearTimeout(reconnect.current);
      reconnect.current = null;
    }
  }, []);

  useEffect(() => {
    let previous = AppState.currentState;

    const listener = AppState.addEventListener('change', (next) => {
      const wasAway = previous !== 'active';
      previous = next;
      if (next !== 'active' || !wasAway) return;

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

      const isGift = event.kind === 'GIFT';
      const isSitRequest = event.kind === 'SIT_REQUEST';
      const isSitReply = event.kind === 'SIT_REPLY';
      const isReply = TABLE_MESSAGE_STICKERS.some((s) => s.id === event.stickerId && s.tone === 'REPLY');

      // A request needs an answer, so it gets a modal; everything else is a toast.
      if (isSitRequest) {
        openSitRequest({ fromTableId: event.fromTableId, fromTableName: event.fromTableName });
        return;
      }

      showMessage({
        giftId: isGift ? event.id : undefined,
        stickerId: event.stickerId,
        isReply,
        sitAccepted: isSitReply ? event.accepted : null,
        fromTableId: event.fromTableId,
        fromTableName: event.fromTableName,
        isAnonymous: event.anonymous === true,
        itemsSummary: event.itemsSummary,
        isGift,
      });

      if (isGift) markSeen({ variables: { id: event.id } });
    },
    [showMessage, markSeen, openSitRequest],
  );

  useEffect(() => {
    if (identity) loadPending();
  }, [identity, epoch]);

  if (!identity) return null;

  return <TableEventSubscription key={epoch} identity={identity} onEvent={handleEvent} onFailure={handleFailure} />;
};

export default TableMessageListener;
