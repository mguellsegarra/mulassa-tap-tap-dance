// The representation's palettes and voxel kit (people.js's Vox, seeded, with a box log), shared by models.js and props.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { correctSkinNormals } from './normals.js';

// ---------------------------------------------------------------- palettes
// The game's five tones first (people.js SKIN), then two deeper ones the plaça lacks. A list of colours, not an
// ordering or a mapping from any origin: every tone may take every other dimension.
export const SKIN = ['#f1c9a5', '#e0ac85', '#c68d63', '#8d5a3b', '#f6d7bd', '#6f4630', '#4f3020'];
// people.js HAIR + a silver/white. Grey or white is a colour any age may have.
export const HAIR = ['#2b1d14', '#15110f', '#6b4423', '#c9a45c', '#8c8c8c', '#a0522d', '#d9d6cf'];
export const BUILDS = { prim: [0.88, 0.92], mitja: [1, 1], ample: [1.18, 1.26] }; // [width, depth] of the torso
export const AGES = { infant: { k: 0.7, head: 1.14, stoop: 0 }, jove: { k: 1, head: 1, stoop: 0 }, adult: { k: 1, head: 1, stoop: 0 }, gran: { k: 0.97, head: 1, stoop: 0 } };
export const INK = '#1a1412', SHINE = '#f4efe6', SHOE = '#141414';
export const EYE_COLOURS = [INK, SHINE]; // only the eyes use them (drac-soot.js turns them white on a charred face)
export const COLOURS = { tyre: '#1e1e22', rim: '#b8bcc4', seat: '#2a2d33', grip: '#1c1c1c' };
export const CANE = { white: '#f2f2ee', grip: '#1c1c1c', tip: '#3a3a3a' };

// ---------------------------------------------------------------- voxel kit (people.js's Vox, seeded, with a box log)
let seed = 1;
export const reseed = s => { seed = s; };
export const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const MAT = correctSkinNormals(new THREE.MeshLambertMaterial({ vertexColors: true }));
export class Vox {
  constructor() { this.g = []; this.boxes = []; } // boxes: axis-aligned bounds, for the coplanar-face check
  box(x, y, z, w, h, d, color, jitter = 0.04) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    this.boxes.push([x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, color]);
    return this.add(g, color, jitter);
  }
  // a w×d bar from a to b ([x, y, z]), turned the shortest way from +y: tubes, the cane
  bar(a, b, w, color) {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = dir.length();
    const g = new THREE.BoxGeometry(w, len, w).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(...a);
    return this.add(g, color, 0);
  }
  add(g, color, jitter) {
    const c = new THREE.Color(color).multiplyScalar(1 + (rand() * 2 - 1) * jitter);
    const a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  // another Vox scaled by s about its origin and moved by (x, y, z): the head, built at its own origin
  take(o, s, x, y, z) {
    for (const g of o.g) this.g.push(g.scale(s, s, s).translate(x, y, z));
    for (const b of o.boxes) this.boxes.push([b[0] * s + x, b[1] * s + x, b[2] * s + y, b[3] * s + y, b[4] * s + z, b[5] * s + z, b[6]]);
    return this;
  }
  mesh() {
    const m = new THREE.Mesh(mergeGeometries(this.g), MAT);
    this.g.forEach(g => g.dispose());
    m.castShadow = m.receiveShadow = true;
    m.userData.boxes = this.boxes;
    return m;
  }
}
