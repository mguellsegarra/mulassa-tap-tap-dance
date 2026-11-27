// The Tombairot's neck and its green plush head: a few big blocks and each moving part its own pivot, in the Mulassa's
// spirit (figures/mulassa/mulassa.js). Googly eyes on a yellow mask, red flame brows and a horn, pointed ears, a wide
// snout, white teeth and the red forked tongue hanging from the open mouth.
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import { TOMBA_V1 as K, TOMBA_V1_DIM as D } from './tomba-form.js';
import { tombaV1Ring } from './tomba-body.js';

export const TOMBA_V1_HEAD_TILT = .22;// rad: its snout points a little down, at the children
export const TOMBA_V1_JAW = .12;      // rad, the mouth's rest: always open, as on the real one
const tombaV1Part = (parent, x, y, z, vox) => { const g = new THREE.Group(); g.position.set(x, y, z); if (vox) g.add(vox.mesh()); parent.add(g); return g; };

// The neck: thinner rings, yellow round its front half; the fringe runs down both sides' back and the nape. One ring below its pivot
// (inside the body's top) and one above its top (inside the skull) keep both joints closed as it sways.
function tombaV1Neck() {
  const v = new Vox(), n = D.neckRings, r = D.neckR;
  for (let i = -1; i <= n; i++) {
    const y = i * D.ring, g = i % 2 ? .015 : 0, hidden = i < 0 || i === n;
    tombaV1Ring(v, y, hidden ? r - .012 : r);
    if (i < 0) continue;
    for (const s of [-1, 1]) v.box(s * .115, y - g, -.055, .09 + 2 * g, D.ring + 2 * g, .17 + 2 * g, K.fringe[i & 1]);
    v.box(0, y - .015 + g, -.11, .27 - 2 * g, D.ring + .03 - 2 * g, .13 - 2 * g, K.fringe[(i + 1) & 1]); // (the other way round: no plane shared with the sides')
  }
  // red bow tie on the lowest ring
  v.box(0, .02, .145, .06, .07, .06, K.red, 0);
  for (const s of [-1, 1]) v.box(s * .065, .015, .145, .07, .08, .04, K.red).box(s * .125, 0, .145, .06, .11, .04, K.red);
  // red spikes down the nape, each a step
  for (let j = 0; j < 3; j++) v.box(0, .05 + j * .16, -.2, .07, .12, .1, K.red).box(0, .1 + j * .16, -.27, .05, .06, .06, K.red);
  return v;
}

// A low skull and a round snout: the eyes stand on top of it, on their yellow mask, as on the real one.
function tombaV1Skull() {
  const v = new Vox(), G = K.plush;
  v.box(0, -.02, .05, .4, .3, .34, G).box(0, .03, .05, .45, .2, .26, G).box(0, .28, .05, .3, .03, .24, G).box(0, .03, -.14, .32, .2, .04, G);
  // the snout: wide and round-nosed, a nostril bump on each side of its tip
  v.box(0, -.02, .35, .38, .26, .26, G).box(0, .01, .355, .43, .19, .19, G).box(0, 0, .505, .3, .2, .05, G);
  v.box(0, -.032, .24, .34, .012, .48, K.mouth, 0); // palate, 1.2 cm under the skull and the snout
  for (const s of [-1, 1]) {
    v.box(s * .09, .24, .415, .11, .035, .11, G).box(s * .09, .262, .43, .05, .025, .05, K.plushDark, 0);
    v.box(s * .08, -.085, .445, .04, .075, .04, K.white, 0);                                               // fangs
    v.box(s * .165, -.075, .39, .04, .065, .045, K.white, 0).box(s * .165, -.065, .29, .04, .055, .045, K.white, 0);
    // eye: a stepped white disc, 2 cm proud of the mask
    v.box(s * .095, .27, .242, .17, .1, .03, K.white, 0).box(s * .095, .25, .242, .11, .14, .03, K.white, 0);
    // brow: three red tufts over the eye, sweeping up and out like a flame
    v.box(s * .06, .41, .22, .1, .06, .08, K.red).box(s * .13, .44, .2, .09, .055, .07, K.red).box(s * .19, .47, .19, .06, .06, .06, K.red);
  }
  // the yellow mask both eyes sit on: a plate on the skull's front over the snout, and behind its top a plush ridge
  v.box(0, .24, .227, .4, .18, .02, K.mask, 0).box(0, .28, .155, .39, .14, .125, G);
  // horn: four steps leaning back
  v.box(0, .3, 0, .09, .1, .09, K.horn).box(0, .38, -.03, .07, .09, .07, K.horn).box(0, .45, -.065, .05, .08, .05, K.horn).box(0, .51, -.095, .035, .05, .035, K.horn);
  return v;
}

// Parts: neck (pivot at the body's top) > head (pivot at the neck's top) > jaw > tongue; ears and pupils on the head.
export function buildTombaV1Head(scale = 1) {
  const neck = new THREE.Group(); neck.add(tombaV1Neck().mesh());
  const head = tombaV1Part(neck, 0, D.neckRings * D.ring, .02, tombaV1Skull());
  head.name = 'head'; // (the showreel's close-ups find their part by name: game/showreel.js SHOT_KINDS)
  head.scale.setScalar(scale); head.rotation.x = TOMBA_V1_HEAD_TILT;
  // The jaw hinges at its top back corner, under the back of the skull: nothing of it is behind the hinge to rise into
  // the skull (the Bou's «Bonàs»). Red floor 1.2 cm proud, the tongue's root lying on it out to the lip.
  const jaw = tombaV1Part(head, 0, -.03, .02, new Vox().box(0, -.085, .225, .34, .085, .45, K.plush).box(0, -.12, .21, .26, .04, .32, K.plush)
    .box(0, -.002, .235, .29, .014, .4, K.mouth, 0).box(0, .008, .35, .1, .016, .22, K.tongue, 0));
  jaw.rotation.x = TOMBA_V1_JAW;
  // The tongue hangs from the lip: a loose strip of felt, forked at its tip (its top 1.5 cm over the hinge: joined).
  const t = new Vox().box(0, -.09, 0, .09, .105, .03, K.tongue, 0).box(0, -.13, 0, .12, .04, .03, K.tongue, 0);
  for (const s of [-1, 1]) t.box(s * .045, -.19, 0, .05, .06, .028, K.tongue, 0).box(s * .06, -.225, 0, .03, .035, .026, K.tongue, 0);
  const tongue = tombaV1Part(jaw, 0, .012, .445, t);
  tongue.rotation.x = -(TOMBA_V1_HEAD_TILT + TOMBA_V1_JAW) - .1; // plumb, a touch forward (poseTombairotV1 keeps it so)
  const ears = [-1, 1].map(s => {
    const e = tombaV1Part(head, s * .21, .2, -.03, new Vox().box(s * .05, -.06, 0, .14, .12, .13, K.plush).box(s * .16, -.045, 0, .1, .085, .1, K.plush)
      .box(s * .235, -.03, 0, .07, .055, .065, K.plush).box(s * .1, -.035, .069, .13, .07, .016, K.ear, 0));
    e.rotation.set(0, s * .2, s * .05);
    return e;
  });
  // Pupils: their own pivots at each eye's centre, so the dance can roll them (googly).
  const pupils = [-1, 1].map(s => tombaV1Part(head, s * .088, .32, .257, new Vox().box(0, -.04, .008, .08, .08, .016, K.black, 0)));
  return { neck, head, jaw, tongue, ears, pupils };
}
