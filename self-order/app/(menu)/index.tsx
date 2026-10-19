import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screensaver } from '@/src/features/kiosk/Screensaver';
import { MenuScreen } from '@/src/features/menu/MenuScreen';
import { IdleOverlay } from '@/src/features/session/IdleOverlay';
import { PlanExpired } from '@/src/features/session/PlanExpired';
import { useSessionStore } from '@/src/features/session/sessionStore';
import { useTableSession } from '@/src/features/session/useTableSession';
import { LoadingScreen } from '@/src/ui/LoadingScreen';

/** The menu, behind the screensaver. Android's back opens the table-code screen. */
export default function MenuRoute() {
  const { pid } = useLocalSearchParams<{ pid?: string }>();
  const { participant, planExpired, retry, screensaverBanners } = useTableSession(pid);
  const bannerSound = useSessionStore((s) => s.config?.bannerSound === true);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/setup');
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  if (planExpired) return <PlanExpired onRetry={() => retry()} />;
  if (!participant) return <LoadingScreen />;

  return (
    // 8 s a banner: long enough to read, within the 8–12 s kiosks use
    <Screensaver
      banners={screensaverBanners}
      delay={10000}
      interval={8000}
      overlay={<IdleOverlay />}
      sound={bannerSound}
    >
      <MenuScreen participant={participant} />
    </Screensaver>
  );
}
