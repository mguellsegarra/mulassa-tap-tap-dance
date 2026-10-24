// The in-memory leaderboard behind ?final and ?mock (dev hosts only, gated by src/dev/final-test.js): the real service
// (src/services/leaderboard.js) over a fake Supabase client that answers like supabase/migrations/202610200001..4 do,
// from the seeded world of src/dev/demo-data.js. No network, nothing kept after a reload.
import { createLeaderboardService, displayName } from '../services/leaderboard.js';
import { quality } from '../game/progress.js';
import { comparableScore } from '../game/score-scale.js';
import { VERSION_RULES } from '../services/leaderboard-rules.js';
import { buildWorld, family, figureOf, aliasKey, bucketProblem, sumBuckets, streaks, dayString, selfStats, DEMO_SELF, PREVIOUS_VERSION } from './demo-data.js';

// the demo account: none | guest with no result | guest | confirmed address, still «nom#tag» | confirmed, clean name
export const ACCOUNTS = ['new', 'reserved', 'guest', 'verified-unnamed', 'verified'];
export const OTHER_MAIL = 'ocupat@exemple.cat', MOCK_CODE = '123456';
const MAIL = 'prova@exemple.cat', DAY = 864e5;
const order = (a, b) => b.score - a.score || b.quality - a.quality;
const KNOWN = new Set([...Object.keys(VERSION_RULES), PREVIOUS_VERSION]);

