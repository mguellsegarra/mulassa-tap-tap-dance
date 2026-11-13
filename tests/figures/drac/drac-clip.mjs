// The Drac's music video (src/figures/drac/drac-clip.js): every cut on a bar where it sets off or stops, never into a
// picture like the last one (its size on the screen 1.4x or the side 0.5 rad apart: the owner, «canvis de plans molt
// iguals i queda molt malament»), the same camera for the same move, its heads only while it stands, a lens that follows
// its path and never bobs, and on a phone a low lens near it (looking down from over the heads, half the screen was tiles).
import assert from 'node:assert/strict';
import { DRAC_CLIP_CUTS as CUTS, DRAC_CLIP_SHOTS as SHOTS, DRAC_CLIP_END as CLIP_END, dracClipSec as secAt, placeDracClip as placeClip } from '../../../src/figures/drac/drac-clip.js';
import { rootAt } from '../../../src/figures/drac/drac-path.js';
import { dracTime } from '../../../src/figures/drac/drac-time.js';
import { danceToWorld, danceYaw } from '../../../src/figures/drac/drac-layout.js';
import { DRAC_SCALE } from '../../../src/figures/drac/drac.js';

const YAW = danceYaw(-81 * Math.PI / 180), root = {}, at = {};
const where = b => { rootAt(root, dracTime.refAt(secAt(b))); return danceToWorld(at, root.x * DRAC_SCALE, root.z * DRAC_SCALE, YAW); }; // its root on the plaça (m)
CUTS.forEach(([b, kind], i) => {
  const next = CUTS[i + 1]?.[0] ?? CLIP_END;
  assert.ok(SHOTS[kind], `${kind} is a shot`);
  assert.equal(b % 2, 0, `the cut at ${b} is on a bar's downbeat`);
  assert.ok(next - b >= 8, `the shot at ${b} lasts four bars or more`);
  assert.notEqual(kind, CUTS[i + 1]?.[1], `no cut into the same shot at ${next}`);
});
const kinds = at => CUTS.filter(c => at.includes(c[0])).map(c => c[1]);
assert.deepEqual([kinds([42, 128]), kinds([56, 146]), kinds([70, 162])], [['crane', 'crane'], ['spot', 'spot'], ['charge', 'charge']], 'the same camera for the same move: both turns, both torsions, both arcs');
for (const [b, kind] of CUTS) if (SHOTS[kind].ahead) { // its heads: only while its root stands (it sets off in the shot's last bar, the lens with it)
  const p0 = { ...where(b + 1) };
  for (let x = b + 1; x <= b + 6; x += 0.5) { const p = where(x); assert.ok(Math.hypot(p.x - p0.x, p.z - p0.z) < 0.3, `its heads at ${b}: it stands (moved at ${x})`); }
}

const cam = aspect => ({ aspect, fov: 0, position: { set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, up: { set() {} }, lookAt(x, y, z) { this.at = [x, y, z]; }, clearViewOffset() {}, updateProjectionMatrix() {} });
// how tall it stands on the screen (a share of the frame, up to a constant) and the side it is seen from (rad)
function seen(c, b) {
  const p = where(b), dx = c.position.x - p.x, dz = c.position.z - p.z;
  return { size: 1 / (Math.hypot(dx, c.position.y - 1.5, dz) * Math.tan(c.fov * Math.PI / 360)), az: Math.atan2(dx, dz) };
}
for (const [name, aspect] of [['a phone', 360 / 800], ['a short phone', 320 / 568], ['a tablet', 1024 / 768], ['a desktop', 16 / 9]]) {
  const c = cam(aspect);
  let prev = null, last = null;
  for (let b = 0; b < CLIP_END - 0.05; b += 1 / 30) { // 60 samples a second at the song's ~2 beats a second
    const i = placeClip(c, b, YAW), p = c.position, d = [c.at[0] - p.x, c.at[1] - p.y, c.at[2] - p.z], l = Math.hypot(...d), u = d.map(v => v / l), now = seen(c, b);
    if (prev?.i === i) {
      const turn = Math.acos(Math.min(1, u[0] * prev.u[0] + u[1] * prev.u[1] + u[2] * prev.u[2])) * 60, rise = Math.abs(p.y - prev.y) * 60;
      assert.ok(turn <= 0.3, `${name}, beat ${b.toFixed(1)}: the view turns slowly (${turn.toFixed(2)} rad/s)`);
      assert.ok(rise <= 1.5, `${name}, beat ${b.toFixed(1)}: the lens does not bob (${rise.toFixed(2)} m/s)`);
    } else if (prev) {
      const ratio = Math.max(now.size / last.size, last.size / now.size), side = Math.abs(Math.atan2(Math.sin(now.az - last.az), Math.cos(now.az - last.az)));
      assert.ok(ratio >= 1.4 || side >= 0.5, `${name}: the cut at ${CUTS[i][0]} (${CUTS[i - 1][1]} to ${CUTS[i][1]}) changes the picture (its size x${ratio.toFixed(2)}, the side ${side.toFixed(2)} rad)`);
    }
    prev = { i, u, y: p.y }; last = now;
  }
}
// on a phone the shots that go with it stand near and low: the lens no higher than its heads' height and a half, so the
// tiles are what it dances on, not half the picture
{ const c = cam(360 / 800);
  for (const [b, kind] of CUTS) if (['left', 'right', 'spot'].includes(kind)) { placeClip(c, b + 4, YAW); assert.ok(c.position.y <= 4.4, `a phone, ${kind} at ${b}: a low lens (${c.position.y.toFixed(1)} m up)`); } }
console.log('drac-clip ok');
