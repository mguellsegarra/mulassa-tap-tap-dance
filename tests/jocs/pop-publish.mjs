// A Mulassa Pop run goes to the board from ranking-ui.js (the page's real module through Vite, its ranking service replaced
// by one the test controls; the kept-run storage is ranking.js's own):
// - the run is kept BEFORE the request, so a tab closed mid-request does not lose it;
// - an answer (success, or a refusal that can never change, `implausible` among them) forgets only the run just sent: another
//   kept run, a better one from another seed, stays for its own turn.
import assert from 'node:assert/strict';
import { viteLoad } from './pop-ssr.mjs';

process.env.VITE_SUPABASE_URL = 'https://test.invalid'; // the real service is chosen, ranking.js, which the stub below wraps
const mem = new Map();
const els = {};
const fakeEl = () => ({ hidden: false, textContent: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, animate() {}, addEventListener() {}, focus() {}, replaceChildren() {}, append() {}, closest: () => fakeEl(), querySelector: () => null });
Object.assign(globalThis, {
  localStorage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
  document: { getElementById: id => (els[id] ??= fakeEl()), activeElement: null, body: {}, addEventListener() {} },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
});
// the service: ranking.js's keep, pending and forget as they are, publish as the test says
const stub = `export { keep, pending, forget } from '/src/jocs/games/pop/ranking.js';
export const publish = body => globalThis.__publish(body);
export const me = async () => ({}); export const board = async () => [];`;
const { load, close } = await viteLoad({ './ranking.js': stub });
const { setupRankingUI } = await load('ranking-ui.js');
const { RUN_VERSION } = await load('run.js');
const { pending, keep, forget } = await import('../../src/jocs/games/pop/ranking.js'); // the same storage the stub's re-export uses
const ui = setupRankingUI({ t: k => k, focusBack() {} });

const run = (seed, points) => ({ seed, level: 0, ticks: 100, log: [], game: { cols: 4, rows: 6, points, hits: points } });
const sent = (seed, points) => ({ v: RUN_VERSION, seed, level: 0, cols: 4, rows: 6, ticks: 100, taps: [], points, hits: points });
const refused = code => Object.assign(new Error(code), { code });
const answer = { score: 40, best: 90, improved: false, position: 3 };

{ // a success forgets the run it sent...
  forget();
  let during;
  globalThis.__publish = async () => { during = pending(); return answer; };
  await ui.publish(run(2, 40));
  assert.deepEqual(during, sent(2, 40), 'the run is already kept while the request is out');
  assert.equal(pending(), null, 'answered: nothing left to send');
}
{ // ...but not a better one waiting from another seed
  forget();
  keep(sent(1, 90));
  globalThis.__publish = async () => answer;
  await ui.publish(run(2, 40));
  assert.deepEqual(pending(), sent(1, 90), "the better run kept before stays: this answer was for another");
}
{ // a failure that may pass later keeps the run
  forget();
  globalThis.__publish = async () => { throw refused('unavailable'); };
  await ui.publish(run(5, 30));
  assert.deepEqual(pending(), sent(5, 30), 'offline: kept for the next visit');
  globalThis.__publish = async () => { throw refused('noname'); };
  await ui.publish(run(5, 30));
  assert.deepEqual(pending(), sent(5, 30), 'no name yet: kept until there is one');
}
for (const code of ['implausible', 'mismatch', 'version', 'pop_seed_used']) { // a no that can never change
  forget();
  globalThis.__publish = async () => { throw refused(code); };
  await ui.publish(run(6, 50));
  assert.equal(pending(), null, `${code}: the run is forgotten, sent again it would only be refused again`);
  keep(sent(1, 90));
  await ui.publish(run(6, 50));
  assert.deepEqual(pending(), sent(1, 90), `${code}: and only that run, not the better one waiting`);
}
{ // the home's own retry (sync): same rule
  forget();
  keep(sent(7, 60));
  globalThis.__publish = async b => { keep(sent(8, 100)); return answer; }; // a better run is kept while this one is out
  await ui.sync();
  assert.deepEqual(pending(), sent(8, 100), 'sync forgets the run it sent, not the one kept meanwhile');
}
await close();
console.log('pop-publish: ok');
