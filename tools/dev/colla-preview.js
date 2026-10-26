// Dev review of the Drac's colla (colla-preview.html): four views in one canvas. Top: the four helpers and three seated
// postures in a row, from the front and three-quarter; bottom left: the ring and its seated members as the play camera
// sees them; bottom right: the ring from above with the Drac at rest on its path at a reference second (?t=).
// ?beat= (the clap's phase: an integer = palms together), ?energy= (0 calm .. 1 playing), ?play (beats run at 120 bpm),
// ?view=0-3 (one view, full size). ?figura=mulassa: the Mulassa's group instead (its looks, marks and seated ring, her
// reference-led dance at song second ?t=); ?figura=bou: the Bou's (its garnet colla round it, its dance at song second ?t=).
import * as THREE from 'three';
import { createDracColla } from '../../src/figures/drac/drac-colla.js';
import { placeDance, danceYaw, HELPER_RADIUS } from '../../src/figures/drac/drac-layout.js';
import { rootAt } from '../../src/figures/drac/drac-path.js';
import { buildDrac, DRAC_SCALE } from '../../src/figures/drac/drac.js';
import { PROFILES } from '../../src/platform/render-quality.js';
import { createMulaColla, mulaSeatAt } from '../../src/figures/mulassa/mula-colla.js';
import { mulaDanceYaw, placeMulaDance, MULA_HELPER_RADIUS } from '../../src/figures/mulassa/mula-layout.js';
import { mulaDance, newMulaPose } from '../../src/figures/mulassa/mula-dance.js';
import { buildMulassa } from '../../src/figures/mulassa/mulassa.js';
import { createCarriers } from '../../src/figures/mulassa/mula-carriers.js';
import { createBouColla, BOU_HELPER_RADIUS } from '../../src/figures/bou/bou-colla.js';
import { buildBou } from '../../src/figures/bou/bou.js';
import { BOU_HELPER_LOOKS } from '../../src/figures/bou/bou-suit.js';
import { createBouMotion } from '../../src/figures/bou/bou-motion.js';

const q = new URLSearchParams(location.search), num = (k, d) => (q.has(k) && q.get(k) !== '' ? Number(q.get(k)) : d);
const BEAT = num('beat', 0), ENERGY = num('energy', 1), T = num('t', 34.36), PLAY = q.has('play'), ONE = num('view', -1), BACK = q.has('back'), ZOOM = num('zoom', 1), MULA = q.get('figura') === 'mulassa', BOU = q.get('figura') === 'bou';
const CAM_AZ = -81 * Math.PI / 180, FRONT = BOU ? CAM_AZ - Math.PI / 4 : MULA ? mulaDanceYaw(CAM_AZ) : danceYaw(CAM_AZ); // stage.js CAM_AZ / DRAC_YAW / MULA_YAW / BOU_COLLA_YAW (not imported: it builds the whole game)
if (q.get('ulleres')) BOU_HELPER_LOOKS.slice(0, 4).forEach(l => { l.shades = q.get('ulleres'); }); // ?ulleres=wayfarer|aviator|sport
const makeColla = () => (BOU ? createBouColla(PROFILES[2]) : MULA ? createMulaColla(PROFILES[2], seat => mulaSeatAt(seat, FRONT)) : createDracColla(PROFILES[2]));
const place = BOU ? (obj, yaw) => { obj.rotation.y = yaw; return obj; } : MULA ? placeMulaDance : placeDance;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
renderer.setScissorTest(true);
const lit = s => {
  s.background = new THREE.Color('#8fd3ff');
  s.add(new THREE.HemisphereLight('#dff3ff', '#a88b63', 1.6));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  sun.position.set(-10, 18, 8);
  s.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#d8c7a4' }));
  s.add(floor);
  return s;
};

