// Free play's live steps (liveBouFeet): no shoe is left behind the driven body. Landing just under it and waiting for
// the other pair, they trailed 0.56 m at a trot, 1.6 m at a gallop and 2 m galloping round a turn (a spider's legs).
import assert from 'node:assert/strict';
import { liveBouFeet } from '../../../src/figures/bou/bou-feet.js';

const L = [-.66, .66].flatMap(z => [-.13, .13].map(x => ({ x, z }))), H = 60, seen = {};
// [name, m/s, rad/s]: photo-control.js's trot and run, a driven turn, the half turn on the spot
for (const [name, v, w] of [['slow', .8, 0], ['trot', 3.2, 0], ['run', 9, 0], ['trot turning', 3.2, 3], ['run turning', 9, 3], ['spin', 0, 8]]) {
  const step = liveBouFeet(), out = [{}, {}, {}, {}], p = { x: 0, z: 0, yaw: 0 };
  let worst = 0;
  for (let k = 0; k < 10 * H; k++) {
    p.yaw += w / H; const vx = Math.sin(p.yaw) * v, vz = Math.cos(p.yaw) * v; p.x += vx / H; p.z += vz / H;
    step(k / H, p, vx, vz, () => 0, out);
    out.forEach((f, i) => { const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
      worst = Math.max(worst, Math.hypot(f.x - (p.x + L[i].x * c + L[i].z * s), f.z - (p.z - L[i].x * s + L[i].z * c))); });
  }
  seen[name] = +worst.toFixed(2);
  assert.ok(worst < .36, `${name}: a shoe ${worst.toFixed(2)} m from its place under the Bou`);
}
console.log('Bou live feet ok:', seen);
