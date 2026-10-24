// Contact geometry shared by the simulated ring and its final, eased drawing.
import * as THREE from 'three';

const staticContacts = new WeakMap(), contactMatrix = new THREE.Matrix4();
export const crowdRadius = p => p.rad * (p.fixed ? 1 : (p.qualityScale ?? 1) * (p.pres ?? 1));
// The backdrop and the mid band stand still: their contacts are read from the instance matrices only when those (or the
// mesh's own place, or its count) change, not every frame. One reused list is returned.
const contactList = [], NO_CONTACTS = [];
export function backdropContacts(groups) {
  contactList.length = 0;
  for (const group of groups) {
    if (!group?.mesh.visible) continue;
    const mesh = group.mesh, w = mesh.matrixWorld.elements;
    let cache = staticContacts.get(mesh);
    if (!cache || cache.version !== mesh.instanceMatrix.version || cache.count !== mesh.count || cache.world.some((v, k) => v !== w[k])) {
      cache ??= { list: [], all: [] };
      cache.version = mesh.instanceMatrix.version; cache.count = mesh.count; cache.world = [...w]; cache.list.length = 0;
      staticContacts.set(mesh, cache);
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, contactMatrix); contactMatrix.premultiply(mesh.matrixWorld);
        const m = contactMatrix.elements, scale = Math.hypot(m[0], m[1], m[2]);
        if (scale < .05) continue;
        const c = cache.all[i] ??= { pos: new THREE.Vector2(), rad: 0, fixed: true };
        c.pos.set(m[12], m[14]); c.rad = .33 * scale; cache.list.push(c);
      }
    }
    for (const c of cache.list) contactList.push(c);
  }
  return contactList;
}

// A simulation-space separation isn't enough after independent positional easing. Project the rendered envelopes too.
// Falling bodies use an extended, backwards-offset footprint instead of their upright circle.
// maxStep: the most a standing person is moved a frame; a deep overlap (a fall's wider footprint against a packed row)
// is undone over a few frames instead of a metres-long jump. A falling body may slide twice as fast: its footprint
// grows faster than a walk, and sliding while knocked down reads as part of the fall.
// Flat typed arrays and a hashed grid of linked lists (no objects, strings or arrays a frame). Bodies are visited in the
// same order as before (cells z then x, each cell's bodies by index), so the result is the same.
// people: the simulated ring (anyone shrunk to nothing is skipped); obstacles, more: fixed {pos, rad} contacts.
let sdX = new Float64Array(0), sdZ = sdX, sdR = sdX, sdOX = sdX, sdOZ = sdX, sdCX = new Int32Array(0), sdCZ = sdCX, sdNext = sdCX, sdFixed = new Uint8Array(0);
const sdHead = new Int32Array(1024), sdHash = sdHead.length - 1, sdDrawn = [];
const sdCell = (x, z) => ((x * 73856093) ^ (z * 19349663)) & sdHash;
export function settleDrawnCrowd(people, obstacles, maxStep = Infinity, more = NO_CONTACTS) {
  sdDrawn.length = 0;
  for (const p of people) if (p.g.scale.x > .05) sdDrawn.push(p);
  const n = sdDrawn.length, total = n + obstacles.length + more.length;
  if (sdX.length < total) {
    const size = Math.max(total, 2 * sdX.length);
    sdX = new Float64Array(size); sdZ = new Float64Array(size); sdR = new Float64Array(size); sdOX = new Float64Array(size); sdOZ = new Float64Array(size);
    sdCX = new Int32Array(size); sdCZ = new Int32Array(size); sdNext = new Int32Array(size); sdFixed = new Uint8Array(size);
  }
  let cellSize = 1;
  for (let i = 0; i < n; i++) {
    const p = sdDrawn[i], fall = p.fall || 0, shift = .65 * fall, sx = Math.sin(p.yaw) * shift, sz = Math.cos(p.yaw) * shift;
    sdX[i] = p.g.position.x - sx; sdZ[i] = p.g.position.z - sz; sdOX[i] = sx; sdOZ[i] = sz; sdFixed[i] = 0;
    sdR[i] = crowdRadius(p) + .4 * fall * (p.qualityScale ?? 1);
  }
  let k = n;
  for (const b of obstacles) { sdX[k] = b.pos.x; sdZ[k] = b.pos.y; sdR[k] = b.rad; sdFixed[k] = 1; k++; }
  for (const b of more) { sdX[k] = b.pos.x; sdZ[k] = b.pos.y; sdR[k] = b.rad; sdFixed[k] = 1; k++; }
  for (let i = 0; i < total; i++) cellSize = Math.max(cellSize, sdR[i] * 2);
  for (let pass = 0; pass < 4; pass++) {
    sdHead.fill(-1);
    for (let i = total - 1; i >= 0; i--) { // pushed at the head from the back: each cell lists its bodies by index
      const cx = sdCX[i] = Math.floor(sdX[i] / cellSize), cz = sdCZ[i] = Math.floor(sdZ[i] / cellSize), h = sdCell(cx, cz);
      sdNext[i] = sdHead[h]; sdHead[h] = i;
    }
    for (let i = 0; i < n; i++) {
      const cx = sdCX[i], cz = sdCZ[i];
      for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
        for (let j = sdHead[sdCell(x, z)]; j !== -1; j = sdNext[j]) {
          if (j <= i || sdCX[j] !== x || sdCZ[j] !== z) continue; // another cell sharing the hash bucket
          const moving = !sdFixed[j], min = sdR[i] + sdR[j];
          let dx = sdX[i] - sdX[j], dz = sdZ[i] - sdZ[j];
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2);
          if (d > 1e-6) { dx /= d; dz /= d; } else { dx = 1; dz = 0; }
          const push = (min - d) * (moving ? .5 : 1);
          sdX[i] += dx * push; sdZ[i] += dz * push;
          if (moving) { sdX[j] -= dx * push; sdZ[j] -= dz * push; }
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const p = sdDrawn[i];
    let dx = sdX[i] + sdOX[i] - p.g.position.x, dz = sdZ[i] + sdOZ[i] - p.g.position.z;
    const d = Math.hypot(dx, dz);
    const cap = maxStep * (1 + (p.fall || 0));
    if (d > cap) { dx *= cap / d; dz *= cap / d; }
    p.g.position.x = p.gx = p.g.position.x + dx; p.g.position.z = p.gz = p.g.position.z + dz;
  }
}
