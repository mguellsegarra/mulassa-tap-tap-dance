// ?final — a dev-only shortcut to the END of the game (results → publish → «Ets el número N» → Comparteix), for testing it
// on real devices over the LAN without playing the song and without touching the real leaderboard. Only on dev hosts
// (errors.js DEV_HOST: localhost, LAN IPs, *.local/.test): on mulassa.cat or pages.dev `finalMode()` is null and nothing
// here runs. `?final=<pct>-<level>-<outcome>` (default 95-0-record; outcome record | clear | collapse), `&taken` makes the
// first nickname tried «ja és d’algú». The run is made up but consistent: judgments walked over the real chart with the
// game's scoring. `?final&board=me` opens On soc directly with a fictitious #48 of 119, for responsive scroll checks.
// The run follows the ànim rules. The leaderboard is an in-memory mock behind the real service (same validation and
// messages): no network, no Turnstile, nothing kept after a reload. Sharing stays real (it is all on the device).
// `&review=<state>` (src/dev/account-review.js, REVIEWS below): the profile and e-mail flows over the same mock, each state
// reached by pressing the real sheets' buttons; `&review` alone lists them. The mock's account follows the state
// (`&account=` overrides it): new | reserved | pending | legacy | verified | expired. The e-mail flow takes any address and the
// code 123456; ocupat@exemple.cat already confirmed another profile (switching to it); no mail is sent.
import { DEV_HOST } from '../services/errors.js';
import { quality } from '../game/progress.js';
import { drain, ENERGY } from '../game/energy.js';
import { createLeaderboardService } from '../services/leaderboard.js';
import { comparableScore } from '../game/score-scale.js';
import { VERSION_RULES } from '../services/leaderboard-rules.js';

// Preview the existing mock board without fabricating a completed run. Never active on public hosts.
export const leaderboardPreviewMode = ({ hostname = '', search = '', configured = true } = {}) =>
  DEV_HOST.test(hostname) && (!configured || new URLSearchParams(search).has('mock'));

