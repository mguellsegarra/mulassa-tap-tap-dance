// Prototype (?toon): the Drac with soft forms, on the same pivots as figures/drac/drac.js, so poseDrac drives it unchanged.
import * as THREE from 'three';
import { D, BODY_Y, FOOT_X, FOOT_Z } from '../../../../figures/drac/drac.js';
import { Soft } from './soft.js';

const NECK_AT = [.52, .85, .42], WING_AT = [.55, .45, -.78], TAIL_AT = [0, -.3, -1.05], OVAL = 1.08;
const NECK_LEN = .62, NECK_W = [.94, .88, .82], TAIL_LEN = [.65, .52, .48], TAIL_W = [.62, .5, .4, .3];
// A single pear-shaped shell. The rolled hem is part of the profile, not stacked rings.
function trunkRadius(y) {
  const t = (y + .97) / 1.94;
  return Math.sin(Math.PI * Math.max(0, Math.min(1, t))) ** .55 * (1.48 - .58 * t);
}

// A red spot in a gold ring, lying on the surface facing out along angle a.
function spot(v, x, y, z, a, r) {
  const rot = [0, a, 0], s = Math.sin(a), c = Math.cos(a);
  v.ball(x, y, z, r, r, r * .28, D.spotRing, rot, 8);
  v.ball(x + s * r * .2, y, z + c * r * .2, r * .55, r * .55, r * .2, D.spot, rot, 6);
}

function trunk() {
  const v = new Soft(), rows = [];
  for (let i = 0; i <= 24; i++) {
    const y = -.97 + i / 24 * 1.94;
    rows.push([trunkRadius(y), y, i < 4 ? D.greenDark : D.green]);
  }
  v.lathe(0, 0, 0, rows, OVAL, 20);
  for (const s of [1, -1]) {
    v.ball(s * NECK_AT[0], NECK_AT[1], NECK_AT[2], .5, .5, .5, D.green);
    v.ball(s * WING_AT[0], WING_AT[1], WING_AT[2], .3, .3, .3, D.greenDark, null, 10);
    for (const [a, y] of [[1, .28], [1.75, .28], [1.35, -.14]]) {
      const r = trunkRadius(y);
      spot(v, s * Math.sin(a) * r, y, Math.cos(a) * r * OVAL, s * a, .19);
    }
  }
  v.ball(0, -.32, -1.03, .34, .34, .3, D.green, null, 10); // the tail's root
  // the carved chest plaque: a flame of brown wood, its grille a dark lozenge
  const pz = trunkRadius(-.05) * OVAL;
  v.ball(0, -.08, pz - .02, .4, .52, .1, D.brown);
  v.ball(0, .14, pz + .05, .24, .24, .05, D.brownLight, null, 10);
  v.box(0, .14, pz + .08, .2, .2, .03, D.grille, .012, [0, 0, Math.PI / 4]);
  return v;
}

function headRig(wide) {
  const g = new THREE.Group(), v = new Soft();
  g.name = 'head';
  v.ball(0, .12, 0, .4, .32, .42, D.green); // stem and jowls
  v.ball(0, .52, .02, .55, .46, .52, D.green); // skull
  v.ball(0, .46, .82, .47, .29, .64, D.green); // snout
  v.ball(0, .28, .88, .51, .105, .64, D.red); // upper lip
  v.ball(0, .3, 1.47, .36, .09, .08, D.red, null, 10); // its curl
  v.ball(0, .16, .62, .4, .07, .42, D.redDark, null, 10); // the mouth's roof
  for (const s of [1, -1]) {
    v.ball(s * .22, .66, 1.1, .15, .11, .16, D.green, null, 10); // nostril mound
    v.ball(s * .22, .69, 1.24, .06, .045, .025, D.redDark, null, 7);
    v.ball(s * .29, .94, .32, .29, .3, .26, D.red);
    v.ball(s * .29, .98, .4, .255, .27, .23, D.white); // the eye: Pica's camera is high, so no lid
    v.ball(s * .27, .96, .49, .15, .17, .13, D.iris, null, 10);

    v.ball(s * .27, .96, .61, .075, .12, .045, D.pupil, null, 10);
    v.ball(s * .22, 1.05, .65, .03, .03, .02, D.white, null, 6);
    v.ball(s * .27, 1.13, .3, .25, .08, .2, D.greenDark, null, 10); // brow
    v.ball(s * .56, .58, -.28, .05, .3, .18, D.greenDark, null, 9); // ear fin
  }
  for (const x of [-.24, .24]) v.ball(x, .1, 1.28, .07, .11, .05, D.white, null, 8); // two fangs read; a row of teeth is a grille
  for (let i = 0; i < 3; i++) v.ball(0, .96 - i * .07, -.08 - i * .2, .06, .14 - i * .03, .08, D.greenDark, null, 8); // crest
  v.tube([[0, .3, 1.35, .09], [0, .2, 1.75, .07]], D.metal, 8);
  g.add(v.mesh());
  const jaw = new THREE.Group();
  jaw.position.set(0, .14, .4);
  const j = new Soft();
  j.ball(0, -.08, .05, .36, .13, .2, D.greenDark, null, 10); // hinge
  j.ball(0, -.25, .48, .4, .11, .48, D.green); // chin
  j.ball(0, -.12, .48, .47, .09, .5, D.red); // lower lip
  j.ball(0, -.07, .48, .36, .03, .4, D.redDark, null, 10); // floor of the mouth
  for (const x of [-.14, .14]) j.ball(x, .01, .86, .06, .09, .045, D.white, null, 8);
  jaw.add(j.mesh());
  g.add(jaw);
  return { g, jaw, wide };
}

