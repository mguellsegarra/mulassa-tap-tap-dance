// Drac fire lab (research only, never imported by the game). The plaça, the Drac, its revised dance and drac-fx are the
// game's own modules; only the nozzle fire is swapped. URL: ?v=base|A|B|C|D &q=high|medium|low|minimal
// &view=play|heads|tail|side|top &calm=1 (reduced motion) &fx=0 (no smoke/sparks from drac-fx) &run=0 (step by hand)
// &sync=1 (wait for the GPU after each render: GPU-inclusive frame cost) &label=0.
import * as THREE from 'three';
import { buildPlaza } from '/src/scene/models.js';
import { buildDrac, DRAC_SCALE } from '/src/scene/models/drac.js';
import { newDracFeet } from '/src/game/drac-feet.js';
import { createDracFx } from '/src/scene/drac-fx.js';
import { poseCarrier } from '/src/scene/drac-rig.js';
import { newDracPose } from '/src/game/dance-drac.js';
import { poseAt } from '/src/game/drac-pose.js';
import { feetAt } from '/src/game/drac-steps.js';
import { placeDance, danceYaw } from '/src/game/drac-layout.js';
import { PROFILES, MINIMAL, renderDpr } from '/src/platform/render-quality.js';
import { VARIANTS, FIRE_VIEW } from './variants.js';
import { makeMock, MOCK } from './mock.js';

const Q = new URLSearchParams(location.search);
const VKEY = Q.get('v') || 'base', QNAME = Q.get('q') || 'high', VIEW = Q.get('view') || 'play';
const CALM = Q.get('calm') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const profile = [...PROFILES, MINIMAL].find(p => p.name === QNAME) ?? PROFILES[2];
const level = profile === MINIMAL ? -1 : PROFILES.indexOf(profile);

// ---- the stage, as stage.js sets it up (no crowd: the fire is what differs)
const glc = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: level > 0, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.shadowMap.enabled = profile.shadow > 0; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff'); scene.fog = new THREE.Fog('#8fd3ff', 40, 90);
const camera = new THREE.PerspectiveCamera(54, 1, 0.5, 200);
const hemi = new THREE.HemisphereLight('#dff3ff', '#a88b63', 1.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
sun.position.set(-10, 18, 8); sun.castShadow = true;
sun.shadow.mapSize.set(profile.shadow || 512, profile.shadow || 512);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 60 }); sun.shadow.bias = -0.0005;
scene.add(sun);
const plaza = buildPlaza({ backdrop: profile.backdrop, balconies: profile.balconies, waving: level === 2 });
scene.add(plaza.group);
const drac = buildDrac(); drac.feet = newDracFeet();
const life = new THREE.Group(); life.scale.setScalar(DRAC_SCALE); life.add(drac.root); scene.add(life);
const CAM_EL = 26 * Math.PI / 180, CAM_AZ = -81 * Math.PI / 180, DRAC_YAW = danceYaw(CAM_AZ);
// the game's own drac-fx (since 19/10/2026 it draws the carretilla jets and the flamarada itself: v=base is that fire)
const fx = Q.get('fx') === '0' ? createDracFx(scene, {}) : createDracFx(scene, { smoke: profile.smoke, jets: profile.jets, wheels: profile.wheels, calm: { matches: CALM }, octaves: level > 0 ? 2 : 1 });
const IN = { on: true, cam: camera, fire: drac.fire, streak: false, flare: false, max: profile.smoke, jmax: profile.jets, wmax: profile.wheels, viewH: 800, x: 0, z: 0 };

// ---- the fire under test
const SIZES = [0.55, 0.55, 0.45, 0.35, 0.35]; // fireNode sizes in drac.fire order: two mouths, the tail, two wing tips
// v=M: the mock-up of the chosen direction (everyday spark jets + FLAMARADA, mock.js), with its own script; &mida= scales the flamarada
const variant = VKEY === 'M' ? makeMock(scene, profile.name, CALM, { size: +Q.get('mida') || 1 }) : VARIANTS[VKEY] ? VARIANTS[VKEY].make(scene, profile.name, CALM) : null;
if (variant) for (const f of drac.fire) for (const c of f.children) c.visible = false; // a variant draws its own fire (the game's tubes hidden; drac-fx still reads them)
const fireObjects = variant ? variant.objects : [fx.objects.jets, fx.objects.blast, fx.objects.flash].filter(Boolean);
for (const o of fireObjects) o.layers.enable(7);
const E = new Float32Array(40), P = new THREE.Vector3(), D = new THREE.Vector3();
function readEmitters() {
  for (let i = 0; i < 5; i++) {
    const f = drac.fire[i], par = f.parent, o = i * 8;
    par.updateWorldMatrix(true, false);
    D.set(0, 0, 1).applyQuaternion(f.quaternion).transformDirection(par.matrixWorld);
    par.localToWorld(P.copy(f.position));
    E[o] = P.x; E[o + 1] = P.y; E[o + 2] = P.z; E[o + 3] = D.x; E[o + 4] = D.y; E[o + 5] = D.z;
    E[o + 6] = f.visible ? f.scale.x : 0; E[o + 7] = SIZES[i] * DRAC_SCALE;
  }
}

