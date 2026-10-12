import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { create } from 'zustand';
import { Kiosk } from '@/modules/kiosk';
import { useSessionStore } from '@/src/features/session/sessionStore';

// The same APK the provisioning QR code installs; replace it on S3 for a new build
const APK_URL = 'https://qmenu-installs.s3.ap-east-1.amazonaws.com/qmenu-self-order.apk';
// Tells tablets which build the APK above is; raising versionCode is what makes them update.
// Upload the APK first, then this file.
const RELEASE_URL = 'https://qmenu-installs.s3.ap-east-1.amazonaws.com/qmenu-self-order.json';

export const APP_PACKAGE = Constants.expoConfig?.android?.package ?? '';

/** The app version and its build number, e.g. "2.0.5 (41)". */
export const appVersion = () => {
  const build = Kiosk.installedVersion(APP_PACKAGE);
  return `${Constants.expoConfig?.version ?? '?'}${build ? ` (${build})` : ''}`;
};

/** The JS the app runs: the one in the build, or an OTA update by its short id. */
export const describeUpdate = () => {
  if (!Updates.isEnabled) return 'updates off';
  if (Updates.isEmbeddedLaunch) return 'embedded';
  return `OTA ${Updates.updateId?.replace(/-/g, '').slice(0, 8) ?? '?'}`;
};

/**
 * qmenu-self-order.json:  { "versionCode": 15, "branches": ["<branch id>"] }
 *
 * versionCode is the build number EAS shows for the build. "branches" is optional: with it, only
 * those branches update; remove it to update every tablet.
 */
type Release = { versionCode: number; branches?: string[] };

type AppUpdateState = {
  /** The build number of a newer APK, waiting to be installed */
  available: number | null;
  installing: boolean;
  error: string | null;
  check: () => Promise<void>;
  install: () => Promise<void>;
};

/**
 * Native (APK) updates for changes eas update can't ship, e.g. a new Expo SDK or native library.
 * Only on device-owner tablets, which can install silently. AppUpdater decides when to install.
 */
export const useAppUpdate = create<AppUpdateState>()((set, get) => ({
  available: null,
  installing: false,
  error: null,

  check: async () => {
    if (!APP_PACKAGE || !Kiosk.isDeviceOwner()) return;
    try {
      // The timestamp skips any cache, so a new release is seen right away
      const response = await fetch(`${RELEASE_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error(`Release check failed: HTTP ${response.status}`);
      const release: Release = await response.json();

      const branchId = useSessionStore.getState().participant?.branch?.id;
      const forThisBranch = !release.branches?.length || (!!branchId && release.branches.includes(branchId));
      const newer = release.versionCode > (Kiosk.installedVersion(APP_PACKAGE) ?? 0);
      set({ available: newer && forThisBranch ? release.versionCode : null, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  install: async () => {
    const { available, installing } = get();
    if (!available || installing) return;
    set({ installing: true, error: null });
    try {
      // On success the app restarts on the new version, so this rarely returns
      await Kiosk.installApp(APP_PACKAGE, APK_URL);
      set({ installing: false, available: null });
    } catch (err) {
      // Don't retry a broken release over and over; the next check finds it again
      set({ installing: false, available: null, error: (err as Error).message });
    }
  },
}));
