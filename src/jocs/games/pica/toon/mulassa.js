// Prototype (?toon): soft Mulassa with the shared rig pivots and board-specific raised-head poses.
import * as THREE from 'three';
import { C } from '../../../../figures/mulassa/mulassa.js';
import { Soft } from './soft.js';

const PINK = '#b07a5a', MOUTH = '#5a1010';

function bodyShell() {
  const v = new Soft(), y0 = -.5;
  v.cloth([[-.51, .59, 1.43], [-.43, .65, 1.51], [.15, .64, 1.46], [.52, .56, 1.35], [.73, .4, 1.14], [.8, .001, .001]], C.red);
  v.cloth([[-.56, .6, 1.45], [-.51, .64, 1.5], [-.45, .65, 1.51]], C.gold);
  for (let z = -1.35; z <= 1.36; z += .23) for (const s of [1, -1]) v.ball(s * .63, -.58, z, .035, .06, .055, C.gold, null, 5);
  const bz = -.15, bl = 1.4;
  v.drape(bz, bl / 2, C.green);
  for (const e of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + i / 8 * Math.PI;
      points.push([Math.sin(a) * .67, .16 + Math.cos(a) ** .65 * .68, bz + e * bl / 2, .025]);
    }
    v.tube(points, C.gold, 6);
  }
  for (const s of [1, -1]) {
    v.box(s * .65, .12, bz, .05, .45, bl, C.green, .025);
    v.box(s * .67, -.1, bz, .05, .07, bl + .05, C.gold, .03);
    
    // the arms of Valls: a red lozenge with a white fess, and the mural crown
    const ey = .12;
    v.box(s * .685, ey, bz, .02, .26, .26, C.red, .008, [Math.PI / 4, 0, 0]);
    v.box(s * .695, ey, bz, .02, .08, .25, C.white, .008);
    v.box(s * .685, ey + .19, bz, .025, .06, .24, C.gold, .01);
    for (const k of [-1, 0, 1]) v.box(s * .685, ey + .24, bz + k * .09, .025, .05, .05, C.gold, .01);
    // the gold rope
    for (let i = 0; i <= 8; i++) v.ball(s * .62, y0 + 1.1 - Math.sin(i / 8 * Math.PI) * .32, 1.2 - i * .06, .035, .04, .04, C.gold, null, 5);
  }
  return v;
}

function headParts(head) {
  const h = new Soft();
  h.ball(0, -.2, -.02, .29, .3, .3, C.brown); // skull
  h.ball(0, -.25, .3, .23, .21, .36, C.brown); // long mule face
  h.ball(0, -.26, .56, .25, .18, .19, '#a97951'); // muzzle
  h.ball(0, -.34, .4, .14, .025, .2, MOUTH, null, 8); // palate
  h.box(0, -.33, .57, .24, .05, .04, C.white, .015); // upper teeth
  for (const s of [1, -1]) {
    h.ball(s * .11, -.15, .735, .045, .035, .025, C.black, null, 7); // nostril
    h.ball(s * .22, .015, .16, .125, .15, .125, C.white); // the eye: big, on the side of the face
    h.ball(s * .28, .025, .2, .075, .09, .085, C.black, null, 10);
    h.ball(s * .32, .065, .245, .018, .022, .018, C.white, null, 6);
    h.ball(s * .22, .14, .14, .13, .045, .13, C.brownDark, null, 10); // brow
    h.tube([[s * .155, -.15, .43, .018], [s * .185, -.32, .18, .018]], C.red, 6); // cheek strap
    h.ball(s * .19, -.2, .3, .012, .05, .05, C.white, null, 8); // rosette
  }
  h.ball(0, -.2, .36, .2, .04, .24, C.red, null, 10); // noseband
  h.ball(0, .03, .14, .24, .03, .05, C.red, null, 10); // browband
  h.ball(0, .13, .1, .09, .09, .09, C.red, null, 10); // pompom
  h.ball(0, .24, .1, .045, .045, .045, C.gold, null, 8);
  h.ball(0, .03, -.22, .17, .22, .1, C.brownDark, null, 12);
  head.add(h.mesh());
  const jaw = new THREE.Group();
  jaw.position.set(0, -.29, .05);
  jaw.add(new Soft().ball(0, -.11, .26, .155, .075, .28, C.brown).ball(0, -.11, .46, .15, .08, .1, C.muzzle)
    .ball(0, -.045, .26, .125, .018, .22, MOUTH, null, 8).box(0, -.02, .45, .22, .05, .04, C.white, .015).mesh());
  head.add(jaw);
  const ears = [1, -1].map(s => {
    const e = new THREE.Group();
    e.position.set(s * .14, .12, -.08);
    e.rotation.z = -s * .4;
    e.add(new Soft().ball(0, .28, 0, .105, .32, .07, C.brown).ball(0, .28, .045, .062, .24, .035, PINK, null, 8).mesh());
    head.add(e);
    return e;
  });
  return { jaw, ears };
}

export function buildToonMulassa() {
  const root = new THREE.Group(), body = new THREE.Group();
  body.position.y = .9;
  root.add(body);
  const shell = bodyShell().mesh();
  shell.scale.z = .78;
  body.add(shell);

  const tail = new THREE.Group();
  tail.position.set(0, .55, -1.22);
  const tv = new Soft().ball(0, -.08, -.08, .09, .09, .12, C.redDark, null, 8).tube([[0, -.12, -.14, .06], [0, -.85, -.19, .035]], '#2a1a12', 7);
  for (let i = 0; i < 3; i++) tv.ball(0, -.32 - i * .2, -.17, .08, .03, .08, i % 2 ? '#ffb3c7' : '#ffffff', null, 8);
  tail.add(tv.mesh());
  body.add(tail);
  const peek = new THREE.Group(); // only for the other game's portador; mulaRig removes it

  const neck = new THREE.Group();
  neck.position.set(0, .65, .98);
  body.add(neck);
  neck.add(new Soft()
    .tube([[0, -.1, 0, .26], [0, .7, 0, .2], [0, 1.5, .03, .17]], C.brown, 12)
    .tube([[0, .15, -.22, .05], [0, .85, -.2, .05], [0, 1.5, -.14, .04]], C.brownDark, 6) // crinera
    .ball(0, -.08, 0, .31, .28, .33, C.red)
    .ball(0, .28, 0, .29, .04, .3, C.gold, null, 12)
    .mesh());

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.55, .05);
  head.scale.setScalar(1.75); // she's the target: bigger than life, the face reads from the board's camera
  neck.add(head);
  const { jaw, ears } = headParts(head);

  const legs = new Soft();
  for (const [x, z] of [[-.3, .9], [.3, .9], [-.3, -1.05], [.3, -1.05]]) {
    legs.tube([[x, .08, z, .1], [x, .5, z, .1]], C.pants, 8).ball(x, .06, z + .05, .12, .07, .17, C.shoe, null, 9);
  }
  root.add(legs.mesh());
  return { root, body, neck, head, jaw, ears, tail, peek };
}
