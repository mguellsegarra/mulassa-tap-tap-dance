// A perfect drop's mark on the new top: the game's own, a sheet of the floor's colour that swells out from it and fades,
// wider the longer the run of perfects; with ?stack, Stack's white rim and rings (stack.js).
// add(mesh, tick): the scene's effect list (tick(t) → false when done, the mesh then removed and disposed)
import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { FLOOR } from './rules.js';
import { STACK_TRY, stackPerfect } from './stack.js';

const perfectSheet = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

// color: the floor's; rect: the new top's plan; y: its top's height; streak: perfects in a row
export function perfectEffect(add, color, rect, y, streak) {
  if (STACK_TRY) return stackPerfect(add, rect, y - FLOOR, streak);
  const m = new Mesh(perfectSheet, new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
  m.position.set(rect.x, y + 0.002, rect.z);
  const grow = 1.5 + 0.08 * Math.min(streak - 1, 6);
  add(m, t => {
    const k = Math.min(1, t / 0.6), s = 1 + (grow - 1) * (1 - (1 - k) ** 2);
    m.scale.set(rect.w * s, 1, rect.d * s);
    m.material.opacity = 0.9 * (1 - k);
    return k < 1;
  });
}

// A perfect drop settling into place from the slab's own speed: a critically damped spring, no jump back. The spring's
// rate (1/s), the share of the speed it keeps (more overshoots), when it is done; PERFECT_MARK: when its mark and the
// floors' turn to stone show (s, the slab nearly still by then)
const SETTLE_W = 15, SETTLE_KEEP = 0.3, SETTLE_S = 0.4;
export const PERFECT_MARK = 0.22;
// m: the slab, already at rect; from: where it was dropped along axis; v: its speed → the effect's tick, or null when
// it fell right in place
export function perfectSettle(m, rect, axis, from, v) {
  const x0 = from - rect[axis];
  if (!x0) return null;
  m.position[axis] = from;
  return t => {
    m.position[axis] = rect[axis] + (x0 + (v * SETTLE_KEEP + SETTLE_W * x0) * t) * Math.exp(-SETTLE_W * t);
    return t < SETTLE_S || (m.position[axis] = rect[axis], false);
  };
}
