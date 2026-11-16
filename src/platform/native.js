// A copy of packages/plassa/src/native.js until mulassa.cat uses Plassa (tests/build/modules.mjs), as platform/haptics.js is.
// Inside the Capacitor app (branch poc/capacitor) the native plugins, through the bridge Capacitor injects before any
// script; on the web every export is a no-op. Read through the bridge, not imported, so the web bundle carries nothing.
const capPlugins = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
export const CAP_APP = !!capPlugins;
export const nativeHaptics = capPlugins?.Haptics ?? null;
// The app locks what the web can only ask for with the «gira» cover (phones upright, tablets and free play sideways).
export const nativeLock = orientation => capPlugins?.ScreenOrientation?.lock({ orientation }).catch(() => {});
capPlugins?.StatusBar?.hide().catch(() => {});
// Low Power Mode (iOS) / Battery Saver (Android), from the app's own plugin (SceneDelegate.swift, PowerPlugin.java): the web only
// guesses the first from its frames (render-quality.js) and cannot see the second. Asked once, then told on every change.
export const lowPowerState = { on: false };
capPlugins?.Power?.isLowPower().then(r => { lowPowerState.on = r.lowPower; }, () => {});
capPlugins?.Power?.addListener('change', r => { lowPowerState.on = r.lowPower; });
// Android's back button (the App plugin: once it is listened to, Capacitor no longer goes back in the history by itself, which
// left a run for the games menu): the open sheet first, as Escape would close it, then the page's own step back.
export function onNativeBack(stepBack) {
  capPlugins?.App?.addListener('backButton', () => {
    const sheet = [...document.querySelectorAll('dialog[open]')].pop(), cancel = new Event('cancel', { cancelable: true });
    if (!sheet) stepBack(); else if (sheet.dispatchEvent(cancel)) sheet.close();
  });
}
// The app covered by the system without being left (Control Center or a call on iOS, Android's notification shade): the page
// is told nothing (it stays visible and focused), so a run would go on under it. iOS: the App plugin's inactive state;
// Android: the window losing focus (MainActivity.java). A run pauses on either, as on leaving the page (page-leave.js).
export function onAppInactive(fn) {
  if (!capPlugins) return;
  capPlugins.App?.addListener('appStateChange', s => { if (!s.isActive) fn(); });
  addEventListener('nativeblur', fn);
}
export const leaveApp = () => capPlugins?.App?.minimizeApp().catch(() => {}); // the games menu's back: Android's home, the app kept
// The app's native launcher (ios/App/App/Launcher): a game's way out closes it there. The website, and an app without
// the launcher, go to the page given, as before.
export const exitGame = path => (capPlugins?.Mulassa ? capPlugins.Mulassa.exitToLauncher() : location.replace(path));
// The app's live updates are checked by the games' pages (packages/plassa/src/native.js), where it starts; this page only
// tells the updater it loaded, or a new bundle opened here would be rolled back.
capPlugins?.CapacitorUpdater?.notifyAppReady().catch(() => {});
// so update-watch.js, the same as Plassa's, never switches bundles here: the app does it on a games page
export const LIVE_UPDATES = false, checkLiveUpdate = null, applyLiveUpdate = null;
// Android's WebView has no navigator.share: the Share plugin stands in for it (share-ui.js), the image first written to the
// app's cache, since the plugin shares a file's address. Closing the system sheet reads as the web's AbortError.
const asBase64 = file => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(file); });
export const shareNav = capPlugins?.Share && typeof globalThis.navigator?.share !== 'function' ? {
  canShare: () => true,
  async share({ files: [file] = [], text, url }) {
    const files = file ? [(await capPlugins.Filesystem.writeFile({ path: file.name, data: await asBase64(file), directory: 'CACHE' })).uri] : undefined;
    await capPlugins.Share.share({ text, url, files }).catch(e => { throw /cancel/i.test(e?.message) ? new DOMException('closed', 'AbortError') : e; });
  },
} : globalThis.navigator;
