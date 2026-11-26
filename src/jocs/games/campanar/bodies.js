// The grouping: consecutive floors of about the same width make one body (the shaft, the clock stage, the bell
// chamber...), built as a straight prism on the narrowest plan of its floors (each slab lies inside the one below):
// the tower never gets wider than the player built it. A tower that keeps tapering a little is gathered into bodies of
// at least MIN_FLOORS, so it reads as a few neo-gothic stages, as Valls has, not as a pile of steps (Carbon's study,
// M1). Only the ground floor keeps its own plan, a plinth. A floor is settled as it turns to stone, AHEAD under the
// top, so a body only looks AHEAD floors up: what is settled never changes. Pure: no three, no DOM.
import { SIZE } from './rules.js';

export const TOL = 0.08; // past MIN_FLOORS, a floor joins the body while within this share of the full side of its first
const TAPER = 0.28, MIN_FLOORS = 5; // the first MIN_FLOORS of a body gather any taper up to this share (more is a setback)
export const AHEAD = 5; // the floors still in colour over the one turning to stone: all a body may know of what comes

export function sameCampanarPlan(a, b) {
  return a.x === b.x && a.z === b.z && a.w === b.w && a.d === b.d;
}
const near = (a, b, tol) => a.w - b.w < tol * SIZE && a.d - b.d < tol * SIZE;
const reach = (lo, j, tol) => (j - lo < MIN_FLOORS ? Math.max(tol, TAPER) : tol);
// does floor j (known: the slabs as built) join body {lo, plan}? Near its first and still holding its whole plan
export const joinsBody = (known, j, body, tol = TOL) => !!body && !!known[j] && near(known[body.lo], known[j], reach(body.lo, j, tol))
  && known[j].w >= body.plan.w && known[j].d >= body.plan.d;

// floor i's body, given floor i-1's (prev): it joins it, or starts one whose plan is the narrowest of the floors that
// join it in the next AHEAD that are known
export function bodyAt(known, i, prev, tol = TOL) {
  if (joinsBody(known, i, prev, tol)) return prev;
  let plan = known[i];
  // up to AHEAD - 1 floors over it: all the floor under it knew when it sloped in to this plan (facade.js, glacis)
  for (let j = i + 1; j < known.length && j < i + AHEAD && near(known[i], known[j], reach(i, j, tol)); j++) plan = known[j];
  return { lo: i, plan };
}
