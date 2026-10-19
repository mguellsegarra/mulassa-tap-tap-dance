// Four candidate treatments for the Drac's nozzle fire (research prototype; the game keeps models/drac.js fireNode).
// Every variant reads the same five emitters a frame (world nozzle, world direction, level k from drac-fx, nominal
// size) and draws them its own way. Pools are made once; particles are born on the CPU (a few writes a frame, one
// uploaded range) and moved in the vertex shader from closed forms of their age: no per-frame allocation, no per-particle
// CPU work after birth. Each material has a `uCount` switch so the lab can count shaded fragments (overdraw).
import * as THREE from 'three';

const hash = i => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const COUNT_FRAG = 'if (uCount > 0.5) { gl_FragColor = vec4(1.0 / 255.0); return; }';
const COUNT_ALL = 'if (uCount > 1.5) { gl_FragColor = vec4(1.0 / 255.0); return; }'; // every rasterised fragment, before any cutout
const SRGB = 'vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }';
export const FIRE_VIEW = { value: 800 }; // the drawing buffer's height (px): sparks never get thinner than ~1.5 px

// ---------------------------------------------------------------- particle pool (A sparks, B voxels, D fringe)
// aA = birth position + birth time, aB = birth velocity + life, aC = seed, size, kind, spare
function particlePool(scene, geo, n, mat) {
  const g = new THREE.InstancedBufferGeometry().copy(geo);
  g.instanceCount = n;
  const mk = () => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); a.setUsage(THREE.DynamicDrawUsage); return a; };
  const A = mk(), B = mk(), C = mk();
  for (let i = 0; i < n; i++) { A.array[i * 4 + 3] = -99; B.array[i * 4 + 3] = 1; } // all dead
  g.setAttribute('aA', A); g.setAttribute('aB', B); g.setAttribute('aC', C);
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.visible = false;
  scene.add(mesh);
  let cur = 0, lo = n, hi = -1, last = -99; // the ring's write cursor, this frame's written range
  return {
    mesh, n,
    spawn(t0, px, py, pz, vx, vy, vz, life, seed, size, kind) {
      const i = cur; cur = (cur + 1) % n;
      const o = i * 4;
      A.array[o] = px; A.array[o + 1] = py; A.array[o + 2] = pz; A.array[o + 3] = t0;
      B.array[o] = vx; B.array[o + 1] = vy; B.array[o + 2] = vz; B.array[o + 3] = life;
      C.array[o] = seed; C.array[o + 1] = size; C.array[o + 2] = kind;
      if (i < lo) lo = i; if (i > hi) hi = i;
      if (t0 + life > last) last = t0 + life;
    },
    flush(t) { // upload only what was written (one range: lo..hi, wraps upload the whole span)
      if (hi >= lo) for (const a of [A, B, C]) { a.clearUpdateRanges(); a.addUpdateRange(lo * 4, (hi - lo + 1) * 4); a.needsUpdate = true; }
      lo = n; hi = -1;
      mesh.visible = t < last;
    },
    live(t) { let c = 0; for (let i = 0; i < n; i++) { const a = t - A.array[i * 4 + 3]; if (a >= 0 && a < B.array[i * 4 + 3]) c++; } return c; },
    clear() { for (let i = 0; i < n; i++) A.array[i * 4 + 3] = -99; A.clearUpdateRanges(); A.needsUpdate = true; last = -99; mesh.visible = false; },
  };
}

const PARTICLE_HEAD = `
attribute vec4 aA; attribute vec4 aB; attribute vec4 aC;
uniform float uTime, uDrag, uGrav;
varying float vU; varying vec2 vUv; varying float vKind;
`;
// closed-form flight with drag and gravity (negative gravity = buoyancy)
const FLIGHT = `
  float age = uTime - aA.w, u = age / aB.w;
  vU = u; vUv = uv; vKind = aC.z;
  if (u < 0.0 || u >= 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float ek = exp(-uDrag * age), go = (1.0 - ek) / uDrag;
  vec3 pos = aA.xyz + aB.xyz * go; pos.y -= uGrav / uDrag * (age - go);
  vec3 vel = aB.xyz * ek; vel.y -= uGrav / uDrag * (1.0 - ek);
`;

