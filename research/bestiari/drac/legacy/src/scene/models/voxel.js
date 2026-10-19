// Voxel building blocks: the shared materials, the random helpers and the Vox box builder.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
// The skinned crowd gets its own copy: one material drawn by plain and skinned meshes makes three.js switch its
// program (and re-upload every uniform) twice a frame.
export const SKIN_MAT = MAT.clone();
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[(Math.random() * a.length) | 0];
// Collects boxes into one merged, vertex-coloured mesh (one draw call per part).
// box() takes the BOTTOM y, which is how you think when stacking voxels.
export class Vox {
  constructor() { this.g = []; }
  box(x, y, z, w, h, d, color, jitter = 0.04) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y + h / 2, z);
    return this.add(g, color, jitter);
  }
  // Only the face looking along (nx, nz): 4 vertices instead of a box's 24, for thin things seen from one side
  // (flags on the façades, always seen from the plaça).
  plate(x, y, z, w, h, nx, nz, color) {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(Math.atan2(nx, nz));
    g.translate(x, y + h / 2, z);
    return this.add(g, color, 0);
  }
  add(g, color, jitter) {
    const c = new THREE.Color(color).multiplyScalar(1 + rnd(-jitter, jitter));
    const a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  mesh() {
    const m = new THREE.Mesh(mergeGeometries(this.g), MAT);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}
