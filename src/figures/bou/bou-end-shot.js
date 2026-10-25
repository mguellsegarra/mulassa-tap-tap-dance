// The Bou's end on the play camera (BOU_SCENE.endShot: main.js runs each figure's over play and results).
import * as THREE from 'three';
import { camera } from '../../scene/stage.js';
import { CALM } from '../../core/env.js';
import { BOU_FINALE } from './bou-bills.js';

// The Bou's end (bou-bills.js): when its song ends the camera comes down, a music video's crane, from
// wherever the play camera stood to the one note that lands face up on the mound between the Bou and the lens: its eye
// leaves the Bou for the note first, the lens closes in last (`fov`: a long lens, the note filling `view` m of the screen's
// smaller side), looking down at `el`; then it keeps pushing in a little (`push`, easing out over `pushT` s) and drifts
// round the note (`arc` rad/s, `arcMax` in all), so the shot never freezes while the plaça waits for a tap. Measured:
// <= 0.15 rad/s of turn. Shake waits (main.js scales it by 1 - k), the lens shift eases away with k; reduced motion keeps
// the play camera.
export const END_SHOT = { wait: 0.4, ease: 3.4, fov: 22, view: 0.38, el: 0.8, push: 0.25, pushT: 3, arc: 0.03, arcMax: 0.3 };
const endPos = new THREE.Vector3(), endLook = new THREE.Vector3();
export function bouEndShot(dt, shift) {
  if (!BOU_FINALE.on || BOU_FINALE.endT < 0 || CALM.matches) return shift;
  const E = END_SHOT, ct = BOU_FINALE.t - BOU_FINALE.endT - E.wait, x = Math.min(1, Math.max(0, ct / E.ease)), k = x * x * (3 - 2 * x);
  BOU_FINALE.k = k;
  if (k <= 0) return shift;
  const H = BOU_FINALE.hero, after = Math.max(0, ct - E.ease), half = Math.atan(Math.tan(E.fov * Math.PI / 360) * Math.min(1, camera.aspect));
  const d = E.view / 2 / Math.tan(half) * (1 + E.push * Math.exp(-after / E.pushT)), a = Math.atan2(BOU_FINALE.cam.x - H.x, BOU_FINALE.cam.z - H.z) + Math.min(E.arcMax, E.arc * after);
  endPos.set(H.x + d * Math.cos(E.el) * Math.sin(a), H.y + d * Math.sin(E.el), H.z + d * Math.cos(E.el) * Math.cos(a));
  camera.position.lerpVectors(BOU_FINALE.cam, endPos, k);
  const kl = Math.min(1, 1.8 * x), kLook = kl * kl * (3 - 2 * kl); // a long lens on the Bou mid-crane filled the screen with it
  camera.lookAt(endLook.lerpVectors(BOU_FINALE.look, H, kLook));
  const fov = BOU_FINALE.fov + (E.fov - BOU_FINALE.fov) * k * k;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  return shift * (1 - k);
}
