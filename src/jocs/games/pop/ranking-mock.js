// Dev only, a dev server with no Supabase (as the main game's MOCK_BOARD): ranking.js's calls over an invented board in memory,
// so the screens can be seen. ?sense-nom plays a player with no name yet. Nothing is sent anywhere, nothing kept.
const NAMES = ['Gegantó', 'Mulassaire', 'Colla_Vella', 'Xiquet', 'Tronada', 'Bastoner', 'Calçotaire', 'Campanera', 'Drac_Petit', 'Grallera']; // i18n-ok: invented players of the dev mock board, never shown on a real one
const BADGES = ['colla-vella', null, 'senyera', null, 'town:valls', null, null, 'uaf', null, null]; // some confirmed, some with a badge
const rows = NAMES.map((alias, i) => ({ alias, score: 214 - i * 17, is_self: false, released: false, verified: i % 3 !== 1, badge_id: BADGES[i], public_id: `mock-${i}` }));
const named = !new URLSearchParams(location.search).has('sense-nom');
let mine = null; // a new player: on the board only once a run is published, as on the real one (a fresh page starts over)
const ranked = () => {
  const all = [...rows, ...(mine == null ? [] : [{ alias: 'Tu_mateix', score: mine, is_self: true, released: false, verified: false, badge_id: null, public_id: 'mock-me' }])]
    .sort((a, b) => b.score - a.score);
  return all.map(r => ({ ...r, position: 1 + all.filter(o => o.score > r.score).length, total: all.length }));
};
const wait = v => new Promise(go => setTimeout(() => go(v), 400));
const fail = code => Object.assign(new Error(code), { code });

export async function me() {
  const self = ranked().find(r => r.is_self);
  return wait({ name: named ? 'Tu_mateix' : null, released: false, place: self ? { score: self.score, position: self.position, public_id: self.public_id } : null });
}
export const board = () => wait(ranked());
export async function player(publicId) {
  const r = ranked().find(o => o.public_id === publicId);
  return wait(r && { ...r, best: r.score, runs: 3 + r.score % 17, average: Math.round(r.score * .6) });
}
export async function publish(run) {
  if (!named) throw fail('noname');
  const improved = mine == null || run.score > mine;
  if (improved) mine = run.score;
  return wait({ score: run.score, best: mine, improved, position: ranked().find(r => r.is_self).position });
}
let kept = null;
export const keep = run => { if (!kept || run.score > kept.score) kept = run; };
export const pending = () => kept;
export const forget = () => { kept = null; };