// ---- one fixed script, looping every LOOP s: a CREMA (all five at once), a held streak breath, three petards of a traca
// (one nozzle at a time) and a quiet gap; the dance runs on underneath, never looping
const LOOP = variant?.own ? MOCK.loop : 7, POSE = newDracPose(), REF0 = 40;
const S = { t: 0, prev: -1 };
function script(dt) {
  const a = S.prev % LOOP, b = S.t % LOOP, crossed = x => (a < x && b >= x) || (S.prev < 0 && b >= x && S.t < x + dt);
  if (crossed(0.4)) fx.crema();
  IN.streak = b >= 2.2 && b < 3.8;
  if (crossed(4.4)) fx.begin();
  for (const x of [4.8, 5.1, 5.4]) if (crossed(x)) fx.pump(1, 10);
  if (crossed(6.0)) fx.end();
}
const camAt = new THREE.Vector3(), camGo = new THREE.Vector3(), root = new THREE.Vector3(), FWD = new THREE.Vector3(), RQ = new THREE.Quaternion();
let heading = 0, camInit = false;
const VIEWS = { // [azimuth offset from her heading (rad) or null = the play camera's, elevation deg, distance m, look height m, fov]
  play: [null, 26, 0, 1.45, 54], heads: [0.55, 12, 3.8, 2.3, 42], tail: [Math.PI + 0.7, 18, 4.8, 1.7, 42],
  side: [Math.PI / 2, 8, 6.5, 1.7, 42], top: [0.3, 58, 7.5, 1.4, 42], wide: [0.75, 14, 9.5, 2.2, 46],
};
function placeCamera(dt) {
  const v = VIEWS[VIEW] ?? VIEWS.play;
  drac.root.getWorldPosition(root);
  drac.root.getWorldQuaternion(RQ); FWD.set(0, 0, 1).applyQuaternion(RQ);
  const h = Math.atan2(FWD.x, FWD.z), e = 1 - Math.exp(-dt / 1.2);
  let dh = h - heading; dh -= Math.round(dh / (2 * Math.PI)) * 2 * Math.PI;
  heading = camInit ? heading + dh * e : h;
  camera.fov = v[4];
  const t = Math.tan(v[4] * Math.PI / 360);
  const dist = v[0] === null ? Math.max(8.25 / 2 / t, 8.4 / 2 / (t * camera.aspect)) : v[2];
  const az = v[0] === null ? CAM_AZ : heading + v[0], el = v[1] * Math.PI / 180;
  camGo.set(root.x * 0.5, v[3], root.z * 0.5); // follows half her travel, as the play camera does with the Drac
  if (v[0] !== null) camGo.set(root.x, v[3], root.z);
  camAt.lerp(camGo, camInit ? 1 - Math.exp(-dt / 0.6) : 1); camInit = true;
  camera.position.set(camAt.x + dist * Math.cos(el) * Math.sin(az), camAt.y + dist * Math.sin(el), camAt.z + dist * Math.cos(el) * Math.cos(az));
  camera.lookAt(camAt);
  camera.updateProjectionMatrix();
}

