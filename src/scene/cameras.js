// Cameras: the play camera (framePlayCamera), the menu camera (frameMenuCamera: splash, title, selector) and its state.
import * as THREE from 'three';
import { createOrbit, orbitStep, roomAlong, ORBIT } from './orbit.js';
import { smoothDamp, menuFit, envelope } from './framing.js';
import { plaza, camFocus, FRONT, camShift, camShiftX, camera, CAM_AZ, CAM_EL, cameraTarget } from './stage.js';
import { playStage } from '../hud/layout.js';
import { figureScale, selectedFigure } from '../game/figure-song.js';
import { DRAC } from '../game/figures.js';
import { M } from './mula-motion.js';
import { CALM, CAMDRAC } from '../core/env.js';
import { clock, G } from '../game/state.js';
import { TAU } from '../core/anim.js';
import { HH, K, W, SAFE } from '../hud/canvas.js';

// Remove the previous render's offset before any rig reads the camera. The short impact never enters framing springs.
let impactCameraX = 0, impactCameraY = 0;
export function clearCameraImpact() {
  camera.position.x -= impactCameraX; camera.position.y -= impactCameraY;
  impactCameraX = impactCameraY = 0;
}
export function applyCameraImpact(strength) {
  const k = CALM.matches || G.paused ? 0 : strength * strength * (G.state === 'play' ? 0.35 : 1);
  impactCameraX = Math.sin(clock * 47) * 0.25 * k;
  impactCameraY = Math.sin(clock * 61) * 0.2 * k;
  camera.position.x += impactCameraX; camera.position.y += impactCameraY;
}

