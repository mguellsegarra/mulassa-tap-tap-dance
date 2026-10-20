// The Drac's fire out of its five carretilla tubes (models/drac.js fireNode; drac-fx.js says when and how much):
// - the JETS, the documented fire (UAF photos of the Drac, carretilles / sortidors): from each tube's mouth a tight, fast
//   jet of white-gold sparks that fall in arcs, a short white-hot stem at the tube and a little white smoke;
// - the FLAMARADA, an artistic licence on purpose (no source shows the Drac breathing a flame this size): from all five
//   at once a huge pixel flame punches out past full length in 90 ms, lets go of its tube, balloons up as a fireball that
//   stays where it was blown (the dance goes on under it), cools through red to dark smoke and crumbles away in ~1.1 s,
//   with a white starburst at each tube and a shower of embers. Marc (19/10/2026): the mock-up's 0.7 length, wider, and
//   the two mouths' flames one single ball between the snouts.
// Particles are born on the CPU (a few writes a frame, one uploaded range) and flown in the vertex shader from closed forms
// of their age (drag, gravity): no per-particle CPU work after birth, no allocation a frame. The flamarada is one quad per
// fire point cut into square cells (pixels on a voxel world), depth-written: no sorting, no translucent overdraw.
import * as THREE from 'three';

export const DRAC_FIRE = {
  jetLife: 0.55, jetSpeed: 6.5, jetSpread: 0.17, jetSize: 0.045, stem: 30, // s, m/s (at level 0, + 1.5 per level), cone, m, stems a second
  // the flamarada: [length, width (m), round (0 a tongue, 1 a ball from the start)] per quad: the two mouths' one ball (out of
  // their midpoint, along their mean heading; the second mouth draws none), the tail, two wing tips; its life, when it lets
  // go of the tube, how much it climbs (added to its direction), the flash's life (s)
  flare: [[2.0, 1.9, 1], [0, 0, 1], [1.8, 1.25, 0], [1.4, 0.95, 0], [1.4, 0.95, 0]], flareLife: 1.1, flareFree: 0.32, flareLift: 0.4, flash: 0.16,
  smoke: 1.6, embers: 0.06, // white puffs a second per jet at level 1; embers per point per flamarada (share of the pool)
};
// Socket order is models/drac.js: two mouths, tail, two wing tips. Multipliers of the
// dance contract, selected only by an explicit held action; retained through its cooling.
const manualMouth = Object.freeze({ intensity: 1, length: 1, width: 0.65, frequency: 0.35, speed: 0.8, life: 0.8, size: 0.75 });
const manualTail = Object.freeze({ intensity: 0.06, length: 0.18, width: 0.16, frequency: 0.06, speed: 0.25, life: 0.4, size: 0.4 });
const manualWing = Object.freeze({ intensity: 0.035, length: 0.14, width: 0.12, frequency: 0.04, speed: 0.2, life: 0.35, size: 0.35 });
export const DRAC_MANUAL_FIRE = Object.freeze([manualMouth, manualMouth, manualTail, manualWing, manualWing]);
// a table of randoms: a spark's draws are lookups at a counter plus eighths (a flamarada spawns ~200 at once)
const DFIRE_RT = Float32Array.from({ length: 16384 }, (_, i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); });
const dfireRand = x => DFIRE_RT[Math.floor(x * 8) & 16383];

const DFIRE_LIN = 'vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }';
// aA = birth position + birth time, aB = birth velocity + life, aC = seed, size, kind (0 spark, 1 stem, 2 ember)
const DFIRE_FLIGHT = `attribute vec4 aA; attribute vec4 aB; attribute vec4 aC;
  uniform float uTime, uDrag, uGrav, uTrail, uViewH; varying float vU; varying vec2 vUv; varying float vKind;
  void main() {
    float age = uTime - aA.w, u = age / aB.w;
    vU = u; vUv = uv; vKind = aC.z;
    if (u < 0.0 || u >= 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float ek = exp(-uDrag * age), go = (1.0 - ek) / uDrag;
    vec3 pos = aA.xyz + aB.xyz * go; pos.y -= uGrav / uDrag * (age - go);
    vec3 vel = aB.xyz * ek; vel.y -= uGrav / uDrag * (1.0 - ek);
    vec4 pv = viewMatrix * vec4(pos, 1.0); vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
    float l2 = length(vv.xy); vec2 dir = l2 > 1e-4 ? vv.xy / l2 : vec2(1.0, 0.0), nor = vec2(-dir.y, dir.x);
    bool stem = aC.z > 0.5 && aC.z < 1.5;
    float sz = aC.y * (stem ? (0.7 + 0.6 * u) : (1.1 - 0.6 * u));
    float px = -pv.z * 2.0 / (projectionMatrix[1][1] * uViewH), wid = max(sz, 1.5 * px); // a far spark stays a ~1.5 px line
    float len = max(wid, sz + (stem ? 0.0 : l2 * uTrail * (aC.z > 1.5 ? 0.6 : 1.0)));
    pv.xy += dir * (position.x - 0.5) * len + dir * sz * 0.5 + nor * position.y * wid; // a streak along its flight, head first
    gl_Position = projectionMatrix * pv;
  }`;
function dfireJetMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDrag: { value: 1.0 }, uGrav: { value: 6.0 }, uTrail: { value: 0.028 }, uViewH: { value: 800 } },
    transparent: true, depthWrite: false, vertexShader: DFIRE_FLIGHT,
    fragmentShader: `varying float vU; varying vec2 vUv; varying float vKind; ${DFIRE_LIN}
    void main() {
      float across = abs(vUv.y - 0.5) * 2.0, along = vUv.x;
      bool stem = vKind > 0.5 && vKind < 1.5, ember = vKind > 1.5;
      float a = (1.0 - across * across) * (stem ? (1.0 - abs(along - 0.5) * 2.0) : (0.3 + 0.7 * along));
      a *= stem ? (1.0 - vU) : min(1.0, 1.8 * (1.0 - vU));
      if (a < 0.04) discard;
      vec3 white = vec3(1.0, 0.98, 0.88), pale = vec3(1.0, 0.9, 0.55), gold = vec3(1.0, 0.72, 0.2), orange = vec3(1.0, 0.42, 0.08), red = vec3(0.8, 0.16, 0.04);
      vec3 col = stem ? white : ember ? (vU < 0.4 ? mix(pale, orange, vU / 0.4) : mix(orange, red, (vU - 0.4) / 0.6))
        : (vU < 0.25 ? mix(white, pale, vU / 0.25) : vU < 0.7 ? mix(pale, gold, (vU - 0.25) / 0.45) : mix(gold, orange, (vU - 0.7) / 0.3));
      gl_FragColor = vec4(toLin(col), a);
      #include <colorspace_fragment>
    }`,
  });
}
// the flamarada's quad: along the flame's projected direction, facing the lens; only the part that can be lit (from where
// the root has let go to the tip, 0.85 of the width); punches out, settles, swells and rises once loose
function dfireBlastMaterial(octaves) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, defines: { OCTAVES: octaves },
    uniforms: { uTime: { value: 0 }, uCell: { value: 0.09 } },
    vertexShader: `attribute vec4 aP; attribute vec4 aD; attribute vec3 aLW; varying vec2 vUv; varying vec4 vS; varying float vRound;
    void main() {
      float age = aD.w;
      if (age < 0.0 || aLW.x <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vRound = aLW.z;
      float grow = age < 0.09 ? 1.0 - pow(1.0 - age / 0.09, 3.0) : 1.0, punch = 1.0 + 0.25 * exp(-pow((age - 0.11) / 0.07, 2.0));
      float L = aLW.x * grow * punch * (1.0 + 0.15 * age), W = aLW.y * (0.5 + 0.5 * grow) * punch * (1.0 + 0.45 * smoothstep(0.3, 1.0, age));
      vec4 pv = viewMatrix * vec4(aP.xyz, 1.0); vec3 av = (viewMatrix * vec4(aD.xyz, 0.0)).xyz;
      float l2 = length(av.xy);
      vec2 dir = normalize(mix(vec2(0.0, 1.0), l2 > 1e-4 ? av.xy / l2 : vec2(0.0, 1.0), smoothstep(0.05, 0.35, l2))), nor = vec2(-dir.y, dir.x);
      float pinch = smoothstep(0.32, 0.85, age) * 0.75, y = pinch + (position.y + 0.5) * (1.0 - pinch), x = position.x * 1.7, along = (y - 0.05) * L;
      pv.xy += dir * along * max(l2, 0.35) + nor * x * W * 0.5;
      pv.z += av.z * along;
      pv.xyz += (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz * 2.4 * pow(max(0.0, age - 0.3), 1.4); // the loose fireball rises
      vUv = vec2(x, y); vS = vec4(L, W, fract(aP.w), age);
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uTime, uCell; varying vec2 vUv; varying vec4 vS; varying float vRound; ${DFIRE_LIN}
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 cells = max(vec2(4.0, 6.0), vec2(vS.y * 0.5, vS.x) / uCell);
      vec2 q = (floor(vUv * cells) + 0.5) / cells; // square cells of uCell metres
      float age = vS.w;
      float n = vn(vec2(q.x * 2.0 + vS.z * 9.0, q.y * 3.0 - uTime * 9.0));
      #if OCTAVES > 1
      n = n * 0.6 + 0.4 * vn(vec2(q.x * 5.0 - vS.z * 3.0, q.y * 7.0 - uTime * 15.0));
      #endif
      float pinch = smoothstep(0.32, 0.85, age) * 0.75, yy = (q.y - pinch) / (1.0 - pinch); // the root lets go of the tube
      if (yy < 0.0) discard;
      // the outline follows a width profile (a cone out of the tube, then a ball), never the quad's sides
      float cone = pow(smoothstep(0.0, 0.14, q.y), 0.7) * pow(max(0.0, 1.0 - q.y), 0.5), ball = pow(sin(3.14159 * clamp(yy, 0.0, 1.0)), 0.6);
      float wp = 0.8 * mix(cone, ball, max(vRound, smoothstep(0.12, 0.5, age))), r = abs(q.x) / max(wp, 0.001);
      float heat = 1.2 * (1.0 - r) + (n - 0.5) * (0.5 + 0.6 * q.y) - smoothstep(0.62, 1.0, age) * 1.2;
      if (heat < 0.05) discard;
      float h = heat * (0.4 + 0.8 * (1.0 - smoothstep(0.25, 1.0, age))); // cooling
      vec3 col = h > 0.85 ? vec3(1.0, 0.98, 0.86) : h > 0.62 ? vec3(1.0, 0.86, 0.3) : h > 0.4 ? vec3(1.0, 0.52, 0.08) : h > 0.22 ? vec3(0.9, 0.18, 0.05) : h > 0.12 ? vec3(0.55, 0.16, 0.08) : vec3(0.42, 0.37, 0.35);
      gl_FragColor = vec4(toLin(col), 1.0);
      #include <colorspace_fragment>
    }`,
  });
}
// the flash at each tube as it goes off: a square starburst of pixels facing the lens, hollowing as it ends
function dfireFlashMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uLife: { value: DRAC_FIRE.flash } },
    vertexShader: `attribute vec4 aP; attribute float aAge; uniform float uLife; varying vec2 vUv; varying float vAge;
    void main() {
      if (aAge < 0.0 || aAge > uLife) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec4 pv = viewMatrix * vec4(aP.xyz, 1.0);
      pv.xy += position.xy * aP.w;
      vUv = position.xy * 2.0; vAge = aAge / uLife;
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `varying vec2 vUv; varying float vAge; ${DFIRE_LIN}
    void main() {
      vec2 q = (floor(vUv * 9.0) + 0.5) / 9.0, a = abs(q);
      float r = max(a.x, a.y) * 0.6 + length(q) * 0.4, R = 0.25 + 0.75 * sqrt(vAge);
      bool body = r < R * (1.0 - 0.5 * vAge), ray = min(a.x, a.y) < 0.12 && length(q) < R * 1.25;
      if (!(body || ray) || (vAge > 0.5 && r < R * (vAge - 0.4))) discard;
      gl_FragColor = vec4(toLin(r < R * 0.45 ? vec3(1.0) : vec3(1.0, 0.92, 0.55)), 1.0);
      #include <colorspace_fragment>
    }`,
  });
}
const dfireAttr = (n, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * k), k); a.setUsage(THREE.DynamicDrawUsage); return a; };
const dfireQuads = (n, attrs, mat) => {
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = n;
  for (const k in attrs) g.setAttribute(k, attrs[k]);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.visible = false;
  return m;
};

// opts: { jets: spark pool (PROFILES jets), octaves: the flamarada's noise (1 on low tiers), calm: a reduced-motion query
// ({ matches }), puff(dark, at, vel, age): white jet smoke / the fireball's dark smoke through drac-fx's pool }
export function createDracFire(scene, opts = {}) {
  const n = Math.max(0, opts.jets | 0), calm = opts.calm ?? { matches: false }, puff = opts.puff ?? (() => {});
  // ---- the jets' pool (and the flamarada's embers): a ring, written as particles are born
  const JA = dfireAttr(n, 4), JB = dfireAttr(n, 4), JC = dfireAttr(n, 4), jm = dfireJetMaterial();
  for (let i = 0; i < n; i++) { JA.array[i * 4 + 3] = -99; JB.array[i * 4 + 3] = 1; }
  const jets = n ? dfireQuads(n, { aA: JA, aB: JB, aC: JC }, jm) : null;
  if (jets) { jets.renderOrder = 3; scene.add(jets); }
  const J = { cur: 0, lo: n, hi: -1, born: 0, cap: n }; // the ring's cursor, the range written this frame (integers: no boxing)
  const TT = new Float64Array([0, -99, -99]); // the clock, the flamarada's start, the last spark's death (doubles in a typed row, not object fields: no heap numbers)
  const NEW = new Float32Array(11); // the particle being born: x y z vx vy vz t0 life seed size kind (no doubles boxed in calls)
  function spawn() {
    if (!J.cap) return;
    const i = J.cur, o = i * 4; J.cur = (J.cur + 1) % J.cap;
    JA.array[o] = NEW[0]; JA.array[o + 1] = NEW[1]; JA.array[o + 2] = NEW[2]; JA.array[o + 3] = NEW[6];
    JB.array[o] = NEW[3]; JB.array[o + 1] = NEW[4]; JB.array[o + 2] = NEW[5]; JB.array[o + 3] = NEW[7];
    JC.array[o] = NEW[8]; JC.array[o + 1] = NEW[9]; JC.array[o + 2] = NEW[10];
    if (i < J.lo) J.lo = i; if (i > J.hi) J.hi = i;
    if (NEW[6] + NEW[7] > TT[2]) TT[2] = NEW[6] + NEW[7];
  }
  // ---- the flamarada and its flash: one quad each per fire point
  const BP = dfireAttr(5, 4), BD = dfireAttr(5, 4), BLW = dfireAttr(5, 3), FP = dfireAttr(5, 4), FA = dfireAttr(5, 1);
  for (let i = 0; i < 5; i++) { BD.array[i * 4 + 3] = -1; FA.array[i] = -1; for (let k = 0; k < 3; k++) BLW.array[i * 3 + k] = DRAC_FIRE.flare[i][k]; }
  const bm = dfireBlastMaterial(opts.octaves ?? 2), blast = dfireQuads(5, { aP: BP, aD: BD, aLW: BLW }, bm), flash = dfireQuads(5, { aP: FP, aAge: FA }, dfireFlashMaterial());
  scene.add(blast, flash);
  const S = { burst: false, smoked: false, held: false, manual: false };
  const owe = new Float64Array(5), ows = new Float64Array(5), owc = new Float64Array(5);
  const AT = new THREE.Vector3(), VEL = new THREE.Vector3();
  const age = () => S.held ? Math.min(TT[0] - TT[1], 0.2) : TT[0] - TT[1];

  // E: per fire point [x, y, z (its tube's mouth), dx, dy, dz (unit), jet level, nominal size (m)], 8 floats each
  function update(dt, t, E, viewH, held = false) {
    TT[0] = t;
    held = held && !!E;
    // A free-mode hold keeps the existing flame attached at its hot, full-size phase.
    // Releasing resumes its normal cooling/detachment; no more sparks are emitted by the hold.
    if (held && !S.held) { TT[1] = t - dt; S.burst = true; S.smoked = false; S.manual = true; }
    else if (!held && S.held) { TT[1] = t - Math.min(t - TT[1], 0.2); S.burst = false; }
    S.held = held;
    jm.uniforms.uTime.value = bm.uniforms.uTime.value = t; jm.uniforms.uViewH.value = viewH || 800;
    jm.uniforms.uTrail.value = calm.matches ? 0.012 : 0.028;
    const a = held ? Math.min(t - TT[1], 0.2) : t - TT[1], live = a >= 0 && a < DRAC_FIRE.flareLife;
    if (E) for (let i = 0; i < 5; i++) {
      const profile = S.manual ? DRAC_MANUAL_FIRE[i] : null;
      const o = i * 8, k = E[o + 6], dx = E[o + 3], dy = E[o + 4], dz = E[o + 5], sn = Math.sqrt(E[o + 7] / 0.27);
      const frequency = profile ? profile.frequency : 1, speed = profile ? profile.speed : 1, life = profile ? profile.life : 1, size = profile ? profile.size : 1;
      if (k > 0 && J.cap) {
        const rate = J.cap * 0.85 / (5 * DRAC_FIRE.jetLife * 1.05), sp = (DRAC_FIRE.jetSpeed + 1.5 * Math.min(k, 2)) * sn * speed;
        const emission = Math.min(k, 2.5) * frequency;
        owe[i] += rate * emission * dt;
        while (owe[i] >= 1) {
          owe[i] -= 1; const b = ++J.born, v = sp * (0.65 + 0.55 * dfireRand(b + 0.875)), s = DRAC_FIRE.jetSpread;
          NEW[0] = E[o]; NEW[1] = E[o + 1]; NEW[2] = E[o + 2];
          NEW[3] = (dx + (dfireRand(b) - 0.5) * s) * v; NEW[4] = (dy + (dfireRand(b + 0.25) - 0.5) * s) * v; NEW[5] = (dz + (dfireRand(b + 0.625) - 0.5) * s) * v;
          NEW[6] = t - owe[i] / (rate * (profile ? emission : k)); NEW[7] = DRAC_FIRE.jetLife * life * (0.55 + 0.9 * dfireRand(b + 0.125));
          NEW[8] = dfireRand(b + 0.375); NEW[9] = DRAC_FIRE.jetSize * size * (0.7 + 0.6 * dfireRand(b + 0.75)); NEW[10] = 0;
          spawn();
        }
        owc[i] += (calm.matches ? 10 : DRAC_FIRE.stem) * Math.min(k, 1.5) * frequency * dt; // the white-hot stem at the tube's mouth
        while (owc[i] >= 1) {
          owc[i] -= 1; const b = ++J.born, v = (2.2 + 1.2 * dfireRand(b + 0.625)) * sn * speed;
          NEW[0] = E[o] + dx * 0.02; NEW[1] = E[o + 1] + dy * 0.02; NEW[2] = E[o + 2] + dz * 0.02; NEW[3] = dx * v; NEW[4] = dy * v; NEW[5] = dz * v;
          NEW[6] = t; NEW[7] = 0.13 * life; NEW[8] = dfireRand(b); NEW[9] = (0.06 + 0.03 * dfireRand(b + 0.125)) * sn * size; NEW[10] = 1;
          spawn();
        }
        ows[i] += (profile ? 0 : DRAC_FIRE.smoke) * Math.min(k, 1.5) * dt; // a little white smoke along the jet
        while (ows[i] >= 1) {
          ows[i] -= 1; const b = ++J.born;
          AT.set(E[o] + dx * 0.5, E[o + 1] + dy * 0.5, E[o + 2] + dz * 0.5); VEL.set(dx * 1.2 + (dfireRand(b) - 0.5) * 0.5, dy * 1.2 + 0.3, dz * 1.2 + (dfireRand(b + 0.5) - 0.5) * 0.5);
          puff(false, AT, VEL, 0);
        }
      } else owe[i] = owc[i] = ows[i] = 0;
      BLW.array[i * 3] = DRAC_FIRE.flare[i][0] * (profile ? profile.length : 1);
      BLW.array[i * 3 + 1] = DRAC_FIRE.flare[i][1] * (profile ? profile.width : 1);
      // the flamarada: on its tube until it lets go, then the world's (it no longer follows the dance)
      if (live && a < DRAC_FIRE.flareFree) {
        // the two mouths fire one ball, out of their midpoint along their mean heading (quad 0; quad 1 draws nothing)
        const m = i === 0 ? 0.5 : 1, q = i === 0 ? 8 : o, x = E[o] * m + E[q] * (1 - m), y = E[o + 1] * m + E[q + 1] * (1 - m), z = E[o + 2] * m + E[q + 2] * (1 - m);
        const fx = dx * m + E[q + 3] * (1 - m), fz = dz * m + E[q + 5] * (1 - m), uy = dy * m + E[q + 4] * (1 - m) + DRAC_FIRE.flareLift, ul = Math.sqrt(fx * fx + uy * uy + fz * fz); // it climbs a little: never into the floor
        BP.array[i * 4] = x; BP.array[i * 4 + 1] = y; BP.array[i * 4 + 2] = z; BP.array[i * 4 + 3] = i * 0.173 + 0.05;
        BD.array[i * 4] = fx / ul; BD.array[i * 4 + 1] = uy / ul; BD.array[i * 4 + 2] = fz / ul;
        FP.array[i * 4] = x + dx * 0.3; FP.array[i * 4 + 1] = y + dy * 0.3; FP.array[i * 4 + 2] = z + dz * 0.3; FP.array[i * 4 + 3] = 1.7 * BLW.array[i * 3 + 1] / 1.8;
      }
      BD.array[i * 4 + 3] = live ? a : -1; FA.array[i] = live && !calm.matches && DRAC_FIRE.flare[i][0] > 0 ? a : -1; // reduced motion: no strobe
      if (S.burst && !S.manual) { // a shower of embers out of the blast
        for (let j = Math.round(J.cap * DRAC_FIRE.embers); j > 0; j--) {
          const b = ++J.born, v = (3 + 4.5 * dfireRand(b + 0.875)) * sn;
          NEW[0] = E[o]; NEW[1] = E[o + 1]; NEW[2] = E[o + 2];
          NEW[3] = (dx + (dfireRand(b) - 0.5) * 1.4) * v; NEW[4] = (dy + (dfireRand(b + 0.25) - 0.5) * 1.4 + 0.4) * v; NEW[5] = (dz + (dfireRand(b + 0.625) - 0.5) * 1.4) * v;
          NEW[6] = t; NEW[7] = 0.8 + 0.6 * dfireRand(b + 0.125); NEW[8] = dfireRand(b + 0.375); NEW[9] = 0.07 * (0.7 + 0.6 * dfireRand(b + 0.75)); NEW[10] = 2;
          spawn();
        }
      }
      if (!S.manual && live && !S.smoked && a >= 0.45 && DRAC_FIRE.flare[i][0] > 0) for (let j = 0; j < 2; j++) { // where the fireball dies, dark smoke
        const d = DRAC_FIRE.flare[i][0] * (0.45 + 0.2 * j);
        AT.set(BP.array[i * 4] + BD.array[i * 4] * d, BP.array[i * 4 + 1] + BD.array[i * 4 + 1] * d + 0.6, BP.array[i * 4 + 2] + BD.array[i * 4 + 2] * d); VEL.set(0, 0.8, 0);
        puff(true, AT, VEL, 0);
      }
    }
    if (E) S.burst = false;
    if (live && a >= 0.45) S.smoked = true;
    blast.visible = live; flash.visible = live && a < DRAC_FIRE.flash && !calm.matches;
    BLW.needsUpdate = BP.needsUpdate = BD.needsUpdate = FP.needsUpdate = FA.needsUpdate = true;
    if (jets) {
      if (J.hi >= J.lo) JA.needsUpdate = JB.needsUpdate = JC.needsUpdate = true; // the whole pool (<= 30 kB): update ranges allocate (ours and three's sort)
      J.lo = n; J.hi = -1;
      jets.visible = t < TT[2];
    }
  }
  return {
    update,
    // all five at once; another while one burns is ignored (one quad per point: a restart would pop the loose fireball)
    flamarada() { if (age() >= 0 && age() < DRAC_FIRE.flareLife) return false; S.manual = false; TT[1] = TT[0]; S.burst = true; S.smoked = false; return true; },
    cap(c) { J.cap = Math.max(0, Math.min(n, c | 0)); if (J.cur >= J.cap) J.cur = 0; }, // a quality step down: fewer live sparks
    clear() {
      for (let i = 0; i < n; i++) JA.array[i * 4 + 3] = -99;
      if (jets) { JA.needsUpdate = true; jets.visible = false; }
      TT[1] = TT[2] = -99; S.held = S.burst = S.manual = false; owe.fill(0); ows.fill(0); owc.fill(0);
      blast.visible = flash.visible = false;
    },
    get profile() { return S.manual ? DRAC_MANUAL_FIRE : null; },
    get age() { const a = age(); return a >= 0 && a < DRAC_FIRE.flareLife ? a : -1; },
    get idle() { return TT[0] >= TT[2] && !(age() >= 0 && age() < DRAC_FIRE.flareLife); },
    live() { let c = 0; for (let i = 0; i < n; i++) { const a = TT[0] - JA.array[i * 4 + 3]; if (a >= 0 && a < JB.array[i * 4 + 3]) c++; } return c; }, // tests only
    born: () => J.born, // tests only
    objects: { jets, blast, flash },
  };
}
