// The 3D board: every cell's figure as instances (one per rig pivot), its tile, the camera that fits the board on any screen, and the tap-to-cell picking.
import * as THREE from 'three';
import { Vox } from '../../../scene/models/voxel.js';
import { buildPetard, buildCalcot, buildCampanar, buildCarretilla } from './goodies.js';
import { FUSE } from './rules.js';
import { MULA_POSES, DRAC_POSES, MULA_SCALE, MULA_YAW, DRAC_K, DRAC_YAW, poseMula, poseDrac, mulaRig, dracRig, bake, bakeMulassa, bakeDrac, rigParts, swapRedGreen, greenVelvet, thumbs } from './board-figures.js';
import { createSparks } from './board-sparks.js';

const PITCH = 3.2, PITCH_Z = 4.2, JOINT = .06, TILT = 50 * Math.PI / 180;
const FIG_H = 3.6; // the camera's fit keeps the figures' tops on screen

export function createBoard(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8a7a66');
  scene.add(new THREE.HemisphereLight('#fff3d6', '#8a6a4a', 2.1));
  const sun = new THREE.DirectionalLight('#ffe8c0', 2.4);
  sun.position.set(-9, 26, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(20, 1, 1, 800);

  // the plaça's paving (scene/models/plaza.js)
  const floor = new Vox();
  // on the board's own grid (an even number of cells each way, so a joint runs through the centre): every game tile sits exactly on a paving stone
  for (let ix = -14; ix < 14; ix++) for (let iz = -11; iz < 11; iz++) {
    floor.box((ix + .5) * PITCH, -.12, (iz + .5) * PITCH_Z, PITCH - JOINT, .1, PITCH_Z - JOINT, (ix + iz) % 2 === 0 ? '#dccaa8' : '#cfb994', .03);
  }
  const floorMesh = floor.mesh();
  floorMesh.castShadow = false;
  scene.add(floorMesh);

  const mula = bakeMulassa(), drac = bakeDrac();
  const GEOS = {
    drac, mula, dracFals: swapRedGreen(drac), mulaFalsa: greenVelvet(mula),
    petard: bake(buildPetard(), { scale: .85 }), calcot: bake(buildCalcot()), campanar: bake(buildCampanar()), carretilla: bake(buildCarretilla()),
  };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const CELLS = 24;
  const newInstanced = g => {
    const m = new THREE.InstancedMesh(g, mat, CELLS);
    m.castShadow = true;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color('#fff'));
    scene.add(m);
    return m;
  };
  const meshes = Object.fromEntries(['petard', 'calcot', 'campanar', 'carretilla'].map(kind => [kind, newInstanced(GEOS[kind])]));
  // The figures are live: one rig per kind poses each cell's copy in turn; one instanced part per pivot, so any number of them cost the same few draw calls.
  const live = (rig, paint = g => g) => ({ rig, parts: rigParts(rig.root).map(p => ({ node: p.node, mesh: newInstanced(paint(p.geo)) })) });
  const FIGS = { drac: live(dracRig()), dracFals: live(dracRig(), swapRedGreen), mula: live(mulaRig()), mulaFalsa: live(mulaRig(), greenVelvet) };
  const allMeshes = [...Object.values(meshes), ...Object.values(FIGS).flatMap(f => f.parts.map(p => p.mesh))];
  const put = (m, matrix, color) => { m.setMatrixAt(m.count, matrix); m.setColorAt(m.count, color); m.count += 1; };
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(PITCH - JOINT, .16, PITCH_Z - JOINT), new THREE.MeshLambertMaterial(), CELLS);
  tiles.receiveShadow = true;
  tiles.frustumCulled = false;
  scene.add(tiles);

  const { burst: sparkBurst, flame, step: stepSparks } = createSparks(scene);

  const dummy = new THREE.Object3D(), col = new THREE.Color(), hot = new THREE.Color();
  let game = null, centres = [], screen = [], W = 1, H = 1, time = 0, trauma = 0, booms = [], poses = [], seen = [], fireUntil = 0, burning = new Map();
  const camBase = new THREE.Vector3();
  const insets = { top: 0, bottom: 0 };

  const cellPos = i => ({ x: (i % game.cols - (game.cols - 1) / 2) * PITCH, z: (Math.floor(i / game.cols) - (game.rows - 1) / 2) * PITCH_Z });

  function setGame(g) {
    game = g;
    booms = g.cells.map(() => Infinity);
    centres = g.cells.map(c => cellPos(c.i));
    seen = g.cells.map(() => '');
    poses = g.cells.map(() => 0);
    fireUntil = 0;
    burning = new Map();
    tiles.count = g.cells.length;
    centres.forEach((c, i) => {
      dummy.position.set(c.x, -.04, c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      tiles.setMatrixAt(i, dummy.matrix);
    });
    tiles.instanceMatrix.needsUpdate = true;
    fit();
  }

  // The farthest the board's box lands on screen, for the current camera: the camera backs off until it fits the
  // space between the HUD and the bottom edge, then the view shifts so the board sits in the middle of that space.
  function fit() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.clearViewOffset();
    const hw = game.cols / 2 * PITCH, hd = game.rows / 2 * PITCH_Z;
    const corners = [];
    for (const x of [-hw, hw]) for (const z of [-hd, hd]) for (const y of [0, FIG_H]) corners.push(new THREE.Vector3(x, y, z));
    const dir = new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT));
    const box = () => {
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      for (const p of corners) {
        const n = p.clone().project(camera);
        a = Math.min(a, n.x); b = Math.max(b, n.x); c = Math.min(c, n.y); d = Math.max(d, n.y);
      }
      return { a, b, c, d };
    };
    const margin = 10, safeH = (H - insets.top - insets.bottom - 2 * margin) / H * 2, safeW = (W - 2 * margin) / W * 2;
    let lo = 10, hi = 600;
    for (let i = 0; i < 24; i++) {
      const dist = (lo + hi) / 2;
      camera.position.copy(dir).multiplyScalar(dist);
      camera.lookAt(0, 0, 0);
      const { a, b, c, d } = box();
      if (b - a > safeW || d - c > safeH) lo = dist; else hi = dist;
    }
    camera.position.copy(dir).multiplyScalar(hi);
    camera.lookAt(0, 0, 0);
    camBase.copy(camera.position);
    const { a, b, c, d } = box();
    const midY = (d + c) / 2, wantY = 1 - (insets.top + (H - insets.top - insets.bottom) / 2) / H * 2;
    camera.setViewOffset(W, H, (a + b) / 4 * W, (wantY - midY) / 2 * H, W, H);
    camera.updateProjectionMatrix();
    screen = centres.map(({ x, z }) => {
      const n = new THREE.Vector3(x, FIG_H * .35, z).project(camera);
      return { x: (n.x + 1) / 2 * W, y: (1 - n.y) / 2 * H, r: 0 };
    });
    // a little over half the gap to the neighbour in its own row: perspective makes the far rows smaller
    const rowStep = game.cols > 1 ? i => Math.abs(screen[i - i % game.cols + 1].x - screen[i - i % game.cols].x) : () => 60;
    screen.forEach((s, i) => { s.r = rowStep(i) * .62; });
  }

  // Which cell a tap means. Fingers are fat and a Drac ends the game: a Mulassa or a goodie within reach wins over a closer Drac.
  function pick(px, py) {
    let best = -1, bestD = Infinity;
    for (const pass of [c => c.kind !== 'drac', () => true]) {
      screen.forEach((s, i) => {
        const d = Math.hypot(s.x - px, s.y - py);
        if (d < s.r && d < bestD && pass(game.cells[i])) { best = i; bestD = d; }
      });
      if (best >= 0) return game.cells[best].age < 0 ? -1 : best; // a Mulassa burning there, not the Drac to come
    }
    return -1;
  }

  const burst = (i, colors, n, power) => sparkBurst(centres[i], colors, n, power);
  const BURN = .9, FIRE_TIME = 1.1;
  // The carretilla: every Drac turns on the nearest Mulassa and breathes fire; she chars, then goes.
  function dragonFire() {
    fireUntil = time + FIRE_TIME;
    trauma = Math.min(1, trauma + .5);
  }
  function burn(cell) {
    cell.age = -BURN; // rules.js leaves this cell alone until it reaches 0
    burning.set(cell.i, poses[cell.i]);
  }
  const nearestBurning = (x, z) => {
    let best = null, bd = Infinity;
    for (const i of burning.keys()) {
      const c = centres[i], d = Math.hypot(c.x - x, c.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  // Everything goes up, the culprit first and then outwards (Ringo Tap's chain).
  function explodeAll(culprit) {
    const o = centres[culprit];
    booms = centres.map(c => time + (Math.hypot(c.x - o.x, c.z - o.z) / PITCH) * .13);
    trauma = 1;
  }

  const back = t => { const s = 2.2, u = t - 1; return u * u * ((s + 1) * u + s) + 1; }; // overshoots a little

  const headTip = new THREE.Vector3(), headDir = new THREE.Vector3();
  function placeFigure(i, kind, cell, s, charred) {
    if (s <= .001) return;
    const { x, z } = centres[i], ph = i * 1.73, t = time;
    let y = 0, ry = 0, rz = 0, sx = 1, sy = 1, jx = 0, jz = 0, urgent = 0;
    col.set('#fff');
    if (kind === 'drac' || kind === 'dracFals') {
      sy = 1 + Math.sin(t * 2.4 + ph) * .025;
      sx = 2 - sy;
    } else if (kind === 'mula' && !charred) {
      urgent = Math.max(0, (1 - cell.left / FUSE - .5) * 2);
      y = Math.abs(Math.sin(t * 7 + ph)) * .32;
      rz = Math.sin(t * 7 + ph) * .1;
      sy = 1 + y * .25;
      if (urgent > 0) { // Ringo Tap's second half of the fuse: it shakes, harder and harder
        jx = Math.sin(t * 61 + ph) * .1 * urgent;
        jz = Math.cos(t * 53 + ph) * .1 * urgent;
        col.setRGB(1 + urgent * Math.max(0, Math.sin(t * 16)), 1 - urgent * .25, 1 - urgent * .25);
      }
    } else if (kind === 'mulaFalsa') {
      y = Math.abs(Math.sin(t * 5 + ph)) * .16;
      rz = Math.sin(t * 5 + ph) * .06;
    } else if (!charred) {
      y = .1 + Math.sin(t * 4 + ph) * .1;
      ry = Math.sin(t * 2.2) * .5;
    }
    if (charred) { // burning: she stiffens and blackens, and shakes
      const k = Math.min(1, (cell.age + BURN) / (BURN * .6));
      col.setRGB(1 - k * .86, 1 - k * .88, 1 - k * .88);
      jx = Math.sin(t * 47 + ph) * .05;
      if (cell.age < 0 && Math.random() < .7) flame(x + (Math.random() - .5) * 1.8, .4 + Math.random() * 1.6, z + (Math.random() - .5) * 1.8, 0, 3 + Math.random() * 3, 0, .5);
    }
    const fig = FIGS[kind];
    if (!fig) {
      dummy.position.set(x + jx, y, z + jz);
      dummy.rotation.set(0, ry, rz);
      dummy.scale.set(sx * s, sy * s, sx * s);
      dummy.updateMatrix();
      put(meshes[kind], dummy.matrix, col);
      return;
    }
    const { rig, parts } = fig, isDrac = kind === 'drac' || kind === 'dracFals';
    const list = isDrac ? DRAC_POSES : MULA_POSES, P = list[poses[i] % list.length];
    const firing = isDrac && kind === 'drac' ? Math.max(0, Math.min(1, Math.min(fireUntil - t, FIRE_TIME - (fireUntil - t)) * 6)) : 0;
    let yaw = (isDrac ? DRAC_YAW : MULA_YAW) + (P.yaw ?? 0);
    const target = firing > 0 ? nearestBurning(x, z) : null;
    if (target) { // turn on her; the shorter way round
      const want = Math.atan2(target.x - x, target.z - z), d = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
      yaw += d * firing;
    }
    if (isDrac) poseDrac(rig, P, t, ph, firing);
    else poseMula(rig, P, charred ? 0 : t, ph, urgent);
    const k = isDrac ? DRAC_K : MULA_SCALE;
    rig.root.position.set(x + jx, y, z + jz);
    rig.root.rotation.set(0, yaw, rz);
    rig.root.scale.set(sx * s * k, sy * s * k, sx * s * k);
    rig.root.updateMatrixWorld(true);
    for (const p of parts) put(p.mesh, p.node.matrixWorld, col);
    if (firing > .3) for (const n of rig.necks) {
      headTip.set(0, .2, 1.75).applyMatrix4(n.head.matrixWorld);
      if (target) headDir.set(target.x - headTip.x, 1.1 - headTip.y, target.z - headTip.z).normalize();
      else headDir.setFromMatrixColumn(n.head.matrixWorld, 2).normalize();
      const speed = 13, w = 1.6;
      flame(headTip.x, headTip.y, headTip.z, headDir.x * speed + (Math.random() - .5) * w, headDir.y * speed + (Math.random() - .5) * w, headDir.z * speed + (Math.random() - .5) * w);
    }
  }

  function frame(dt) {
    time += dt;
    const pop = .1;
    for (const m of allMeshes) m.count = 0;
    for (const c of game.cells) {
      if (seen[c.i] !== c.kind) { // a new figure here: a new posture
        seen[c.i] = c.kind;
        poses[c.i] = Math.floor(Math.random() * DRAC_POSES.length);
      }
      if (booms[c.i] <= time) continue;
      const wasBurning = burning.has(c.i);
      if (wasBurning && c.age >= pop) burning.delete(c.i);
      if (wasBurning && c.kind === 'drac' && c.age < pop) { // her old posture until she goes: the frame loop's new one is for the Drac
        const keep = poses[c.i];
        poses[c.i] = burning.get(c.i);
        placeFigure(c.i, 'mula', c, Math.min(1, 1 - c.age / pop), true);
        poses[c.i] = keep;
        if (c.age >= 0 && c.age < dt) burst(c.i, ['#26222a', '#3a2c22', '#ff8a1e'], 22);
        continue;
      }
      placeFigure(c.i, c.kind, c, c.age < pop ? 0 : back(Math.min(1, (c.age - pop) / .22)));
      if (c.prev !== c.kind && c.age < pop) placeFigure(c.i, c.prev, c, 1 - c.age / pop);
    }
    for (const m of allMeshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    game.cells.forEach((c, i) => {
      if (booms[i] <= time && booms[i] > time - dt - 1e-6) {
        burst(i, ['#ff8a1e', '#ffe066', '#c0283c', '#3a2c22'], i === game.culprit ? 40 : 14, i === game.culprit ? 1.4 : 1);
      }
      col.set((i + Math.floor(i / game.cols)) % 2 ? '#b89a6c' : '#a78a5e');
      if (c.kind === 'mula') {
        const u = 1 - c.left / FUSE;
        col.set('#f5c518').lerp(hot.set('#ff3b2e'), u);
      } else if (c.kind !== 'drac') col.set('#fff3d6');
      tiles.setColorAt(i, col);
    });
    tiles.instanceColor.needsUpdate = true;

    stepSparks(dt);

    trauma = Math.max(0, trauma - dt * 1.6);
    const sh = trauma * trauma * .9;
    camera.position.set(camBase.x + Math.sin(time * 71) * sh, camBase.y + Math.sin(time * 83) * sh, camBase.z + Math.cos(time * 67) * sh);
    renderer.render(scene, camera);
  }
  return { setGame, fit, pick, frame, burst, explodeAll, dragonFire, burn, thumbs: size => thumbs(GEOS, mat, size), insets, screenOf: i => screen[i], shake: k => { trauma = Math.min(1, trauma + k); } };
}
