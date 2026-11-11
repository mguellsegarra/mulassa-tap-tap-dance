// The Bou's end as it is drawn (src/figures/bou/bou-bills.js lays the banknotes, bou-end-shot.js films them), run frame by
// frame on a bare scene: the crane never jumps, no note lies on the filmed one and no two overlapping notes share a plane.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as correfoc from '../../../src/figures/bou/bou-correfoc.js';
import { bouPose, newBouPose, BOU_TIMING } from '../../../src/figures/bou/bou-dance.js';

const camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.5, 200);
camera.position.set(-6.6, 4.3, 0.9); camera.lookAt(0, 1, 0); camera.updateMatrixWorld();
const context = vm.createContext({ THREE, scene: new THREE.Scene(), renderer: { capabilities: { getMaxAnisotropy: () => 1 } }, renderProfile: { confetti: 260 }, camera,
  bou: { frame: new THREE.Object3D() }, confBills: { material: { map: null } }, ...correfoc, bouPose, newBouPose, BOU_TIMING, AUTOPLAY: false, G: { watch: false }, CALM: { matches: false }, END_LENS: { k: 0 } });
for (const f of ['bou-bills.js', 'bou-end-shot.js']) vm.runInContext(readFileSync(new URL(`../../../src/figures/bou/${f}`, import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, ''), context);
const run = code => vm.runInContext(code, context);
const FINALE = run('BOU_FINALE'), notes = run('billNotes'), SHOT = run('END_SHOT'), B = correfoc.BOU_BILLS;

// the song's last 6.4 s (the bombo), its end, then the crane and the close-up; the play camera drifts on until the crane takes it
const dt = 1 / 60, rain = 6.4, focus = new THREE.Vector3(0, 1, 0), last = new THREE.Vector3(), DRIFT = 0.003;
run('bouBillsStart')(141.5, 141.5 + rain, camera);
let worst = 0, worstAt = 0, first = -1;
for (let f = 0; f * dt < rain + 9; f++) {
  const t = f * dt;
  if (t >= rain) run('bouBillsEnd')(camera, focus);
  last.copy(camera.position);
  if (FINALE.k < 1e-9) camera.position.x += DRIFT; // (frame-camera.js: the play camera's own move, before the figure's end shot)
  camera.updateMatrixWorld();
  run('bouBillsFrame')(dt);
  const was = FINALE.k;
  run('bouEndShot')(dt, 0);
  const step = camera.position.distanceTo(last);
  if (FINALE.endT >= 0 && was === 0 && FINALE.k > 0) first = step;
  if (FINALE.k > 0 && step > worst) { worst = step; worstAt = t; }
}
assert(FINALE.k === 1, 'the crane came all the way down');
// the people by the lens are asked out of its way all the crane long (framing.js END_LENS: it went through a spectator's head)
assert.equal(run('END_LENS').k, 1, 'the people by the lens shrink away under the crane');
// and it ends closer than the note is wide: a phone crops its corners and its small print reads
assert(SHOT.view < 0.14 * B.scale, `the close-up shows ${SHOT.view} m across, less than the note's ${0.14 * B.scale}`);
// it sets off from wherever the play camera is by then: from where it stood when the song ended it snapped back, a jump
assert(first >= 0 && first < 2 * DRIFT, `the crane's first frame moves ${(first * 100).toFixed(1)} cm (the play camera's own ${(DRIFT * 100).toFixed(1)})`);
// and no frame of it steps further than its own top speed: the note stepping up onto the mound as it lands moved the shot 15 cm at once
const d0 = FINALE.cam.distanceTo(FINALE.hero), top = 1.5 * d0 / SHOT.ease * dt; // smoothstep's peak speed
assert(worst < top * 1.15, `the crane's largest step ${(worst * 100).toFixed(1)} cm at ${worstAt.toFixed(2)} s (its own top speed ${(top * 100).toFixed(1)} cm a frame)`);

// the carpet: every note down, the hero on top with nothing over it, and no two overlapping notes in one plane (z-fighting)
const lying = notes.filter(n => n.land >= 0), hero = notes.at(-1);
assert(hero.land >= 0 && lying.length > notes.length * 0.9, `${lying.length} of ${notes.length} notes lie`);
const HW = 0.07 * B.scale, HH = 0.035 * B.scale; // half a note, as drawn
const axes = n => { const a = n.yaw + n.spin; return [Math.cos(a), -Math.sin(a)]; }; // its long side, in plan
const overlap = (p, q) => {
  const [px, pz] = axes(p), [qx, qz] = axes(q), dx = q.x - p.x, dz = q.z - p.z;
  for (const [ex, ez] of [[px, pz], [-pz, px], [qx, qz], [-qz, qx]]) {
    const rp = HW * Math.abs(px * ex + pz * ez) + HH * Math.abs(-pz * ex + px * ez), rq = HW * Math.abs(qx * ex + qz * ez) + HH * Math.abs(-qz * ex + qx * ez);
    if (Math.abs(dx * ex + dz * ez) >= rp + rq) return false;
  }
  return true;
};
let pairs = 0;
for (let i = 0; i < lying.length; i++) for (let j = i + 1; j < lying.length; j++) {
  const p = lying[i], q = lying[j];
  if (Math.abs(p.x - q.x) > 2 * HW + HH || Math.abs(p.z - q.z) > 2 * HW + HH || !overlap(p, q)) continue;
  pairs++;
  assert(Math.abs(p.y - q.y) > B.step * 0.4, `notes ${notes.indexOf(p)} and ${notes.indexOf(q)} overlap ${(Math.abs(p.y - q.y) * 1000).toFixed(2)} mm apart (landed ${p.land.toFixed(3)} and ${q.land.toFixed(3)} s)`);
  if (p === hero || q === hero) assert((p === hero ? q : p).y < hero.y, 'nothing lies on the filmed note');
}
assert(pairs > 500, `the mound overlaps (${pairs} pairs checked)`);
console.log(`bou finale: the crane's steps (${(worst * 100).toFixed(1)} cm at most), the filmed note clear, ${pairs} overlapping pairs on their own planes ok`);
