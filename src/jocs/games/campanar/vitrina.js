// ?vitrina (dev server only): a run that plays itself and builds every prototype ornament in about 70 floors
// (ornament-plan.js lowers its heights): perfects in A (the clock, the stair, the Mulassa's gargoyle, the drain
// gargoyles, the rose, the fillers), a cut to C, one to XS held for the Virgin's window and the moon, thin floors for the
// spire's crockets, then a miss. Every find gets its moment each time (bands.js remembers nothing). ?vitrina=<id>
// (A1, B2, A10, B5, A6, F8, F1, G6, E1) misses as soon as that ornament has settled: the end's close shot of the top
// shows it; D6, the lightning rod, grows with the crown, so ?vitrina=D6 misses once the tower is tall enough for it
// (a wide one: the tiled head, where the whole run shows it on the spire).
import { SIZE } from './rules.js';
import { FROM } from './ornament-plan.js';

export const VITRINA = import.meta.env.DEV && new URLSearchParams(location.search).has('vitrina');
const UNTIL = new URLSearchParams(location.search).get('vitrina');
let stop = false;
export const vitrinaFound = ids => { stop ||= ids.includes(UNTIL); }; // ornaments settled (scene.js found)
const PLAN = [[36, 1], [44, 0.52], [62, 0.3], [70, 0.17]]; // up to floor n, the share of the full side it holds
// floor n's drop on the floor below `top` → how far off its middle, in sides: 0 a perfect, a cut to the share planned
export function vitrinaDrop(n, top) {
  if (n === 1) stop = false; // a new run
  if (UNTIL === 'D6' && n > FROM.rod) stop = true;
  const goal = PLAN.find(([k]) => n <= k)?.[1];
  if (goal === undefined || stop) return 3; // a miss: the end
  const want = goal * SIZE;
  return top.w <= want * 1.02 ? 0 : (top.w - want * want / top.w) / SIZE; // a cut that squares to `want` (rules.js)
}
