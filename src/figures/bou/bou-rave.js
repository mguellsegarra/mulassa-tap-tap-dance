// The Bou's final disco as a rave (after the Mulassa's music video, tools/videoclip on tool/videoclip-mulassa: stage.js's
// lasers, fx.js's haze and CO2 jets): two fans of laser beams from behind the Bou as the camera sees it, a low haze the
// beams cut through and four CO2 cannons that fire on the final's first bar and its fifth; and the first techno's strobe
// scene and the banknotes' rain (bouFollowSpot): the clip's follow spot, warm, from high above onto the Bou. Posed from the song beat;
// built once at import, hidden (precompile reaches hidden meshes), nothing allocated per frame.
import * as THREE from 'three';
import { scene, camera, glc } from '../../scene/stage.js';
import { seeded } from '../../scene/models/colla.js';
import { bou } from './bou-objects.js';

const BOU_PUFF = 'float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; float a = (1. - d) * (1. - d);'; // a soft round puff

// ---- lasers: two sources 13 m behind the Bou and 9 m to each side, 7 beams each, drawn as real ones in a hall's haze: one
// mesh, a ribbon per beam turned to the lens every frame (a white-hot core in a glow of its colour, the haze drifting
// through it), cut where the beam lands, on the Bou or the floor (a box went on through the Bou and out of its other
// side), with a dot of light there and a flare at each source
const BOU_BEAMS = 14, BOU_BEAM_W = 0.16; // m: the glow's half width (the core is a hand's fraction of it)
const bouBeamPos = new THREE.BufferAttribute(new Float32Array(BOU_BEAMS * 12), 3).setUsage(THREE.DynamicDrawUsage), bouBeamUv = new THREE.BufferAttribute(new Float32Array(BOU_BEAMS * 8), 2).setUsage(THREE.DynamicDrawUsage);
const bouBeamGeo = new THREE.BufferGeometry().setAttribute('position', bouBeamPos).setAttribute('uv', bouBeamUv); // uv: -1..1 across, m from the source
bouBeamGeo.setIndex(Array.from({ length: BOU_BEAMS }, (_, i) => [0, 1, 2, 2, 1, 3].map(v => v + i * 4)).flat());
const bouBeamLook = { tint: { value: new THREE.Color('#39ff6a') }, power: { value: 0 }, t: { value: 0 }, scale: { value: 400 } };
const bouBeams = new THREE.Mesh(bouBeamGeo, new THREE.ShaderMaterial({
  uniforms: bouBeamLook, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }', // (already in the plaça's metres)
  fragmentShader: `uniform vec3 tint; uniform float power, t; varying vec2 vUv;
    void main(){ float x = vUv.x * vUv.x, haze = .7 + .3 * sin(vUv.y * 1.7 - t * 1.3 + 2. * sin(vUv.y * .37 + t * .5));
      vec3 c = tint * exp(-9. * x) * .5 * haze + mix(tint, vec3(1.), .8) * exp(-220. * x) * 1.3;
      gl_FragColor = vec4(c * power / (1. + vUv.y * .03), 1.); }`,
}));
const bouDotGeo = new THREE.BufferGeometry(); // where each beam lands, then the two sources
bouDotGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((BOU_BEAMS + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage));
bouDotGeo.setAttribute('size', new THREE.BufferAttribute(Float32Array.from({ length: BOU_BEAMS + 2 }, (_, i) => i < BOU_BEAMS ? 0.7 : 2.6), 1));
const bouDots = new THREE.Points(bouDotGeo, new THREE.ShaderMaterial({
  uniforms: bouBeamLook, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'attribute float size; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = scale * size / -mv.z; }',
  fragmentShader: `uniform vec3 tint; uniform float power; void main(){ ${BOU_PUFF} gl_FragColor = vec4(mix(tint, vec3(1.), a * a) * a * a * power * 1.4, 1.); }`,
}));
for (const o of [bouBeams, bouDots]) { o.visible = false; o.frustumCulled = false; scene.add(o); }
const BOU_LASER_GREEN = new THREE.Color('#39ff6a'), BOU_LASER_PINK = new THREE.Color('#ff2bd6');
// How far (m) a beam from `o` along `d` goes before it lands on the Bou (Infinity: it misses it): its big voxel meshes,
// each in its own space, box first, then only the triangles of the grid cells the beam crosses, nearest cell first (nothing
// allocated). Every triangle for each of the 14 beams was a third of an iPhone's JavaScript in the final (Low Power Mode:
// 8 to 25 ms a frame, a quality step down on the last bars, 13/11/2026)
const BOU_GRID = 12, bouHitMeshes = [], bouRay = new THREE.Ray(), bouHitInv = new THREE.Matrix4(), bouTri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], bouHitAt = new THREE.Vector3(), bouIn = new THREE.Vector3();
const BOU_AXES = ['x', 'y', 'z'], bouCell = [0, 0, 0], bouStep = [0, 0, 0], bouNext = [0, 0, 0], bouDelta = [0, 0, 0];
const bouCellOf = (g, v, a) => Math.min(BOU_GRID - 1, Math.max(0, Math.floor((v - g.min[a]) / g.cell[a])));
function bouGridOf(m) { // once per mesh: each triangle's first index, filed in every cell its box overlaps
  const P = m.geometry.attributes.position, I = m.geometry.index, bb = m.geometry.boundingBox;
  const g = { min: bb.min, cell: bb.getSize(new THREE.Vector3()).divideScalar(BOU_GRID).max(new THREE.Vector3(1e-6, 1e-6, 1e-6)), cells: Array.from({ length: BOU_GRID ** 3 }, () => []) };
  for (let i = 0, n = I ? I.count : P.count; i < n; i += 3) {
    for (let k = 0; k < 3; k++) bouTri[k].fromBufferAttribute(P, I ? I.getX(i + k) : i + k);
    const span = (a, f) => bouCellOf(g, f(bouTri[0][a], bouTri[1][a], bouTri[2][a]), a);
    const x1 = span('x', Math.max), y0 = span('y', Math.min), y1 = span('y', Math.max), z0 = span('z', Math.min), z1 = span('z', Math.max);
    for (let x = span('x', Math.min); x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) g.cells[(x * BOU_GRID + y) * BOU_GRID + z].push(i);
  }
  g.cells = g.cells.map(c => Int32Array.from(c));
  return g;
}
// the grids are built ahead of the final, one mesh a frame while the rave is off (built all at once, ~15 ms on a Mac, it
// fell on the final's first frame); true once they are all there
let bouHitTodo = null;
function bouHitWarm() {
  if (!bou) return false;
  bouHitTodo ??= (() => { const l = []; bou.root.traverse(m => { if (m.isMesh && !m.isSkinnedMesh && m.geometry.attributes.position.count > 600) l.push(m); }); return l; })();
  const m = bouHitTodo.pop();
  if (m) { m.geometry.computeBoundingBox(); bouHitMeshes.push([m, bouGridOf(m)]); }
  return !bouHitTodo.length;
}
function bouBeamHit(o, d) {
  if (!bou) return Infinity;
  while (!bouHitWarm()); // (a final reached before they were warm, a seek: the rest now)
  let best = Infinity;
  for (const [m, g] of bouHitMeshes) {
    bouRay.origin.copy(o); bouRay.direction.copy(d); bouRay.applyMatrix4(bouHitInv.copy(m.matrixWorld).invert()); // (direction normalised: t is object-space length)
    if (m.geometry.boundingBox.containsPoint(bouRay.origin)) bouIn.copy(bouRay.origin); // (from inside, intersectBox gives the exit)
    else if (!bouRay.intersectBox(m.geometry.boundingBox, bouIn)) continue;
    const P = m.geometry.attributes.position, I = m.geometry.index, t0 = bouIn.distanceTo(bouRay.origin);
    for (let a = 0; a < 3; a++) { // a 3D DDA from where the beam enters the box
      const ax = BOU_AXES[a], dv = bouRay.direction[ax];
      bouCell[a] = bouCellOf(g, bouIn[ax], ax); bouStep[a] = dv > 0 ? 1 : dv < 0 ? -1 : 0;
      bouDelta[a] = dv ? g.cell[ax] / Math.abs(dv) : Infinity;
      bouNext[a] = dv ? t0 + (g.min[ax] + (bouCell[a] + (dv > 0 ? 1 : 0)) * g.cell[ax] - bouIn[ax]) / dv : Infinity;
    }
    let near = Infinity;
    while (bouCell[0] >= 0 && bouCell[0] < BOU_GRID && bouCell[1] >= 0 && bouCell[1] < BOU_GRID && bouCell[2] >= 0 && bouCell[2] < BOU_GRID) {
      for (const i of g.cells[(bouCell[0] * BOU_GRID + bouCell[1]) * BOU_GRID + bouCell[2]]) {
        for (let k = 0; k < 3; k++) bouTri[k].fromBufferAttribute(P, I ? I.getX(i + k) : i + k);
        if (bouRay.intersectTriangle(bouTri[0], bouTri[1], bouTri[2], false, bouHitAt) && bouHitAt.distanceTo(bouRay.origin) < near) {
          near = bouHitAt.distanceTo(bouRay.origin); best = Math.min(best, bouHitAt.applyMatrix4(m.matrixWorld).distanceTo(o));
        }
      }
      const a = bouNext[0] < bouNext[1] ? (bouNext[0] < bouNext[2] ? 0 : 2) : (bouNext[1] < bouNext[2] ? 1 : 2);
      if (near <= bouNext[a]) break; // a hit inside the cells crossed so far: nothing further along can be nearer
      bouCell[a] += bouStep[a]; bouNext[a] += bouDelta[a];
    }
  }
  return best;
}

