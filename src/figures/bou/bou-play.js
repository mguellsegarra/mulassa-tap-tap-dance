// The Bou's motion: bou-stage.js poses it at the song clock (or drives it in free play) under the same bounded tap/hold
// springs as the Drac (scene/figure-springs.js), at half the lean. The stage (scene/stage-motion.js) calls it through its
// hooks (bou-scene.js).
import { PHOTO } from '../../game/photo-control.js';
import { danceBou, driveBou } from './bou-stage.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { smooth } from '../../core/math.js';
import { S, M, CAP, stepSprings, capSpring, holdGesture } from '../../scene/figure-springs.js';

const BOU_ACC = { roll: 0, pitch: 0, col: 0 };
export function animPlayableBou(dt, beat, live, reel) {
  for (const k in S) S[k].t = 0;
  holdGesture();
  stepSprings(Math.min(dt, 0.04));
  for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  BOU_ACC.roll = S.roll.x * 0.5; BOU_ACC.pitch = S.pitch.x * 0.5;
  BOU_ACC.col = G.collapseT && !reel ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const prev = M.yaw, b = PHOTO.bou;
  M.yaw = PHOTO.on && PHOTO.id === 'bou-tradicional-valls' ? driveBou(dt, b, b.vx, b.vz, M.pos) : danceBou(reel ? REEL.beat : beat, dt, BOU_ACC, M.pos);
  M.yawVel = dt > 0 ? (M.yaw - prev) / dt : 0;
  M.pivot.copy(M.pos);
  M.dancing = G.state === 'play' || reel;
}
