// The road into Valls on a drum that turns under the Mulassa (rules.js R): the fields are built flat, along a strip as long
// as the drum's rim, then wrapped round it. The road, its edges and the grass are plain cylinders that need not turn.
// Behind the horizon, fixed: Valls and its campanar, the sun and the clouds.
import * as THREE from 'three';
import { Vox, MAT } from '../../../scene/models/voxel.js';
import { buildPopCampanar } from '../pop/models.js'; // shortcut: a game never imports another game; the campanar moves to a shared figures module if this game goes on
import { R, LANES } from './rules.js';

export const SKY = 0x8fd0f5;
const RIM = 2 * Math.PI * R; // metres round the drum: the land repeats after them
const ROAD = 4.1, EDGE = 3.55; // the road's half width and where its edge lines run
const FIELD_FROM = 5.6, FIELD_TO = 28;
const P = { asphalt: '#8d8680', line: '#fff6e0', grass: ['#a6cc72', '#98c264', '#b2d37e'], earth: '#a8744a', earth2: '#946540', calcot: '#5aa55a', calcotTip: '#8fd06f',
  sand: '#c79a64', vine: '#5c8f3a', vineLeaf: '#7fb24a', post: '#6b4a2b', hazel: ['#4f8f3c', '#5c9d44', '#467f35'], trunk: '#6b4a2b', stone: '#d9c39a', stone2: '#c6ad80',
  roof: '#c0704a', door: '#5C3119', window: '#2a2420', cypress: '#2f6b3a' };

function seeded(seed) { // the same land every time
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

// Wraps a flat strip round the drum: z (0 … -RIM, further ahead as it falls) becomes the angle, y the height off the rim.
function wrap(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const a = -p.getZ(i) / R, r = R + p.getY(i), c = Math.cos(a), s = Math.sin(a), ny = n.getY(i), nz = n.getZ(i);
    p.setXYZ(i, p.getX(i), r * c, -r * s);
    n.setXYZ(i, n.getX(i), ny * c + nz * s, -ny * s + nz * c);
  }
  geo.computeBoundingSphere();
  return geo;
}
// A long thing along the strip, in short pieces: a long box would cut straight through the drum's curve.
function along(v, x, y, z0, z1, w, h, color, jitter = 0) {
  for (let z = z0; z > z1; z -= 2.5) { const len = Math.min(2.5, z - z1); v.box(x, y, z - len / 2, w, h, len, color, jitter); }
}

// A field beside the road, x0..x1 out from it on one side (dir), z0..z1 along it.
function calcots(v, dir, x0, x1, z0, z1, r) { // ridged rows of calçots on dark earth
  along(v, dir * (x0 + x1) / 2, 0, z0, z1, x1 - x0, .08, P.earth, .02);
  for (let x = x0 + 1; x < x1 - .5; x += 1.8) {
    along(v, dir * x, .08, z0 - .5, z1 + .5, .7, .2, P.earth2);
    for (let z = z0 - 1; z > z1 + 1; z -= 1.3 + r() * .5) v.box(dir * x, .26, z, .3, .5 + r() * .3, .3, r() < .3 ? P.calcotTip : P.calcot, .05);
  }
}
function vines(v, dir, x0, x1, z0, z1, r) { // a vineyard: low vines on posts, in rows
  along(v, dir * (x0 + x1) / 2, 0, z0, z1, x1 - x0, .08, P.sand, .02);
  for (let x = x0 + 1.2; x < x1 - .5; x += 2.6) {
    for (let z = z0 - 1; z > z1 + 1; z -= 1.7) {
      v.box(dir * x, .08, z, .12, .7, .12, P.post, 0);
      v.box(dir * x, .6, z, .6, .55 + r() * .25, 1, r() < .5 ? P.vine : P.vineLeaf, .06);
    }
  }
}
function tree(v, x, z, r, s = 1) { // a hazel: a round crown of boxes on a short trunk
  v.box(x, 0, z, .35 * s, 1.2 * s, .35 * s, P.trunk, 0);
  const c = pick(r, P.hazel);
  v.box(x, 1 * s, z, 2.2 * s, 1.4 * s, 2.2 * s, c, .05);
  v.box(x, 1.3 * s, z, 1.6 * s, 1.6 * s, 2.6 * s, c, .05);
  v.box(x, 1.3 * s, z, 2.6 * s, 1.1 * s, 1.6 * s, c, .05);
}
function grove(v, dir, x0, x1, z0, z1, r) {
  for (let x = x0 + 2; x < x1 - 1; x += 4.5) for (let z = z0 - 2.5; z > z1 + 1; z -= 4.5) tree(v, dir * (x + r() - .5), z + r() - .5, r, .9 + r() * .3);
}
function masia(v, x, z, r) { // a masia: a stone block under a stepped tile roof, small windows and its door towards the road's traveller
  const w = 7 + r() * 3, d = 5 + r() * 2, h = 4.5 + r() * 1.5;
  v.box(x, 0, z, w, h, d, P.stone, .03);
  for (let i = 0; i < 4; i++) v.box(x, h + i * .5, z, w + .6, .5, d + .6 - i * (d / 4), P.roof, .03);
  v.box(x, 0, z + d / 2 + .05, 1.4, 2.3, .1, P.door, 0);
  for (const wx of [-w / 3, w / 3]) for (const y of [1, 3]) v.box(x + wx, y, z + d / 2 + .05, .7, .9, .1, P.window, 0);
  v.box(x + w / 2 - 1, h, z - d / 4, .7, 2.2, .7, P.stone2, 0); // the chimney
}
function cypress(v, x, z, r) {
  const h = 5 + r() * 3;
  v.box(x, 0, z, .3, .8, .3, P.trunk, 0);
  v.box(x, .6, z, 1.1, h * .7, 1.1, P.cypress, .05);
  v.box(x, .6 + h * .7, z, .7, h * .3, .7, P.cypress, .05);
}