// ---- measurement (rings preallocated; read with lab.report())
const RING = 8192, M = { n: 0, frame: new Float32Array(RING), fire: new Float32Array(RING), fxms: new Float32Array(RING), draw: new Float32Array(RING), gpu: new Float32Array(RING), gn: 0 };
const gl = renderer.getContext(), TQ = gl.getExtension('EXT_disjoint_timer_query_webgl2'), queries = [];
const SYNC = Q.get('sync') === '1', px1 = new Uint8Array(4);
function advance(dt) {
  S.prev = S.t; S.t += dt;
  if (!variant?.own) script(dt);
  const ref = REF0 + S.t;
  const p = poseAt(POSE, ref, ref * 2.1);
  placeDance(life, DRAC_YAW); life.scale.setScalar(DRAC_SCALE);
  poseCarrier(drac, p, feetAt);
  drac.root.getWorldPosition(root); IN.x = root.x; IN.z = root.z;
  placeCamera(dt);
  const t0 = performance.now();
  fx.update(dt, IN);
  const t1 = performance.now();
  if (variant) { readEmitters(); variant.own?.(E, S.t); variant.update(S.t, dt, E); }
  if (variant?.own) { const L = variant.light; hemi.intensity = 1.6 * (1 + 0.9 * L); sun.intensity = 2.4 * (1 + 0.4 * L); hemi.color.setRGB(0.88 + 0.12 * L, 0.95 - 0.1 * L, 1 - 0.35 * L); } // the flamarada lights the plaça for an instant
  const t2 = performance.now();
  return [t1 - t0, t2 - t1];
}
function render() {
  let q = null;
  if (TQ) { q = gl.createQuery(); gl.beginQuery(TQ.TIME_ELAPSED_EXT, q); }
  const t0 = performance.now();
  renderer.render(scene, camera);
  if (SYNC) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);
  const ms = performance.now() - t0;
  if (q) { gl.endQuery(TQ.TIME_ELAPSED_EXT); queries.push(q); }
  for (let i = queries.length - 1; i >= 0; i--) { // collect finished GPU timings
    const r = queries[i];
    if (gl.getQueryParameter(r, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(TQ.GPU_DISJOINT_EXT)) { M.gpu[M.gn++ % RING] = gl.getQueryParameter(r, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(r); queries.splice(i, 1); }
  }
  return ms;
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(renderDpr(profile, w, h, devicePixelRatio)); renderer.setSize(w, h, false);
  glc.style.width = w + 'px'; glc.style.height = h + 'px';
  camera.aspect = w / h; camera.updateProjectionMatrix();
  FIRE_VIEW.value = IN.viewH = renderer.getContext().drawingBufferHeight;
}
addEventListener('resize', resize); resize();

const label = document.getElementById('label');
const NAME = (VKEY === 'M' ? 'Maqueta · guspires + flamarada' : VARIANTS[VKEY]?.name ?? 'Joc · foc integrat (drac-fire.js)') + ` · ${profile.name}${CALM ? ' · moviment reduït' : ''}`;
function paintLabel() { if (label) label.textContent = `${NAME} · ${(S.t % LOOP).toFixed(1)} s${variant?.phase ? ' · ' + variant.phase() : ''}`; }
if (Q.get('label') === '0' && label) label.remove();

let last = 0;
function loop(now) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
  if (last) M.frame[M.n % RING] = now - last;
  last = now;
  const [f1, f2] = advance(dt);
  M.fxms[M.n % RING] = f1; M.fire[M.n % RING] = f2;
  M.draw[M.n % RING] = render(); M.n++;
  paintLabel();
  if (running) requestAnimationFrame(loop);
}
let running = Q.get('run') !== '0';
if (running) requestAnimationFrame(loop);

