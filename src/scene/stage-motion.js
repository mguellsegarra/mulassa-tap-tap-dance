// The stage's frame: the playable figure on show moves through its own hooks (figure-scenes.js); this keeps only what
// they share: the impact and figure-switch resets, free play's start and end, and the splash, where the Mulassa and the
// Drac dance side by side (figures/drac/drac-play.js PAIR, handed to the splash's host).
import { PHOTO, photoBody, setPhotoControl } from '../game/photo-control.js';
import { tickPhoto, endPhoto } from './photo-motion.js';
import { FRONT } from './stage.js';
import { selectedFigure } from '../game/figure-song.js';
import { resetWalker, resumeWalker } from '../figures/drac/drac-demo.js';
import { G } from '../game/state.js';
import { REEL } from '../game/showreel.js';
import { PIVOT, S, M, standUp } from './figure-springs.js';
import { clearManualImpact, expireManual } from './manual-jump.js';
import { PAIR, DRAC_JUMP, keepClear, takeSolo, animPair } from '../figures/drac/drac-play.js';
import { FIGURE_SCENES, sceneOf } from './figure-scenes.js';
import { traitsOf, SPLASH_HOST_ID } from '../figures/index.js';

const SPLASH = { pair: PAIR, keepClear };
let animatedFigureId = selectedFigure.id;
export function resetMotionImpact() {
  clearManualImpact();
  M.air = M.airV = 0; PHOTO.air = false;
  DRAC_JUMP.air = DRAC_JUMP.airV = 0;
}
let impactState, impactFigure, impactEpoch;
export function animStage(dt, beat, live = 1) {
  expireManual();
  if (impactState !== G.state || impactFigure !== selectedFigure.id || impactEpoch !== PHOTO.epoch) {
    resetMotionImpact();
    impactState = G.state; impactFigure = selectedFigure.id; impactEpoch = PHOTO.epoch;
  }
  if (animatedFigureId !== selectedFigure.id) {
    animatedFigureId = selectedFigure.id;
    standUp(); M.dancing = false; M.yaw = FRONT; M.yawVel = 0;
    M.pos.set(0, 0); M.pivot.set(0, PIVOT); for (const f of FIGURE_SCENES) f.reset?.();
    Object.assign(S.yaw, { x: FRONT, v: 0, t: FRONT });
  }
  if (G.state !== 'splash' && G.state !== 'select' && PHOTO.ready) {
    setPhotoControl(false); endPhoto();
  }
  const pair = G.state === 'splash'; // (free play shows one figure at a time: the one driven)
  // M owns the Mulassa in a pair, but the selected figure in the solo menu. Hand the existing Drac walker over.
  if (pair !== Boolean(PAIR.k) && traitsOf(selectedFigure.id).splashPartner && G.state !== 'play' && G.state !== 'results') {
    if (pair) {
      resetWalker(PAIR.w, M.pos.x, M.pos.y, M.yaw);
      PAIR.x = M.pos.x; PAIR.z = M.pos.y;
      M.pos.set(PAIR.hx, PAIR.hz); M.yaw = FRONT;
      M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
      keepClear(); for (const f of FIGURE_SCENES) f.reset?.();
    } else {
      M.pos.set(PAIR.x, PAIR.z); M.yaw = PAIR.w.face; M.pivot.copy(M.pos);
      takeSolo(M.pos.x, M.pos.y, M.yaw);
      PHOTO.ready = false;
    }
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
  }
  if (pair && !PAIR.k) keepClear();
  if (PHOTO.on) tickPhoto(dt, M, PIVOT); // (each figure's own actions: its hooks)
  else if (PHOTO.ready) {
    if (!PAIR.k) {
      const p = photoBody(); M.pos.set(p.x, p.z); M.yaw = p.yaw;
      resumeWalker(takeSolo(p.x, p.z, p.yaw), beat);
    }
    M.pivot.set(M.pos.x + Math.sin(M.yaw) * PIVOT, M.pos.y + Math.cos(M.yaw) * PIVOT);
    S.yaw.x = S.yaw.t = M.yaw; S.yaw.v = 0;
    endPhoto();
  }
  const solo = PHOTO.on ? PHOTO.id : selectedFigure.id; // (free play: the figure driven, whatever the selector shows)
  const own = (pair ? sceneOf(SPLASH_HOST_ID) : sceneOf(solo)) ?? FIGURE_SCENES[0]; // the figure on show
  const reel = REEL.on && G.state === 'select' && !PHOTO.on && !pair; // the selector's showreel: the song dance on the menu loop's beat (game/showreel.js)
  for (const f of FIGURE_SCENES) f.show(f === own);
  for (const f of FIGURE_SCENES) f.collaTick(f === own && !pair, beat, dt, reel); // (the splash has two figures: no colla)
  if (own.id === SPLASH_HOST_ID) animPair(dt, beat, pair);
  else {
    PAIR.k = 0;
    for (const f of FIGURE_SCENES) if (f !== own) f.leave?.();
  }
  own.animate(dt, beat, live, reel, SPLASH);
}