// ---------------------------------------------------------------- A: carretilla (a jet of sparks and a hot mouth)
// The real thing: fireworks fixed on the nozzles spit a dense jet of gold sparks that arc down, with a white-hot mouth.
// Streaks along their screen velocity (a spark's motion blur), normal alpha (they must read on the sunny floor).
function sparkMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDrag: { value: 1.1 }, uGrav: { value: 5.5 }, uTrail: { value: 0.07 }, uCount: { value: 0 }, uViewH: FIRE_VIEW },
    transparent: true, depthWrite: false,
    vertexShader: PARTICLE_HEAD + `uniform float uTrail, uViewH;
    void main() {` + FLIGHT + `
      vec4 pv = viewMatrix * vec4(pos, 1.0); vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
      float l2 = length(vv.xy); vec2 dir = l2 > 1e-4 ? vv.xy / l2 : vec2(1.0, 0.0), nor = vec2(-dir.y, dir.x);
      float core = aC.z, sz = aC.y * (core > 0.5 ? (0.6 + 0.8 * u) : (1.15 - 0.7 * u));
      float px = -pv.z * 2.0 / (projectionMatrix[1][1] * uViewH), wid = max(sz, 1.5 * px); // a far spark stays a visible line
      float len = max(wid, sz + (core > 0.5 ? 0.0 : l2 * uTrail));
      vec2 c = position.xy; // -0.5..0.5: x along the streak (head at +0.5), y across
      pv.xy += dir * (c.x - 0.5) * len + dir * sz * 0.5 + nor * c.y * wid;
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uCount; varying float vU; varying vec2 vUv; varying float vKind; ${SRGB}
    void main() { ${COUNT_ALL}
      float across = abs(vUv.y - 0.5) * 2.0, along = vUv.x;
      float a = (1.0 - across * across) * (vKind > 0.5 ? (1.0 - abs(along - 0.5) * 2.0) : (0.25 + 0.75 * along));
      a *= vKind > 0.5 ? (1.0 - vU) : min(1.0, 1.7 * (1.0 - vU));
      if (a < 0.04) discard;
      ${COUNT_FRAG}
      vec3 hot = vec3(1.0, 0.97, 0.78), gold = vec3(1.0, 0.76, 0.22), red = vec3(0.92, 0.22, 0.04);
      vec3 col = vKind > 0.5 ? mix(hot, gold, 0.4 + 0.6 * vU) : (vU < 0.12 ? mix(hot, gold, vU / 0.12) : vU < 0.55 ? gold : mix(gold, red, (vU - 0.55) / 0.45));
      gl_FragColor = vec4(toLin(col), a);
      #include <colorspace_fragment>
    }`,
  });
}
const SPARK_POOL = { high: 480, medium: 320, low: 200, minimal: 100 };
export function makeSparks(scene, profile, calm, opts = {}) {
  const scale = opts.scale ?? 1, n = Math.round((SPARK_POOL[profile] ?? 240) * scale);
  const mat = sparkMaterial(), pool = particlePool(scene, new THREE.PlaneGeometry(1, 1), n, mat);
  if (calm) mat.uniforms.uTrail.value = 0.015;
  const owe = new Float64Array(5), owc = new Float64Array(5);
  let born = 0;
  const LIFE = 0.5, CORE = calm ? 0 : 1;
  // sparks per second per emitter at k = 1, so 5 emitters at the CREMA's k = 4 keep the pool about full
  const rate = n * 1.3 / (5 * 4 * LIFE) * (opts.rate ?? 1); // (the CREMA's first instant overcommits a little: the oldest, dimmest sparks go first)
  return {
    objects: [pool.mesh], pool,
    update(t, dt, E) {
      mat.uniforms.uTime.value = t;
      for (let i = 0; i < 5; i++) {
        const o = i * 8, k = E[o + 6];
        if (k <= 0) { owe[i] = owc[i] = 0; continue; }
        const px = E[o], py = E[o + 1], pz = E[o + 2], dx = E[o + 3], dy = E[o + 4], dz = E[o + 5], s = E[o + 7];
        const sp = (4.2 + 2.8 * Math.sqrt(Math.min(k, 4))) * (s / 0.27); // reach grows with the level, sub-linearly
        owe[i] += rate * Math.min(k, 4) * dt;
        while (owe[i] >= 1) {
          owe[i] -= 1; const b = ++born, back = owe[i] / (rate * k);
          const sx = (hash(b) - 0.5) * 0.3, sy = (hash(b + 0.3) - 0.5) * 0.3, sz = (hash(b + 0.6) - 0.5) * 0.3, v = sp * (0.7 + 0.5 * hash(b + 0.9));
          pool.spawn(t - back, px, py, pz, (dx + sx) * v, (dy + sy) * v, (dz + sz) * v, LIFE * (0.6 + 0.8 * hash(b + 0.15)), hash(b + 0.45), 0.06 * (0.7 + 0.6 * hash(b + 0.75)), 0);
        }
        owc[i] += 18 * CORE * Math.min(1, k) * dt; // the white-hot mouth: short, slow, fat puffs of light
        while (owc[i] >= 1) {
          owc[i] -= 1; const b = ++born, v = 0.9 * s / 0.27;
          pool.spawn(t, px + dx * 0.04, py + dy * 0.04, pz + dz * 0.04, dx * v, dy * v, dz * v, 0.12, hash(b), (0.09 + 0.04 * hash(b + 0.2)) * Math.min(1.4, 0.6 + 0.3 * k) * s / 0.27, 1);
        }
      }
      pool.flush(t);
    },
    live: t => pool.live(t), clear: () => pool.clear(), materials: [mat],
  };
}

