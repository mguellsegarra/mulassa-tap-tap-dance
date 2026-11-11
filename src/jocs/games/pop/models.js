// Chunky voxel figures, the ones the game shows. A few big boxes in flat colours and big eyes, on the same pivots as the full models, so poseMula and poseDrac drive them unchanged.
import * as THREE from 'three';
import { Vox } from '../../../scene/models/voxel.js';
import { C } from '../../../figures/mulassa/mulassa.js';
import { D, BODY_Y, FOOT_X, FOOT_Z } from '../../../figures/drac/drac.js';

const cb = (v, x, y, z, w, h, d, c) => v.box(x, y - h / 2, z, w, h, d, c, 0); // a box by its centre
const pivot = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; };

export function buildPopMulassa() {
  const root = new THREE.Group(), body = pivot(0, .9, 0, root);
  const v = new Vox();
  cb(v, 0, .15, 0, 1.2, 1.3, 3.1, C.red);
  cb(v, 0, -.5, 0, 1.3, .14, 3.2, C.gold); // hem
  cb(v, 0, .5, -.15, 1.28, .68, 1.4, C.green); // blanket
  for (const s of [1, -1]) {
    cb(v, s * .645, .46, -.15, .03, .34, .34, C.red); // the arms, reduced to their colours
    cb(v, s * .655, .46, -.15, .03, .1, .34, C.white);
    cb(v, s * .645, .71, -.15, .03, .1, .34, C.gold);
  }
  body.add(v.mesh());
  const tail = pivot(0, .45, -1.55, body);
  tail.add(new Vox().box(0, -.85, -.1, .14, .85, .14, '#2a1a12', 0).box(0, -.65, -.1, .18, .14, .18, C.white, 0).mesh());
  const neck = pivot(0, .65, 1.38, body);
  neck.add(new Vox().box(0, -.1, 0, .46, 1.7, .5, C.brown, 0).box(0, .1, 0, .54, .12, .58, C.gold, 0).mesh());
  const head = pivot(0, 1.55, .05, neck);
  head.name = 'head';
  head.scale.setScalar(1.5);
  const h = new Vox();
  cb(h, 0, -.15, 0, .5, .46, .5, C.brown); // skull
  cb(h, 0, -.22, .42, .42, .28, .5, C.brown); // face
  cb(h, 0, -.22, .68, .36, .24, .1, C.muzzle);
  for (const s of [1, -1]) {
    cb(h, s * .26, -.08, .1, .05, .2, .2, C.white);
    cb(h, s * .285, -.08, .13, .03, .12, .12, C.black);
  }
  cb(h, 0, .14, .1, .16, .14, .16, C.red); // pompom
  head.add(h.mesh());
  const jaw = pivot(0, -.34, .05, head);
  jaw.add(new Vox().box(0, -.14, .32, .36, .12, .56, C.muzzle, 0).box(0, -.03, .55, .28, .05, .05, C.white, 0).mesh());
  const ears = [1, -1].map(s => {
    const e = pivot(s * .16, .07, -.08, head);
    e.rotation.z = -s * .35;
    e.add(new Vox().box(0, 0, 0, .15, .5, .12, C.brown, 0).mesh());
    return e;
  });
  const legs = new Vox();
  for (const [x, z] of [[-.3, 1], [.3, 1], [-.3, -1], [.3, -1]]) legs.box(x, 0, z, .26, .5, .3, C.pants, 0);
  root.add(legs.mesh());
  return { root, body, neck, head, jaw, ears, tail };
}

const HEAD_K = 1.4, HEAD_WIDE = 1.85, NECK_X = 1.08; // big heads, on necks set wide enough that the two never meet
const NECK_LEN = .62, TAIL_LEN = [.65, .55, .45];

function dracHead() {
  const g = new THREE.Group(), v = new Vox();
  g.name = 'head';
  g.scale.set(HEAD_WIDE, HEAD_K, HEAD_K);
  cb(v, 0, .42, 0, .8, .72, .86, D.green); // skull
  cb(v, 0, .44, .72, .68, .38, .72, D.green); // snout
  cb(v, 0, .2, .72, .76, .14, .8, D.red); // upper lip
  for (const s of [1, -1]) {
    cb(v, s * .2, .86, .3, .34, .36, .14, D.white); // big eyes: the camera is high
    cb(v, s * .2, .86, .39, .18, .22, .06, D.pupil);
    cb(v, s * .2, .08, 1, .1, .14, .1, D.white); // fang
  }
  g.add(v.mesh());
  const jaw = pivot(0, .14, .34, g);
  jaw.add(new Vox().box(0, -.24, .38, .72, .24, .76, D.red, 0).mesh());
  return { g, jaw };
}

