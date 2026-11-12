// Dev only, a dev server with no Supabase (as the main game's MOCK_BOARD): ranking.js's calls over an invented board in memory,
// so the screens can be seen. ?sense-nom plays a player with no name yet; ?jugadors=N a board of N players (default 10),
// ?posicio=P the player already on it at place P (the long board's paging, the gap, the jump to the own row), ?falla-pagina
// fails every other page after the first (its retry). Nothing is sent anywhere, nothing kept.
const NAMES = ['Gegantó', 'Mulassaire', 'Colla_Vella', 'Xiquet', 'Tronada', 'Bastoner', 'Calçotaire', 'Campanera', 'Drac_Petit', 'Grallera']; // i18n-ok: invented players of the dev mock board, never shown on a real one
const BADGES = ['colla-vella', null, 'senyera', null, 'town:valls', null, null, 'uaf', null, null]; // some confirmed, some with a badge
const q = new URLSearchParams(location.search);
const N = Math.min(Math.max(Number(q.get('jugadors')) || NAMES.length, 1), 100000);
const step = N > NAMES.length ? 4 : 17; // the short board keeps its old points
const rows = Array.from({ length: N }, (_, i) => ({ alias: i < NAMES.length ? NAMES[i] : `${NAMES[i % NAMES.length]}${i}`, score: 10 + (N - i) * step, hits: 120 - (i % 100), level: i % 3, is_self: false, released: false, verified: i % 3 !== 1, badge_id: BADGES[i % BADGES.length], public_id: `mock-${i}` }));
const named = !q.has('sense-nom');
const at = Number(q.get('posicio')) || 0; // between the players at P-1 and P: place P
let mine = named && at ? (rows[Math.min(at, N) - 1].score + (at > N ? -2 : 2)) : null, mineHits = 0, mineLevel = 0; // a new player: on the board only once a run is published, as on the real one (a fresh page starts over)
let pages = 0;
const ranked = () => {
  const all = [...rows, ...(mine == null ? [] : [{ alias: 'Tu_mateix', score: mine, hits: mineHits, level: mineLevel, is_self: true, released: false, verified: false, badge_id: null, public_id: 'mock-me' }])]
    .sort((a, b) => b.score - a.score);
  let pos = 0;
  return all.map((r, i) => ({ ...r, position: pos = i && r.score === all[i - 1].score ? pos : i + 1, total: all.length }));
};
const wait = v => new Promise(go => setTimeout(() => go(v), 400));
const fail = code => Object.assign(new Error(code), { code });

export async function me() {
  const self = ranked().find(r => r.is_self);
  return wait({ name: named ? 'Tu_mateix' : null, released: false, place: self ? { score: self.score, position: self.position, public_id: self.public_id } : null });
}
export const board = (offset = 0, limit = 50) => (offset && q.has('falla-pagina') && ++pages % 2 ? new Promise((_, no) => setTimeout(() => no(fail('unavailable')), 400)) : wait(ranked().slice(offset, offset + Math.min(limit, 50))));
export async function player(publicId) {
  const r = ranked().find(o => o.public_id === publicId);
  return wait(r && { ...r, best: r.score, runs: 3 + r.score % 17, average: Math.round(r.score * .6) });
}
export async function publish(run) {
  if (!named && !(await import('./settings.js')).mockNamed()) throw fail('noname'); // ?sense-nom until the name step makes one
  const improved = mine == null || run.points > mine;
  if (improved) { mine = run.points; mineHits = run.hits; mineLevel = run.level; }
  return wait({ score: run.points, best: mine, improved, position: ranked().find(r => r.is_self).position });
}
let kept = null;
export const keep = run => { if (!kept || run.points > kept.points) kept = run; };
export const pending = () => kept;
export const forget = () => { kept = null; };
