// The Drac's fire and powder (only while the Drac is the figure; drac-show.js wires it to the game). Its five fire points
// carry carretilla tubes (models/drac.js) whose jets of sparks (drac-fire.js, the documented fire) burn through a long
// streak, the FINAL ESBOJARRAT and the CARRETILLES (the drumroll); every CREMA, the final hit and the TRO fire a FLAMARADA
// from all five (drac-fire.js, an exaggerated burst: artistic licence); red smoke rises all over the plaça in the last
// pass. In the CARRETILLES each tap kicks the next tube's jet with a crack and a flash, the closing beat releases an earned
// TRO from all five at once. Everything moves on dt (its own clock), smoke and sparks from closed forms of their age, and
// the "random" draws are a hash of a counter: the same taps at 60 or 120 fps give the same picture. Pools are made once,
// nothing per frame.
import * as THREE from 'three';
import { createDracFire, DRAC_MANUAL_FIRE } from './drac-fire.js';

export const DRAC_FX = {
  streakAt: 30, streakRamp: 0.3, // the jets light on a 30 streak (and in the finale: drac-show.js), eased in/out over 0.3 s
  // the red smoke: from the brake before the six reversed spins (flareRef, reference seconds) it builds up to the final
  // hit; it rises evenly all over the plaça (flareNear-flareFar m from its centre) except the corridor between the lens
  // and her (flareClear m either side); after the song it thins out over flareRamp s
  flareRamp: 10, flareRef: 93.8, flareNear: 1.5, flareFar: 10, flareClear: 2,
  tracaBefore: 0.6, tracaAfter: 0.8, // the CARRETILLES burn from 0.6 s before their drumroll to 0.8 s after
  tracaIn: 0.35, tracaOut: 0.3, tracaJet: 0.7, // their jets ease in / out (s) at this level
  kick: 0.35, kickJet: 2.2, // a tap (or a CREMA while a flamarada burns) kicks a jet up to kickJet, back in kick s
  // the rodes de foc (its confetti), one on each fire point: rad/s, arms, the tiny circle they turn on (m), spark speed m/s,
  // spark life s (+ up to wheelLife2 more), spark size m
  wheelSpin: 14, wheelArms: 2, wheelR: 0.06, wheelSpeed: 4.6, wheelLife: 0.45, wheelLife2: 0.35, wheelSize: 0.05, wheelTrail: 0.06, // (trail: s of flight a spark's streak shows)
  full: 160, // the smoke pool every emission rate is tuned for (a smaller pool emits less, so nothing is recycled while visible)
};
// The rules the game wires up (drac-show.js), here so tests can reach them: the streak's jets, when the bengales are lit
// (from the brake before the reversed spins to the final hit, flareLevel), when the CARRETILLES burn on her (a little
// before and after their window).
export const streakFire = combo => combo >= DRAC_FX.streakAt;
// the red smoke's level at song time t, lit at t0 and full on the final hit t1: 0..1, eased in (smoothstep)
export const flareLevel = (t, t0, t1) => { const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return t < t0 ? 0 : k * k * (3 - 2 * k); };
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
const PUFF = { crema: [1.9, 0.6, 2.4, 0.65, 1.1, 0.2, 0.19, 0.19], jet: [1.6, 0.3, 1.1, 0.3, 0.45, 0.7, 0.69, 0.67], // the fireball's dark smoke; a jet's white
  flare: [7, 1.2, 7, 0.7, -0.22, 0.6, 0.07, 0.05], // a bengala's smoke, a rosy red (linear RGB); soft alpha edges still reveal the crowd as it spreads and fades
  tro: [2, 0.7, 2.8, 0.8, 0.7, 0.24, 0.22, 0.21], petard: [1.2, 0.3, 1.2, 0.7, 0.6, 0.33, 0.31, 0.3],
  soot: [1.8, 0.25, 0.95, 0.7, 0.5, 0.09, 0.085, 0.08] }; // a wisp off a charred head (drac-soot.js)
const DRAG = 2.5; // how fast a puff's own push dies (1/s)
const WHEEL_PAL = [1, 0.78, 0.2, 0.9, 0.1, 0]; // the wheels' sparks, hot to cool: gold, through orange, to red
const SP = { drag: 1.6, g: 7 }; // their air drag (1/s) and gravity (m/s²)
const FLASHES = 6; // one per fire point, and the TRO's