const OUTCOMES = ['record', 'clear', 'collapse'];
// the review states: the mock account each starts from (and a taken first nickname)
export const ACCOUNTS = ['new', 'reserved', 'pending', 'legacy', 'verified', 'expired'];
export const REVIEWS = Object.freeze({
  'share-drac': { account: 'verified' },
  publish: { account: 'new' }, published: { account: 'new' }, share: { account: 'new' }, email: { account: 'new' }, code: { account: 'new' },
  verified: { account: 'new' }, switch: { account: 'pending' }, 'legacy-publish': { account: 'legacy' },
  'profile-new': { account: 'new' }, 'profile-reserved': { account: 'reserved' }, 'profile-pending': { account: 'pending' },
  'profile-legacy': { account: 'legacy' }, 'profile-verified': { account: 'verified' }, 'profile-expired': { account: 'expired' },
  board: { account: 'verified' }, 'board-tip': { account: 'verified' }, taken: { account: 'new', taken: true }, recover: { account: 'new', taken: true },
  retry: { account: 'new', fail: true },
});
export function finalMode({ hostname = '', search = '' } = {}) {
  const q = new URLSearchParams(search);
  if (!q.has('final') || !DEV_HOST.test(hostname)) return null;
  const [p, d, o] = (q.get('final') || '').split('-');
  const pct = /^\d{1,3}$/.test(p ?? '') ? Math.min(100, +p) : 95;
  const diff = /^[0-2]$/.test(d ?? '') ? +d : 0;
  const review = q.has('review') ? (Object.hasOwn(REVIEWS, q.get('review')) ? q.get('review') : '') : null, preset = review ? REVIEWS[review] : {};
  const account = ACCOUNTS.includes(q.get('account')) ? q.get('account') : preset.account;
  return { pct, diff, outcome: OUTCOMES.includes(o) ? o : 'record', taken: q.has('taken') || Boolean(preset.taken), ...(preset.fail && { fail: true }), ...(q.get('board') === 'me' && { board: 'me' }),
    ...(review != null && { review }), ...(account && { account }) };
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
    return { alias: `${NAMES[Math.floor(rand() * NAMES.length)]}${100 + Math.floor(rand() * 900)}`, difficulty: diff, quality: quality(run.counts), score: comparableScore(run.score, diff), verified: i % 4 === 1 };
  });
}
// The mock account (ACCOUNTS): self = { alias, verified, expires (ms | null), notice (an old profile not told yet) }
export const OTHER_MAIL = 'ocupat@exemple.cat', MOCK_CODE = '123456';
const DAY_MS = 864e5;
// fail: the first publication gets no answer (offline), the retry works; every call is logged in `calls` (QA reads it)
function mockClient({ rows, taken = false, delay = 500, initialSelf = null, account = null, now = () => Date.now(), fail = false, calls = [] }) {
  const signedIn = initialSelf || (account && account !== 'new');
  let session = signedIn ? { user: { id: 'prova' } } : null, self = initialSelf, pending = '';
  const entries = new Map();
  if (account && account !== 'new' && !initialSelf) self = { alias: 'Prova123' };
  if (self) Object.assign(self, { verified: account === 'verified', expires: account === 'pending' ? now() + 5 * DAY_MS + 3 * 36e5 : account === 'expired' ? now() - 36e5 : null, notice: account === 'legacy' });
  if (account === 'verified') session.user = { id: 'prova', email: 'prova@exemple.cat', email_confirmed_at: '2026-10-01T10:00:00Z' };
  const seeded = initialSelf || (self && account !== 'reserved' && { difficulty: 1, quality: 91, score: 80000, max_combo: 120 });
  if (seeded) entries.set(`mulassa-v1:${seeded.difficulty}`, { ...seeded, rawScore: seeded.score });
  const refused = new Set(); // with ?taken: the first nickname tried, and it stays taken
  const wait = () => new Promise(r => setTimeout(r, delay * (0.6 + 0.8 * Math.random())));
  const board = () => {
    const tie = r => r.quality * VERSION_RULES['mulassa-v1'].judgments[r.difficulty];
    const order = (a, b) => b.score - a.score || tie(b) - tie(a);
    const best = [...entries.values()].sort(order)[0];
    const gone = self?.expires != null && self.expires <= now() && !self.verified; // hidden from its deadline
    const mine = best && self && !gone ? { ...best, alias: self.alias, verified: Boolean(self.verified) } : null;
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
  const authNo = (code, status) => ({ data: {}, error: Object.assign(new Error(code), { name: 'AuthApiError', code, status }) });
  const iso = ms => (ms == null ? null : new Date(ms).toISOString());
  return {
    mulassaPersistentStorage: true,
    auth: {
      async getSession() { await wait(); return { data: { session }, error: null }; },
      async signInAnonymously() { await wait(); session = { user: { id: 'prova' } }; return { data: { session }, error: null }; },
      async signOut() { session = null; self = null; entries.clear(); return { error: null }; },
      // the e-mail flow (src/services/leaderboard.js sendCode / verifyCode): Supabase Auth's answers, no mail
      async updateUser({ email }) { await wait(); if (email === OTHER_MAIL) return authNo('email_exists', 422); pending = email; return { data: {}, error: null }; },
      async signInWithOtp({ email }) { await wait(); return email === OTHER_MAIL ? { data: {}, error: null } : authNo('otp_disabled', 422); },
      async verifyOtp({ email, token, type }) {
        await wait();
        if (token !== MOCK_CODE) return authNo('otp_expired', 403);
        if (type === 'email_change' && session && email === pending) { // the code confirms the pending address: now it counts
          pending = ''; session = { user: { id: session.user.id, email, email_confirmed_at: new Date(now()).toISOString() } };
          if (self) Object.assign(self, { verified: true, expires: null, notice: false });
          return { data: {}, error: null };
        }
        if (type !== 'email' || email !== OTHER_MAIL) return authNo('otp_expired', 403);
        // another profile: this browser switches to it (nothing of the one before is merged)
        session = { user: { id: 'altre', email, email_confirmed_at: '2026-09-30T09:00:00Z' } };
        self = { alias: 'Castellera777', verified: true, expires: null, notice: false };
        entries.clear(); entries.set('mulassa-v1:2', { difficulty: 2, quality: 94, score: 150000, rawScore: 150000, max_combo: 210 });
        return { data: {}, error: null };
      },
    },
    functions: { async invoke() { await wait(); self = null; entries.clear(); return { data: { deleted: true }, error: null }; } },
    async rpc(name, a) {
      calls.push(name);
      await wait();
      if (name === 'get_leaderboard_all') {
        const b = board(), me = b.find(r => r.is_self);
        return ok(b.filter(r => (r.position > a.p_offset && r.position <= a.p_offset + a.p_limit)
          || (a.p_offset === 0 && me && Math.abs(r.position - me.position) <= 5)));
      }
      if (!session) return no('leaderboard_auth', 401);
      if (name === 'my_profile') {
        if (!self) return ok([]);
        const confirmed = Boolean(self.verified);
        return ok([{ alias: self.alias, verified: confirmed, expires_at: confirmed ? null : iso(self.expires), published: entries.size > 0,
          notice_needed: !confirmed && self.expires == null && entries.size > 0, expired: !confirmed && self.expires != null && self.expires <= now() }]);
      }
      if (name === 'my_alias') return ok(self?.alias ?? null);
      if (name === 'ack_expiry_notice') {
        if (self && !self.verified && self.expires == null && entries.size) Object.assign(self, { expires: now() + 7 * DAY_MS, notice: false });
        return ok(self?.verified ? null : iso(self?.expires));
      }
      if (name === 'submit_result') {
        if (fail) { fail = false; return { data: null, error: Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }), status: 0 }; }
        if (self?.alias !== a.p_alias && isTaken(a.p_alias)) return no('leaderboard_alias_taken', 409);
        if (self && !self.verified && self.expires != null && self.expires <= now()) { self = null; entries.clear(); } // ran out: a new profile
        let started = false;
        if (!self?.verified && self?.expires == null) {
          if (!a.p_notice) return no('leaderboard_notice_required');
          started = true;
        }
        const q = quality({ perfect: a.p_perfect, good: a.p_good, miss: a.p_miss }), units = 5 * a.p_perfect + 4 * a.p_good;
        const points = comparableScore(a.p_score, a.p_difficulty, a.p_version), key = `${a.p_version}:${a.p_difficulty}`;
        const previous = entries.get(key), improved = !previous || points > previous.score || (points === previous.score && units > previous.units); // as submit_result
        self = { verified: false, notice: false, ...self, alias: a.p_alias };
        if (started) self.expires = now() + 7 * DAY_MS;
        if (improved) entries.set(key, { difficulty: a.p_difficulty, quality: q, units, score: points, rawScore: a.p_score, max_combo: a.p_max_combo });
        const saved = entries.get(key);
        return ok([{ improved, quality: saved.quality, score: saved.score, expires_at: self.verified ? null : iso(self.expires), started }]);
      }
      if (name === 'update_alias') {
        if (self?.alias !== a.p_alias && isTaken(a.p_alias)) return no('leaderboard_alias_taken', 409);
        self = { verified: false, expires: null, notice: false, ...self, alias: a.p_alias }; // «Crea»: a profile, no deadline yet
        return ok(a.p_alias);
      }
      return no('unknown', 404);
    },
  };
}
export function mockLeaderboard({ charts, finaleT, taken = false, delay = 500, board = null, account = null, now, fail = false, calls }) {
  const rows = board === 'me' ? Array.from({ length: 119 }, (_, i) => ({
    alias: i === 47 ? 'ProvaRetall' : `Prova${i + 1}`, difficulty: i % 3, quality: 88, score: 69286 + (47 - i) * 600,
  })) : mockRows(charts, finaleT);
  const initialSelf = board === 'me' ? rows.splice(47, 1)[0] : null;
  const c = mockClient({ rows, taken, delay, initialSelf, account, now, fail, calls });
  return createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c });
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
    b.style.cssText = (where === 'inline' ? 'display:table;margin:12px auto 0;'
      : 'position:absolute;top:-9px;right:64px;') + 'z-index:99;pointer-events:none;' // on a sheet: astride its top edge, over no text or button (left of the close button, clear of the review row)
      + 'padding:2px 7px;border-radius:6px;background:#c62828;color:#fff;font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.06em;opacity:.92';
    return b;
  };
  doc.getElementById('settings-about')?.appendChild(badge('inline'));
  for (const id of ['publish-menu', 'board-menu', 'profile-menu']) doc.getElementById(id)?.appendChild(badge('absolute'));
  doc.title = `[PROVA] ${doc.title}`;
}
