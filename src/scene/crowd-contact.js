// Contact geometry shared by the simulated ring and its final, eased drawing.
import * as THREE from 'three';

const staticContacts = new WeakMap(), contactMatrix = new THREE.Matrix4();
export const crowdRadius = p => p.rad * (p.fixed ? 1 : (p.qualityScale ?? 1) * (p.pres ?? 1));
export function backdropContacts(groups) {
  const result = [];
  for (const group of groups) {
    if (!group?.mesh.visible) continue;
    const mesh = group.mesh;
    let contacts = staticContacts.get(mesh);
    if (!contacts) { contacts = []; staticContacts.set(mesh, contacts); }
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, contactMatrix); contactMatrix.premultiply(mesh.matrixWorld);
      const m = contactMatrix.elements, scale = Math.hypot(m[0], m[1], m[2]);
      if (scale < .05) continue;
      const c = contacts[i] ??= { pos: new THREE.Vector2(), rad: 0, fixed: true };
      c.pos.set(m[12], m[14]); c.rad = .33 * scale; result.push(c);
    }
  }
  return result;
}

// A simulation-space separation isn't enough after independent positional easing. Project the rendered envelopes too.
// Falling bodies use an extended, backwards-offset footprint instead of their upright circle.
export function settleDrawnCrowd(people, obstacles) {
  const contacts = people.map(p => {
    const fall = p.fall || 0, shift = .65 * fall;
    return { p, x: p.g.position.x - Math.sin(p.yaw) * shift, z: p.g.position.z - Math.cos(p.yaw) * shift,
      rad: crowdRadius(p) + .4 * fall * (p.qualityScale ?? 1), ox: Math.sin(p.yaw) * shift, oz: Math.cos(p.yaw) * shift };
  });
  const all = [...contacts, ...obstacles.map(b => ({ x: b.pos.x, z: b.pos.y, rad: b.rad, fixed: true }))];
  const cellSize = Math.max(1, ...all.map(b => b.rad * 2)), cells = new Map();
  for (let pass = 0; pass < 4; pass++) {
    cells.clear();
    all.forEach((b, i) => {
      const key = `${Math.floor(b.x / cellSize)},${Math.floor(b.z / cellSize)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(i);
    });
    for (let i = 0; i < contacts.length; i++) {
      const a = contacts[i], cx = Math.floor(a.x / cellSize), cz = Math.floor(a.z / cellSize);
      for (let z = cz - 1; z <= cz + 1; z++) for (let x = cx - 1; x <= cx + 1; x++) {
        for (const j of cells.get(`${x},${z}`) ?? []) {
          if (j <= i) continue;
          const b = all[j], moving = !b.fixed, min = a.rad + b.rad;
          let dx = a.x - b.x, dz = a.z - b.z;
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2);
          if (d > 1e-6) { dx /= d; dz /= d; } else { dx = 1; dz = 0; }
          const push = (min - d) * (moving ? .5 : 1);
          a.x += dx * push; a.z += dz * push;
          if (moving) { b.x -= dx * push; b.z -= dz * push; }
        }
      }
    }
  }
  for (const c of contacts) {
    const p = c.p;
    p.g.position.x = p.gx = c.x + c.ox; p.g.position.z = p.gz = c.z + c.oz;
  }
}
