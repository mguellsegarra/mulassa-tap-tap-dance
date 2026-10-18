// The Drac's fire and powder (only while the Drac is the figure; drac-show.js wires it to the game): the CREMA burst on
// every GUAPA (the five flames flare, smoke puffs and sparks fly from each), a short breath of fire and sparks every four beats on a long
// streak, red smoke rising all over the plaça in the last pass, and the TRACA that replaces the GLOBUS balloon: its
// petards ride on the Drac's five fire points, each tap sets one off in turn, the closing beat releases an earned TRO from all five at once.
// Everything moves on dt (its own clock), smoke and sparks from closed forms of their age, and the "random" draws are a
// hash of a counter: the same taps at 60 or 120 fps give the same picture. Pools are made once, nothing per frame.
import * as THREE from 'three';

export const DRAC_FX = {
  crema: 1.1, cremaIn: 0.06, cremaPeak: 4, cremaSmoke: 26, // the burst: rises in 60 ms, gone by 1.1 s; flames up to 4x their dance size; puffs a second per tip
  streakAt: 30, streakRamp: 0.3, streakFire: 1.1, // a short breath every four beats, eased in/out over 0.3 s
  flareRamp: 10, flareNear: 3.5, flareFar: 9, flareArc: 1.9, // the red smoke builds up over 10 s, rising 3.5-9 m out from her, ±1.9 rad round the side the camera looks at
  tracaBefore: 0.6, tracaAfter: 0.8, tracaBack: 0.45, // petards on her fire points 0.6 s before its drumroll to 0.8 s after; a fired one is replaced in 0.45 s
  // the rodes de foc (its confetti), one on each fire point: rad/s, arms, the tiny circle they turn on (m), spark speed m/s,
  // spark life s (+ up to wheelLife2 more), spark size m
  wheelSpin: 14, wheelArms: 2, wheelR: 0.06, wheelSpeed: 4.6, wheelLife: 0.45, wheelLife2: 0.35, wheelSize: 0.05, wheelTrail: 0.06, // (trail: s of flight a spark's streak shows)
  full: 160, embersFull: 256, // the pools every emission rate is tuned for (a smaller pool emits less, so nothing is recycled while visible)
};
// The rules the game wires up (drac-show.js), here so tests can reach them: the streak fire, when the bengales are lit
// (the last pass: the arrangement's 'A3' row, to the end), when the traca's petards ride on her (a little before and after
// its window: they are loaded, then the TRO's smoke clears).
export const streakFire = (combo, beat) => combo >= DRAC_FX.streakAt && beat >= 0 && beat % 4 < 0.5;
export function flareStart(song, timeAtBeat) { const row = song.arrangement?.find(r => r[1] === 'A3'); return row ? timeAtBeat(row[0]) : Infinity; }
export function tracaWindow(balloons, t) {
  for (let i = 0; i < balloons.length; i++) { const n = balloons[i]; if (t >= n.t - DRAC_FX.tracaBefore && t < n.end + DRAC_FX.tracaAfter) return n; }
  return null;
}
const dfxHash = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }; // 0..1, from a counter
function dfxGlowTexture(pow, hard = 1) { // a white disc, alpha falling off (no canvas: it works headless too); a high pow = a small hot core, hard > 1 = a solid dot
  const n = 32, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2), a = Math.min(1, Math.max(0, 1 - r) * hard) ** pow, i = (y * n + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  const t = new THREE.DataTexture(d, n, n); t.needsUpdate = true; t.magFilter = t.minFilter = THREE.LinearFilter;
  return t;
}
// SMOKE: kinds of puff [life s, start size m, end size m, alpha, rise m/s, r, g, b]
const PUFF = { crema: [1.9, 0.6, 2.4, 0.65, 1.1, 0.2, 0.19, 0.19], breath: [1.2, 0.3, 1, 0.5, 0.8, 0.26, 0.25, 0.25],
  flare: [7, 1.2, 7, 0.72, -0.22, 0.85, 0.001, 0.003], // saturated pigment in linear RGB; soft alpha edges still reveal the crowd as it spreads and fades
  tro: [2, 0.7, 2.8, 0.8, 0.7, 0.24, 0.22, 0.21], petard: [1.2, 0.3, 1.2, 0.7, 0.6, 0.33, 0.31, 0.3] };
