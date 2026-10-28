// The camera's decision point each frame: which camera frames the figure (photo mode, ?view, the splash's pair or the selector,
// play, the results), then the lens shift, the plaza props in the way, the shake and the CSS-pixel view offset.
// It reads the selector's rect and the view mode, so it lives with the UI glue; the cameras themselves are scene/.
import { selectedFigure, figureScale } from '../game/figure-song.js';
import { G } from '../game/state.js';
import { Q, COARSE } from '../core/env.js';
import { blocks } from '../scene/framing.js';
import { orbitCancel, resetLook } from '../scene/orbit.js';
import { camera, plaza, cameraTarget, camFocus, camFocusTarget, camShift, camShiftX, camXYZ, focusXYZ, setCamShift } from '../scene/stage.js';
import { figureRoot } from '../figures/objects.js';
import { PHOTO } from '../game/photo-control.js';
import { PAIR } from '../figures/drac/drac-play.js';
import { M } from '../scene/figure-springs.js';
import { trauma, setTrauma } from '../scene/manual-jump.js';
import { orbit, look, insidePlaza, frameMenuCamera, lens, easeLensX, applyCameraImpact, pairShot } from '../scene/cameras.js';
import { framePlayCamera, applyWatchLook, CAMS } from '../scene/play-camera.js';
import { framePhotoCamera, releasePhotoCamera } from '../scene/photo-camera.js';
import { FIGURE_SCENES } from '../scene/figure-scenes.js';
import { BOU_FINALE } from '../figures/bou/bou-bills.js';
import { hud, HH, K, W, SAFE, baseFov } from '../hud/canvas.js';
import { lane, playBottom, playStage } from '../hud/layout.js';
import { splashS, splashBand } from '../hud/title.js';
import { viewMode, menuState } from './controls.js';
import { sheets } from './sheets.js';
import { idleBand } from './reel-idle.js';
import { REEL } from '../game/showreel.js';

const SPLASH_BAND = {}, WATCH_BAND = { top: 0, bottom: 0, left: 0, right: 0 }; // the splash's and the dance demo's free bands, refilled each frame

// ?cam: the camera editor over the game (src/dev/cam-edit.js): choose a view by eye, copy its numbers, the per-device camera is fitted from them
// The dev editors load only when asked for (their own chunks): the published game never downloads them
let CAMED = null;
if (Q.has('cam')) import('../dev/cam-edit.js').then(m => { CAMED = m.setupCamEdit({ hud, camera, active: () => G.state === 'play' && !G.paused, info: () => ({
  cw: innerWidth, ch: HH * K, dpr: devicePixelRatio, K, practice: !!G.practice, touch: COARSE.matches, laneBottom: lane().bottom * K, padTop: playBottom() * K }) }); });

