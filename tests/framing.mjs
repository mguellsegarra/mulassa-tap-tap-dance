// Play camera framing helpers: prop blocking, the attention stage, critically damped smoothing.
import assert from 'node:assert/strict';

// Props: a tree on the sight line or against the lens is in the way; one behind the camera or beyond her is not.
import { blocks } from '../src/scene/framing.js';
const tree = { x: 0, z: 5, r: 2.2, h: 5.5 };
assert(blocks(tree, [0, 4, 10], [0, 1, 0]), 'on the sight line, low: in the way');
assert(!blocks(tree, [0, 30, 10], [0, 1, 0]), 'the sight line passes high above it');
assert(!blocks(tree, [0, 4, 0], [0, 1, -10]), 'behind the camera, clear of the lens');
assert(!blocks(tree, [10, 4, 10], [10, 1, 0]), 'off to the side');
assert(blocks({ x: 1, z: 1, r: 0.4, h: 4.6 }, [0, 5, 0], [0, 1, -10]), 'right by the lens');
console.log('prop blocking ok');

// The attention stage stays near the lane, with distinct room above and below its centre.
import { stageFrame } from '../src/scene/framing.js';
const stage = stageFrame({}, 120, 400);
assert.equal(stage.center, 232);
assert.equal(stageFrame(stage, 120, 400), stage, 'reuse the layout object');
assert(Number.isFinite(stageFrame(stage, 400, 410).center), 'short stages remain finite');
console.log('attention stage ok');

// Festa decor (hanging flags, pennants, the escut) stays on the façades: well outside the square the play camera keeps to
// (plaza.inner - 1.5), so none can ever hang between the camera and the mulassa.
const { buildPlaza } = await import('../src/scene/models.js');
for (let i = 0; i < 8; i++) {
  const plaza = buildPlaza();
  assert(plaza.decoBoxes > 300, `the plaça is decorated (${plaza.decoBoxes} flag layers)`);
  assert(plaza.decoReach > plaza.inner - 1.5 + 0.5, `flags keep out of the camera's square (${plaza.decoReach.toFixed(2)})`);
}
console.log('plaça flags ok');

// Camera smoothing: critically damped (a step never overshoots), the same path at any frame rate, and it follows a
// steady move without the lag growing.
import { smoothDamp } from '../src/scene/framing.js';
const stepTo = (fps, seconds, target = 10) => {
  const s = { x: new Float64Array(1), v: new Float64Array(1) }, path = [];
  for (let i = 0; i < fps * seconds; i++) { smoothDamp(s, 0, target, 0.5, 1 / fps); path.push(s.x[0]); }
  return path;
};
const at60 = stepTo(60, 3), at30 = stepTo(30, 3), at120 = stepTo(120, 3);
assert(at60.every((x, i) => x <= 10 + 1e-9 && (i === 0 || x >= at60[i - 1])), 'a step is approached monotonically, no overshoot');
assert(Math.abs(at60.at(-1) - 10) < 1e-3, 'and reached');
for (const k of [0.25, 0.5, 1, 2]) { // the same curve whatever the frame rate
  const a = at60[Math.round(k * 60) - 1], b = at30[Math.round(k * 30) - 1], c = at120[Math.round(k * 120) - 1];
  assert(Math.abs(a - b) < 0.35 && Math.abs(a - c) < 0.2, `frame-rate independent at ${k} s (${a.toFixed(2)} ${b.toFixed(2)} ${c.toFixed(2)})`);
}
{
  const s = { x: new Float64Array(1), v: new Float64Array(1) }; let lag = [];
  for (let i = 0; i < 600; i++) { const target = i / 60 * 2; smoothDamp(s, 0, target, 0.5, 1 / 60); lag.push(target - s.x[0]); }
  assert(Math.abs(lag.at(-1) - lag[300]) < 1e-3 && lag.at(-1) < 1.1, 'a steady move is followed with a constant, small lag');
  const s2 = { x: new Float64Array([3]), v: new Float64Array([0]) };
  assert.equal(smoothDamp(s2, 0, 9, 0.5, 0), 3, 'a paused frame does not move it');
}
console.log('camera smoothing ok');
