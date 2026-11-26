// The Bou's festa rules, no drawing (figures/bou/bou-show.js draws them):
// - the first TECHNO (bars 27-34) is a dark plaça under a strobe (one flash a beat, under 3 a second); the final (84-91) keeps its multicolour disco, every other
//   tile lit on each beat, each lit tile its own colour, a white ring of light out of the Bou each bar, the Bou itself lit
//   as if by a spot (no light on the floor); nothing else happens meanwhile (no carretilles, no confetti);
// - its CARRETILLES (UAF videos 2021/2024: a comb of tubes along both edges of its back, jets out of both flanks, one
//   straight up) burn in short bursts wherever another figure throws confetti (a combo praise, a GLOBUS pop, the
//   finale's beats; a streak lights nothing for now): all of its back's at once; while
//   its colla carries it, the ones on its horn tips and in its mouth instead; each tube grows in before it fires and
//   shrinks away once burnt.
import { BOU_TIMING, BOU_CARRY } from './bou-dance.js';

export const BOU_FX = {
  technoStart: BOU_TIMING.technoStart, technoEnd: BOU_TIMING.bars.find(b => b.sourceBar === 35).time, // song s
  // and again in the final, its fastest part (bars 84-91, 145-150 bpm; the run-up 64-71 starts too slow; its techno kick went too, music revision 19),
  // after its colla sets it down, up to the last note; the carretilles and the finale's confetti keep going there (`bouHush`)
  finalStart: BOU_TIMING.bars.find(b => b.sourceBar === 84).time, finalEnd: BOU_TIMING.bars.find(b => b.sourceBar === 92).time,
  night: 0.4, // s the plaça takes to turn night (and back)
  softDisco: { colour: '#ffd66b', gain: 0.32, reach: 10 }, // the first techno: alternating soft yellow tiles, no ring
  // the first techno's strobe: a white flash `on` s long on each beat (its beats are 0.44-0.45 s: 2.2-2.3 flashes a
  // second), never two within `gap` s (WCAG 2.3.1: no more than 3 flashes a second); none with reduced motion (bou-show.js)
  strobe: { on: 0.06, gap: 0.34, gain: 0.55, glow: 1.1, spot: '#ffc98a' }, // glow, spot: the follow spot's warm light on the Bou, from above (bou-rave.js draws the beam)
  co2: BOU_TIMING.bars.find(b => b.sourceBar === 84).time, // song s the final's CO2 cannons fire (bou-rave.js)
  disco: ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ff2bd6'], // The owner\'s «Disco 70 multicolor»
  glass: '#262838', // every disco tile's base: the Mulassa clip's cool dark grey (tools/videoclip/stage.js), not black
  pulse: 3, low: 0.35, // a lit tile's flash fades by e^(-pulse * beat fraction) down to `low`
  wave: 14, ring0: 3.2, bar: 4, waveW: 1.5, reach: 16, // the ring: m it runs out to in a bar of `bar` beats, from ring0 (clear of its body), its width (m²); how far the floor stays lit round the Bou (m)
  glow: 0.9, // how much of its own colour the Bou shows on its own at night (lit as by day, the floor left dark)
  back: 7, // tubes on its back (bou.js): three pairs along its edges and one up the middle; its head's three come after
  grow: 0.12, // s a tube takes to grow in / shrink away
  burst: 3, festaStart: BOU_TIMING.bars.find(b => b.sourceBar === 72).time, // s a burst burns; song s its colla lifts it
  // song s: carried round, its carretilles burn all the way; stopped, set down and its colla gone, none
  // (on fire while it is carried; no sparks as it is moved and set down)
  carryEnd: BOU_TIMING.subdivisionTimes[Math.round(BOU_CARRY.lower * BOU_TIMING.subdivision)],
  quietEnd: BOU_TIMING.subdivisionTimes[Math.round(BOU_CARRY.back * BOU_TIMING.subdivision)],
  grain: 1.8, dense: 1.15, // its sparks' size and emission next to the Drac's (common/fire.js): thin by day otherwise
};
export const bouHush = t => t >= BOU_FX.technoStart && t < BOU_FX.technoEnd; // the first disco has the plaça to itself
// the strobe `since` s after a beat began (`beatLen` s long): 0 or BOU_FX.strobe.gain
export const bouStrobe = (since, beatLen) => since < BOU_FX.strobe.on && beatLen >= BOU_FX.strobe.gap ? BOU_FX.strobe.gain : 0;
export const bouTechno = t => bouHush(t) || t >= BOU_FX.finalStart && t < BOU_FX.finalEnd;
// at song time t, with the last confetti moment at song time `at`: do the carretilles burn (the disco and a collapse aside:
// bou-show.js): all the way round while carried; a burst after each confetti moment, except while it is set down
export const bouJetsWant = (t, at) => t >= BOU_FX.festaStart && t < BOU_FX.carryEnd || !(t >= BOU_FX.carryEnd && t < BOU_FX.quietEnd) && t >= at && t - at < BOU_FX.burst;
// does tube i burn (bou.js's order: the `back` ones, three pairs along its back's edges and one up its middle, then its
// head's: a horn tip each and its mouth): carried by its colla, its head's alone (fire from the horns and the mouth, as
// in the videos); otherwise its back's, all at once (in turns the fire walked along its back)
export const bouCarried = t => t >= BOU_FX.festaStart && t < BOU_FX.carryEnd;
export const bouTubeBurns = (i, carried, all = false) => all || (i >= BOU_FX.back) === carried; // all: free play's own burst (Q), every tube at once
// is tube i out this frame: it burns, and the jets are wanted or it was already out (`out`): a fading burst grows no new
// tube (set down, its back's grew in for the 0.3 s its head's jets took to die)
export const bouTubeOn = (i, carried, all, want, out) => bouTubeBurns(i, carried, all) && (want || out);
// tile (i, j) at song beat `beat`, d m from the Bou: its flash 0..1; and (in an n-wide grid) its colour's index
export function bouTileLight(i, j, beat, d) {
  const b = Math.floor(beat), f = beat - b;
  const k = (i + j) % 2 === b % 2 ? BOU_FX.low + (1 - BOU_FX.low) * Math.exp(-BOU_FX.pulse * f) : 0;
  return k * Math.max(0.15, 1 - d / BOU_FX.reach);
}
// Alternating tiles breathe together; the first techno stays behind the dance.
export function bouSoftTileLight(i, j, beat, d) {
  if ((i + j) % 2 !== 0) return 0;
  const pulse = 0.65 + 0.35 * Math.cos(Math.PI * beat);
  return BOU_FX.softDisco.gain * pulse * Math.max(0, 1 - d / BOU_FX.softDisco.reach);
}
// the ring at song beat `beat`, d m from the Bou: 0..1 of white over the tile, running out through each bar and fading
export function bouTileRing(beat, d) {
  const f = (beat % BOU_FX.bar) / BOU_FX.bar;
  return Math.exp(-((d - BOU_FX.ring0 - (BOU_FX.wave - BOU_FX.ring0) * f) ** 2) / BOU_FX.waveW) * (1 - f);
}
export const bouTileColour = (i, j, n, beat) => ((i * n + j) * 7 + i * 3 + Math.floor(beat)) % BOU_FX.disco.length;

