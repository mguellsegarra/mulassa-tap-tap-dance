// The Bou's banknotes at the end (figures/bou/bou-correfoc.js BOU_BILLS: where and when): from the final bombo
// (song.finale) «BANC DEL BOU» notes rain from the sky round it and stay, a carpet the wind keeps stirring, until the next
// game or the menu; the last of them, the hero, lands face up on a mound of them between the Bou and the camera, where
// bou-end-shot.js comes down to it, and the plaça waits there for a tap before its results (game/tick.js bouHolds).
// One instanced mesh with its own paper material: a Lambert whose vertex shader curls each note and ripples it in the
// wind (`aPaper`: how much, its phase), so the notes read as paper, not cards; compiled up front with the rest (main.js
// precompile: hidden meshes too). Its matrices and `aPaper` are written in place, nothing allocated per frame.
import * as THREE from 'three';
import { scene, renderer, renderProfile } from '../../scene/stage.js';
import { bou } from './bou-objects.js';
import { confBills } from '../../scene/confetti.js';
import { BOU_BILLS, bouHeroSpot, bouBillPlan, bouFlutterDrop, bouWind, bouWindDir } from './bou-correfoc.js';
import { bouPose, newBouPose, BOU_TIMING } from './bou-dance.js';
import { AUTOPLAY } from '../../core/env.js';
import { G } from '../../game/state.js';