// ---- deterministic counters: draw calls and triangles with the fire and without it, shaded fragments, memory
function countFragments(mode) { // mode 1: fragments written (after the cutout), 2: rasterised (all shaded)
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
  const swap = new Map(), counter = new THREE.ShaderMaterial({ uniforms: { uCount: { value: 1 } }, vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform float uCount; void main() { gl_FragColor = vec4(1.0 / 255.0); }' });
  const sum = m => Object.assign(m, { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation, depthWrite: false, transparent: true }); // each fragment adds exactly 1/255
  for (const o of fireObjects) {
    const m = o.material;
    if (m.uniforms?.uCount) swap.set(o, { m, keep: { blending: m.blending, blendSrc: m.blendSrc, blendDst: m.blendDst, blendEquation: m.blendEquation, depthWrite: m.depthWrite, transparent: m.transparent } }), m.uniforms.uCount.value = mode, sum(m);
    else if (m.isShaderMaterial) { // the game's own shaders: same vertex stage, the fragment stage counts (mode 2 before any cutout, mode 1 what is written)
      const c = m.clone(); c.uniforms = m.uniforms;
      c.fragmentShader = mode === 2 ? m.fragmentShader.replace(/void main\(\) \{/, 'void main() { gl_FragColor = vec4(1.0 / 255.0); return;') : m.fragmentShader.replace('#include <colorspace_fragment>', 'gl_FragColor = vec4(1.0 / 255.0);');
      swap.set(o, { m, temp: c }); o.material = sum(c);
    } else swap.set(o, { m }), o.material = sum(counter);
  }
  const vis = fireObjects.map(o => o.visible);
  fireObjects.forEach(o => (o.visible = false));
  renderer.setRenderTarget(rt); renderer.render(scene, camera); // the world's depth
  fireObjects.forEach((o, i) => (o.visible = vis[i]));
  const ac = renderer.autoClear, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  renderer.autoClear = false; renderer.setClearColor(0x000000, 0); renderer.clear(true, false, false);
  camera.layers.set(7); scene.background = null; const fog = scene.fog; scene.fog = null;
  renderer.render(scene, camera);
  camera.layers.set(0); scene.background = new THREE.Color('#8fd3ff'); scene.fog = fog;
  renderer.autoClear = ac; renderer.setClearColor(cc, ca);
  const px = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
  renderer.setRenderTarget(null); rt.dispose();
  for (const [o, s] of swap) { if (s.keep) { s.m.uniforms.uCount.value = 0; Object.assign(s.m, s.keep); } else { o.material = s.m; s.temp?.dispose(); } }
  let frags = 0, covered = 0, maxLayer = 0;
  for (let i = 0; i < px.length; i += 4) { const c = px[i]; if (c) { frags += c; covered++; if (c > maxLayer) maxLayer = c; } }
  return { frags, covered, maxLayer, screen: w * h };
}
function counters() {
  const info = renderer.info; info.autoReset = false;
  const vis = fireObjects.map(o => o.visible);
  info.reset(); renderer.render(scene, camera); const on = { calls: info.render.calls, tris: info.render.triangles };
  fireObjects.forEach(o => (o.visible = false));
  info.reset(); renderer.render(scene, camera); const off = { calls: info.render.calls, tris: info.render.triangles };
  fireObjects.forEach((o, i) => (o.visible = vis[i]));
  info.autoReset = true;
  const written = countFragments(1), shaded = countFragments(2);
  renderer.render(scene, camera);
  let bytes = 0; const seen = new Set();
  for (const o of fireObjects) for (const a of Object.values(o.geometry.attributes).concat(o.geometry.index ? [o.geometry.index] : [])) if (!seen.has(a)) { seen.add(a); bytes += a.array.byteLength; }
  return { fireCalls: on.calls - off.calls, fireTris: on.tris - off.tris, totalCalls: on.calls, totalTris: on.tris, written, shaded,
    overdraw: written.covered ? +(written.frags / written.covered).toFixed(2) : 0, shadedPerCovered: written.covered ? +(shaded.frags / written.covered).toFixed(2) : 0,
    particles: variant ? variant.live(S.t) : fx.state().jets, pool: variant?.pool?.n ?? profile.jets, bufferKB: +(bytes / 1024).toFixed(1), programs: info.programs.length };
}
const stat = (a, n) => { const v = Array.from(a.slice(0, Math.min(n, RING))).sort((x, y) => x - y); if (!v.length) return null; const m = v.reduce((s, x) => s + x, 0) / v.length; return { mean: +m.toFixed(3), p50: +v[v.length >> 1].toFixed(3), p95: +v[Math.floor(v.length * 0.95)].toFixed(3), max: +v.at(-1).toFixed(3), n: v.length }; };
window.lab = {
  variant: VKEY, profile: profile.name, calm: CALM, view: VIEW, timer: !!TQ,
  get t() { return S.t; },
  stop() { running = false; },
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) advance(dt); render(); paintLabel(); return S.t; },
  resetStats() { M.n = 0; M.gn = 0; },
  report() { return { frame: stat(M.frame, M.n - 1), fireCpu: stat(M.fire, M.n), fxCpu: stat(M.fxms, M.n), render: stat(M.draw, M.n), gpu: stat(M.gpu, M.gn), dpr: renderer.getPixelRatio(), size: [gl.drawingBufferWidth, gl.drawingBufferHeight], sync: SYNC }; },
  counters,
  emitters: () => Array.from(E),
  gpuName: (() => { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; })(),
};
window.lab.ready = true;
