// The selector's showreel: the selected figure dances its whole song dance behind the cards, on the MENU LOOP's beat (Marc,
// 2026-10-23: the menu music stays; the dance follows it, a song beat per menu beat: the Mulassa at 93-100% of her speed,
// the Drac at ~1.3x). Filmed as a dance film, not a pop video (Marc: the first cut, a cut every 2.7 s and shots that swung
// and pushed in, hurt the eyes; Astaire's rule: long, open takes, the whole body in shot, the camera still while she moves):
// a shot per part of the dance, 16-36 beats (6-14 s), full body with air round her; a hard cut only at the big changes of
// the dance, a slow glide to the next angle at the others; every angle on the camera's side of the action (180° rule).
// Pure: main.js feeds it the menu beat, mula-motion.js / drac-dance.js pose the dance at REEL.beat, cameras.js frames
// REEL.shot inside the selector's band.
import { menuSong } from './figure-song.js';
import { MULASSA, DRAC, BOU } from './figures.js';

// The menu loop's tempo, for when it is silent (Silenci, still loading): its loop's beats over its length
const REEL_LOOP = menuSong.ambientLoop, REEL_LOOP_BEATS = REEL_LOOP.beats, REEL_BPM = REEL_LOOP_BEATS * 60 / (REEL_LOOP.end - REEL_LOOP.start);
const reelMod = (x, m) => ((x % m) + m) % m;

// The shots (rad round from the play camera's azimuth, rad above the plaça, share of the band she fills), from first to
// last frame of the shot: nearly held, a slight drift. The orbit's own limits still apply (the lens above the crowd). Low
// heights (Marc, 2026-10-23: on a Studio Display the old 0.34-0.85 rad looked down on a field of tiles, up to 40% of the
// scene): the crowd and the façades fill the frame behind her, the floor is what she dances on, not the picture.
export const SHOT_KINDS = {
  wide: { az: [-0.05, 0.05], el: 0.4, fill: [0.6, 0.62] }, // the plaça round her
  left: { az: [-0.48, -0.42], el: 0.28, fill: [0.75, 0.75] }, // three-quarter, either side
  right: { az: [0.48, 0.42], el: 0.28, fill: [0.75, 0.75] },
  front: { az: [0.15, 0.08], el: 0.22, fill: [0.78, 0.8] }, // as low and near as the crowd lets the lens, still her whole body
  high: { az: [-0.2, -0.1], el: 0.42, fill: [0.68, 0.68] }, // from a little higher: the circle, the turns
};
const REEL_CALM_SHOT = { az: [0, 0], el: 0.5, fill: [0.75, 0.75] }; // reduced motion: one still shot, no cuts
// beats a glide to the next angle takes (~7 s), eased in and out; never more than REEL_GLIDE_AZ rad round her (Marc: on a
// Studio Display the old 1 rad swings in 4.7 s, a third of the screen a second at the 38° lens, made him a little dizzy:
// now at most ~0.13 rad/s, about a tenth of the screen a second)
export const REEL_GLIDE = 18, REEL_GLIDE_AZ = 0.6;

// [song beat, kind, 'cut' | 'glide']; loop: where the dance starts again (a bar after her last move); start: where a fresh
// selection begins (on her first move, not the intro's stance)
export const SHOWREELS = {
  [MULASSA.id]: { start: 16, loop: 232, shots: [
    [0, 'wide', 'cut'], // the intro
    [16, 'left', 'glide'], [48, 'front', 'glide'], // A1: the four runs, two by two
    [80, 'high', 'cut'], [112, 'right', 'glide'], // A2: the circle from above; the passada and the drumroll
    [144, 'left', 'cut'], [176, 'wide', 'glide'], // B: the culades; C: the charges
    [208, 'right', 'cut'], // X: the spins and the final hit
  ] },
  [DRAC.id]: { start: 0, loop: 236, shots: [
    [0, 'wide', 'cut'], [28, 'left', 'glide'], [48, 'high', 'glide'], // the walk out to its points, back, the turn and torsions
    [72, 'right', 'cut'], [104, 'wide', 'glide'], // the arc and the close pass; the walks
    [128, 'high', 'cut'], [164, 'left', 'glide'], // the second turn and torsions; the second arc
    [188, 'front', 'cut'], [212, 'right', 'glide'], // the spins, braking, reversing, the settle
  ] },
  // on its source bars (game/bou-dance.js): 1 the first steps, 9 the changes of facing, 19 the lateral pass, 27 the
  // drums and turns, 64 the start, 72 the festive turns, 88 the ending
  // fill: a smaller share of the band (the Bou is low: at full share the lens came within the crowd's front rows)
  [BOU.id]: { start: 12, loop: 324, fill: 0.8, shots: [
    [0, 'wide', 'cut'], [16, 'left', 'glide'], [44, 'front', 'glide'], // the entrance, the first steps, the changes of facing
    [80, 'high', 'cut'], [112, 'right', 'glide'], [144, 'wide', 'glide'], [176, 'front', 'glide'], // the lateral pass; the turns
    [208, 'left', 'cut'], [240, 'high', 'glide'], [272, 'right', 'glide'], // the start; the festive turns
    [304, 'front', 'cut'], // the ending and the settle
  ] },
};

