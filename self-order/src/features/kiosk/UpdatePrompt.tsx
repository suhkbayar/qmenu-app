import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Button, Dialog, Spinner } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { useGuestBusy } from './useGuestBusy';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Checks for an OTA update and downloads it in the background; nothing shows until it's ready.
 * Errors surface through Updates.useUpdates() (checkError / downloadError), e.g. in the admin dialog.
 */
export const checkForUpdate = () =>
  Updates.checkForUpdateAsync()
    .then((update) => (update.isAvailable ? Updates.fetchUpdateAsync() : null))
    .catch(() => {});

/** Once an update is downloaded, asks to restart, but not while a guest has items in the cart or is paying. */
export const UpdatePrompt = () => {
  const { t } = useTranslation('language');
  const { isUpdatePending } = Updates.useUpdates();
  // Restarting would empty the cart or interrupt a payment
  const guestBusy = useGuestBusy();
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    checkForUpdate();
    const id = setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    // Also check whenever the app comes back to the screen, e.g. after staff leave kiosk mode
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const restart = () => {
    setRestarting(true);
    Updates.reloadAsync().catch(() => setRestarting(false));
  };

  return (
    <Dialog isOpen={isUpdatePending && !guestBusy} onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Overlay isCloseOnPress={false} />
        <Dialog.Content isSwipeable={false} className="w-110 gap-5 self-center p-7">
          <Dialog.Title className="text-center text-2xl">{t('mainPage.update_title')}</Dialog.Title>
          <Dialog.Description className="text-center text-base">{t('mainPage.update_body')}</Dialog.Description>
          <Button size="lg" className="rounded-2xl" isDisabled={restarting} onPress={restart}>
            {restarting && <Spinner />}
            <Button.Label numberOfLines={1} className="font-bold">{t('mainPage.update_button')}</Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
