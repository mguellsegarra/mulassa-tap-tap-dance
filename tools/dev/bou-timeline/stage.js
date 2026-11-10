// The timeline's 3D viewer: the plaça, the Bou on the game's motion (bou-motion.js) and its colla carrying it in the
// festa (bou-colla.js carryColla), all in the dance's compass frame. Orbit with the mouse or a finger; presets and
// «Segueix» (the camera's target follows the Bou). rebuild() replans the feet after an edit (bou-feet.js planBouFeet).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPlaza } from '../../../src/scene/models/plaza.js';
import { buildBou } from '../../../src/figures/bou/bou.js';
import { createBouMotion } from '../../../src/figures/bou/bou-motion.js';
import { createBouColla, carryColla } from '../../../src/figures/bou/bou-colla.js';
import { BOU_CARRY } from '../../../src/figures/bou/bou-dance.js';

const VIEWS = { q: [5.5, 3.4, 7.2], side: [8.5, 2.2, .3], rear: [-4, 2.8, -7.5], top: [.01, 11, .6], front: [0, 1.8, 8.5] };
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#1d2128');
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 120);
  scene.add(new THREE.HemisphereLight('#fff4e0', '#776c55', 2.2));
  const sun = new THREE.DirectionalLight('#fff0d6', 2.0); sun.position.set(-4, 8, 5); scene.add(sun);
  const plaza = buildPlaza(); scene.add(plaza.group); plaza.band.forEach(p => { p.g.visible = false; });
  const rig = buildBou(); scene.add(rig.root, ...rig.feet, ...rig.legs, ...rig.trunks, ...rig.arms, rig.limbs);
  const colla = createBouColla({ name: 'high' }); colla.helpers.visible = true; scene.add(colla.helpers);
  const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .49;
  controls.minDistance = 2; controls.maxDistance = 40;
  let motion = createBouMotion(rig), time = 0, last = 0, follow = false, pose = null;
  const target = new THREE.Vector3(0, 1, 0);
  function view(v) { const p = VIEWS[v] ?? VIEWS.q; target.set(follow && pose ? pose.x : 0, 1, follow && pose ? pose.z : 0); camera.position.set(...p).add(target).setY(p[1]); controls.target.copy(target); controls.update(); }
  function draw(t, playing) {
    const now = performance.now(), dt = playing && last ? Math.min(.1, (now - last) / 1000) : 0; last = now; time = t; // (a seek or a pause: the tail hangs still)
    pose = motion(t, dt);
    colla.update(pose.beat, 1, 0); carryColla(colla, pose, BOU_CARRY, dt || 1 / 60);
    if (follow) { const dx = pose.x - controls.target.x, dz = pose.z - controls.target.z; controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz; }
    controls.update(); renderer.render(scene, camera);
    return pose;
  }
  const resize = new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); draw(time, false); });
  resize.observe(canvas); view('q');
  return {
    draw, view, rig,
    setFollow(on) { follow = on; },
    // after an edit: the feet planned again on the new path (it throws when no landing is clear: the old plan stays)
    rebuild() { const m = createBouMotion(rig); motion = m; },
    orbiting: () => controls.state !== -1,
  };
}
