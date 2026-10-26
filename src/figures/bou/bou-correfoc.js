// The Bou's festa rules, no drawing (figures/bou/bou-show.js draws them):
// - the TECHNO parts (source bars 27-34, and the final 84-91) turn the plaça to night and its 2 m tiles into a 70s disco floor, every other
//   tile lit on each beat, each lit tile its own colour, a white ring of light out of the Bou each bar, the Bou itself lit
//   as if by a spot (no light on the floor); nothing else happens meanwhile (no carretilles, no confetti);
// - its CARRETILLES (UAF videos 2021/2024: a comb of tubes along both edges of its back, jets out of both flanks, a few
//   straight up) burn in short bursts wherever another figure throws confetti (a combo praise, a GLOBUS pop, the
//   finale's beats; no banknotes during the dance, a streak lights nothing for now): pairs one after
//   another from the rump, two pairs at a time, and one of three tubes up the middle; each tube grows in before it
//   fires and shrinks away once burnt;
// - its BANKNOTES («BANC DEL BOU · UN BON SOU · REMOV LA TERRA», public/textures/bitllet-bou.png) only at the end: a
//   downpour when the song ends that carpets the floor round it, stirred by the wind, one note landing face up where
//   the camera comes down to it (figures/bou/bou-bills.js lays them, bou-end-shot.js films it).
import { BOU_TIMING, BOU_CARRY } from './bou-dance.js';

export const BOU_FX = {
  technoStart: BOU_TIMING.technoStart, technoEnd: BOU_TIMING.bars.find(b => b.sourceBar === 35).time, // song s
  // and again in the final, its fastest part (bars 84-91, 145-150 bpm; the run-up 64-71 starts too slow; its techno kick went too, music revision 19),
  // after its colla sets it down, up to the last note; the carretilles and the finale's confetti keep going there (`bouHush`)
  finalStart: BOU_TIMING.bars.find(b => b.sourceBar === 84).time, finalEnd: BOU_TIMING.bars.find(b => b.sourceBar === 92).time,
  night: 0.4, // s the plaça takes to turn night (and back)
  disco: ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ff2bd6'], // The owner\'s «Disco 70 multicolor»
  pulse: 3, low: 0.35, // a lit tile's flash fades by e^(-pulse * beat fraction) down to `low`
  wave: 14, ring0: 3.2, bar: 4, waveW: 1.5, reach: 16, // the ring: m it runs out to in a bar of `bar` beats, from ring0 (clear of its body), its width (m²); how far the floor stays lit round the Bou (m)
  glow: 0.9, // how much of its own colour the Bou shows on its own at night (lit as by day, the floor left dark)
  pair: 1.25, pairs: 6, ups: 3, // s a pair stays the newest (each burns two of these), pairs along each edge, tubes up the middle
  grow: 0.12, // s a tube takes to grow in / shrink away
  burst: 3, festaStart: BOU_TIMING.bars.find(b => b.sourceBar === 72).time, // s a burst burns; song s its colla lifts it
  // song s: carried round, its carretilles burn all the way; stopped, set down and its colla gone, none
  // (on fire while it is carried; no sparks as it is moved and set down)
  carryEnd: BOU_TIMING.subdivisionTimes[Math.round(BOU_CARRY.lower * BOU_TIMING.subdivision)],
  quietEnd: BOU_TIMING.subdivisionTimes[Math.round(BOU_CARRY.back * BOU_TIMING.subdivision)],
  grain: 1.8, dense: 1.15, // its sparks' size and emission next to the Drac's (common/fire.js): thin by day otherwise
};
export const bouHush = t => t >= BOU_FX.technoStart && t < BOU_FX.technoEnd; // the first disco has the plaça to itself
export const bouTechno = t => bouHush(t) || t >= BOU_FX.finalStart && t < BOU_FX.finalEnd;
// at song time t, with the last confetti moment at song time `at`: do the carretilles burn (the disco and a collapse aside:
// bou-show.js): all the way round while carried; a burst after each confetti moment, except while it is set down
export const bouJetsWant = (t, at) => t >= BOU_FX.festaStart && t < BOU_FX.carryEnd || !(t >= BOU_FX.carryEnd && t < BOU_FX.quietEnd) && t >= at && t - at < BOU_FX.burst;
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

