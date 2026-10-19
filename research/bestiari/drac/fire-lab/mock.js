// Mock-up for Marc's chosen direction (research only, never imported by the game): the Drac's everyday fire is a
// jet of sparks from each fire point (documented: carretilles / sortidors in the UAF photos), and a special hit fires a
// short, huge FLAMARADA from all five (artistic licence, exaggerated on purpose), then the sparks come back.
// It owns its own script: lab.js asks it for each point's spark level and the phase name, and for a light pulse.
// Same rules as variants.js: pools made once, particles born on the CPU and flown in the vertex shader, one draw call
// per system, `uCount` for the lab's fragment counts.
import * as THREE from 'three';
import { hash as hashSin, COUNT_FRAG, COUNT_ALL, SRGB, FIRE_VIEW, particlePool, PARTICLE_HEAD, FLIGHT } from './variants.js';

// a table of randoms: a spark's eight draws are lookups, not sines (a flamarada's burst spawns ~200 at once)
const RT = Float32Array.from({ length: 16384 }, (_, i) => hashSin(i));
const hash = x => RT[Math.floor(x * 8) & 16383]; // x = counter + a fraction in eighths

// ---- the script (s), one loop: light up, everyday sparks, FLAMARADA, back to sparks, a second one, sparks, out
export const MOCK = {
  loop: 10, flares: [3.0, 6.4], on: [0, 0.5], off: [8.6, 9.3],
  // the flamarada: [length, width] in metres per fire point (two mouths, tail, two wing tips), its life (s)
  flare: [[3.4, 1.8], [3.4, 1.8], [2.6, 1.4], [2.0, 1.1], [2.0, 1.1]], life: 1.1,
  duck: 0.25, back: 0.9, // the sparks under a flamarada drop to `duck` and are full again `back` s after it
};
const smooth = x => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
function sparkLevel(t) { // 0..1, the same for the five points
  const [a, b] = MOCK.on, [c, d] = MOCK.off;
  let k = t < b ? smooth((t - a) / (b - a)) : t < c ? 1 : 1 - smooth((t - c) / (d - c));
  for (const f of MOCK.flares) if (t >= f && t < f + MOCK.back + 0.4) k *= MOCK.duck + (1 - MOCK.duck) * smooth((t - f - 0.4) / MOCK.back);
  return k;
}
export function phaseAt(t) {
  if (t < MOCK.on[1]) return 'Encesa';
  for (const f of MOCK.flares) { if (t >= f && t < f + 0.75) return 'FLAMARADA (llicència artística)'; if (t >= f + 0.75 && t < f + 1.5) return 'Retorn a les guspires'; }
  if (t < MOCK.off[0]) return 'Guspires: foc habitual (documentat)';
  if (t < MOCK.off[1]) return 'Apagada';
  return 'Apagat';
}

// ---- the everyday jet: thin, fast, white-hot sparks falling in arcs, a white mouth; and the flamarada's embers (kind 2)
const JET_POOL = { high: 640, medium: 420, low: 260, minimal: 140 };
function jetMaterial(calm) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDrag: { value: 1.0 }, uGrav: { value: 6.0 }, uTrail: { value: calm ? 0.012 : 0.028 }, uCount: { value: 0 }, uViewH: FIRE_VIEW },
    transparent: true, depthWrite: false,
    vertexShader: PARTICLE_HEAD + `uniform float uTrail, uViewH;
    void main() {` + FLIGHT + `
      vec4 pv = viewMatrix * vec4(pos, 1.0); vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
      float l2 = length(vv.xy); vec2 dir = l2 > 1e-4 ? vv.xy / l2 : vec2(1.0, 0.0), nor = vec2(-dir.y, dir.x);
      float kind = aC.z, sz = aC.y * (kind > 0.5 && kind < 1.5 ? (0.7 + 0.6 * u) : (1.1 - 0.6 * u));
      float px = -pv.z * 2.0 / (projectionMatrix[1][1] * uViewH), wid = max(sz, 1.5 * px);
      float len = max(wid, sz + (kind > 0.5 && kind < 1.5 ? 0.0 : l2 * uTrail * (kind > 1.5 ? 0.6 : 1.0)));
      vec2 c = position.xy;
      pv.xy += dir * (c.x - 0.5) * len + dir * sz * 0.5 + nor * c.y * wid;
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uCount; varying float vU; varying vec2 vUv; varying float vKind; ${SRGB}
    void main() { ${COUNT_ALL}
      float across = abs(vUv.y - 0.5) * 2.0, along = vUv.x;
      bool core = vKind > 0.5 && vKind < 1.5, ember = vKind > 1.5;
      float a = (1.0 - across * across) * (core ? (1.0 - abs(along - 0.5) * 2.0) : (0.3 + 0.7 * along));
      a *= core ? (1.0 - vU) : min(1.0, 1.8 * (1.0 - vU));
      if (a < 0.04) discard;
      ${COUNT_FRAG}
      vec3 white = vec3(1.0, 0.98, 0.88), pale = vec3(1.0, 0.9, 0.55), gold = vec3(1.0, 0.72, 0.2), orange = vec3(1.0, 0.42, 0.08), red = vec3(0.8, 0.16, 0.04);
      vec3 col = core ? white : ember ? (vU < 0.4 ? mix(pale, orange, vU / 0.4) : mix(orange, red, (vU - 0.4) / 0.6))
        : (vU < 0.25 ? mix(white, pale, vU / 0.25) : vU < 0.7 ? mix(pale, gold, (vU - 0.25) / 0.45) : mix(gold, orange, (vU - 0.7) / 0.3));
      gl_FragColor = vec4(toLin(col), a);
      #include <colorspace_fragment>
    }`,
  });
}

