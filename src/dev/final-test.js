// ?final — a dev-only shortcut to the END of the game (results → publish → «Ets el número N» → Comparteix), for testing it
// on real devices over the LAN without playing the song and without touching the real leaderboard. Only on dev hosts
// (flags.js DEV_HOST: localhost, LAN IPs, *.local/.test): on mulassa.cat or pages.dev `finalMode()` is null and nothing
// here runs. `?final=<pct>-<level>-<outcome>` (default 95-0-record; outcome record | clear | collapse), `&taken` makes the
// first nickname tried «ja és d’algú». The run is made up but consistent: judgments walked over the real chart with the
// game's scoring. The run follows the ànim rules. Sharing stays real (it is all on the device).
//
// The leaderboard is an in-memory mock behind the real service (src/dev/mock-leaderboard.js, seeded data in demo-data.js):
// same validation and messages, no network, no Turnstile, nothing kept after a reload. Its demo URL parameters (read by
// `demoOptions`, so `?mock` alone takes them too; every one is dev-hosts-only because the mock is):
//   &account=new|reserved|guest|verified-unnamed|verified  who is signed in: nobody | a guest with no result | a guest «Prova123#4821»
//       with results | a confirmed address that still has its tag (asks «Tria el teu nom») | a confirmed profile with a clean name
//   &seasons=launch|later   launch (default): «Estrena 2026» (history) + «Tardor 2026» open, Mulassa 45 players, Drac 12.
//       later: Tardor closed (two Mulassa boards: «ball anterior» + the new dance, Drac) and «Hivern 2027» open: the end-of-season sheet
//       with a podium (the Drac's 3r); many: the eleven quarters before today closed (Mulassa only, one with both dances), the
//       end-of-season sheet without a podium
//   &board=empty            the open season has no result (Mulassa and Drac); &drac=empty only the Drac's
//   &board=me               a 119-player ladder with the signed-in profile (ProvaRetall) at #48, for responsive scroll checks
//   &board=fail             every board read fails (offline): the Classificació's error state
//   &card=<Name>[#tag]      (UI) open that player's public card; names in the data: Timbaler, Estrella#0007, PortadoraDeValls (16 letters)
//   &taken, &fail           the first nickname tried is taken / the first publication gets no answer (offline)
// `&review=<state>` (src/dev/account-review.js, REVIEWS below): the profile, e-mail and ranking flows over the same mock, each state
// reached by pressing the real sheets' buttons; `&review` alone lists them. The mock's account follows the state (`&account=`
// overrides it). The e-mail flow takes any address and the code 123456; ocupat@exemple.cat already confirmed another profile
// (switching to it); no mail is sent.
import { DEV_HOST } from '../core/flags.js';
import { quality } from '../game/progress.js';
import { drain, ENERGY } from '../game/energy.js';
import { ACCOUNTS } from './mock-leaderboard.js';
export { mockLeaderboard, ACCOUNTS, OTHER_MAIL, MOCK_CODE } from './mock-leaderboard.js';
import { buildWorld } from './demo-data.js';
export { DEMO_SELF } from './demo-data.js';
// every Mulassa row of the demo boards, for the ceilings test (tests/score-ceiling.mjs): none above what a perfect run scores
export const mockRows = () => buildWorld().boards.filter(b => b.figure === 'mulassa-valls').flatMap(b => b.rows);

// Preview the existing mock board without fabricating a completed run. Never active on public hosts. ?demo (the selector's
// made-up facts) brings the board with it, so the rank tile and the sheet's own row agree.
export const leaderboardPreviewMode = ({ hostname = '', search = '', configured = true } = {}) =>
  DEV_HOST.test(hostname) && (!configured || ['mock', 'demo'].some(k => new URLSearchParams(search).has(k)));

