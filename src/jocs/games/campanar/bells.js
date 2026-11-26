// The bell chamber's bells (Fable's study, B): a Catalan bell turned on a lathe, its clapper showing under the lip, on a
// wooden yoke, and the iron beam it swings on. Fixed proportions (as tall as 0.8 of its mouth), one size per set and the
// same scale on every axis: a slab's width or height never stretches it. Positions, normals and colours, for the lit
// pool of openings.js.
import { LatheGeometry, CylinderGeometry, BoxGeometry, Color, Vector2, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BRONZE = new Color('#d09a3a'), WOOD = new Color('#8a5630'), IRON = new Color('#4a3524');
// the profile for a mouth 1 across: (radius, height) from the lip up to the crown
const PROFILE = [[0.5, 0], [0.497, 0.035], [0.43, 0.085], [0.365, 0.17], [0.315, 0.29], [0.287, 0.42], [0.273, 0.55],
  [0.268, 0.64], [0.24, 0.71], [0.17, 0.765], [0.07, 0.79], [0, 0.795]].map(([r, y]) => new Vector2(r, y));
export const BELL_H = 0.795, BELL_YOKE = 0.36; // its height and its yoke's, for a mouth 1 across

// one colour on every vertex, unindexed and without UVs, as the pool takes it
function painted(g, k) {
  const n = g.toNonIndexed(), c = [];
  g.dispose();
  n.deleteAttribute('uv');
  for (let i = 0; i < n.attributes.position.count; i++) c.push(k.r, k.g, k.b);
  return n.setAttribute('color', new Float32BufferAttribute(c, 3));
}

// a bell D across the mouth hung by its crown at the origin, in a wall's frame (x along it, y up, z out of it); the yoke
// sits on the crown, the beam runs through the yoke along the wall, `beam` each way
export function chamberBell(D, beam) {
  const yoke = { w: 1.12 * D, h: BELL_YOKE * D, d: 0.24 * D }, lip = -BELL_H * D, iron = 0.07 * D;
  return mergeGeometries([
    painted(new LatheGeometry(PROFILE, 20).scale(D, D, D).translate(0, lip, 0), BRONZE),
    painted(new CylinderGeometry(0.035 * D, 0.075 * D, 0.2 * D, 8).translate(0, lip + 0.02 * D, 0), IRON),
    painted(new BoxGeometry(yoke.w, yoke.h, yoke.d).translate(0, yoke.h / 2, 0), WOOD),
    painted(new BoxGeometry(2 * beam, iron, iron).translate(0, yoke.h / 2, 0), IRON),
  ]);
}
