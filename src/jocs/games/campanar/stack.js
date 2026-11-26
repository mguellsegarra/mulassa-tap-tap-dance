import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
// What makes the game Stack easy to hit, Tower's own feel since Marc chose it (his recording of Stack, 26 Nov 2026): a
// near-flat view (a long lens from far off: the slabs' edges line up as on a plan), the slab coming from farther away,
// a wider window for a perfect drop that snaps it into place, and Stack's own perfect: its rim, rings and notes.
// ?stack=0: the earlier feel, to compare
export const STACK_TRY = new URLSearchParams(location.search).get('stack') !== '0';
export const STACK_LENS = 0.1; // half the play camera's height in radians (the game's own: 0.4); ZOOM puts it as far
export const STACK_ZOOM = Math.tan(0.4) / Math.tan(STACK_LENS);
export const STACK_REACH = 2.6; // the slab's travel each side of the floor below, in sides (the game's: 1.4)
export const STACK_PERFECT = 0.08; // a perfect drop: this close, in sides (the game's: 0.035)

// Stack's perfect drop, read frame by frame from the recording (30 fps). All of it is flat white on the plane of the new
// slab's foot, so the slab hides the inside and only the rim shows: no flash on the slab, no shake.
// Lengths are in sides of the slab that landed (the mean of its two).
// Measured on the pixels (each white edge's place and its brightness over the face behind it), not by eye:
// - always: a band from the slab's edge to 0.05 sides out, there at once and still: white for 3 frames (0.1 s), then
//   fading fast and smoothly (0.66 at 0.2 s, 0.33 at 0.4 s, 0.11 at 0.7 s, gone by 1 s).
// - from the 4th perfect in a row: a ring 0.09 wide, over the band for those 3 frames, then leaving it, fast and
//   slowing (0.07 out at 0.13 s, 0.19 at 0.23 s, 0.39 at 0.5 s, never past ~0.45), a third as bright by 0.3 s: a quick pulse,
//   not a wave across the screen. From the 5th, a second thinner one 0.1 s behind (the most the recording shows).
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
const stackFade = t => Math.min(1, Math.exp(-(t - 0.1) / 0.29)); // the band's opacity, t seconds after the drop
export function stackPerfect(add, rect, y, streak) {
  const side = (rect.w + rect.d) / 2;
  stackBand(add, rect, y, t => t < 1.2 && [0, side * 0.05, stackFade(t)]);
  for (const [width, delay] of [[0.09, 0], [0.05, 0.1]].slice(0, Math.max(0, streak - 3))) stackBand(add, rect, y, t => {
    const k = t - 0.1 - delay, out = k > 0 ? side * 0.45 * (1 - Math.exp(-k / 0.2)) : 0;
    const a = k > 0 ? Math.exp(-k / 0.2) - 0.03 : stackFade(t); // sitting on the band till it leaves; a faint tail to 0.8 s
    return a > 0 && [out, out + side * width, a];
  });
}
