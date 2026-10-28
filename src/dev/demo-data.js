// Made-up leaderboard data for the mock (src/dev/mock-leaderboard.js): seasons, boards, players, their statistics and cards.
// Seeded and offline; shaped like the server's answers (supabase/migrations/202610200001..4). Dev hosts only, via the mock.
//   world 'launch' (default): season 0 «Estrena 2026» (history, mulassa-v2-short), season 1 «Tardor 2026» open (Mulassa + Drac).
//   world 'later': the same history, Tardor 2026 closed with a new Mulassa dance mid-season (so two Mulassa boards: «ball
//   anterior», the made-up PREVIOUS_VERSION only the mock knows, and the client's mulassa-v3), and «Hivern 2027» open.
//   world 'many': the eleven calendar quarters before today closed (the Saló de la fama's «Tria temporada» by year; one with
//   two Mulassa dances), today's quarter open; the Drac has no closed season. No «Estrena 2026» in it.
import { VERSION_RULES } from '../services/leaderboard-rules.js';
import { DRAC_SCORE_VERSION, SHORT_SCORE_VERSION, BOU_SCORE_VERSION } from '../game/score-scale.js';
import { fold } from '../services/alias-rules.js';

export { DEMO_SELF } from './mock-leaderboard.js'; // the signed-in demo account, defined with the mock's other constants
export const PREVIOUS_VERSION = 'mulassa-v2b'; // the dance mulassa-v3 replaced mid-Tardor, world 'later' only
const DAY = 864e5;
// song length and GUAPA count per version (202610200003_player_stats.sql); the statistics checks need them
export const STAT_RULES = Object.freeze({ 'mulassa-v3': { seconds: 90.1, guapa: [11, 11, 11] }, [DRAC_SCORE_VERSION]: { seconds: 109.889, guapa: [12, 12, 16] },
  [BOU_SCORE_VERSION]: { seconds: 149.9347, guapa: [9, 9, 9] } }); // the Bou: no server version yet, song-bou.json's end and its charts' GUAPAs
export const family = version => (version === 'mulassa-v1' || version === SHORT_SCORE_VERSION ? SHORT_SCORE_VERSION : version);
export const figureOf = version => VERSION_RULES[version]?.figureId ?? 'mulassa-valls'; // v2-short and PREVIOUS_VERSION: the Mulassa
export const aliasKey = a => fold(a).replace(/[^a-z0-9]/g, '');

const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const VERIFIED = ['Timbaler', 'Portadora', 'Capgròs', 'Castellera', 'Balladora', 'Mulasser', 'Gegantó', 'Calçot', 'Anxaneta', 'Grallera', 'Trabucaire',
  'Bastoner', 'Cavallot', 'Xirivia', 'Dracaire', 'Fumera', 'Esclat', 'Tabalet', 'Pelegrina', 'Ximeneia', 'Mulatera', 'Brandal', 'Ventall', 'Sargantana',
  'Rabassuda', 'Cucafera', 'Tronada', 'Garrofer', 'Cercavila', 'Fadrina', 'Vallenc', 'Santaursula', 'Mace_Gran', 'Pilar-Valls', 'Ànec', 'PortadoraDeValls'];
// several guests share a name with a verified player, and with each other (their tags differ); one name is the 16 letters' limit
const GUEST_BASES = ['Timbaler', 'Timbaler', 'Timbaler', 'Portadora', 'Portadora', 'Capgròs', 'Xiquet', 'Xiquet', 'Mulassaire', 'Valls', 'Valls', 'Baldufa',
  'Cantaire', 'Tonyina', 'Fira', 'Fira', 'Gralla', 'Pelut', 'Rumba', 'Bombolla', 'Tarat', 'Cargol', 'Pessic', 'DracDeValls_2026', 'Mulassa', 'Mulassa',
  'Sargantana', 'Esquerrà', 'Tabal', 'Faroner', 'Arlequí', 'Quimera', 'Gatzara', 'Bruixot', 'Flabiol', 'Xaloc', 'Cobla', 'Cobla', 'Tamborer', 'Roda'];

