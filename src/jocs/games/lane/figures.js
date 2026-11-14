// What comes down the Cort, each facing the Mulassa (+z), and the Mulassa herself running away from the camera.
// People are the main game's voxel spectators; the Mulassa and the Drac are Pop's.
import * as THREE from 'three';
import { Vox } from '../../../scene/models/voxel.js';
import { buildPerson } from '../../../scene/models/people.js';
// shortcut: a game never imports another game; these move to a shared figures module if this game goes on
import { mulaRig, dracRig, poseMula, MULA_POSES, DRAC_K } from '../pop/rigs.js';

const lift = (p, y) => { p.g.position.y = y; return p; };

function avia() { // a granny on her folding chair, knitting, the wool ball rolled out in front
  const g = new THREE.Group(), v = new Vox();
  v.box(0, .45, 0, .62, .08, .55, '#c8463a', 0).box(0, .5, -.26, .62, .7, .06, '#e9e2d0', 0); // the chair, red seat, striped back
  for (const [x, z] of [[-.28, .22], [.28, .22], [-.28, -.22], [.28, -.22]]) v.box(x, 0, z, .05, .45, .05, '#9a9a9a', 0);
  v.box(.15, 0, .7, .22, .22, .22, '#d8342f', 0);
  g.add(v.mesh());
  const p = lift(buildPerson({ seated: true, hair: '#d9d9d9', shirt: '#8e5a9e', pants: '#3c3448' }), .5);
  p.arms.forEach(a => { a.rotation.x = -1.1; });
  g.add(p.g);
  g.add(new Vox().box(0, .78, .38, .26, .1, .06, '#d8342f', 0).box(-.12, .8, .38, .02, .02, .3, '#c9a45c', 0).mesh()); // the knitting
  return { g, tick: t => { p.arms[0].rotation.x = -1.1 + Math.sin(t * 9) * .12; } };
}

function cotxet() { // a pram, pushed by a parent who has not seen the Mulassa yet
  const g = new THREE.Group(), v = new Vox();
  v.box(0, .35, .45, .6, .5, .9, '#5b8fd6', 0).box(0, .85, .2, .62, .4, .4, '#3d6fb6', 0); // basket and hood
  for (const [x, z] of [[-.3, .1], [.3, .1], [-.3, .8], [.3, .8]]) v.box(x, 0, z, .06, .28, .28, '#26222a', 0);
  v.box(0, .9, -.15, .5, .05, .05, '#26222a', 0);
  g.add(v.mesh());
  const p = buildPerson({});
  p.g.position.z = -.55;
  p.arms.forEach(a => { a.rotation.x = -.9; });
  g.add(p.g);
  return { g, tick: t => { p.legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 8 + k * Math.PI) * .4; }); } };
}

function gos() { // a happy dog trotting the wrong way
  const g = new THREE.Group(), v = new Vox(), fur = '#d3a26a';
  v.box(0, .35, 0, .38, .34, .8, fur, 0).box(0, .55, .45, .32, .3, .32, fur, 0).box(0, .52, .66, .18, .14, .14, '#3a2a1e', 0);
  for (const s of [-1, 1]) v.box(s * .14, .82, .42, .08, .14, .08, '#a97a48', 0).box(s * .08, .64, .62, .05, .05, .02, '#111', 0);
  v.box(0, .5, .32, .4, .06, .1, '#d8342f', 0); // the collar
  const body = v.mesh(), legs = [[-.13, .28], [.13, .28], [-.13, -.28], [.13, -.28]].map(([x, z]) => {
    const l = new THREE.Group();
    l.position.set(x, .36, z);
    l.add(new Vox().box(0, -.36, 0, .1, .36, .1, fur, 0).mesh());
    g.add(l);
    return l;
  });
  const tail = new THREE.Group();
  tail.position.set(0, .6, -.4);
  tail.add(new Vox().box(0, 0, -.05, .06, .3, .06, fur, 0).mesh());
  tail.rotation.x = -.6;
  g.add(body, tail);
  g.scale.setScalar(1.2);
  return { g, tick: t => { legs.forEach((l, k) => { l.rotation.x = Math.sin(t * 16 + (k % 3 ? Math.PI : 0)) * .6; }); tail.rotation.z = Math.sin(t * 20) * .7; } };
}

function xurros() { // the fira's stall: a counter, a striped awning and a pile of xurros
  const g = new THREE.Group(), v = new Vox();
  v.box(0, 0, 0, 1.7, 1.05, 1.6, '#f4efe4', 0);
  for (let i = 0; i < 5; i++) v.box(-.68 + i * .34, .1, .81, .17, .85, .02, '#d8342f', 0);
  for (const x of [-.8, .8]) v.box(x, 1.05, -.7, .08, 1.4, .08, '#7a4a2b', 0);
  for (let i = 0; i < 6; i++) v.box(-.85 + i * .34 + .17, 2.45, .05, .34, .14, 1.9, i % 2 ? '#ffffff' : '#d8342f', 0); // the awning
  for (let i = 0; i < 7; i++) v.box(-.5 + (i % 4) * .3, 1.05 + Math.floor(i / 4) * .1, .2, .24, .1, .7, '#d99a3c', 0);
  v.box(.45, 1.05, -.35, .5, .35, .5, '#9a9a9a', 0); // the fryer
  g.add(v.mesh());
  const p = buildPerson({ shirt: '#ffffff', hat: '#ffffff' });
  p.g.position.z = -.9;
  g.add(p.g);
  return { g, tick: t => { p.arms[0].rotation.x = -1 + Math.sin(t * 5) * .4; } };
}