function neckRig(side, wide) {
  const root = new THREE.Group();
  root.position.set(side * NECK_AT[0], NECK_AT[1], NECK_AT[2]);
  // One continuous skin: the board needs a readable neck, not visible rig collars.
  const stem = new THREE.Group();
  const v = new Soft().tube([
    [0, -.3, 0, NECK_W[0] / 2], [0, .5, 0, .45],
    [0, 1.25, 0, .41], [0, 1.95, 0, .38],
  ], D.green, 12);
  spot(v, side * .43, .9, 0, side * Math.PI / 2, .14);
  stem.add(v.mesh());
  root.add(stem);
  const segs = [stem], h = headRig(wide);
  h.g.position.y = NECK_LEN * 3;
  stem.add(h.g);
  return { root, segs, head: h.g, jaw: h.jaw, flame: new THREE.Group() };
}

function wingRig(side) {
  const root = new THREE.Group();
  root.position.set(side * WING_AT[0], WING_AT[1], WING_AT[2]);
  const x = u => side * u, v = new Soft();
  // a bat's fan: the shoulder, the finger along the top, the far edge scalloped between the ribs
  const outline = new THREE.Shape();
  outline.moveTo(0, 0);
  outline.quadraticCurveTo(x(.3), 1.8, x(1.5), 1.95);
  outline.quadraticCurveTo(x(1.12), 1.4, x(1.65), 1.05);
  outline.quadraticCurveTo(x(.98), 1.15, x(1.14), .48);
  outline.quadraticCurveTo(x(.65), .75, 0, 0);
  const points = outline.getPoints(10).map(p => [p.x, p.y]);
  v.sheet(points, .12, D.membrane);
  v.tube([[x(.1), .1, 0, .1], [x(.55), 1.5, 0, .075], [x(1.5), 1.95, 0, .045]], D.wingRib, 7);
  v.tube([[x(.1), .08, 0, .05], [x(1.65), 1.05, 0, .04]], D.wingRib, 6);
  v.tube([[x(.1), .05, 0, .05], [x(1.14), .48, 0, .035]], D.wingRib, 6);
  root.add(v.mesh());
  root.rotation.set(-.85, side * .3, side * .6);
  return { root, flame: new THREE.Group() };
}

function tailRig(body) {
  const base = new THREE.Group(), tail = [];
  base.position.set(...TAIL_AT);
  body.add(base);
  let parent = base;
  TAIL_W.forEach((w, i) => {
    const s = new THREE.Group(), L = TAIL_LEN[i] ?? .4;
    s.position.z = i ? -TAIL_LEN[i - 1] : 0;
    s.rotation.x = i ? .42 : .1; // the curl: poseDrac only sways it on y
    const v = new Soft();
    v.ball(0, 0, -L / 2, w / 2, w / 2, L * .72, D.green, null, 10);
    v.ball(0, w / 2 + .02, -L / 2, .04, .08, .13, D.greenDark, null, 7); // spine
    if (i < 3) for (const sd of [1, -1]) spot(v, sd * w / 2, 0, -L / 2, sd * Math.PI / 2, w * .2);
    else v.ball(0, 0, -L - .08, .17, .05, .17, D.red, null, 9).ball(0, 0, -L - .2, .08, .04, .1, D.red, null, 7); // its red tip
    s.add(v.mesh());
    parent.add(s);
    tail.push(s);
    parent = s;
  });
  tail.base = base;
  return tail;
}

function legRig(root, x) {
  const shoe = new THREE.Group(), pants = new THREE.Group();
  shoe.position.set(x, 0, FOOT_Z);
  pants.position.set(x, 0, FOOT_Z);
  shoe.add(new Soft().ball(0, .12, .1, .22, .13, .36, D.shoe, null, 10).mesh());
  const v = new Soft().tube([[0, .3, 0, .22], [0, 1.6, 0, .28]], D.pants, 10);
  for (const [a, y, c] of [[.3, .55, D.pantsPatch], [-.5, .8, D.pantsEye], [.7, 1.08, D.pantsPatch], [-.3, 1.2, D.pantsPatch]]) {
    const r = .23 + (y - .3) * .045;
    v.ball(Math.sin(a) * r, y, Math.cos(a) * r, .085, .085, .025, c, [0, a, 0], 7);
  }
  pants.add(v.mesh());
  root.add(shoe, pants);
  return { shoe, pants };
}

export function buildToonDrac({ wideEyes = true } = {}) {
  const root = new THREE.Group(), body = new THREE.Group();
  body.position.y = BODY_Y;
  root.add(body);
  body.add(trunk().mesh());
  const necks = [1, -1].map(side => { const n = neckRig(side, wideEyes); body.add(n.root); return n; });
  const wings = [1, -1].map(side => { const w = wingRig(side); body.add(w.root); return w; });
  const tail = tailRig(body);
  const legs = [FOOT_X, -FOOT_X].map(x => legRig(root, x));
  return { root, body, necks, wings, tail, legs, fire: [] };
}
