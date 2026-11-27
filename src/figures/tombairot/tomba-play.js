// The Tombairot's motion: tomba-stage.js poses it at the song clock (or drives it in free play) under the same bounded
// tap/hold springs as the Bou (scene/figure-springs.js): the lean at half, the neck, the head's glance and the tail whole.
import { PHOTO } from '../../game/photo-control.js';
import { danceTomba, driveTomba } from './tomba-stage.js';
import { G, clock } from '../../game/state.js';
import { REEL } from '../../game/showreel.js';
import { TOMBA_ID } from '../../game/figures.js';
import { smooth } from '../../core/math.js';
import { S, M, CAP, stepSprings, capSpring, holdGesture } from '../../scene/figure-springs.js';

const TOMBA_ACC = { roll: 0, pitch: 0, neck: 0, neckYaw: 0, tail: 0, col: 0 };
export function animPlayableTomba(dt, beat, live, reel) {
  for (const k in S) S[k].t = 0;
  holdGesture();
  stepSprings(Math.min(dt, 0.04));
  for (const k in CAP) if (S[k]) capSpring(S[k], CAP[k]);
  TOMBA_ACC.roll = S.roll.x * 0.5; TOMBA_ACC.pitch = S.pitch.x * 0.5;
  TOMBA_ACC.neck = S.neck.x * 0.5; TOMBA_ACC.neckYaw = S.neckYaw.x * 0.5; TOMBA_ACC.tail = S.tail.x;
  TOMBA_ACC.col = G.collapseT && !reel ? smooth(Math.min(1, (clock - G.collapseT) / 0.6)) : 0;
  const prev = M.yaw, b = PHOTO.tombairot;
  M.yaw = PHOTO.on && PHOTO.id === TOMBA_ID ? driveTomba(dt, b, b.vx, b.vz, M.pos) : danceTomba(reel ? REEL.beat : beat, dt, TOMBA_ACC, M.pos);
  M.yawVel = dt > 0 ? (M.yaw - prev) / dt : 0;
  M.pivot.copy(M.pos);
  M.dancing = G.state === 'play' || reel;
}
