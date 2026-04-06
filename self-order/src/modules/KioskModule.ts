import { NativeModules, Platform } from 'react-native';

const { KioskModule: Native } = NativeModules;

const KIOSK_APPS = ['com.mn.qmenu.selforder', 'com.gerege.mpos'];

export const KioskModule = {
  isDeviceOwner(): Promise<boolean> {
    if (Platform.OS !== 'android') return Promise.resolve(false);
    return Native.isDeviceOwner();
  },

  async startKiosk(): Promise<void> {
    if (Platform.OS !== 'android') return;
    const isOwner = await Native.isDeviceOwner();
    if (isOwner) await Native.setKioskApps(KIOSK_APPS);
    await Native.startKioskMode();
  },

  stopKiosk(): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve();
    return Native.stopKioskMode();
  },
};
