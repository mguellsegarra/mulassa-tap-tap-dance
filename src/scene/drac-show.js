// The Drac's fire and powder wired to the game (drac-fx.js does the work): judge.js calls dracCrema / dracPump, main.js
// dracFrame (after the crowd is posed) and dracWarm. With the Mulassa every hook
// is a no-op, so she looks and sounds exactly as before. Its confetti (confetti.js burst / spawnConfetti) are rodes de foc.
import * as THREE from 'three';
import { createDracFx, streakFire, flareStart, tracaWindow } from './drac-fx.js';
import { scene, camera, drac, renderProfile } from './stage.js';
import { G, chip } from '../game/state.js';
import { selectedFigure, song, songTimeAtBeat, beatAt } from '../game/figure-song.js';
import { DRAC } from '../game/figures.js';
import { M, PAIR } from './mula-motion.js';
import { SHOWCASE } from './drac-demo.js';
import { setConfettiDivert } from './confetti.js';

export const dracFx = createDracFx(scene, { smoke: renderProfile.smoke ?? 0, embers: renderProfile.embers ?? 0, wheels: renderProfile.wheels ?? 0, sound: (kind, i) => chip?.sfx(kind, i) });
const isDracOn = () => selectedFigure.id === DRAC?.id;
const IN = { on: false, cam: camera, fire: null, streak: false, flare: false, max: 0, emax: 0, wmax: 0, x: 0, z: 0 };
setConfettiDivert((sec, reason) => {
  if (!isDracOn()) return false;
  if (reason === 'combo' && !G.practice && (G.combo === 50 || G.combo === 100)) dracFx.wheels(1.2);
  return true;
});
let flareSong = null, flareT = Infinity, tracaFor = null, hazed = false;
// The last pass's red mist: the plaça's own fog (stage.js) closes in and turns red with the crescendo, the sky with it (a
// dense mist costs nothing more to draw: old phones). Only while the dance is on; a menu clears it at once.
const FOG = { sky: new THREE.Color('#8fd3ff'), red: new THREE.Color('#e0707c'), near: 40, far: 90 };

export function dracCrema() { // a GUAPA (and the final hit): the CREMA
  if (!isDracOn() || G.practice) return;
  dracFx.crema();
  chip?.sfx('flama');
}
// A tap in a drumroll. true = the Drac's traca took it (its own cracks and the TRO), false = the Mulassa's balloon.
export function dracPump(n) {
  if (!isDracOn()) return false;
  if (tracaFor !== n) { tracaFor = n; dracFx.begin(); }
  dracFx.pump(n.count, n.need);
  return true;
}
// Called by the judge on the song clock, exactly when the drumroll closes, once per window.
export function dracEndTraca(n) {
  if (isDracOn() && !G.practice) dracFx.finish(n.count, n.need);
}
// once a frame, after animCrowd. t: the song time drawn
export function dracFrame(dt, t) { // (the red smoke of the last pass rises round IN.x/z, her spot)
  if (!drac?.root.visible) {
    SHOWCASE.crema = false;
    chip?.clearMenuSfx?.('flama');
    dracFx.clear(); tracaFor = null;
    if (hazed) { scene.fog.color.copy(FOG.sky); scene.background.copy(FOG.sky); scene.fog.near = FOG.near; scene.fog.far = FOG.far; hazed = false; }
    return;
  }
  const on = isDracOn();
  const show = PAIR.k > 0 || (on && (G.state === 'select' || G.state === 'title')); // its menu showcase (drac-demo.js): a CREMA now and then
  if (SHOWCASE.crema) { SHOWCASE.crema = false; if (show) { dracFx.crema(); chip?.sfx('flama'); } }
  if (!on && !show && !hazed && dracFx.idle) return; // the Mulassa alone: nothing to do
  const play = on && G.state === 'play' && !G.collapseT;
  IN.on = (play && !G.practice) || show; IN.fire = on || show ? drac?.fire ?? null : null;
  IN.streak = play && !G.practice && streakFire(G.combo, beatAt(t));
  if (song !== flareSong) { flareSong = song; flareT = flareStart(song, songTimeAtBeat); }
  // From the last pass to the end; results let it thin out, menus clear it immediately.
  IN.flare = play && !G.practice && t >= flareT; // (the results let it thin out; a menu clears it below)
  if (G.state === 'splash' || G.state === 'title' || G.state === 'select' || G.practice || !on) dracFx.clearHaze();
  IN.max = renderProfile.smoke ?? 0; IN.emax = renderProfile.embers ?? 0; IN.wmax = renderProfile.wheels ?? 0; IN.x = M.pos.x; IN.z = M.pos.y; // a quality step down since the pools were made: fewer
  const bl = play ? tracaWindow(G.balloons, t) : null;
  if (bl !== tracaFor) { tracaFor = bl; if (bl) dracFx.begin(); else dracFx.end(); }
  dracFx.update(dt, IN);
  const k = dracFx.flare;
  if (k || hazed) {
    hazed = k > 0;
    const e = k * k * (3 - 2 * k);
    scene.fog.color.copy(FOG.sky).lerp(FOG.red, e * 0.8); scene.background.copy(scene.fog.color);
    scene.fog.near = FOG.near - 36 * e; scene.fog.far = FOG.far - 62 * e; // at full: thick from 4 m, solid past 28
  }
}
export const dracWarm = renderer => dracFx.warm(renderer);