// opts: { smoke: puff pool (PROFILES smoke; 0 = none), jets: the carretilles' spark pool (PROFILES jets), wheels: the
// rodes de foc's sparks (PROFILES wheels), sound(kind, i), calm: the reduced-motion query, octaves: the flamarada's noise }
export function createDracFx(scene, opts = {}) {
  const N = Math.max(0, opts.smoke | 0), WE = Math.max(0, opts.wheels | 0), sound = opts.sound ?? (() => {});
  const glow = dfxGlowTexture(1.6), dot = dfxGlowTexture(1, 4), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), MAT = new THREE.Matrix4();
  const SU = new THREE.Vector3(), SV = new THREE.Vector3(), QS = new THREE.Quaternion(), ZQ = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
  const D = new THREE.Vector3(), P = new THREE.Vector3(), COL = new THREE.Color();
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

  // ---- the jets and the flamarada (drac-fire.js); their smoke goes through the pool above
  const fire = createDracFire(scene, { jets: opts.jets, octaves: opts.octaves, calm: opts.calm,
    puff: (dark, at, v, age) => puff(dark ? PUFF.crema : PUFF.jet, at.x, at.y, at.z, v.x, v.y, v.z, age) });

  // ---- the wheels' sparks: small hot dots that streak along their flight, gold cooling to red (not additive: they must
  // read on the sunny floor and façades too). One typed row per field, not an object per spark: a double written to an
  // object field may be a new heap number.
  const EX = new Float32Array(WE), EY = new Float32Array(WE), EZ = new Float32Array(WE), EVX = new Float32Array(WE), EVY = new Float32Array(WE), EVZ = new Float32Array(WE);
  const EAGE = new Float32Array(WE).fill(9), ELIFE = new Float32Array(WE).fill(1), ESIZE = new Float32Array(WE);
  const sparkMesh = WE ? quad(WE, alphaMat(dot)) : null, sparkA = sparkMesh ? alphaOf(sparkMesh) : null;
  if (sparkMesh) sparkMesh.renderOrder = 3;

  // ---- fire points: each tube's mouth and heading (world), its jet level, its kick
  const F = { wx: 0, wz: 0, t: 0, rate: 1, streak: 0, flare: 0, level: 0, flareRate: 0, lit: 0 };
  let tips = null, sizes = null, nodes = null; // each tube's mouth along its +z (model units) and nominal size; the last frame's fire nodes
  const EM = new Float32Array(40), kick = new Float32Array(5);
  function crema() { // the flamarada; another while one burns kicks all five jets instead
    if (fire.flamarada()) return;
    kick.fill(1);
  }
  const ramp = (k, on, len, dt) => Math.max(0, Math.min(1, k + (on ? dt : -dt) / len));
  function nozzle(i) { // fire point i: P its tube's mouth, D the way it points (world)
    const f = nodes[i], par = f.parent;
    par.updateWorldMatrix(true, false); // (no decompose: its determinant is a fresh heap number)
    D.set(0, 0, 1).applyQuaternion(f.quaternion).transformDirection(par.matrixWorld);
    par.localToWorld(P.copy(f.position).addScaledVector(V.set(0, 0, tips[i]).applyQuaternion(f.quaternion), 1));
  }

  let manual = false; // action owner, independent of the lens or selected menu card
  let hazeOwed = 0, hazeN = 0; // the red smoke: puffs owed (a fraction of one), and a counter for where each rises

  // ---- the CARRETILLES: their jets burn while the drumroll lasts; a tap kicks the next one, the pop is the TRO from all five
  const PET = 5;
  const T = { on: false, next: 0, fired: 0, last: -1, finished: false };
  const flash = Array.from({ length: FLASHES }, (_, i) => { const s = new THREE.Sprite(additive(i < PET ? '#ffd890' : '#fff4d0')); s.visible = false; scene.add(s); return s; });
  const fAge = new Float32Array(FLASHES).fill(99), fLife = new Float32Array(FLASHES).fill(0.15), fSize = new Float32Array(FLASHES).fill(1);
  function lightFlash(i, x, y, z, life, size) { flash[i].position.set(x, y, z); fAge[i] = 0; fLife[i] = life; fSize[i] = size; }
  function begin() { T.on = true; T.next = 0; T.finished = false; }
  function end() { T.on = false; } // (the jets ease out: update)
  function fireOne(i, big) { // tube i cracks: its jet kicked, a flash, a puff (the TRO: bigger)
    nozzle(i); P.addScaledVector(D, 0.15);
    kick[i] = 1; T.fired++; T.last = i;
    lightFlash(i, P.x, P.y, P.z, big ? 0.3 : 0.2, big ? 2.8 : 2.2);
    puff(big ? PUFF.tro : PUFF.petard, P.x, P.y, P.z, D.x * 1.2, D.y * 1.2 + 0.5, D.z * 1.2);
  }
  // Every tap kicks one jet. Reaching the target earns a TRO when the drumroll ends.
  function pump(count, need) {
    if (!T.on || T.finished || need <= 0 || !nodes) return false;
    const i = T.next; T.next = (i + 1) % PET; fireOne(i, false); sound('crack', i);
    return false;
  }
  function finish(count, need) {
    if (!T.on || T.finished || !nodes || need <= 0 || count < need) return false;
    T.finished = true;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < PET; i++) { fireOne(i, true); cx += P.x; cy += P.y; cz += P.z; }
    lightFlash(PET, cx / PET, cy / PET, cz / PET, 0.4, 7);
    T.next = 0; fire.flamarada(); // and the flamarada roars out with it
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
    WH.on = (F.t < WH.until) && wcap > 0 && !!nodes;
    if (!WH.on) { wEmit.fill(0); return; }
    WH.n = Math.min(nodes.length, wcap >= 96 ? 5 : 2); // (the fire list starts with the two mouths)
    WH.rate = wcap * 0.85 / (WH.n * (DRAC_FX.wheelLife + DRAC_FX.wheelLife2 / 2)); // per wheel: the pool about full with every wheel going
    if (s.cam) { WU.set(1, 0, 0).applyQuaternion(s.cam.quaternion); WV.set(0, 1, 0).applyQuaternion(s.cam.quaternion); } // the lens's right and up
    else { WU.set(1, 0, 0); WV.set(0, 1, 0); }
    for (let i = 0; i < WH.n; i++) {
      wEmit[i] += WH.rate * dt;
      if (wEmit[i] < 1) continue;
      nozzle(i); WP.copy(P).addScaledVector(D, 0.12); // just off the nozzle, where it is this frame
      while (wEmit[i] >= 1) { wEmit[i] -= 1; wheelSpark(i); } // (its age is read inside: a double argument per spark is a heap number)
    }
  }
  function wheelSpark(i) { // a spark off arm (cnt % arms) of wheel i, emitted `back` s ago (where the arm was then)
    const back = wEmit[i] / WH.rate, e = (WH.cur = (WH.cur + 1) % wcap), b = ++WH.cnt + 7777, dir = i % 2 ? -1 : 1, R = DRAC_FX.wheelR;
    const a = dir * (WH.age - back) * DRAC_FX.wheelSpin + (b % DRAC_FX.wheelArms) * 6.2832 / DRAC_FX.wheelArms + i * 1.3, c = Math.cos(a), sn = Math.sin(a);
    const v = DRAC_FX.wheelSpeed * (0.85 + 0.3 * dfxHash(b)), out = 0.25 * dfxHash(b + 0.3), tw = (dfxHash(b + 0.6) - 0.5) * 0.8; // along the circle, a little outwards, a little to/from the lens
    const tu = -sn * dir * v + c * out, tv = c * dir * v + sn * out; // its speed in the wheel's own (right, up) plane
    EX[e] = WP.x + (WU.x * c + WV.x * sn) * R; EY[e] = WP.y + (WU.y * c + WV.y * sn) * R; EZ[e] = WP.z + (WU.z * c + WV.z * sn) * R;
    EVX[e] = WU.x * tu + WV.x * tv + D.x * tw; EVY[e] = WU.y * tu + WV.y * tv + D.y * tw; EVZ[e] = WU.z * tu + WV.z * tv + D.z * tw;
    EAGE[e] = back; ELIFE[e] = DRAC_FX.wheelLife + DRAC_FX.wheelLife2 * dfxHash(b + 0.9); ESIZE[e] = DRAC_FX.wheelSize * (0.8 + 0.4 * dfxHash(b + 0.1));
  }

  // ---- once a frame. s (reused by the caller): { on, cam, fire (the Drac's fire nodes), streak, flare (bool or level),
  // max (PROFILES smoke now), jmax (jets now), wmax (wheels now), viewH (the canvas's pixel height), x, z }
  function update(dt, s) {
    if (!!s.manual !== manual) { clear(); manual = !!s.manual; } // no effects leak between action owners
    cap = Math.min(N, s.max ?? N); F.rate = cap / DRAC_FX.full; // (fields, not closure `let`s: a double there is a new heap number each write)
    F.t += dt;
    const on = !!s.on;
    F.streak = ramp(F.streak, on && s.streak, DRAC_FX.streakRamp, dt);
    F.lit = ramp(F.lit, on && T.on, T.on ? DRAC_FX.tracaIn : DRAC_FX.tracaOut, dt);
    for (let i = 0; i < PET; i++) kick[i] = Math.max(0, kick[i] - dt / DRAC_FX.kick);
    // the jets: the streak's / the carretilles' level, the dance's own (poseDrac's userData.level: the menu walker, photo
    // mode's take-off) and a tap's kick, whichever is highest
    nodes = s.fire;
    if (nodes) {
      tips ??= nodes.map(f => { const b = f.children[0]; return b.position.z + b.geometry.parameters.depth / 2; }); // (once)
      sizes ??= nodes.map(f => f.userData.size); // (once)
      const jet = Math.max(F.streak, F.lit * DRAC_FX.tracaJet, on && s.held ? 1 : 0);
      F.level = 0;
      for (let i = 0; i < nodes.length && i < 5; i++) {
        nozzle(i);
        const o = i * 8, k = manual ? (on && s.held ? DRAC_MANUAL_FIRE[i].intensity : 0) : Math.max(jet, nodes[i].userData.level || 0, kick[i] * DRAC_FX.kickJet);
        EM[o] = P.x; EM[o + 1] = P.y; EM[o + 2] = P.z; EM[o + 3] = D.x; EM[o + 4] = D.y; EM[o + 5] = D.z;
        const e = nodes[i].parent.matrixWorld.elements; // its world scale, inline (a call's double result is a heap number)
        EM[o + 6] = k; EM[o + 7] = sizes[i] * Math.sqrt(e[8] * e[8] + e[9] * e[9] + e[10] * e[10]);
        if (k > F.level) F.level = k;
      }
    } else F.level = 0;
    fire.cap(s.jmax ?? 1e9);
    fire.update(dt, F.t, nodes ? EM : null, s.viewH, on && !!s.held);
    // the last pass: red smoke rising from the floor all over the plaça, more and more. s.flare: a level 0..1 to follow
    // (the song's own crescendo, flareLevel), or true / false: build up / thin out over flareRamp s
    const want = s.flare === true ? 1 : +s.flare || 0;
    F.flare = s.flare !== true && want >= F.flare ? want : Math.max(s.flare === true ? 0 : want, ramp(F.flare, s.flare === true, DRAC_FX.flareRamp, dt));
    F.flareRate = Math.min(28, cap * 0.7 / PUFF.flare[0]); // at full: 70% of the pool (the CREMA's recycle the oldest)
    hazeOwed = F.flare ? hazeOwed + F.flareRate * F.flare * dt : 0; // linear in the level: a square hid it until the very end
    if (hazeOwed >= 1) {
      const x0 = s.x ?? 0, z0 = s.z ?? 0, cx = s.cam ? s.cam.position.x - x0 : 0, cz = s.cam ? s.cam.position.z - z0 : 1, cd = Math.hypot(cx, cz) || 1;
      F.wx = F.wz = 0; // no breeze: it hangs where it rose
      while (hazeOwed >= 1) {
        hazeOwed -= 1; hazeN++;
        // even over the plaça's area (r ~ sqrt), round its centre: never in the corridor from her to the lens
        const a = dfxHash(hazeN + 0.3) * 2 * Math.PI, R0 = DRAC_FX.flareNear, R1 = DRAC_FX.flareFar;
        const r = Math.sqrt(R0 * R0 + (R1 * R1 - R0 * R0) * dfxHash(hazeN + 0.7)), x = Math.sin(a) * r, z = Math.cos(a) * r;
        const along = ((x - x0) * cx + (z - z0) * cz) / cd, side = Math.abs((x - x0) * cz - (z - z0) * cx) / cd;
        if (along > -1 && along < cd && side < DRAC_FX.flareClear + 0.2 * Math.max(0, along)) continue;
        puff(PUFF.flare, x, 0.4 + 1.6 * dfxHash(hazeN + 0.9), z, 0, 0.3, 0);
      }
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
  let liveN = 0, liveW = 0;
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
    let n = 0;
    if (cam) Q.copy(cam.quaternion);
    SU.set(1, 0, 0).applyQuaternion(Q); SV.set(0, 1, 0).applyQuaternion(Q); // the lens's right and up: the sparks streak along their flight
    for (let i = 0; i < WE; i++) {
      if (EAGE[i] >= ELIFE[i]) continue;
      const a = EAGE[i] += dt, u = a / ELIFE[i];
      if (u >= 1) continue;
      const go = (1 - Math.exp(-SP.drag * a)) / SP.drag; // closed form, drag and gravity
      V.set(EX[i] + EVX[i] * go, EY[i] + EVY[i] * go - SP.g / SP.drag * (a - go), EZ[i] + EVZ[i] * go);
      const sz = ESIZE[i] * (1.2 - 0.8 * u);
      // a short streak along its flight now (its speed's closed form: drag and gravity), as the eye sees a spark
      const ek = Math.exp(-SP.drag * a), vx = EVX[i] * ek, vy = EVY[i] * ek - SP.g / SP.drag * (1 - ek), vz = EVZ[i] * ek;
      const su = vx * SU.x + vy * SU.y + vz * SU.z, sv = vx * SV.x + vy * SV.y + vz * SV.z;
      QS.copy(Q).multiply(ZQ.setFromAxisAngle(ZAX, Math.atan2(sv, su)));
      sparkMesh.setMatrixAt(n, MAT.compose(V, QS, S.set(sz + Math.sqrt(su * su + sv * sv) * DRAC_FX.wheelTrail, sz * 0.8, 1)));
      const c = WHEEL_PAL; // cooling evenly from gold to red, then fading
      sparkMesh.instanceColor.setXYZ(n, c[0] + (c[3] - c[0]) * u, c[1] + (c[4] - c[1]) * u, c[2] + (c[5] - c[2]) * u);
      sparkA.setX(n++, Math.min(1, 1.6 * (1 - u)));
    }
    liveW = n;
    sparkMesh.count = n; sparkMesh.visible = n > 0;
    if (n) { sparkMesh.instanceMatrix.needsUpdate = true; sparkMesh.instanceColor.needsUpdate = true; sparkA.needsUpdate = true; }
  }
  function clear() { // a hidden figure owns no lingering particles or emission debt
    end(); F.lit = 0;
    F.streak = F.flare = F.level = hazeOwed = 0;
    WH.until = F.t; WH.on = false; WH.n = 0; wEmit.fill(0);
    for (const p of puffs) p.live = false;
    EAGE.fill(99); fAge.fill(99); kick.fill(0);
    liveN = liveW = 0;
    if (smoke) { smoke.visible = false; smoke.count = 0; }
    if (sparkMesh) { sparkMesh.visible = false; sparkMesh.count = 0; }
    for (const f of flash) f.visible = false;
    fire.clear();
    nodes = null;
  }
  function warm(renderer) { renderer.initTexture?.(glow); renderer.initTexture?.(dot); } // the programs compile with the scene (every object here is in it from the start)
  const state = () => ({ t: F.t, level: F.level, streak: F.streak, lit: F.lit, flare: F.flare, fired: T.fired, last: T.last, next: T.next, smoke: liveN, wheelSparks: liveW, wheels: WH.on ? WH.n : 0, traca: T.on,
    jets: fire.live(), born: fire.born(), flamarada: fire.age, kick: [...kick], flashes: flash.map(f => f.visible), puffs: puffs.filter(p => p.live).map(p => [p.x, p.y, p.z, p.age]),
    wsparks: [...EAGE].map((a, i) => [EX[i], EY[i], EZ[i], a]).filter((p, i) => EAGE[i] < ELIFE[i]) }); // tests only
  return { crema, pump, finish, begin, end, wheels, update, warm, clear, state, get tracaOn() { return T.on; },
    get fireProfile() { return fire.profile; },
    get nozzles() { return nodes ? EM : null; }, // this frame's fire points (world): drac-soot.js reads the held fire's volume
    soot: (x, y, z) => puff(PUFF.soot, x, y, z, 0, 0.15, 0),
    get flare() { return F.flare; }, // the last pass's red mist, 0..1 (drac-show.js thickens the plaça's fog with it)
    clearHaze() { F.flare = hazeOwed = 0; for (const p of puffs) if (p.k === PUFF.flare) p.live = false; }, // back on a menu: gone at once
    get idle() { return !liveN && !liveW && F.t >= WH.until && !F.flare && !F.streak && !F.lit && fire.idle && !kick.some(k => k > 0) && fAge.every((a, i) => a >= fLife[i]); },
    objects: { smoke, sparks: sparkMesh, flash, ...fire.objects } };
}