// ---- soft smoke: white over the jets, dark out of a flamarada (kind 1); a handful of big quads, so few of them
const SMOKE_POOL = { high: 64, medium: 40, low: 24, minimal: 0 };
function smokeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDrag: { value: 1.6 }, uGrav: { value: -0.5 }, uCount: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: PARTICLE_HEAD + `void main() {` + FLIGHT + `
      vec4 pv = viewMatrix * vec4(pos, 1.0);
      pv.xy += position.xy * aC.y * (0.35 + 0.65 * sqrt(u)) * 2.0;
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uCount; varying float vU; varying vec2 vUv; varying float vKind; ${SRGB}
    void main() { ${COUNT_ALL}
      float r = length(vUv - 0.5) * 2.0, a = (1.0 - smoothstep(0.35, 1.0, r)) * smoothstep(0.0, 0.12, vU) * pow(1.0 - vU, 1.5) * (vKind > 0.5 ? 0.55 : 0.32);
      if (a < 0.02) discard;
      ${COUNT_FRAG}
      gl_FragColor = vec4(toLin(vKind > 0.5 ? vec3(0.27, 0.23, 0.22) : vec3(0.86, 0.85, 0.83)), a);
      #include <colorspace_fragment>
    }`,
  });
}

// ---- the FLAMARADA: one quad per fire point along its direction, cut into big square cells (pixels on a voxel
// world). It punches out past full length in 90 ms, roars, lets go of the nozzle, balloons up as a fireball, cools
// through red to dark smoke cells and crumbles away. Depth-written cutout: one layer, no sorting.
function blastMaterial(calm, octaves) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, defines: { OCTAVES: octaves },
    uniforms: { uTime: { value: 0 }, uCount: { value: 0 }, uCell: { value: 0.09 }, uCalm: { value: calm ? 1 : 0 } },
    vertexShader: `attribute vec4 aP; attribute vec4 aD; attribute vec2 aLW; varying vec2 vUv; varying vec4 vS;
    void main() {
      float age = aD.w;
      if (age < 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      float grow = age < 0.09 ? 1.0 - pow(1.0 - age / 0.09, 3.0) : 1.0;
      float punch = 1.0 + 0.25 * exp(-pow((age - 0.11) / 0.07, 2.0)); // overshoots, then settles
      float L = aLW.x * grow * punch * (1.0 + 0.15 * age), W = aLW.y * (0.5 + 0.5 * grow) * punch * (1.0 + 0.45 * smoothstep(0.3, 1.0, age));
      vec4 pv = viewMatrix * vec4(aP.xyz, 1.0); vec3 av = (viewMatrix * vec4(aD.xyz, 0.0)).xyz;
      float l2 = length(av.xy);
      vec2 dir = normalize(mix(vec2(0.0, 1.0), l2 > 1e-4 ? av.xy / l2 : vec2(0.0, 1.0), smoothstep(0.05, 0.35, l2))), nor = vec2(-dir.y, dir.x);
      // the quad covers only what can be lit: from where the root has let go to the tip, 0.85 of the width (the profile's widest)
      float pinch = smoothstep(0.32, 0.85, age) * 0.75, y = pinch + (position.y + 0.5) * (1.0 - pinch), x = position.x * 2.0 * 0.85, along = (y - 0.05) * L;
      pv.xy += dir * along * max(l2, 0.35) + nor * x * W * 0.5;
      pv.z += av.z * along;
      pv.xyz += (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz * 2.4 * pow(max(0.0, age - 0.3), 1.4); // the loose fireball rises
      vUv = vec2(x, y); vS = vec4(L, W, fract(aP.w), age);
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uTime, uCount, uCell, uCalm; varying vec2 vUv; varying vec4 vS; ${SRGB}
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() { ${COUNT_ALL}
      vec2 cells = max(vec2(4.0, 6.0), vec2(vS.y * 0.5, vS.x) / uCell);
      vec2 q = (floor(vUv * cells) + 0.5) / cells;
      float age = vS.w, t = uCalm > 0.5 ? 0.0 : uTime;
      float n = vn(vec2(q.x * 2.0 + vS.z * 9.0, q.y * 3.0 - t * 9.0));
      #if OCTAVES > 1
      n = n * 0.6 + 0.4 * vn(vec2(q.x * 5.0 - vS.z * 3.0, q.y * 7.0 - t * 15.0));
      #endif
      float pinch = smoothstep(0.32, 0.85, age) * 0.75; // the root lets go of the nozzle
      float yy = (q.y - pinch) / (1.0 - pinch);
      if (yy < 0.0) discard;
      // the outline follows a width profile (a cone out of the nozzle, then a ball), never the quad's sides
      float cone = pow(smoothstep(0.0, 0.14, q.y), 0.7) * pow(max(0.0, 1.0 - q.y), 0.5), ball = pow(sin(3.14159 * clamp(yy, 0.0, 1.0)), 0.6);
      float wp = 0.8 * mix(cone, ball, smoothstep(0.12, 0.5, age)), r = abs(q.x) / max(wp, 0.001);
      float heat = 1.2 * (1.0 - r) + (n - 0.5) * (0.5 + 0.6 * q.y) - smoothstep(0.62, 1.0, age) * 1.2;
      if (heat < 0.05) discard;
      ${COUNT_FRAG}
      float h = heat * (0.4 + 0.8 * (1.0 - smoothstep(0.25, 1.0, age))); // cooling
      vec3 col = h > 0.85 ? vec3(1.0, 0.98, 0.86) : h > 0.62 ? vec3(1.0, 0.86, 0.3) : h > 0.4 ? vec3(1.0, 0.52, 0.08) : h > 0.22 ? vec3(0.9, 0.18, 0.05) : h > 0.12 ? vec3(0.55, 0.16, 0.08) : vec3(0.42, 0.37, 0.35);
      gl_FragColor = vec4(toLin(col), 1.0);
      #include <colorspace_fragment>
    }`,
  });
}
// the flash at each point as it goes off: a square starburst of pixels, 0.16 s, facing the lens
function flashMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uCount: { value: 0 } },
    vertexShader: `attribute vec4 aP; attribute float aAge; varying vec2 vUv; varying float vAge;
    void main() {
      if (aAge < 0.0 || aAge > 0.16) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec4 pv = viewMatrix * vec4(aP.xyz, 1.0);
      pv.xy += position.xy * aP.w;
      vUv = position.xy * 2.0; vAge = aAge / 0.16;
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uCount; varying vec2 vUv; varying float vAge; ${SRGB}
    void main() { ${COUNT_ALL}
      vec2 q = (floor(vUv * 9.0) + 0.5) / 9.0, a = abs(q);
      float r = max(a.x, a.y) * 0.6 + length(q) * 0.4, star = min(a.x, a.y), R = 0.25 + 0.75 * sqrt(vAge);
      bool body = r < R * (1.0 - 0.5 * vAge), ray = star < 0.12 && length(q) < R * 1.25;
      if (!(body || ray) || (vAge > 0.5 && r < R * (vAge - 0.4))) discard; // a hollowing ring as it ends
      ${COUNT_FRAG}
      gl_FragColor = vec4(toLin(r < R * 0.45 ? vec3(1.0) : vec3(1.0, 0.92, 0.55)), 1.0);
      #include <colorspace_fragment>
    }`,
  });
}

