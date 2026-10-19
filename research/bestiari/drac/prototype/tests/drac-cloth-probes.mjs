// Geometry probes for the preview's bent cloth. They read the rendered mesh's vertex buffer, not its centreline or
// obsolete straight-box metadata. Raised camouflage is excluded from the closed main-cloth volume.
import * as THREE from 'three';

const A = new THREE.Vector3(), B = new THREE.Vector3(), P = new THREE.Vector3();
const ray = new THREE.Ray(), tri = new THREE.Triangle();
const near = (a, b) => Math.abs(a - b) < 2e-6;
const boundsApart = (a, b) => a.max.x < b.min.x || b.max.x < a.min.x || a.max.y < b.min.y || b.max.y < a.min.y || a.max.z < b.min.z || b.max.z < a.min.z;

function coplanarOverlap(a, b, hem) {
  const u = a.p[0], v = a.p[1], w = a.p[2];
  const ax = v.x - u.x, ay = v.y - u.y, az = v.z - u.z, bx = w.x - u.x, by = w.y - u.y, bz = w.z - u.z;
  const n = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx], len = Math.hypot(...n);
  if (len < 1e-12 || b.p.some(p => Math.abs(n[0] * (p.x - u.x) + n[1] * (p.y - u.y) + n[2] * (p.z - u.z)) > len * 1e-8)) return false;
  const drop = n.reduce((best, x, i) => Math.abs(x) > Math.abs(n[best]) ? i : best, 0), axes = [0, 1, 2].filter(i => i !== drop);
  const project = p => [p.getComponent(axes[0]), p.getComponent(axes[1]), p.y];
  const q = b.p.map(project), sign = Math.sign((q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]));
  if (!sign) return false;
  let poly = a.p.map(project);
  const cut = distance => {
    const next = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], r = poly[(i + 1) % poly.length], dp = distance(p), dr = distance(r);
      if (dp >= 0) next.push(p);
      if ((dp >= 0) !== (dr >= 0)) { const k = dp / (dp - dr); next.push(p.map((x, j) => x + (r[j] - x) * k)); }
    }
    poly = next;
  };
  for (let i = 0; i < 3 && poly.length; i++) {
    const p = q[i], r = q[(i + 1) % 3];
    cut(x => sign * ((r[0] - p[0]) * (x[1] - p[1]) - (r[1] - p[1]) * (x[0] - p[0])));
  }
  if (Number.isFinite(hem)) cut(p => hem - 1e-6 - p[2]);
  let area = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], r = poly[(i + 1) % poly.length]; area += p[0] * r[1] - p[1] * r[0]; }
  return Math.abs(area) > 1e-10;
}

