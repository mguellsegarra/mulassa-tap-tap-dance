// The judge's decisions as pure functions (no scene, no clock): judge.js feeds them the song time and applies the effects.
export const gradeOf = (dt, win) => (dt <= win.perfect ? 'perfect' : dt <= win.good ? 'good' : 'miss'); // dt: |error| in song seconds
// The note a press at song time `t` is for: the first unresolved one (chart order, so a tie goes to the earlier note) within
// win.miss. `from` is the first note not yet settled; `skip` the GUAPA waiting for its partner button.
export function pressTarget(chart, from, t, win, skip) {
  for (let i = from; i < chart.length; i++) {
    const n = chart[i];
    if (n.t - t > win.miss) break;
    if (n.hit || n.balloon || n === skip) continue;
    const dt = Math.abs(t - n.t);
    if (dt <= win.miss) return { n, kind: gradeOf(dt, win), early: t < n.t };
  }
  return null;
}
export const pairWindow = diff => (diff === 0 ? 0.15 : 0.08); // GUAPA: the second button within this of the first
export const isPartnerPress = (pending, dir) => !!pending && dir !== pending.dir && (dir === 'L' || dir === 'R'); // swallowed: it never reaches the next note
export const pairClosed = (pending, t, diff) => !!pending && t - pending.t > pairWindow(diff);
export const HOLD_GRACE = 0.12; // letting go this close to the end counts as holding to the end
// A hold's tail, judged once: got = how far it was held. `more` names the detail line (see DETAIL in judge-words.js).
export function holdVerdict(n, got, t) {
  const frac = t >= n.end - HOLD_GRACE ? 1 : (got - n.t) / (n.end - n.t);
  return frac >= 0.9 ? { frac, kind: 'perfect', more: '' } : frac >= 0.5 ? { frac, kind: 'good', more: 'holdMore' } : { frac, kind: 'miss', more: 'hold' };
}
export const balloonVerdict = (count, need) => (count >= need ? 'perfect' : count * 2 >= need ? 'good' : 'miss'); // time's up: a pop is perfect, half-inflated still good
export const isOverdue = (n, t, win) => t - n.t > win.miss; // untouched past its window: a silent miss
