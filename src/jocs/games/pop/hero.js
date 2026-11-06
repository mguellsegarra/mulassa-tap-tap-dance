// The home's two figures, live: the red Mulassa and a Drac beside her, the board's own rigs and postures (rigs.js), moving
// (her hop and clack, its breath and sway) and now and then the Drac roaring fire into the air. A small WebGL view of its own:
// it sits over the home's blur, which would blur the board's canvas; main.js draws it only while the home shows.
// The end sheet borrows it (solo): the one that ended the run, alone and alive, where the sheet shows it (results.js).
import * as THREE from 'three';
import { mulaRig, dracRig, poseMula, poseDrac, MULA_POSES, MULA_SCALE, MULA_YAW, DRAC_K, bake, redScales, greenVelvet } from './rigs.js';
import { buildPopPetard } from './models.js';
import { createSparks } from './board-sparks.js';
import { waitForWarmup, linkPrograms } from '#plassa/boot.js';
import { LOW, pixelRatio } from '#plassa/quality.js';

const ROAR_EVERY = 6.5, ROAR = 1.6; // seconds between the Drac's roars, and how long one lasts
// The home's Drac plays like a puppy. Its snouts dip a little: the eyes sit on top of the heads, and the raised camera
// only finds them over a lowered snout (heads thrown back hid them behind the red lips).
const PLAY = { necks: [.2, .2], heads: [[.2, .3], [.2, -.3]], jaws: [.12, .12], splay: .25, wing: .4 };
// Its play fills the quiet between two roars (seconds into each ROAR_EVERY): a play bow, two hops, a look at her and back.
const BOW = [2, 3.4], HOPS = [3.6, 4.8], LOOK = [4.9, 6.2];
// Every move eases in and out (zero speed at both ends), so nothing starts, stops or turns with a jolt.
const ease = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const bump = ([a, b], x) => (x > a && x < b ? (1 - Math.cos((x - a) / (b - a) * 2 * Math.PI)) / 2 : 0); // 0 → 1 → 0
const hops = ([a, b], x) => (x > a && x < b ? Math.abs(Math.sin((x - a) / (b - a) * 2 * Math.PI)) : 0); // two, falling like hers: the bounce reads as gravity
const UP_AWAY = new THREE.Vector3(0, 3, -1);
const still = matchMedia('(prefers-reduced-motion: reduce)');

