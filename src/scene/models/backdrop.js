// The backdrop crowd: instanced figures animated in a shader (no bones, no CPU per frame).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { C } from '../../figures/mulassa/mulassa.js';
import { rnd, pick } from './voxel.js';
import { SHIRT, SKIN, HAIR } from './people.js';

// A box without its bottom (-y) face: they stand on the ground. The back stays: photo mode walks round them (hollow
// figures from behind otherwise). `keep` picks other faces (BoxGeometry order +x -x +y -y +z -z), `col` part 0's colour.
function shell(x, y, z, w, h, d, part, keep = [0, 1, 2, 4, 5], col = '#2e3444') {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y + h / 2, z);
  const P = g.attributes.position.array, N = g.attributes.normal.array, I = g.index.array;
  const pos = [], nor = [], idx = [];
  keep.forEach((f, k) => {
    pos.push(...P.slice(f * 12, f * 12 + 12)); nor.push(...N.slice(f * 12, f * 12 + 12));
    idx.push(...I.slice(f * 6, f * 6 + 6).map(i => i - f * 4 + k * 4));
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  // part: 0 fixed (the vertex colour), 1 shirt, 2 skin, 3 hair; per face, the head's top is hair
  const parts = keep.flatMap(f => Array(4).fill(Array.isArray(part) ? part[f] : part));
  out.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  const c = new THREE.Color(col);
  out.setAttribute('color', new THREE.Float32BufferAttribute(parts.flatMap(() => [c.r, c.g, c.b]), 3));
  out.setIndex(idx);
  return out;
}
// ring: the mid band instead (main.js midCrowd): an arc of the same figures, r0..r1 from the middle, within `half`
// radians of `far`; avoid: [[azimuth, half arc, r0 there]] (the band's sector starts further out). share: another
// backdrop whose material (one shader program for both) and figure geometry it reuses, with its own looks and phases.
export function buildBackdrop(n, inner, props = [], { ring = null, share = null } = {}) {
  const geo = share ? new THREE.BufferGeometry() : mergeGeometries([
    shell(0, 0, 0, 0.36, 0.78, 0.22, 0), shell(0, 0.78, 0, 0.46, 0.6, 0.28, 1),
    shell(0, 1.38, 0, 0.32, 0.36, 0.3, [2, 2, 3, 2, 2, 3]), // (the back of the head is hair too)
    // eyes like the full people's (±0.08, top + 0.17): just their front faces, 1.5 cm proud of the face (z 0.15), in
    // a fixed dark vertex colour (part 0), so no instance tint reaches them. 8 vertices, 4 triangles more a figure.
    ...[0.08, -0.08].map(x => shell(x, 1.55, 0.155, 0.05, 0.05, 0.02, 0, [4], C.black)),
  ]);
  if (share) {
    const g = share.mesh.geometry;
    for (const k of ['position', 'normal', 'aPart', 'color']) geo.setAttribute(k, g.attributes[k]);
    geo.setIndex(g.index);
  }
  // Candidates in three loose rows from inner - 1.3 (beyond the camera's inner - 1.5) to just short of the fronts,
  // shuffled then thinned to 0.42 m apart, so any prefix (a lower quality's count) is still spread all round.
  const cand = [], lim = inner + 0.5, lo = inner - 1.3;
  const r0At = a => ring.avoid?.reduce((r, [az, h, r1]) => (Math.abs(Math.atan2(Math.sin(a - az), Math.cos(a - az))) < h ? Math.max(r, r1) : r), ring.r0) ?? ring.r0;
  if (ring) { // rows 0.42 m apart, a figure every 0.52 m along each (a shirt is 0.46 wide, 0.28 deep)
    for (let k = 0, r = ring.r0 + 0.1; r < ring.r1; k++, r += 0.42) for (let a = ring.far - ring.half + (k % 2) * 0.26 / r; a <= ring.far + ring.half; a += 0.52 / r) {
      const rr = Math.min(ring.r1, r + rnd(-0.03, 0.03)), aa = a + rnd(-0.03, 0.03) / rr; // odd rows stand between shoulders
      if (Math.abs(aa - ring.far) <= ring.half && rr >= r0At(aa)) cand.push([Math.cos(aa) * rr, Math.sin(aa) * rr]);
    }
  }
  for (const [fx, fz] of ring ? [] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let a = -lim + 0.1; a < lim; a += 0.5) for (let r = 0; r < 3; r++) {
      const out = lo + 0.1 + r * 0.5 + rnd(-0.1, 0.1), al = a + rnd(-0.15, 0.15) + (r % 2) * 0.25;
      cand.push([fx ? fx * out : al, fz ? fz * out : al]);
    }
  }
  cand.sort(() => Math.random() - 0.5);
  const spots = [];
  for (const [x, z] of cand) {
    if (!ring && (Math.abs(x) > lim || Math.abs(z) > lim || (Math.abs(x) < lo && Math.abs(z) < lo))) continue;
    if (props.some(p => Math.hypot(p.x - x, p.z - z) < (p.r > 1 ? 0.6 : 0.45))) continue; // trunks and lamp posts
    if (spots.some(([sx, sz]) => (sx - x) ** 2 + (sz - z) ** 2 < (ring ? 0.44 : 0.42) ** 2)) continue;
    spots.push([x, z]);
    if (spots.length >= n) break;
  }
  const u = share ? share.u : { uBeat: { value: 0 }, uHop: { value: 0 }, uTime: { value: 0 }, uWave: { value: 0 }, uLens: { value: new THREE.Vector3(0, 99, 0) } };
  const mat = share ? share.mesh.material : new THREE.MeshLambertMaterial({ vertexColors: true });
  if (!share) mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
attribute float aPart;
attribute vec4 aSkin; // rgb + beat phase
attribute vec4 aHair; // rgb + angle round the plaça (the wave)
attribute vec2 aSoot; // free mode's fire (drac-soot.js): black 0..1, still 0..1
uniform float uBeat, uHop, uTime, uWave;
uniform vec3 uLens; // the camera: a figure right by a low lens shrinks away (the title orbit can pass over the mid band)`).replace('#include <color_vertex>', `vColor = aPart < 0.5 ? color : aPart < 1.5 ? instanceColor : aPart < 2.5 ? aSkin.rgb : aHair.rgb;
if (aSoot.x > 0.0) vColor = mix(vColor, aPart < 0.5 && position.y > 1.5 ? vec3(0.9) : vColor * 0.012 + vec3(0.014, 0.013, 0.012), aSoot.x); // charred, white eyes`)
      .replace('#include <begin_vertex>', `vec3 transformed = position * max(smoothstep(3.2, 5.0, distance(instanceMatrix[3].xz, uLens.xz)), smoothstep(4.5, 6.0, uLens.y));
float wave = uWave * smoothstep(0.6, 1.0, cos(aHair.w - uTime * 2.2));
float still = 1.0 - aSoot.y;
transformed.y += (max(0.0, sin(uBeat * PI + aSkin.w)) * uHop + wave * 0.3) * still;
transformed.x += sin(uTime * 1.3 + aSkin.w * 3.0) * 0.04 * position.y * still;`);
  };
  if (!share) mat.customProgramCacheKey = () => 'backdrop';
  const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
  const skin = new Float32Array(spots.length * 4), hair = new Float32Array(spots.length * 4);
  const o = new THREE.Object3D(), c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    o.position.set(x, 0, z);
    o.rotation.set(0, Math.atan2(-x, -z) + rnd(-0.5, 0.5), 0); // roughly towards the middle
    o.scale.setScalar(Math.random() < 0.15 ? 0.72 : rnd(0.92, 1.06));
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, c.set(pick(SHIRT)));
    c.set(pick(SKIN)); skin.set([c.r, c.g, c.b, rnd(0, Math.PI * 2)], i * 4);
    c.set(pick(HAIR)); hair.set([c.r, c.g, c.b, Math.atan2(z, x)], i * 4);
  });
  geo.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 4));
  geo.setAttribute('aHair', new THREE.InstancedBufferAttribute(hair, 4));
  geo.setAttribute('aSoot', new THREE.InstancedBufferAttribute(new Float32Array(spots.length * 2), 2).setUsage(THREE.DynamicDrawUsage)); // (drac-soot.js)
  mesh.frustumCulled = false; // it rings the plaça: always partly in view
  return { mesh, u, n: spots.length };
}