const DRAG = 2.5; // how fast a puff's own push dies (1/s)
// SPARKS (guspires): colour from hot to cool over their life [r, g, b, r, g, b]: fire, (unused: the old bengales'), powder
const PAL = [[1, 0.88, 0.35, 1, 0.28, 0.02], [1, 0.7, 0.7, 0.95, 0.06, 0.14], [1, 0.9, 0.3, 1, 0.45, 0.02], [1, 0.78, 0.2, 0.9, 0.1, 0]]; // ..., wheel (gold, through orange, to red)
const SP = { drag: 1.6, g: 7 }; // their air drag (1/s) and gravity (m/s²)
const FLASHES = 6; // one per fire point, and the TRO's

// A petard (a trueno de mecha): a fat cylinder of brown kraft paper with a darker printed band, twisted shut at both ends
// like a sweet (a fanned tail at the back, a knot tied with white string at the front) and a thin green fuse out of the
// knot. Along +z (the fuse forward), centred; every piece overlaps the next or sits proud of it (no coplanar faces).
function petardGeometry() {
  const parts = [], cols = [], C = new THREE.Color();
  // [w, h, d, z, turn about z, colour]
  for (const [w, h, d, z, rz, col] of [
    [0.2, 0.2, 0.26, 0, 0, '#b8946a'], [0.17, 0.214, 0.24, 0, 0, '#b8946a'], [0.214, 0.17, 0.236, 0, 0, '#a8845c'], // the body, rounded off by a cross
    [0.222, 0.178, 0.07, -0.04, 0, '#6e4c2c'], [0.178, 0.222, 0.068, -0.04, 0, '#6e4c2c'], // its printed band
    [0.09, 0.09, 0.07, -0.155, 0.785, '#a8845c'], [0.17, 0.06, 0.05, -0.205, 0.5, '#b8946a'], [0.06, 0.15, 0.045, -0.215, 0.5, '#9a7650'], // the twisted tail
    [0.085, 0.085, 0.07, 0.155, 0.785, '#a8845c'], [0.104, 0.104, 0.022, 0.16, 0.785, '#f4f0e6'], [0.12, 0.05, 0.04, 0.2, -0.4, '#b8946a'], // the knot, its string, its tuft
    [0.026, 0.026, 0.13, 0.27, 0, '#2f9e44'], [0.04, 0.04, 0.03, 0.34, 0, '#ffb43a'], // the green fuse and its lit end
  ]) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.rotateZ(rz); g.translate(0, 0, z);
    C.set(col); parts.push(g);
    for (let i = 0; i < g.attributes.position.count; i++) cols.push(C.r, C.g, C.b);
  }
  const join = k => new THREE.BufferAttribute(new Float32Array(parts.flatMap(g => [...g.attributes[k].array])), 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', join('position')); geo.setAttribute('normal', join('normal')); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  return geo.scale(1.6, 1.6, 1.6); // (sized to read on her at the play camera's distance)
}

