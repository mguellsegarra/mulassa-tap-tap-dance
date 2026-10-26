// The Drac's fire and powder wired to the game (drac-fx.js / common/fire.js do the work): judge.js calls dracCrema (through DRAC_SCENE.onBoth) /
// dracPump, main.js dracFrame (after the crowd is posed), scene/precompile.js dracWarm. With the Mulassa every hook
// is a no-op, so she looks and sounds exactly as before. Its confetti (confetti.js burst / spawnConfetti) are rodes de foc.
import * as THREE from 'three';
import { createDracFx } from './drac-fx.js';
import { streakFire, flareLevel, tracaWindow, DRAC_FX } from './drac-fx-rules.js';
import { dracTime } from './drac-time.js';
import { scene, camera, renderProfile, glc, qualityLevel, plaza } from '../../scene/stage.js';
import { drac } from './drac-objects.js';
import { G, figureSfx } from '../../game/state.js';
import { selectedFigure, song } from '../../game/figure-song.js';
import { CALM } from '../../core/env.js';
import { DRAC } from '../../game/figures.js';
import { PAIR } from './drac-play.js';
import { SHOWCASE } from './drac-demo.js';
import { PHOTO } from '../../game/photo-control.js';
import { setConfettiDivert } from '../../scene/confetti.js';
import { activeCrowd } from '../../scene/quality.js';
import { sootFrame } from './drac-soot.js';
import { SKY } from '../../scene/sky.js';
import { photoExtras } from '../../scene/photo-obstacles.js';

export const dracFx = createDracFx(scene, { smoke: renderProfile.smoke ?? 0, jets: renderProfile.jets ?? 0, wheels: renderProfile.wheels ?? 0, sound: figureSfx, calm: CALM, octaves: qualityLevel > 0 ? 2 : 1 });
const isDracOn = () => selectedFigure.id === DRAC?.id;
const FOLK = [activeCrowd, plaza.band, plaza.balcony, photoExtras]; // who the free mode's fire can char (drac-soot.js); [0] refreshed a frame (a quality step makes a new list)
const IN = { on: false, cam: camera, fire: null, streak: false, flare: false, max: 0, jmax: 0, wmax: 0, held: false, manual: false, viewH: 800, x: 0, z: 0 };
setConfettiDivert((sec, reason) => {
  if (!isDracOn()) return false;
  if (reason === 'combo' && !G.practice && (G.combo === 50 || G.combo === 100)) dracFx.wheels(1.2);
  return true;
});
let flareSong = null, flareT = Infinity, tracaFor = null, hazed = false;
// The last pass's red mist: the plaça's own fog (stage.js) closes in and turns red with the crescendo, the sky with it (a
// dense mist costs nothing more to draw: old phones). Only while the dance is on; a menu clears it at once.
// The tint is a bengala's smoke: a smoky red, never a sky-red mix (blue and red went mauve). The fog takes that colour
// at once and the crescendo is its density; the sky behind only half tints (a flat red sky read as odd).
const FOG = { sky: new THREE.Color(SKY.horizon), red: new THREE.Color('#b5473a'), sky_mix: 0.6, near: 40, far: 90 };

