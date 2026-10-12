import { useCallback } from 'react';
import { useMutation } from '@apollo/client';
import { useToast } from 'heroui-native';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { WAITER_CALL } from '@/src/graphql/mutations/waiter';

export type ServiceRequest = 'waiter' | 'bill' | 'clean';

// The staff app shows this text, so it is always sent in Mongolian, whatever language the guest picked
const STAFF_MESSAGE_KEY: Record<ServiceRequest, string> = {
  waiter: 'mainPage.call_waiter',
  bill: 'mainPage.request_bill',
  clean: 'mainPage.table_clean',
};

// A request can't be sent again for this long, so staff don't get the same call twice
const COOLDOWN_MS = 60_000;

type RequestState = {
  /** Sent within the cooldown */
  sent: Partial<Record<ServiceRequest, boolean>>;
  /** Being sent right now */
  pending: ServiceRequest | null;
};

const useRequestStore = create<RequestState>()(() => ({ sent: {}, pending: null }));

const markSent = (request: ServiceRequest) => {
  useRequestStore.setState((s) => ({ sent: { ...s.sent, [request]: true } }));
  setTimeout(() => useRequestStore.setState((s) => ({ sent: { ...s.sent, [request]: false } })), COOLDOWN_MS);
};

/** Call waiter / request bill / table cleaning. A toast confirms each one; repeats within a minute aren't sent. */
export const useServiceRequest = () => {
  const { t } = useTranslation('language');
  const { toast } = useToast();
  const pending = useRequestStore((s) => s.pending);
  const [call] = useMutation(WAITER_CALL);

  /** Resolves true once staff have the request (just now or within the last minute) */
  const send = useCallback(
    async (request: ServiceRequest) => {
      const state = useRequestStore.getState();
      if (state.pending) return false;
      if (state.sent[request]) {
        toast.show({ variant: 'default', label: t('mainPage.requestAlreadySent') });
        return true;
      }
      useRequestStore.setState({ pending: request });
      const staffT = i18n.getFixedT('mn', 'language');
      try {
        await call({ variables: { message: staffT(STAFF_MESSAGE_KEY[request]) } });
        markSent(request);
        toast.show({ variant: 'success', label: t('mainPage.requestSentMessage') });
        return true;
      } catch {
        toast.show({ variant: 'danger', label: t('mainPage.requestFailed') });
        return false;
      } finally {
        useRequestStore.setState({ pending: null });
      }
    },
    [call, toast, t],
  );

  return { send, pending };
};