function surfaceProbe(mesh, indices, caps) {
  const triangles = indices.map(idx => ({ idx, p: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], box: new THREE.Box3() }));
  const box = new THREE.Box3();
  const probe = {
    triangles, caps, box,
    update() {
      const a = mesh.geometry.attributes.position, m = mesh.matrixWorld;
      box.makeEmpty();
      for (const t of triangles) {
        for (let j = 0; j < 3; j++) t.p[j].fromBufferAttribute(a, t.idx[j]).applyMatrix4(m);
        t.box.makeEmpty(); for (const p of t.p) t.box.expandByPoint(p);
        box.union(t.box);
      }
      for (const name of ['top', 'cuff']) for (const c of caps[name]) c.p.fromBufferAttribute(a, c.i).applyMatrix4(m);
      return probe;
    },
    // Euclidean distance outside the closed main fabric. An interior/boundary point has distance zero.
    outside(point) {
      // Signed solid angle classifies a closed triangle skin without ray-edge hit merging. Grazing rays through the
      // bent collar crossed adjacent triangles 1e-7 apart, so their deduplication could incorrectly invert parity.
      let angle = 0;
      for (const t of triangles) {
        const a = t.p[0], b = t.p[1], c = t.p[2];
        const ax = a.x - point.x, ay = a.y - point.y, az = a.z - point.z;
        const bx = b.x - point.x, by = b.y - point.y, bz = b.z - point.z;
        const cx = c.x - point.x, cy = c.y - point.y, cz = c.z - point.z;
        const al = Math.hypot(ax, ay, az), bl = Math.hypot(bx, by, bz), cl = Math.hypot(cx, cy, cz);
        const det = ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
        const den = al * bl * cl + (ax * bx + ay * by + az * bz) * cl + (bx * cx + by * cy + bz * cz) * al + (cx * ax + cy * ay + cz * az) * bl;
        angle += 2 * Math.atan2(det, den);
      }
      if (Math.abs(angle) > 2 * Math.PI) return 0;
      let distance = Infinity;
      for (const t of triangles) { tri.set(...t.p); tri.closestPointToPoint(point, P); distance = Math.min(distance, P.distanceTo(point)); }
      return distance < 1e-7 ? 0 : distance;
    },
    // Triangle edge/surface intersection below a horizontal shell hem. This is a sampled exposed-region check, not
    // continuous-time collision detection. Containment catches a whole cuff hidden inside the other cloth volume.
    intersects(other, hem) {
      if (boundsApart(box, other.box)) return false;
      for (const a of triangles) {
        if (a.box.min.y >= hem) continue;
        for (const b of other.triangles) {
          if (b.box.min.y >= hem || boundsApart(a.box, b.box)) continue;
          if (coplanarOverlap(a, b, hem)) return true;
          for (const [edge, target] of [[a, b], [b, a]]) for (let j = 0; j < 3; j++) {
            A.copy(edge.p[j]); B.subVectors(edge.p[(j + 1) % 3], A); const len = B.length();
            if (len < 1e-10) continue;
            ray.set(A, B.multiplyScalar(1 / len));
            if (ray.intersectTriangle(...target.p, false, P) && P.y < hem - 1e-6 && P.distanceTo(A) < len - 1e-6 && P.distanceTo(A) > 1e-6) return true;
          }
        }
      }
      for (const [a, b] of [[probe, other], [other, probe]]) for (const { p } of a.caps.cuff) {
        if (p.y < hem && b.box.containsPoint(p) && b.outside(p) === 0) return true;
      }
      return false;
    },
  };
  return probe.update();
}

export function makeClothProbe(leg) {
  const { mesh, source } = leg.cloth, core = mesh.geometry.attributes.clothCore;
  if (!core) throw new Error('Missing main-cloth triangle provenance');
  const indices = [], caps = { top: [], cuff: [] }, unique = { top: new Set(), cuff: new Set() };
  for (let i = 0; i < source.length / 3; i += 3) if (core.getX(i) && core.getX(i + 1) && core.getX(i + 2)) indices.push([i, i + 1, i + 2]);
  for (let i = 0; i < source.length / 3; i++) for (const [name, y] of [['top', 1.77], ['cuff', -0.04]]) {
    if (!core.getX(i) || !near(source[3 * i + 1], y)) continue;
    const key = [source[3 * i], source[3 * i + 1], source[3 * i + 2]].map(v => v.toFixed(6)).join();
    if (!unique[name].has(key)) { unique[name].add(key); caps[name].push({ i, p: new THREE.Vector3() }); }
  }
  if (!indices.length || !caps.top.length || !caps.cuff.length) throw new Error('Missing actual closed cloth surface');
  return surfaceProbe(mesh, indices, caps);
}

// Shoes remain the two original rigid voxel boxes; read their actual triangle geometry for cloth/shoe edge checks.
export function makeShoeProbe(leg) {
  const mesh = leg.shoe.children[0], g = mesh.geometry, p = g.attributes.position, index = g.index?.array;
  const indices = [], samples = [], unique = new Set();
  for (let i = 0, n = index?.length ?? p.count; i < n; i += 3) indices.push(index ? [index[i], index[i + 1], index[i + 2]] : [i, i + 1, i + 2]);
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(6)).join();
    if (!unique.has(key)) { unique.add(key); samples.push({ i, p: new THREE.Vector3() }); }
  }
  return surfaceProbe(mesh, indices, { top: [], cuff: samples });
}

