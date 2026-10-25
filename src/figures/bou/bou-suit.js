// The Bou Tradicional's colla's dress over the shared colla bodies (scene/models/colla.js): its palette, the sunglasses
// against the sparks (collaHead draws them) and the five looks.
import { SKIN } from '../../scene/models/people.js';

// The Bou Tradicional's colla (Ardit's recordings 2021-2026, the 2026 Santa Úrsula cercavila closest; UAF photos): correfoc
// wear, the Bou being a fire beast. A garnet hooded jacket worn long as a tunic, buttoned, with «BOU TRADICIONAL DE VALLS»
// down the front and a cartoon bull's face on the back; hoods up on some (at the correfoc), black sunglasses
// against the sparks on all four (they are in focus in the showreel and the dance); black trousers with a pale mark on the thigh, dark shoes. W, N, S, E, then the capatàs, a fifth
// standing near the dance, not on a mark (figures/bou/bou-colla.js BOU_CAPATAS): an older
// man, short and stout, grey hair, a black fire hat with the badge and the long wooden staff with a crook and the esquella
// (a bronze cowbell) hung from it.
// Colours are approximations under the game's light.
export const BOU = { lens: '#0f1013', frame: '#060607', glint: '#aab2c4', black: '#121114', pale: '#ece2cf', white: '#f6f2ea', wood: '#7a5230', bell: '#8a6a3a', bellRim: '#5e4626' };
// Black sunglasses on collaHead's face (front z 0.16, eyes y 0.17-0.22 at x ±0.08), the frame a little proud of the
// lenses so no two faces share a plane; arms back to the ears over the head's sides (±0.17). Three styles; the frame's colour per look, the lenses always black.
export const SHADES = {
  wayfarer(v, frame) { // thick black acetate, lenses wider at the top, a heavy brow
    for (const s of [1, -1]) {
      const x = s * 0.078;
      v.box(x, 0.18, 0.172, 0.11, 0.04, 0.01, BOU.lens, 0).box(x, 0.157, 0.172, 0.094, 0.023, 0.01, BOU.lens, 0);
      v.box(x, 0.147, 0.173, 0.096, 0.012, 0.014, frame, 0).box(s * 0.139, 0.155, 0.173, 0.016, 0.065, 0.014, frame, 0);
      v.box(s * 0.16, 0.2, 0.166, 0.03, 0.03, 0.016, frame, 0).box(s * 0.177, 0.205, 0.06, 0.014, 0.022, 0.22, frame, 0);
      v.plate(x + s * 0.028, 0.199, 0.179, 0.024, 0.012, 0, 1, BOU.glint).plate(x + s * 0.012, 0.188, 0.179, 0.01, 0.006, 0, 1, BOU.glint);
    }
    v.box(0, 0.215, 0.174, 0.296, 0.03, 0.016, frame, 0).box(0, 0.19, 0.174, 0.05, 0.016, 0.012, frame, 0);
  },
  aviator(v, frame) { // thin black metal, teardrop lenses, a double bridge
    for (const s of [1, -1]) {
      const x = s * 0.078;
      v.box(x, 0.193, 0.172, 0.112, 0.027, 0.008, BOU.lens, 0).box(x - s * 0.004, 0.168, 0.172, 0.104, 0.025, 0.008, BOU.lens, 0)
        .box(x - s * 0.01, 0.148, 0.172, 0.078, 0.02, 0.008, BOU.lens, 0);
      v.box(s * 0.137, 0.162, 0.174, 0.008, 0.058, 0.01, frame, 0).box(x - s * 0.01, 0.141, 0.174, 0.08, 0.007, 0.01, frame, 0);
      v.box(s * 0.16, 0.208, 0.168, 0.04, 0.012, 0.012, frame, 0).box(s * 0.177, 0.206, 0.06, 0.01, 0.012, 0.22, frame, 0);
      v.plate(x + s * 0.03, 0.196, 0.178, 0.022, 0.016, 0, 1, BOU.glint).plate(x - s * 0.022, 0.155, 0.178, 0.014, 0.008, 0, 1, BOU.glint);
    }
    v.box(0, 0.22, 0.174, 0.29, 0.009, 0.012, frame, 0).box(0, 0.2, 0.174, 0.05, 0.008, 0.01, frame, 0);
  },
  sport(v, frame) { // one wraparound black visor round to the temples, a thin brow, thick arms
    v.box(0, 0.19, 0.172, 0.352, 0.032, 0.012, BOU.lens, 0); // edge to edge: no skin between the lenses and the temples
    for (const s of [1, -1]) {
      v.box(s * 0.097, 0.152, 0.172, 0.158, 0.038, 0.012, BOU.lens, 0).box(s * 0.168, 0.152, 0.13, 0.016, 0.07, 0.08, frame, 0);
      v.box(s * 0.178, 0.192, 0.03, 0.014, 0.03, 0.2, frame, 0).box(s * 0.097, 0.145, 0.173, 0.158, 0.009, 0.016, frame, 0); // and a rim under each lens
      v.plate(s * 0.07, 0.207, 0.18, 0.11, 0.007, 0, 1, BOU.glint).plate(s * 0.1775, 0.19, 0.12, 0.04, 0.008, s, 0, BOU.glint);
    }
    v.box(0, 0.218, 0.173, 0.356, 0.022, 0.018, frame, 0);
  },
};
export const BOU_SUIT = { stride: true, legs: '#17161a', dye: false, sole: '#3a3434', upper: '#121114', lace: null, shade: '#3c1838', tunic: true, rolled: false };
// the colla's plum tunics, a few shades apart and bluer than the photo: the plaza's warm light reddens them
export const BOU_HELPER_LOOKS = [
  { ...BOU_SUIT, top: '#6a2f6a', hood: 'up', shades: 'sport' },
  { ...BOU_SUIT, top: '#70336f', shades: 'sport', frame: '#2f9e4f' },
  { ...BOU_SUIT, top: '#743a72', hood: 'up', shades: 'sport', frame: '#f2c230' },
  { ...BOU_SUIT, top: '#683066', shades: 'sport', frame: '#f2efe8', bald: true, beard: '#2b2624', trunk: [1.07, 0.02], belly: true }, // bald, bearded, 2 cm shorter, a belly
  { ...BOU_SUIT, top: '#6e3470', build: [1.2, 0.84], belly: true, hair: '#c9c4bd', moustache: true, skin: SKIN[1], hat: true, staff: true }, // the capatàs
];