// A seeded cast: verified players (clean name) and guests (name + tag), each with a skill 0-1.
function cast(seed) {
  const r = rng(seed), used = new Set(), people = [];
  const add = (name, tag) => {
    const k = `${aliasKey(name)}#${tag ?? ''}`;
    if (used.has(k)) return;
    used.add(k);
    people.push({ id: people.length, alias: name, tag, verified: tag === null, skill: Math.min(1, r() ** 0.8) });
  };
  VERIFIED.forEach(n => add(n, null));
  for (let i = 0; people.length < VERIFIED.length + 64; i++) add(GUEST_BASES[i % GUEST_BASES.length], i % 9 === 0 ? Math.floor(r() * 50) : Math.floor(r() * 10000));
  add('Estrella', 7); add('Estrella', 1234); // low tags: zero padding («#0007»)
  return people;
}
// always on the boards, so the long-name and zero-padded-tag layouts can be found without searching
const MUST = new Set(['PortadoraDeValls', 'DracDeValls_2026', 'Estrella', 'Timbaler']);
const shuffled = (list, r) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// One result in the server's terms: counts out of the level's judgments, the score under its ceiling for those counts.
export function makeRun(version, difficulty, skill, r) {
  const rule = VERSION_RULES[family(version) === SHORT_SCORE_VERSION || version === PREVIOUS_VERSION ? 'mulassa-v3' : version], J = rule.judgments[difficulty];
  const lost = (1 - skill) * 0.42 + 0.02 * r();
  const miss = Math.round(J * lost * 0.6), good = Math.round(J * lost * 1.1), perfect = Math.max(0, J - miss - good);
  const maxCombo = Math.max(1, Math.min(perfect + good, Math.round((perfect + good) * (0.25 + 0.7 * skill * (0.8 + 0.2 * r())))));
  const cap = (rule.ceilings[difficulty] - rule.extras[difficulty]) * (perfect + good) / J + rule.extras[difficulty];
  return { difficulty, perfect, good, miss, max_combo: maxCombo, quality: Math.round(100 * 10 * (perfect + 0.8 * good) / J) / 10, score: Math.floor(cap * (0.5 + 0.45 * skill * (0.9 + 0.1 * r()))) };
}
const level = (skill, r) => { const x = r() * (0.6 + skill); return x < 0.5 ? 0 : x < 1.0 ? 1 : 2; };

