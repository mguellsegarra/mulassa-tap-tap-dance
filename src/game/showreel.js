// The selector's showreel: the selected figure dances its whole song dance behind the cards, on the MENU LOOP's beat (the menu music stays; the dance follows it, a song beat per menu beat: the Mulassa at 93-100% of her speed,
// the Drac at ~1.3x); «Mira el ball» plays the same shots on the song's own beat. Each cut answers a move (where a run sets
// off after a turn, or where she stops), the angle picked by where she runs next: the Mulassa as a music video, the Drac as a TV
// broadcast from fixed cameras. Shots that walked round her passed behind an attendant (the colla dodge turns only so fast).
// History: a cut every two bars whatever she did fell in the middle of her runs («canvis de plans sense sentit»); the first pop-video edit (a cut every 2.7 s, shots that swung and pushed in) hurt
// the eyes; the dance film after it (4-5 cuts a loop, near-identical shots) was too dull. What hurt was the camera turning, not
// the cut: every shot is held or moves slowly (≤ 0.05 rad a beat), every cut dissolves (ui/reel-fade.js), every angle is on the
// camera's side of the action (180° rule). Pure: main.js feeds it the menu beat, the figures pose the dance at REEL.beat,
// cameras.js frames REEL.shot inside the free band (a hard edge keeps her in it).
import { menuSong } from './figure-song.js';
import { MULASSA, DRAC, BOU } from './figures.js';

// The menu loop's tempo, for when it is silent (Silenci, still loading): its loop's beats over its length
const REEL_LOOP = menuSong.ambientLoop, REEL_LOOP_BEATS = REEL_LOOP.beats, REEL_BPM = REEL_LOOP_BEATS * 60 / (REEL_LOOP.end - REEL_LOOP.start);
const reelMod = (x, m) => ((x % m) + m) % m;

// The shots (rad round from the play camera's azimuth, rad above the plaça, share of the band she fills), from first to
// last frame of the shot: nearly held, a slight drift. The orbit's own limits still apply (the lens above the crowd). Low
// heights (on a Studio Display the old 0.34-0.85 rad looked down on a field of tiles, up to 40% of the
// scene): the crowd and the façades fill the frame behind her, the floor is what she dances on, not the picture.
export const SHOT_KINDS = {
  wide: { az: [-0.05, 0.05], el: 0.4, fill: [0.6, 0.62] }, // the plaça round her
  vast: { az: [-0.05, 0.05], el: 0.55, fill: [0.38, 0.4] }, // the whole plaça, the crowd round her, from a little higher
  left: { az: [-0.48, -0.42], el: 0.28, fill: [0.75, 0.75] }, // three-quarter, either side
  right: { az: [0.48, 0.42], el: 0.28, fill: [0.75, 0.75] },
  side: { az: [-1.15, -1.05], el: 0.3, fill: [0.75, 0.75] }, // her profile (still on the camera's side of the action)
  front: { az: [0.15, 0.08], el: 0.22, fill: [0.78, 0.8] }, // as low and near as the crowd lets the lens, still her whole body
  low: { az: [0.3, 0.25], el: 0.12, fill: [0.85, 0.85], eye: 2.1 }, // from low down, looking up (eye: the lens may come this low, m; elsewhere it stays above the crowd's heads)
  high: { az: [-0.2, -0.1], el: 0.42, fill: [0.68, 0.68] }, // from a little higher: the circle, the turns
  // close-ups of one part (cameras.js: a long lens from the orbit's nearest, never in among the crowd), cut in and out, only where
  // that part stands still: one head (the Drac's other one crowds in beside it). `tight`'s part names no node: her whole
  // body through that long lens (flat, close), without the camera going any nearer.
  close: { az: [0.1, 0.06], el: 0.3, fill: [0.55, 0.56], part: 'head' },
  tight: { az: [0.2, 0.15], el: 0.3, fill: [0.82, 0.85], part: '*' }, // (0.95 left no air: a charge outgrew a phone's frame)
  // Answering her runs (2026-11-03): seen from the play camera her runs go along two diagonals, head on from one side
  // (az ≈ -0.75 / +0.8) and in profile from the other, so a run towards the lens is a long lens from where she heads, and a
  // run across is a profile from the other side
  tightL: { az: [-0.72, -0.7], el: 0.26, fill: [0.84, 0.84], part: '*' }, tightR: { az: [0.78, 0.76], el: 0.26, fill: [0.84, 0.84], part: '*' },
  profL: { az: [-0.78, -0.74], el: 0.3, fill: [0.75, 0.75] }, profR: { az: [0.82, 0.78], el: 0.3, fill: [0.75, 0.75] },
  lowL: { az: [-0.6, -0.55], el: 0.12, fill: [0.85, 0.85], eye: 2.1 },
  // A TV broadcast's cameras: `fixed` stays where its cut put it and pans after her (scene/cameras.js fixedLens), so she grows as
  // she charges at it; enter one on a cut. el [from, to]: a crane rising through the shot.
  camWide: { az: [0, 0], el: 0.5, fill: [0.45, 0.45], fixed: true }, // the balcony
  camL: { az: [-0.75, -0.75], el: 0.25, fill: [0.45, 0.45], fixed: true }, camR: { az: [0.8, 0.8], el: 0.25, fill: [0.45, 0.45], fixed: true },
  camFront: { az: [0.05, 0.05], el: 0.22, fill: [0.4, 0.4], fixed: true }, // (small: the Drac's charge comes 4 m nearer)
  camLow: { az: [0.3, 0.3], el: 0.12, fill: [0.75, 0.75], eye: 2.1, fixed: true },
  camTight: { az: [0.15, 0.15], el: 0.28, fill: [0.72, 0.72], part: '*', fixed: true }, // only where it dances on the spot
  jibUp: { az: [-0.25, 0.05], el: [0.22, 0.5], fill: [0.72, 0.5] }, jibOut: { az: [0, 0], el: [0.25, 0.55], fill: [0.8, 0.42] },
};
const REEL_CALM_SHOT = { az: [0, 0], el: 0.5, fill: [0.75, 0.75] }; // reduced motion: one still shot, no cuts
// beats a glide to the next angle takes (~7 s), eased in and out; never more than REEL_GLIDE_AZ rad round her (on a
// Studio Display the old 1 rad swings in 4.7 s, a third of the screen a second at the 38° lens, made him a little dizzy:
// now at most ~0.13 rad/s, about a tenth of the screen a second)
export const REEL_GLIDE = 18, REEL_GLIDE_AZ = 0.6;

