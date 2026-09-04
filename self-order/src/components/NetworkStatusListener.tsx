import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';
import { isOffline, subscribeNetwork } from '@/src/utils/network';

const GRACE_MS = 4000;

const NetworkStatusListener = () => {
  const { t } = useTranslation('language');
  const toast = useToast();
  const toastId = useRef<string | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearPending = () => {
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
    };

    const apply = (offline: boolean) => {
      if (!offline) {
        clearPending();
        if (toastId.current) {
          toast.hide(toastId.current);
          toastId.current = null;
        }
        return;
      }

      if (toastId.current || pending.current) return;

      pending.current = setTimeout(() => {
        pending.current = null;
        if (!isOffline()) return;

        toastId.current = toast.show(t('mainPage.no_internet', 'No internet connection'), {
          type: 'danger',
          placement: 'top',
          duration: 0,
        });
      }, GRACE_MS);
    };

    apply(isOffline());
    const unsubscribe = subscribeNetwork(apply);

    return () => {
      unsubscribe();
      clearPending();
    };
  }, [toast, t]);

  return null;
};

export default NetworkStatusListener;