// A bucket of statistics (the counters merge_stats takes) consistent with the player's best run in it.
export function makeBucket(version, best, skill, r) {
  const rule = VERSION_RULES[version], J = rule.judgments[best.difficulty], stat = STAT_RULES[version];
  const runs = 3 + Math.floor(r() * 30 * (0.3 + skill)), completed = Math.max(1, Math.floor(runs * (0.5 + 0.35 * r()))), collapsed = Math.min(runs - completed, Math.floor(runs * 0.25 * r()));
  const partial = Math.floor(J * (0.3 + 0.5 * r())), judged = completed * J + collapsed * partial;
  const missShare = best.miss / J, goodShare = best.good / J, miss = Math.round(judged * missShare), good = Math.round(judged * goodShare);
  const hardMiss = Math.min(miss, judged);
  const errors = { early: Math.floor(hardMiss * 0.2) + Math.floor(good * 0.5), late: Math.floor(good * 0.5), silent: Math.floor(hardMiss * 0.5), both: Math.floor(hardMiss * 0.1), hold: Math.floor(hardMiss * 0.1), move: Math.floor(hardMiss * 0.1) };
  const guapaTotal = Math.floor((completed + collapsed) * stat.guapa[best.difficulty] * (0.7 + 0.3 * r())); // a GUAPA missed is an ERROR (below)
  return { runs, completed, collapsed, seconds: Math.floor(runs * stat.seconds * (0.55 + 0.4 * r())), perfect: judged - hardMiss - good, good, miss: hardMiss, errors,
    guapa: Math.max(guapaTotal - hardMiss, Math.floor(guapaTotal * (0.3 + 0.6 * skill))), guapaTotal, balloons: Math.floor(completed * (1 + 3 * r())), holds: best.difficulty === 0 ? 0 : Math.floor(completed * (2 + 5 * r())),
    bestCombo: Math.min(J, Math.max(best.max_combo, Math.round(best.max_combo * (1 + 0.15 * r())))), bestStars: best.quality >= 90 ? 3 : best.quality >= 75 ? 2 : best.quality >= 50 ? 1 : 0,
    best: { score: best.score, perfect: best.perfect, good: best.good, miss: best.miss, maxCombo: best.max_combo } };
}
// Mirrors merge_bucket (202610200003): what the server accepts as the state of a bucket. Returns an error code or null.
export function bucketProblem(key, c) {
  const [figure, version, lvl] = String(key).split('/'), rule = VERSION_RULES[version], stat = STAT_RULES[version], d = +lvl;
  if (key === 'practice') return Object.keys(c).every(k => ['runs', 'seconds'].includes(k) && Number.isSafeInteger(c[k]) && c[k] >= 0) && (c.runs > 0 || !c.seconds) ? null : 'invalid_stats';
  if (!rule || !stat || rule.figureId !== figure || !Number.isInteger(d) || d < 0 || d > 2 || String(d) !== lvl) return 'invalid_bucket';
  const J = rule.judgments[d], KEYS = ['runs', 'completed', 'collapsed', 'seconds', 'perfect', 'good', 'miss', 'guapa', 'guapaTotal', 'balloons', 'holds', 'bestCombo', 'bestStars'];
  const num = (o, keys) => Object.entries(o).every(([k, v]) => keys.includes(k) && Number.isSafeInteger(v) && v >= 0);
  const { errors, best, ...n } = c;
  if (!num(n, KEYS) || (errors && !num(errors, ['early', 'late', 'silent', 'both', 'hold', 'move']))) return 'invalid_stats';
  if (best) {
    if (!num(best, ['score', 'perfect', 'good', 'miss', 'maxCombo']) || Object.keys(best).length !== 5 || best.perfect + best.good + best.miss !== J || best.maxCombo > best.perfect + best.good
      || best.score > rule.ceilings[d] || best.score > (rule.ceilings[d] - rule.extras[d]) * (best.perfect + best.good) / J + rule.extras[d]) return 'invalid_stats';
  }
  const judged = (n.perfect ?? 0) + (n.good ?? 0) + (n.miss ?? 0), done = (n.completed ?? 0) + (n.collapsed ?? 0);
  return done > (n.runs ?? 0) || judged < (n.completed ?? 0) * J || judged > done * J || (n.guapa ?? 0) > (n.guapaTotal ?? 0) || (n.guapaTotal ?? 0) > done * stat.guapa[d]
    || (n.bestCombo ?? 0) > J || (n.bestStars ?? 0) > 3 || (n.seconds ?? 0) > (n.runs ?? 0) * stat.seconds ? 'invalid_stats' : null;
}
const better = (a, b) => !b || (a && (a.score > b.score || (a.score === b.score && 5 * a.perfect + 4 * a.good > 5 * b.perfect + 4 * b.good)));
// Several devices' buckets as one total (stats_totals): sums, maxima, the whole better best.
export function sumBuckets(list) {
  const out = {};
  for (const buckets of list) for (const [key, c] of Object.entries(buckets)) {
    const t = (out[key] ??= key === 'practice' ? { runs: 0, seconds: 0 } : { errors: {}, bestCombo: 0, bestStars: 0, best: null });
    for (const [k, v] of Object.entries(c)) {
      if (k === 'errors') for (const [e, n] of Object.entries(v)) t.errors[e] = (t.errors[e] ?? 0) + n;
      else if (k === 'best') { if (better(v, t.best)) t.best = v; } else if (k === 'bestCombo' || k === 'bestStars') t[k] = Math.max(t[k], v);
      else t[k] = (t[k] ?? 0) + v;
    }
  }
  return out;
}
export const dayString = ms => new Date(ms).toISOString().slice(0, 10);
// current and longest run of consecutive days (my_stats): `today` is a YYYY-MM-DD
export function streaks(days, today) {
  const n = s => Date.parse(`${s}T00:00:00Z`) / DAY, nums = [...new Set(days)].sort().map(n);
  let run = 0, best = 0, last = null;
  nums.forEach((x, i) => { run = i && x - nums[i - 1] === 1 ? run + 1 : 1; best = Math.max(best, run); last = { x, run }; });
  return { current: last && n(today) - last.x <= 1 ? last.run : 0, longest: best };
}