// [song beat, kind, 'cut' | 'glide']; loop: where the dance starts again (a bar after her last move); start: where a fresh
// selection begins (on her first move, not the intro's stance)
export const SHOWREELS = {
  // on the arrangement's parts (game/dance.js): A1 her four runs, A2 the circle, the passada and the drumroll, B the culades,
  // C the charges, X the spins and the final hit. A music-video cut where each cut answers a move (2026-11-03: the cut every two
  // bars fell in the middle of her runs): on the beat a run sets off after a turn, towards the lens or across it.
  [MULASSA.id]: { start: 16, loop: 232, shots: [
    [0, 'vast', 'cut'], [16, 'tightL', 'cut'], [26, 'profR', 'cut'], [42, 'lowL', 'cut'], // the plaça; A1: at us, turns and crosses, back at us from low
    [50, 'vast', 'cut'], [58, 'tightR', 'cut'], [74, 'profL', 'cut'], // the runs change diagonal: the whole plaça, then straight at us, across
    [86, 'high', 'cut'], [112, 'profR', 'cut'], [130, 'tightL', 'cut'], // A2: the circle from a little higher, the crossings, at us into the drumroll
    [144, 'side', 'cut'], [152, 'tight', 'cut'], [160, 'high', 'cut'], [168, 'low', 'cut'], // B: the culades
    [176, 'tightR', 'cut'], [188, 'profL', 'cut'], [200, 'front', 'cut'], // C: the charge at us, away across, across in front
    [208, 'low', 'cut'], [216, 'wide', 'cut'], [224, 'front', 'cut'], // X: the spins, the final hit
  ] },
  // On its parts (figures/drac/dance-drac.js, 2/4: a bar is 2 beats). A TV broadcast (2026-11-03): fixed cameras round the
  // plaça, cut to the one it runs across or charges at; a crane over the spins and the end. Close-ups of a head only where its
  // root stands still (beats 0-10 before the dance, 96-104 after the charge). A fresh selection opens on the plaça as it sets
  // off (a close-up first read as a framing bug); the opening close-up plays from the second loop on.
  [DRAC.id]: { start: 8, loop: 236, shots: [
    [0, 'close', 'cut'], [8, 'camWide', 'cut'], [16, 'camR', 'cut'], [28, 'camL', 'cut'], // its faces; it sets off; A2 to and fro across one camera, then the other
    [42, 'camTight', 'cut'], [56, 'camLow', 'cut'], [70, 'camFront', 'cut'], // B: the torsions; C: its snaps from low; D: the charge grows in the front camera, the arc
    [96, 'close', 'cut'], [104, 'camR', 'cut'], [132, 'jibUp', 'cut'], [146, 'camTight', 'cut'], // the stare; E; B3 under the crane; C3
    [162, 'camFront', 'cut'], [186, 'camLow', 'cut'], [214, 'jibOut', 'cut'], // D3: the second charge, same camera; E3: the spins; the brake, the final hit
  ] },
  // on its source bars (figures/bou/bou-dance.js): 1 the first steps, 9 the changes of facing, 19 the lateral pass, 27 the
  // drums and turns, 64 the start, 72 the festive turns, 88 the ending
  // fill: a smaller share of the band (the Bou is low: at full share the lens came within the crowd's front rows)
  // film: «Mira el ball» is filmed by its own cameras (figures/bou/bou-clip.js), which cut dry: this list's cuts dissolve only on the selector
  [BOU.id]: { start: 12, loop: 324, fill: 0.8, film: true, shots: [
    [0, 'wide', 'cut'], [16, 'left', 'glide'], [44, 'front', 'glide'], // the entrance, the first steps, the changes of facing
    [80, 'high', 'cut'], [112, 'right', 'glide'], [144, 'wide', 'glide'], [176, 'front', 'glide'], // the lateral pass; the turns
    [208, 'left', 'cut'], [240, 'high', 'glide'], [272, 'right', 'glide'], // the start; the festive turns
    [304, 'front', 'cut'], // the ending and the settle
  ] },
};

