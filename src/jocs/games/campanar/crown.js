// Sant Joan's octagonal tiled roof, its small bronze cage with the gold bell and cross, and stone pinnacles.
import { Mesh, CylinderGeometry, Group, MeshLambertMaterial, Vector3, BufferGeometry, Float32BufferAttribute,
  Quaternion } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SIZE, FLOOR } from './rules.js';
import { box, scales } from './stone.js';
import { hipWeathering, copedPinnacles, ribbedSpire, scaleStoneMat, isSharedCoping } from './coping.js';

// the iron in the Plaça del Blat's warm palette: a dark bronze, not black
const iron = new MeshLambertMaterial({ color: '#8a5a35' }), gold = new MeshLambertMaterial({ color: '#d9a640' });
// Sant Joan's truncated octagon, lookout and eight ribs meeting at a point, on the tower's top floor (a wide bell
// chamber's parapet or a stone needle's last floor), its size taken from that floor's width; on a thin needle it keeps
// a spire's height and a cross that read from afar.
// The iron is a small cage at the top (Fable's R1): warm bronze, the hours bell gold inside it, a gold cross on top.
export function buildCampanarHead(base, y) {
  const g = new Group();
  g.position.y = y;
  const height = Math.max(Math.min(base.w, base.d) * 1.15, SIZE * 0.5), shoulder = 0.60;
  const metalScale = Math.max(Math.min(base.w, base.d, height), SIZE * 0.3);
  const bar = metalScale * 0.032;
  const ring = (t, span) => { // an octagon on the parapet's axis at height t, span its share of the foot's
    const w = Math.min(base.w * 0.76 * span, base.w * 0.94), d = Math.min(base.d * 0.76 * span, base.d * 0.94);
    return Array.from({ length: 8 }, (_, j) => {
      const angle = (j + 0.5) * Math.PI / 4;
      return new Vector3(base.x + Math.cos(angle) * w / 2, t * height, base.z + Math.sin(angle) * d / 2);
    });
  };
  const vertices = [], uvs = [], metal = [], up = new Vector3(0, 1, 0);
  const rod = (from, to, width = bar) => {
    const delta = to.clone().sub(from), mid = from.clone().lerp(to, 0.5);
    const segment = box.clone().scale(width, delta.length() + width * 0.25, width);
    segment.applyQuaternion(new Quaternion().setFromUnitVectors(up, delta.normalize()));
    metal.push(segment.translate(mid.x, mid.y, mid.z));
  };
  const levels = [0, shoulder]; // the roof up to the springing of the iron arches
  let lower = ring(0, 1);
  for (const t of levels.slice(1)) {
    const upper = ring(t, 1 - 0.58 * t / shoulder);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      for (const [v, u] of [[lower[i], i], [upper[i], i], [lower[j], i + 1],
        [lower[j], i + 1], [upper[i], i], [upper[j], i + 1]]) {
        vertices.push(v.x, v.y, v.z);
        uvs.push(u / 8, v.y / (shoulder * height));
      }
    }
    lower = upper;
  }
  const roof = new BufferGeometry();
  roof.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  roof.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  roof.computeVertexNormals();
  g.add(new Mesh(roof, new MeshLambertMaterial({ map: scales() })));
  const terrace = lower.reduce((c, v) => c.add(v), new Vector3()).multiplyScalar(1 / 8);
  const deck = [];
  for (let i = 0; i < 8; i++) {
    rod(lower[i], lower[(i + 1) % 8]);
    for (const v of [terrace, lower[(i + 1) % 8], lower[i]]) deck.push(v.x, v.y, v.z);
  }
  const platform = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(deck, 3));
  platform.computeVertexNormals();
  g.add(new Mesh(platform, iron));
  const arch = Array.from({ length: 6 }, (_, i) => shoulder + (1 - shoulder) * (i + 1) / 6);
  for (const t of arch) {
    const u = (t - shoulder) / (1 - shoulder);
    const upper = ring(t, 0.42 * (1 - u * u));
    for (let i = 0; i < 8; i++) rod(lower[i], upper[i]);
    lower = upper;
  }

  // the hours bell, gold, hanging in the cage over the terrace
  const bell = new Mesh(new CylinderGeometry(metalScale * 0.05, metalScale * 0.09, metalScale * 0.12, 8), gold);
  bell.position.set(terrace.x, terrace.y + height * (1 - shoulder) * 0.35, terrace.z);
  g.add(bell);
  const finial = Math.max(metalScale * 0.17, SIZE * 0.16), thick = Math.max(bar, SIZE * 0.014); // the cross reads from afar
  const at = (x, h) => new Vector3(base.x + x, height + h, base.z);
  g.add(new Mesh(mergeGeometries(metal), iron));
  metal.length = 0; // the cross on its own, in gold
  rod(at(0, 0), at(0, finial), thick);
  rod(at(-finial * 0.3, finial * 0.62), at(finial * 0.3, finial * 0.62), thick);
  g.add(new Mesh(mergeGeometries(metal), gold));
  return g;
}
// over a bell chamber whose floors above ran too thin for bells: an octagonal stone spire centred on the parapet `base`
// at y, as tall as those floors (h): the campanar as tall as the player built it, never lower. A moulded ring every
// three floors, then a small bronze cage with the gold bell and the gold cross. Never shorter than a spire reads.
// → the group, and the square it stands on (for its weathering)
export const spireHeight = (base, h) => Math.max(h, Math.min(base.w, base.d) * 1.2);
export function makeStoneSpire(base, y, h) {
  const g = new Group(), r0 = Math.min(base.w, base.d) * 0.3, H = spireHeight(base, h), cage = H - Math.min(H * 0.2, r0 * 1.8);
  g.position.set(base.x, y, base.z);
  const radius = t => r0 * (1 - t / H); // the cone's radius at height t
  const oct = (rt, rb, ht, at) => new CylinderGeometry(rt, rb, ht, 8).rotateY(Math.PI / 8).translate(0, at + ht / 2, 0);
  const stone = [oct(radius(cage), r0, cage, 0)], ring = FLOOR * 0.16;
  for (let t = 3 * FLOOR; t < cage - FLOOR; t += 3 * FLOOR) stone.push(oct(radius(t) * 1.16, radius(t) * 1.16, ring, t - ring / 2));
  stone.push(oct(radius(cage) * 1.25, radius(cage) * 1.25, ring, cage - ring)); // the cage's ledge
  g.add(new Mesh(ribbedSpire(mergeGeometries(stone), r0, H, cage), scaleStoneMat())); // fish-scale stone, a rib up each arris
  const metal = [], up = new Vector3(0, 1, 0), bar = Math.max(r0 * 0.05, SIZE * 0.008);
  const rod = (from, to, w = bar) => {
    const d = to.clone().sub(from), mid = from.clone().lerp(to, 0.5);
    metal.push(box.clone().scale(w, d.length() + w * 0.25, w).applyQuaternion(new Quaternion().setFromUnitVectors(up, d.normalize())).translate(mid.x, mid.y, mid.z));
  };
  const rc = radius(cage), tip = new Vector3(0, H, 0);
  for (let k = 0; k < 8; k++) { // the cage's ribs, bowed out a little on their way up
    const a = (k + 0.5) * Math.PI / 4, foot = new Vector3(Math.cos(a) * rc, cage, Math.sin(a) * rc);
    const knee = new Vector3(Math.cos(a) * rc * 1.15, cage + (H - cage) * 0.45, Math.sin(a) * rc * 1.15);
    rod(foot, knee);
    rod(knee, tip);
  }
  g.add(new Mesh(mergeGeometries(metal), iron));
  const bell = new Mesh(new CylinderGeometry(rc * 0.35, rc * 0.6, (H - cage) * 0.3, 8), gold);
  bell.position.y = cage + (H - cage) * 0.3;
  metal.length = 0;
  const cross = Math.max(r0 * 0.9, SIZE * 0.16), thick = Math.max(bar * 1.4, SIZE * 0.014);
  rod(tip, new Vector3(0, H + cross, 0), thick);
  rod(new Vector3(-cross * 0.3, H + cross * 0.62, 0), new Vector3(cross * 0.3, H + cross * 0.62, 0), thick);
  g.add(bell, new Mesh(mergeGeometries(metal), gold));
  return { g, foot: { x: base.x, z: base.z, w: r0 * 2, d: r0 * 2 } };
}
// a stone weathering where the floor above leaves a floor's top bare, so no ledge holds water (coping.js)
export const makeWeathering = hipWeathering;
// the bell chamber's pinnacles, grown from the parapet at y (coping.js)
export function makePinnacles(r, y) {
  const g = copedPinnacles(r, 0);
  g.position.y = y;
  return g;
}

// The stone box and the iron and gold materials are shared between runs; everything else here belongs to one crown.
export function disposeCampanarOrnaments(group) {
  const materials = new Set();
  group.traverse(m => {
    if (!m.isMesh) return;
    if (m.geometry !== box) m.geometry.dispose();
    if (m.material !== iron && m.material !== gold && !isSharedCoping(m.material)) materials.add(m.material);
  });
  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
}
