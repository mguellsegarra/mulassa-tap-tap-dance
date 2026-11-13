// The Bou's music video on the plaça: «Mira el ball» films its dance with these cameras (figures/common/clip-camera.js, the
// shots' fields and the rules every film keeps; bou-scene.js filmShot; edited with tools/dev/bou-clip.html; after the Mulassa's
// clip, tools/videoclip/shots.js on tool/videoclip-mulassa). `rel` shots turn round the heading it had when the shot began,
// the others are seen from the play camera's side of the plaça.
import { bouPose, newBouPose, BOU_TIMING } from './bou-dance.js';
import { createClip } from '../common/clip-camera.js';

export const BOU_CLIP_SHOTS = {
  // (the owner's rounds: arran de terra and with a wide lens the Bou read badly and the lens saw in under its skirt; in
  // profile its face was lost. So: long lenses (fov 30-38) from above the crowd's heads, always on its face's side)
  vast: { az: [-.1, .1], el: [.6, .55], size: [15, 13], y: 1, fov: 38, still: 1 },
  balcony: { az: [-.9, -.9], el: [.38, .38], size: [11, 11], y: 1.4, fov: 35, still: 1 },
  wide: { az: [-.2, -.12], el: [.42, .42], size: [8, 7.5], y: 1.1, fov: 34 },
  crane: { az: [.3, .45], el: [.36, .6], size: [6.5, 8.5], y: 1.2, fov: 34 },
  orbit: { az: [-.5, .1], el: [.42, .44], size: [6.8, 6.8], y: 1.1, fov: 34 },
  front: { az: [.35, .3], el: [.4, .4], size: [5.6, 5.2], y: 1.1, fov: 32, rel: 1 },
  charge: { az: [.3, .3], el: [.38, .38], size: [7, 7], y: 1.1, fov: 34, rel: 1, fixed: 1, lag: 3.5 }, // (lag: it hardly pans, the rush comes at it inside the frame)
  feet: { az: [.7, .65], el: [.2, .2], size: [4.3, 4.1], y: .95, fov: 30, rel: 1, lag: .6, ahead: .8, // (its shoes with its face over them: the shoes alone, its face cut off, read as a mistake; ahead: the front carrier's leg is the one that swings)
    portrait: { az: [.22, .18], el: [.38, .38], size: [2.8, 2.7], y: .9, ahead: .5 } }, // (a phone's tall frame: from nearly head on, its face stacked over its shoes; from the side its face fell off the narrow frame)
  // (its head's middle is 2 m ahead of its own and 1.5 m up, horns 3.1 m across: aimed nearer, its face sat cut off at the frame's edge)
  head: { az: [.4, .35], el: [.3, .3], size: [2.4, 2.3], y: 1.5, fov: 30, rel: 1, ahead: 2, lag: .6, portrait: { size: [2.8, 2.7] } },
  eyes: { az: [.3, .28], el: [.22, .22], size: [1.7, 1.6], y: 1.6, fov: 24, rel: 1, ahead: 2, lag: .6, portrait: { size: [1.5, 1.4] } },
};
// [song beat, shot, fit?] (what each answers, in Catalan for the owner: tools/dev/bou-clip.html). fit: { tall, wide }, the shot's
// size (and, where the plaça stops the lens, its widest, up to 75°) times this on a portrait / landscape frame, where the whole-film measure at 9 screen sizes found the Bou or who
// comes to touch it cut off (2026-11-10, the owner: «el bou surt molt tallat o no es veu l'ajudant que el va a tocar»). The feet only on the opening's leg passes (bars 1-2 and 5-6). The list ends on the
// last chord (BOU_CLIP_END): from there the game's own end shot comes down to the banknotes.
export const BOU_CLIP_CUTS = [
  [0, 'vast'],
  [8, 'feet'],
  [16, 'wide'],
  [24, 'feet'],
  [32, 'front', { tall: 1.25 }],
  [40, 'crane'],
  [56, 'vast'],
  [72, 'front', { wide: 1.3 }],
  [88, 'wide'],
  [100, 'head'],
  [108, 'charge', { tall: 1.7, wide: 1.15 }],
  [116, 'vast'], // (both sideways rushes, 4.2 m each way, in one still shot: any camera that went with them slid the plaça)
  [132, 'balcony'], // (the diagonal rush: still too, from the other side)
  [140, 'crane', { tall: 2 }],
  [156, 'orbit'],
  [172, 'front'], // (the charge and the wide shot that followed filmed the run of bars 43-47, out since music revision 21)
  [180, 'eyes'],
  [188, 'wide'],
  [204, 'crane'],
  [216, 'vast'],
  [236, 'balcony'],
  [260, 'front', { tall: 1.8, wide: 1.3 }],
  [268, 'orbit'],
  [284, 'crane'],
];
export const BOU_CLIP_END = 300;
export const bouClipSec = b => { const T = BOU_TIMING.beats, i = Math.min(T.length - 2, Math.max(0, Math.floor(b))); return T[i] + (T[i + 1] - T[i]) * (b - i); };
const clipPose = newBouPose();
// its middle in its dance frame; lift: only what its colla carries it up (its bounce left out)
function bouClipRoot(t, out) { bouPose(t, clipPose); out.x = clipPose.x; out.z = clipPose.z; out.lift = Math.max(0, clipPose.lift - .25); out.yaw = clipPose.yaw; return out; }
// (the play camera looks in between its W and S); inside its colla's marks (5.5 m) and the crowd's ring, so nobody stands
// at the lens; inside the façades
const BOU_CLIP = createClip({ shots: BOU_CLIP_SHOTS, cuts: BOU_CLIP_CUTS, end: BOU_CLIP_END, tallKinds: ['wide', 'crane', 'orbit', 'front'], secAt: bouClipSec, root: bouClipRoot, side: Math.PI / 4, clear: 4.8, reach: 12 });
export const BOU_CLIP_IDLE_CUTS = BOU_CLIP.idleCuts, bouClipCut = BOU_CLIP.cutAt;
// Places `camera` (the game's own) for song beat `beat`. frameYaw: the dance frame's turn on the plaça (bou.frame.rotation.y);
// filmed: s since the film began (Infinity: no opening creep, the idle selector); idle: the idle selector's calm cut.
export const placeBouClip = BOU_CLIP.place;