// fail: the first publication gets no answer (offline), the retry works; every call is logged in `calls` (QA reads it)
function mockClient({ world, taken, delay, account, now, fail, calls }) {
  let session = null, self = null, pending = '', lastStats = -Infinity, baseline = { buckets: {}, days: [] };
  const entries = new Map(), devices = new Map(), days = new Set(), refused = new Set(), rnd = world.r;
  const entryOf = (season, version, run) => entries.set(`${season}|${version}|${run.difficulty}`, { ...run, season, version, units: 5 * run.perfect + 4 * run.good });
  const defOf = (season, fam) => world.boards.find(b => b.seasonId === season && family(b.version) === fam);
  const seasonFor = version => world.retired[family(version)] ?? world.open;
  const mineRow = (season, fam) => {
    const e = [...entries.values()].filter(x => self && x.season === season && family(x.version) === fam).sort(order)[0];
    return e && { pid: -2, alias: self.alias, tag: self.tag, verified: self.verified, difficulty: e.difficulty, quality: e.quality, score: e.score, max_combo: e.max_combo };
  };
  // a board as the server ranks it: every player's best, by points, the signed-in one merged in
  function ranked(season, fam) {
    const def = defOf(season, fam), mine = mineRow(season, fam), all = [...(def?.rows ?? []), ...(mine ? [mine] : [])].sort(order);
    return all.map((r, i) => ({ ...r, position: i + 1, total: all.length, is_self: r === mine }));
  }
  const place = (season, version, position) => { // the demo account's result lands exactly at `position` of that board
    const rows = ranked(season, family(version)), at = rows[position - 1] ?? rows.at(-1);
    if (!at) return; // an empty board: the account has nothing there
    entryOf(season, version, { difficulty: at.difficulty, perfect: at.perfect, good: at.good, miss: at.miss, max_combo: at.max_combo, quality: at.quality, score: at.score + 1 });
  };
  function start() {
    const kind = world.me ? 'verified' : account;
    if (!kind || kind === 'new') return;
    const verified = kind.startsWith('verified');
    session = { user: { id: 'prova', ...(verified && { email: MAIL, email_confirmed_at: '2026-10-01T10:00:00Z' }) } };
    if (world.me) {
      self = { alias: 'ProvaRetall', tag: null, verified: true };
      entryOf(world.open, 'mulassa-v3', world.me);
    } else {
      self = { alias: DEMO_SELF.alias, tag: kind === 'verified' ? null : DEMO_SELF.tag, verified };
      if (kind === 'reserved') return;
      // 'many': on a podium twice (3r, 1r), the newest closed season 7th (no podium: the end-of-season thanks), absent from one
      if (world.open === 12) { [[1, 9], [2, 15], [3, 3], [5, 21], [6, 4], [7, 12], [8, 1], [10, 9], [11, 7]].forEach(([id, n]) => place(id, id < 7 ? PREVIOUS_VERSION : 'mulassa-v3', n)); place(12, 'mulassa-v3', 6); }
      else if (world.open === 2) { place(1, PREVIOUS_VERSION, 12); place(1, 'drac-v1', 3); place(2, 'mulassa-v3', 6); place(2, 'bou-v1', 5); } else { place(1, 'mulassa-v3', 18); place(1, 'bou-v1', 4); }
    }
    baseline = selfStats([...entries.values()], now());
  }
  start();

  const wait = () => new Promise(r => setTimeout(r, delay * (0.6 + 0.8 * Math.random())));
  const ok = data => ({ data, error: null, status: 200 });
  const no = (message, status = 400) => ({ data: null, error: { message, code: 'P0001' }, status });
  const authNo = (code, status) => ({ data: {}, error: Object.assign(new Error(code), { name: 'AuthApiError', code, status }) });
  const iso = ms => (ms == null ? null : new Date(ms).toISOString());
  const visible = s => s.startsAt <= now();
  const flagged = name => { const k = aliasKey(name); if (taken && !refused.size) refused.add(k); return refused.has(k); }; // ?taken: the first nickname tried
  const cleanNames = new Set([...world.people.filter(p => p.verified).map(p => aliasKey(p.alias)), 'castellera777']);

  // write_alias: guests get a tag and share names with each other and with verified players; clean names are one per player
  function writeAlias(name, clean) {
    if (clean && !self?.verified) return no('leaderboard_verification_required', 401);
    const k = aliasKey(name);
    if (clean ? flagged(name) || (k !== aliasKey(self.alias) && cleanNames.has(k)) : self?.alias !== name && flagged(name)) return no('leaderboard_alias_taken', 409);
    let tag = self?.tag ?? null;
    if (clean) tag = null;
    else if (!self) { do tag = Math.floor(rnd() * 10000); while (world.people.some(p => aliasKey(p.alias) === k && p.tag === tag)); }
    self = { verified: false, ...self, alias: name, tag };
    return null;
  }
  const row = (r, season) => ({ position: r.position, alias: displayName(r.alias, r.tag), difficulty: r.difficulty, quality: r.quality, score: r.score,
    max_combo: r.max_combo, is_self: r.is_self, total: r.total, verified: r.verified, tag: r.tag, season_id: season });
  const totalsOf = r => (r.pid === -2 ? (({ practice, ...rest }) => rest)(sumBuckets([baseline.buckets, ...devices.values()])) : r.pid >= 0 ? world.stats.get(r.pid) ?? {} : {});

  const reads = {
    get_leaderboard_all(a) {
      if (world.listFail) return { data: null, error: Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }), status: 0 }; // &board=fail: the boards' error state
      if ((a.p_period ?? 'all') !== 'all') return no('leaderboard_invalid_period');
      if (!KNOWN.has(a.p_version)) return no('leaderboard_invalid_version');
      const season = a.p_season ?? seasonFor(a.p_version);
      if (!world.seasons.some(s => s.id === season && visible(s))) return no('leaderboard_invalid_season');
      const all = ranked(season, family(a.p_version)), me = all.find(r => r.is_self);
      return ok(all.filter(r => (r.position > a.p_offset && r.position <= a.p_offset + a.p_limit) || (a.p_offset === 0 && me && Math.abs(r.position - me.position) <= 5)).map(r => row(r, season)));
    },
    // get_level_podium (202610210001): one level's best three on a figure's board, everyone's result on that level
    get_level_podium(a) {
      if (world.listFail) return { data: null, error: Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }), status: 0 };
      if (!KNOWN.has(a.p_version)) return no('leaderboard_invalid_version');
      const season = a.p_season ?? seasonFor(a.p_version), fam = family(a.p_version), d = a.p_difficulty;
      const e = [...entries.values()].filter(x => self && x.season === season && family(x.version) === fam && x.difficulty === d).sort(order)[0];
      const mine = e && { pid: -2, alias: self.alias, tag: self.tag, verified: self.verified, difficulty: d, quality: e.quality, score: e.score };
      const all = [...(defOf(season, fam)?.rows ?? []).filter(r => r.difficulty === d), ...(mine ? [mine] : [])].sort(order);
      return ok(all.slice(0, 3).map((r, i) => ({ position: i + 1, alias: displayName(r.alias, r.tag), score: r.score, quality: r.quality,
        is_self: r === mine, total: all.length, verified: r.verified, tag: r.tag })));
    },
    get_seasons(a) {
      const out = [];
      for (const d of world.boards.filter(b => b.figure === a.p_figure)) {
        const s = world.seasons.find(x => x.id === d.seasonId), rows = ranked(d.seasonId, family(d.version));
        if (!visible(s) || !rows.length) continue;
        const mine = rows.find(r => r.is_self);
        out.push({ season_id: s.id, name: s.name, starts_at: iso(s.startsAt), ends_at: iso(s.endsAt), version: d.version, previous_dance: d.previousDance, players: rows.length,
          podium: rows.slice(0, 3).map(r => ({ position: r.position, alias: r.alias, tag: r.tag, score: r.score, difficulty: r.difficulty, verified: r.verified })),
          my_position: mine?.position ?? null, my_score: mine?.score ?? null, my_difficulty: mine?.difficulty ?? null, _order: d.order });
      }
      return ok(out.sort((x, y) => y.season_id - x.season_id || y._order - x._order).map(({ _order, ...r }) => r));
    },
    get_player_card(a) {
      const hits = [];
      for (const d of world.boards) for (const r of ranked(d.seasonId, family(d.version))) if (aliasKey(r.alias) === aliasKey(a.p_alias) && r.tag === (a.p_tag ?? null)) hits.push({ d, r });
      for (const e of entries.values()) if (self && !hits.length && aliasKey(self.alias) === aliasKey(a.p_alias) && self.tag === (a.p_tag ?? null)) hits.push({ d: { seasonId: e.season, version: e.version }, r: mineRow(e.season, family(e.version)) });
      if (!hits.length) return ok([]);
      const who = hits[0].r, podiums = hits.filter(h => h.r.position <= 3).sort((x, y) => y.d.seasonId - x.d.seasonId)
        .map(h => ({ season_id: h.d.seasonId, version: h.d.version, position: h.r.position }));
      return ok([{ alias: who.alias, tag: who.tag, verified: who.verified, totals: totalsOf(who), podiums }]);
    },
  };

  const writes = {
    my_profile: () => ok(self ? [{ alias: self.alias, tag: self.tag, verified: self.verified, published: entries.size > 0 }] : []),
    my_alias: () => ok(self?.alias ?? null),
    update_alias: a => writeAlias(a.p_alias, false) ?? ok(a.p_alias),
    choose_verified_alias: a => writeAlias(a.p_alias, true) ?? ok(a.p_alias),
    submit_result(a) {
      if (fail) { fail = false; return { data: null, error: Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }), status: 0 }; }
      const refusal = writeAlias(a.p_alias, false);
      if (refusal) return refusal;
      const season = seasonFor(a.p_version), q = quality({ perfect: a.p_perfect, good: a.p_good, miss: a.p_miss }), units = 5 * a.p_perfect + 4 * a.p_good;
      const points = comparableScore(a.p_score, a.p_difficulty, a.p_version), key = `${season}|${a.p_version}|${a.p_difficulty}`, previous = entries.get(key);
      const improved = !previous || points > previous.score || (points === previous.score && units > previous.units); // as submit_result
      if (improved) entryOf(season, a.p_version, { difficulty: a.p_difficulty, perfect: a.p_perfect, good: a.p_good, miss: a.p_miss, max_combo: a.p_max_combo, quality: q, score: points });
      const saved = entries.get(key);
      return ok([{ improved, quality: saved.quality, score: saved.score }]);
    },
    // merge_stats (202610200003): once a minute, 8 devices, known buckets only, numbers never go down, plausible days
    merge_stats(a) {
      if (!self) return no('leaderboard_auth_profile_missing', 401);
      if (a.p_owner !== session?.user?.id) return no('leaderboard_owner_mismatch', 401);
      if (now() - lastStats < 60e3) return no('leaderboard_rate_limit');
      const mine = devices.get(a.p_device) ?? {};
      if (!devices.has(a.p_device) && devices.size >= 8) return no('leaderboard_device_limit');
      for (const [k, c] of Object.entries(a.p_buckets ?? {})) {
        const problem = bucketProblem(k, c);
        if (problem) return no(`leaderboard_${problem}`);
        const flat = o => Object.entries(o ?? {}).flatMap(([n, v]) => (typeof v === 'number' ? [[n, v]] : n === 'errors' ? Object.entries(v).map(([e, x]) => [`e.${e}`, x]) : []));
        const before = new Map(flat(mine[k]));
        if (flat(c).some(([n, v]) => v < (before.get(n) ?? 0))) return no('leaderboard_stats_decreased');
      }
      const first = world.seasons[1].startsAt - DAY;
      for (const d of a.p_days ?? []) if (!/^\d{4}-\d\d-\d\d$/.test(d) || Date.parse(d) > now() + DAY * 1.5 || Date.parse(d) < first) return no('leaderboard_invalid_day');
      devices.set(a.p_device, { ...mine, ...a.p_buckets });
      (a.p_days ?? []).forEach(d => days.add(d));
      lastStats = now();
      return ok(null);
    },
    my_stats() {
      if (!self) return no('leaderboard_auth_profile_missing', 401);
      const all = [...new Set([...baseline.days, ...days])].sort(), run = streaks(all, dayString(now()));
      return ok([{ buckets: sumBuckets([baseline.buckets, ...devices.values()]), days: all, days_played: all.length, current_streak: run.current, longest_streak: run.longest }]);
    },
  };

  // shortcut: leaving the demo profile (sign-out, switch) drops its rows; the real server keeps them, so counts dip by one in the demo
  const forget = () => { self = null; entries.clear(); devices.clear(); days.clear(); baseline = { buckets: {}, days: [] }; };
  return {
    mulassaPersistentStorage: true,
    auth: {
      async getSession() { await wait(); return { data: { session }, error: null }; },
      async signInAnonymously() { await wait(); session = { user: { id: 'prova' } }; return { data: { session }, error: null }; },
      async signOut() { session = null; forget(); return { error: null }; },
      // the e-mail flow (src/services/leaderboard.js sendCode / verifyCode): Supabase Auth's answers, no mail
      async updateUser({ email }) { await wait(); if (email === OTHER_MAIL) return authNo('email_exists', 422); pending = email; return { data: {}, error: null }; },
      async signInWithOtp({ email }) { await wait(); return email === OTHER_MAIL ? { data: {}, error: null } : authNo('otp_disabled', 422); },
      async verifyOtp({ email, token, type }) {
        await wait();
        if (token !== MOCK_CODE) return authNo('otp_expired', 403);
        if (type === 'email_change' && session && email === pending) { // the code confirms the pending address: now it counts (the tag stays until a clean name is chosen)
          pending = ''; session = { user: { id: session.user.id, email, email_confirmed_at: new Date(now()).toISOString() } };
          if (self) self.verified = true;
          return { data: {}, error: null };
        }
        if (type !== 'email' || email !== OTHER_MAIL) return authNo('otp_expired', 403);
        // another profile: this browser switches to it (nothing of the one before is merged)
        session = { user: { id: 'altre', email, email_confirmed_at: '2026-09-30T09:00:00Z' } };
        forget(); self = { alias: 'Castellera777', tag: null, verified: true };
        entryOf(world.open, 'mulassa-v3', { difficulty: 2, quality: 94, score: 150000, max_combo: 210, perfect: 0, good: 0, miss: 0 });
        return { data: {}, error: null };
      },
    },
    functions: { async invoke() { await wait(); forget(); return { data: { deleted: true }, error: null }; } },
    async rpc(name, a) {
      calls.push(name);
      await wait();
      if (reads[name]) return reads[name](a);
      if (!session) return no('leaderboard_auth_required', 401);
      return writes[name]?.(a) ?? no('unknown', 404);
    },
  };
}

// Options (all optional, all demo-only): taken (the first nickname tried is somebody's), delay (ms of fake latency),
// board: 'me' | 'empty' | 'fail' (every board read fails), seasons: 'launch' | 'later' | 'many', drac: 'empty', account (ACCOUNTS), fail (first publication offline),
// now (a clock), calls (an array that collects the RPC names). `charts` and `finaleT` are accepted and unused.
export function mockLeaderboardClient({ taken = false, delay = 500, board = null, seasons = 'launch', drac = null, account = null, now = () => Date.now(), fail = false, calls = [] } = {}) {
  const world = buildWorld({ world: ['later', 'many'].includes(seasons) ? seasons : 'launch', board, drac, now: now() });
  if (board === 'fail') world.listFail = true;
  return mockClient({ world, taken, delay, account, now, fail, calls });
}
export function mockLeaderboard(options = {}) {
  const c = mockLeaderboardClient(options);
  return createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c });
}
