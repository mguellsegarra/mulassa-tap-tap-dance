// The Mulassa on the people (scene/crowd-effects.js): her culada in free play (E) flings whoever her swinging rear
// reaches out and round with it, arms up, sliding to a stop and falling flat for a moment (PHOTO_SPIN); never in the
// game. It overrides their own steering until they are up.
import { PHOTO, PHOTO_SPIN } from '../../game/photo-control.js';
import { CALM } from '../../core/env.js';
import { clock, figureSfx } from '../../game/state.js';

let culadaEh = -9;
export const MULA_CROWD = {
  knock(p, dt, dx, dz) {
    if (p.avoidKnock) return; // chairs and cane users keep the normal anticipatory escape, never an impulse or a fall
    const d = Math.hypot(dx, dz) || 1;
    if (PHOTO.culada && (p.knockT ?? 0) <= 0 && d < PHOTO_SPIN.reach + p.rad) {
      const k = PHOTO_SPIN.kick * (0.8 + 0.4 * ((p.ph * 5.3) % 1)) * (1 - 0.5 * d / PHOTO_SPIN.reach), // weaker further out
        turn = PHOTO.culada * 0.7; // out, and round the way she turns
      p.kx = (dx + dz * turn) / d * k; p.kz = (dz - dx * turn) / d * k; p.knockT = PHOTO_SPIN.slide * 3; p.downT = CALM.matches ? 0 : PHOTO_SPIN.down;
      if (clock - culadaEh > 0.6) { culadaEh = clock; figureSfx('eh'); } // the plaça's «eeh!», once a culada
    }
    if ((p.knockT ?? 0) <= 0) { if (p.downT > 0) { p.vel.set(0, 0); p.rest = false; } return; } // flat on the floor: nobody walks
    const slow = Math.exp(-dt / PHOTO_SPIN.slide);
    p.kx *= slow; p.kz *= slow; p.knockT -= dt;
    p.vel.set(p.kx, p.kz); p.way = 1; p.rest = false; p.away = false;
  },
};