// Live state (owned here; main.js runs tickReel each frame). acc: menu beats counted since the page began (unwrapped).
export const REEL = { on: false, id: null, beat: 0, cut: false, shot: { az: 0, el: 0.5, fill: 0.75 }, acc: 0, prev: null, alone: false, still: 0, err: 0, locked: false, anchor: 0, idx: -1 };

// Counts the menu loop's beats across its wraps. Silent, or standing still while the page runs (its context suspended: a tab
// or app switch, iOS waiting for a tap), the dance carries on alone at the loop's tempo, never frozen. Back to the music, or
// after a seek, it finds the loop's bar phase again without a jump (Marc: back from another tab the audio clock settles
// ~0.4 s off, and a re-sync skipped and cut): it runs up to REEL_CATCH faster or slower until it is in step.
const REEL_CATCH = 0.15;
export function followBeat(s, menuBeat, dt) {
  const tempo = dt * REEL_BPM / 60;
  if (menuBeat == null) { s.prev = null; s.acc += tempo; return; }
  if (s.prev != null && !s.alone) {
    const m = reelMod(menuBeat - s.prev, REEL_LOOP_BEATS);
    if (m > 0 && m < 4) { // in step with the music, catching up any phase left over
      const c = Math.max(-REEL_CATCH * m, Math.min(REEL_CATCH * m, s.err || 0));
      s.prev = menuBeat; s.acc += m + c; s.err -= c; return;
    }
    if (m === 0 && dt <= 0) return; // (a frame with no time: the first after the page comes back)
    s.alone = true; s.still = menuBeat; // standing still, or jumped: on alone until it moves on from here
  }
  if (s.alone && menuBeat === s.still) { s.acc += tempo; return; }
  let j = reelMod(menuBeat, 4) - reelMod(s.acc + tempo, 4); if (j > 2) j -= 4; else if (j < -2) j += 4;
  if (!s.locked) { s.acc += tempo + j; s.err = 0; } // the very first lock: nothing shown yet, straight onto it
  else { s.acc += tempo; s.err = j; } // later ones (the speaker back on, back from a tab): caught up gradually
  s.prev = menuBeat; s.alone = false; s.locked = true;
}

const kindAt = (k, u, out) => { out.az = k.az[0] + (k.az[1] - k.az[0]) * u; out.el = k.el; out.fill = k.fill[0] + (k.fill[1] - k.fill[0]) * u; };
const GLIDE_FROM = { az: 0, el: 0, fill: 0 };
// The shot at song beat b (fills out: az, el, fill); returns the index of the cut it belongs to (a glide is no cut)
export function shotAt(reel, b, out, calm = false) {
  const { shots, loop } = reel;
  let i = 0;
  while (i + 1 < shots.length && shots[i + 1][0] <= b) i++;
  if (calm) { kindAt(REEL_CALM_SHOT, 0, out); return 0; }
  const b0 = shots[i][0], b1 = shots[i + 1]?.[0] ?? loop;
  kindAt(SHOT_KINDS[shots[i][1]], Math.min(1, Math.max(0, (b - b0) / (b1 - b0))), out);
  const g = (b - b0) / REEL_GLIDE;
  if (shots[i][2] === 'glide' && i > 0 && g < 1) { // from where the last shot ended, eased in and out
    kindAt(SHOT_KINDS[shots[i - 1][1]], 1, GLIDE_FROM);
    const e = g * g * (3 - 2 * g);
    out.az = GLIDE_FROM.az + (out.az - GLIDE_FROM.az) * e; out.el = GLIDE_FROM.el + (out.el - GLIDE_FROM.el) * e; out.fill = GLIDE_FROM.fill + (out.fill - GLIDE_FROM.fill) * e;
  }
  out.fill *= reel.fill ?? 1;
  while (i > 0 && shots[i][2] !== 'cut') i--;
  return i;
}

// One frame: on = the selector shows a playable figure `id` (no photo mode, no pending card). A fresh selection starts on
// the menu loop's current bar; the dance loops, and its wrap is always a cut (the list starts again on one).
export function tickReel(on, id, menuBeat, dt, calm = false) {
  followBeat(REEL, menuBeat, dt);
  const reel = on && SHOWREELS[id];
  if (!reel) { REEL.on = false; REEL.id = null; REEL.cut = false; return REEL; }
  if (!REEL.on || REEL.id !== id) { REEL.anchor = REEL.acc - reelMod(REEL.acc, 4); REEL.id = id; REEL.idx = -1; }
  REEL.on = true;
  REEL.beat = reelMod(reel.start + REEL.acc - REEL.anchor, reel.loop);
  const i = shotAt(reel, REEL.beat, REEL.shot, calm);
  REEL.cut = i !== REEL.idx; REEL.idx = i;
  return REEL;
}
