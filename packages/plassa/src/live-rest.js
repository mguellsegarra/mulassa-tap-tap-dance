// The live-update check of the app's start (docs/app/native-shell.md, contract 5), from the page the iOS bridge rests on behind
// the launcher (app/rest.html): it downloads the site's newer bundle (games, art and catalogue together) and asks the launcher
// before switching, which refuses while a game is opening and checks the bundle's catalogue (contract 6). After the switch this
// page loads again from the new bundle (keepUrlPathAfterReload) and says it is up, and the launcher reads the new catalogue.
// Android checks from Kotlin (launcher/LiveUpdate.kt): no web view there.
import { checkLiveUpdate } from './native.js';

// set() itself, not applyLiveUpdate(): its return path would send the next game to this page should the switch fail
export async function restCheck(shell, updater, check = checkLiveUpdate) {
  shell.rested().catch(() => {});
  try {
    const { url } = (await shell.liveServer?.().catch(() => null)) ?? {}; // a debug build's typed site, over the build's
    const id = await check(updater, url || undefined);
    if (id && (await shell.mayUpdate({ id })).ok) await updater.set({ id });
  } catch { shell.rested().catch(() => {}); } // a failed switch: the launcher stops waiting for this page
}

const plugins = globalThis.Capacitor?.Plugins;
if (plugins?.CapacitorUpdater && plugins?.Mulassa) restCheck(plugins.Mulassa, plugins.CapacitorUpdater);
else plugins?.Mulassa?.rested().catch(() => {});
