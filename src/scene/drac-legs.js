// The carrier's trousers. The original cream cloth and raised camouflage are subdivided once, then bent over
// an ankle / forward knee / hip chain. One continuous skin keeps the knee covered; the shoe and the shell keep their
// own rigid transforms. All points below are in the Drac root's model units, not the scaled scene's metres.
import * as THREE from 'three';
import { ANKLE } from './models/drac.js';

export const CLOTH = Object.freeze({ chain: 1.72, slack: 0.025, softness: 0.025, width: 0.95, collar: 0.12, seam: 0.11 });
const Y0 = -0.04, Y1 = 1.77, SPAN = Y1 - Y0;
const P = new THREE.Vector3(), T = new THREE.Vector3(), R = new THREE.Vector3(), F = new THREE.Vector3();
const D = new THREE.Vector3(), POLE = new THREE.Vector3();

// Clip source triangles into horizontal bands. Their vertex colours, box faces and raised patches survive intact.
// Only preparation allocates; the frame loop rewrites the preallocated position and normal buffers.
function subdivide(original) {
  const g = original.index ? original.toNonIndexed() : original, pos = g.attributes.position, col = g.attributes.color;
  const positions = [], colours = [], core = [], edges = [Y0];
  for (let y = Y0 + 0.10; y < Y1 - 0.001; y += 0.10) edges.push(y);
  edges.push(Y1);
  const clip = (poly, y, sign) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], ina = sign * (a[1] - y) >= -1e-9, inb = sign * (b[1] - y) >= -1e-9;
      if (ina) out.push(a);
      if (ina !== inb) { const k = (y - a[1]) / (b[1] - a[1]); out.push(a.map((v, j) => v + (b[j] - v) * k)); }
    }
    return out;
  };
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [0, 1, 2].map(j => [pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j), col.getX(i + j), col.getY(i + j), col.getZ(i + j)]);
    const flat = tri[0][1] === tri[1][1] && tri[1][1] === tri[2][1];
    for (let k = 1; k < edges.length; k++) {
      // A horizontal patch face exactly on a cut belongs to the band below it, never to both (coplanar duplicates).
      if (flat && k > 1 && tri[0][1] <= edges[k - 1] + 1e-9) continue;
      const poly = clip(clip(tri, edges[k - 1], 1), edges[k], -1);
      for (let j = 1; j + 1 < poly.length; j++) {
        const a = poly[0], b = poly[j], c = poly[j + 1];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-10) continue;
        for (const v of [a, b, c]) { positions.push(v[0], v[1], v[2]); colours.push(v[3], v[4], v[5]); core.push(i < 36 ? 1 : 0); }
      }
    }
  }
  if (g !== original) g.dispose();
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  mesh.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3).setUsage(THREE.DynamicDrawUsage));
  mesh.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  // Vox emits the main trouser box first (BoxGeometry = 12 triangles / 36 non-indexed vertices), then decorations.
  // Keep provenance through clipping so geometry probes can inspect the closed core without a colour/plane heuristic.
  mesh.setAttribute('clothCore', new THREE.Uint8BufferAttribute(core, 1));
  return mesh;
}

