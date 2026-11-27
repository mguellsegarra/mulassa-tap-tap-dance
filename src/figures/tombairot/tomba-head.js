// The Tombairot's long ring neck and its green plush head: a few big blocks and each moving part its own pivot, in the
// Mulassa's spirit (figures/mulassa/mulassa.js). Big googly eyes on yellow discs looking down at the children, arched
// red brows and a horn, pointed ears, a wide round snout, a smiling open mouth with white teeth and the red forked
// tongue hanging from it. Half as big again as the real head (adapted: it reads friendlier at phone size).
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import { TOMBA, TOMBA_DIM, TOMBA_NECK_LEAN } from './tomba-form.js';
import { tombaRing } from './tomba-body.js';

export const TOMBA_HEAD_TILT = .2; // rad: its snout points a little down, at the children
export const TOMBA_JAW = .16;      // rad, the mouth's rest: always open, as on the real one
export const TOMBA_EYE = [.135, .375, .36]; // an eye's centre on the head, where its pupil hangs
const TOMBA_JUT = .1; // the head's pivot ahead of the neck's top ring: the neck comes in under the back of the skull
// Eye and teeth white. Brighter than any paint: the game's light is warm (scene/stage.js LIGHT) and these faces look
// forward and a little down, where plain white (the Bou's) comes out toasted. This one lands on white there.
const TOMBA_WHITE = new THREE.Color().setRGB(1.5, 1.85, 2.5);
const tombaPart = (parent, x, y, z, vox) => { const g = new THREE.Group(); g.position.set(x, y, z); if (vox) g.add(vox.mesh()); parent.add(g); return g; };

// The neck: seven thinner rings curving forward over the bow tie, the leafy fringe down its back (wider than the yellow, so it
// shows at both sides from the front) and two red spikes down the nape. A plain block under its pivot (inside the
// body's top) and another over its top (inside the skull) keep both joints closed as it sways.
function tombaNeck() {
  const v = new Vox(), r = TOMBA_DIM.neckR, h = TOMBA_DIM.neckRing, n = TOMBA_NECK_LEAN.length;
  v.box(0, -.1, 0, .22, .1, .22, TOMBA.yellow, 0).box(0, n * h, TOMBA_NECK_LEAN[n - 1] + TOMBA_JUT - .04, .22, .1, .22, TOMBA.yellow, 0);
  TOMBA_NECK_LEAN.forEach((z, i) => {
    const g = i % 2 ? .02 : 0;
    tombaRing(v, i * h, h, r, z);
    v.box(0, i * h + .015, z - .16 - g / 2, .36 + 2 * g, h, .12 + g, TOMBA.fringe[i % 2]);
    if (g && i > 1) v.box(0, i * h + .03, z - .27, .08, .09, .1, TOMBA.red); // (the lowest would meet the spine's first pompom)
  });
  // The red bow tie on the lowest ring: a knot and two stepped wings, wide and 4 cm proud of the yellow.
  v.box(0, -.01, .165, .1, .11, .08, TOMBA.red, 0);
  for (const s of [-1, 1]) v.box(s * .095, -.025, .16, .09, .14, .05, TOMBA.red).box(s * .185, -.055, .16, .09, .2, .05, TOMBA.red);
  return v;
}

// The skull and a wide round snout ahead of it, every corner in steps: a core, two narrower steps over it up to the
// nostrils, cheeks a step wider and two steps in to a small flat nose. The eyes stand over the snout, half above the skull, each a stepped yellow disc with
// a white one on it and a plush bump behind.
function tombaSkull() {
  const v = new Vox(), G = TOMBA.plush, W = TOMBA_WHITE;
  v.box(0, -.08, .02, .5, .4, .48, G).box(0, -.02, .03, .56, .24, .36, G).box(0, .32, 0, .36, .05, .34, G);
  v.box(0, -.06, .43, .42, .22, .34, G).box(0, .16, .43, .34, .07, .3, G).box(0, .23, .43, .22, .04, .22, G).box(0, -.02, .44, .5, .14, .24, G);
  v.box(0, -.03, .63, .32, .18, .08, G).box(0, 0, .69, .2, .11, .06, G);
  v.box(0, -.075, .42, .36, .015, .33, TOMBA.mouth, 0); // palate, 1.5 cm under the snout
  for (const s of [-1, 1]) {
    v.box(s * .06, .26, .47, .08, .03, .08, G).box(s * .06, .29, .48, .04, .012, .04, TOMBA.plushDark, 0); // nostril
    // teeth: a fang at the front and two down the side, 1 cm inside the snout's edge
    v.box(s * .1, -.15, .565, .06, .09, .05, W, 0).box(s * .175, -.13, .5, .05, .07, .07, W, 0).box(s * .175, -.12, .36, .05, .06, .07, W, 0);
    // eye: the yellow disc on the skull's front (a step wider than it: frog eyes), the white 3 cm proud, the bump behind
    v.box(s * .135, .27, .29, .25, .21, .08, TOMBA.mask, 0).box(s * .135, .24, .29, .19, .27, .08, TOMBA.mask, 0);
    v.box(s * .135, .3, .34, .19, .15, .04, W, 0).box(s * .135, .28, .34, .13, .19, .04, W, 0);
    v.box(s * .135, .32, .2, .22, .15, .12, G);
    // brow: three red tufts in an arch over the eye (raised in the middle: surprised, not angry)
    // (one flat red: they lap each other)
    v.box(s * .065, .49, .27, .09, .06, .08, TOMBA.red, 0).box(s * .135, .51, .27, .1, .07, .08, TOMBA.red, 0).box(s * .205, .47, .27, .09, .06, .08, TOMBA.red, 0);
  }
  // horn: three steps leaning back
  v.box(0, .35, .03, .1, .14, .1, TOMBA.horn).box(0, .47, 0, .07, .1, .07, TOMBA.horn).box(0, .55, -.025, .045, .07, .045, TOMBA.horn);
  return v;
}

