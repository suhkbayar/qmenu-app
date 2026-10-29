import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Button, Dialog, Spinner, useThemeColor } from 'heroui-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { checkConnection } from '@/src/lib/network';
import { useActivity } from './activity';
import { useGuestBusy } from './useGuestBusy';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
// Untouched this long (the screensaver is on), a downloaded update restarts the app by itself:
// the restart takes a few seconds and nobody is using the tablet
const IDLE_MS = 60 * 1000;
// Asked only while someone is at the tablet (touched this recently, before the screensaver comes on)
const IN_USE_MS = 10 * 1000;
const IDLE_CHECK_MS = 5 * 1000;

/**
 * Checks for an OTA update and downloads it in the background; nothing shows until it's ready.
 * Errors surface through Updates.useUpdates() (checkError / downloadError), e.g. in the admin dialog.
 */
export const checkForUpdate = () =>
  Updates.checkForUpdateAsync()
    .then((update) => (update.isAvailable ? Updates.fetchUpdateAsync() : null))
    .catch(() => {});

/**
 * Once an update is downloaded: an idle tablet (screensaver on, cart empty, nobody paying) restarts
 * into it by itself. Only while a guest is using the tablet does it ask, and never while they have
 * items in the cart or are paying; once they've left, it restarts by itself too.
 */
export const UpdatePrompt = () => {
  const { t } = useTranslation('language');
  const accentForeground = useThemeColor('accent-foreground');
  const { isUpdatePending } = Updates.useUpdates();
  // Restarting would empty the cart or interrupt a payment
  const guestBusy = useGuestBusy();
  const [restarting, setRestarting] = useState(false);
  const [inUse, setInUse] = useState(true);

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

  // While an update waits: restart once nobody has touched the tablet for a minute, and only while
  // online, as the restarted app needs the internet to load the menu
  useEffect(() => {
    if (!isUpdatePending || guestBusy || restarting) return;
    let active = true;
    let asking = false;
    const check = () => {
      const untouched = Date.now() - useActivity.getState().lastTouch;
      setInUse(untouched < IN_USE_MS);
      if (untouched < IDLE_MS || asking) return;
      asking = true;
      checkConnection().then((online) => {
        asking = false;
        if (online && active) restart();
      });
    };
    check();
    const id = setInterval(check, IDLE_CHECK_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [isUpdatePending, guestBusy, restarting]);

  return (
    // Asked only while a guest is at the tablet; an idle one restarts without showing anything
    <Dialog isOpen={isUpdatePending && !guestBusy && inUse} onOpenChange={() => {}}>
      <Dialog.Portal>
        {/* No open/close animation: on the tablets it sometimes stalled, leaving the dialog or its
            dim backdrop stuck on screen */}
        <Dialog.Overlay isCloseOnPress={false} animation={false} />
        <Dialog.Content animation={false} isSwipeable={false} className="w-110 gap-5 self-center p-7">
          <Dialog.Title className="text-center text-2xl">{t('mainPage.update_title')}</Dialog.Title>
          <Dialog.Description className="text-center text-base">{t('mainPage.update_body')}</Dialog.Description>
          <Button size="lg" className="rounded-2xl" isDisabled={restarting} onPress={restart}>
            {/* Spinners default to the brand yellow, which vanishes on the yellow button */}
            {restarting && <Spinner color={accentForeground} />}
            <Button.Label numberOfLines={1} className="font-bold">{t('mainPage.update_button')}</Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
