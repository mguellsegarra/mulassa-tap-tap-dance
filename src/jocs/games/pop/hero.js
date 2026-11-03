// The home's two figures, live: the red Mulassa and a Drac beside her, the board's own rigs and postures (rigs.js), moving
// (her hop and clack, its breath and sway) and now and then the Drac roaring fire into the air. A small WebGL view of its own:
// it sits over the home's blur, which would blur the board's canvas; main.js draws it only while the home shows.
import * as THREE from 'three';
import { mulaRig, dracRig, poseMula, poseDrac, MULA_POSES, MULA_SCALE, MULA_YAW, DRAC_K } from './rigs.js';
import { createSparks } from './board-sparks.js';
import { waitForWarmup, linkPrograms } from '../../../platform/boot.js';

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
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
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
  let t = 0, W = 0, H = 0;

  function pose(fire) {
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    pose(0);
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mula.root).union(new THREE.Box3().setFromObject(drac.root));
    box.max.y += .4; // room for her hop
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
    if (fire > .4) for (const n of drac.necks) { // the board's flames (board.js placeFigure), up and away from her
      n.head.updateMatrixWorld(true);
      tip.set(0, .2, 1.75).applyMatrix4(n.head.matrixWorld);
      dir.setFromMatrixColumn(n.head.matrixWorld, 2).normalize().add(UP_AWAY).normalize(); // up and back: the fire never hides the faces
      flame(tip.x, tip.y, tip.z, dir.x * 4.5 + (Math.random() - .5), dir.y * 4.5 + (Math.random() - .5), dir.z * 4.5 + (Math.random() - .5), .32);
    }
    step(dt);
    renderer.render(scene, camera);
  }

  const warm = () => { fit(); return waitForWarmup(() => renderer.compileAsync(scene, camera).then(() => linkPrograms(renderer.info.programs))); };
  return { frame, warm };
}