const BILL_N = Math.max(160, renderProfile.confetti * 4); // (low 320, medium 600, high 1040 notes)
const billGeo = new THREE.PlaneGeometry(0.14, 0.07, 8, 3); // segments for the curl and the ripple
const billPaper = new THREE.InstancedBufferAttribute(new Float32Array(BILL_N * 2), 2).setUsage(THREE.DynamicDrawUsage);
billGeo.setAttribute('aPaper', billPaper);
const billTime = { value: 0 };
const billMat = new THREE.MeshLambertMaterial({ map: confBills.material.map, side: THREE.DoubleSide });
// z (the note's normal: up once it lies, never below its plane) += aPaper.x x (a curl across it + a ripple running along
// it); the normal follows the bend (by differences), so the light shades the curl like paper
billMat.onBeforeCompile = sh => {
  sh.uniforms.uBillTime = billTime;
  sh.vertexShader = `uniform float uBillTime;
attribute vec2 aPaper;
float billZ(vec2 p) {
  float u = p.x / 0.14 + 0.5, v = p.y / 0.07 + 0.5, curl = 4.0 * u * (1.0 - u);
  float ripple = 0.5 + 0.5 * sin(u * 4.7 - uBillTime * 5.0 - aPaper.y);
  return aPaper.x * (0.5 * curl + 0.5 * ripple * (0.6 + 0.4 * v));
}
` + sh.vertexShader
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
  float bz = billZ(position.xy);
  objectNormal = normalize(vec3(-(billZ(position.xy + vec2(0.004, 0.0)) - bz) / 0.004, -(billZ(position.xy + vec2(0.0, 0.004)) - bz) / 0.004, 1.0));`)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed.z += bz;');
};
billMat.customProgramCacheKey = () => 'bou-bill';
const billCarpet = new THREE.InstancedMesh(billGeo, billMat, BILL_N);
['#ffffff', '#eef6ea', '#e2eedc'].forEach((c, k) => { const col = new THREE.Color(c); for (let i = k; i < BILL_N; i += 3) billCarpet.setColorAt(i, col); }); // three shades: a heap of one flat green reads as a sheet
billCarpet.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
billCarpet.count = 0; billCarpet.visible = false; billCarpet.frustumCulled = false; billCarpet.receiveShadow = true;
scene.add(billCarpet);

const billNotes = Array.from({ length: BILL_N }, () => ({ x: 0, z: 0, y: 0, delay: 0, high: 0, drop: 0, yaw: 0, ph: 0, tumble: false, cy: 0, dx: 0, dz: 0, spin: 0, land: -1, q0: new THREE.Quaternion() }));
// t: s since the rain began; endT: when the song ended (the crane, cameras.js), -1 before; k: how far the camera has come down; go: tapped on
export const BOU_FINALE = { on: false, t: 0, endT: -1, k: 0, go: false, hero: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0 };
const billPlan = { x: 0, z: 0, y: 0, delay: 0, high: 0, drop: 0, yaw: 0, ph: 0, tumble: false }, billSpot = { x: 0, z: 0 };
const billM4 = new THREE.Matrix4(), billQ = new THREE.Quaternion(), billQf = new THREE.Quaternion(), billE = new THREE.Euler(0, 0, 0, 'YXZ'), billPos = new THREE.Vector3(), billOne = new THREE.Vector3(BOU_BILLS.scale, BOU_BILLS.scale, BOU_BILLS.scale), billZero = new THREE.Matrix4().makeScale(0, 0, 0);
const BILL_SETTLE = 0.3; // s a landed note takes to lie flat (no snap)

// The «BANC DEL BOU» note replaces the pixel 💵 on the dance's notes and the carpet once it has loaded (a browser only;
// the same kind of texture: no new program). Asked for once the Bou is chosen, long before its end.
let billAsked = false;
export function loadBouBill() {
  if (billAsked || typeof Image === 'undefined') return;
  billAsked = true;
  new THREE.TextureLoader().load('/textures/bitllet-bou.png', tex => {
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    confBills.material.map = billMat.map = tex;
  });
}

// Where its dance takes the Bou at song second t (its frame: the plaça's metres)
const billPose = newBouPose(), billAtV = new THREE.Vector3();
const bouAt = t => (bouPose(Math.min(t, BOU_TIMING.duration), billPose), bou.frame.localToWorld(billAtV.set(billPose.x, 0, billPose.z)));
// The bombo starts at song second t, the song ends at `end`: the rain. The hero lands between the lens and the Bou (the
// crane comes down in front of it, never over it), far enough from wherever it still goes (it dances on to its last
// bar) that it never treads on it.
export function bouBillsStart(t, end, camera) {
  if (BOU_FINALE.on || !bou) return;
  const now = bouAt(t), bx = now.x, bz = now.z;
  for (let r = BOU_BILLS.hero; ; r += 0.5) {
    bouHeroSpot(bx, bz, camera.position.x, camera.position.z, billSpot);
    const k = r / BOU_BILLS.hero; billSpot.x = bx + (billSpot.x - bx) * k; billSpot.z = bz + (billSpot.z - bz) * k;
    let clear = true;
    for (let s = t; s <= BOU_TIMING.duration && clear; s += 0.25) { const p = bouAt(s); clear = Math.hypot(p.x - billSpot.x, p.z - billSpot.z) >= BOU_BILLS.clear; }
    if (clear || r >= BOU_BILLS.far) break;
  }
  for (let i = 0; i < BILL_N; i++) {
    const n = billNotes[i];
    bouBillPlan(i, BILL_N, billSpot.x, billSpot.z, bx, bz, Math.max(1, end - t), billPlan);
    Object.assign(n, billPlan); n.cy = n.high; n.dx = n.dz = n.spin = 0; n.land = -1;
  }
  const h = billNotes[BILL_N - 1];
  h.yaw = Math.atan2(camera.position.x - billSpot.x, camera.position.z - billSpot.z); // its top away from the lens: it reads upright
  Object.assign(BOU_FINALE, { on: true, t: 0, endT: -1, k: 0, go: false });
  BOU_FINALE.hero.set(billSpot.x, h.y, billSpot.z);
  billCarpet.count = BILL_N; billCarpet.visible = true;
}
// the song ended: the crane starts from wherever the camera is now
export function bouBillsEnd(camera, focus) {
  if (!BOU_FINALE.on || BOU_FINALE.endT >= 0) return;
  BOU_FINALE.endT = BOU_FINALE.t; BOU_FINALE.cam.copy(camera.position); BOU_FINALE.look.copy(focus); BOU_FINALE.fov = camera.fov;
}
export function bouBillsClear() {
  if (!BOU_FINALE.on) return;
  Object.assign(BOU_FINALE, { on: false, endT: -1, k: 0, go: false });
  billCarpet.count = 0; billCarpet.visible = false;
}
// The plaça waits on the hero's close-up until a tap (input.js); a dance played by itself goes on after `BILL_AUTO` s
const BILL_AUTO = 7;
export const bouHolds = () => BOU_FINALE.endT >= 0 && !BOU_FINALE.go && !((AUTOPLAY || G.watch) && BOU_FINALE.t - BOU_FINALE.endT > BILL_AUTO);
export const bouWaiting = () => bouHolds() && BOU_FINALE.k > 0.98; // the close-up is there: a tap goes on
export function bouTap() { if (!bouWaiting()) return false; BOU_FINALE.go = true; return true; }

// once a frame while they're out: fall (fluttering or tumbling, carried by the wind), settle, then lie and stir in it
export function bouBillsFrame(dt) {
  if (!BOU_FINALE.on) return;
  const t = BOU_FINALE.t += dt, wind = bouWind(t) * BOU_BILLS.wind, dir = bouWindDir(t), wx = Math.cos(dir), wz = Math.sin(dir);
  billTime.value = t;
  const P = billPaper.array, top = BILL_N - 1;
  for (let i = 0; i < BILL_N; i++) {
    const n = billNotes[i], a = t - n.delay;
    if (a < 0) { billCarpet.setMatrixAt(i, billZero); continue; }
    if (n.land < 0) { // in the air
      const p = n.ph + 2.6 * a; // its swing's phase
      n.cy = Math.max(n.y, n.cy - (n.tumble ? 1.25 * n.drop : bouFlutterDrop(n.drop, p)) * dt);
      n.dx += wx * wind * dt; n.dz += wz * wind * dt; // the gusts carry it
      if (i !== top) n.spin += 0.35 * dt; // a slow turn as it comes down (the hero keeps its heading: it lands upright for the lens)
      const low = Math.min(1, (n.cy - n.y) / 0.8); // the swing dies down near the floor: it lands where planned
      const sw = (n.tumble ? 0.3 * Math.sin(0.9 * a + n.ph) : 0.45 * Math.sin(p)) * low * (i === top ? 0.5 : 1); // tumbling: a slow glide; fluttering: the pendulum
      const hx = -Math.sin(n.yaw + n.spin), hz = -Math.cos(n.yaw + n.spin); // across the note (its short side): the way it swings
      billPos.set(n.x + n.dx + hx * sw, n.cy, n.z + n.dz + hz * sw);
      if (n.tumble) billQ.setFromEuler(billE.set(-Math.PI / 2 + (n.ph + 7 * a) * low, n.yaw + n.spin, 0)); // end over end round its long side
      else billQ.setFromEuler(billE.set(-Math.PI / 2 + 0.75 * Math.cos(p) * low, n.yaw + n.spin, 0)); // tilted into its swing (round its long side)
      P[2 * i] = 0.012 + 0.006 * Math.sin(3 * a + n.ph); P[2 * i + 1] = n.ph; // in the air it curls and flaps
      if (n.cy <= n.y) { n.land = t; n.q0.copy(billQ); n.x = billPos.x; n.z = billPos.z; n.dx = n.dz = 0; }
    } else { // lying: it settles flat, then only the wind stirs it (the loose ones on top slide a little)
      const s = Math.min(1, (t - n.land) / BILL_SETTLE), e = s * s * (3 - 2 * s), loose = i === top ? 0.05 : n.y > 0.03 ? 0.4 : 0.08;
      n.dx += wx * wind * loose * dt * 0.25; n.dz += wz * wind * loose * dt * 0.25;
      billQf.setFromEuler(billE.set(-Math.PI / 2, n.yaw + n.spin, 0));
      billQ.slerpQuaternions(n.q0, billQf, e);
      billPos.set(n.x + n.dx, n.y, n.z + n.dz);
      const gust = bouWind(t * 1.3 + n.ph); // under the step: a ripple never reaches the note above (the hero, on top, lifts more)
      P[2 * i] = (i === top ? 0.004 : BOU_BILLS.ripple) * (0.4 + 0.6 * gust) + 0.01 * (1 - e); P[2 * i + 1] = n.ph;
    }
    billCarpet.setMatrixAt(i, billM4.compose(billPos, billQ, billOne));
    if (i === top) BOU_FINALE.hero.set(billPos.x, n.y, billPos.z); // the camera aims where it lies, not where it falls
  }
  billCarpet.instanceMatrix.needsUpdate = true; billPaper.needsUpdate = true;
}
