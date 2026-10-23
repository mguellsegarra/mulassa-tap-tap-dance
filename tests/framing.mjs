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

// The selector camera's fit: the figure fills the free rect (the tighter of its height and width decides), sits centred while
// it fits, and on a band too short for a readable figure it stands on the band's floor and rises over the soft top, never past
// the hard one. Continuous as the band shrinks (no step in distance or placement).
import { menuFit, envelope } from '../src/scene/framing.js';
{
  const tan = Math.tan(25 * Math.PI / 180), vh = 852, ppm = vh / (2 * tan), out = {};
  const band = { top: 260, bottom: 612, hardTop: 114, left: 0, right: 393 };
  menuFit(out, band, vh, tan, 2, 4); // a tall figure: its height decides
  const tall = 4 * ppm / out.dist;
  assert(Math.abs(tall - 0.86 * 352) < 1e-6 && 2 * ppm / out.dist < 0.8 * 393, 'tall: fills 86% of the band, narrower than it');
  assert.equal(out.cy, 436); assert.equal(out.cx, 196.5);
  menuFit(out, band, vh, tan, 6, 2); // a long one: its width decides
  assert(Math.abs(6 * ppm / out.dist - 0.8 * 393) < 1e-6 && 2 * ppm / out.dist < 0.86 * 352, 'long: fills 80% of the width (room for her travel)');
  const short = { top: 324, bottom: 408, hardTop: 114, left: 0, right: 320 }; // 320x568 under a long info block: an 84 px band
  menuFit(out, short, 568, tan, 2, 4);
  const h = 4 * (568 / (2 * tan)) / out.dist, top = out.cy - h / 2, bottom = out.cy + h / 2;
  assert(Math.abs(h - 0.55 * 294) < 1e-6, `short band: still readable (${h.toFixed(0)} px, not 72)`);
  assert(bottom <= 408 && bottom > 400 && top > 114, 'standing on the band floor (the dock), clear of the pills');
  let prev = null; // shrink the band 1 px at a time: distance and centre move smoothly
  for (let t = 200; t <= 600; t++) {
    menuFit(out, { ...band, top: t }, vh, tan, 2, 4);
    if (prev) assert(Math.abs(out.cy - prev.cy) < 1.01 && Math.abs(out.dist - prev.dist) < 0.2, `continuous at top ${t}`);
    prev = { ...out };
  }
  assert.equal(menuFit(out, band, vh, tan, 2, 4), out, 'reuses its output object');
}
{ // envelope: quick to grow, slow to shrink, the same at any frame rate
  const follow = (fps, x, seconds, e0) => { let e = e0; for (let i = 0; i < fps * seconds; i++) e = envelope(e, x, 1 / fps, 0.35, 4); return e; };
  assert(follow(60, 2, 1, 1) > 1.9 && follow(60, 1, 1, 2) > 1.6, 'grows in a fraction of a second, shrinks over seconds');
  assert(Math.abs(follow(30, 2, 1, 1) - follow(120, 2, 1, 1)) < 1e-9 && Math.abs(follow(30, 1, 2, 2) - follow(144, 1, 2, 2)) < 1e-9, 'frame-rate independent');
  let e = 1; for (let i = 0; i < 600; i++) e = envelope(e, 1 + 0.4 * (Math.sin(i / 60 * 3) > 0), 1 / 60, 0.35, 4); // turning side on and back every second
  let lo = Infinity, hi = 0; for (let i = 600; i < 900; i++) { e = envelope(e, 1 + 0.4 * (Math.sin(i / 60 * 3) > 0), 1 / 60, 0.35, 4); lo = Math.min(lo, e); hi = Math.max(hi, e); }
  assert(lo > 1.28 && hi - lo < 0.1, `a figure turning back and forth keeps a steady size (${lo.toFixed(2)}-${hi.toFixed(2)})`);
}
console.log('menu fit ok');

// On the menus whoever stands right by a low lens shrinks away; farther off, or under a high lens, nobody changes size.
import { lensShrink, LENS_CLEAR } from '../src/scene/framing.js';
{
  const low = { x: 0, y: 4, z: 0 };
  assert.equal(lensShrink(null, 0.5, 0), 1, 'no lens (a song): nobody shrinks');
  assert.equal(lensShrink(low, 1, 1), 0, 'right by a low lens: gone');
  assert.equal(lensShrink(low, 8, 0), 1, 'a few metres off: their own size');
  const mid = lensShrink(low, 4.2, 0); assert(mid > 0 && mid < 1, 'in between: part way');
  assert.equal(lensShrink({ x: 0, y: LENS_CLEAR.high + 0.1, z: 0 }, 1, 1), 1, 'a high lens hides nobody');
}
console.log('lens clearance ok');
