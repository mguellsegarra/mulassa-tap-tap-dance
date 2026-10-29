// The play camera (framePlayCamera): a fixed view of a slice of the world round the figure, a slow drift, the Bou's
// festa hold (a figure's festa: crowd-effects.js); its end crane is bou-end-shot.js's. The menu camera, the orbit and the shared helpers are in cameras.js.
import { lookStep, resetLook } from './orbit.js';
import { smoothDamp } from './framing.js';
import { plaza, camFocus, FRONT, camShift, camera, CAM_AZ, CAM_EL, cameraTarget } from './stage.js';
import { playStage } from '../hud/layout.js';
import { figureScale, selectedFigure } from '../game/figure-song.js';
import { M } from './figure-springs.js';
import { festaNow } from './crowd-effects.js';
import { CALM, CAMDRAC } from '../core/env.js';
import { clock, G } from '../game/state.js';
import { TAU } from '../core/math.js';
import { HH, K } from '../hud/canvas.js';
import { traitsOf } from '../figures/index.js';
import { look, pnow, insidePlaza, DRIFT } from './cameras.js';

// The play camera (v3): what you SEE is the spec, not a fit of her whole turn/jump envelope. From ?cam sessions on a
// desktop: a lens of CAMV.fov, a slice of the world at her CAMV.h metres tall (a narrow screen instead needs CAMV.w metres
// across: whichever asks for the greater distance wins), her focus point CAMV.stage of the way down the stage (lane -> pad),
// looked at from CAM_EL above and CAM_AZ round. The same view at every size, so a bigger screen only shows the same shot
// with more pixels. It never sits still: a slow sway (DRIFT) round her, up and down and in and out, and it turns a little
// with her (DRIFT.follow of her heading). Critically damped springs (framing.js smoothDamp) carry it over from the title camera.
export const CAMS = { x: new Float64Array(9), v: new Float64Array(9), live: false }; // focus x z, distance, heading follow, shift, position xyz, oblique
const CAMV = { fov: 54, h: 8.25, w: 8.4, stage: 0.42 };
// The Drac travels round the whole dance ground (up to 4 m from its centre) and spins a dozen times: followed like her, the
// plaça slid and swung under the note lane. It follows `side` of its travel across the shot and `depth` of it towards /
// away from the lens (from the dance's centre, the plaça's: depth unfollowed, or a slower focus spring, lifted it under
// the lane on a desktop), a little further back so it stays whole on a phone, and never turns with its heading. The
// Mulassa's reference-led dance travels and turns as much (figures/mulassa/mula-dance.js: up to ~5.7 m from its centre, about
// four turns at the end), so she is followed the same way, at her own size; across a little more (a portrait phone is
// narrow: at half she left it at the far end of her advance). That advance comes up to ~2.4 m towards the lens (as towards
// the 2017 camera), and a tall phone's camera already stands at the plaça's edge (insidePlaza would lift it into a view
// from above): `room` keeps the camera's extra distance (dist) and its retreat with her inside the square; beyond, she
// comes closer.
const DRAC_CAM = { side: 0.5, depth: 0.9, dist: 1.12 }, MULA_CAM = { side: 1, depth: 0.9, dist: 1.12, room: true };
// The Bou's festa: carried round a 2.6 m ring, followed it came within 4 m of a desktop's lens and filled the screen
// (step back). While its colla carries it the camera lets `hold` of its follow go (towards the plaça's
// centre: all of it cropped the Bou at a phone's edge) and stands at least `dist` m off (a phone's camera is already
// further: it stays), so the whole rotllana is in the shot; eased in and out with the carry (bouFestaAt).
const FESTA_CAM = { hold: 0.6, dist: 13, rise: 0.25 }; // rise: rad higher (26° -> ~40°), the public's snake round the plaça in view
const CAM_T = { focus: 0.5, dist: 1.8, follow: 2.8, shift: 0.5, pos: 1.5 }; // seconds to (about) catch up. Constant (a spring whose stiffness changes while it is still far from its target whiplashes); the swoop in from the title camera is just this slow
export function framePlayCamera(dt, mx, mz, snap = false) { // snap: jump straight to the settled framing (tests)
  const area = playStage(), focusY = 1.4 * figureScale(), s = CAMS, calm = CAMDRAC !== 'segueix', F = traitsOf(selectedFigure.id).playCam === 'drac' ? DRAC_CAM : MULA_CAM;
  let far = calm ? F.dist : 1;
  if (calm) { // (the dance's centre is the plaça's: drac-layout.js placeDance, mula-layout.js placeMulaDance)
    const ax = Math.sin(CAM_AZ), az = Math.cos(CAM_AZ), along = mx * ax + mz * az;
    let depth = along * F.depth;
    if (F.room) { // the lens's settled horizontal reach (its distance sways DRIFT.dist, its heading DRIFT.az) against the square's edge
      const reach = Math.max(CAMV.h, CAMV.w / camera.aspect) * figureScale() / (2 * Math.tan(CAMV.fov * Math.PI / 360)) * (1 + DRIFT.dist) * Math.cos(CAM_EL);
      const wall = (plaza.inner - 1.5) / Math.max(Math.abs(Math.sin(CAM_AZ - DRIFT.az)), Math.abs(ax));
      far = Math.max(1, Math.min(F.dist, wall / reach));
      if (depth > 0) depth = Math.min(depth, Math.max(0, wall - reach * far));
    }
    mx = (mx - along * ax) * F.side + ax * depth; mz = (mz - along * az) * F.side + az * depth;
  }
  const festa = festaNow(); // 0 but in a figure's festa (the Bou held up)
  if (festa > 0) { mx *= 1 - FESTA_CAM.hold * festa; mz *= 1 - FESTA_CAM.hold * festa; }
  if (!s.live || snap) { // carry on from wherever the camera is (the title's orbit), at rest
    s.v.fill(0);
    s.x[0] = snap ? mx : camFocus.x; s.x[1] = snap ? mz : camFocus.z; s.x[3] = Math.sin(M.yaw - FRONT); s.x[8] = Math.cos(M.yaw - FRONT) ** 2; s.x[4] = camShift;
    s.x[2] = Math.hypot(camera.position.x - s.x[0], camera.position.y - focusY, camera.position.z - s.x[1]);
    s.x[5] = camera.position.x; s.x[6] = camera.position.y; s.x[7] = camera.position.z;
    s.live = true;
    resetLook(look); // every run starts on the film's own shot
  }
  const t = snap ? 0 : dt;
  const head = calm ? 0 : Math.sin(M.yaw - FRONT), flat = calm ? 0 : Math.cos(M.yaw - FRONT) ** 2;
  const follow = snap ? (s.x[3] = head) : smoothDamp(s, 3, head, CAM_T.follow, t); // her heading, smoothly (a sine: no wrap-around step) and slowly: quick dance turns never pan the shot
  const obl = snap ? (s.x[8] = flat) : smoothDamp(s, 8, flat, CAM_T.follow, t); // front or rear: the camera slips round to a side so she never reads flat (0 at her sides)
  if (camera.fov !== CAMV.fov) { camera.fov = CAMV.fov; camera.updateProjectionMatrix(); }
  const tan = Math.tan(camera.fov * Math.PI / 360);
  const br = CALM.matches ? 0 : 1, T = clock * TAU;
  const az = CAM_AZ + br * DRIFT.az * (0.65 * Math.sin(T / DRIFT.tAz) + 0.35 * Math.sin(T / DRIFT.tAz2 + 1.3))
    + DRIFT.follow * follow - DRIFT.oblique * obl;
  const el = CAM_EL + br * DRIFT.el * (0.7 * Math.sin(T / DRIFT.tEl + 0.7) + 0.3 * Math.sin(T / 9)) + FESTA_CAM.rise * festa;
  let dT = Math.max(CAMV.h, CAMV.w / camera.aspect) * figureScale() / (2 * tan) * (1 + br * DRIFT.dist * Math.sin(T / DRIFT.tD)) * (G.collapseT ? 1.2 : 1) * (HH < 300 ? 1.2 : 1) * far; // (lying down she is wider; a short window has little stage above her: a little more room)
  if (festa > 0) dT += Math.max(0, FESTA_CAM.dist * figureScale() - dT) * festa;
  if (snap) { s.x[0] = mx; s.x[1] = mz; s.x[2] = dT; }
  const fx = smoothDamp(s, 0, mx, CAM_T.focus, t), fz = smoothDamp(s, 1, mz, CAM_T.focus, t), d = smoothDamp(s, 2, dT, CAM_T.dist, t);
  const ce = Math.cos(el);
  insidePlaza(cameraTarget.set(fx + d * ce * Math.sin(az), focusY + d * Math.sin(el), fz + d * ce * Math.cos(az)), fx, focusY, fz);
  if (snap) { s.x[5] = cameraTarget.x; s.x[6] = cameraTarget.y; s.x[7] = cameraTarget.z; }
  camera.position.set(smoothDamp(s, 5, cameraTarget.x, CAM_T.pos, t), smoothDamp(s, 6, cameraTarget.y, CAM_T.pos, t), smoothDamp(s, 7, cameraTarget.z, CAM_T.pos, t));
  if (G.watch && !snap) applyWatchLook(dt, fx, focusY, fz);
  camera.lookAt(camFocus.set(fx, focusY, fz));
  // the lens shift puts her focus point CAMV.stage of the way down the stage (css px: the focus is at the middle of the screen without it)
  const shift = (area.top + (G.collapseT ? 0.6 : CAMV.stage) * (area.bottom - area.top)) * K - HH * K / 2; // (collapsed: lower, her legs kick up)
  if (snap) s.x[4] = shift;
  return smoothDamp(s, 4, shift, CAM_T.shift, t);
}
// «Mira el ball»: the player's offsets turn and scale the shot round the focus (fx, fy, fz), after the springs (a drag never lags);
// the caller aims the camera at the focus afterwards
export function applyWatchLook(dt, fx, fy, fz) {
  lookStep(look, dt, pnow());
  if (Math.abs(look.yaw) + Math.abs(look.x[0]) + Math.abs(look.x[1] - 1) <= 1e-4) return;
  const ox = camera.position.x - fx, oy = camera.position.y - fy, oz = camera.position.z - fz, hd = Math.hypot(ox, oz);
  const r = Math.hypot(hd, oy) * look.x[1], a = Math.atan2(ox, oz) + look.yaw, e = Math.max(0.12, Math.min(1.1, Math.atan2(oy, hd) + look.x[0]));
  camera.position.copy(insidePlaza(cameraTarget.set(fx + r * Math.cos(e) * Math.sin(a), fy + r * Math.sin(e), fz + r * Math.cos(e) * Math.cos(a)), fx, fy, fz));
}
