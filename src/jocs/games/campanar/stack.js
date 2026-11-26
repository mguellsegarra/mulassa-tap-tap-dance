import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
// ?stack: a trial of what makes the game Stack easy to hit, to compare against the game as it is (Marc's recording of
// Stack, 26 Nov 2026): a near-flat view (a long lens from far off: the slabs' edges line up as on a plan), the slab
// coming from farther away, a wider window for a perfect drop that snaps it into place, and a stronger flash on one.
export const STACK_TRY = new URLSearchParams(location.search).has('stack');
export const STACK_LENS = 0.1; // half the play camera's height in radians (the game's own: 0.4); ZOOM puts it as far
export const STACK_ZOOM = Math.tan(0.4) / Math.tan(STACK_LENS);
export const STACK_REACH = 2.6; // the slab's travel each side of the floor below, in sides (the game's: 1.4)
export const STACK_PERFECT = 0.08; // a perfect drop: this close, in sides (the game's: 0.035)

// Stack's perfect drop, read frame by frame from the recording (30 fps). All of it is flat white on the plane of the new
// slab's foot, so the slab hides the inside and only the rim shows: no flash on the slab, no shake.
// Lengths are in sides of the slab that landed (the mean of its two).
// - always: a band from the slab's edge to 0.055 sides out, there at once and still: white for 4 frames, down to half in
//   2 more, then a slow fade over 1.2 s (the last perfects' bands are still faintly there floors below).
// - from the 4th perfect in a row: the band starts over twice as wide for those 4 frames, then a ring leaves it and
//   widens (fast, slowing: half a side out in 0.17 s, a whole one in 0.57 s) while it fades from 0.8 in 1.3 s. One more
//   ring for each perfect after that, right behind the one before.
// add(mesh, tick): the scene's effect list (tick(t) → false when done, the mesh then removed)
const stackQuads = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
// a flat frame round the slab; at(t) → [inner, outer, opacity], how far out of the slab's edges, or null when done
function stackBand(add, rect, y, at) {
  const geo = new BufferGeometry().setIndex(stackQuads).setAttribute('position', new BufferAttribute(new Float32Array(24), 3));
  const m = new Mesh(geo, new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
  m.position.set(rect.x, y + 0.003, rect.z);
  m.frustumCulled = false; // its corners move every frame
  add(m, t => {
    const s = at(t);
    if (!s) return geo.dispose(), false;
    for (let i = 0; i < 8; i++) {
      const out = s[i >> 2], c = i & 3;
      geo.attributes.position.setXYZ(i, (c === 1 || c === 2 ? 1 : -1) * (rect.w / 2 + out), 0, (c > 1 ? 1 : -1) * (rect.d / 2 + out));
    }
    geo.attributes.position.needsUpdate = true;
    m.material.opacity = s[2];
    return true;
  });
}
export function stackPerfect(add, rect, y, streak) {
  const rings = Math.min(Math.max(0, streak - 3), 4), side = (rect.w + rect.d) / 2;
  stackBand(add, rect, y, t => t < 1.4 && [0, side * 0.055 * (rings && t < 0.13 ? 2.2 : 1), t < 0.13 ? 1 : t < 0.2 ? 1 - (t - 0.13) / 0.14 : 0.5 * (1 - (t - 0.2) / 1.2)]);
  for (let i = 0; i < rings; i++) stackBand(add, rect, y, t => {
    const k = t - 0.13 - i * 0.05, out = side * (0.1 + 1.3 * (1 - Math.exp(-k / 0.45)));
    return k < 1.3 && (k < 0 ? [0, 0, 0] : [out, out + side * 0.08, 0.8 * (1 - k / 1.3)]);
  });
}
