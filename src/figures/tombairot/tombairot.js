// El Tombairot, the school dragon of the Escola Mare de Déu de la Candela (Valls): a tall pointed beehive of yellow foam
// rings up to a long ring neck and a green plush head, a long body of felt scales behind it with red pompoms down its
// spine, a tail that curls from the rump down to the ground, and a gold skirt in folds all round. Sources and measures:
// research/bestiari/tombairot/README.md. The 2019 look (no daisies, no medallion).
//
// API: buildTombairot() -> { root, body, rings, shell, skirt, tail[3], neck, head, jaw, tongue, ears[2], pupils[2],
// feet[4], pose }. poseTombairot(rig, t, p) sets the idle pose of second t, and rig.pose(t, p) is the same call bound to
// its rig. Same t, same pose, whatever was posed before.
// Parts: root > body (pivot on the ground: sway, bob) > rings, shell and skirt (meshes), tail[0] (hinged on the rump's
// top) > tail[1] > tail[2], neck (pivot at the body's top) > head > jaw > tongue, and ears and pupils on the head. The
// carriers' feet stand on the ground in the root's frame, not on the body.
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import { TAU } from '../../core/math.js';
import { TOMBA, TOMBA_NECK_Y } from './tomba-form.js';
import { buildTombaBody } from './tomba-body.js';
import { buildTombaHead, TOMBA_HEAD_TILT, TOMBA_JAW, TOMBA_EYE } from './tomba-head.js';

// head: its head's scale over the modelled one, itself a quarter over the measured head (0.85 = the real size).
export function buildTombairot({ head = 1.18 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(), parts = buildTombaBody();
  root.add(body); body.add(parts.rings, parts.shell, parts.skirt);
  // The tail's pieces, each a group at its hinge inside the one above.
  const tail = []; let up = body, uy = 0, uz = 0;
  for (const { mesh, y, z } of parts.tail) {
    const g = new THREE.Group(); g.position.set(0, y - uy, z - uz); g.add(mesh); up.add(g); tail.push(g);
    up = g; uy = y; uz = z;
  }
  const top = buildTombaHead(head);
  top.neck.position.y = TOMBA_NECK_Y; body.add(top.neck);
  // Its carriers: one at the window (a child's eye height) and, inferred from its length, another under the back.
  // Sneakers and jeans under the skirt, standing on the ground. At rest the hem all but hides them, as in every photo;
  // they show when it hops. feet: the front pair, then the rear one.
  const feet = [[-1, .1], [1, .1], [-1, -1.6], [1, -1.6]].map(([s, z]) => {
    const g = new THREE.Group(); g.position.set(s * .13, 0, z);
    g.add(new Vox().box(0, 0, 0, .1, .03, .25, TOMBA.sole, 0).box(0, .03, -.01, .095, .06, .22, TOMBA.shoe).box(0, .08, -.05, .11, .42, .13, TOMBA.jeans).mesh());
    root.add(g); return g;
  });
  const rig = { root, body, rings: parts.rings, shell: parts.shell, skirt: parts.skirt, tail, ...top, feet };
  rig.pose = (t, p) => poseTombairot(rig, t, p);
  return rig;
}

// The idle pose at second t: the whole figure sways from the ground (its head moves with the structure, as carried), bobs
// twice a sway, and the loose parts follow late: the neck, the nodding head, the ears, the tongue and the tail, each of
// its pieces later and wider than the one above. p.amp scales it all (0 = at rest), p.hop lifts the body (m) and p.jaw
// opens the mouth (rad). Loops every 2 x TOMBA_SWAY_S.
export const TOMBA_SWAY_S = 2.4;
export function poseTombairot(r, t = 0, p = {}) {
  const k = p.amp ?? 1, w = TAU * t / TOMBA_SWAY_S, bob = (1 - Math.cos(2 * w)) / 2, { body, neck, head, jaw } = r;
  body.rotation.set(.005 * k * Math.sin(w / 2 + .6), 0, .035 * k * Math.sin(w));
  body.position.y = .03 * k * bob + (p.hop ?? 0); // (the bob is the lean squared: it lifts the hem as the body leans)
  // The tail has weight: its root follows the rump, the middle and the tip swing later and wider, the tip wagging too.
  // Only sideways and away from the rump (never into it, never under the ground: these turns about its hinges lift it).
  r.tail.forEach((g, i) => g.rotation.set((.012 + .01 * i) * k * (1 + Math.sin(2 * w - 2.6 - .5 * i)), .06 * i * k * Math.sin(w - 1.6 - .6 * i),
    (.025 + .03 * i) * k * Math.sin(w - 1 - .6 * i)));
  neck.rotation.set(.04 * k * Math.sin(w / 2 - .3), 0, .07 * k * Math.sin(w - .9));
  head.rotation.set(TOMBA_HEAD_TILT + .05 * k * Math.sin(2 * w - 1.2), .14 * k * Math.sin(w / 2), .05 * k * Math.sin(w - 1.5));
  jaw.rotation.x = p.jaw ?? TOMBA_JAW + .06 * k * bob;
  // The tongue is a loose strip of felt: plumb whatever the head does (a touch forward), swinging late.
  r.tongue.rotation.set(-(body.rotation.x + neck.rotation.x + head.rotation.x + jaw.rotation.x) - .1 + .12 * k * Math.sin(2 * w - 2), 0,
    -(body.rotation.z + neck.rotation.z + head.rotation.z) + .1 * k * Math.sin(w - 2.2));
  r.ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.z = s * (.12 + .09 * k * Math.sin(2 * w - 2.4)); });
  // Its pupils rest a little inwards and down (it looks at the children in front) and wander inside the white.
  r.pupils.forEach((e, i) => {
    const s = i ? 1 : -1;
    e.position.x = s * (TOMBA_EYE[0] - .015) + .012 * k * Math.sin(w / 2 + i); e.position.y = TOMBA_EYE[1] - .015 + .008 * k * Math.sin(w + 1.3 * i);
  });
  return r;
}