// ---- haze: slow puffs over heads' height round the plaça's middle (lower, they covered the disco floor)
const bouRnd = seeded(11), BOU_HAZE_N = 180, bouHazeSeeds = new Float32Array(BOU_HAZE_N * 4);
for (let i = 0; i < BOU_HAZE_N; i++) { const r = Math.sqrt(bouRnd()) * 9, a = bouRnd() * Math.PI * 2; bouHazeSeeds.set([Math.sin(a) * r, 1.2 + bouRnd() * 2.6, Math.cos(a) * r, bouRnd()], i * 4); }
const bouHazeGeo = new THREE.BufferGeometry();
bouHazeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOU_HAZE_N * 3), 3)); bouHazeGeo.setAttribute('seed', new THREE.BufferAttribute(bouHazeSeeds, 4));
const bouHaze = new THREE.Points(bouHazeGeo, new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 }, tint: { value: new THREE.Color() }, density: { value: 0 }, scale: { value: 400 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec4 seed; uniform float t, scale; varying float vS;
    void main(){ vec3 p = seed.xyz + vec3(sin(t * .07 + seed.w * 40.) * 1.2, sin(t * .11 + seed.w * 9.) * .25, cos(t * .05 + seed.w * 23.) * 1.2);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = scale * (1.4 + seed.w * 1.2) / -mv.z;
      vS = seed.w * smoothstep(2., 5., -mv.z); }`,
  fragmentShader: `uniform vec3 tint; uniform float density; varying float vS; void main(){ ${BOU_PUFF} gl_FragColor = vec4(tint * a * density * (.6 + .4 * vS), 1.); }`,
}));
bouHaze.visible = false; bouHaze.frustumCulled = false; scene.add(bouHaze);

// ---- CO2 jets: four cannons round the Bou's floor, a white column each burst
const BOU_CO2 = [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]], BOU_CO2_N = 200, bouCo2Seeds = new Float32Array(BOU_CO2.length * BOU_CO2_N * 4);
BOU_CO2.forEach(([x, z], j) => { for (let i = 0; i < BOU_CO2_N; i++) bouCo2Seeds.set([x, z, bouRnd(), bouRnd()], (j * BOU_CO2_N + i) * 4); });
const bouCo2Geo = new THREE.BufferGeometry();
bouCo2Geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOU_CO2.length * BOU_CO2_N * 3), 3)); bouCo2Geo.setAttribute('seed', new THREE.BufferAttribute(bouCo2Seeds, 4));
const bouCo2 = new THREE.Points(bouCo2Geo, new THREE.ShaderMaterial({
  uniforms: { age: { value: 9 }, scale: { value: 400 } }, transparent: true, depthWrite: false,
  vertexShader: `attribute vec4 seed; uniform float age, scale; varying float vA;
    void main(){ float k = clamp(age - seed.z * .25, 0., 3.), h = 7. * (1. - exp(-k * 2.2)), spread = .15 + h * .12;
      vec3 p = vec3(seed.x + (seed.w - .5) * spread, h * (.35 + .65 * seed.w), seed.y + (fract(seed.w * 7.) - .5) * spread);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = scale * (.8 + h * .25) / -mv.z;
      vA = (k > 0. ? exp(-k * 1.4) : 0.) * smoothstep(1.5, 4., -mv.z) * (1. - smoothstep(2.5, 3.5, age)); }`,
  fragmentShader: `varying float vA; void main(){ ${BOU_PUFF} gl_FragColor = vec4(vec3(.92, .94, 1.), a * vA * .3); }`,
}));
bouCo2.visible = false; bouCo2.frustumCulled = false; scene.add(bouCo2);

const bouFwd = new THREE.Vector3(), bouSide = new THREE.Vector3(), bouAim = new THREE.Vector3(), bouFrom = new THREE.Vector3(), bouDir = new THREE.Vector3(), bouEnd = new THREE.Vector3(), bouAcross = new THREE.Vector3();
// n: 0..1 how far the rave is on (the night's fade); beat: song beat; b0: the final's first beat; bx, bz: the Bou;
// tint: the floor's colour of the beat (the haze takes it); co2Age: s since the cannons last fired
export function bouRave(n, t, beat, b0, bx, bz, tint, co2Age) {
  const on = n > 0.01;
  bouBeams.visible = bouDots.visible = bouHaze.visible = on;
  bouCo2.visible = on && co2Age > 0 && co2Age < 3.5; // only while a burst shows (the shader's own fade): spent, its 800 puffs were still drawn, unseen
  if (!on) { bouHitWarm(); return; }
  const scale = glc.height / 2 / Math.tan(camera.fov * Math.PI / 360) * 0.5; // px per m at 1 m, halved (the clip's puffs)
  bouHaze.material.uniforms.scale.value = bouCo2.material.uniforms.scale.value = bouBeamLook.scale.value = scale;
  // behind the Bou as the camera sees it
  bouFwd.set(bx - camera.position.x, 0, bz - camera.position.z).normalize(); bouSide.set(-bouFwd.z, 0, bouFwd.x);
  const b = beat - b0, open = 0.08 + 0.07 * Math.sin(b * Math.PI / 4), colour = Math.floor(b) % 8 >= 4 ? BOU_LASER_PINK : BOU_LASER_GREEN;
  const px = 4.5 / scale, D = bouDotGeo.attributes.position; // m a pixel covers at 1 m, x9: a far beam keeps a core a pixel wide (thinner it crawled)
  for (let i = 0; i < BOU_BEAMS; i++) {
    const side = i < 7 ? -1 : 1, k = i % 7;
    bouFrom.set(bx + bouFwd.x * 13 + bouSide.x * 9 * side, 6.5, bz + bouFwd.z * 13 + bouSide.z * 9 * side);
    // m across the Bou, m up: a wide fan per source, each beam at its own height (narrower they bunched into one bundle)
    const fan = (k - 3) * open * 18 + side * 1.5, lift = 1.3 + 1.1 * Math.sin(b * Math.PI / 8 + side + k * 0.9);
    bouDir.set(bx + bouSide.x * fan, lift, bz + bouSide.z * fan).sub(bouFrom).normalize();
    const len = Math.min(bouFrom.y / -bouDir.y, bouBeamHit(bouFrom, bouDir)); // down to the floor, or onto the Bou
    bouEnd.copy(bouFrom).addScaledVector(bouDir, len);
    for (let e = 0; e < 2; e++) { // its two ends, each as wide as the lens sees it there
      const at = e ? bouEnd : bouFrom, w = Math.max(BOU_BEAM_W, px * at.distanceTo(camera.position));
      bouAcross.subVectors(camera.position, at).cross(bouDir).normalize().multiplyScalar(w);
      for (let q = 0; q < 2; q++) { const v = i * 4 + e * 2 + q, sgn = q ? 1 : -1; bouBeamPos.setXYZ(v, at.x + bouAcross.x * sgn, at.y + bouAcross.y * sgn, at.z + bouAcross.z * sgn); bouBeamUv.setXY(v, sgn, e * len); }
    }
    D.setXYZ(i, bouEnd.x - bouDir.x * 0.06, bouEnd.y - bouDir.y * 0.06, bouEnd.z - bouDir.z * 0.06); // (just off what it lands on)
    if (k === 0) D.setXYZ(BOU_BEAMS + (i ? 1 : 0), bouFrom.x, bouFrom.y, bouFrom.z);
  }
  bouBeamPos.needsUpdate = bouBeamUv.needsUpdate = D.needsUpdate = true;
  bouBeamLook.tint.value.copy(colour); bouBeamLook.power.value = n * (0.6 + 0.4 * Math.exp(-4 * (b % 1))); bouBeamLook.t.value = t; // brighter on the beat
  const u = bouHaze.material.uniforms; u.t.value = t; u.tint.value.copy(tint); u.density.value = 0.06 * n;
  bouCo2.material.uniforms.age.value = Math.min(9, co2Age);
  bouCo2.position.set(bx, 0, bz);
}

// ---- the follow spot (the first techno): a beam fading down from 13 m onto the Bou and a pool of light at its feet
const bouFollowMat = new THREE.ShaderMaterial({
  uniforms: { power: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  // (edge: a cone seen side-on fades at its outline, so its sides read as light, not as flat panels)
  vertexShader: 'varying float vL, vE; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.); vE = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float power; varying float vL, vE; void main(){ gl_FragColor = vec4(vec3(1., .82, .58) * power * (.25 + .75 * pow(vL, .6)) * pow(vE, 1.5), 1.); }',
});
const bouFollow = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 2.6, 13, 32, 1, true).translate(0, 6.5, 0), bouFollowMat); // (uv.y 1 at the top: the lamp)
// the pool's radial falloff, its alpha worked out per pixel: a canvas gradient is dithered in Safari, and stretched over
// 5.6 m and added to the light its noise showed as pink and blue specks on the floor (the owner, an iPhone)
const bouPoolTex = (() => { const S = 128, px = new Uint8Array(S * S * 4), stops = [[0, 1], [0.6, 0xbb / 255], [0.93, 0x22 / 255], [1, 0]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const r = Math.min(1, Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2) / (S / 2)), k = stops.findIndex(s => s[0] >= r), [r0, a0] = stops[Math.max(0, k - 1)], [r1, a1] = stops[k];
    px.set([255, 255, 255, Math.round(255 * (r1 > r0 ? a0 + (a1 - a0) * (r - r0) / (r1 - r0) : a1))], (y * S + x) * 4);
  }
  const t = new THREE.DataTexture(px, S, S); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
const bouPool = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: bouPoolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffd9a8', fog: false }));
bouPool.position.y = 0.02;
for (const o of [bouFollow, bouPool]) { o.visible = false; o.frustumCulled = false; scene.add(o); }
// n: 0..1 how far the spot is on (the first techno, the banknotes' rain); bx, bz: the Bou; wide: x its width (the rain: the notes round it)
export function bouFollowSpot(n, bx, bz, wide) {
  const on = n > 0.01;
  bouFollow.visible = bouPool.visible = on;
  if (!on) return;
  bouFollow.position.set(bx, 0, bz); bouPool.position.x = bx; bouPool.position.z = bz;
  bouFollow.scale.set(wide, 1, wide); bouPool.scale.set(wide, 1, wide);
  bouFollowMat.uniforms.power.value = 0.32 * n; bouPool.material.opacity = 0.5 * n;
}
