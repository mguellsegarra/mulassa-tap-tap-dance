// Cameras: the menu camera (frameMenuCamera: splash, selector), the orbit and look state, the shake and the plaça's
// walls (insidePlaza); the play camera is play-camera.js.
import * as THREE from 'three';
import { createOrbit, orbitStep, orbitLimits, roomAlong, ORBIT, createLook } from './orbit.js';
import { smoothDamp, menuFit, envelope, edgePush } from './framing.js';
import { plaza, camFocus, FRONT, camShift, camShiftX, camera, CAM_AZ, cameraTarget } from './stage.js';
import { drac } from '../figures/drac/drac-objects.js';
import { M } from './figure-springs.js';
import { manualLandingStrength } from './manual-jump.js';
import { CALM, CAMDRAC } from '../core/env.js';
import { clock, G } from '../game/state.js';
import { TAU } from '../core/math.js';
import { HH, K, W, SAFE, baseFov } from '../hud/canvas.js';
import { COLLAS, figureRoot } from '../figures/objects.js';
import { SPLASH_HOST_ID } from '../figures/index.js';

// Remove the previous render's offset before any rig reads the camera. The short impact never enters framing springs.
let impactCameraX = 0, impactCameraY = 0;
export function clearCameraImpact() {
  camera.position.x -= impactCameraX; camera.position.y -= impactCameraY;
  impactCameraX = impactCameraY = 0;
}
export function applyCameraImpact(strength) {
  const manual = manualLandingStrength();
  const closeScale = Math.min(1, camera.position.distanceTo(camFocus) / 6);
  const k = CALM.matches || G.paused ? 0 : Math.max(
    strength * strength * (G.state === 'play' ? 0.35 : 1), manual * manual * closeScale);
  impactCameraX = Math.sin(clock * 47) * 0.25 * k;
  impactCameraY = Math.sin(clock * 61) * 0.2 * k;
  camera.position.x += impactCameraX; camera.position.y += impactCameraY;
}