// 'many': the calendar quarters up to the one `now` falls in, named and bounded as the server does (00:00 in Valls)
const QUARTERS = ['Hivern', 'Primavera', 'Estiu', 'Tardor'];
const quarterStart = (y, q) => Date.parse(`${y + Math.floor(q / 4)}-${String(q % 4 * 3 + 1).padStart(2, '0')}-01T00:00:00${q % 4 ? '+02:00' : '+01:00'}`);
function quarters(now, count) {
  let y = new Date(now).getUTCFullYear(), q = 3;
  while (quarterStart(y, q) > now) q--;
  const out = [];
  for (let k = count - 1; k >= 0; k--) { const yy = y + Math.floor((q - k) / 4), qq = ((q - k) % 4 + 4) % 4; out.push({ name: `${QUARTERS[qq]} ${yy}`, startsAt: quarterStart(yy, qq), endsAt: quarterStart(yy, qq + 1) }); }
  return out.map((s, i) => ({ id: i + 1, ...s }));
}
// The calendar of a world: [{ id, name, startsAt, endsAt (ms | null) }] and which season each version publishes to.
function calendar(world, now) {
  const base = [{ id: 0, name: 'Estrena 2026', startsAt: Date.parse('2026-10-15T00:00:00+02:00'), endsAt: null }];
  if (world === 'many') { const list = quarters(now, 12); return { seasons: [...base, ...list], open: 12, retired: { [SHORT_SCORE_VERSION]: 0, [PREVIOUS_VERSION]: 7 } }; }
  if (world === 'later') return { seasons: [...base, { id: 1, name: 'Tardor 2026', startsAt: now - 80 * DAY, endsAt: now - 3 * DAY }, { id: 2, name: 'Hivern 2027', startsAt: now - 3 * DAY, endsAt: now + 87 * DAY }],
    open: 2, retired: { [SHORT_SCORE_VERSION]: 0, [PREVIOUS_VERSION]: 1 } };
  // the open season is the real calendar quarter: the board's line first shows the calendar's days left, then this answer's
  return { seasons: [...base, ...quarters(now, 1)], open: 1, retired: { [SHORT_SCORE_VERSION]: 0 } };
}

// board: null | 'empty' (the open season has no results yet) | 'me' (a long ladder with the signed-in profile at #48 of 119)
export function buildWorld({ world = 'launch', board = null, drac = null, now = Date.now(), seed = 7 } = {}) {
  const r = rng(seed), people = cast(seed), cal = calendar(world, now);
  const boards = [];
  const fill = (seasonId, version, count, order, previousDance = false) => {
    const rows = [...people.filter(p => MUST.has(p.alias)), ...shuffled(people.filter(p => !MUST.has(p.alias)), r)].slice(0, count).map(p => {
      const run = makeRun(version, level(p.skill, r), p.skill, r);
      return { pid: p.id, alias: p.alias, tag: p.tag, verified: p.verified, ...run };
    });
    boards.push({ seasonId, version, figure: figureOf(version), order, previousDance, rows });
  };
  if (world !== 'many') fill(0, SHORT_SCORE_VERSION, 60, 0);
  if (world === 'many') { // 1-11 closed (the old dance until 7, both in 7), 12 open; the Drac only in the open one
    for (let id = 1; id <= 11; id++) { if (id <= 7) fill(id, PREVIOUS_VERSION, 20 + (id * 7) % 31, 1, id === 7); if (id >= 7) fill(id, 'mulassa-v3', 18 + (id * 11) % 37, 2); }
    fill(12, 'mulassa-v3', 15, 3); fill(12, DRAC_SCORE_VERSION, 6, 3); fill(12, BOU_SCORE_VERSION, 5, 3);
  } else if (world === 'later') {
    fill(1, PREVIOUS_VERSION, 47, 1, true); fill(1, 'mulassa-v3', 20, 2); fill(1, DRAC_SCORE_VERSION, 14, 1);
    fill(2, 'mulassa-v3', 15, 3); fill(2, DRAC_SCORE_VERSION, 6, 3); fill(2, BOU_SCORE_VERSION, 8, 3); // the Bou is new: open season only
  } else {
    fill(1, 'mulassa-v3', 45, 1); fill(1, DRAC_SCORE_VERSION, 12, 1); fill(1, BOU_SCORE_VERSION, 10, 1);
  }
  const openMulassa = boards.find(b => b.seasonId === cal.open && b.figure === 'mulassa-valls' && b.order === Math.max(...boards.filter(x => x.seasonId === cal.open && x.figure === 'mulassa-valls').map(x => x.order)));
  const openDrac = boards.find(b => b.seasonId === cal.open && b.figure === 'drac-valls');
  if (board === 'empty') boards.filter(b => b.seasonId === cal.open).forEach(b => (b.rows = []));
  if (drac === 'empty') openDrac.rows = [];
  let me = null;
  if (board === 'me') { // a ladder for responsive scroll checks: «Prova1…», the signed-in profile (ProvaRetall) at #48 of 119
    const counts = d => { const J = VERSION_RULES[openMulassa.version].judgments[d], miss = Math.round(J * 0.06), good = Math.round(J * 0.3), perfect = J - miss - good; // ~88%, from its own counts
      return { perfect, good, miss, quality: Math.round(1000 * (perfect + 0.8 * good) / J) / 10 }; };
    const ladder = Array.from({ length: 119 }, (_, i) => ({ pid: -1, alias: `Prova${i + 1}`, tag: 1000 + i, verified: false, difficulty: i % 3, ...counts(i % 3), max_combo: 50, score: 69286 + (47 - i) * 600 }));
    me = ladder.splice(47, 1)[0];
    openMulassa.rows = ladder;
  }
  // the statistics of the cast: a bucket per figure, version and level they have a result in (v2-short has no statistics)
  const stats = new Map();
  for (const b of boards) for (const row of b.rows) {
    if (row.pid < 0 || !STAT_RULES[b.version]) continue;
    const key = `${b.figure}/${b.version}/${row.difficulty}`, mine = stats.get(row.pid) ?? stats.set(row.pid, {}).get(row.pid);
    mine[key] ??= makeBucket(b.version, row, people[row.pid].skill, r);
  }
  return { people, boards, stats, me, ...cal, r };
}

