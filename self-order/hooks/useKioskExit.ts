import { useRef, useCallback, useState } from 'react';
import { Alert, NativeModules, Platform } from 'react-native';
import { useCallStore } from '@/cache/cart.store';

const { KioskModule } = NativeModules;

const FALLBACK_PIN = '1234';
const TAPS_REQUIRED = 10;
const TAP_WINDOW_MS = 3000;

export function useKioskExit() {
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinVisible, setPinVisible] = useState(false);
  const participant = useCallStore((state) => state.participant);

  const handleSecretTap = useCallback(() => {
    if (Platform.OS !== 'android') return;

    tapCount.current += 1;

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);

    if (tapCount.current >= TAPS_REQUIRED) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      setPinVisible(true);
    }
  }, []);

  const handlePinSubmit = useCallback(async (pin: string) => {
    const correctPin = participant?.configs?.find((c) => c.name === 'ADMIN_PIN')?.value || FALLBACK_PIN;

    if (pin === correctPin) {
      setPinVisible(false);
      try {
        await KioskModule.stopKioskMode();
      } catch (e) {
        Alert.alert('Error', 'Could not exit kiosk mode');
      }
    } else {
      Alert.alert('Wrong PIN');
    }
  }, [participant]);

  const handlePinCancel = useCallback(() => {
    setPinVisible(false);
  }, []);

  return { handleSecretTap, pinVisible, handlePinSubmit, handlePinCancel };
}