const OUTCOMES = ['record', 'clear', 'collapse'];
// the review states: the mock account / world each starts from (and a taken first nickname)
export const REVIEWS = Object.freeze({
  'share-drac': { account: 'verified' },
  publish: { account: 'new' }, published: { account: 'new' }, share: { account: 'new' }, email: { account: 'new' }, code: { account: 'new' },
  verified: { account: 'new' }, 'choose-name': { account: 'new' }, switch: { account: 'guest' },
  'profile-new': { account: 'new' }, 'profile-reserved': { account: 'reserved' }, 'profile-guest': { account: 'guest' },
  'profile-verified-unnamed': { account: 'verified-unnamed' }, 'profile-verified': { account: 'verified' },
  board: { account: 'verified' }, 'board-tip': { account: 'verified' }, 'board-guest': { account: 'guest' }, 'board-empty': { account: 'guest', board: 'empty' },
  'board-drac': { account: 'verified' }, 'board-drac-empty': { account: 'verified', drac: 'empty' },
  seasons: { account: 'guest' }, 'seasons-later': { account: 'guest', seasons: 'later' }, 'season-end': { account: 'guest', seasons: 'later' },
  'seasons-many': { account: 'guest', seasons: 'many' }, 'season-end-plain': { account: 'guest', seasons: 'many' }, 'seasons-drac': { account: 'guest' },
  card: { account: 'guest' }, 'card-guest': { account: 'new' }, 'card-long': { account: 'new' }, 'card-empty': { account: 'new' },
  taken: { account: 'new', taken: true }, recover: { account: 'new', taken: true }, retry: { account: 'new', fail: true },
});
// The mock's options from a query string; no host check, the caller already knows it is on the mock (finalMode, leaderboardPreviewMode).
export function demoOptions(search = '') {
  const q = new URLSearchParams(search), pick = (k, list) => (list.includes(q.get(k)) ? q.get(k) : undefined);
  return Object.fromEntries(Object.entries({ account: pick('account', ACCOUNTS), board: pick('board', ['me', 'empty', 'fail']), seasons: pick('seasons', ['launch', 'later', 'many']),
    drac: pick('drac', ['empty']), ...(q.has('card') && { card: q.get('card').slice(0, 40) }) }).filter(([, v]) => v !== undefined));
}
export function finalMode({ hostname = '', search = '' } = {}) {
  const q = new URLSearchParams(search);
  if (!q.has('final') || !DEV_HOST.test(hostname)) return null;
  const [p, d, o] = (q.get('final') || '').split('-');
  const pct = /^\d{1,3}$/.test(p ?? '') ? Math.min(100, +p) : 95;
  const diff = /^[0-2]$/.test(d ?? '') ? +d : 0;
  const review = q.has('review') ? (Object.hasOwn(REVIEWS, q.get('review')) ? q.get('review') : '') : null, preset = review ? REVIEWS[review] : {};
  const { taken: _t, fail: _f, ...presetOptions } = preset;
  return { pct, diff, outcome: OUTCOMES.includes(o) ? o : 'record', taken: q.has('taken') || Boolean(preset.taken), ...(preset.fail && { fail: true }),
    ...presetOptions, ...demoOptions(search), ...(review != null && { review }) };
}

// Every judgment of a chart in song order: notes, hold tails (at their end), balloons (judged at their end).
export function judgments(chart) {
  const out = [];
  for (const n of chart) {
    if (n.balloon) { out.push({ t: n.end, balloon: true, need: n.need }); continue; }
    const head = { t: n.t, big: n.big, head: Boolean(n.end) };
    out.push(head);
    if (n.end) out.push({ t: n.end, tail: true });
  }
  return out.sort((a, b) => a.t - b.t);
}

// The game's rules (main.js judge/guapaHit/settleHold/pump/cheer) over a list of kinds; stops where the ànim runs out.
// Held tails score what was held (perfect ≈ all of it, good ≈ 70%, a let-go ≈ 25%); a balloon pops once when perfect.
export function walk(events, kinds, diff, finaleT) {
  const counts = { perfect: 0, good: 0, miss: 0 }, errors = { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 };
  let score = 0, combo = 0, maxCombo = 0, energy = 1, collapsed = false, early = false, headMissed = false;
  for (let i = 0; i < kinds.length; i++) {
    const e = events[i], kind = kinds[i], f = e.t >= finaleT && quality(counts) >= 70 ? 2 : 1;
    if (e.tail) score += kind === 'miss' && headMissed ? 0 : Math.floor(400 * f * { perfect: 1, good: 0.7, miss: 0.25 }[kind]);
    if (e.balloon) { const taps = { perfect: e.need, good: Math.ceil(e.need / 2), miss: 0 }[kind]; score += 50 * f * taps + (kind === 'perfect' ? 300 * e.need * f : 0); }
    if (e.head) headMissed = kind === 'miss';
    counts[kind]++;
    if (kind !== 'perfect' && !e.balloon) errors[kind === 'miss' ? (e.tail ? 'hold' : 'silent') : e.tail ? 'late' : (early = !early) ? 'early' : 'late']++;
    if (kind === 'miss') combo = 0;
    else {
      combo++; maxCombo = Math.max(maxCombo, combo);
      const pts = ((kind === 'perfect' ? 300 : 100) + Math.min(combo, 100) * 2) * f;
      score += e.big ? 2 * pts : pts; // GUAPA: the pair doubles it
    }
    energy = drain(energy, diff, kind, kind !== 'miss' && (e.big || (kind === 'perfect' && (e.balloon || e.tail))));
    if (energy <= 0) { collapsed = true; break; }
  }
  return { counts, errors, score, combo, maxCombo, energy, collapsed };
}