// Title only: a drag that starts on empty canvas steers the camera round her, two fingers / the wheel zoom
// (src/scene/orbit.js); a press on a canvas button still picks it at once. Never with a sheet up, never outside the title.
export const titleC = { x: 0, z: 0, on: false }, orbitHome = { pitch: 0, dist: 11 }, orbit = createOrbit(orbitHome), pnow = () => performance.now() / 1000;
export const look = createLook(); // «Mira el ball»: the player's turn and zoom on top of the play camera (orbit.js lookStep)
export const titleS = { x: new Float64Array(2), v: new Float64Array(2) }, TITLE_FOLLOW = 0.7, TITLE_SWAY = 0.3; // the menu camera's follow spring (seconds to catch up: 1.6 lagged the Mulassa's travelling dance by ~2 m, out of her band) and its sway (rad, twice the play camera's)
// The menu camera (splash, selector) orbits her, not the middle: wandering about she'd otherwise pass right in front of the
// lens, huge. The player may steer it (orbit.js: its limits keep it inside the square and above the crowd); left alone it eases
// back after ORBIT.idle s, and at once when the figure changes.
// On the selector the figure is framed, not placed at a fixed distance: frameMenuLens measures her rigid outline as this camera sees it
// and backs off / comes closer until she fills the free rect the selector measured (select-ui.js band: under the info block, above
// the dock, right of a side panel), and a lens shift (view offset, both axes: never a tilt) puts her centre there. The splash
// and the title keep their one shot for every figure, with the caller's `aim` (css px below the middle).
export const lens = { x: 0, y: 0 }; // the menu's lens shift, css px (her centre right of / below the screen's middle), smoothed
const MENU = { late: false, held: false, directed: false, soft: false, softT: -Infinity, lent: new Float64Array(2), x: new Float64Array(2), v: new Float64Array(2), w: 0, h: 0, ox: 0, oy: 0, mx: 0, mz: 0, tx: 0, ty: 0, root: null, away: true, fit: { dist: 11, cx: 0, cy: 0, floor: 0 } }; // shift spring; her extents' envelope (m); her outline's middle across / feet off the focus (tangents, slow)
const MENU_T = { dolly: 0.35, reel: 0.7, soft: 1.1, wake: 0.45, softFor: 2.5, shift: 0.9, up: 0.35, down: 4, centre: 1.2, pair: 1.2 }; // s: dolly: the showreel's distance (0.6 let her outgrow a phone's frame as she came at the lens or turned side on; it only follows the size's envelope, which shrinks slowly, so it never pumps); the showreel's follow and shift (a little quicker than the menu's: she travels round the plaça); soft: into a `soft` band (the idle screen), wake: back out of it (the UI is back in 0.25 s: she must not linger under it), for softFor s; the lens shift's spring; her extents rise / fall (turning side on and back never pumps the shot); her centre's slow average (the focus already follows her: a turn must not swing the shot); pair: the splash's distance and height (the pair spreads apart quicker than one figure turns)
const MENU_EDGE = 0.015; // the hard edge's margin (frameMenuLens), a share of the screen's width
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
// A close-up's outline: her first node named `part` (one of the Drac's two heads: both side by side made a mid shot)
const PARTS = new Map();
function partOutline(root, part) {
  const key = root.uuid + part;
  if (!PARTS.has(key)) PARTS.set(key, outline(root.getObjectByName(part) ?? root));
  return PARTS.get(key);
}
const shown = (o, root) => { for (; o && o !== root; o = o.parent) if (!o.visible) return false; return true; };
// The splash's pair (stage-motion.js PAIR: the Mulassa and the Drac dancing side by side) framed as one outline, so both stand
// whole in the free band on every screen (a phone's fixed 11 m shot left the plaça empty between them);
// the Drac joins the outline once it is built and shown (the envelope eases the shot out for it)
const PAIR_SHOT = { roots: [], visible: false }, ONE = [];
export function pairShot() {
  PAIR_SHOT.roots.length = 0;
  if (shown(figureRoot(SPLASH_HOST_ID), null)) PAIR_SHOT.roots.push(figureRoot(SPLASH_HOST_ID));
  if (drac?.root && shown(drac.root, null)) PAIR_SHOT.roots.push(drac.root);
  PAIR_SHOT.visible = PAIR_SHOT.roots.length > 0;
  return PAIR_SHOT;
}
// reel: the selector's showreel (game/showreel.js REEL: { cut, shot: { az, el, fill } }) or null
export function frameMenuCamera(dt, mx, mz, root, rect, aim, reel = null) {
  const far = camera.aspect < 1 ? 1.4 : 1, now = pnow();
  orbitHome.time = root?.roots ? MENU_T.pair : undefined;
  if (root !== MENU.root) { MENU.root = root; MENU.w = MENU.h = MENU.ox = MENU.oy = MENU.tx = MENU.ty = 0; if (root) orbit.last = -Infinity; MENU.first = !!root?.roots; } // another figure: frame it now, from scratch (the splash's pair: at once, below)
  // The showreel directs the camera: its shot's angle and size, cut at once (no spring across a cut). A drag keeps the
  // player's angle until the next cut.
  const shot = reel && root ? reel.shot : null;
  if (!!rect?.soft !== MENU.soft) { MENU.soft = !!rect?.soft; MENU.softT = now; } // into a `soft` band (the idle screen) slowly, ~2 s; out of it quickly
  const slow = now - MENU.softT < MENU_T.softFor ? (MENU.soft ? MENU_T.soft : MENU_T.wake) : 0; // (s: the spring's time, 0 = the usual)
  if (orbit.ptrs.size || now - orbit.last <= ORBIT.idle) MENU.held = true;
  const cut = shot && reel.cut && !orbit.ptrs.size, direct = shot && (cut || !MENU.held);
  if (cut) { MENU.held = false; MENU.w = MENU.h = MENU.ox = MENU.oy = 0; } // her size and middle measured afresh from the new angle
  if (root?.visible && MENU.w && Math.hypot(MENU.mx - mx, MENU.mz - mz) < 4) { mx = MENU.mx; mz = MENU.mz; } // follow the middle of her outline (her pivot is off it as she turns), measured last frame; never a stray part metres away
  const homeH = 4.2 * far, homeD = 11; // plaza level, in among the crowd (the old high wide shot showed mostly bare floor)
  orbitHome.pitch = Math.atan2(homeH - ORBIT.focusY, homeD); orbitHome.dist = Math.hypot(homeD, homeH - ORBIT.focusY);
  if (root && MENU.w && !bandless(rect)) orbitHome.dist = MENU.fit.dist;
  // her sway and steps never shake the shot: it drifts after her on a critically damped spring (like the play camera; a first-order
  // filter changes velocity the instant she does, which read as a jerk on every hop)
  if (!titleC.on || cut) { titleS.x[0] = mx; titleS.x[1] = mz; titleS.v.fill(0); }
  else if (MENU.away && !orbit.fresh && !orbit.ptrs.size) adopt(); // back from another camera (results, a game): carry on from it, then ease to the framing
  const follow = direct ? MENU_T.reel : TITLE_FOLLOW; // (the showreel: she travels the whole plaça)
  titleC.x = smoothDamp(titleS, 0, mx, follow, dt); titleC.z = smoothDamp(titleS, 1, mz, follow, dt); titleC.on = true;
  const cx = titleC.x, cz = titleC.z;
  // The idle azimuth is the play camera's own (CAM_AZ: no swoop across the plaça when a game starts), swaying slowly; like the play
  // camera it no longer turns with her heading (both figures spin in their dances: it swung the shot ~0.3 rad a turn; ?camdrac=segueix
  // brings it back). The player's drag/flick still steers, and after a few idle seconds it eases back.
  { const br = CALM.matches ? 0 : 1, T = clock * TAU;
    orbitHome.yaw = CAM_AZ + br * TITLE_SWAY * (0.65 * Math.sin(T / DRIFT.tAz) + 0.35 * Math.sin(T / DRIFT.tAz2 + 1.3)) + (CAMDRAC === 'segueix' ? DRIFT.follow * Math.sin(M.yaw - FRONT) : 0); }
  if (shot) { orbitHome.yaw = CAM_AZ + shot.az; orbitHome.pitch = shot.el; } // (held by a drag: where it eases back to)
  if (shot && direct) orbitHome.yaw += clearOfColla(orbitHome.yaw, cx, cz, cut, dt);
  // The showreel borrows the orbit's height and distance and gives them back when it stops (photo mode, a pending card):
  // what follows starts from the plain framing, never from its close or high shot.
  if (direct && !MENU.directed) MENU.lent.set(orbit.x);
  else if (MENU.directed && !direct && !MENU.held) { orbit.x.set(MENU.lent); orbit.zoomRaw = orbit.zoomTo = orbit.x[1]; orbit.v.fill(0); } // (a drag keeps the angle it took over)
  MENU.directed = direct;
  if (orbit.fresh) orbit.yaw = orbitHome.yaw; // (the very first frame starts at home)
  if (direct) aimShot(dt, cut, cx, cz, slow || MENU_T.dolly, shot.eye); else orbitStep(orbit, dt, now, orbitHome, roomAt(cx, cz));
  placeMenu(cx, cz, cut ? Infinity : dt);
  const zoomOn = root && MENU.w && !bandless(rect);
  zoomMenu(cut ? 0 : dt, zoomOn, slow || MENU_T.shift, shot?.part);
  const y = frameMenuLens(dt, root, rect, aim, shot?.fill, cut, direct, slow, shot?.part);
  const late = !cut && MENU.late && MENU.w && shot; // (a new figure shows a frame after its cut: its first measure snaps as the cut would have)
  if (MENU.first && MENU.w && !cut) { // the splash's first measure, still under the loading cover: framed at once (it backed off from 11 m for seconds, the plaça empty between them)
    MENU.first = false; orbit.x[1] = orbit.zoomRaw = orbit.zoomTo = Math.max(orbit.lim.distMin, Math.min(orbit.lim.distMax, MENU.fit.dist)); orbit.v[1] = 0;
    placeMenu(cx, cz, Infinity); zoomMenu(0, !bandless(rect), 0);
    return frameMenuLens(dt, root, rect, aim, undefined, true);
  }
  if (!cut && !late) return y;
  if (root) { const rs = root.roots ?? (ONE[0] = root, ONE); for (let r = 0; r < rs.length; r++) rs[r].updateMatrixWorld(true); } // (a figure just shown or moved: its outline where it stands now, not at the last render)
  MENU.w = MENU.h = 0; aimShot(dt, true, cx, cz, 0.6, shot.eye); placeMenu(cx, cz, Infinity); // a cut: again, at the distance its size wants from the new angle,
  frameMenuLens(dt, root, rect, aim, shot.fill, true, false, 0, shot.part);
  if (MENU.w) { // on her outline's middle at once: the pivot passed in can still be the last figure's (a figure change aimed 3 m off and slid after her for 2 s)
    const fx = MENU.mx, fz = MENU.mz; titleS.x[0] = titleC.x = fx; titleS.x[1] = titleC.z = fz; titleS.v.fill(0);
    MENU.w = MENU.h = MENU.ox = MENU.oy = 0; aimShot(dt, true, fx, fz, 0.6, shot.eye); placeMenu(fx, fz, Infinity); frameMenuLens(dt, root, rect, aim, shot.fill, true, false, 0, shot.part);
  }
  zoomMenu(0, root && MENU.w && !bandless(rect), 0, shot.part); // then the lens that size wants (a close-up's long lens at once, never a zoom after the cut)
  const out = frameMenuLens(dt, root, rect, aim, shot.fill, true, false, 0, shot.part); // and the shift for that lens
  MENU.late = !MENU.w;
  return out;
}
// A band too short for the square (a 1280x800 desktop: ~23 m wanted, 15-17 m to the façades) left her head over the
// header: where the dolly stops short, the lens widens the rest of the way (eased; at most ZOOM_MAX the title's tangent, ~54°
// on a desktop: the play camera's own).
// A showreel close-up (a shot of one `part`) is the other way round: the lens stays out at the orbit's nearest (the crowd
// and the colla round her) and a long lens brings the part in, up to ZOOM_TELE (short close-ups).
// Any other camera takes the title's lens back (easeLensX; the play camera sets its own).
const ZOOM = { x: new Float64Array([1]), v: new Float64Array(1) }, ZOOM_MAX = 1.45, ZOOM_TELE = 3;
function zoomMenu(dt, on, time, tele = false) {
  const z = on ? Math.max(1 / ZOOM_MAX, Math.min(tele ? ZOOM_TELE : 1, MENU.fit.dist > orbit.lim.distMax ? orbit.lim.distMax / MENU.fit.dist : tele ? orbit.lim.distMin / MENU.fit.dist : 1)) : 1;
  if (dt) smoothDamp(ZOOM, 0, z, time, dt); else { ZOOM.x[0] = z; ZOOM.v[0] = 0; } // (a cut: at once)
  const fov = Math.atan(Math.tan(baseFov() * Math.PI / 360) / ZOOM.x[0]) * 360 / Math.PI;
  if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
// The showreel never shoots over an attendant's shoulder (at the foot of the full screen one loomed half
// her size): the shot's azimuth leaves `rad` either side of every colla helper standing between the lens and her, all of
// them at once (two windows can join), by the nearer way out when a cut or the shot's own arc brings one in, then the same way
// round while it stays (the other only past `max`: no swing across), eased and slow (her travel turns their bearings).
const HELPER_CLEAR = { rad: 0.5, max: 1.2, ease: 0.6, speed: 0.12 }, AVOID = { x: new Float64Array(1), v: new Float64Array(1), side: 1, free: true, d: new Float64Array(16), n: 0 };
function pushOut(dir) { // from the shot's own azimuth out past every window, one way round
  let o = 0;
  for (let k = 0; k < 4; k++) for (let i = 0; i < AVOID.n; i++) if (Math.abs(o - AVOID.d[i]) < HELPER_CLEAR.rad) o = AVOID.d[i] + dir * HELPER_CLEAR.rad;
  return o;
}
function clearOfColla(yaw, cx, cz, cut, dt) {
  const hd = orbit.x[1] * Math.cos(orbitHome.pitch); // (the shot's own height: on a cut the orbit still has the last one's)
  AVOID.n = 0;
  for (const c of COLLAS) if (c.helpers.visible) for (const p of c.crew) {
    p.g.getWorldPosition(V3);
    const dx = V3.x - cx, dz = V3.z - cz;
    if (dx * dx + dz * dz > hd * hd || AVOID.n === AVOID.d.length) continue; // beyond her: in the background
    const b = Math.atan2(dx, dz); AVOID.d[AVOID.n++] = Math.atan2(Math.sin(b - yaw), Math.cos(b - yaw));
  }
  let off = pushOut(AVOID.side);
  const fresh = cut || AVOID.free; // (nothing in the way until now: the nearer way out)
  if (fresh || Math.abs(off) > HELPER_CLEAR.max) { const other = pushOut(-AVOID.side); if (fresh ? Math.abs(other) < Math.abs(off) : Math.abs(other) < HELPER_CLEAR.max) { AVOID.side = -AVOID.side; off = other; } }
  AVOID.free = off === 0;
  if (cut) { AVOID.x[0] = off; AVOID.v[0] = 0; return off; }
  return smoothDamp(AVOID, 0, off, HELPER_CLEAR.ease, dt, HELPER_CLEAR.speed); // (at most `speed` rad/s: a quick dodge turned the whole plaça, dizzying on a big screen)
}
function placeMenu(cx, cz, dt) {
  const hd = orbit.x[1] * Math.cos(orbit.x[0]);
  camera.position.copy(insidePlaza(cameraTarget.set(cx + Math.sin(orbit.yaw) * hd, ORBIT.focusY + orbit.x[1] * Math.sin(orbit.x[0]), cz + Math.cos(orbit.yaw) * hd), cx, 1.2, cz));
  camera.lookAt(camFocus.set(cx, camFocus.y + (1.2 - camFocus.y) * (1 - Math.exp(-dt / 0.3)), cz)); // (the aim is the spring itself: a lag on top swung her across the shot; its height eases in from another camera's)
}
// The showreel's shot: its angle exactly (the shot list itself moves it), the distance its size wants eased (her outline
// changes as she turns) or at once on a cut; inside the orbit's limits (the lens above the crowd, inside the square).
const roomAt = (cx, cz) => roomAlong(cx, cz, Math.sin(orbit.yaw), Math.cos(orbit.yaw), plaza.inner - 1.5); // behind the lens, to the square's edge
function aimShot(dt, snap, cx, cz, ease, eye) { // eye: the shot's own lens height (SHOT_KINDS.low), else the orbit's
  orbit.yaw = orbitHome.yaw; orbit.spin = 0;
  const L = orbitLimits(orbit.lim, orbit.x[1], orbitHome.pitch, roomAt(cx, cz), eye ?? undefined);
  orbit.x[0] = Math.max(L.pitchMin, Math.min(L.pitchMax, orbitHome.pitch)); orbit.v[0] = 0;
  const d = Math.max(L.distMin, Math.min(L.distMax, MENU.fit.dist));
  if (snap) { orbit.x[1] = d; orbit.v[1] = 0; const S = orbitLimits(orbit.lim, d, orbitHome.pitch, roomAt(cx, cz), eye ?? undefined); orbit.x[0] = Math.max(S.pitchMin, Math.min(S.pitchMax, orbitHome.pitch)); } // (a cut: the height limit at its new distance; at the old one, out of the Drac's close-up, it dropped 1 m a frame later: two cuts)
  else smoothDamp(orbit, 1, d, ease, dt);
  orbit.zoomRaw = orbit.zoomTo = orbit.x[1];
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
function frameMenuLens(dt, root, rect, aim, fill = 0.86, snap = false, quick = false, slow = 0, part = null) { // fill: the share of the band she fills (part: of it, a close-up); snap: a cut, the shift at once
  const vw = W * K, vh = HH * K, tan = Math.tan(baseFov() * Math.PI / 360), ppm = vh / (2 * Math.tan(camera.fov * Math.PI / 360)); // tan: the title's lens, what the fit is for (zoomMenu widens it); ppm: the lens now
  if (MENU.away) { MENU.x[0] = camShiftX; MENU.x[1] = camShift; MENU.v.fill(0); MENU.away = false; } // coming from another camera: on from its shift
  const none = bandless(rect); // (the old shot: her focus at the band's middle, as far as a quarter screen up)
  let tx = root && !none ? MENU.tx : 0, bx0 = NaN, bx1 = 0, by0 = 0, by1 = 0, ty = none ? Math.max(-0.25 * vh, Math.min(0.25 * vh, (rect.top + rect.bottom) / 2 - vh / 2)) : root ? MENU.ty : aim; // (a hidden figure, a pending card: the shot holds still)
  if (root?.visible) {
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse, D = camera.position.distanceTo(camFocus);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, wx0 = Infinity, wx1 = -Infinity, wz0 = Infinity, wz1 = -Infinity, near = false;
    const roots = root.roots ?? (ONE[0] = root, ONE);
    for (let r = 0; r < roots.length; r++) {
      const parts = part ? partOutline(roots[r], part) : outline(roots[r]);
      for (let j = 0; j < parts.length; j++) {
        const { o, pts } = parts[j];
        if (!shown(o, roots[r])) continue;
        for (let i = 0; i < pts.length; i += 3) { // world middle, and the angular extents (tangents) this camera sees
          const p = V3.fromArray(pts, i).applyMatrix4(o.matrixWorld);
          if (p.x < wx0) wx0 = p.x; if (p.x > wx1) wx1 = p.x; if (p.z < wz0) wz0 = p.z; if (p.z > wz1) wz1 = p.z;
          p.applyMatrix4(view);
          if (-p.z < 0.5) near = true; // (part of her by or behind the lens, a photo camera handing over: no measure this frame)
          const z = Math.max(0.1, -p.z), ax = p.x / z, ay = p.y / z;
          if (ax < x0) x0 = ax; if (ax > x1) x1 = ax; if (ay < y0) y0 = ay; if (ay > y1) y1 = ay;
        }
      }
    }
    const inView = Math.abs(x0 + x1) < 3 * tan * camera.aspect && Math.abs(y0 + y1) < 3 * tan; // her middle within 1.5 fields of view: the camera is on her (not catching up from far away)
    if (x0 < Infinity && !near && inView) {
      bx0 = x0; bx1 = x1; by0 = y0; by1 = y1; // (this frame's outline, for the hard edge below)
      MENU.mx = (wx0 + wx1) / 2; MENU.mz = (wz0 + wz1) / 2;
      const w = (x1 - x0) * D, h = (y1 - y0) * D, k = MENU.w ? 1 - Math.exp(-dt / MENU_T.centre) : 1; // metres at the orbit's distance: what that distance must fit (no feedback from it)
      MENU.w = MENU.w ? envelope(MENU.w, w, dt, MENU_T.up, MENU_T.down) : w; MENU.h = MENU.h ? envelope(MENU.h, h, dt, MENU_T.up, MENU_T.down) : h;
      MENU.ox += ((x0 + x1) / 2 - MENU.ox) * k; MENU.oy += (y0 - MENU.oy) * k; // her middle across, her feet down
    }
    // the free rect: the selector's band, or the whole screen; inside the safe areas either way
    FREE.top = rect ? rect.top : SAFE.t; FREE.bottom = rect ? rect.bottom : vh - SAFE.b; FREE.hardTop = rect?.hardTop ?? FREE.top; FREE.ground = !!rect?.ground;
    FREE.left = Math.max(rect?.left ?? 0, SAFE.l); FREE.right = Math.min(rect?.right ?? vw, vw - SAFE.r);
    if (MENU.w && !none) {
      menuFit(MENU.fit, FREE, vh, tan, MENU.w, MENU.h, fill);
      MENU.tx = tx = MENU.fit.cx - vw / 2 - MENU.ox * ppm; MENU.ty = ty = MENU.fit.floor - vh / 2 + MENU.oy * ppm; // minus where she sits now (css px from the middle, unshifted)
    }
  }
  const st = slow || (quick ? MENU_T.reel : MENU_T.shift), cx = Math.max(-0.3 * vw, Math.min(0.3 * vw, tx)), cy = Math.max(-0.3 * vh, Math.min(0.3 * vh, ty));
  if (snap) { MENU.x[0] = cx; MENU.x[1] = cy; MENU.v.fill(0); }
  lens.x = smoothDamp(MENU, 0, cx, st, dt);
  lens.y = smoothDamp(MENU, 1, cy, st, dt);
  if (bx0 === bx0 && !none) { // the hard edge: where she is this frame (the springs lag a figure on the move), kept inside the free rect; a close-up may crop its part
    const m = part ? 0 : MENU_EDGE * vw, px = vw / 2 + lens.x, py = vh / 2 + lens.y;
    const dx = edgePush(px + bx0 * ppm, px + bx1 * ppm, FREE.left + m, FREE.right - m), dy = edgePush(py - by1 * ppm, py - by0 * ppm, FREE.hardTop + m, FREE.bottom);
    lens.x = MENU.x[0] += dx; lens.y = MENU.x[1] += dy;
  }
  return lens.y;
}
// Every frame another camera runs (a game, results, photo driving): the menu's sideways shift glides back to the middle (the play
// camera owns the vertical one), and the menu camera knows to take over from that camera next time (never from a mere slow frame).
export const easeLensX = dt => {
  MENU.away = true;
  if (ZOOM.x[0] !== 1) { ZOOM.x[0] = 1; ZOOM.v[0] = 0; if (G.state !== 'play') { camera.fov = baseFov(); camera.updateProjectionMatrix(); } }
  return (MENU.x[0] = lens.x = smoothDamp(MENU, 0, 0, MENU_T.shift, dt)); };
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
// The play camera's slow sway (play-camera.js), which the title's orbit shares: rad / rad / share / rad, seconds.
export const DRIFT = { az: 0.2, el: 0.05, dist: 0.03, follow: 0.26, oblique: 0.4, tAz: 29, tAz2: 17, tEl: 21, tD: 13 }; // slow, unrelated periods (never a rhythm you can spot)
