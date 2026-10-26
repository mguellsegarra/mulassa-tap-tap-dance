import * as THREE from 'three';

// The GLOBUS balloon in real 3D: an overlay scene (orthographic, in HUD units) drawn over the plaza and under the HUD canvas,
// so the counter text still sits on top. The HUD (drawLane) only says where the balloon is: `view` = { x, y, r, k, ax, ay }
// (centre, radius, how inflated 0..1, the ring's anchor for the string). Everything that moves is a spring here: the radius
// eases to its target, every pump squashes it and swings it on its string, the pop throws tumbling shreds, sparks and a flash.
const OUTLINE = 0x2a1a10;
const spring = (x = 0, v = 0) => ({ x, v });
function step(s, target, k, c, dt) { // damped spring, two substeps: stable at the game's 50 ms frame cap
  for (let i = 0; i < 2; i++) { s.v += (k * (target - s.x) - c * s.v) * dt / 2; s.x += s.v * dt / 2; }
}
const rnd = (a, b) => a + Math.random() * (b - a);

function bodyGeometry() { // a balloon, not a ball: the lower half narrows toward the knot
  const g = new THREE.SphereGeometry(1, 32, 20), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), low = Math.max(0, -y), f = 1 - 0.16 * low * low;
    p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
function glowTexture() { // a soft white disc for the pop's flash
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), paint = () => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,236,160,0.85)'); g.addColorStop(1, 'rgba(255,190,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  };
  paint();
  const tex = new THREE.CanvasTexture(c);
  // a GPU process crash blanks the canvas, and three.js re-uploads the texture from it after the WebGL restore: paint it again
  c.addEventListener?.('contextrestored', () => { paint(); tex.needsUpdate = true; });
  return tex;
}
function shardGeometry() { // a torn scrap of rubber: a curved sliver
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.quadraticCurveTo(0.55, 0.15, 1, 0.9); s.quadraticCurveTo(0.35, 0.55, 0.05, 0.42); s.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(s, 4); g.translate(-0.4, -0.4, 0);
  return g;
}

const SHREDS = 22, SPARKS = 18, GRAVITY = 520, POP_LIFE = 0.9;