export function dracCrema() { // a CREMA (the Drac's GUAPA) and the final hit: the flamarada
  if (!isDracOn() || G.practice) return;
  dracFx.crema();
  figureSfx('flama');
}
// A tap in a drumroll. true = the Drac's traca took it (its own cracks and the TRO), false = the Mulassa's balloon.
export function dracPump(n) {
  if (!isDracOn()) return false;
  if (tracaFor !== n) { tracaFor = n; dracFx.begin(); }
  dracFx.pump(n.count, n.need);
  return true;
}
// Called by the judge on the song clock, exactly when the drumroll closes, once per window. true = the TRO fired.
export function dracEndTraca(n) {
  return isDracOn() && !G.practice && dracFx.finish(n.count, n.need);
}
// once a frame, after animCrowd. t: the song time drawn
export function dracFrame(dt, t) { // (the red smoke of the last pass rises round IN.x/z, her spot)
  if (!drac?.root.visible) {
    FOLK[0] = activeCrowd; sootFrame(dt, dracFx, FOLK, false, false); // anyone charred comes back
    SHOWCASE.crema = false;
    dracFx.clear(); tracaFor = null;
    if (hazed) { scene.fog.color.copy(FOG.sky); scene.background.copy(FOG.sky); scene.fog.near = FOG.near; scene.fog.far = FOG.far; hazed = false; }
    return;
  }
  const on = isDracOn();
  const photoDrac = PHOTO.on && PHOTO.id === 'drac-valls'; // driven in photo mode
  const show = PAIR.k > 0 || photoDrac || (on && (G.state === 'select')); // its menu showcase (drac-demo.js): a CREMA now and then
  IN.manual = photoDrac;
  if (SHOWCASE.crema) { SHOWCASE.crema = false; if (show && !photoDrac) { dracFx.crema(); figureSfx('flama'); } }
  IN.held = photoDrac && PHOTO.keys.has('KeyE');
  if (PHOTO.sparks) {
    PHOTO.sparks = false;
    if (IN.held) figureSfx('flama', 0, true); // explicit manual action; one onset, repeats never restart it
  }
  if (!on && !show && !hazed && dracFx.idle) { FOLK[0] = activeCrowd; sootFrame(dt, dracFx, FOLK, false, false); return; } // the Mulassa alone: nothing to do
  const play = on && G.state === 'play' && !G.collapseT;
  IN.on = (play && !G.practice) || show; IN.fire = on || show ? drac?.fire ?? null : null;
  IN.streak = play && !G.practice && (streakFire(G.combo) || t >= song.finale); // the carretilles' jets: a long streak, the FINAL ESBOJARRAT
  if (song !== flareSong) { flareSong = song; flareT = dracTime.songAtRef(DRAC_FX.flareRef); }
  // From the brake before the six reversed spins it builds up to the final hit; results let it thin out, menus clear it.
  IN.flare = play && !G.practice ? flareLevel(t, flareT, song.end) : false;
  if (G.state === 'splash' || G.state === 'select' || G.practice || !on) dracFx.clearHaze();
  IN.max = renderProfile.smoke ?? 0; IN.jmax = renderProfile.jets ?? 0; IN.wmax = renderProfile.wheels ?? 0; IN.viewH = glc.height; // (the canvas's pixel height: far sparks stay ~1.5 px wide) IN.x = M.pos.x; IN.z = M.pos.y; // a quality step down since the pools were made: fewer
  const bl = play ? tracaWindow(G.balloons, t) : null;
  if (bl !== tracaFor) { tracaFor = bl; if (bl) dracFx.begin(); else dracFx.end(); }
  dracFx.update(dt, IN);
  FOLK[0] = activeCrowd; sootFrame(dt, dracFx, FOLK, photoDrac, IN.held); // free mode's held fire chars whoever it touches (drac-soot.js)
  const k = dracFx.flare;
  if (k || hazed) {
    hazed = k > 0;
    const e = k * k * (3 - 2 * k);
    // one even haze from 2 m out, thicker everywhere at once as it builds (it has to show; at full: her ~29%, the
    // crowd ~46%, the façades ~80%)
    const n = Math.min(1, e * 3);
    scene.fog.color.copy(FOG.sky).lerp(FOG.red, n); scene.background.copy(FOG.sky).lerp(FOG.red, e * FOG.sky_mix);
    scene.fog.near = FOG.near - 38 * n; scene.fog.far = FOG.far * (1 - n) + (2 + 30 / Math.max(0.05, e)) * n; // (far ~ 1/e: the tint grows with the level)
  }
}
export const dracWarm = renderer => dracFx.warm(renderer);