function dracNeck(side, body) {
  const root = pivot(side * NECK_X, .75, .42, body), segs = [];
  let parent = root;
  [.72, .68, .64].forEach((w, i) => {
    const s = pivot(0, i ? NECK_LEN : 0, 0, parent);
    s.add(new Vox().box(0, -.08, 0, w, NECK_LEN + .16, w, i % 2 ? D.rib : D.green, 0).mesh());
    segs.push(s);
    parent = s;
  });
  const h = dracHead();
  h.g.position.y = NECK_LEN;
  parent.add(h.g);
  return { root, segs, head: h.g, jaw: h.jaw };
}

function dracWing(side, body) {
  const root = pivot(side * .55, .45, -.78, body), v = new Vox();
  cb(v, side * .55, .4, 0, 1.1, .8, .08, D.membrane);
  cb(v, side * 1.05, .85, 0, .7, .4, .08, D.membrane);
  cb(v, side * .75, 1.1, 0, 1.5, .14, .14, D.wingRib); // the leading edge
  root.add(v.mesh());
  root.rotation.set(-.4, side * .3, side * .6);
  return { root };
}

export function buildPopDrac() {
  const root = new THREE.Group(), body = pivot(0, BODY_Y, 0, root);
  const t = new Vox();
  cb(t, 0, -.72, 0, 2.7, .42, 2.9, D.rib); // the rolled hem
  for (const [w, h] of [[2.3, 1.05], [2, 1.5], [1.5, 1.85]]) cb(t, 0, .05, 0, w, h, w + .15, D.green); // one body, stepped round: tiers read as a cake
  for (const [x, y] of [[-.4, .05], [.4, .05], [0, -.28], [0, .4]]) for (const s of [1, -1]) {
    cb(t, s * 1.16, y, x, .03, .3, .3, D.spotRing);
    cb(t, s * 1.18, y, x, .03, .16, .16, D.spot);
  }
  cb(t, 0, -.1, 1.25, .62, .74, .06, D.brown); // chest plaque
  body.add(t.mesh());
  const necks = [1, -1].map(s => { const n = dracNeck(s, body); body.add(n.root); return n; });
  const wings = [1, -1].map(s => dracWing(s, body));
  const base = pivot(0, -.3, -1.05, body), tail = [];
  let parent = base;
  [.62, .46, .3].forEach((w, i) => {
    const s = pivot(0, 0, i ? -TAIL_LEN[i - 1] : 0, parent), L = TAIL_LEN[i], v = new Vox();
    cb(v, 0, 0, -L / 2, w, w, L + .08, i % 2 ? D.rib : D.green);
    if (i === 2) cb(v, 0, 0, -L - .1, .34, .1, .24, D.red);
    s.add(v.mesh());
    tail.push(s);
    parent = s;
  });
  const legs = [FOOT_X, -FOOT_X].map(x => { // the carrier's legs, under the body
    const shoe = pivot(x, 0, FOOT_Z, root), pants = pivot(x, 0, FOOT_Z, root);
    shoe.add(new Vox().box(0, 0, .08, .44, .22, .66, D.shoe, 0).mesh());
    pants.add(new Vox().box(0, .22, 0, .5, 1.6, .5, D.pants, 0).mesh());
    return { shoe, pants }; // named in tools/dev/pop-models.html's notes
  });
  return { root, body, necks, wings, tail, legs };
}

