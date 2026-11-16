// Inside the Capacitor app (branch poc/capacitor) the native plugins, through the bridge Capacitor injects before any
// script; on the web every export is a no-op. Read through the bridge, not imported, so the web bundle carries nothing.
import { store } from './storage.js';

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
// The launch screen stays up (capacitor.config.json launchAutoHide: false) until the games menu is whole, so the app opens
// straight onto it, never onto a white web view; the boot watchdog lifts it too when it shows its error card.
export const hideSplash = () => capPlugins?.SplashScreen?.hide().catch(() => {});
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
// Live updates (Capgo updater, manual mode): the app runs the web it carries; update-watch.js downloads the site's newer
// build and switches to it, both only when the page is quiet. Never queued with next(): the plugin applies a queued bundle
// whenever the app goes to the background, mid-run too. A bundle that never says it is ready is rolled back (appReadyTimeout).
const liveUpdater = capPlugins?.CapacitorUpdater, LIVE_UPDATE_URL = (import.meta.env ?? {}).VITE_LIVE_UPDATE_URL;
export const LIVE_UPDATES = !!(liveUpdater && LIVE_UPDATE_URL);
liveUpdater?.notifyAppReady().catch(() => {});
// The site publishes app-bundle.json ({ build, manifest }: each file with its SHA-256, tools/deploy/app-bundle.mjs); the plugin
// fetches from the site only the files it lacks. Answers the id of the downloaded bundle to switch to, or null when none.
export async function checkLiveUpdate(updater = liveUpdater, base = LIVE_UPDATE_URL) {
  const at = url => fetch(url, { cache: 'no-store' }).then(r => r.json());
  const [here, there, { bundles = [] } = {}, failed] = await Promise.all([at('/version.json'), at(`${base}/app-bundle.json`), updater.list(), updater.getFailedUpdate()]);
  // A rolled-back bundle is deleted by the plugin and its failure reported once: kept here, or every launch would retry it
  const bad = new Set(readFailedBuilds()); if (failed?.bundle?.version) { bad.add(failed.bundle.version); saveFailedBuilds([...bad]); }
  if (!there.build || there.build === here.build || bad.has(there.build)) return null;
  const have = bundles.find(b => b.version === there.build && b.status === 'success'); // downloaded on an earlier, busy check
  if (have) return have.id;
  const manifest = there.manifest.map(f => ({ ...f, download_url: `${base}/${encodeURI(f.file_name)}` }));
  return (await updater.download({ url: `${base}/app-bundle.json`, version: there.build, manifest })).id; // url: required, unused
}
// set() reloads the web view at the app's start (Android) or at the root, which index.html sends on to Mulassa Games: the
// first plassa page to load goes back to the page that applied the update.
const LIVE_RETURN_KEY = 'live-update-return', liveReturn = store.get(LIVE_RETURN_KEY);
store.remove(LIVE_RETURN_KEY);
if (/^\/(?!\/)[\w/.-]*$/.test(liveReturn?.split('?')[0]) && liveReturn !== location.pathname + location.search) location.replace(liveReturn);
export function applyLiveUpdate(id, updater = liveUpdater) {
  store.set(LIVE_RETURN_KEY, location.pathname + location.search);
  return updater.set({ id });
}
const FAILED_BUILDS_KEY = 'live-update-failed';
function readFailedBuilds() { try { return JSON.parse(store.get(FAILED_BUILDS_KEY)) ?? []; } catch { return []; } }
const saveFailedBuilds = builds => store.set(FAILED_BUILDS_KEY, JSON.stringify(builds.slice(-20)));