export function frameCamera(dt, now, reelWide) { // reelWide: the idle selector's wide band (ui/reel-idle.js)
  // camera: during play the mulassa sits near the lane, in the free stage above the pad or
  // the bottom edge, with the crowd around her. A lens shift (view offset) puts her there without tilting the view.
  const pk = PHOTO.on ? 0 : 0.5 * PAIR.k; // the splash frames the pair; free play follows the figure driven
  const mx = G.state === 'play' ? M.pos.x : (M.pivot.x * 0.5 + M.pos.x * 0.5) * (1 - pk) + PAIR.x * pk, mz = G.state === 'play' ? M.pos.y : (M.pivot.y * 0.5 + M.pos.y * 0.5) * (1 - pk) + PAIR.z * pk, far = camera.aspect < 1 ? 1.4 : 1; // play follows the body; the menu follows her pivot
  const VIEW = { side: [9, 2.2, 0], front: [0, 2.5, 8], back: [-3, 3, -8], top: [4, 9, 6] }[Q.get('view')];
  if (!PHOTO.on) releasePhotoCamera();
  const watchReel = G.state === 'play' && G.watch && REEL.on && !PHOTO.on && !VIEW;
  let shift = 0; // where her centre should sit, in css px below the middle of the screen
  if (PHOTO.on && !VIEW) { framePhotoCamera(dt); } else if (VIEW) {
    camera.position.set(mx + VIEW[0], VIEW[1], mz + VIEW[2]);
    camera.lookAt(mx, 1.4, mz);
  } else if (G.state === 'splash' || G.state === 'select') { // (cameras.js frameMenuCamera)
    let aim = 0;
    if (G.state === 'splash') { // her centre between the splash's logo and its prompt
      const mid = (HH * 0.2 + splashS() * 1.02 + HH * 0.82 - 14) / 2;
      aim = Math.max(-0.25 * HH * K, Math.min(0.25 * HH * K, (mid - HH / 2) * K));
    }
    const splash = G.state === 'splash'; // the pair, framed whole between the logo and the prompt (cameras.js pairShot)
    const sel = G.state === 'select', root = splash ? pairShot() : sel && !PAIR.k ? figureRoot(selectedFigure.id) : null; // «QUI BALLA?» frames its figure in the free rect it measured (css px, when it opens or resizes); «mode foto» hides the selector: the whole screen
    shift = frameMenuCamera(dt, mx, mz, root, splash ? splashBand(SPLASH_BAND) : sel && !viewMode ? (reelWide ? idleBand(sheets.select?.band, W * K, HH * K, SAFE) : sheets.select?.band) : null, aim, REEL.on ? REEL : null);
  } else if (watchReel) { // «Mira el ball»: the showreel's shots on the song's beat, in the demo's free stage; a drag still turns them round her
    const area = playStage(); WATCH_BAND.top = area.top * K; WATCH_BAND.bottom = area.bottom * K; WATCH_BAND.right = W * K;
    if (REEL.fresh) resetLook(look);
    shift = frameMenuCamera(dt, mx, mz, figureRoot(selectedFigure.id), WATCH_BAND, 0, REEL);
    applyWatchLook(dt, camFocus.x, camFocus.y, camFocus.z); camera.lookAt(camFocus);
  } else if (G.state === 'play') {
    CAMED?.restoreFov();
    shift = framePlayCamera(dt, mx, mz);
    if (CAMED) shift = CAMED.apply(shift, mx, mz, now);
  } else {
    camera.position.lerp(insidePlaza(cameraTarget.set(mx * 0.6 + 1.5, 9.5 * far * figureScale(), mz * 0.6 + 11 * far * figureScale()), mx * 0.8, 0.6, mz * 0.8 + 1.1), Math.min(1, dt * 2));
    camera.lookAt(camFocus.lerp(camFocusTarget.set(mx * 0.8, 0.6 * figureScale(), mz * 0.8 + 1.1), Math.min(1, dt * 2)));
  }
  if (G.state !== 'play') CAMED?.idle();
  if (!menuState() && orbit.ptrs.size) orbitCancel(orbit); // a game started mid-drag: let go
  if ((G.state !== 'play' || VIEW) && CAMS.live) { // the next game's camera starts from wherever this one is
    CAMS.live = false;
    if (camera.fov !== baseFov()) { camera.fov = baseFov(); camera.updateProjectionMatrix(); }
  }
  if (!VIEW && !PHOTO.on) for (const f of FIGURE_SCENES) if (f.endShot) shift = f.endShot(dt, shift); // a figure's end shot (the Bou: down to its banknotes, over play and results)
  const menuCam = (menuState() || watchReel) && !PHOTO.on && !VIEW;
  setCamShift(PHOTO.on || menuCam || G.state === 'play' && !VIEW ? shift : camShift + (shift - camShift) * Math.min(1, dt * 3), menuCam ? lens.x : easeLensX(dt) * !PHOTO.on); // play and menus: already smoothed (photo driving: no shift)
  if (Math.abs(camShift) > 0.5 || Math.abs(camShiftX) > 0.5) camera.setViewOffset(W * K, HH * K, -camShiftX, -camShift, W * K, HH * K);
  else if (camera.view?.enabled) camera.clearViewOffset();
  camXYZ[0] = camera.position.x; camXYZ[1] = camera.position.y; camXYZ[2] = camera.position.z;
  focusXYZ[0] = mx; focusXYZ[1] = G.state === 'play' ? 1.4 : 1; focusXYZ[2] = mz;
  for (const p of plaza.props) p.mesh.visible = !blocks(p, camXYZ, focusXYZ); // a tree or lamp in the way: gone
  if (trauma > 0) { // shake decays; quadratic so small bumps barely move it. During play only a small accent
    setTrauma(Math.max(0, trauma - dt * 1.6)); // (GUAPA, the finale), added on top: it never feeds the camera's springs
  }
  applyCameraImpact(trauma * (1 - BOU_FINALE.k)); // (no shake on the Bou's close-up)
}