// ---------------------------------------------------------------- B: voxel fire (a stream of glowing cubes)
// Small unlit cubes born in the nozzle that swell, rise and cool through a stepped palette (white, gold, orange, red,
// then a dark smoke cube) and shrink away. Opaque and depth-written: no sorting, no blending, no translucent overdraw.
const VOXEL_POOL = { high: 240, medium: 170, low: 110, minimal: 60 };
export function makeVoxels(scene, profile, calm) {
  const n = VOXEL_POOL[profile] ?? 170;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDrag: { value: 1.8 }, uGrav: { value: -1.6 }, uSpin: { value: calm ? 0 : 1 }, uCount: { value: 0 } },
    vertexShader: PARTICLE_HEAD + `uniform float uSpin; varying vec3 vCol;
    vec3 rot(vec3 p, vec3 ax, float a) { float c = cos(a), s = sin(a); return p * c + cross(ax, p) * s + ax * dot(ax, p) * (1.0 - c); }
    void main() {` + FLIGHT + `
      float sd = aC.x;
      pos.x += sin(sd * 40.0 + age * 9.0) * 0.05 * age * uSpin; pos.z += cos(sd * 31.0 + age * 8.0) * 0.05 * age * uSpin;
      float s = aC.y * (0.3 + 0.7 * smoothstep(0.0, 0.3, u)) * (1.0 - 0.85 * smoothstep(0.55, 1.0, u)); // born small in the nozzle
      vec3 ax = normalize(vec3(sd - 0.5, 0.7, fract(sd * 7.3) - 0.5));
      float ang = sd * 6.2832 + age * 2.5 * uSpin;
      vec3 p = rot(position * s, ax, ang), nr = rot(normal, ax, ang);
      // a stepped palette by age: white, gold, orange, red, then a smoke cube
      vec3 col = u < 0.08 ? vec3(1.0, 0.95, 0.7) : u < 0.26 ? vec3(1.0, 0.78, 0.2) : u < 0.5 ? vec3(1.0, 0.48, 0.1) : u < 0.74 ? vec3(0.84, 0.2, 0.08) : vec3(0.3, 0.26, 0.25);
      vCol = col * (0.78 + 0.22 * clamp(dot(nr, vec3(0.3, 0.85, 0.42)), 0.0, 1.0)); // faces a little apart, so a cube reads as a cube
      gl_Position = projectionMatrix * viewMatrix * vec4(pos + p, 1.0);
    }`,
    fragmentShader: `uniform float uCount; varying vec3 vCol; ${SRGB}
    void main() { ${COUNT_ALL} ${COUNT_FRAG} gl_FragColor = vec4(toLin(vCol), 1.0);
      #include <colorspace_fragment>
    }`,
  });
  const pool = particlePool(scene, new THREE.BoxGeometry(1, 1, 1), n, mat);
  const owe = new Float64Array(5), LIFE = 0.5;
  const rate = n * 0.95 / (5 * 1.6 * LIFE); // 5 emitters at k = 1.6 fill it: the CREMA's peak recycles the oldest, already shrunk smoke cubes
  let born = 0;
  return {
    objects: [pool.mesh], pool,
    update(t, dt, E) {
      mat.uniforms.uTime.value = t;
      for (let i = 0; i < 5; i++) {
        const o = i * 8, k = E[o + 6];
        if (k <= 0) { owe[i] = 0; continue; }
        const px = E[o], py = E[o + 1], pz = E[o + 2], dx = E[o + 3], dy = E[o + 4], dz = E[o + 5], s = E[o + 7];
        const sp = (3.0 + 2.0 * Math.sqrt(Math.min(k, 4))) * (s / 0.27);
        owe[i] += rate * Math.min(k, 4) * dt;
        while (owe[i] >= 1) {
          owe[i] -= 1; const b = ++born, back = owe[i] / (rate * k);
          const sx = (hash(b) - 0.5) * 0.45, sy = (hash(b + 0.3) - 0.5) * 0.45, sz = (hash(b + 0.6) - 0.5) * 0.45, v = sp * (0.75 + 0.5 * hash(b + 0.9));
          pool.spawn(t - back, px + dx * 0.03, py + dy * 0.03, pz + dz * 0.03, (dx + sx) * v, (dy + sy) * v, (dz + sz) * v,
            LIFE * (0.7 + 0.6 * hash(b + 0.15)), hash(b + 0.45), (0.065 + 0.055 * hash(b + 0.75)) * Math.sqrt(s / 0.27) * Math.min(1.3, 0.8 + 0.15 * k), 0); // (sqrt: the wing tips' cubes still read)
        }
      }
      pool.flush(t);
    },
    live: t => pool.live(t), clear: () => pool.clear(), materials: [mat],
  };
}