// Mostly straight shin and thigh, with short cloth blends at the collar and knee. A long cubic down the whole leg
// made even a standing carrier look like a rubber hose. Each blend has zero derivative at its edges (C2 in material
// height); the two bones still meet on the same knee, with no open seam or separate ball.
const A = new THREE.Vector3(), B = new THREE.Vector3();
function blend(out, tangent, a, b, da, db, q, span) {
  const w = q * q * q * (10 + q * (-15 + 6 * q)), dw = 30 * q * q * (1 - q) * (1 - q) / span;
  out.copy(a).multiplyScalar(1 - w).addScaledVector(b, w);
  tangent.copy(da).multiplyScalar(1 - w).addScaledVector(db, w).addScaledVector(b, dw).addScaledVector(a, -dw);
}
function centre(s, u, out, tangent) {
  const c = CLOTH.collar, cb = 0.035, kb = 0.06;
  if (u <= c - cb) { out.copy(s.cuff); out.y += SPAN * u; tangent.copy(s.vertical); return; }
  if (u < c + cb) {
    A.copy(s.cuff); A.y += SPAN * u;
    B.copy(s.knee).addScaledVector(s.lower, u - 0.5);
    blend(out, tangent, A, B, s.vertical, s.lower, (u - c + cb) / (2 * cb), 2 * cb); return;
  }
  if (u <= 0.5 - kb) { out.copy(s.knee).addScaledVector(s.lower, u - 0.5); tangent.copy(s.lower); return; }
  if (u < 0.5 + kb) {
    A.copy(s.knee).addScaledVector(s.lower, u - 0.5); B.copy(s.knee).addScaledVector(s.upper, u - 0.5);
    blend(out, tangent, A, B, s.lower, s.upper, (u - 0.5 + kb) / (2 * kb), 2 * kb); return;
  }
  out.copy(s.knee).addScaledVector(s.upper, u - 0.5); tangent.copy(s.upper);
}
function frame(s, u) {
  centre(s, u, P, T);
  const q = u * u * (3 - 2 * u), yaw = s.shoeYaw + (s.pelvisYaw - s.shoeYaw) * q;
  // Cloth sections shear with the knee, rather than rotating a thick rigid ring perpendicular to its path. At the
  // short ankle blend a perpendicular ring folded its inner edge below the previous ring. Horizontal sections keep
  // material height ordered, keep the cuff closed over the shoe, and leave the same forward-knee centreline intact.
  R.set(Math.cos(yaw), 0, -Math.sin(yaw)); F.set(Math.sin(yaw), 0, Math.cos(yaw));
}
function normals(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2];
    const bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, l = Math.hypot(nx, ny, nz) || 1;
    for (let j = i; j < i + 9; j += 3) { n[j] = nx / l; n[j + 1] = ny / l; n[j + 2] = nz / l; }
  }
  g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
}
function prepare(leg) {
  const mesh = leg.pants.children[0], old = mesh.geometry, geometry = subdivide(old), source = geometry.attributes.position.array.slice();
  mesh.geometry = geometry; mesh.frustumCulled = false; delete mesh.userData.boxes; mesh.userData.carrierCloth = true; old.dispose();
  const values = [...new Set(Array.from({ length: source.length / 3 }, (_, i) => +((source[i * 3 + 1] - Y0) / SPAN).toFixed(7)))].sort((a, b) => a - b);
  const levelOf = new Map(values.map((u, i) => [u, i])), levelIndex = new Uint16Array(source.length / 3);
  for (let i = 0; i < levelIndex.length; i++) levelIndex[i] = levelOf.get(+((source[i * 3 + 1] - Y0) / SPAN).toFixed(7));
  const s = { mesh, source, levels: Float64Array.from(values), levelIndex, frames: new Float64Array(values.length * 9),
    ankle: new THREE.Vector3(), knee: new THREE.Vector3(), hip: new THREE.Vector3(), cuff: new THREE.Vector3(), collar: new THREE.Vector3(), top: new THREE.Vector3(),
    vertical: new THREE.Vector3(0, SPAN, 0), lower: new THREE.Vector3(), upper: new THREE.Vector3(), shoeYaw: 0, pelvisYaw: 0, chainLength: 0, bend: 0,
    sample(u, out) { centre(this, u, out, T); return out; },
    // Surface points use the same frame function and dimensions as the actual skin, for geometry probes.
    surface(u, x, z, out) { frame(this, u); return out.copy(P).addScaledVector(R, x * CLOTH.width).addScaledVector(F, z * CLOTH.width); },
  };
  leg.cloth = s;
  return s;
}

export function poseCarrierLeg(leg, hip, pelvisYaw) {
  const s = leg.cloth || prepare(leg), { shoe, pants } = leg;
  // Coordinates are already root-local, so the cloth group must not inherit poseDrac's old straight-prism fitting.
  pants.position.set(0, 0, 0); pants.rotation.set(0, 0, 0); pants.scale.set(1, 1, 1);
  s.ankle.copy(shoe.position); s.ankle.y += ANKLE; s.hip.copy(hip);
  s.cuff.copy(shoe.position); s.cuff.y += ANKLE + Y0;
  s.collar.copy(s.cuff); s.collar.y += CLOTH.collar * SPAN;
  s.top.copy(hip); s.top.y += CLOTH.seam;
  s.shoeYaw = shoe.rotation.y; s.pelvisYaw = pelvisYaw;
  D.subVectors(hip, s.ankle); const d = D.length(); D.multiplyScalar(1 / d);
  // A softly extensible chain keeps modest bend on the longest authored strides without snapping to a locked knee.
  // Its endpoint distance still obeys the preview's existing reach bound; it never moves a planted shoe to solve IK.
  const want = d + CLOTH.slack, diff = CLOTH.chain - want;
  s.chainLength = (CLOTH.chain + want + Math.sqrt(diff * diff + CLOTH.softness * CLOTH.softness)) / 2;
  s.bend = Math.sqrt((s.chainLength * s.chainLength - d * d) / 4);
  POLE.set(Math.sin(pelvisYaw), 0, Math.cos(pelvisYaw)).addScaledVector(D, -POLE.dot(D)).normalize();
  s.knee.copy(s.ankle).addScaledVector(D, d / 2).addScaledVector(POLE, s.bend);
  s.lower.subVectors(s.knee, s.collar).multiplyScalar(1 / (0.5 - CLOTH.collar));
  s.upper.subVectors(s.top, s.knee).multiplyScalar(2);
  for (let j = 0; j < s.levels.length; j++) {
    frame(s, s.levels[j]); const k = j * 9;
    s.frames[k] = P.x; s.frames[k + 1] = P.y; s.frames[k + 2] = P.z;
    s.frames[k + 3] = R.x; s.frames[k + 4] = R.y; s.frames[k + 5] = R.z;
    s.frames[k + 6] = F.x; s.frames[k + 7] = F.y; s.frames[k + 8] = F.z;
  }
  const a = s.mesh.geometry.attributes.position.array;
  for (let i = 0; i < s.levelIndex.length; i++) {
    const k = s.levelIndex[i] * 9, v = i * 3, x = s.source[v] * CLOTH.width, z = s.source[v + 2] * CLOTH.width;
    a[v] = s.frames[k] + s.frames[k + 3] * x + s.frames[k + 6] * z;
    a[v + 1] = s.frames[k + 1] + s.frames[k + 4] * x + s.frames[k + 7] * z;
    a[v + 2] = s.frames[k + 2] + s.frames[k + 5] * x + s.frames[k + 8] * z;
  }
  normals(s.mesh.geometry);
}