const spread = (slots, k) => new Set(Array.from({ length: k }, (_, j) => slots[Math.floor((j + 0.5) * slots.length / k)]));
// A finished run at `pct`: misses and goods spread evenly (never a missed hold head, so every tail stands on its own);
// if the ànim can't survive that, the next % up that it survives (a collapse is asked for with outcome 'collapse').
function finished(events, pct, diff, finaleT) {
  const n = events.length, heads = events.filter(e => e.head).length;
  const idx = events.map((_, i) => i), missable = idx.filter(i => !events[i].head);
  for (let want = pct; want <= 100; want++) {
    const def = n * (1 - want / 100), splits = [];
    for (let m = 0; m <= missable.length; m++) for (const g of new Set([Math.floor(5 * (def - m)), Math.ceil(5 * (def - m))])) {
      if (g >= 0 && m + g <= n && Math.round(quality({ perfect: n - m - g, good: g, miss: m })) === want) splits.push({ m, g });
    }
    // most of the lost points from misses (a player's usual mix), the closest the ànim survives
    for (const { m, g } of splits.sort((a, b) => Math.abs(a.m - 0.75 * def) - Math.abs(b.m - 0.75 * def))) {
      const missAt = spread(missable, m), goodAt = spread(idx.filter(i => !missAt.has(i)), g);
      const run = walk(events, idx.map(i => (missAt.has(i) ? 'miss' : goodAt.has(i) ? 'good' : 'perfect')), diff, finaleT);
      if (!run.collapsed) return run;
    }
  }
  return walk(events, events.map(() => 'perfect'), diff, finaleT);
}
// A collapse near `pct`: a clean stretch, then the misses in a row that empty the ànim from full.
function fallen(events, pct, diff, finaleT) {
  const n = events.length, need = Math.round(1 / ENERGY[diff].miss);
  let best = { k: 0, g: 0, cost: Infinity };
  for (let k = 0; k + need <= n; k++) for (let g = 0; g <= k; g++) {
    const cost = Math.abs(quality({ perfect: k - g, good: g, miss: need }) - pct) + Math.abs(g - 0.1 * k) * 0.3; // mostly perfects, like a real clean stretch
    if (cost < best.cost) best = { k, g, cost };
  }
  const goodAt = spread([...Array(best.k).keys()], best.g);
  return walk(events, events.map((_, i) => (i >= best.k ? 'miss' : goodAt.has(i) ? 'good' : 'perfect')), diff, finaleT);
}
export function fabricateRun(chart, { pct = 95, diff = 0, outcome = 'record' } = {}, finaleT = Infinity) {
  const events = judgments(chart);
  return outcome === 'collapse' ? fallen(events, pct, diff, finaleT) : finished(events, pct, diff, finaleT);
}

// the nickname and the «Ara no» count live in memory here: every load is a first-time player, and a few «Ara no» while
// testing never stop the prompt on this device
export const memoryKeys = (base, keys) => {
  const mem = new Map();
  return { get: k => (keys.includes(k) ? mem.get(k) ?? null : base.get(k)), set: (k, v) => (keys.includes(k) ? mem.set(k, String(v)) : base.set(k, v)),
    remove: k => (keys.includes(k) ? mem.delete(k) : base.remove?.(k)) };
};

// «MODE PROVA» stays inside settings and the mock leaderboard sheets, clear of the game controls.
export function markTestMode(doc = document) {
  const badge = where => {
    const b = doc.createElement('div');
    b.className = 'test-mode';
    b.textContent = 'MODE PROVA';
    b.setAttribute('aria-hidden', 'true');
    b.style.cssText = (where === 'inline' ? ''
      : 'position:absolute;top:-9px;right:64px;') + 'z-index:99;pointer-events:none;' // on a sheet: astride its top edge, over no text or button (left of the close button, clear of the review row)
      + 'padding:2px 7px;border-radius:6px;background:#c62828;color:#fff;font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.06em;opacity:.92';
    return b;
  };
  const version = doc.getElementById('settings-version'); // on the build's line: a row of its own scrolled Configuració at 320×568
  if (version) { const row = doc.createElement('div'); row.className = 'about-version'; row.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px'; version.replaceWith(row); version.style.margin = '0'; row.append(version, badge('inline')); }
  for (const id of ['publish-menu', 'board-menu', 'profile-menu']) doc.getElementById(id)?.appendChild(badge('absolute'));
  doc.title = `[PROVA] ${doc.title}`;
}
