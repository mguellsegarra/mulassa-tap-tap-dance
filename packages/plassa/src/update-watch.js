// A home-screen app on iOS (and a tab left open for days) wakes from memory instead of loading the page again, so a
// deploy never reaches it; iOS has even opened an old copy on a cold start. So on waking, compare the deployed build
// (/version.json, vite.config.js) with ours and reload on a newer one, but only when the page says it is quiet(): never
// mid-run, never under a sheet or a typed field. The main game (update.js) and each mini-game say what quiet is for them.
import { APP_BUILD } from '../../../src/core/version.js';
import { shouldReload } from './update-rules.js';

const UPDATE_TRIED = 'reloaded-for'; // sessionStorage: the build a reload was tried for (update-rules.js)

export function watchUpdates(quiet) {
  let newer = null, waitT = 0;
  function reloadWhenQuiet() {
    clearTimeout(waitT);
    if (!newer || document.hidden) return;
    if (!quiet()) { waitT = setTimeout(reloadWhenQuiet, 2000); return; } // busy: ask again later
    try { sessionStorage.setItem(UPDATE_TRIED, newer); } catch { /* private mode: at worst one more check */ }
    location.reload();
  }
  async function check() {
    if (document.hidden || newer) return reloadWhenQuiet();
    try {
      const r = await fetch('/version.json', { cache: 'no-store' });
      if (!r.ok) return; // dev server and tests: no file, nothing to compare
      const { build } = await r.json();
      let tried = null; try { tried = sessionStorage.getItem(UPDATE_TRIED); } catch { /* private mode */ }
      if (shouldReload(build, APP_BUILD, tried)) { newer = build; reloadWhenQuiet(); }
    } catch { /* offline: try on the next wake */ }
  }
  document.addEventListener('visibilitychange', check);
  setInterval(check, 30 * 60 * 1000); // a menu left on screen for hours: one tiny request now and then (hidden: skipped)
  // a tab older than the deploy whose lazy chunk failed to load: check now, so a newer build reloads on the next quiet moment
  // (not preventDefault: Vite would resolve the import with nothing and break its caller)
  addEventListener('vite:preloadError', check);
  addEventListener('pageshow', e => { if (e?.persisted) check(); }); // back from the bfcache
  return check;
}