// the carretilla itself on each fire point: a short kraft tube (the 2D icon's tube) the jet leaves from; opaque, one draw call
const TUBE = { len: 0.24, w: 0.075 };
function makeTubes(scene) {
  const geo = new THREE.BoxGeometry(TUBE.w, TUBE.w, TUBE.len).translate(0, 0, TUBE.len / 2);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#c49a6c' }), 5);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m);
  return m;
}
const LIFT = 0.4; // added to a flamarada's direction before normalising
const FREE = 0.32; // s: the flamarada lets go of the nozzle (the shader's pinch starts here)
const TM = new THREE.Matrix4(), TQ = new THREE.Quaternion(), TV = new THREE.Vector3(), TZ = new THREE.Vector3(0, 0, 1), TS = new THREE.Vector3(1, 1, 1);

export function makeMock(scene, profile, calm, opts = {}) {
  const size = opts.size ?? 1, tubes = opts.tubes === false ? null : makeTubes(scene);
  // jets + embers
  const nJ = JET_POOL[profile] ?? 420, jm = jetMaterial(calm), jets = particlePool(scene, new THREE.PlaneGeometry(1, 1), nJ, jm);
  jets.mesh.renderOrder = 3;
  const LIFE = 0.55, rate = nJ * 0.85 / (5 * LIFE * 1.05), owe = new Float64Array(5), owc = new Float64Array(5), ows = new Float64Array(5);
  // smoke
  const nS = SMOKE_POOL[profile] ?? 0, sm = nS ? smokeMaterial() : null, smoke = nS ? particlePool(scene, new THREE.PlaneGeometry(1, 1), nS, sm) : null;
  if (smoke) smoke.mesh.renderOrder = 2;
  // flamarada + flash
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); g.instanceCount = 5;
  const BP = new THREE.InstancedBufferAttribute(new Float32Array(20), 4), BD = new THREE.InstancedBufferAttribute(new Float32Array(20), 4), BLW = new THREE.InstancedBufferAttribute(new Float32Array(10), 2);
  for (const a of [BP, BD, BLW]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aP', BP); g.setAttribute('aD', BD); g.setAttribute('aLW', BLW);
  const bm = blastMaterial(calm, profile === 'low' || profile === 'minimal' ? 1 : 2), blast = new THREE.Mesh(g, bm);
  blast.frustumCulled = false; blast.visible = false; scene.add(blast);
  const fg = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); fg.instanceCount = 5;
  const FP = new THREE.InstancedBufferAttribute(new Float32Array(20), 4), FA = new THREE.InstancedBufferAttribute(new Float32Array(5), 1);
  FP.setUsage(THREE.DynamicDrawUsage); FA.setUsage(THREE.DynamicDrawUsage);
  fg.setAttribute('aP', FP); fg.setAttribute('aAge', FA);
  const fm = flashMaterial(), flash = new THREE.Mesh(fg, fm);
  flash.frustumCulled = false; flash.visible = false; scene.add(flash);
  if (calm) flash.layers.disable(0); // reduced motion: no strobe
  let born = 0, lastFlare = -99, burst = -1, lightK = 0;
  const S = { t: 0 };
  return {
    objects: [jets.mesh, ...(smoke ? [smoke.mesh] : []), blast, flash], props: tubes ? [tubes] : [], pool: jets,
    own(E, t) { // the script's spark level on each point (lab.js reads emitters, then this)
      S.t = t % MOCK.loop; const k = sparkLevel(S.t);
      for (let i = 0; i < 5; i++) E[i * 8 + 6] = k;
    },
    phase: () => phaseAt(S.t),
    get light() { return lightK; },
    update(t, dt, E) {
      const lt = S.t;
      jm.uniforms.uTime.value = t; bm.uniforms.uTime.value = t; if (sm) sm.uniforms.uTime.value = t;
      // which flamarada is going (its age), and a new one fires its embers and smoke once
      let age = -1;
      for (const f of MOCK.flares) if (lt >= f && lt < f + MOCK.life) { age = lt - f; if (lastFlare !== f) { lastFlare = f; burst = 0; } }
      if (age < 0 && lt < MOCK.flares[0]) lastFlare = -99;
      for (let i = 0; i < 5; i++) {
        const o = i * 8, k = E[o + 6], dx = E[o + 3], dy = E[o + 4], dz = E[o + 5], s = E[o + 7], sn = Math.sqrt(s / 0.27);
        if (tubes) tubes.setMatrixAt(i, TM.compose(TV.set(E[o], E[o + 1], E[o + 2]), TQ.setFromUnitVectors(TZ, TV.set(dx, dy, dz)), TS));
        const off = tubes ? TUBE.len : 0, px = E[o] + dx * off, py = E[o + 1] + dy * off, pz = E[o + 2] + dz * off; // the jet leaves the tube's open end
        if (k > 0) {
          const sp = (6.5 + 1.5 * k) * sn; // a tight fast jet; the reach shrinks with the level
          owe[i] += rate * k * dt;
          while (owe[i] >= 1) {
            owe[i] -= 1; const b = ++born, back = owe[i] / (rate * k);
            const sx = (hash(b) - 0.5) * 0.17, sy = (hash(b + 0.25) - 0.5) * 0.17, sz = (hash(b + 0.625) - 0.5) * 0.17, v = sp * (0.65 + 0.55 * hash(b + 0.875));
            jets.spawn(t - back, px, py, pz, (dx + sx) * v, (dy + sy) * v, (dz + sz) * v, LIFE * (0.55 + 0.9 * hash(b + 0.125)), hash(b + 0.375), 0.045 * (0.7 + 0.6 * hash(b + 0.75)), 0);
          }
          owc[i] += (calm ? 10 : 30) * k * dt; // the white-hot mouth of the tube
          while (owc[i] >= 1) { owc[i] -= 1; const b = ++born, v = (2.2 + 1.2 * hash(b + 0.625)) * sn; jets.spawn(t, px + dx * 0.02, py + dy * 0.02, pz + dz * 0.02, dx * v, dy * v, dz * v, 0.13, hash(b), (0.06 + 0.03 * hash(b + 0.125)) * sn, 1); } // a short white stem out of the tube
          if (smoke) { ows[i] += 1.6 * k * dt; while (ows[i] >= 1) { ows[i] -= 1; const b = ++born; smoke.spawn(t, px + dx * 0.5, py + dy * 0.5, pz + dz * 0.5, dx * 1.2 + (hash(b) - 0.5) * 0.5, dy * 1.2 + 0.3, dz * 1.2 + (hash(b + 0.5) - 0.5) * 0.5, 1.6 + 0.8 * hash(b + 0.125), hash(b + 0.75), 0.35 + 0.2 * hash(b + 0.875), 0); } }
        } else owe[i] = owc[i] = ows[i] = 0;
        // flamarada quads and flashes
        const [L, W] = MOCK.flare[i];
        if (age < FREE) { // attached to its nozzle until it lets go; from then on the fireball is the world's, not the dancer's
          BP.array[i * 4] = px; BP.array[i * 4 + 1] = py; BP.array[i * 4 + 2] = pz;
          const ux = dx, uy = dy + LIFT, uz = dz, ul = Math.sqrt(ux * ux + uy * uy + uz * uz); // a flamarada climbs a little: never into the floor
          BD.array[i * 4] = ux / ul; BD.array[i * 4 + 1] = uy / ul; BD.array[i * 4 + 2] = uz / ul;
        }
        BP.array[i * 4 + 3] = i * 0.173 + 0.05; BD.array[i * 4 + 3] = age;
        BLW.array[i * 2] = L * size; BLW.array[i * 2 + 1] = W * size;
        FP.array[i * 4] = px + dx * 0.3; FP.array[i * 4 + 1] = py + dy * 0.3; FP.array[i * 4 + 2] = pz + dz * 0.3; FP.array[i * 4 + 3] = 1.7 * W / 1.8 * size;
        FA.array[i] = age;
        if (burst === 0) { // embers flung out of the blast, and dark smoke where the fireball dies
          const n = Math.round(nJ * 0.06);
          for (let j = 0; j < n; j++) {
            const b = ++born, v = (3 + 4.5 * hash(b + 0.875)) * sn * size;
            jets.spawn(t, px, py, pz, (dx + (hash(b) - 0.5) * 1.4) * v, (dy + (hash(b + 0.25) - 0.5) * 1.4 + 0.4) * v, (dz + (hash(b + 0.625) - 0.5) * 1.4) * v, 0.8 + 0.6 * hash(b + 0.125), hash(b + 0.375), 0.07 * (0.7 + 0.6 * hash(b + 0.75)), 2);
          }
          if (smoke) for (let j = 0; j < 2; j++) {
            const b = ++born, d = L * size * (0.45 + 0.2 * j);
            smoke.spawn(t + 0.45 + 0.1 * j, px + dx * d, py + dy * d + 0.6, pz + dz * d, (hash(b) - 0.5) * 0.6, 0.8, (hash(b + 0.5) - 0.5) * 0.6, 1.6, hash(b + 0.75), W * size * 0.42, 1);
          }
        }
      }
      if (burst === 0) burst = 1;
      if (tubes) tubes.instanceMatrix.needsUpdate = true;
      BP.needsUpdate = BD.needsUpdate = BLW.needsUpdate = FP.needsUpdate = FA.needsUpdate = true;
      blast.visible = age >= 0; flash.visible = age >= 0 && age < 0.16;
      lightK = age >= 0 ? Math.exp(-age / 0.14) * (calm ? 0.4 : 1) : 0;
      jets.flush(t); if (smoke) smoke.flush(t);
    },
    live: t => jets.live(t) + (smoke ? smoke.live(t) : 0), clear() { jets.clear(); smoke?.clear(); blast.visible = flash.visible = false; },
    materials: [jm, bm, fm, ...(sm ? [sm] : [])],
  };
}
