// Campanar's bells (bells.js): a bell keeps its proportions at every size, as tall as 0.795 of its mouth, the same scale on
// every axis, and the beam it hangs from only reaches along the wall: a slab's width never stretches the bell.
import assert from 'node:assert/strict';
import { Box3, BufferAttribute } from 'three';
import { chamberBell, BELL_H, BELL_YOKE } from '../../src/jocs/games/campanar/bells.js';

const bronzeBox = g => { // the bronze vertices only (the yoke, clapper and beam are other colours)
  const p = g.attributes.position, c = g.attributes.color, pts = [];
  for (let i = 0; i < p.count; i++) if (Math.abs(c.getX(i) - c.getZ(i)) > 0.3) pts.push(p.getX(i), p.getY(i), p.getZ(i));
  const b = new Box3();
  b.setFromBufferAttribute(new BufferAttribute(new Float32Array(pts), 3));
  return b;
};
for (const D of [0.37, 0.26, 0.19, 0.128]) for (const beam of [0.2, 0.6]) {
  const g = chamberBell(D, beam), b = bronzeBox(g), size = b.max.clone().sub(b.min);
  assert(Math.abs(size.x - D) < D * 0.02 && Math.abs(size.z - D) < D * 0.02, `D ${D}: the mouth D across, round`);
  assert(Math.abs(size.y - (BELL_H + 0.02) * D) < D * 0.06, `D ${D}: as tall as ${BELL_H} of its mouth`);
  assert(b.max.y <= 1e-6 && b.max.y > -0.05 * D, `D ${D}: hung by its crown at the origin`);
  const all = new Box3().setFromBufferAttribute(g.attributes.position);
  assert(all.max.x >= beam - 1e-6 && all.max.y <= BELL_YOKE * D + 1e-6, `D ${D}: the beam ${beam} each way, the yoke on top`);
  g.dispose();
}
console.log('campanar bells: one proportion at every size, never stretched by the beam ok');
