const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const HOME = 'android.intent.category.HOME';

// Registers the app as a home screen, so the tablet boots into the menu and Home returns to it.
// The receivers and provisioning activities live in this module's own AndroidManifest.xml.
module.exports = function withKioskHome(config) {
  return withAndroidManifest(config, (config) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    const filters = (activity['intent-filter'] ??= []);
    const isHome = (filter) => filter.category?.some((c) => c.$['android:name'] === HOME);

    if (!filters.some(isHome)) {
      filters.push({
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [{ $: { 'android:name': HOME } }, { $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      });
    }
    return config;
  });
};
