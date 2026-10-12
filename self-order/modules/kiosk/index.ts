import { requireOptionalNativeModule } from 'expo';

type KioskNative = {
  isDeviceOwner(): boolean;
  startKioskMode(): Promise<void>;
  stopKioskMode(): Promise<void>;
  setAllowedApps(extra: string[]): Promise<void>;
  installedVersion(packageName: string): number | null;
  installApp(packageName: string, url: string): Promise<void>;
};

// Android only; elsewhere every call is a no-op
const native = requireOptionalNativeModule<KioskNative>('Kiosk');

export const Kiosk = {
  /** True when the tablet was set up with QR provisioning or adb, which enables the full lock. */
  isDeviceOwner: (): boolean => native?.isDeviceOwner() ?? false,

  /**
   * Pin the tablet to the app. As device owner, also hide every app with a home-screen icon except
   * [allowedApps] and the basics (this app, home screen, keyboard, Settings, Camera, Files).
   */
  start: async (allowedApps: string[] = []): Promise<void> => {
    await native?.startKioskMode();
    await native?.setAllowedApps(allowedApps);
  },

  /** Admin exit after the PIN: unpin and open the stock launcher. */
  stop: async (): Promise<void> => {
    await native?.stopKioskMode();
  },

  /** Version code of an installed app, or null when it isn't installed. */
  installedVersion: (packageName: string): number | null => native?.installedVersion(packageName) ?? null,

  /**
   * Download and silently install a newer APK of [packageName] (device owner only). Updating this app
   * restarts it, so the promise never resolves in that case; it rejects if anything fails.
   */
  installApp: async (packageName: string, url: string): Promise<void> => {
    if (!native) throw new Error('Not supported on this device');
    await native.installApp(packageName, url);
  },
};
