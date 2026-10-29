// The results screen copies the star row from a sprite once STARS_SETTLED has passed (hud/results.js), adding only the
// live twinkle: from then on a live frame must paint exactly the settled row plus that twinkle, or the copy would freeze
// a drop, flash, ring, spark or the golden burst mid-way.
import assert from 'node:assert/strict';
import { drawStars, STARS_SETTLED } from '../../src/hud/stars.js';

// A 2D context that records every call and style set, numbers rounded (the landing squash decays to ~1e-6, not 0).
const recorder = () => {
  const ops = [], fmt = v => typeof v === 'number' ? +v.toFixed(3) : v && typeof v === 'object' ? 'obj' : v;
  const c = new Proxy({}, {
    get: (_, k) => k === 'ops' ? ops : k === 'createLinearGradient' || k === 'createRadialGradient'
      ? (...a) => { ops.push(`${k}(${a.map(fmt)})`); return { addColorStop: (...s) => ops.push(`stop(${s.map(fmt)})`) }; }
      : (...a) => ops.push(`${String(k)}(${a.map(fmt)})`),
    set: (_, k, v) => { ops.push(`${String(k)}=${fmt(v)}`); return true; },
  });
  return c;
};
// The order differs (the full draw twinkles star by star; the copy twinkles after the row): compare as multisets.
const bag = ops => [...ops].sort();

for (const n of [0, 1, 2, 3]) for (const t of [STARS_SETTLED + 0.01, STARS_SETTLED + 0.5, STARS_SETTLED + 7.3]) {
  const live = recorder(); drawStars(live, n, 200, 100, 84, t);
  const copy = recorder(); drawStars(copy, n, 200, 100, 84); drawStars(copy, n, 200, 100, 84, t, true);
  assert.deepEqual(bag(live.ops), bag(copy.ops), `${n} stars at ${t.toFixed(2)} s: the settled row plus the twinkle`);
}
// Before it, three stars are still landing: the copy would be wrong there, so the threshold is not slack in the other direction.
const early = recorder(); drawStars(early, 3, 200, 100, 84, STARS_SETTLED - 0.4);
const still = recorder(); drawStars(still, 3, 200, 100, 84); drawStars(still, 3, 200, 100, 84, STARS_SETTLED - 0.4, true);
assert.notDeepEqual(bag(early.ops), bag(still.ops), 'the golden burst is still fading just before STARS_SETTLED');
console.log('result stars: settled row + twinkle ok');
