// The 3D board: every cell's figure as instances (one per rig pivot), its tile, the camera that fits the board on any screen, and the tap-to-cell picking.
import * as THREE from 'three';
import { MULA_POSES, DRAC_POSES, MULA_SCALE, MULA_YAW, DRAC_K, DRAC_YAW, poseMula, poseDrac, mulaRig, dracRig, bake, bakeMulassa, bakeDrac, rigParts, redScales, greenVelvet } from './rigs.js';
import { buildPopPetard, buildPopCalcot, buildPopCampanar, buildPopCarretilla, buildFuseBit, buildSpark, PETARD_FUSE, PETARD_SPARK } from './models.js';
import { createSparks } from './board-sparks.js';
import { createTiles } from './board-tiles.js';
import { createBlast } from './board-blast.js';
import { createCarretilla } from './board-carretilla.js';
import { frameBoard, PITCH, PITCH_Z, FIG_H } from './board-framing.js';
import { waitForWarmup, linkPrograms } from '#plassa/boot.js';
import { LOW, pixelRatio } from '#plassa/quality.js';

const BOMB_K = .7; // the petard's size on its cell

export function createBoard(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, alpha: true }); // a weak GPU: no MSAA, no shadows (quality.js)
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFShadowMap; // soft shadows cost a phone more than they show on these flat figures

  const scene = new THREE.Scene();
  const sky = new THREE.HemisphereLight('#ffffff', '#76849a', 2.2);
  scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff7e8', 2.7);
  sun.position.set(-9, 26, 12);
  sun.castShadow = !LOW;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(10, 1, 1, 1600); // long lens: the board stays square on screen

  // the dark base under the tiles: their joints read as shadow, not lines; the night around it is the page's (style.css)
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, .4, 1), new THREE.MeshLambertMaterial({ color: '#23233d' }));
  slab.position.y = -.32;
  slab.receiveShadow = true;
  scene.add(slab);

  const mula = bakeMulassa(), drac = bakeDrac();
  const GEOS = {
    drac, mula, dracFals: redScales(drac), mulaFalsa: greenVelvet(mula),
    petard: bake(buildPopPetard(), { scale: BOMB_K }), calcot: bake(buildPopCalcot(), { scale: .82 }), campanar: bake(buildPopCampanar(), { scale: .62 }), carretilla: bake(buildPopCarretilla(), { scale: .72 }),
  };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const CELLS = 24;
  const newInstanced = (g, shadow = true) => {
    const m = new THREE.InstancedMesh(g, mat, CELLS);
    m.castShadow = shadow;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, new THREE.Color('#fff'));
    scene.add(m);
    return m;
  };
  const meshes = Object.fromEntries(['calcot', 'campanar', 'carretilla'].map(kind => [kind, newInstanced(GEOS[kind])]));
  // the board's petard burns its fuse down: ball, fuse bits and spark apart (GEOS.petard, lit, is the help's portrait)
  Object.assign(meshes, { petard: newInstanced(bake(buildPopPetard({ lit: false }), { scale: BOMB_K })), fuseBit: newInstanced(bake(buildFuseBit(), { scale: BOMB_K }), false), spark: newInstanced(bake(buildSpark(), { scale: BOMB_K }), false) }); // a fuse's shadow is a speck
  // The figures are live: one rig per kind poses each cell's copy in turn; one instanced part per pivot, so any number of them cost the same few draw calls.
  const live = (rig, paint = g => g) => ({ rig, parts: rigParts(rig.root).map(p => ({ node: p.node, mesh: newInstanced(paint(p.geo)) })) });
  const FIGS = { drac: live(dracRig()), dracFals: live(dracRig(), redScales), mula: live(mulaRig()), mulaFalsa: live(mulaRig(), greenVelvet) };
  const allMeshes = [...Object.values(meshes), ...Object.values(FIGS).flatMap(f => f.parts.map(p => p.mesh))];
  const put = (m, matrix, color) => { m.setMatrixAt(m.count, matrix); m.setColorAt(m.count, color); m.count += 1; };
  const { mesh: tiles, paint: paintTiles } = createTiles(scene, CELLS);

  const sparks = createSparks(scene), { burst: sparkBurst, flame, step: stepSparks, busy: sparksBusy } = sparks;
  const blast = createBlast(canvas, sparks, sky);
  const fx = createCarretilla(sparks);

  const dummy = new THREE.Object3D(), col = new THREE.Color(), bit = new THREE.Matrix4(), at = new THREE.Matrix4(), flick = new THREE.Vector3();
  let zoom = 0; // a chord's punch-in, 0..1, decaying (flow.js)
  let game = null, centres = [], screen = [], W = 1, H = 1, time = 0, trauma = 0, poses = [], seen = [], burning = new Map();
  const camBase = new THREE.Vector3();
  const insets = { top: 68, bottom: 8 };

  const cellPos = i => ({ x: (i % game.cols - (game.cols - 1) / 2) * PITCH, z: (Math.floor(i / game.cols) - (game.rows - 1) / 2) * PITCH_Z });

  function setGame(g) {
    game = g;
    blast.reset(g.cells.length);
    centres = g.cells.map(c => cellPos(c.i));
    seen = g.cells.map(() => '');
    poses = g.cells.map(() => 0);
    burning = new Map();
    tiles.count = g.cells.length;
    slab.scale.set(g.cols * PITCH + .5, 1, g.rows * PITCH_Z + .5);
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

  // the board fills the space between the HUD and the bottom edge (board-framing.js); then each cell's tap target
  function fit() {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(W, H, false);
    frameBoard(camera, game.cols, game.rows, W, H, insets);
    camBase.copy(camera.position);
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

  const burst = (i, colors, n, power, span) => sparkBurst(centres[i], colors, n, power, span);
  // a chord's column of fire straight up from cell i
  function fountain(i, n) {
    const c = centres[i];
    for (let k = 0; k < n; k++) flame(c.x + (Math.random() - .5) * .4, 1, c.z + (Math.random() - .5) * .4, (Math.random() - .5) * 2, 12 + Math.random() * 10, (Math.random() - .5) * 2, .5);
  }
  // The carretilla (board-carretilla.js): every Mulassa out goes up, quickly; `origin` its cell. → each one's pop, seconds from now
  function dragonFire(origin) {
    trauma = Math.min(1, trauma + .35);
    return fx.start(origin, [...burning.keys()], centres, time);
  }
  function burn(cell) {
    burning.set(cell.i, poses[cell.i]); // her posture, until she goes up (rules.js keeps the cell hers for BURN)
  }

  // Everything goes up, the culprit first and then on (Ringo Tap's chain); the mix is board-blast.js's
  function explodeAll(culprit = Math.floor(centres.length / 2)) { // none when the run's time is up: from the middle
    blast.start(centres, culprit, screen[culprit], game.cols, PITCH, PITCH_Z, time);
    trauma = 1;
  }

  const back = t => { const s = 2.2, u = t - 1; return u * u * ((s + 1) * u + s) + 1; }; // overshoots a little

  function placeFigure(i, kind, cell, s, blasted = 0) {
    if (s <= .001) return;
    const { x, z } = centres[i], ph = i * 1.73, t = time;
    let y = 0, ry = 0, rz = 0, sx = 1, sy = 1, jx = 0, jz = 0, urgent = 0;
    col.set('#fff');
    if (kind === 'drac' || kind === 'dracFals') {
      sy = 1 + Math.sin(t * 2.4 + ph) * .025;
      sx = 2 - sy;
    } else if (kind === 'mula') {
      urgent = Math.max(0, (1 - cell.left / (cell.life || 1) - .5) * 2); // her own fuse (rules.js); 0 once she is gone
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
    } else if (kind === 'petard') { // its fuse burns down; the last half, it shakes like a Mulassa
      urgent = Math.max(0, (1 - cell.left / game.bombFuse - .5) * 2);
      y = .1 + Math.sin(t * 4 + ph) * .1;
      jx = Math.sin(t * 61 + ph) * .08 * urgent;
      jz = Math.cos(t * 53 + ph) * .08 * urgent;
    } else {
      y = .1 + Math.sin(t * 4 + ph) * .1;
      ry = Math.sin(t * 2.2) * .5;
    }
    if (blasted) { // on its way out (board-blast.js), blackening
      const f = blast.place(i, blasted, col);
      jx += f.x; y += f.y; jz += f.z; ry += f.ry; rz += f.rz; sx *= f.sx; sy *= f.sy;
    }
    const fig = FIGS[kind];
    if (!fig) {
      dummy.position.set(x + jx, y, z + jz);
      dummy.rotation.set(0, ry, rz);
      dummy.scale.set(sx * s, sy * s, sx * s);
      dummy.updateMatrix();
      put(meshes[kind], dummy.matrix, col);
      if (kind === 'petard') litFuse(cell, t);
      return;
    }
    const { rig, parts } = fig, isDrac = kind === 'drac' || kind === 'dracFals';
    const list = isDrac ? DRAC_POSES : MULA_POSES, P = list[poses[i] % list.length];
    const yaw = (isDrac ? DRAC_YAW : MULA_YAW) + (P.yaw ?? 0) + ry;
    if (isDrac) poseDrac(rig, P, t, ph, 0);
    else poseMula(rig, P, t, ph, urgent);
    const k = isDrac ? DRAC_K : MULA_SCALE;
    rig.root.position.set(x + jx, y, z + jz);
    rig.root.rotation.set(0, yaw, rz);
    rig.root.scale.set(sx * s * k, sy * s * k, sx * s * k);
    rig.root.updateMatrixWorld(true);
    for (const p of parts) put(p.mesh, p.node.matrixWorld, col);
  }

  // what is left of the fuse, and the spark on its end; it is out (no spark) once the petard is put out
  function litFuse(cell, t) {
    const n = cell.kind === 'petard' ? Math.ceil(Math.max(0, cell.left / game.bombFuse) * PETARD_FUSE.length) : 0;
    for (let k = 0; k < n; k++) put(meshes.fuseBit, at.multiplyMatrices(dummy.matrix, bit.makeTranslation(PETARD_FUSE[k][0] * BOMB_K, PETARD_FUSE[k][1] * BOMB_K, 0)), col);
    if (!n) return;
    const [sx, sy] = n === PETARD_FUSE.length ? PETARD_SPARK : PETARD_FUSE[n - 1], f = .8 + Math.random() * .35;
    bit.makeRotationZ(t * 9).scale(flick.setScalar(f)).setPosition(sx * BOMB_K, sy * BOMB_K + .12, 0);
    put(meshes.spark, at.multiplyMatrices(dummy.matrix, bit), col);
    if (Math.random() < .25) flame(at.elements[12], at.elements[13], at.elements[14], (Math.random() - .5) * 2, 2 + Math.random() * 2, (Math.random() - .5) * 2, .3);
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
      const k = blast.progress(c.i, time); // < 0 until the wave gets here, gone at 1
      if (k >= 1) continue;
      if (k >= 0) { placeFigure(c.i, c.kind, c, 1, Math.max(k, .001)); continue; }
      const wasBurning = burning.has(c.i);
      if (wasBurning && c.age >= pop) burning.delete(c.i);
      if (wasBurning && c.kind === 'drac' && c.age < pop) { // her old posture until she goes up; then the cell waits for its Drac
        if (!fx.waiting(c.i, time)) continue;
        const keep = poses[c.i];
        poses[c.i] = burning.get(c.i);
        placeFigure(c.i, 'mula', c, 1);
        poses[c.i] = keep;
        continue;
      }
      placeFigure(c.i, c.kind, c, c.age < pop ? 0 : back(Math.min(1, (c.age - pop) / .22)));
      if (c.prev !== c.kind && c.age < pop) placeFigure(c.i, c.prev, c, 1 - c.age / pop);
    }
    for (const m of allMeshes) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    paintTiles(game, dt, i => blast.progress(i, time));

    fx.step(time, centres);
    stepSparks(dt);

    trauma = Math.min(1, trauma + blast.step(time, dt));
    trauma = Math.max(0, trauma - dt * 2.4); // a short, quick shake
    const sh = trauma * trauma * .9;
    zoom = Math.max(0, zoom - dt * 6);
    const z = 1 - .09 * zoom * zoom; // the camera darts toward the board and back (a game: it moves, whatever the OS asks)
    camera.position.set(camBase.x * z + Math.sin(time * 113) * sh, camBase.y * z + Math.sin(time * 131) * sh, camBase.z * z + Math.cos(time * 107) * sh);
    renderer.render(scene, camera);
  }
  // The shaders, compiled off the main thread and linked a few ms at a time, like the main game's boot (plassa/boot.js):
  // the first frame paying for them all held the thread long enough to freeze the boot screen's Mulassa.
  const warm = () => waitForWarmup(() => renderer.compileAsync(scene, camera).then(() => linkPrograms(renderer.info.programs)));

  // dev only (main.js __pop.portraits): the home's portraits are files, so this stays out of the game's own chunk
  const portraits = (kinds, size, opts) => import('./portraits.js').then(m => m.drawPortraits(renderer, GEOS, mat, kinds, size, opts));
  // an ended run's board once its blast has played out: nothing moves on it, so it need not be drawn again
  const settled = () => game?.state === 'over' && !trauma && !sparksBusy() && game.cells.every(c => blast.progress(c.i, time) >= 1);
  return { setGame, fit, pick, frame, burst, explodeAll, dragonFire, burn, warm, portraits, settled, insets, fountain, punch: k => { zoom = Math.min(1, zoom + k); }, screenOf: i => screen[i], shake: k => { trauma = Math.min(1, trauma + k); } };
}