// Everything that turns with the drum, as one mesh.
function land(r) {
  const v = new Vox();
  for (const x of [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2]) for (let i = 0; i < 48; i++) v.box(x, 0, -i * RIM / 48 - 1.1, .34, .03, 2.2, P.line, 0); // the lane dashes
  for (const s of [-1, 1]) {
    for (let z = 0; z > -RIM;) { // fields, a new kind every stretch
      const len = Math.min(z + RIM, 18 + r() * 16), kind = r(), x1 = FIELD_FROM + 9 + r() * 6;
      (kind < .4 ? calcots : kind < .75 ? vines : grove)(v, s, FIELD_FROM, x1, z - .5, z - len + .5, r);
      (r() < .5 ? grove : vines)(v, s, x1 + 1, FIELD_TO, z - .5, z - len + .5, r);
      if (r() < .45) masia(v, s * (FIELD_FROM + 8 + r() * 12), z - len / 2, r);
      if (r() < .6) along(v, s * (ROAD + 1.2), 0, z - 2, z - len * (.4 + r() * .5), .6, .7, P.stone2, .06); // a dry-stone wall
      z -= len;
    }
    for (let z = -4; z > -RIM; z -= 10 + r() * 18) cypress(v, s * (ROAD + .8), z, r);
    for (let z = -1; z > -RIM; z -= 1.5 + r() * 3) v.box(s * (ROAD + .3 + r() * 1), 0, z, .3, .25 + r() * .3, .3, pick(r, P.grass), .08); // tufts on the verge
  }
  const m = v.mesh();
  wrap(m.geometry);
  m.castShadow = m.receiveShadow = false;
  m.frustumCulled = false; // it wraps the whole drum: always partly in view
  return m;
}

// A band of the drum's rim that needs no turning: one colour all the way round.
function band(x, width, color, lift = 0) {
  const g = new THREE.CylinderGeometry(R + lift, R + lift, width, 140, 1, true);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, -R, 0);
  return m;
}

// Valls on the horizon: its roofs round the campanar, hazed by the distance. Its foot is out of sight behind the drum.
function town(r, mat) {
  const g = new THREE.Group(), v = new Vox(), haze = c => new THREE.Color(c).lerp(new THREE.Color(SKY), .28).getStyle();
  for (let i = 0; i < 90; i++) {
    const x = (r() - .5) * 150, z = (r() - .5) * 26, h = 13 + r() * 9 - Math.abs(x) * .07, w = 5 + r() * 6;
    v.box(x, 0, z, w, h, 6, haze(pick(r, ['#E9D9B8', '#E2CFA9', '#F2DFB6', '#EAD3A6', '#E7C899'])), .03);
    v.box(x, h, z, w + .5, 1.4, 6.5, haze(P.roof), .05);
  }
  const houses = v.mesh(), campanar = buildPopCampanar();
  campanar.scale.setScalar(6.5);
  for (const m of [houses, campanar]) { m.material = mat; m.castShadow = m.receiveShadow = false; g.add(m); }
  g.position.set(0, -36, -118);
  return g;
}

function cloud(r, mat) {
  const v = new Vox(), n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) v.box(i * 3 - n * 1.5, (i % 2) + r(), r() * 2, 4 + r() * 5, 2 + r() * 2, 4 + r() * 2, '#ffffff', 0);
  v.box(0, -.6, 1, n * 3 + 2, .8, 5, '#e4eef6', 0); // a flat greyer belly
  const m = v.mesh();
  m.material = mat;
  m.castShadow = m.receiveShadow = false;
  return m;
}

export function createWorld(scene) {
  const r = seeded(4137);
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(0xcfe9f7, 58, 140);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0xf5e2c2, 1.15 * Math.PI));
  const sunLight = new THREE.DirectionalLight(0xfff0d4, .55 * Math.PI);
  sunLight.position.set(6, 14, 8);
  scene.add(sunLight);

  scene.add(band(0, ROAD * 2, P.asphalt), band(-EDGE, .24, P.line, .008), band(EDGE, .24, P.line, .008));
  for (const s of [-1, 1]) scene.add(band(s * (ROAD + 40), 80, P.grass[0], -.05));
  const drum = new THREE.Group();
  drum.position.y = -R;
  drum.add(land(r));
  scene.add(drum);

  const far = MAT.clone(); // what stands behind the horizon keeps its colours: no fog
  far.fog = false;
  scene.add(town(r, far));
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
  sun.position.set(26, 22, -138);
  scene.add(sun);
  const clouds = [[-38, 20, -86], [-10, 27, -94], [18, 17, -78], [42, 24, -90], [-58, 15, -80], [58, 13, -76]].map(([x, y, z]) => {
    const c = cloud(r, far);
    c.position.set(x, y, z);
    c.userData.drift = .4 + .5 * r();
    scene.add(c);
    return c;
  });

  return {
    // the drum turns `metres` of its rim towards the camera
    advance(metres, dt) {
      drum.rotation.x = (drum.rotation.x + metres / R) % (2 * Math.PI);
      for (const c of clouds) { c.position.x += c.userData.drift * dt; if (c.position.x > 62) c.position.x = -62; }
    },
  };
}

// Where a thing `d` metres of arc ahead of the drum's top stands, and how it leans back with the rim.
export function onDrum(obj, x, d) {
  const a = d / R;
  obj.position.set(x, R * Math.cos(a) - R, -R * Math.sin(a));
  obj.rotation.x = -a;
}
