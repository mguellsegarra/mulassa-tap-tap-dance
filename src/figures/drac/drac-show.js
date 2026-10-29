// The Drac's fire and powder wired to the game (drac-fx.js / common/fire.js do the work): judge.js calls dracCrema (through DRAC_SCENE.onBoth) /
// dracPump, main.js dracFrame (after the crowd is posed), scene/precompile.js dracWarm. With the Mulassa every hook
// is a no-op, so she looks and sounds exactly as before. Its confetti (confetti.js burst / spawnConfetti) are rodes de foc.
import * as THREE from 'three';
import { createDracFx } from './drac-fx.js';
import { streakFire, flareLevel, tracaWindow, DRAC_FX, DRAC_NIGHTS, dracNightWindows, dracNightAt } from './drac-fx-rules.js';
import { dracTime } from './drac-time.js';
import { scene, camera, renderProfile, glc, qualityLevel, plaza } from '../../scene/stage.js';
import { drac, dracGlow } from './drac-objects.js';
import { G, figureSfx } from '../../game/state.js';
import { selectedFigure, song } from '../../game/figure-song.js';
import { CALM, Q } from '../../core/env.js';
import { DRAC } from '../../game/figures.js';
import { PAIR } from './drac-play.js';
import { SHOWCASE } from './drac-demo.js';
import { PHOTO } from '../../game/photo-control.js';
import { setConfettiDivert } from '../../scene/confetti.js';
import { setFinaleDim } from '../../scene/fx.js';
import { activeCrowd } from '../../scene/quality.js';
import { sootFrame } from './drac-soot.js';
import { plazaNight, nightLook, NIGHT_BLUE, NIGHT_NOW } from '../common/night.js';
import { photoExtras } from '../../scene/photo-obstacles.js';
import { REEL } from '../../game/showreel.js';
import { timeAtBeat } from '../../core/beat-grid.js';

export const dracFx = createDracFx(scene, { smoke: renderProfile.smoke ?? 0, jets: renderProfile.jets ?? 0, wheels: renderProfile.wheels ?? 0, sound: figureSfx, calm: CALM, octaves: qualityLevel > 0 ? 2 : 1 });
const isDracOn = () => selectedFigure.id === DRAC?.id;
const FOLK = [activeCrowd, plaza.band, plaza.balcony, photoExtras]; // who the free mode's fire can char (drac-soot.js); [0] refreshed a frame (a quality step makes a new list)
const IN = { on: false, cam: camera, fire: null, streak: false, flare: false, max: 0, jmax: 0, wmax: 0, held: false, manual: false, viewH: 800, x: 0, z: 0 };
setConfettiDivert((sec, reason) => {
  if (!isDracOn()) return false;
  if (reason === 'combo' && !G.practice && (G.combo === 50 || G.combo === 100)) dracFx.wheels(1.2);
  return true;
});
let flareSong = null, flareT = Infinity, tracaFor = null, hazed = false, dracLastState = null;
// The last pass's red mist: the plaça's own fog (stage.js) closes in and turns red with the crescendo, the sky with it (a
// dense mist costs nothing more to draw: old phones). Only while the dance is on; a menu clears it at once.
// The tint is a bengala's smoke: a smoky red, never a sky-red mix (blue and red went mauve). The fog takes that colour
// at once and the crescendo is its density; the sky behind only half tints (a flat red sky read as odd).
const FOG = { red: new THREE.Color('#b5473a'), redNight: new THREE.Color('#3a1512'), tint: new THREE.Color(), sky_mix: 0.6, near: 40, far: 90 }; // redNight: the smoke at night (unlit fog would glow)

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
// The plaça at night in its windows (drac-fx-rules.js DRAC_NIGHTS, ?nit picks one), the Drac lit on its own
const DRAC_NIGHT_LOOKS = { blue: NIGHT_BLUE, ember: nightLook('#160807', '#060203', '#2a1416', '#301a12', 0.99), dusk: nightLook('#22142c', '#0a0618', '#2a2448', '#2c2030', 0.86) };
const DRAC_NIGHT_SMOKE = new THREE.Color('#6a2a24');
const DRAC_NIGHT = { n: 0, cfg: DRAC_NIGHTS[Q.get('nit') ?? 'b'] ?? null, song: null, windows: [] };
DRAC_NIGHT.style = DRAC_NIGHT.cfg; // style: the window's night, kept while it lifts
// reel: the selector's showreel with its UI faded out (its night as in a run); the UI back, day again with it (0.25 s).
function dracNight(dt, t, reel) {
  const ended = G.state === 'results'; // a night that reached the end stays over the results, under the red smoke thinning out
  const sel = REEL.on && G.state === 'select', N = DRAC_NIGHT, run = !!N.cfg && isDracOn() && ((G.state === 'play' || ended) && !G.practice || sel) && !!drac?.root.visible;
  if (run && song !== N.song) { N.song = song; N.windows = dracNightWindows(song, N.cfg); } // (another figure's song has none of its labels)
  const was = N.n, w = run && !ended && (!sel || reel) ? dracNightAt(N.windows, t) : null, on = !!w || run && ended && was > 0.5;
  if (w) N.style = w[2];
  N.n = run ? was + ((on ? 1 : 0) - was) * (1 - Math.exp(-Math.max(0, dt) / (sel && !reel ? 0.08 : N.style.fall))) : 0; // a menu clears it at once, like the red smoke
  if (!on && N.n < 0.01) N.n = 0;
  if (!N.n && !was) return;
  plazaNight(N.n, DRAC_NIGHT_LOOKS[N.style.look]);
  dracGlow.value = N.style.glow * N.n;
  dracFx.objects.smoke?.material.color.setScalar(1).lerp(DRAC_NIGHT_SMOKE, N.n); // unlit smoke would glow in the dark (and go grey if only dimmed)
  setFinaleDim(N.n);
}