export function actualClothFloor(leg) {
  const a = leg.cloth.mesh.geometry.attributes.position;
  let y = Infinity;
  for (let i = 0; i < a.count; i++) { P.fromBufferAttribute(a, i).applyMatrix4(leg.cloth.mesh.matrixWorld); y = Math.min(y, P.y); }
  return y;
}

// Side-face orientation measured against the skin itself: each material ring's four actual corners define its
// centre; a side triangle must point away from those centres. No production frame/tangent is used by this oracle.
export function makeClothOrientationProbe(leg) {
  const { mesh, source } = leg.cloth, core = mesh.geometry.attributes.clothCore, rings = new Map(), selected = [];
  const key = i => source[i * 3 + 1].toFixed(6);
  for (let i = 0; i < source.length / 3; i++) {
    if (!core.getX(i) || !near(Math.abs(source[i * 3]), 0.25) || !near(Math.abs(source[i * 3 + 2]), 0.26)) continue;
    if (!rings.has(key(i))) rings.set(key(i), new Map());
    rings.get(key(i)).set(`${Math.sign(source[i * 3])},${Math.sign(source[i * 3 + 2])}`, i);
  }
  const levels = [...rings.keys()], corners = levels.map(k => [...rings.get(k).values()]), centres = new Float64Array(levels.length * 3);
  if (corners.some(v => v.length !== 4)) throw new Error('An actual cloth ring has fewer than four corners');
  const index = new Map(levels.map((k, i) => [k, i]));
  for (let i = 0; i < source.length / 3; i += 3) {
    if (!core.getX(i) || ![0, 2].some(axis => [0, 1, 2].every(j => near(source[(i + j) * 3 + axis], source[i * 3 + axis])))) continue;
    A.fromArray(source, i * 3); B.fromArray(source, i * 3 + 3).sub(A); P.fromArray(source, i * 3 + 6).sub(A);
    const area = B.cross(P).length();
    // Float32 clipping leaves microscopic slivers at the original box's end planes. They have no stable normal.
    if (area < 1e-7) continue;
    selected.push({ i, rings: [index.get(key(i)), index.get(key(i + 1)), index.get(key(i + 2))], area });
  }
  if (!selected.length || selected.some(t => t.rings.some(i => i === undefined))) throw new Error('Missing side-face material rings');
  return {
    measure() {
      const p = mesh.geometry.attributes.position.array;
      centres.fill(0);
      for (let j = 0; j < corners.length; j++) for (const i of corners[j]) for (let a = 0; a < 3; a++) centres[j * 3 + a] += p[i * 3 + a] / 4;
      let minDot = Infinity, vertex = -1, areaRatio = Infinity;
      for (const t of selected) {
        const k = t.i * 3;
        const ax = p[k + 3] - p[k], ay = p[k + 4] - p[k + 1], az = p[k + 5] - p[k + 2];
        const bx = p[k + 6] - p[k], by = p[k + 7] - p[k + 1], bz = p[k + 8] - p[k + 2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, len = Math.hypot(nx, ny, nz);
        let rx = 0, ry = 0, rz = 0;
        for (let j = 0; j < 3; j++) { const c = t.rings[j] * 3, v = k + j * 3; rx += p[v] - centres[c]; ry += p[v + 1] - centres[c + 1]; rz += p[v + 2] - centres[c + 2]; }
        const dot = len > 1e-12 ? (nx * rx + ny * ry + nz * rz) / (len * Math.hypot(rx, ry, rz)) : -1;
        if (dot < minDot) { minDot = dot; vertex = t.i; }
        areaRatio = Math.min(areaRatio, len / t.area);
      }
      return { minDot, vertex, areaRatio, triangles: selected.length };
    },
  };
}
