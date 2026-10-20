// A home-screen app on iOS (and a tab left open for days) wakes from memory instead of loading the page again, so a
// deploy never reaches it. On waking, compare the deployed build (/version.json, vite.config.js) with ours and reload
// on a newer one, but only on the menus with nothing open: never mid-song, never under a sheet or a typed field.
import { APP_BUILD } from '../core/version.js';
import { G } from '../game/state.js';
import { quietMoment, shouldReload } from './update-rules.js';

const UPDATE_TRIED = 'reloaded-for'; // sessionStorage: the build a reload was tried for (update-rules.js)
let updateNewer = null, updateWaitT = 0;
function reloadWhenQuiet() {
  clearTimeout(updateWaitT);
  if (!updateNewer || document.hidden) return;
  if (!quietMoment(G.state, document)) { updateWaitT = setTimeout(reloadWhenQuiet, 2000); return; } // a song or a sheet: ask again later
  try { sessionStorage.setItem(UPDATE_TRIED, updateNewer); } catch { /* private mode: at worst one more check */ }
  location.reload();
}
async function checkUpdate() {
  if (document.hidden || updateNewer) return reloadWhenQuiet();
  try {
    const r = await fetch('/version.json', { cache: 'no-store' });
    if (!r.ok) return; // dev server and tests: no file, nothing to compare
    const { build } = await r.json();
    let tried = null; try { tried = sessionStorage.getItem(UPDATE_TRIED); } catch { /* private mode */ }
    if (shouldReload(build, APP_BUILD, tried)) { updateNewer = build; reloadWhenQuiet(); }
  } catch { /* offline: try on the next wake */ }
}
document.addEventListener('visibilitychange', checkUpdate);
addEventListener('pageshow', e => { if (e?.persisted) checkUpdate(); }); // back from the bfcache