// Parts: neck (pivot at the body's top) > head (pivot at the neck's top) > jaw > tongue; ears and pupils on the head.
export function buildTombaHead(scale = 1) {
  const neck = new THREE.Group(); neck.add(tombaNeck().mesh());
  const head = tombaPart(neck, 0, TOMBA_NECK_LEAN.length * TOMBA_DIM.neckRing, TOMBA_NECK_LEAN.at(-1) + TOMBA_JUT, tombaSkull());
  head.name = 'head'; // (the showreel's close-ups find their part by name: game/showreel.js SHOT_KINDS)
  head.scale.setScalar(scale); head.rotation.x = TOMBA_HEAD_TILT;
  // The jaw hinges under the back of the skull, a block of it 4 cm up inside: nothing behind the hinge to rise through
  // the skull (the Bou's «Bonàs»). A green lip round its red floor, a step in at its front like the snout's, a small
  // tooth at both front corners and the tongue's root lying on it out to the lip.
  const jaw = tombaPart(head, 0, -.08, -.02, new Vox().box(0, -.12, .32, .4, .12, .6, TOMBA.plush).box(0, -.16, .3, .3, .04, .44, TOMBA.plush)
    .box(0, -.06, .08, .36, .1, .16, TOMBA.plush).box(0, -.1, .63, .3, .09, .06, TOMBA.plush).box(0, -.004, .33, .34, .014, .54, TOMBA.mouth, 0)
    .box(0, .005, .5, .12, .02, .34, TOMBA.tongue, 0)
    .box(-.17, 0, .585, .04, .05, .05, TOMBA_WHITE, 0).box(.17, 0, .585, .04, .05, .05, TOMBA_WHITE, 0));
  jaw.rotation.x = TOMBA_JAW;
  // The tongue hangs from the lip: a loose strip of felt, forked at its tip (its top 2 cm over its root's end: joined).
  const t = new Vox().box(0, -.19, .02, .12, .21, .04, TOMBA.tongue, 0);
  for (const s of [-1, 1]) t.box(s * .04, -.27, .02, .05, .09, .035, TOMBA.tongue, 0).box(s * .055, -.33, .02, .035, .07, .03, TOMBA.tongue, 0);
  const tongue = tombaPart(jaw, 0, .02, .645, t);
  tongue.rotation.x = -(TOMBA_HEAD_TILT + TOMBA_JAW) - .1; // plumb, a touch forward (poseTombairot keeps it so)
  // Ears: three steps out from the skull's side, short and thick, their mauve inside facing front.
  const ears = [-1, 1].map(s => {
    const e = tombaPart(head, s * .25, .2, -.06, new Vox().box(s * .05, -.07, 0, .16, .14, .14, TOMBA.plush).box(s * .18, -.045, 0, .12, .1, .11, TOMBA.plush)
      .box(s * .27, -.03, 0, .09, .065, .08, TOMBA.plush).box(s * .11, -.035, .061, .16, .07, .042, TOMBA.ear, 0));
    e.rotation.set(0, s * .2, s * .12);
    return e;
  });
  // Pupils: their own pivots at each eye's centre, so the dance can roll them (googly). 5 mm into the white.
  const pupils = [-1, 1].map(s => tombaPart(head, s * TOMBA_EYE[0], TOMBA_EYE[1], TOMBA_EYE[2], new Vox().box(0, -.0425, .0075, .085, .085, .025, TOMBA.black, 0)));
  return { neck, head, jaw, tongue, ears, pupils };
}