// the studio: one colla taken apart into a row
const studio = lit(new THREE.Scene()), row = makeColla();
studio.add(row.helpers, row.seated);
row.setProfile({ name: 'low' }); // the first three: one of each posture
row.crew.forEach((p, i) => { p.g.position.set(-2.4 + i * 0.9, 0, 0); p.g.rotation.y = BACK ? Math.PI : 0; }); // ?back: the helpers' backs
row.members.slice(0, 3).forEach((p, i) => { p.g.position.set((BOU ? 2.2 : 1.4) + i * 1.0, 0, 0.3); p.g.rotation.y = 0; });
// the plaça: the ring as placed in play, the Drac at rest on its path
const plaza = lit(new THREE.Scene()), colla = makeColla();
place(colla.helpers, FRONT);
colla.setLabels(true);
plaza.add(colla.helpers, colla.seated);
if (BOU) { // the Bou at song second T in its dance frame (stage.js: turned to FRONT, CAM_AZ + 0.35)
  const bou = buildBou(), frame = new THREE.Group();
  frame.rotation.y = CAM_AZ + 0.35; frame.add(bou.root, ...bou.feet, ...bou.legs, ...bou.trunks, ...bou.arms, bou.limbs); plaza.add(frame);
  createBouMotion(bou)(T, 0);
} else if (MULA) { // her body and carriers at song second T, in the dance frame
  const rig = buildMulassa(), carriers = createCarriers(), p = mulaDance.pose(newMulaPose(), T), feet = Array.from({ length: 8 }, (_, i) => mulaDance.foot(T, i, {}));
  const frame = place(new THREE.Group(), FRONT); frame.add(rig.root); plaza.add(frame); rig.root.add(carriers.group);
  rig.root.position.set(p.x, p.lift, p.z); rig.root.rotation.y = p.yaw; rig.body.rotation.set(p.pitch, 0, p.roll);
  frame.updateMatrixWorld(true);
  for (const f of feet) { const v = new THREE.Vector3(f.x, 0, f.z).applyMatrix4(frame.matrixWorld); f.x = v.x; f.z = v.z; f.yaw += FRONT; }
  carriers.pose(rig, feet);
} else {
  const drac = buildDrac(), life = new THREE.Group(), r = rootAt({}, T);
  drac.root.position.set(r.x, 0, r.z); drac.root.rotation.y = r.yaw;
  life.scale.setScalar(DRAC_SCALE); life.add(drac.root);
  plaza.add(placeDance(life, FRONT));
}
const circle = R => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * 2 * Math.PI) * R, 0.02, Math.sin(i / 96 * 2 * Math.PI) * R))), new THREE.LineBasicMaterial({ color: '#f5c518' }));
plaza.add(circle(BOU ? BOU_HELPER_RADIUS : MULA ? MULA_HELPER_RADIUS : HELPER_RADIUS)); // (both frames put their centre on the plaça's)

const persp = (fov, pos, at) => { const c = new THREE.PerspectiveCamera(fov, 1, 0.1, 200); c.position.set(...pos); c.lookAt(...at); return c; };
const views = [
  [studio, persp(30 / ZOOM, [0, 1.3, 8.5], [0, 0.85, 0])], // ?zoom=: a narrower lens on the row (faces, details)
  [studio, persp(30, [Math.sin(0.7) * 8.5, 1.6, Math.cos(0.7) * 8.5], [0, 0.85, 0])],
  // the play camera's direction from the centre (26 deg up), looking across the ring and its seated members
  [plaza, persp(40, [Math.sin(CAM_AZ) * 13 * Math.cos(0.45), 13 * Math.sin(0.45), Math.cos(CAM_AZ) * 13 * Math.cos(0.45)], [0, 0.4, 0])],
  [plaza, (() => { const c = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 100); c.position.set(0, 50, 0); c.up.set(0, 0, -1); c.lookAt(0, 0, 0); return c; })()],
];
function frame(now) {
  const beat = PLAY ? now / 500 : BEAT;
  row.update(beat, ENERGY); colla.update(beat, ENERGY);
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  views.forEach(([scene, cam], i) => {
    if (ONE >= 0 && i !== ONE) return;
    const x = ONE >= 0 ? 0 : (i % 2) * w / 2, y = ONE >= 0 ? 0 : (i < 2 ? 1 : 0) * h / 2, vw = ONE >= 0 ? w : w / 2, vh = ONE >= 0 ? h : h / 2;
    colla.labels.visible = i === 3; // the letters only on the plan
    if (cam.isPerspectiveCamera) cam.aspect = vw / vh;
    else { const k = vw / vh; cam.left = -9 * k; cam.right = 9 * k; }
    cam.updateProjectionMatrix();
    renderer.setViewport(x, y, vw, vh); renderer.setScissor(x, y, vw, vh);
    renderer.render(scene, cam);
  });
  window.__collaReady = true;
  if (PLAY) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
