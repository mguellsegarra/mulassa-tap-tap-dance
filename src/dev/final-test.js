// ?final — a dev-only shortcut to the END of the game (results → publish → «Ets el número N» → Comparteix), for testing it
// on real devices over the LAN without playing the song and without touching the real leaderboard. Only on dev hosts
// (errors.js DEV_HOST: localhost, LAN IPs, *.local/.test): on mulassa.cat or pages.dev `finalMode()` is null and nothing
// here runs. `?final=<pct>-<level>-<outcome>` (default 95-0-record; outcome record | clear | collapse), `&taken` makes the
// first nickname tried «ja és d’algú». The run is made up but consistent: judgments walked over the real chart with the
// game's scoring and ànim rules. The leaderboard is an in-memory mock behind the real service (same validation and
// messages): no network, no Turnstile, nothing kept after a reload. Sharing stays real (it is all on the device).
import { DEV_HOST } from '../services/errors.js';
import { quality } from '../game/progress.js';
import { drain, ENERGY } from '../game/energy.js';
import { createLeaderboardService } from '../services/leaderboard.js';
import { comparableScore } from '../game/score-scale.js';
import { VERSION_RULES } from '../services/leaderboard-rules.js';

const OUTCOMES = ['record', 'clear', 'collapse'];
export function finalMode({ hostname = '', search = '' } = {}) {
  const q = new URLSearchParams(search);
  if (!q.has('final') || !DEV_HOST.test(hostname)) return null;
  const [p, d, o] = (q.get('final') || '').split('-');
  const pct = /^\d{1,3}$/.test(p ?? '') ? Math.min(100, +p) : 95;
  const diff = /^[0-2]$/.test(d ?? '') ? +d : 0;
  return { pct, diff, outcome: OUTCOMES.includes(o) ? o : 'record', taken: q.has('taken') };
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

// --- the mock leaderboard: the real service (leaderboard.js) over a fake Supabase client kept in memory
const NAMES = ['Timbaler', 'Portadora', 'Capgròs', 'Drac', 'Castellera', 'Balladora', 'Mulasser', 'Gegantó', 'Calçot', 'Anxaneta', 'Grallera', 'Trabucaire'];
// ~60 made-up players (consistent runs of every level), so the list pages and «On sóc» have neighbours
export function mockRows(charts, finaleT) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 62 }, (_, i) => {
    const diff = i % 3, pct = 55 + Math.floor(rand() * 46), run = fabricateRun(charts[diff], { pct, diff, outcome: 'clear' }, finaleT);
    return { alias: `${NAMES[Math.floor(rand() * NAMES.length)]}${100 + Math.floor(rand() * 900)}`, difficulty: diff, quality: quality(run.counts), score: comparableScore(run.score, diff) };
  });
}
function mockClient({ rows, taken = false, delay = 500 }) {
  let session = null, self = null;
  const entries = new Map();
  const refused = new Set(); // with ?taken: the first nickname tried, and it stays taken
  const wait = () => new Promise(r => setTimeout(r, delay * (0.6 + 0.8 * Math.random())));
  const board = () => {
    const tie = r => r.quality * VERSION_RULES['mulassa-v1'].judgments[r.difficulty];
    const order = (a, b) => b.score - a.score || tie(b) - tie(a);
    const best = [...entries.values()].sort(order)[0];
    const mine = best && self ? { ...best, alias: self.alias } : null;
    const all = [...rows, ...(mine ? [mine] : [])].sort(order);
    return all.map((r, i) => ({ ...r, position: i + 1, total: all.length, is_self: r === mine }));
  };
  const isTaken = alias => {
    const k = alias.toLowerCase();
    if (taken && !refused.size) refused.add(k);
    return refused.has(k) || rows.some(r => r.alias.toLowerCase() === k);
  };
  const ok = data => ({ data, error: null, status: 200 });
  const no = (message, status = 400) => ({ data: null, error: { message, code: 'P0001' }, status });
  return {
    mulassaPersistentStorage: true,
    auth: {
      async getSession() { await wait(); return { data: { session }, error: null }; },
      async signInAnonymously() { await wait(); session = { user: { id: 'prova' } }; return { data: { session }, error: null }; },
      async signOut() { session = null; return { error: null }; },
    },
    functions: { async invoke() { await wait(); self = null; entries.clear(); return { data: { deleted: true }, error: null }; } },
    async rpc(name, a) {
      await wait();
      if (name === 'get_leaderboard_all') {
        const b = board(), me = b.find(r => r.is_self);
        return ok(b.filter(r => (r.position > a.p_offset && r.position <= a.p_offset + a.p_limit)
          || (a.p_offset === 0 && me && Math.abs(r.position - me.position) <= 5)));
      }
      if (!session) return no('leaderboard_auth', 401);
      if (name === 'submit_result') {
        if (self?.alias !== a.p_alias && isTaken(a.p_alias)) return no('leaderboard_alias_taken', 409);
        const q = quality({ perfect: a.p_perfect, good: a.p_good, miss: a.p_miss });
        const points = comparableScore(a.p_score, a.p_difficulty, a.p_version), key = `${a.p_version}:${a.p_difficulty}`;
        const previous = entries.get(key), improved = !previous || q > previous.quality || (q === previous.quality && a.p_score > previous.rawScore);
        self = { alias: a.p_alias };
        if (improved) entries.set(key, { difficulty: a.p_difficulty, quality: q, score: points, rawScore: a.p_score, max_combo: a.p_max_combo });
        const saved = entries.get(key);
        return ok([{ improved, quality: saved.quality, score: saved.score }]);
      }
      if (name === 'update_alias') {
        if (!self) return no('leaderboard_auth', 401);
        if (self.alias !== a.p_alias && isTaken(a.p_alias)) return no('leaderboard_alias_taken', 409);
        self.alias = a.p_alias;
        return ok(a.p_alias);
      }
      return no('unknown', 404);
    },
  };
}
export function mockLeaderboard({ charts, finaleT, taken = false, delay = 500 }) {
  const c = mockClient({ rows: mockRows(charts, finaleT), taken, delay });
  return createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c });
}
// the nickname and the «Ara no» count live in memory here: every load is a first-time player, and a few «Ara no» while
// testing never stop the prompt on this device
export const memoryKeys = (base, keys) => {
  const mem = new Map();
  return { get: k => (keys.includes(k) ? mem.get(k) ?? null : base.get(k)), set: (k, v) => (keys.includes(k) ? mem.set(k, String(v)) : base.set(k, v)),
    remove: k => (keys.includes(k) ? mem.delete(k) : base.remove?.(k)) };
};

// «MODE PROVA» in a corner, and on the leaderboard sheets (they sit in the top layer, over the page's corner)
export function markTestMode(doc = document) {
  const badge = where => {
    const b = doc.createElement('div');
    b.className = 'test-mode';
    b.textContent = 'MODE PROVA';
    b.setAttribute('aria-hidden', 'true');
    b.style.cssText = (where === 'fixed' ? 'position:fixed;top:max(4px,env(safe-area-inset-top));right:max(4px,env(safe-area-inset-right));'
      : 'position:absolute;bottom:8px;left:10px;') + 'z-index:99;pointer-events:none;' // on a sheet: its bottom corner, clear of the title
      + 'padding:2px 7px;border-radius:6px;background:#c62828;color:#fff;font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.06em;opacity:.92';
    return b;
  };
  doc.body.appendChild(badge('fixed'));
  for (const id of ['publish-menu', 'board-menu']) doc.getElementById(id)?.appendChild(badge('absolute'));
  doc.title = `[PROVA] ${doc.title}`;
}