// opts: { smoke: puff pool (PROFILES smoke; 0 = none), embers: spark pool (PROFILES embers), wheels: the rodes de foc's sparks (PROFILES wheels), sound(kind, i) }
export function createDracFx(scene, opts = {}) {
  const N = Math.max(0, opts.smoke | 0), E = Math.max(0, opts.embers | 0), WE = Math.max(0, opts.wheels | 0), ET = E + WE, sound = opts.sound ?? (() => {});
  const glow = dfxGlowTexture(1.6), dot = dfxGlowTexture(1, 4), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), MAT = new THREE.Matrix4();
  const SU = new THREE.Vector3(), SV = new THREE.Vector3(), QS = new THREE.Quaternion(), ZQ = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
  const D = new THREE.Vector3(), P = new THREE.Vector3(), DIR = new THREE.Vector3(), UP = new THREE.Vector3(0, 0.5, 0), Z = new THREE.Vector3(0, 0, 1), Q2 = new THREE.Quaternion(), COL = new THREE.Color();
  const additive = (color, map = glow) => new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const alphaMat = map => { // per-instance alpha (instance colours carry no alpha); smoke and sparks share the one program
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aAlpha;\nvarying float vAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
      sh.fragmentShader = 'varying float vAlpha;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vAlpha;');
    };
    return mat;
  };
  const alphaOf = m => { const a = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceMatrix.count), 1); a.setUsage(THREE.DynamicDrawUsage); m.geometry.setAttribute('aAlpha', a); return a; };
  const quad = (n, mat) => { // a billboarded instanced quad (smoke, sparks): colours made once, so instanceColor exists before the warm-up compile
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < n; i++) m.setColorAt(i, COL.setRGB(0.2, 0.2, 0.2));
    m.frustumCulled = false; m.count = 0; m.visible = false;
    scene.add(m);
    return m;
  };

  // ---- smoke: alpha per instance
  const puffs = Array.from({ length: N }, () => ({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wz: 0, age: 0, k: PUFF.crema })); // w: a breeze that keeps carrying it (m/s)
  let smoke = null, alpha = null, cursor = 0, spawned = 0;
  if (N) {
    smoke = quad(N, alphaMat(glow)); smoke.renderOrder = 2;
    alpha = alphaOf(smoke);
  }
  let cap = N; // a smaller pool (or a lower quality since: s.max) emits proportionally less (F.rate)
  function puff(kind, x, y, z, vx, vy, vz, age = 0) {
    if (!cap) return;
    const p = puffs[cursor = (cursor + 1) % cap], h = dfxHash(++spawned), h2 = dfxHash(spawned + 0.5);
    p.live = true; p.k = kind; p.age = age;
    p.wx = kind === PUFF.flare ? F.wx : 0; p.wz = kind === PUFF.flare ? F.wz : 0;
    p.x = x; p.y = y; p.z = z; p.vx = vx + (h - 0.5) * 0.6; p.vy = vy + h2 * 0.3; p.vz = vz + (h2 - 0.5) * 0.6;
  }

  // ---- sparks: small hot dots, white-yellow cooling to their palette's colour as they fade (not additive: they must
  // read on the sunny floor and façades too)
  // (one typed row per field, not an object per spark: a double written to an object field may be a new heap number)
  // (the wheels' sparks live past the embers, in [E, E + WE): one mesh draws both)
  const EX = new Float32Array(ET), EY = new Float32Array(ET), EZ = new Float32Array(ET), EVX = new Float32Array(ET), EVY = new Float32Array(ET), EVZ = new Float32Array(ET);
  const EAGE = new Float32Array(ET).fill(9), ELIFE = new Float32Array(ET).fill(1), ESIZE = new Float32Array(ET), EPAL = new Uint8Array(ET);
  const sparkMesh = ET ? quad(ET, alphaMat(dot)) : null, sparkA = sparkMesh ? alphaOf(sparkMesh) : null;
  if (sparkMesh) sparkMesh.renderOrder = 3;
  let ecap = E, ecur = 0, esp = 0;
  const count = n => (ecap ? Math.max(1, Math.round(n * F.erate)) : 0); // a burst, scaled to the pool
  // n sparks from (x, y, z) along the unit (dx, dy, dz) at ~speed m/s, spread 0 (a jet) .. 2 (all round); age: emitted that long ago
  // (from and along are vectors, not six numbers: a computed double passed to a call may be a new heap number each time)
  function sparks(at, dir, n, speed, spread, pal, size, age = 0) {
    const x = at.x, y = at.y, z = at.z, dx = dir.x, dy = dir.y, dz = dir.z;
    for (let k = 0; k < n && ecap; k++) {
      const e = ecur = (ecur + 1) % ecap, b = ++esp;
      const rx = dx + (dfxHash(b) * 2 - 1) * spread, ry = dy + (dfxHash(b + 0.25) * 2 - 1) * spread, rz = dz + (dfxHash(b + 0.5) * 2 - 1) * spread;
      const v = speed * (0.5 + dfxHash(b + 0.75)) / (Math.sqrt(rx * rx + ry * ry + rz * rz) || 1);
      EX[e] = x; EY[e] = y; EZ[e] = z; EVX[e] = rx * v; EVY[e] = ry * v; EVZ[e] = rz * v; EAGE[e] = age;
      ELIFE[e] = 0.45 + 0.55 * dfxHash(b + 0.9); ESIZE[e] = size * (0.7 + 0.6 * dfxHash(b + 0.1)); EPAL[e] = pal;
    }
  }

  // ---- fire: the CREMA envelope and the streak's held flames
  const F = { wx: 0, wz: 0, t: 0, rate: 1, erate: 1, cremaAge: 99, streak: 0, flare: 0, level: 0, emitBurst: 0, emitBreath: 0, emitSprinkle: 0, flareRate: 0 };
  let tips = null, nodes = null, sprinkle = 0; // each flame's tip, along its +z (model units, before the node's scale); the last frame's flame nodes
  function crema() { F.cremaAge = 0; if (nodes) for (let i = 0; i < nodes.length; i++) { nozzle(i); sparks(P, DIR.set(D.x, D.y + 0.3, D.z), count(8), 6, 0.7, 0, 0.1); } }
  const cremaEnv = () => { const a = F.cremaAge; return a < DRAC_FX.cremaIn ? a / DRAC_FX.cremaIn : a < DRAC_FX.crema ? (1 - (a - DRAC_FX.cremaIn) / (DRAC_FX.crema - DRAC_FX.cremaIn)) ** 2 : 0; };
  const ramp = (k, on, len, dt) => Math.max(0, Math.min(1, k + (on ? dt : -dt) / len));
  function nozzle(i) { // fire point i: P its nozzle, D the way its flame points, Q2 its turn (world); the flame's own scale ignored
    const f = nodes[i], par = f.parent;
    par.updateWorldMatrix(true, false); // (no decompose: its determinant is a fresh heap number)
    D.set(0, 0, 1).applyQuaternion(f.quaternion).transformDirection(par.matrixWorld);
    Q2.setFromUnitVectors(Z, D);
    par.localToWorld(P.copy(f.position));
  }

  let hazeOwed = 0, hazeN = 0; // the red smoke: puffs owed (a fraction of one), and a counter for where each rises

  // ---- the traca: a petard on each fire point while its drumroll lasts; a tap fires the next one, the pop all five
  const PET = 5, petards = new THREE.InstancedMesh(petardGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), PET);
  petards.instanceMatrix.setUsage(THREE.DynamicDrawUsage); petards.frustumCulled = false; petards.visible = false;
  scene.add(petards);
  const pet = new Float32Array(PET).fill(1), kick = new Float32Array(PET); // each one's size (0 = just fired, growing back); its flame's kick (1 = just fired)
  const T = { on: false, next: 0, fired: 0, last: -1, finished: false };
  const flash = Array.from({ length: FLASHES }, (_, i) => { const s = new THREE.Sprite(additive(i < PET ? '#ffd890' : '#fff4d0')); s.visible = false; scene.add(s); return s; });
  const fAge = new Float32Array(FLASHES).fill(99), fLife = new Float32Array(FLASHES).fill(0.15), fSize = new Float32Array(FLASHES).fill(1);
  function lightFlash(i, x, y, z, life, size) { flash[i].position.set(x, y, z); fAge[i] = 0; fLife[i] = life; fSize[i] = size; }
  function begin() { T.on = true; T.next = 0; T.finished = false; pet.fill(1); }
  function end() { T.on = false; petards.visible = false; }
  function fire(i, big) { // fire point i goes off: flash, sparks, a puff (the TRO: much more of each)
    nozzle(i); P.addScaledVector(D, 0.15);
    pet[i] = 0; kick[i] = 1; T.fired++; T.last = i;
    lightFlash(i, P.x, P.y, P.z, big ? 0.3 : 0.2, big ? 2.8 : 2.2);
    sparks(P, DIR.set(D.x * 0.6, D.y * 0.6 + 0.4, D.z * 0.6), count(big ? 34 : 30), big ? 7.5 : 5.5, 1.3, 2, big ? 0.085 : 0.09);
    if (big) sparks(P, DIR.set(D.x, D.y + 0.2, D.z), count(14), 5, 0.6, 0, 0.09);
    puff(big ? PUFF.tro : PUFF.petard, P.x, P.y, P.z, D.x * 1.2, D.y * 1.2 + 0.5, D.z * 1.2);
    if (big) puff(PUFF.tro, P.x, P.y + 0.3, P.z, D.x * 0.5, 1.2, D.z * 0.5);
  }
  // Every tap fires one petard. Reaching the target earns a TRO when the drumroll ends.
  function pump(count, need) {
    if (!T.on || T.finished || need <= 0 || !nodes) return false;
    const i = T.next; T.next = (i + 1) % PET; fire(i, false); sound('crack', i);
    return false;
  }
  function finish(count, need) {
    if (!T.on || T.finished || !nodes || need <= 0 || count < need) return false;
    T.finished = true;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < PET; i++) { fire(i, true); cx += P.x; cy += P.y; cz += P.z; }
    lightFlash(PET, cx / PET, cy / PET, cz / PET, 0.4, 7);
    T.next = 0; F.cremaAge = 0; // and the flames roar out with it
    sound('tro', 0);
    return true;
  }

  // ---- the rodes de foc: where the Mulassa throws confetti the Drac spins a wheel of sparks on each of its fire points
  // (at minimal, the two mouths only). No hub, nothing solid: only sparks, born on a point turning fast on a tiny circle
  // round the nozzle in the plane facing the lens, flying off along it, so the arms' spiral reads from the sparks alone;
  // born where the nozzle is now (they follow her dance), then free. wheels(sec): they spin (or keep spinning) sec more.
  // Their sparks are a pool of their own (the CREMA's never starve).
  const WH = { until: 0, age: 0, n: 0, cur: 0, cnt: 0, rate: 0, on: false };
  let wcap = WE;
  const wEmit = new Float64Array(5), WU = new THREE.Vector3(), WV = new THREE.Vector3(), WP = new THREE.Vector3();
  function wheels(sec) {
    if (!WE) return;
    if (F.t >= WH.until) { WH.age = 0; wEmit.fill(0); }
    WH.until = Math.max(WH.until, F.t + sec);
  }
  function spinWheels(dt, s) {
    wcap = Math.min(WE, s.wmax ?? WE);
    WH.age += dt;
    WH.on = F.t < WH.until && wcap > 0 && !!nodes;
    if (!WH.on) { wEmit.fill(0); return; }
    WH.n = Math.min(nodes.length, wcap >= 96 ? 5 : 2); // (the fire list starts with the two mouths)
    WH.rate = wcap * 0.85 / (WH.n * (DRAC_FX.wheelLife + DRAC_FX.wheelLife2 / 2)); // per wheel: the pool about full with every wheel going
    if (s.cam) { WU.set(1, 0, 0).applyQuaternion(s.cam.quaternion); WV.set(0, 1, 0).applyQuaternion(s.cam.quaternion); } // the lens's right and up
    else { WU.set(1, 0, 0); WV.set(0, 1, 0); }
    for (let i = 0; i < WH.n; i++) {
      wEmit[i] += WH.rate * dt;
      if (wEmit[i] < 1) continue;
      nozzle(i); WP.copy(P).addScaledVector(D, 0.12); // just off the nozzle, where it is this frame
      while (wEmit[i] >= 1) { wEmit[i] -= 1; wheelSpark(i, wEmit[i] / WH.rate); }
    }
  }
  function wheelSpark(i, back) { // a spark off arm (cnt % arms) of wheel i, emitted `back` s ago (where the arm was then)
    const e = E + (WH.cur = (WH.cur + 1) % wcap), b = ++WH.cnt + 7777, dir = i % 2 ? -1 : 1, R = DRAC_FX.wheelR;
    const a = dir * (WH.age - back) * DRAC_FX.wheelSpin + (b % DRAC_FX.wheelArms) * 6.2832 / DRAC_FX.wheelArms + i * 1.3, c = Math.cos(a), sn = Math.sin(a);
    const v = DRAC_FX.wheelSpeed * (0.85 + 0.3 * dfxHash(b)), out = 0.25 * dfxHash(b + 0.3), tw = (dfxHash(b + 0.6) - 0.5) * 0.8; // along the circle, a little outwards, a little to/from the lens
    const tu = -sn * dir * v + c * out, tv = c * dir * v + sn * out; // its speed in the wheel's own (right, up) plane
    EX[e] = WP.x + (WU.x * c + WV.x * sn) * R; EY[e] = WP.y + (WU.y * c + WV.y * sn) * R; EZ[e] = WP.z + (WU.z * c + WV.z * sn) * R;
    EVX[e] = WU.x * tu + WV.x * tv + D.x * tw; EVY[e] = WU.y * tu + WV.y * tv + D.y * tw; EVZ[e] = WU.z * tu + WV.z * tv + D.z * tw;
    EAGE[e] = back; ELIFE[e] = DRAC_FX.wheelLife + DRAC_FX.wheelLife2 * dfxHash(b + 0.9); ESIZE[e] = DRAC_FX.wheelSize * (0.8 + 0.4 * dfxHash(b + 0.1)); EPAL[e] = 3;
  }

  // ---- once a frame. s (reused by the caller): { on, cam, fire (the Drac's flame nodes), streak, flare (bool), max (PROFILES smoke now), emax (embers) }
  function update(dt, s) {
    cap = Math.min(N, s.max ?? N); F.rate = cap / DRAC_FX.full; // (fields, not closure `let`s: a double there is a new heap number each write)
    ecap = Math.min(E, s.emax ?? E); F.erate = ecap / DRAC_FX.embersFull;
    F.t += dt; F.cremaAge += dt;
    const on = !!s.on, burst = on ? cremaEnv() : 0;
    F.streak = ramp(F.streak, on && s.streak, DRAC_FX.streakRamp, dt);
    F.level = Math.max(burst * DRAC_FX.cremaPeak, F.streak * DRAC_FX.streakFire);
    // the flames: held up over the dance's own (poseDrac set them this frame), with a flicker of their own
    nodes = s.fire;
    if (nodes) tips ??= nodes.map(f => { const b = f.children.at(-1); return b.position.z + b.geometry.parameters.depth / 2; }); // (once)
    for (let i = 0; i < PET; i++) kick[i] = Math.max(0, kick[i] - dt / 0.3);
    if (nodes) {
      for (let i = 0; i < nodes.length; i++) { // (a petard going off kicks its own flame out for 0.3 s)
        const f = nodes[i], k = Math.max(f.visible ? f.scale.x : 0, F.level * (0.88 + 0.12 * Math.sin(F.t * 23 + i * 2)), kick[i] * 2.4);
        f.visible = k > 0; f.scale.setScalar(k);
      }
    }
    // smoke from the flame tips: a burst's puffs, and a thin breath while the streak holds them up; the streak's sprinkle of sparks
    if (nodes && cap) {
      F.emitBurst += DRAC_FX.cremaSmoke * F.rate * (burst > 0.15 ? 1 : 0) * dt; F.emitBreath += 2.2 * F.rate * F.streak * dt;
      while (F.emitBurst >= 1) { F.emitBurst -= 1; fromTips(PUFF.crema, F.emitBurst / (DRAC_FX.cremaSmoke * F.rate), 2.2); }
      while (F.emitBreath >= 1) { F.emitBreath -= 1; fromTips(PUFF.breath, F.emitBreath / (2.2 * F.rate * Math.max(0.01, F.streak)), 1); }
    } else F.emitBurst = F.emitBreath = 0;
    if (nodes && ecap && F.streak > 0) {
      F.emitSprinkle += 30 * F.erate * F.streak * dt;
      while (F.emitSprinkle >= 1) {
        F.emitSprinkle -= 1; sprinkle = (sprinkle + 1) % nodes.length;
        nozzle(sprinkle); nodes[sprinkle].updateWorldMatrix(false, false); nodes[sprinkle].localToWorld(V.set(0, 0, tips[sprinkle]));
        sparks(V, DIR.set(D.x, D.y + 0.5, D.z), 1, 3, 0.6, 0, 0.09, F.emitSprinkle / (30 * F.erate * F.streak));
      }
    } else F.emitSprinkle = 0;
    // the last pass: red smoke rising from the floor all over the plaça, more and more (a crescendo over flareRamp s);
    // it rises beyond her, round the side the camera looks at (not wasted behind the lens), on a breeze towards it
    F.flare = ramp(F.flare, s.flare, DRAC_FX.flareRamp, dt);
    F.flareRate = Math.min(28, cap * 0.7 / PUFF.flare[0]); // at full: 70% of the pool (the CREMA's recycle the oldest)
    hazeOwed = F.flare ? hazeOwed + F.flareRate * F.flare * F.flare * dt : 0;
    if (hazeOwed >= 1) {
      if (s.cam) s.cam.getWorldDirection(D); else D.set(0, 0, -1);
      const look = Math.atan2(D.x, D.z), x0 = s.x ?? 0, z0 = s.z ?? 0;
      F.wx = -D.x * 0.25; F.wz = -D.z * 0.25;
      while (hazeOwed >= 1) {
        hazeOwed -= 1; hazeN++;
        const a = look + (dfxHash(hazeN + 0.3) * 2 - 1) * DRAC_FX.flareArc, r = DRAC_FX.flareNear + (DRAC_FX.flareFar - DRAC_FX.flareNear) * dfxHash(hazeN + 0.7);
        puff(PUFF.flare, x0 + Math.sin(a) * r, 0.4 + 1.6 * dfxHash(hazeN + 0.9), z0 + Math.cos(a) * r, 0, 0.3, 0);
      }
    }
    // the traca's petards, riding on the fire points
    petards.visible = T.on && !!nodes;
    if (petards.visible) {
      for (let i = 0; i < PET; i++) {
        pet[i] = Math.min(1, pet[i] + dt / DRAC_FX.tracaBack);
        nozzle(i); P.addScaledVector(D, 0.24);
        petards.setMatrixAt(i, MAT.compose(P, Q2, S.setScalar(Math.max(0.001, pet[i] * pet[i]))));
      }
      petards.instanceMatrix.needsUpdate = true;
    }
    for (let i = 0; i < FLASHES; i++) {
      fAge[i] += dt; const fl = flash[i];
      fl.visible = fAge[i] < fLife[i];
      if (fl.visible) { const e = 1 - fAge[i] / fLife[i]; fl.scale.setScalar(fSize[i] * (0.5 + 0.7 * (1 - e * e))); fl.material.opacity = e; }
    }
    spinWheels(dt, s);
    if (smoke) drawSmoke(dt, s.cam);
    if (sparkMesh) drawSparks(dt, s.cam);
  }
  function fromTips(kind, age, push) {
    for (let i = 0; i < nodes.length; i++) {
      const f = nodes[i];
      f.getWorldPosition(S);
      f.localToWorld(V.set(0, 0, tips[i])); // (scaled with the flame: at its tip)
      const dx = V.x - S.x, dy = V.y - S.y, dz = V.z - S.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      puff(kind, V.x, V.y, V.z, dx / l * push, dy / l * push, dz / l * push, age);
    }
  }
  let liveN = 0, liveE = 0, liveW = 0;
  function drawSmoke(dt, cam) {
    let n = 0;
    if (cam) Q.copy(cam.quaternion);
    for (let i = 0; i < N; i++) {
      const p = puffs[i];
      if (!p.live) continue;
      p.age += dt;
      const k = p.k, u = p.age / k[0]; // [life, start size, end size, alpha, rise, r, g, b]
      if (u >= 1) { p.live = false; continue; }
      const go = (1 - Math.exp(-DRAG * p.age)) / DRAG; // closed form: the same at any frame rate
      V.set(p.x + p.vx * go + p.wx * p.age, p.y + p.vy * go + k[4] * p.age, p.z + p.vz * go + p.wz * p.age);
      S.setScalar(k[1] + (k[2] - k[1]) * Math.sqrt(u));
      smoke.setMatrixAt(n, MAT.compose(V, Q, S));
      smoke.instanceColor.setXYZ(n, k[5], k[6], k[7]);
      alpha.setX(n++, k[3] * Math.min(1, p.age / 0.08) * (1 - u * u)); // in fast, out late
    }
    liveN = n;
    smoke.count = n; smoke.visible = n > 0;
    if (n) { smoke.instanceMatrix.needsUpdate = true; smoke.instanceColor.needsUpdate = true; alpha.needsUpdate = true; }
  }
  function drawSparks(dt, cam) {
    let n = 0, nw = 0;
    if (cam) Q.copy(cam.quaternion);
    if (WE) { SU.set(1, 0, 0).applyQuaternion(Q); SV.set(0, 1, 0).applyQuaternion(Q); } // the lens's right and up: the wheels' sparks streak along their flight
    for (let i = 0; i < ET; i++) {
      if (EAGE[i] >= ELIFE[i]) continue;
      const a = EAGE[i] += dt, u = a / ELIFE[i];
      if (u >= 1) continue;
      const go = (1 - Math.exp(-SP.drag * a)) / SP.drag; // closed form, drag and gravity
      V.set(EX[i] + EVX[i] * go, EY[i] + EVY[i] * go - SP.g / SP.drag * (a - go), EZ[i] + EVZ[i] * go);
      const sz = ESIZE[i] * (1.2 - 0.8 * u);
      if (i < E) sparkMesh.setMatrixAt(n, MAT.compose(V, Q, S.setScalar(sz)));
      else { // a short streak along its flight now (its speed's closed form: drag and gravity), as the eye sees a spark
        const ek = Math.exp(-SP.drag * a), vx = EVX[i] * ek, vy = EVY[i] * ek - SP.g / SP.drag * (1 - ek), vz = EVZ[i] * ek;
        const su = vx * SU.x + vy * SU.y + vz * SU.z, sv = vx * SV.x + vy * SV.y + vz * SV.z;
        QS.copy(Q).multiply(ZQ.setFromAxisAngle(ZAX, Math.atan2(sv, su)));
        sparkMesh.setMatrixAt(n, MAT.compose(V, QS, S.set(sz + Math.sqrt(su * su + sv * sv) * DRAC_FX.wheelTrail, sz * 0.8, 1)));
      }
      const c = PAL[EPAL[i]], w = EPAL[i] === 3 ? u : Math.sqrt(u); // white-hot, then cooling and fading (the wheels' cool evenly)
      sparkMesh.instanceColor.setXYZ(n, c[0] + (c[3] - c[0]) * w, c[1] + (c[4] - c[1]) * w, c[2] + (c[5] - c[2]) * w);
      sparkA.setX(n++, Math.min(1, 1.6 * (1 - u)));
      if (i >= E) nw++;
    }
    liveE = n - nw; liveW = nw;
    sparkMesh.count = n; sparkMesh.visible = n > 0;
    if (n) { sparkMesh.instanceMatrix.needsUpdate = true; sparkMesh.instanceColor.needsUpdate = true; sparkA.needsUpdate = true; }
  }
  function clear() { // a hidden figure owns no lingering particles or emission debt
    end(); F.cremaAge = 99;
    F.streak = F.flare = F.level = F.emitBurst = F.emitBreath = F.emitSprinkle = hazeOwed = sprinkle = 0;
    WH.until = F.t; WH.on = false; WH.n = 0; wEmit.fill(0);
    for (const p of puffs) p.live = false;
    EAGE.fill(99); fAge.fill(99); kick.fill(0);
    liveN = liveE = liveW = 0;
    if (smoke) { smoke.visible = false; smoke.count = 0; }
    if (sparkMesh) { sparkMesh.visible = false; sparkMesh.count = 0; }
    for (const f of flash) f.visible = false;
    if (nodes) for (const f of nodes) { f.visible = false; f.scale.setScalar(0); }
    nodes = null;
  }
  function warm(renderer) { renderer.initTexture?.(glow); renderer.initTexture?.(dot); } // the programs compile with the scene (every object here is in it from the start)
  const state = () => ({ t: F.t, level: F.level, streak: F.streak, flare: F.flare, fired: T.fired, last: T.last, next: T.next, smoke: liveN, embers: liveE, wheelSparks: liveW, wheels: WH.on ? WH.n : 0, traca: T.on,
    pet: [...pet], flashes: flash.map(f => f.visible), puffs: puffs.filter(p => p.live).map(p => [p.x, p.y, p.z, p.age]),
    sparks: [...EAGE].map((a, i) => [EX[i], EY[i], EZ[i], a]).filter((p, i) => i < E && EAGE[i] < ELIFE[i]),
    wsparks: [...EAGE].map((a, i) => [EX[i], EY[i], EZ[i], a]).filter((p, i) => i >= E && EAGE[i] < ELIFE[i]) }); // tests only
  return { crema, pump, finish, begin, end, wheels, update, warm, clear, state, get tracaOn() { return T.on; },
    get flare() { return F.flare; }, // the last pass's red mist, 0..1 (drac-show.js thickens the plaça's fog with it)
    clearHaze() { F.flare = hazeOwed = 0; for (const p of puffs) if (p.k === PUFF.flare) p.live = false; }, // back on a menu: gone at once
    get idle() { return !liveN && !liveE && !liveW && F.t >= WH.until && !F.flare && !F.streak && !petards.visible && F.cremaAge > DRAC_FX.crema && fAge.every((a, i) => a >= fLife[i]); },
    objects: { smoke, sparks: sparkMesh, petards, flash } };
}
