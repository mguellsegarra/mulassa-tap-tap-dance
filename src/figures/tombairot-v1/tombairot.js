// El Tombairot, the school dragon of the Escola Mare de Déu de la Candela (Valls): a beehive of yellow foam rings up to
// a long neck and a green plush head, a long body of felt scales behind it with red pompoms down its spine and a tail
// hanging from its rump, and a gold skirt to the ground all round. Sources and measures:
// research/bestiari/tombairot/README.md. The 2019 look (no daisies, no medallion).
//
// API: buildTombairotV1() -> { root, body, rings, skirt, shell, tail, neck, head, jaw, tongue, ears[2], pupils[2],
// feet[4], pose }. poseTombairotV1(rig, t, p) sets the idle pose of second t, and rig.pose(t, p) is the same call bound to
// its rig. Same t, same pose, whatever was posed before.
// Parts: root > body (pivot on the ground: sway, bob) > rings and shell (meshes: the ring beehive, the scaled body),
// skirt (pivot at its top: it hangs), tail (hinged on the rump's top edge: it hangs and swings), neck (pivot at the
// body's top) > head > jaw > tongue, and ears and pupils on the head. The carriers' feet stand on the ground in the
// root's frame, not on the body.
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';
import { TAU } from '../../core/math.js';
import { TOMBA_V1 as K, TOMBA_V1_NECK_Y } from './tomba-form.js';
import { buildTombaV1Body } from './tomba-body.js';
import { buildTombaV1Head, TOMBA_V1_HEAD_TILT, TOMBA_V1_JAW } from './tomba-head.js';

// head: its head's scale over the measured one (1 = as in the photos; a little bigger reads friendlier in the game).
export function buildTombairotV1({ head = 1.1 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(), parts = buildTombaV1Body();
  root.add(body); body.add(parts.rings, parts.shell);
  // a part on its own pivot: a group at (0, y, z) holding its mesh
  const hung = (mesh, y, z) => { const g = new THREE.Group(); g.position.set(0, y, z); g.add(mesh); body.add(g); return g; };
  parts.skirt.position.y = -parts.skirtTop; // (built in the body's frame; the tail from its own hinge down)
  const skirt = hung(parts.skirt, parts.skirtTop, 0), tail = hung(parts.tail, 2.1, -2.36);
  const top = buildTombaV1Head(head);
  top.neck.position.y = TOMBA_V1_NECK_Y; body.add(top.neck);
  // Its carriers: one at the window (a child's eye height) and, inferred from its length, another under the back.
  // Sneakers and jeans under the skirt, standing on the ground. At rest the hem all but hides them, as in every photo;
  // they show when it hops. feet: the front pair, then the rear one.
  const feet = [[-1, .02], [1, .02], [-1, -1.5], [1, -1.5]].map(([s, z]) => {
    const g = new THREE.Group(); g.position.set(s * .11, 0, z);
    g.add(new Vox().box(0, 0, 0, .1, .03, .25, K.sole, 0).box(0, .03, -.01, .095, .06, .22, K.shoe).box(0, .08, -.05, .11, .42, .13, K.jeans).mesh());
    root.add(g); return g;
  });
  const rig = { root, body, rings: parts.rings, skirt, shell: parts.shell, tail, ...top, feet };
  rig.pose = (t, p) => poseTombairotV1(rig, t, p);
  return rig;
}

// The idle pose at second t: the whole figure sways from the ground (its head moves with the structure, as carried), bobs
// twice a sway, and the loose parts follow late: the neck, the nodding head, the ears, the tongue, the skirt and the tail.
// p.amp scales it all (0 = at rest), p.hop lifts the body (m) and p.jaw opens the mouth (rad). Loops every
// 2 x TOMBA_V1_SWAY_S.
export const TOMBA_V1_SWAY_S = 2.4;
export function poseTombairotV1(r, t = 0, p = {}) {
  const k = p.amp ?? 1, w = TAU * t / TOMBA_V1_SWAY_S, bob = (1 - Math.cos(2 * w)) / 2, { body, neck, head, jaw } = r;
  body.rotation.set(.006 * k * Math.sin(w / 2 + .6), 0, .035 * k * Math.sin(w));
  // A leaning rigid base lifts: its carriers raise it by what its lowest edge would sink (2.4 m back, 0.7 m aside,
  // the skirt taking half the lean), so the hem never meets the ground.
  body.position.y = .03 * k * bob + (p.hop ?? 0) + 2.4 * Math.abs(body.rotation.x) + .35 * Math.abs(body.rotation.z);
  r.skirt.rotation.z = -.5 * body.rotation.z;          // it hangs: half the lean behind the body's
  // The tail hangs plumb from the rump whatever the body does, and swings late and wide, like a weight on a string
  // (only sideways and away from the rump: never into it).
  r.tail.rotation.set(-body.rotation.x + .03 * k * (1 + Math.sin(2 * w - 2.6)), 0, -body.rotation.z + .11 * k * Math.sin(w - 1.3));
  neck.rotation.set(.04 * k * Math.sin(w / 2 - .3), 0, .07 * k * Math.sin(w - .9));
  head.rotation.set(TOMBA_V1_HEAD_TILT + .05 * k * Math.sin(2 * w - 1.2), .14 * k * Math.sin(w / 2), .05 * k * Math.sin(w - 1.5));
  jaw.rotation.x = p.jaw ?? TOMBA_V1_JAW + .07 * k * bob;
  // The tongue is a loose strip of felt: plumb whatever the head does (a touch forward), swinging late.
  r.tongue.rotation.set(-(body.rotation.x + neck.rotation.x + head.rotation.x + jaw.rotation.x) - .1 + .12 * k * Math.sin(2 * w - 2), 0,
    -(body.rotation.z + neck.rotation.z + head.rotation.z) + .1 * k * Math.sin(w - 2.2));
  r.ears.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.z = s * (.05 + .09 * k * Math.sin(2 * w - 2.4)); });
  r.pupils.forEach((e, i) => { const s = i ? 1 : -1; e.position.x = s * .088 + .02 * k * Math.sin(w / 2 + i); e.position.y = .32 + .014 * k * Math.sin(w + 1.3 * i); });
  return r;
}
