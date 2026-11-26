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