// Title only: a drag that starts on empty canvas steers the camera round her, two fingers / the wheel zoom
// (src/scene/orbit.js); a press on a canvas button still picks it at once. Never with a sheet up, never outside the title.
export const titleC = { x: 0, z: 0, on: false }, orbitHome = { pitch: 0, dist: 11 }, orbit = createOrbit(orbitHome), pnow = () => performance.now() / 1000;
export const titleS = { x: new Float64Array(2), v: new Float64Array(2) }, TITLE_FOLLOW = 0.7, TITLE_SWAY = 0.3; // the menu camera's follow spring (seconds to catch up: 1.6 lagged the Mulassa's travelling dance by ~2 m, out of her band) and its sway (rad, twice the play camera's)
// The menu camera (splash, title, selector) orbits her, not the middle: wandering about she'd otherwise pass right in front of the
// lens, huge. The player may steer it (orbit.js: its limits keep it inside the square and above the crowd); left alone it eases
// back after ORBIT.idle s, and at once when the figure changes. In «mode foto» (keep) the player's framing stays.
// On the selector the figure is framed, not placed at a fixed distance: frameMenuLens measures her rigid outline as this camera sees it
// and backs off / comes closer until she fills the free rect the selector measured (select-ui.js band: under the info block, above
// the dock, right of a side panel), and a lens shift (view offset, both axes: never a tilt) puts her centre there. The splash
// and the title keep their one shot for every figure, with the caller's `aim` (css px below the middle).
export const lens = { x: 0, y: 0 }; // the menu's lens shift, css px (her centre right of / below the screen's middle), smoothed
const MENU = { x: new Float64Array(2), v: new Float64Array(2), w: 0, h: 0, ox: 0, oy: 0, mx: 0, mz: 0, tx: 0, ty: 0, root: null, away: true, view: false, quick: false, fit: { dist: 11, cx: 0, cy: 0, floor: 0 } }; // shift spring; her extents' envelope (m); her outline's middle across / feet off the focus (tangents, slow)
const MENU_T = { shift: 0.9, up: 0.35, down: 4, centre: 1.2, exit: 0.6 }; // s: the lens shift's spring (exit: it and her size/height after photo mode, so the returning dock never covers her for seconds); her extents rise / fall (turning side on and back never pumps the shot); her centre's slow average (the focus already follows her: a turn must not swing the shot)
const OUTLINES = new Map(), V3 = new THREE.Vector3(), FREE = { top: 0, bottom: 0, left: 0, right: 0, hardTop: 0 };
// Her outline, cheaply: for each of her meshes, its farthest vertices along 14 directions (axes and diagonals: its hull's support
// points, in its own space, once per figure). Each frame they go through the mesh's live matrix, so the shot reads her real pose
// (wings, head, planted shoes) from any side at a few hundred points' cost; the envelope and slow averages below keep it from
// chasing a swinging limb.
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
function outline(root) {
  let list = OUTLINES.get(root);
  if (list) return list;
  list = [];
  const mi = new THREE.Matrix4(), v = new THREE.Vector3();
  root.traverse(o => {
    const pos = o.isMesh && o.geometry.attributes.position;
    if (!pos?.count) return;
    const best = new Float64Array(DIRS.length).fill(-Infinity), pts = new Float32Array(DIRS.length * 3);
    for (let k = 0, n = o.isInstancedMesh ? o.count : 1; k < n; k++) {
      if (o.isInstancedMesh) o.getMatrixAt(k, mi);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); if (o.isInstancedMesh) v.applyMatrix4(mi);
        for (let d = 0; d < DIRS.length; d++) { const t = v.x * DIRS[d][0] + v.y * DIRS[d][1] + v.z * DIRS[d][2]; if (t > best[d]) { best[d] = t; pts.set([v.x, v.y, v.z], d * 3); } }
      }
    }
    list.push({ o, pts });
  });
  OUTLINES.set(root, list);
  return list;
}
const shown = (o, root) => { for (; o && o !== root; o = o.parent) if (!o.visible) return false; return true; };
export function frameMenuCamera(dt, mx, mz, root, rect, view, keep, aim) {
  const far = camera.aspect < 1 ? 1.4 : 1, now = pnow();
  if (MENU.view && !view) { MENU.quick = true; orbit.last = -Infinity; } // leaving photo mode hands the camera back at once, quickly (until it is framed again)
  MENU.view = view; if (orbit.ptrs.size || view) MENU.quick = false;
  orbitHome.time = MENU.quick ? MENU_T.exit : undefined;
  if (root !== MENU.root) { MENU.root = root; MENU.w = MENU.h = MENU.ox = MENU.oy = MENU.tx = MENU.ty = 0; if (root) orbit.last = -Infinity; } // another figure: frame it now, from scratch
  if (root?.visible && MENU.w && Math.hypot(MENU.mx - mx, MENU.mz - mz) < 4) { mx = MENU.mx; mz = MENU.mz; } // follow the middle of her outline (her pivot is off it as she turns), measured last frame; never a stray part metres away
  // «mode foto» on a narrow screen: back off (same angle) until ~7 m fit across, or her 4 m body barely fits
  const fit = view ? Math.max(1, 3.5 / (Math.tan(camera.fov * Math.PI / 360) * camera.aspect) / 11) : 1;
  const homeH = ORBIT.focusY + (4.2 * far - ORBIT.focusY) * fit, homeD = 11 * fit; // plaza level, in among the crowd (the old high wide shot showed mostly bare floor)
  orbitHome.pitch = Math.atan2(homeH - ORBIT.focusY, homeD); orbitHome.dist = Math.hypot(homeD, homeH - ORBIT.focusY);
  if (root && MENU.w && !bandless(rect)) orbitHome.dist = view ? Math.max(orbitHome.dist, MENU.fit.dist) : MENU.fit.dist; // (photo mode: the plaça round her, and all of her)
  // her sway and steps never shake the shot: it drifts after her on a critically damped spring (like the play camera; a first-order
  // filter changes velocity the instant she does, which read as a jerk on every hop)
  if (!titleC.on) { titleS.x[0] = mx; titleS.x[1] = mz; titleS.v.fill(0); }
  else if (MENU.away && !view && !orbit.fresh && !orbit.ptrs.size) adopt(); // back from another camera (results, a game): carry on from it, then ease to the framing
  titleC.x = smoothDamp(titleS, 0, mx, TITLE_FOLLOW, dt); titleC.z = smoothDamp(titleS, 1, mz, TITLE_FOLLOW, dt); titleC.on = true;
  const cx = titleC.x, cz = titleC.z;
  // The idle azimuth is the play camera's own (CAM_AZ: no swoop across the plaça when a game starts), swaying slowly; like the play
  // camera it no longer turns with her heading (both figures spin in their dances: it swung the shot ~0.3 rad a turn; ?camdrac=segueix
  // brings it back). The player's drag/flick still steers, and after a few idle seconds it eases back.
  { const br = CALM.matches ? 0 : 1, T = clock * TAU;
    orbitHome.yaw = CAM_AZ + br * TITLE_SWAY * (0.65 * Math.sin(T / DRIFT.tAz) + 0.35 * Math.sin(T / DRIFT.tAz2 + 1.3)) + (CAMDRAC === 'segueix' ? DRIFT.follow * Math.sin(M.yaw - FRONT) : 0); }
  if (orbit.fresh) orbit.yaw = orbitHome.yaw; // (the very first frame starts at home)
  const o = orbitStep(orbit, dt, now, orbitHome, roomAlong(cx, cz, Math.sin(orbit.yaw), Math.cos(orbit.yaw), plaza.inner - 1.5), keep);
  const hd = o.x[1] * Math.cos(o.x[0]);
  camera.position.copy(insidePlaza(cameraTarget.set(cx + Math.sin(o.yaw) * hd, ORBIT.focusY + o.x[1] * Math.sin(o.x[0]), cz + Math.cos(o.yaw) * hd), cx, 1.2, cz));
  camera.lookAt(camFocus.set(cx, camFocus.y + (1.2 - camFocus.y) * (1 - Math.exp(-dt / 0.3)), cz)); // (the aim is the spring itself: a lag on top swung her across the shot; its height eases in from another camera's)
  return frameMenuLens(dt, root, rect, aim);
}
function adopt() { // the orbit and the follow spring take the current camera as it is, at rest
  const hx = camera.position.x - camFocus.x, hz = camera.position.z - camFocus.z, hd = Math.hypot(hx, hz), up = camera.position.y - ORBIT.focusY;
  orbit.yaw = Math.atan2(hx, hz); orbit.x[0] = orbit.raw = Math.atan2(up, hd); orbit.x[1] = orbit.zoomRaw = orbit.zoomTo = Math.hypot(hd, up);
  orbit.v.fill(0); orbit.spin = 0; orbit.last = -Infinity;
  titleS.x[0] = titleC.x = camFocus.x; titleS.x[1] = titleC.z = camFocus.z; titleS.v.fill(0);
}
// The lens shift (and, for the next frame, the distance) that put her outline's centre in the free rect, filling `fill` of it.
// Read off this camera's view (not its projection): the shift never feeds back into what it measures, and nothing reads the DOM.
// A window under ~500 px tall leaves the selector no band (its dock stands beside the info panel: the band comes out empty or
// negative): nowhere is free, so she keeps the old shot (fixed distance, focus up at the band) rather than hiding behind the pills or
// the cards. A short band (a 320x568 phone's 84 px) is not empty: menuFit stands her on it.
const bandless = rect => rect && rect.bottom - rect.top < 48;
function frameMenuLens(dt, root, rect, aim) {
  const vw = W * K, vh = HH * K, tan = Math.tan(camera.fov * Math.PI / 360), ppm = vh / (2 * tan);
  if (MENU.away) { MENU.x[0] = camShiftX; MENU.x[1] = camShift; MENU.v.fill(0); MENU.away = false; } // coming from another camera: on from its shift
  const none = bandless(rect); // (the old shot: her focus at the band's middle, as far as a quarter screen up)
  let tx = root && !none ? MENU.tx : 0, ty = none ? Math.max(-0.25 * vh, Math.min(0.25 * vh, (rect.top + rect.bottom) / 2 - vh / 2)) : root ? MENU.ty : aim; // (a hidden figure, a pending card: the shot holds still)
  if (root?.visible) {
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse, D = camera.position.distanceTo(camFocus);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, wx0 = Infinity, wx1 = -Infinity, wz0 = Infinity, wz1 = -Infinity, near = false;
    const parts = outline(root);
    for (let j = 0; j < parts.length; j++) {
      const { o, pts } = parts[j];
      if (!shown(o, root)) continue;
      for (let i = 0; i < pts.length; i += 3) { // world middle, and the angular extents (tangents) this camera sees
        const p = V3.fromArray(pts, i).applyMatrix4(o.matrixWorld);
        if (p.x < wx0) wx0 = p.x; if (p.x > wx1) wx1 = p.x; if (p.z < wz0) wz0 = p.z; if (p.z > wz1) wz1 = p.z;
        p.applyMatrix4(view);
        if (-p.z < 0.5) near = true; // (part of her by or behind the lens, a photo camera handing over: no measure this frame)
        const z = Math.max(0.1, -p.z), ax = p.x / z, ay = p.y / z;
        if (ax < x0) x0 = ax; if (ax > x1) x1 = ax; if (ay < y0) y0 = ay; if (ay > y1) y1 = ay;
      }
    }
    const inView = Math.abs(x0 + x1) < 3 * tan * camera.aspect && Math.abs(y0 + y1) < 3 * tan; // her middle within 1.5 fields of view: the camera is on her (not catching up from far away)
    if (x0 < Infinity && !near && inView) {
      MENU.mx = (wx0 + wx1) / 2; MENU.mz = (wz0 + wz1) / 2;
      const w = (x1 - x0) * D, h = (y1 - y0) * D, k = MENU.w ? 1 - Math.exp(-dt / MENU_T.centre) : 1; // metres at the orbit's distance: what that distance must fit (no feedback from it)
      MENU.w = MENU.w ? envelope(MENU.w, w, dt, MENU_T.up, MENU_T.down) : w; MENU.h = MENU.h ? envelope(MENU.h, h, dt, MENU_T.up, MENU_T.down) : h;
      MENU.ox += ((x0 + x1) / 2 - MENU.ox) * k; MENU.oy += (y0 - MENU.oy) * k; // her middle across, her feet down
    }
    // the free rect: the selector's band, or (photo mode) the whole screen; inside the safe areas either way
    FREE.top = rect ? rect.top : SAFE.t; FREE.bottom = rect ? rect.bottom : vh - SAFE.b; FREE.hardTop = rect?.hardTop ?? FREE.top;
    FREE.left = Math.max(rect?.left ?? 0, SAFE.l); FREE.right = Math.min(rect?.right ?? vw, vw - SAFE.r);
    if (MENU.w && !none) {
      menuFit(MENU.fit, FREE, vh, tan, MENU.w, MENU.h);
      MENU.tx = tx = MENU.fit.cx - vw / 2 - MENU.ox * ppm; MENU.ty = ty = MENU.fit.floor - vh / 2 + MENU.oy * ppm; // minus where she sits now (css px from the middle, unshifted)
    }
  }
  const st = MENU.quick ? MENU_T.exit : MENU_T.shift;
  lens.x = smoothDamp(MENU, 0, Math.max(-0.3 * vw, Math.min(0.3 * vw, tx)), st, dt);
  lens.y = smoothDamp(MENU, 1, Math.max(-0.3 * vh, Math.min(0.3 * vh, ty)), st, dt);
  // back to the calm springs only once framed and nearly still (a spring softened while far from its target whiplashes)
  const hd = Math.min(orbit.lim.distMax, Math.max(orbit.lim.distMin, orbitHome.dist)); // (the distance it can reach)
  if (MENU.quick && Math.abs(orbit.x[1] - hd) < 0.03 * hd && Math.abs(lens.y - ty) + Math.abs(lens.x - tx) < 6 && Math.abs(orbit.v[1]) < 0.2) MENU.quick = false;
  return lens.y;
}
// Every frame another camera runs (a game, results, photo driving): the menu's sideways shift glides back to the middle (the play
// camera owns the vertical one), and the menu camera knows to take over from that camera next time (never from a mere slow frame).
export const easeLensX = dt => { MENU.away = true; return (MENU.x[0] = lens.x = smoothDamp(MENU, 0, 0, MENU_T.shift, dt)); };
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
// The Drac travels round the whole dance ground (up to 4 m from its centre) and spins a dozen times: followed like her, the
// plaça slid and swung under the note lane. It follows `side` of its travel across the shot and `depth` of it towards /
// away from the lens (from the dance's centre, the plaça's: depth unfollowed, or a slower focus spring, lifted it under
// the lane on a desktop), a little further back so it stays whole on a phone, and never turns with its heading. The
// Mulassa's reference-led dance travels and turns as much (game/mula-dance.js: up to ~5.7 m from its centre, about
// four turns at the end), so she is followed the same way, at her own size; across a little more (a portrait phone is
// narrow: at half she left it at the far end of her advance). That advance comes up to ~2.4 m towards the lens (as towards
// the 2017 camera), and a tall phone's camera already stands at the plaça's edge (insidePlaza would lift it into a view
// from above): `room` keeps the camera's extra distance (dist) and its retreat with her inside the square; beyond, she
// comes closer.
const DRAC_CAM = { side: 0.5, depth: 0.9, dist: 1.12 }, MULA_CAM = { side: 1, depth: 0.9, dist: 1.12, room: true };
const CAM_T = { focus: 0.5, dist: 1.8, follow: 2.8, shift: 0.5, pos: 1.5 }; // seconds to (about) catch up. Constant (a spring whose stiffness changes while it is still far from its target whiplashes); the swoop in from the title camera is just this slow
export function framePlayCamera(dt, mx, mz, snap = false) { // snap: jump straight to the settled framing (tests)
  const area = playStage(), focusY = 1.4 * figureScale(), s = CAMS, calm = CAMDRAC !== 'segueix', F = selectedFigure.id === DRAC.id ? DRAC_CAM : MULA_CAM;
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
  if (!s.live || snap) { // carry on from wherever the camera is (the title's orbit), at rest
    s.v.fill(0);
    s.x[0] = snap ? mx : camFocus.x; s.x[1] = snap ? mz : camFocus.z; s.x[3] = Math.sin(M.yaw - FRONT); s.x[8] = Math.cos(M.yaw - FRONT) ** 2; s.x[4] = camShift;
    s.x[2] = Math.hypot(camera.position.x - s.x[0], camera.position.y - focusY, camera.position.z - s.x[1]);
    s.x[5] = camera.position.x; s.x[6] = camera.position.y; s.x[7] = camera.position.z;
    s.live = true;
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
  const el = CAM_EL + br * DRIFT.el * (0.7 * Math.sin(T / DRIFT.tEl + 0.7) + 0.3 * Math.sin(T / 9));
  const dT = Math.max(CAMV.h, CAMV.w / camera.aspect) * figureScale() / (2 * tan) * (1 + br * DRIFT.dist * Math.sin(T / DRIFT.tD)) * (G.collapseT ? 1.2 : 1) * (HH < 300 ? 1.2 : 1) * far; // (lying down she is wider; a short window has little stage above her: a little more room)
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
