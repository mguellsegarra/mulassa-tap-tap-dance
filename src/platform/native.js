// A copy of packages/plassa/src/native.js until mulassa.cat uses Plassa (tests/build/modules.mjs), as platform/haptics.js is.
// Inside the Capacitor app (branch poc/capacitor) the native plugins, through the bridge Capacitor injects before any
// script; on the web every export is a no-op. Read through the bridge, not imported, so the web bundle carries nothing.
const capPlugins = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
export const CAP_APP = !!capPlugins;
export const nativeHaptics = capPlugins?.Haptics ?? null;
// The app locks what the web can only ask for with the «gira» cover (phones upright, tablets and free play sideways).
export const nativeLock = orientation => capPlugins?.ScreenOrientation?.lock({ orientation }).catch(() => {});
capPlugins?.StatusBar?.hide().catch(() => {});