function gegant(robe, trim, crown, skin, hair, beard) { // a gegant: a tall robe with the carrier hidden inside, a big head, a crown
  const g = new THREE.Group(), v = new Vox();
  v.box(0, .05, 0, 1.3, 2.6, 1.1, robe, .02);
  v.box(0, .05, 0, 1.34, .2, 1.14, trim, 0);
  v.box(0, 2.65, 0, .9, .9, .7, robe, .02).box(0, 2.6, 0, 1.6, .55, .55, robe, .02); // chest and shoulders
  for (const s of [-1, 1]) v.box(s * .75, 1.4, .1, .22, 1.3, .22, robe, 0).box(s * .75, 1.2, .14, .2, .22, .2, skin, 0);
  v.box(0, 3.55, 0, .3, .2, .3, skin, 0);
  v.box(0, 3.75, 0, .8, .9, .72, skin, 0); // the head
  v.box(0, 4.6, 0, .84, .14, .76, hair, 0).box(0, 3.95, -.37, .84, .8, .04, hair, 0);
  for (const s of [-1, 1]) v.box(s * .18, 4.22, .37, .12, .12, .02, '#1a1412', 0);
  if (beard) v.box(0, 3.6, .37, .6, .4, .06, hair, 0);
  v.box(0, 4.7, 0, .7, .32, .64, crown, 0);
  for (const [x, z] of [[-.3, .28], [0, .28], [.3, .28], [-.3, -.28], [.3, -.28]]) v.box(x, 5.02, z, .1, .16, .1, crown, 0);
  const m = new THREE.Group();
  m.add(v.mesh());
  g.add(m);
  return { g, m };
}
function gegants() { // the pair of Valls's giants, arm in arm across two lanes, swaying as they dance
  const g = new THREE.Group();
  const a = gegant('#a3182f', '#f2c21d', '#f5c518', '#f1c9a5', '#3b2416', true), b = gegant('#2f62d6', '#f2c21d', '#f5c518', '#f6d7bd', '#5b3b2a', false);
  a.g.position.x = -1.44; // a lane apart once sized
  b.g.position.x = 1.44;
  g.add(a.g, b.g);
  return { g, tick: t => { a.m.rotation.z = Math.sin(t * 3) * .06; b.m.rotation.z = Math.sin(t * 3 + 1) * .06; a.m.rotation.y = Math.sin(t * 1.5) * .3; b.m.rotation.y = -Math.sin(t * 1.5) * .3; } };
}

function drac() { // Pop's Drac, charging up the street
  const d = dracRig();
  d.root.scale.setScalar(DRAC_K * 1.25); // bigger than on Pop's board: it fills its lane
  return { g: d.root, tick: t => { d.root.position.y = Math.abs(Math.sin(t * 9)) * .3; d.necks.forEach((n, k) => { n.jaw.rotation.x = .3 + Math.max(0, Math.sin(t * 12 + k)) * .5; }); } };
}

// sized to her and to the lanes (rules.js LANES, 2.3 m apart): the giants' pair spans two
const sized = (build, k) => () => { const v = build(); v.g.scale.multiplyScalar(k); return v; };
export const BUILD = { avia: sized(avia, 1.15), cotxet: sized(cotxet, 1.1), gos: sized(gos, 1.2), xurros: sized(xurros, .95), gegants: sized(gegants, .8), drac };

const clamp = (v, m) => Math.max(-m, Math.min(m, v));
// The Mulassa, from behind: Pop's, trotting, her head up. A lane change is a little show: she hops, leans into it, whips
// her head towards the new lane with her mouth open and throws her ears and tail the other way.
export function createMulassa() {
  const m = mulaRig(), pose = { ...MULA_POSES[0], yaw: 0, turn: 0 };
  const g = new THREE.Group(), spin = new THREE.Group();
  m.root.rotation.y = Math.PI;
  m.root.scale.setScalar(.5);
  spin.add(m.root);
  g.add(spin);
  let hop = 1, side = 0; // the hop's progress 0 → 1, and which way she went
  return {
    g,
    switched(dir) { hop = 0; side = dir; },
    // c: how far she still is from her lane (m, signed)
    tick(t, dt, speed, c) {
      const k = speed / 14, step = t * 9 * Math.sqrt(k);
      hop = Math.min(1, hop + dt / .3);
      const air = Math.sin(hop * Math.PI), show = air * side;
      poseMula(m, pose, t * k);
      spin.rotation.set(0, 0, 0);
      spin.position.y = 0;
      m.root.position.y = Math.abs(Math.sin(step)) * .12 + air * .55; // the carriers' trot, and the hop
      m.root.scale.set(.5 * (1 - air * .1), .5 * (1 + air * .18), .5); // stretched in the air
      m.root.rotation.set(-air * .18, Math.PI + clamp(-.2 * c, .45), clamp(-.16 * c, .4)); // nose up, turned and leaning into the lane
      m.head.rotation.y += -show * .9; // she looks where she goes
      m.head.rotation.z = show * .35;
      m.jaw.rotation.x = Math.max(m.jaw.rotation.x, air * .9); // and says so
      m.ears.forEach((e, i) => { e.rotation.z = (i ? 1 : -1) * .35 + show * .8; });
      m.tail.rotation.x = air * 1.2;
      return Math.sin(step); // the trot's phase, for the hooves' sound
    },
    // the hit (t seconds since): she cartwheels up and comes down
    crash(t, dt) {
      spin.rotation.z += 9 * dt;
      spin.position.y = 1.05 * Math.sin(Math.min(t / .55, 1) * Math.PI);
      m.jaw.rotation.x = .9;
    },
  };
}