// ---------------------------------------------------------------- C: pixel tongue (one shader quad per nozzle)
// A quad along the flame's projected direction, facing the lens; a value noise scrolling out of the nozzle shapes a
// flame cut out in square cells of fixed world size (pixels on a voxel world), coloured in four flat bands. Alpha-tested
// and depth-written: no sorting, one layer of fragments. Growth = its length; a weak flame breaks up at the tip.
function tongueMaterial(octaves) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uCount: { value: 0 }, uCell: { value: 0.06 } },
    defines: { OCTAVES: octaves },
    vertexShader: `attribute vec4 aP; attribute vec4 aD; attribute vec2 aLW; varying vec2 vUv; varying vec4 vS;
    // aP: nozzle (xyz) + seed; aD: direction (xyz) + level k; aLW: length, width (m)
    void main() {
      float k = aD.w;
      vec4 pv = viewMatrix * vec4(aP.xyz, 1.0); vec3 av = (viewMatrix * vec4(aD.xyz, 0.0)).xyz;
      float l2 = length(av.xy);
      vec2 dir = normalize(mix(vec2(0.0, 1.0), l2 > 1e-4 ? av.xy / l2 : vec2(0.0, 1.0), smoothstep(0.05, 0.35, l2))), nor = vec2(-dir.y, dir.x);
      float len = aLW.x, wid = aLW.y;
      float y = position.y + 0.5, x = position.x * 2.0; // 0..1 along (root slightly inside the nozzle), -1..1 across
      float along = (y - 0.08) * len;
      pv.xy += dir * along * max(l2, 0.35) + nor * x * wid * 0.5;
      pv.z += av.z * along;
      vUv = vec2(x, y); vS = vec4(len, wid, fract(aP.w), k);
      gl_Position = projectionMatrix * pv;
    }`,
    fragmentShader: `uniform float uTime, uCount, uCell; varying vec2 vUv; varying vec4 vS; ${SRGB}
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() { ${COUNT_ALL}
      vec2 cells = max(vec2(3.0, 4.0), vec2(vS.y * 0.5, vS.x) / uCell);
      vec2 q = (floor(vUv * vec2(cells.x, cells.y)) + 0.5) / vec2(cells.x, cells.y); // square cells of uCell metres
      float y = q.y, t = uTime;
      float n = vn(vec2(q.x * 2.2 + vS.z * 9.0, y * 3.5 - t * 7.0));
      #if OCTAVES > 1
      n = n * 0.65 + 0.35 * vn(vec2(q.x * 5.0 - vS.z * 4.0, y * 8.0 - t * 12.0));
      #endif
      float k = clamp(vS.w, 0.0, 1.0);
      float prof = smoothstep(0.0, 0.16, y) * pow(max(0.0, 1.0 - y), 0.75);
      float heat = 1.25 * prof - abs(q.x) * 0.95 + (n - 0.5) * (0.2 + 1.1 * y) - (1.0 - k) * 0.7 * y;
      if (heat < 0.06) discard;
      ${COUNT_FRAG}
      vec3 col = heat > 0.62 ? vec3(1.0, 0.96, 0.76) : heat > 0.4 ? vec3(1.0, 0.8, 0.26) : heat > 0.2 ? vec3(1.0, 0.49, 0.1) : vec3(0.86, 0.2, 0.06);
      gl_FragColor = vec4(toLin(col), 1.0);
      #include <colorspace_fragment>
    }`,
  });
}
export function makeTongues(scene, profile, calm, opts = {}) {
  const len = opts.len ?? 1, wid = opts.wid ?? 1;
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  g.instanceCount = 5;
  const P = new THREE.InstancedBufferAttribute(new Float32Array(20), 4), Dd = new THREE.InstancedBufferAttribute(new Float32Array(20), 4), LW = new THREE.InstancedBufferAttribute(new Float32Array(10), 2);
  for (const a of [P, Dd, LW]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aP', P); g.setAttribute('aD', Dd); g.setAttribute('aLW', LW);
  const mat = tongueMaterial(profile === 'low' || profile === 'minimal' ? 1 : 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.visible = false;
  scene.add(mesh);
  return {
    objects: [mesh],
    update(t, dt, E) {
      mat.uniforms.uTime.value = calm ? 0 : t; // reduced motion: a still shape that only grows and shrinks
      let any = false;
      for (let i = 0; i < 5; i++) {
        const o = i * 8, k = E[o + 6], s = E[o + 7];
        P.array[i * 4] = E[o]; P.array[i * 4 + 1] = E[o + 1]; P.array[i * 4 + 2] = E[o + 2]; P.array[i * 4 + 3] = i * 0.173 + 0.05;
        Dd.array[i * 4] = E[o + 3]; Dd.array[i * 4 + 1] = E[o + 4]; Dd.array[i * 4 + 2] = E[o + 5]; Dd.array[i * 4 + 3] = k;
        // length ~ k^0.75 (the CREMA's 4x does not become a 4x pillar), a fat root
        const L = k > 0 ? 2.3 * s * len * Math.pow(k, 0.75) : 0;
        LW.array[i * 2] = L; LW.array[i * 2 + 1] = L > 0 ? 1.15 * s * wid * Math.pow(Math.min(k, 4), 0.45) : 0;
        if (k > 0) any = true;
      }
      P.needsUpdate = Dd.needsUpdate = LW.needsUpdate = true;
      mesh.visible = any;
    },
    live: () => 0, clear: () => { mesh.visible = false; }, materials: [mat],
  };
}

// ---------------------------------------------------------------- D: mixed (a short tongue + a fringe of sparks)
export function makeMixed(scene, profile, calm) {
  const a = makeTongues(scene, profile, calm, { len: 0.55, wid: 0.85 });
  const b = makeSparks(scene, profile, calm, { scale: 0.4, rate: 1 });
  return {
    objects: [...a.objects, ...b.objects], pool: b.pool,
    update(t, dt, E) { a.update(t, dt, E); b.update(t, dt, E); },
    live: t => b.live(t), clear: () => { a.clear(); b.clear(); }, materials: [...a.materials, ...b.materials],
  };
}

export const VARIANTS = {
  A: { name: 'A · Carretilla', make: makeSparks },
  B: { name: 'B · Flama de vòxels', make: makeVoxels },
  C: { name: 'C · Llengua pixelada', make: makeTongues },
  D: { name: 'D · Mixta: llengua curta + espurnes', make: makeMixed },
};