// The signed-in demo account's own statistics on the server: the buckets of its best runs on another device, and its days.
export function selfStats(entries, now) {
  const r = rng(99), buckets = {};
  for (const e of entries) {
    if (!STAT_RULES[e.version]) continue;
    const key = `${figureOf(e.version)}/${e.version}/${e.difficulty}`;
    buckets[key] = makeBucket(e.version, { ...e, miss: e.miss, good: e.good, perfect: e.perfect }, 0.75, r);
  }
  if (Object.keys(buckets).length) buckets.practice = { runs: 2, seconds: 95 };
  // 4 days in a row up to today, 6 a week before (longest 6), a few apart: 12 days played in the last 3 weeks
  const days = [...Array(4).keys()].map(i => now - i * DAY).concat([...Array(6).keys()].map(i => now - (9 + i) * DAY), [now - 20 * DAY, now - 22 * DAY]).map(dayString);
  return { buckets, days: [...new Set(days)].sort() };
}

// Who to look at: a verified player, a guest sharing a name, the 20-letter names, a tag below 10 and a player with no statistics.
export function demoCards(options = {}) {
  const w = buildWorld(options), open = w.boards.filter(b => b.seasonId === w.open && b.figure === 'mulassa-valls').at(-1).rows;
  const name = cal => cal.seasons.find(x => x.id === cal.open).name, ranked = [...open].sort((a, b) => b.score - a.score);
  // a row of the open Mulassa board: the card shows where it was tapped (player-card.js `from`)
  const ref = p => ({ alias: p.alias, tag: p.tag, ...(ranked.includes(p) && { from: { figure: 'mulassa-valls', season: name(w), position: ranked.indexOf(p) + 1, score: p.score, difficulty: p.difficulty } }) });
  const guest = open.find(p => p.tag !== null && w.people.some(q => q.id !== p.id && aliasKey(q.alias) === aliasKey(p.alias)));
  const bare = w.boards[0].rows.find(p => p.pid >= 0 && !w.stats.has(p.pid));
  return { plain: ref(open.find(p => p.verified && w.stats.has(p.pid))), guest: ref(guest ?? open.find(p => p.tag !== null)), long: ref(w.people.find(p => p.alias === 'PortadoraDeValls')),
    longGuest: ref(w.people.find(p => p.alias === 'DracDeValls_2026')), padded: { alias: 'Estrella', tag: 7 }, empty: bare ? ref(bare) : null };
}