// once a frame, after animCrowd. t: the song time drawn
export function dracFrame(dt, t) { // (the red smoke of the last pass rises round IN.x/z, her spot)
  // back on the selector from a run or «Mira el ball»: its smoke, sparks and wheels gone at once (the selector's own CREMA starts clean)
  if (G.state === 'select' && (dracLastState === 'play' || dracLastState === 'results')) { dracFx.clear(); tracaFor = null; }
  dracLastState = G.state;
  const reel = isDracOn() && REEL.on && REEL.idle && G.state === 'select' && !PHOTO.on; // the showreel without its UI: the run's festa, on the reel's beat
  if (reel) t = timeAtBeat(song.beats, REEL.beat);
  dracNight(dt, t, reel);
  if (!drac?.root.visible) {
    FOLK[0] = activeCrowd; sootFrame(dt, dracFx, FOLK, false, false); // anyone charred comes back
    SHOWCASE.crema = false;
    dracFx.clear(); tracaFor = null;
    if (hazed) { scene.fog.color.copy(NIGHT_NOW.horizon); scene.background.copy(NIGHT_NOW.horizon); scene.fog.near = FOG.near; scene.fog.far = FOG.far; hazed = false; }
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
  const play = on && G.state === 'play' && !G.collapseT, fest = play && !G.practice || reel;
  IN.on = fest || show; IN.fire = on || show ? drac?.fire ?? null : null;
  IN.streak = fest && (!reel && streakFire(G.combo) || t >= song.finale); // the carretilles' jets: a long streak, the FINAL ESBOJARRAT
  if (song !== flareSong) { flareSong = song; flareT = dracTime.songAtRef(DRAC_FX.flareRef); }
  // From the brake before the six reversed spins it builds up to the final hit; results let it thin out, menus clear it.
  IN.flare = fest ? flareLevel(t, flareT, song.end) : false;
  if (G.state === 'splash' || G.state === 'select' && !reel || G.practice || !on) dracFx.clearHaze(); // (the selector's UI up: none)
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
    FOG.tint.copy(FOG.red).lerp(FOG.redNight, DRAC_NIGHT.n);
    scene.fog.color.copy(NIGHT_NOW.horizon).lerp(FOG.tint, n); scene.background.copy(NIGHT_NOW.horizon).lerp(FOG.tint, e * FOG.sky_mix);
    scene.fog.near = FOG.near - 38 * n; scene.fog.far = FOG.far * (1 - n) + (2 + 30 / Math.max(0.05, e)) * n; // (far ~ 1/e: the tint grows with the level)
  }
}
export const dracWarm = renderer => dracFx.warm(renderer);
