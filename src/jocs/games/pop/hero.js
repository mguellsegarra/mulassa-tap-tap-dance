// The home's two figures, live: the red Mulassa and a Drac beside her, the board's own rigs and postures (rigs.js), moving
// (her hop and clack, its breath and sway) and now and then the Drac roaring fire into the air. A small WebGL view of its own:
// it sits over the home's blur, which would blur the board's canvas; main.js draws it only while the home shows.
import * as THREE from 'three';
import { mulaRig, dracRig, poseMula, poseDrac, MULA_POSES, DRAC_POSES, MULA_SCALE, MULA_YAW, DRAC_K } from './rigs.js';
import { createSparks } from './board-sparks.js';
import { waitForWarmup, linkPrograms } from '../../../platform/boot.js';

const ROAR_EVERY = 6.5, ROAR = 1.6; // seconds between the Drac's roars, and how long one lasts
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
  const P = MULA_POSES[0], D = DRAC_POSES[3], tip = new THREE.Vector3(), dir = new THREE.Vector3();
  let t = 0, W = 0, H = 0;

  function pose(fire) {
    const hop = still.matches ? 0 : Math.abs(Math.sin(t * 3.5));
    poseMula(mula, P, t, 0, fire * .6); // she panics a little while it roars
    mula.root.position.y = hop * .35;
    mula.root.rotation.set(0, MULA_YAW + P.yaw + Math.sin(t * .7) * .15, Math.sin(t * 3.5) * .06);
    poseDrac(drac, D, t, 0, fire);
    drac.root.rotation.set(0, -.55 + Math.sin(t * .5) * .1, 0);
    const breath = 1 + Math.sin(t * 2.4) * .025;
    drac.root.scale.set(DRAC_K * (2 - breath), DRAC_K * breath, DRAC_K * (2 - breath));
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
    const k = t % ROAR_EVERY, fire = still.matches ? 0 : Math.max(0, Math.min(1, Math.min(k, ROAR - k) * 5)) * (k < ROAR ? 1 : 0);
    pose(fire);
    if (fire > .4) for (const n of drac.necks) { // the board's flames (board.js placeFigure), up and away from her
      n.head.updateMatrixWorld(true);
      tip.set(0, .2, 1.75).applyMatrix4(n.head.matrixWorld);
      dir.setFromMatrixColumn(n.head.matrixWorld, 2).normalize().add(new THREE.Vector3(0, .9, 0)).normalize();
      flame(tip.x, tip.y, tip.z, dir.x * 4.5 + (Math.random() - .5), dir.y * 4.5 + (Math.random() - .5), dir.z * 4.5 + (Math.random() - .5), .32);
    }
    step(dt);
    renderer.render(scene, camera);
  }

  const warm = () => { fit(); return waitForWarmup(() => renderer.compileAsync(scene, camera).then(() => linkPrograms(renderer.info.programs))); };
  return { frame, warm };
}
