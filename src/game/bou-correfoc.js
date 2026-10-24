// The Bou's festa rules, no drawing (scene/bou-show.js draws them; Marc 2026-10-24, tools/dev/bou-propostes.html):
// - the TECHNO parts (source bars 27-34, and the final 84-91) turn the plaça to night and its 2 m tiles into a 70s disco floor, every other
//   tile lit on each beat, each lit tile its own colour, a white ring of light out of the Bou each bar, the Bou itself lit
//   as if by a spot (no light on the floor); nothing else happens meanwhile (no carretilles, no confetti);
// - its CARRETILLES (UAF videos 2021/2024: a comb of tubes along both edges of its back, jets out of both flanks, a few
//   straight up) burn on a long streak, as the Drac's: pairs one after another from the rump, two pairs at a time, and
//   one of three tubes up the middle; each tube grows in before it fires and shrinks away once burnt. Not the whole streak
//   (Marc 2026-10-24: they burnt all song long): a short burst at each milestone (30, 60, 90 in a row), and the whole
//   streak only from the carried festa (bar 72) to the end.
import { BOU_TIMING } from './bou-dance.js';

export const BOU_FX = {
  technoStart: BOU_TIMING.technoStart, technoEnd: BOU_TIMING.bars.find(b => b.sourceBar === 35).time, // song s
  // and again in the final, its fastest part (bars 84-91, 145-150 bpm; Marc 2026-10-24: the run-up 64-71 starts too slow; its techno kick went too, music revision 19),
  // after its colla sets it down, up to the last note; the carretilles and the finale's confetti keep going there (`bouHush`)
  finalStart: BOU_TIMING.bars.find(b => b.sourceBar === 84).time, finalEnd: BOU_TIMING.bars.find(b => b.sourceBar === 92).time,
  night: 0.4, // s the plaça takes to turn night (and back)
  disco: ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ff2bd6'], // Marc's «Disco 70 multicolor»
  pulse: 3, low: 0.35, // a lit tile's flash fades by e^(-pulse * beat fraction) down to `low`
  wave: 14, ring0: 3.2, bar: 4, waveW: 1.5, reach: 16, // the ring: m it runs out to in a bar of `bar` beats, from ring0 (clear of its body), its width (m²); how far the floor stays lit round the Bou (m)
  glow: 0.9, // how much of its own colour the Bou shows on its own at night (lit as by day, the floor left dark)
  pair: 1.25, pairs: 6, ups: 3, // s a pair stays the newest (each burns two of these), pairs along each edge, tubes up the middle
  grow: 0.12, // s a tube takes to grow in / shrink away
  every: 30, burst: 4, festaStart: BOU_TIMING.bars.find(b => b.sourceBar === 72).time, // a milestone each `every` in a row (the Drac's streakAt), s it burns; song s from which the whole streak burns
  grain: 1.8, dense: 1.15, // its sparks' size and emission next to the Drac's (drac-fire.js): thin by day otherwise (Marc)
};
export const bouHush = t => t >= BOU_FX.technoStart && t < BOU_FX.technoEnd; // the first disco has the plaça to itself
export const bouTechno = t => bouHush(t) || t >= BOU_FX.finalStart && t < BOU_FX.finalEnd;
// the streak's milestone (0 below the first) and, at song time t with combo in a row and the last milestone reached at
// song time `at`, do the carretilles burn (the disco and a collapse aside: bou-show.js)
export const bouMilestone = combo => Math.floor(combo / BOU_FX.every);
export const bouJetsWant = (t, combo, at) => bouMilestone(combo) > 0 && (t >= BOU_FX.festaStart || t - at < BOU_FX.burst);
// at clock c (s since the jets lit): is side pair p burning (the newest and the one before), which up tube burns
export const bouPairBurns = (c, p) => { const k = Math.floor(c / BOU_FX.pair) % BOU_FX.pairs; return p === k || p === (k + BOU_FX.pairs - 1) % BOU_FX.pairs; };
export const bouUpBurns = (c, u) => Math.floor(c / (BOU_FX.pair * BOU_FX.ups)) % BOU_FX.ups === u;
// tile (i, j) at song beat `beat`, d m from the Bou: its flash 0..1; and (in an n-wide grid) its colour's index
export function bouTileLight(i, j, beat, d) {
  const b = Math.floor(beat), f = beat - b;
  const k = (i + j) % 2 === b % 2 ? BOU_FX.low + (1 - BOU_FX.low) * Math.exp(-BOU_FX.pulse * f) : 0;
  return k * Math.max(0.15, 1 - d / BOU_FX.reach);
}
// the ring at song beat `beat`, d m from the Bou: 0..1 of white over the tile, running out through each bar and fading
export function bouTileRing(beat, d) {
  const f = (beat % BOU_FX.bar) / BOU_FX.bar;
  return Math.exp(-((d - BOU_FX.ring0 - (BOU_FX.wave - BOU_FX.ring0) * f) ** 2) / BOU_FX.waveW) * (1 - f);
}
export const bouTileColour = (i, j, n, beat) => ((i * n + j) * 7 + i * 3 + Math.floor(beat)) % BOU_FX.disco.length;