// Live state (owned here; main.js runs tickReel each frame). acc: menu beats counted since the page began (unwrapped).
export const REEL = { on: false, id: null, beat: 0, cut: false, fresh: false, shot: { az: 0, el: 0.5, fill: 0.75, part: null, eye: null, fixed: false }, acc: 0, prev: null, alone: false, still: 0, err: 0, locked: false, anchor: 0, idx: -1, song: false, idle: false };
// idle: the selector's UI faded out (ui/reel-idle.js, through main.js); the Drac's night and fire play only then (drac-show.js)
export const setReelIdle = on => { REEL.idle = on; };

// Counts the menu loop's beats across its wraps. Silent, or standing still while the page runs (its context suspended: a tab
// or app switch, iOS waiting for a tap), the dance carries on alone at the loop's tempo, never frozen. Back to the music, or
// after a seek, it finds the loop's bar phase again without a jump (back from another tab the audio clock settles
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
  if (!s.locked && !s.on) { s.acc += tempo + j; s.err = 0; } // the very first lock with nothing shown yet: straight onto it
  else { s.acc += tempo; s.err = j; } // later ones (the splash's tap: she is already dancing when its loop starts; the speaker back on, back from a tab): caught up gradually
  s.prev = menuBeat; s.alone = false; s.locked = true;
}

const kindAt = (k, u, out) => { out.az = k.az[0] + (k.az[1] - k.az[0]) * u; out.el = k.el[1] == null ? k.el : k.el[0] + (k.el[1] - k.el[0]) * u; out.fixed = !!k.fixed; out.fill = k.fill[0] + (k.fill[1] - k.fill[0]) * u; out.part = k.part ?? null; out.eye = k.eye ?? null; };
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
// songBeat: «Mira el ball» films its run with the same shots, on the song's own beat (once through, from its first beat).
export function tickReel(on, id, menuBeat, dt, calm = false, songBeat = null) {
  followBeat(REEL, menuBeat, dt);
  const song = songBeat != null, reel = (on || song) && SHOWREELS[id];
  if (!reel) { REEL.on = false; REEL.id = null; REEL.cut = false; return REEL; }
  if (!REEL.on || REEL.id !== id || REEL.song !== song) { REEL.anchor = REEL.acc - reelMod(REEL.acc, 4); REEL.id = id; REEL.idx = -1; REEL.song = song; }
  REEL.on = true;
  REEL.beat = song ? Math.max(0, songBeat) : reelMod(reel.start + REEL.acc - REEL.anchor, reel.loop);
  const i = shotAt(reel, REEL.beat, REEL.shot, calm);
  REEL.cut = i !== REEL.idx && !(song && reel.film); REEL.fresh = REEL.idx === -1; REEL.idx = i; // fresh: a new selection's first shot (no dissolve: the old shot is gone)
  return REEL;
}
