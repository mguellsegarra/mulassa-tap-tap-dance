// Inside the Capacitor app (branch poc/capacitor) the native plugins, through the bridge Capacitor injects before any
// script; on the web every export is a no-op. Read through the bridge, not imported, so the web bundle carries nothing.
import { store } from './storage.js';

const capPlugins = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
export const CAP_APP = !!capPlugins;
export const nativeHaptics = capPlugins?.Haptics ?? null;
// The app locks what the web can only ask for with the «gira» cover (phones upright, tablets and free play sideways).
export const nativeLock = orientation => capPlugins?.ScreenOrientation?.lock({ orientation }).catch(() => {});
capPlugins?.StatusBar?.hide().catch(() => {});
// Live updates (Capgo updater, manual mode): the app runs the web it carries and, when the site has a newer build, downloads
// it and switches to it on the next launch. A bundle that never says it is ready is rolled back by the plugin (appReadyTimeout).
const liveUpdater = capPlugins?.CapacitorUpdater, LIVE_UPDATE_URL = (import.meta.env ?? {}).VITE_LIVE_UPDATE_URL;
liveUpdater?.notifyAppReady().catch(() => {});
if (liveUpdater && LIVE_UPDATE_URL) checkLiveUpdate().catch(() => {});
// The site publishes bundle.json ({ build, checksum }: the zip's SHA-256, which the plugin requires) next to bundle.zip.
export async function checkLiveUpdate(updater = liveUpdater, base = LIVE_UPDATE_URL) {
  const at = url => fetch(url, { cache: 'no-store' }).then(r => r.json());
  const [here, there, next, failed] = await Promise.all([at('/version.json'), at(`${base}/bundle.json`), updater.getNextBundle(), updater.getFailedUpdate()]);
  // A rolled-back bundle is deleted by the plugin and its failure reported once: kept here, or every launch would retry it
  const bad = new Set(readFailedBuilds()); if (failed?.bundle?.version) { bad.add(failed.bundle.version); saveFailedBuilds([...bad]); }
  if (!there.build || there.build === here.build || next?.version === there.build || bad.has(there.build)) return;
  const bundle = await updater.download({ url: `${base}/bundle.zip`, version: there.build, checksum: there.checksum });
  await updater.next({ id: bundle.id });
}
const FAILED_BUILDS_KEY = 'live-update-failed';
function readFailedBuilds() { try { return JSON.parse(store.get(FAILED_BUILDS_KEY)) ?? []; } catch { return []; } }
const saveFailedBuilds = builds => store.set(FAILED_BUILDS_KEY, JSON.stringify(builds.slice(-20)));