export function createBalloonFx() {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  cam.position.z = 500;
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-0.6, 0.9, 1); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffb27a, 0.5); fill.position.set(0.8, -0.6, 0.5); scene.add(fill);

  // hanging part: anchor (the ring) -> sway pivot -> string + balloon
  const root = new THREE.Group(), sway = new THREE.Group(), balloon = new THREE.Group(), body = new THREE.Group();
  scene.add(root); root.add(sway); sway.add(balloon); balloon.add(body);
  const skin = new THREE.MeshPhongMaterial({ color: 0xff5a7a, specular: 0xffffff, shininess: 90, emissive: 0x330008 });
  const bodyMesh = new THREE.Mesh(bodyGeometry(), skin);
  const rim = new THREE.Mesh(bodyMesh.geometry, new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide }));
  rim.scale.setScalar(1.075);
  body.add(rim, bodyMesh);
  const knot = new THREE.Group(); // little tied neck with two tail curls; outline first
  for (const [mat, k] of [[rim.material, 1.5], [skin, 1]]) {
    const neck = new THREE.Mesh(new THREE.SphereGeometry(0.15 * k, 12, 8), mat); neck.position.y = -1.02;
    knot.add(neck);
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11 * k, 0.34 * k, 10), mat);
      tail.position.set(s * 0.1, -1.2, 0); tail.rotation.z = s * 0.5;
      knot.add(tail);
    }
  }
  body.add(knot);
  const string = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xfff3d6 }));
  sway.add(string);

  // the pop
  const shardMat = new THREE.MeshPhongMaterial({ color: 0xff4d5e, specular: 0xffffff, shininess: 60, side: THREE.DoubleSide });
  const shards = new THREE.InstancedMesh(shardGeometry(), shardMat, SHREDS);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xf5c518 });
  const sparks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), sparkMat, SPARKS);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  for (const o of [shards, sparks, flash, wave]) { o.frustumCulled = false; o.visible = false; scene.add(o); }
  const tint = new THREE.Color();
  for (let i = 0; i < SHREDS; i++) shards.setColorAt(i, tint.setHSL(rnd(-0.01, 0.03), 0.95, rnd(0.5, 0.6)));
  const P = { shreds: Array.from({ length: SHREDS }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 0 })),
    sparks: Array.from({ length: SPARKS }, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 0, w: 0, s: 0 })), t: 9, x: 0, y: 0, r: 0 };

  const S = { rd: spring(), sq: spring(), rot: spring(), sway: spring(), shown: false, last: { x: 0, y: 0, r: 20 }, t: 0, w: 0, h: 0 };
  const dummy = new THREE.Object3D();
  const flip = y => S.h - y; // HUD y grows down, the overlay's up

  function paint(k, nerv = 0) {
    const pale = Math.max(0, k - 0.6) * 0.5; // a stretched skin goes lighter
    skin.color.setHSL(((358 + k * 18) % 360) / 360, 0.95, 0.5 - 0.03 * k + pale * 0.14); // red, drifting to orange-red as it stretches
    skin.emissive.setHSL(0.99, 0.9, 0.06 + 0.04 * nerv);
  }
  // One still of the balloon (same model, upright, k inflated) as a canvas, for the lane's drumroll head, where the HUD's own
  // band would cover a live 3D one. Unit balloon: the canvas spans x -1.1..1.1, y -1.4..1.1 around its centre. Own throwaway
  // renderer (a one-off ~10 ms), so the game's canvas and its state are untouched.
  function snapshot(k = 0.7, px = 176) {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }), h = Math.round(px * 2.5 / 2.2);
    const keep = [root.position.clone(), sway.rotation.z, balloon.position.clone(), balloon.rotation.z, body.scale.clone()];
    try {
      r.setPixelRatio(1); r.setSize(px, h, false); r.setClearColor(0, 0);
      const snap = new THREE.OrthographicCamera(-1.1, 1.1, 1.1, -1.4, -10, 10); snap.position.z = 5;
      root.position.set(0, 0, 0); sway.rotation.z = 0; balloon.position.set(0, 0, 0); balloon.rotation.z = 0; body.scale.set(0.9, 1, 0.9);
      balloon.visible = sway.visible = true; string.visible = false; paint(k);
      r.render(scene, snap);
      const out = document.createElement('canvas'); out.width = px; out.height = h; out.getContext('2d').drawImage(r.domElement, 0, 0);
      return out;
    } finally {
      root.position.copy(keep[0]); sway.rotation.z = keep[1]; balloon.position.copy(keep[2]); balloon.rotation.z = keep[3]; body.scale.copy(keep[4]);
      string.visible = true; balloon.visible = sway.visible = S.shown;
      r.dispose(); r.forceContextLoss();
    }
  }
  function pump(side) { // a tap: squash and tilt the balloon, swing it on its string
    S.sq.v += 5.5; S.rot.v += 2.2 * side; S.sway.v += 1.6 * side;
  }
  function pop(power = 1) { // at the balloon's last place
    const { x, y, r } = S.last;
    P.t = 0; P.x = x; P.y = y; P.r = r;
    P.shreds.forEach(s => {
      const a = rnd(0, 6.283), sp = rnd(110, 260) * power;
      Object.assign(s, { x: x + Math.cos(a) * r * 0.5, y: flip(y) + Math.sin(a) * r * 0.5, z: rnd(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 60, vz: rnd(-40, 40),
        rx: rnd(-0.6, 0.6), ry: rnd(-0.6, 0.6), rz: rnd(0, 6), wx: rnd(-5, 5), wy: rnd(-5, 5), wz: rnd(-12, 12), s: r * rnd(0.55, 1.0) });
    });
    P.sparks.forEach(s => {
      const a = rnd(0, 6.283), sp = rnd(150, 340) * power;
      Object.assign(s, { x, y: flip(y), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 40, r: rnd(0, 6), w: rnd(-12, 12), s: rnd(3, 6.5) });
    });
    S.rd.x = 0; S.rd.v = 0; S.sq.x = S.sq.v = 0; S.rot.x = S.rot.v = 0; S.sway.v += 2.5; // the next one starts from nothing and pops in
  }

  // view: { x, y, r, k, ax, ay } or null. dt in seconds (0 when paused). Returns true when something is drawn.
  function update(dt, view, W, HH, t) {
    S.t = t; S.w = W; S.h = HH;
    cam.right = W; cam.top = HH; cam.updateProjectionMatrix();
    if (view && !S.shown) { S.rd.x = 0; S.rd.v = 0; } // first frame of a new balloon: it inflates in
    S.shown = !!view;
    balloon.visible = sway.visible = !!view;
    if (view) {
      const { x, y, r, k, ax, ay } = view;
      S.last.x = x; S.last.y = y; S.last.r = r;
      if (dt > 0) {
        step(S.rd, r, 320, 17, dt); step(S.sq, 0, 300, 10, dt); step(S.rot, 0, 240, 8, dt); step(S.sway, 0, 90, 4.2, dt);
      }
      const nerv = Math.max(0, (k - 0.75) / 0.25), tremble = nerv * (Math.sin(t * 43) * 0.5 + Math.sin(t * 29 + 1) * 0.5), rr = Math.max(0.01, S.rd.x);
      const sq = Math.max(-0.4, Math.min(0.55, S.sq.x)) + tremble * 0.035;
      root.position.set(ax, flip(ay), 0);
      sway.rotation.z = S.sway.x * 0.22; // swings about the ring
      const len = y - ay; // anchor -> centre, HUD units
      balloon.position.set(0, -len, 0);
      balloon.rotation.z = S.rot.x * 0.25 + tremble * 0.02 - S.sway.x * 0.22 * 0.4;
      body.scale.set(rr * 0.9 * (1 + sq * 0.5), rr * (1 - sq * 0.5), rr * 0.9 * (1 + sq * 0.5));
      string.scale.set(1.3, Math.max(0.1, len - rr), 1); string.position.set(0, -(len - rr) / 2, -1);
      paint(k, nerv);
    }
    // the pop's fragments
    const live = P.t < POP_LIFE;
    for (const o of [shards, sparks, flash, wave]) o.visible = live;
    if (live) {
      P.t += dt; const u = P.t / POP_LIFE, life = Math.max(0, 1 - u);
      P.shreds.forEach((s, i) => {
        s.vy -= GRAVITY * dt; s.vx *= 1 - 1.6 * dt; s.vy *= 1 - 0.8 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        s.rx += s.wx * dt; s.ry += s.wy * dt; s.rz += s.wz * dt;
        dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(s.rx, s.ry, s.rz);
        dummy.scale.setScalar(s.s * Math.min(1, life * 2.4) * Math.min(1, P.t * 22 + 0.3));
        dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix);
      });
      shards.instanceMatrix.needsUpdate = true;
      P.sparks.forEach((s, i) => {
        s.vy -= GRAVITY * 0.5 * dt; s.vx *= 1 - 2.2 * dt; s.vy *= 1 - 1.4 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.w * dt;
        dummy.position.set(s.x, s.y, 5); dummy.rotation.set(0, 0, s.r);
        dummy.scale.setScalar(s.s * life * (0.6 + 0.4 * Math.sin(P.t * 40 + i))); // twinkle
        dummy.updateMatrix(); sparks.setMatrixAt(i, dummy.matrix);
      });
      sparks.instanceMatrix.needsUpdate = true;
      const f = Math.min(1, P.t / 0.16); // flash: blows up fast, gone by 0.16 s
      flash.visible = f < 1; flash.position.set(P.x, flip(P.y), 10); flash.scale.setScalar(P.r * (1.2 + 3 * (1 - (1 - f) ** 3))); flash.material.opacity = 1 - f;
      const w = Math.min(1, P.t / 0.4); // shockwave ring
      wave.visible = w < 1; wave.position.set(P.x, flip(P.y), 9); wave.scale.setScalar(P.r * (0.9 + 1.7 * (1 - (1 - w) ** 3))); wave.material.opacity = (1 - w) * 0.9;
    }
    return !!view || live;
  }
  function render(renderer, K = 1) { // K: css px per HUD unit. Scissored to where anything is (a clear + raster of the whole screen costs on a phone)
    const live = P.t < POP_LIFE, x = S.last.x, y = S.last.y, e = live ? 320 : S.last.r * 3 + 16;
    const l = Math.max(0, x - e), t = live ? Math.max(0, y - 320) : Math.max(0, y - S.last.r * 3.4 - 30), r = Math.min(S.w, x + e), b = Math.min(S.h, y + (live ? 320 : S.last.r * 2));
    const ac = renderer.autoClear;
    const st = renderer.getScissorTest();
    try {
      renderer.autoClear = false; renderer.setScissorTest(true);
      renderer.setScissor(l * K, (S.h - b) * K, Math.max(1, (r - l) * K), Math.max(1, (b - t) * K));
      renderer.clearDepth(); renderer.render(scene, cam);
    } finally { renderer.setScissorTest(st); renderer.autoClear = ac; } // (a throw must not leave the next pass clipped)
  }
  const wobble = () => ({ sq: S.sq.x, rot: S.rot.x }); // the springs the lane's head reuses, so both balloons move together
  function warm(renderer) { // compile every program + upload the glow texture now (hidden objects are skipped), not at the first pop
    const all = []; scene.traverse(o => all.push([o, o.visible]));
    all.forEach(([o]) => { o.visible = true; });
    try { renderer.initTexture(flash.material.map); return renderer.compileAsync(scene, cam); }
    finally { all.forEach(([o, v]) => { o.visible = v; }); }
  }
  return { update, render, pump, pop, snapshot, wobble, warm };
}