// The goodies and the petard: each must read at a glance from the board's high camera.
// The bomb: a black ball with a cap; the fuse and its spark are apart, so the board can burn the fuse down (board.js).
const BOMB_R = 1.12, BOMB_Y = 1.14, BOMB_TOP = BOMB_Y + BOMB_R;
export const PETARD_FUSE = [[0, .46], [.06, .62], [.18, .76], [.34, .86], [.52, .9]].map(([x, y]) => [x, BOMB_TOP + y]); // from the cap out
export const PETARD_SPARK = [.76, BOMB_TOP + .92]; // the spark's place on a full fuse
export function buildPopPetard({ lit = true } = {}) {
  const v = new Vox(), R = BOMB_R, S = .2, cy = BOMB_Y;
  for (let x = -R; x <= R; x += S) for (let y = -R; y <= R; y += S) for (let z = -R; z <= R; z += S) {
    const d = Math.hypot(x, y, z);
    if (d > R - .05 || d < R - S * 1.8) continue; // - .05: no lone voxel at the poles
    const light = (-x * .5 + y * .7 + z * .5) / R;
    cb(v, x, cy + y, z, S, S, S, light > .93 ? '#eef0ff' : light > .68 ? '#34323f' : light > -.1 ? '#22212b' : '#17161d');
  }
  cb(v, 0, cy + R + .06, 0, .86, .3, .86, '#26242f'); // the cap, black like the ball
  cb(v, 0, cy + R + .26, 0, .62, .14, .62, '#3a3846');
  if (!lit) return v.mesh();
  for (const [x, y] of PETARD_FUSE) cb(v, x, y, 0, .2, .2, .2, '#e8d8b8');
  sparkAt(v, ...PETARD_SPARK);
  return v.mesh();
}
export function buildFuseBit() { const v = new Vox(); cb(v, 0, 0, 0, .2, .2, .2, '#e8d8b8'); return v.mesh(); }
export function buildSpark() { const v = new Vox(); sparkAt(v, 0, 0); return v.mesh(); }
function sparkAt(v, tx, ty) {
  for (const [w, h, d] of [[.72, .24, .24], [.24, .72, .24], [.24, .24, .72]]) cb(v, tx, ty, 0, w, h, d, '#ff8a1e');
  cb(v, tx, ty, 0, .34, .34, .34, '#fff3d6');
  for (const [dx, dy, dz] of [[.44, 0, 0], [-.44, 0, 0], [0, .44, 0], [0, 0, .44], [0, 0, -.44], [.3, .3, .2], [-.3, .3, -.2]]) cb(v, tx + dx, ty + dy, dz, .14, .14, .14, '#ffe066');
}
// A calçot with a face: charred jacket peeling down like a banana, wild green hair, arms up for the calçotada.
export function buildPopCalcot() {
  const v = new Vox(), char = '#2a221d', ash = '#5a4636', white = '#f7f2e6', mitt = '#a9cf72';
  cb(v, 0, .3, 0, .78, .6, .78, char);
  for (const [x, y] of [[-.26, .05], [0, .03], [.26, .05]]) cb(v, x, y, .3, .12, .12, .16, '#d8c49a'); // roots
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { // the peel, folded out
    const w = dx ? .16 : .54, d = dx ? .54 : .16;
    cb(v, dx * .44, .68, dz * .44, w, .22, d, ash);
    cb(v, dx * .58, .54, dz * .58, w, .22, d, char);
    cb(v, dx * .7, .38, dz * .7, w, .18, d, ash);
  }
  cb(v, 0, 1.3, 0, .72, 1.3, .72, white);
  cb(v, 0, 2.08, 0, .62, .28, .62, '#d6e6a6');
  cb(v, 0, 2.32, 0, .48, .22, .48, '#8fbf63');
  for (const s of [1, -1]) {
    cb(v, s * .17, 1.62, .37, .24, .34, .03, '#fff');
    cb(v, s * .15, 1.58, .39, .13, .2, .03, '#1c1612');
    cb(v, s * .12, 1.64, .41, .05, .05, .02, '#fff');
    cb(v, s * .28, 1.28, .37, .14, .1, .03, '#f2a0a0'); // cheek
    cb(v, s * .15, 1.24, .37, .08, .08, .03, '#7a2020'); // the smile's corners
    cb(v, s * .42, 1.3, 0, .14, .14, .2, mitt);
    cb(v, s * .54, 1.44, 0, .14, .22, .18, mitt);
    cb(v, s * .62, 1.68, 0, .16, .3, .18, mitt);
    cb(v, s * .66, 1.92, 0, .26, .22, .22, mitt);
  }
  cb(v, 0, 1.17, .37, .24, .14, .03, '#7a2020');
  cb(v, 0, 1.13, .385, .13, .06, .03, '#e8604c');
  // hair: blades fan out from the crown and droop at the tips
  for (const [dx, dz, n] of [[0, 0, 8], [-.15, 0, 8], [.15, 0, 8], [-.3, .02, 7], [.3, .02, 7], [-.08, -.17, 7], [.08, -.17, 7], [-.08, .15, 6], [.08, .15, 6]]) {
    for (let i = 0; i < n; i++) {
      const fall = Math.max(0, i - 4) ** 2 * .04, spread = i + 1;
      cb(v, dx * spread * .34, 2.52 + i * .25 - fall, dz * spread * .34, .13, .29, .13, i > n - 3 ? '#2f7a3a' : i % 2 ? '#4a9a4c' : '#3f8a45');
    }
  }
  return v.mesh();
}
// A voxel octagon: a wide box each way and a chamfer between them.
const octa = (v, y, h, w, c) => { cb(v, 0, y + h / 2, 0, w, h, w * .58, c); cb(v, 0, y + h / 2, 0, w * .58, h, w, c); cb(v, 0, y + h / 2, 0, w * .84, h, w * .84, c); };
// On each of the four faces (+z, -z, +x, -x), a thin plate lying a bit proud of radius r.
const faces = (r, fn) => { for (const [nx, nz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) fn((u, y, w, h, c, o = 0) => [nx * (r + o) + (nz ? u : 0), y, nz * (r + o) + (nx ? u : 0), nx ? .04 : w, h, nz ? .04 : w, c]); };
// Sant Joan de Valls: square base, tall octagon with long lancets, gables and pinnacles, the white openwork crown, the dark bulb and its cross.
export function buildPopCampanar() {
  const v = new Vox(), stone = '#d9b882', light = '#f4dcaf', dark = '#9a7045', hole = '#2a1a10', bulb = '#4a4252', gold = '#f5c518';
  const put = a => cb(v, ...a);
  cb(v, 0, 1, 0, 1.4, 2, 1.4, light);
  cb(v, 0, 2.08, 0, 1.56, .16, 1.56, dark);
  cb(v, 0, 2.2, 0, 1.3, .12, 1.3, stone);
  faces(.71, f => { put(f(0, 1.1, .2, .4, hole)); put(f(0, 1.34, .1, .08, hole)); });
  octa(v, 2.25, 2.9, 1.18, light);
  cb(v, 0, 5.2, 0, 1.3, .12, 1.3, dark);
  faces(.6, f => {
    put(f(0, 3.72, .52, 2.3, stone)); // the frame
    put(f(0, 3.66, .36, 2.08, hole, .02));
    put(f(0, 4.76, .24, .12, hole, .02));
    put(f(0, 4.86, .12, .1, hole, .02));
    put(f(0, 3.66, .05, 2.08, stone, .04)); // the mullion
    put(f(0, 3.0, .26, .26, gold, .04)); // the bell in its lancet
  });
  faces(.64, f => { for (let k = 0; k < 4; k++) put(f(0, 5.32 + k * .12, .64 - k * .19, .12, stone)); }); // gables
  for (const a of [1, -1]) for (const b of [1, -1]) cb(v, a * .54, 5.46, b * .54, .14, .44, .14, stone);
  octa(v, 5.26, .78, .84, '#fff6e3');
  faces(.43, f => { for (const u of [-.2, 0, .2]) put(f(u, 5.65, .08, .5, hole)); }); // openwork
  cb(v, 0, 6.1, 0, .66, .1, .66, dark);
  for (const [y, h, w] of [[6.15, .1, .42], [6.25, .14, .6], [6.39, .16, .56], [6.55, .14, .36], [6.69, .16, .16]]) octa(v, y, h, w, bulb);
  cb(v, 0, 7.1, 0, .09, .6, .09, gold);
  cb(v, 0, 7.18, 0, .32, .09, .09, gold);
  return v.mesh();
}
// The game's own carretilla (figures/drac fireNode, figures/bou bouTube): a kraft tube with a red cap, a tight jet out of its mouth, here tied to its stick.
export function buildPopCarretilla() {
  const v = new Vox(), kraft = '#c49a6c', group = new THREE.Group();
  cb(v, 0, .75, -.42, .2, 1.8, .2, '#6b4a2b');
  cb(v, 0, 1.75, 0, .66, 1.9, .66, kraft);
  for (const y of [1.1, 1.8]) cb(v, 0, y, 0, .7, .1, .7, '#8a6a42'); // the lashing
  cb(v, 0, 2.72, 0, .74, .3, .74, '#c0283c');
  cb(v, 0, 2.88, 0, .4, .04, .4, '#26222a');
  const FIRE = ['#fff3d6', '#ffe066', '#f5c518', '#ff8a1e', '#ff5a1e'];
  for (let i = 0; i < 7; i++) {
    const w = [.3, .36, .42, .46, .42, .32, .2][i];
    cb(v, 0, 3.08 + i * .3, 0, w, .32, w, FIRE[Math.min(4, Math.floor(i * .75))]);
  }
  for (const [x, y, z] of [[.36, 3.9, .1], [-.38, 4.1, -.1], [.08, 4.4, .36], [-.1, 3.7, -.36], [.36, 4.6, -.1], [-.32, 4.7, .16]]) cb(v, x, y, z, .14, .14, .14, '#ffe066');
  const m = v.mesh();
  m.rotation.z = -.32; // tilted: a carretilla never burns straight up
  m.position.x = -.4;
  group.add(m);
  return group;
}