// The end's banknotes: they rain from the sky through the final bombo (song.finale to the end) and
// carpet the plaça. hero: m from the Bou towards the camera where the filmed note lands (up to `far` m so the Bou's last
// steps stay `clear` m off); spread: m round the hero the rain covers (in front of the Bou: where the play camera sees it); `near` of them land in a mound of `heap` m round the
// hero, the later on top and nearer its middle; they start `high` m up and come down at `drop` m/s on average, `early` of
// them already on their way down when the bombo starts (the sky is full at once). Lying
// notes sit on `layers` (the mound) or `wideLayers` (the rest) heights `step` apart: overlapping papers never share a
// plane, and their wind ripple (`ripple` m on the note, x `scale`, bou-bills.js) stays under the step. `scale`: the notes
// are drawn twice life size, a 28 cm note (at the play camera's 11 m a real one is a 10 px speck: no rain of money).
export const BOU_BILLS = { hero: 3, clear: 2.3, far: 5.5, spread: 6.5, near: 0.3, heap: 1.3, high: [4, 10], drop: [1.05, 1.6], early: 0.18, step: 0.005, layers: 14, wideLayers: 5, ripple: 0.0005, scale: 2, heroHigh: 4.2, wind: 0.18, tumble: 0.3 };
const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }; // 0..1, the same every time
// where the hero note lands: `hero` m from the Bou (bx, bz) towards the camera (cx, cz)
export function bouHeroSpot(bx, bz, cx, cz, out) {
  const dx = cx - bx, dz = cz - bz, d = Math.hypot(dx, dz) || 1;
  out.x = bx + dx / d * BOU_BILLS.hero; out.z = bz + dz / d * BOU_BILLS.hero;
  return out;
}
// note i of n (n - 1: the hero, last and on top) for a rain of `dur` s: where it lands, when it starts falling (s after
// the rain starts), from how high, how fast, its heading, and whether it tumbles end over end instead of fluttering
export function bouBillPlan(i, n, hx, hz, bx, bz, dur, out) {
  const B = BOU_BILLS, a = 2 * Math.PI * hash(i, 1), h2 = hash(i, 2);
  out.yaw = 2 * Math.PI * hash(i, 6); out.tumble = hash(i, 7) < B.tumble; out.ph = 2 * Math.PI * hash(i, 8);
  if (i === n - 1) { // the hero: last, from lower, a calm flutter, onto the top of the mound
    Object.assign(out, { x: hx, z: hz, delay: Math.max(0, dur - 0.4), high: B.heroHigh, drop: 1.25, tumble: false, y: 0.006 + B.step * (B.layers + 1) });
    return out;
  }
  if (i < n * B.near) { // the mound: its layer by landing order, the higher ones nearer the middle
    const L = i % B.layers, f = (L + hash(i, 3)) / B.layers, r = B.heap * Math.sqrt(h2) * (1 - 0.55 * L / B.layers);
    Object.assign(out, { x: hx + Math.cos(a) * r, z: hz + Math.sin(a) * r, delay: dur * 0.85 * f, high: 6, drop: 1.6 + 0.1 * hash(i, 5), y: 0.006 + B.step * L }); // (lower and quicker: it lies under the hero by the time the camera is down)
    return out;
  }
  const r = B.spread * Math.sqrt(h2), early = hash(i, 9) < B.early, high = B.high[0] + hash(i, 4) * (B.high[1] - B.high[0]); // the rest round the hero, heavier as the bombo goes on
  Object.assign(out, { x: hx + Math.cos(a) * r, z: hz + Math.sin(a) * r, delay: early ? 0 : dur * Math.pow(hash(i, 3), 0.7), high: early ? 0.8 + hash(i, 10) * (high - 0.8) : high,
    drop: B.drop[0] + hash(i, 5) * (B.drop[1] - B.drop[0]), y: 0.006 + B.step * (i % B.wideLayers + 0.5) }); // (half a step off the mound's: one landing on it never shares its plane)
  return out;
}
// A falling paper (Cornell's flutter: it swings like a pendulum, fastest through the middle of the swing, nearly hanging
// at its ends, tilted into its motion; or it tumbles end over end, drifting sideways): its descent speed (m/s) at phase p
export const bouFlutterDrop = (drop, p) => drop * (1 + 0.8 * Math.cos(2 * p));
// the wind at time t: strength 0..1 (gusts) and its heading (rad), turning slowly
export const bouWind = t => 0.55 + 0.45 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1);
export const bouWindDir = t => 0.6 + 0.4 * Math.sin(t * 0.05);
