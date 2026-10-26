// Player statistics kept on the device (docs/rankings/strategy.md §7). Pure functions over one document, plus the
// storage key. Everything is per owner: 'none' (played without a profile) or a user id. The server gets the same
// counters through payload(); it keeps the maximum per device and bucket.
import { store } from '../platform/storage.js';
import { FIGURES, hasBoard } from './figures.js';

const KEY = 'stats-v1', NONE = 'none';
const ERRORS = ['early', 'late', 'silent', 'both', 'hold', 'move'];
const SUMS = ['runs', 'completed', 'collapsed', 'seconds', 'perfect', 'good', 'miss', 'guapa', 'guapaTotal', 'balloons', 'holds'];
const MAXES = ['bestCombo', 'bestStars'];
let current = NONE;
export function setStatsOwner(userId) { current = userId || NONE; }
export const getStatsOwner = () => current;

const zero = () => ({ ...Object.fromEntries(SUMS.map(k => [k, 0])), errors: Object.fromEntries(ERRORS.map(k => [k, 0])), bestCombo: 0, bestStars: 0, best: null });
const emptyOwner = () => ({ counters: {}, days: [], practice: { runs: 0, seconds: 0 } });
const int = v => (Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
// Seconds round DOWN: the server bounds them by runs x the song's exact length (merge_bucket), and 109.889 s must not become 110.
const whole = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
// The whole best run, never field by field: points first, the % breaks ties.
const better = (a, b) => !b || (a && (a.score > b.score || (a.score === b.score && a.quality > b.quality)));
const uuid = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNumber = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5; // UTC: a DST change never skips or doubles a day

export function newStats() { return { since: null, deviceId: uuid(), owners: {} }; }
export function loadStats() {
  try {
    const s = JSON.parse(store.get(KEY));
    if (s && typeof s === 'object' && s.owners && typeof s.owners === 'object' && typeof s.deviceId === 'string') return s;
  } catch { /* missing or damaged: start again */ }
  return newStats();
}
export function saveStats(stats) { store.set(KEY, JSON.stringify(stats)); }

const ownerOf = (stats, id) => (stats.owners[id || NONE] ??= emptyOwner());
const bucketOf = (o, key) => (o.counters[key] ??= zero());

function addDay(o, date) { if (date && !o.days.includes(date)) { o.days.push(date); o.days.sort(); } }

// One finished or abandoned run. kind: end | collapse | quit | restart | practice. Quit and restart add the run and its
// time only; a collapse adds the judgments it reached; an end adds everything.
export function endRun(stats, owner, run) {
  const o = ownerOf(stats, owner);
  stats.since ??= run.date;
  addDay(o, run.date);
  if (run.kind === 'practice') { o.practice.runs++; o.practice.seconds += whole(run.seconds); return stats; }
  const b = bucketOf(o, `${run.figureId}/${run.version}/${run.level}`);
  b.runs++; b.seconds += whole(run.seconds);
  if (run.kind !== 'end' && run.kind !== 'collapse') return stats;
  if (run.kind === 'end') b.completed++; else b.collapsed++;
  for (const k of ['perfect', 'good', 'miss']) b[k] += int(run.counts?.[k]);
  for (const k of ERRORS) b.errors[k] += int(run.errors?.[k]);
  for (const k of ['guapa', 'guapaTotal', 'balloons', 'holds']) b[k] += int(run[k]);
  b.bestCombo = Math.max(b.bestCombo, int(run.maxCombo));
  if (run.kind === 'end') {
    b.bestStars = Math.max(b.bestStars, int(run.stars));
    // the server's shape (merge_stats validates score, perfect, good, miss, maxCombo); quality stays local, for ties
    const tuple = { score: int(run.score), perfect: int(run.counts?.perfect), good: int(run.counts?.good), miss: int(run.counts?.miss),
      maxCombo: int(run.maxCombo), quality: Math.round((run.quality || 0) * 100) / 100 };
    if (better(tuple, b.best)) b.best = tuple;
  }
  return stats;
}

// Add the document `from` (an owner entry) into `into`: sums, maxima, the better whole best run, the union of days.
function mergeOwner(into, from) {
  for (const [key, c] of Object.entries(from.counters)) {
    const b = bucketOf(into, key);
    for (const k of SUMS) b[k] += c[k] || 0;
    for (const k of ERRORS) b.errors[k] += c.errors?.[k] || 0;
    for (const k of MAXES) b[k] = Math.max(b[k], c[k] || 0);
    if (better(c.best, b.best)) b.best = c.best;
  }
  from.days.forEach(d => addDay(into, d));
  into.practice.runs += from.practice.runs; into.practice.seconds += from.practice.seconds;
}
// Decision 30: what was played without a profile goes, once, to the profile created or opened next; later unowned play
// starts again from an empty 'none'.
export function transferNone(stats, userId) {
  const none = stats.owners[NONE];
  if (!userId || userId === NONE || !none) return stats;
  const o = ownerOf(stats, userId);
  mergeOwner(o, none);
  delete stats.owners[NONE];
  return stats;
}
// Decision 31: a deleted profile takes its numbers with it; they never pass to 'none' or to anyone else.
export function forgetOwner(stats, userId) {
  if (userId && userId !== NONE) delete stats.owners[userId];
  return stats;
}
export function markSent(stats, owner, signature) { const o = ownerOf(stats, owner); o.sent = signature; o.imported = true; return stats; }

// What the server's merge_stats receives: cumulative counters per bucket (never a single run) and the days, in a fixed order.
// A figure with no online board (the Bou, pending or not) stays on the device: merge_stats refuses a bucket it has no
// version for, and one refused bucket would stop every other figure's statistics from being sent.
const DEVICE_ONLY = new Set(FIGURES.filter(f => !hasBoard(f)).map(f => f.id));
export function payload(stats, owner) {
  const o = stats.owners[owner || NONE] ?? emptyOwner(), buckets = {};
  for (const key of Object.keys(o.counters).sort()) {
    const c = o.counters[key];
    if (c.runs <= 0 || DEVICE_ONLY.has(key.split('/')[0])) continue;
    const { quality, ...best } = c.best ?? {}; // eslint-disable-line no-unused-vars
    buckets[key] = { ...c, best: c.best ? best : null };
  }
  if (o.practice.runs > 0) buckets.practice = { ...o.practice }; // merge_stats' reserved bucket
  return { device: stats.deviceId, imported: !!o.imported, buckets, days: [...o.days].sort() };
}

// The Profile sheet's numbers. `today` is a local YYYY-MM-DD; accuracy uses the game's own % (PERFECTE 1, BÉ 0.8).
export function summary(stats, owner, today = localDate()) {
  const o = stats.owners[owner || NONE] ?? emptyOwner();
  const t = { runs: 0, completed: 0, collapsed: 0, seconds: 0, perfect: 0, good: 0, miss: 0, guapa: 0, guapaTotal: 0, balloons: 0, holds: 0, bestCombo: 0 };
  const byFigure = {};
  let stars = 0;
  for (const [key, c] of Object.entries(o.counters)) {
    for (const k of Object.keys(t)) t[k] = k === 'bestCombo' ? Math.max(t[k], c[k]) : t[k] + c[k];
    const fig = key.split('/')[0];
    byFigure[fig] = (byFigure[fig] || 0) + c.runs;
    stars += c.bestStars; // already the maximum per figure, level and version
  }
  const judged = t.perfect + t.good + t.miss;
  const days = [...o.days].sort(), nums = days.map(dayNumber);
  let best = 0, run = 0;
  nums.forEach((n, i) => { run = i && n - nums[i - 1] === 1 ? run + 1 : 1; best = Math.max(best, run); });
  const last = nums.at(-1), now = dayNumber(today);
  const streak = last !== undefined && now - last <= 1 && now >= last ? run : 0;
  return { ...t, practice: { ...o.practice }, accuracy: judged ? 100 * (t.perfect + t.good * 0.8) / judged : null,
    favouriteFigure: Object.entries(byFigure).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null,
    stars, daysPlayed: days.length, streak, bestStreak: best, since: stats.since };
}

// GUAPA, GLOBUS and MANTÉN tallies of a chart as the judge left it (judge.js sets hit, gran, count and tail).
export function chartTallies(chart) {
  const t = { guapa: 0, guapaTotal: 0, balloons: 0, holds: 0 };
  for (const n of chart) {
    if (n.balloon) { if (n.count >= n.need) t.balloons++; continue; }
    if (n.big && n.hit) { t.guapaTotal++; if (n.hit !== 'miss' && n.gran) t.guapa++; }
    if (n.end && n.tail === 'perfect') t.holds++;
  }
  return t;
}

// Convenience for flow.js: read, add to the current owner, write back (the key is read and written whole, last tab wins).
export function recordRun(run) { saveStats(endRun(loadStats(), current, run)); }

// The run in progress that counts: armed when a run begins (false for the excluded ones), closed once by whichever
// ending path comes first, so a restart after a finish, or a second call, never counts twice.
let live = false;
export const armRun = counts => { live = !!counts; };
// valid: false when something made the run uncountable after it began (a debug hook): it ends, uncounted.
export function closeRun(makeRun, valid = true) {
  if (!live) return false;
  live = false;
  if (!valid) return false;
  recordRun(makeRun());
  return true;
}
