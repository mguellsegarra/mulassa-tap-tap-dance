// A run reaching the board: the bookkeeping after any publication (the sheet's, publish-ui.js) and the quiet one for a
// player who already chose a nickname here (board-ui.js calls it instead of the prompt).
import { rememberIdentity, ALIAS_KEY } from '../services/leaderboard-identity.js';
import { boardIssue } from '../services/leaderboard-errors.js';
import { checkAlias } from '../services/alias-rules.js';
import { forgetSeasons } from './seasons-ui.js';

export const PERSIST_KEY = 'storage-persist'; // once, after the first publication: storage.persist() was asked

export function setupLanding({ service, store, runs, canWrite, acceptStats, persist, declinesKey }) {
  // told: the sheet showed the statistics' note (its totals go with the profile); the quiet publication shows nothing, so the notice stays pending
  function landed(run, alias, told = true) {
    store.set(ALIAS_KEY, alias);
    if (told) acceptStats();
    forgetSeasons(service); // the podiums may have moved
    runs.published = run; // the results button goes even if the sheet was closed meanwhile
    store.remove(declinesKey); // they publish: the prompt may open by itself again
    if (!store.get(PERSIST_KEY)) { store.set(PERSIST_KEY, '1'); try { Promise.resolve(persist()).catch(() => {}); } catch { /* no Storage API */ } }
  }
  // a nickname chosen before and its profile still here: the run goes up with nothing on screen (the server keeps the best).
  // false: not possible or it failed (no session, profile gone, network); the caller falls back to the prompt
  async function publishQuietly() {
    const run = runs.snapshot;
    if (!canWrite || !run || runs.published === run || !store.get(ALIAS_KEY)) return false;
    const before = runs.published;
    runs.published = run; // meanwhile no «Publica el resultat»: a tap would send it twice (the server's 10 s limit refuses the second)
    const fail = () => { if (runs.published === run) runs.published = before; return false; };
    try {
      if (!(await service.identity()).hasSession) return fail();
      const prof = service.profile ? await service.profile().catch(() => undefined) : undefined; // undefined: unknown, the name stands
      if (prof === null || prof?.released) return fail(); // its row is gone, or its name taken: the sheet starts a new one (publish-ui.js prepare())
      if (prof) rememberIdentity(store, ALIAS_KEY, prof);
      const alias = store.get(ALIAS_KEY);
      if (!checkAlias(alias).ok) return fail();
      await service.publish(run, alias, {});
      landed(run, alias, false);
      return true;
    } catch (err) { boardIssue('leaderboard-publish-failed', err); return fail(); }
  }
  return { landed, publishQuietly };
}
