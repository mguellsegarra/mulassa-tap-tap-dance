// Cameras: the play camera (framePlayCamera), the title camera's state and the prop check.
import { createOrbit } from './orbit.js';
import { smoothDamp } from './framing.js';
import { plaza, camFocus, FRONT, camShift, camera, CAM_AZ, CAM_EL, cameraTarget } from './stage.js';
import { playStage } from '../hud/layout.js';
import { figureScale } from '../game/figure-song.js';
import { M } from './mula-motion.js';
import { CALM } from '../core/env.js';
import { clock, G } from '../game/state.js';
import { TAU } from '../core/anim.js';
import { HH, K } from '../hud/canvas.js';

// Title only: a drag that starts on empty canvas steers the camera round her, two fingers / the wheel zoom
// (src/scene/orbit.js); a press on a canvas button still picks it at once. Never with a sheet up, never outside the title.
export const titleC = { x: 0, z: 0, on: false }, orbitHome = { pitch: 0, dist: 11 }, orbit = createOrbit(orbitHome), pnow = () => performance.now() / 1000;
export const titleS = { x: new Float64Array(2), v: new Float64Array(2) }, TITLE_FOLLOW = 1.6, TITLE_SWAY = 0.3; // the title camera's follow spring (seconds to catch up) and its sway (rad, twice the play camera's)
// Keeps the play camera inside the open square (plaza.inner, minus a margin), or it ends up behind a building and
// sees its roof: when the wanted spot is outside, it comes closer horizontally and rises by the same distance, so
// she keeps her size on screen and is seen a bit more from above. No allocations: it edits `p` in place.
export function insidePlaza(p, tx, ty, tz) {
  const lim = plaza.inner - 1.5, ox = p.x - tx, oz = p.z - tz;
  let k = 1;
  if (Math.abs(p.x) > lim && ox) k = Math.min(k, (Math.sign(ox) * lim - tx) / ox);
  if (Math.abs(p.z) > lim && oz) k = Math.min(k, (Math.sign(oz) * lim - tz) / oz);
  if (k >= 1) return p;
  k = Math.max(0, k);
  const hd = Math.hypot(ox, oz), up = p.y - ty, dist = Math.hypot(hd, up);
  p.x = tx + ox * k; p.z = tz + oz * k; p.y = ty + Math.sqrt(dist * dist - hd * hd * k * k);
  return p;
}
// The play camera (v3): what you SEE is the spec, not a fit of her whole turn/jump envelope. From Marc's ?cam sessions on a
// desktop: a lens of CAMV.fov, a slice of the world at her CAMV.h metres tall (a narrow screen instead needs CAMV.w metres
// across: whichever asks for the greater distance wins), her focus point CAMV.stage of the way down the stage (lane -> pad),
// looked at from CAM_EL above and CAM_AZ round. The same view at every size, so a bigger screen only shows the same shot
// with more pixels. It never sits still: a slow sway (DRIFT) round her, up and down and in and out, and it turns a little
// with her (DRIFT.follow of her heading). Critically damped springs (framing.js smoothDamp) carry it over from the title camera.
export const CAMS = { x: new Float64Array(9), v: new Float64Array(9), live: false }; // focus x z, distance, heading follow, shift, position xyz, oblique
const CAMV = { fov: 54, h: 8.25, w: 8.4, stage: 0.42 };
export const DRIFT = { az: 0.2, el: 0.05, dist: 0.03, follow: 0.26, oblique: 0.4, tAz: 29, tAz2: 17, tEl: 21, tD: 13 }; // rad / rad / share / rad, seconds: slow, unrelated periods (never a rhythm you can spot)
const CAM_T = { focus: 0.5, dist: 1.8, follow: 2.8, shift: 0.5, pos: 1.5 }; // seconds to (about) catch up. Constant (a spring whose stiffness changes while it is still far from its target whiplashes); the swoop in from the title camera is just this slow
export function framePlayCamera(dt, mx, mz, snap = false) { // snap: jump straight to the settled framing (tests)
  const area = playStage(), focusY = 1.4 * figureScale(), s = CAMS;
  if (!s.live || snap) { // carry on from wherever the camera is (the title's orbit), at rest
    s.v.fill(0);
    s.x[0] = snap ? mx : camFocus.x; s.x[1] = snap ? mz : camFocus.z; s.x[3] = Math.sin(M.yaw - FRONT); s.x[8] = Math.cos(M.yaw - FRONT) ** 2; s.x[4] = camShift;
    s.x[2] = Math.hypot(camera.position.x - s.x[0], camera.position.y - focusY, camera.position.z - s.x[1]);
    s.x[5] = camera.position.x; s.x[6] = camera.position.y; s.x[7] = camera.position.z;
    s.live = true;
  }
  const t = snap ? 0 : dt;
  const follow = snap ? (s.x[3] = Math.sin(M.yaw - FRONT)) : smoothDamp(s, 3, Math.sin(M.yaw - FRONT), CAM_T.follow, t); // her heading, smoothly (a sine: no wrap-around step) and slowly: quick dance turns never pan the shot
  const cr = Math.cos(M.yaw - FRONT) ** 2, obl = snap ? (s.x[8] = cr) : smoothDamp(s, 8, cr, CAM_T.follow, t); // front or rear: the camera slips round to a side so she never reads flat (0 at her sides)
  if (camera.fov !== CAMV.fov) { camera.fov = CAMV.fov; camera.updateProjectionMatrix(); }
  const tan = Math.tan(camera.fov * Math.PI / 360);
  const br = CALM.matches ? 0 : 1, T = clock * TAU;
  const az = CAM_AZ + br * DRIFT.az * (0.65 * Math.sin(T / DRIFT.tAz) + 0.35 * Math.sin(T / DRIFT.tAz2 + 1.3))
    + DRIFT.follow * follow - DRIFT.oblique * obl;
  const el = CAM_EL + br * DRIFT.el * (0.7 * Math.sin(T / DRIFT.tEl + 0.7) + 0.3 * Math.sin(T / 9));
  const dT = Math.max(CAMV.h, CAMV.w / camera.aspect) * figureScale() / (2 * tan) * (1 + br * DRIFT.dist * Math.sin(T / DRIFT.tD)) * (G.collapseT ? 1.2 : 1) * (HH < 300 ? 1.2 : 1); // (lying down she is wider; a short window has little stage above her: a little more room)
  if (snap) { s.x[0] = mx; s.x[1] = mz; s.x[2] = dT; }
  const fx = smoothDamp(s, 0, mx, CAM_T.focus, t), fz = smoothDamp(s, 1, mz, CAM_T.focus, t), d = smoothDamp(s, 2, dT, CAM_T.dist, t);
  const ce = Math.cos(el);
  insidePlaza(cameraTarget.set(fx + d * ce * Math.sin(az), focusY + d * Math.sin(el), fz + d * ce * Math.cos(az)), fx, focusY, fz);
  if (snap) { s.x[5] = cameraTarget.x; s.x[6] = cameraTarget.y; s.x[7] = cameraTarget.z; }
  camera.position.set(smoothDamp(s, 5, cameraTarget.x, CAM_T.pos, t), smoothDamp(s, 6, cameraTarget.y, CAM_T.pos, t), smoothDamp(s, 7, cameraTarget.z, CAM_T.pos, t));
  camera.lookAt(camFocus.set(fx, focusY, fz));
  // the lens shift puts her focus point CAMV.stage of the way down the stage (css px: the focus is at the middle of the screen without it)
  const shift = (area.top + (G.collapseT ? 0.6 : CAMV.stage) * (area.bottom - area.top)) * K - HH * K / 2; // (collapsed: lower, her legs kick up)
  if (snap) s.x[4] = shift;
  return smoothDamp(s, 4, shift, CAM_T.shift, t);
}