export function createHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, alpha: true }); // a weak GPU: no MSAA (quality.js)
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, .5, 200);
  const sun = new THREE.DirectionalLight('#ffe8c0', 2.4);
  sun.position.set(-6, 12, 8);
  scene.add(new THREE.HemisphereLight('#fff3d6', '#8a6a4a', 2.1), sun);
  const mula = mulaRig(), drac = dracRig();
  mula.root.scale.setScalar(MULA_SCALE);
  drac.root.scale.setScalar(DRAC_K);
  mula.root.position.set(-1.3, 0, .9); // in front, her head towards the Drac
  drac.root.position.set(1.7, 0, -.9); // behind her on the right, facing her and us
  scene.add(mula.root, drac.root);
  const { flame, step } = createSparks(scene);
  const P = MULA_POSES[0], tip = new THREE.Vector3(), dir = new THREE.Vector3();
  let t = 0, W = 0, H = 0, solo = null; // solo: { kind, root, rig } while the end sheet shows the culprit
  // the culprits the home never shows, made the first time one ends a run: the board's own paints (rigs.js)
  const painted = (rig, paint) => { rig.root.traverse(o => { if (o.isMesh && o.geometry.attributes.color) o.geometry = paint(o.geometry); }); return rig; };
  const extra = {}, made = (fig, k = 1) => { fig.root.scale.setScalar(k); fig.root.visible = false; scene.add(fig.root); return fig; };
  const culprit = kind => (kind === 'mula' ? mula : kind === 'drac' ? drac : extra[kind] ??= kind === 'dracFals' ? made(painted(dracRig(), redScales), DRAC_K)
    : kind === 'mulaFalsa' ? made(painted(mulaRig(), greenVelvet), MULA_SCALE)
    : made({ root: new THREE.Mesh(bake(buildPopPetard(), { scale: 1.3 }), new THREE.MeshLambertMaterial({ vertexColors: true })) }));
  const home = canvas.parentElement;

  // the culprit alone: a Mulassa hops, a Drac breathes and plays, the petard bobs and turns
  function poseSolo() {
    const { kind, rig, root } = solo, move = still.matches ? 0 : 1;
    if (kind === 'mula' || kind === 'mulaFalsa') {
      poseMula(rig, P, t, 0, 0);
      root.position.set(0, Math.abs(Math.sin(t * 3.5)) * .35 * move, 0);
      root.rotation.set(0, MULA_YAW + P.yaw + .5 + Math.sin(t * .7) * .15 * move, Math.sin(t * 3.5) * .06 * move);
    } else if (rig) {
      poseDrac(rig, PLAY, t, 0, 0);
      const breath = 1 + Math.sin(t * 2.4) * .025 * move;
      root.position.set(0, 0, 0);
      root.rotation.set(0, -.25 + Math.sin(t * .5) * .1 * move, 0);
      root.scale.set(DRAC_K * (2 - breath), DRAC_K * breath, DRAC_K * (2 - breath));
    } else {
      root.position.set(0, .4 + Math.sin(t * 2.2) * .12 * move, 0);
      root.rotation.set(0, t * .8 * move, Math.sin(t * 1.7) * .08 * move);
    }
  }

  function pose(fire) {
    if (solo) return poseSolo();
    const hop = still.matches ? 0 : Math.abs(Math.sin(t * 3.5));
    poseMula(mula, P, t, 0, fire * .6); // she panics a little while it roars
    mula.root.position.y = hop * .35;
    mula.root.rotation.set(0, MULA_YAW + P.yaw + Math.sin(t * .7) * .15, Math.sin(t * 3.5) * .06);
    poseDrac(drac, PLAY, t, 0, fire);
    playDrac(fire);
    const breath = 1 + Math.sin(t * 2.4) * .025;
    drac.root.scale.set(DRAC_K * (2 - breath), DRAC_K * breath, DRAC_K * (2 - breath));
  }

  function playDrac(fire) {
    const c = t % ROAR_EVERY, on = still.matches ? 0 : 1;
    const bow = bump(BOW, c) * on, hop = hops(HOPS, c) * on, look = bump(LOOK, c) * on;
    drac.body.rotation.x = .22 * bow; // front down, rear up
    drac.root.position.y = .3 * hop;
    drac.root.rotation.set(0, -.55 - .3 * look + Math.sin(t * .5) * .06, 0);
    drac.necks.forEach((n, k) => {
      n.head.rotation.x += .25 * fire; // its roar lifts the heads less: the eyes stay in view
      n.head.rotation.z = (k ? -1 : 1) * .2 * bow; // heads cocked in the bow
      n.jaw.rotation.x = Math.max(n.jaw.rotation.x, .35 * hop); // a yap on each hop
    });
    const wag = (bow + hop) * on; // it wags while it plays, and the wag fades out with the play
    for (const seg of drac.tail) seg.rotation.y = Math.sin(t * 9) * .32 * Math.min(1, wag * 2);
  }

  // both figures in view, whatever the box's shape: the camera backs off along a raised three-quarter line
  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    pose(0);
    scene.updateMatrixWorld(true);
    const box = solo ? new THREE.Box3().setFromObject(solo.root) : new THREE.Box3().setFromObject(mula.root).union(new THREE.Box3().setFromObject(drac.root));
    box.max.y += .4; // room for her hop (and the petard's bob)
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    const half = Math.min(camera.fov / 2, THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)));
    const dist = r / Math.sin(THREE.MathUtils.degToRad(half)) * .74; // the sphere round the box is loose: a little closer
    camera.position.copy(c).add(new THREE.Vector3(0, .42, 1).normalize().multiplyScalar(dist));
    camera.lookAt(c);
    camera.updateProjectionMatrix();
  }

  function frame(dt) {
    fit();
    t += dt;
    const k = t % ROAR_EVERY, fire = still.matches ? 0 : ease(0, .35, k) * (1 - ease(ROAR - .35, ROAR, k)); // eased in and out
    pose(fire);
    if (fire > .4 && !solo) for (const n of drac.necks) { // the board's flames (board.js placeFigure), up and away from her
      n.head.updateMatrixWorld(true);
      tip.set(0, .2, 1.75).applyMatrix4(n.head.matrixWorld);
      dir.setFromMatrixColumn(n.head.matrixWorld, 2).normalize().add(UP_AWAY).normalize(); // up and back: the fire never hides the faces
      flame(tip.x, tip.y, tip.z, dir.x * 4.5 + (Math.random() - .5), dir.y * 4.5 + (Math.random() - .5), dir.z * 4.5 + (Math.random() - .5), .32);
    }
    step(dt);
    renderer.render(scene, camera);
  }

  const warm = () => { fit(); return waitForWarmup(() => renderer.compileAsync(scene, camera).then(() => linkPrograms(renderer.info.programs))); };
  // the end sheet's: `kind` alone in `into` (rules.js culprits); home(): back to the pair, on the home
  function show(kind, into) {
    const c = culprit(kind);
    for (const r of [mula.root, drac.root, ...Object.values(extra).map(e => e.root)]) r.visible = r === c.root;
    solo = { kind, root: c.root, rig: c.root.isMesh ? null : c }; // the petard is one baked mesh: no rig to pose
    into.append(canvas);
    W = 0; // fit again: another box
  }
  function back() {
    if (!solo) return;
    for (const e of Object.values(extra)) e.root.visible = false;
    mula.root.visible = drac.root.visible = true;
    mula.root.position.set(-1.3, 0, .9); drac.root.position.set(1.7, 0, -.9); drac.root.scale.setScalar(DRAC_K); mula.root.scale.setScalar(MULA_SCALE);
    solo = null;
    home.append(canvas);
    W = 0;
  }
  return { frame, warm, show, back };
}
