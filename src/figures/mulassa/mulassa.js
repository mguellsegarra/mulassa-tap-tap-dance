// The mulassa (the ballroom mule): body, blanket, head and ears, each part a pivot the choreography drives. Her four
// carriers' shoes and trouser cuffs are figures/mulassa/mula-carriers.js (they stand on the floor, not on the shell).
import * as THREE from 'three';
import { Vox } from '../../scene/models/voxel.js';

// ---------------------------------------------------------------- Mulassa
// Colours from the reference photos: brown mule skin, reddish velvet,
// green blanket with the city arms, gold trim.
export const C = {
  red: '#a3182f', redDark: '#7c1024', gold: '#d9a521', green: '#1f5c33',
  brown: '#7a4a2b', brownDark: '#4e2e1a', muzzle: '#5d3a24', white: '#f4efe4',
  black: '#1a1412', pants: '#26262e', shoe: '#141414',
};
export function buildMulassa() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.9; // pivot for roll/pitch
  root.add(body);

  const v = new Vox();
  const y0 = -0.9 + 0.4; // cloth hem height
  // velvet body
  v.box(0, y0 + 0.01, 0, 1.1, 1.24, 3.3, C.red, 0); // its bottom 1 cm above the hem's (flush, they flickered from below)
  v.box(0, y0 + 1.25, 0, 0.96, 0.1, 3.1, C.red, 0);
  v.box(0, y0 + 0.05, 1.68, 1.0, 1.15, 0.12, C.red, 0);
  v.box(0, y0 + 0.05, -1.68, 1.0, 1.15, 0.12, C.red, 0);
  v.box(0, y0 + 0.2, -1.78, 0.8, 0.7, 0.1, C.red, 0);
  // gold hem + fringe
  v.box(0, y0, 0, 1.14, 0.08, 3.34, C.gold, 0);
  v.box(0, y0 + 0.14, 1.75, 1.02, 0.05, 0.02, C.gold, 0);
  for (let z = -1.6; z <= 1.6; z += 0.16) {
    v.box(0.56, y0 - 0.07, z, 0.03, 0.07, 0.07, C.gold);
    v.box(-0.56, y0 - 0.07, z, 0.03, 0.07, 0.07, C.gold);
  }
  // green blanket with gold frame
  const bz = -0.15, bl = 1.35;
  // top laps 1.5 cm into the side panels (x 0.545..0.585, top 1.38): no red seam at the corners. 5 mm short of their
  // ends and of the gold end bars (x from 0.565) so no face is shared with them (z-fighting)
  v.box(0, y0 + 1.35, bz, 1.12, 0.05, bl - 0.01, C.green, 0);
  for (const s of [1, -1]) {
    v.box(s * 0.565, y0 + 0.5, bz, 0.04, 0.88, bl, C.green, 0);
    v.box(s * 0.58, y0 + 0.48, bz, 0.03, 0.06, bl + 0.04, C.gold, 0);
    v.box(s * 0.58, y0 + 0.48, bz + bl / 2, 0.03, 0.92, 0.05, C.gold, 0);
    v.box(s * 0.58, y0 + 0.48, bz - bl / 2, 0.03, 0.92, 0.05, C.gold, 0);
    v.box(s * 0.58, y0 + 0.66, bz, 0.03, 0.03, bl - 0.25, C.gold, 0); // 1 cm proud of the blanket, like the frame
    // escut: red/white lozenge with a crown
    const ex = s * 0.59, ey = y0 + 0.82;
    // real Valls arms: red lozenge with a horizontal white fess (red / white / red), mural crown on top
    for (let i = 0; i < 9; i++) {
      const w = 0.32 * (1 - Math.abs(i - 4) / 5);
      v.box(ex, ey + i * 0.036, bz, 0.02, 0.036, w, i >= 3 && i <= 5 ? C.white : C.red, 0);
    }
    v.box(ex, ey + 0.33, bz, 0.02, 0.05, 0.24, C.gold, 0);
    for (const k of [-1, 0, 1]) v.box(ex, ey + 0.38, bz + k * 0.09, 0.02, 0.04, 0.05, C.gold, 0);
    // gold rope loop hanging from the neck
    for (let i = 0; i <= 10; i++) {
      const z = 1.55 - i * 0.07, sag = Math.sin((i / 10) * Math.PI) * 0.35;
      v.box(s * 0.56, y0 + 1.15 - sag, z, 0.03, 0.04, 0.07, C.gold);
    }
  }
  body.add(v.mesh());
  // long tail with white ribbons, it flies around in the voltes
  const tail = new THREE.Group();
  // pivot 2 cm inside the back panel (its face z -1.74 at this height): the knot reaches into it and stays joined as the
  // tail swings (it hung 9 cm off); the hair hangs where it did, clear of the low panel (to z -1.83)
  tail.position.set(0, y0 + 1.05, -1.76);
  const tv = new Vox().box(0, -0.12, -0.09, 0.14, 0.14, 0.24, C.redDark, 0).box(0, -0.85, -0.17, 0.12, 0.75, 0.1, '#2a1a12');
  // ribbons wrap the hair with clearance on all four sides (hair x ±0.06, z -0.22..-0.12): a ribbon face flush
  // with a hair face z-fights and the ribbons strobe as she turns
  for (let i = 0; i < 3; i++) tv.box(0, -0.3 - i * 0.2, -0.17, 0.16, 0.06, 0.14, i % 2 ? '#ffb3c7' : '#ffffff', 0);
  tail.add(tv.mesh());
  body.add(tail);
  // a portador who sticks his head out when things go wrong
  const peek = new THREE.Group();
  peek.position.set(0.5, y0 + 0.02, 0.95);
  peek.add(new Vox().box(0.12, 0, 0, 0.3, 0.3, 0.3, '#e0ac85').box(0.12, 0.26, -0.02, 0.32, 0.1, 0.34, '#3a2a20')
    .box(0.275, 0.16, 0.07, 0.01, 0.05, 0.05, C.black, 0).box(0.275, 0.16, -0.07, 0.01, 0.05, 0.05, C.black, 0)
    .box(0.275, 0.05, 0, 0.01, 0.04, 0.1, '#8a3030', 0).mesh());
  peek.scale.setScalar(0.001);
  body.add(peek);

  // neck: pivot at the chest, leaning forward
  const neck = new THREE.Group();
  neck.position.set(0, 0.65, 1.38);
  body.add(neck);
  const n = new Vox();
  n.box(0, 0, 0, 0.38, 1.6, 0.44, C.brown);
  n.box(0, 0.15, -0.23, 0.1, 1.4, 0.07, C.brownDark); // crinera
  n.box(0, -0.1, 0, 0.5, 0.5, 0.54, C.red, 0); // velvet collar
  n.box(0, 0.38, 0, 0.52, 0.05, 0.56, C.gold, 0);
  neck.add(n.mesh());

  const head = new THREE.Group();
  head.name = 'head'; // (the showreel's close-ups find their part by name: game/showreel.js SHOT_KINDS)
  head.position.set(0, 1.55, 0.05);
  head.scale.setScalar(1.3);
  neck.add(head);
  const h = new Vox();
  h.box(0, -0.22, -0.02, 0.42, 0.44, 0.46, C.brown); // skull
  h.box(0, -0.27, 0.28, 0.36, 0.27, 0.5, C.brown); // long mule face
  h.box(0, -0.28, 0.52, 0.34, 0.23, 0.14, C.muzzle); // muzzle (its underside 1 cm below the face's: seen when she bites)
  h.box(0, -0.3, 0.57, 0.3, 0.06, 0.03, C.white, 0); // upper teeth
  h.box(0, -0.29, 0.3, 0.3, 0.02, 0.5, '#5a1010', 0); // palate
  h.box(0.08, -0.14, 0.6, 0.06, 0.05, 0.02, C.black, 0).box(-0.08, -0.14, 0.6, 0.06, 0.05, 0.02, C.black, 0);
  for (const s of [1, -1]) {
    h.box(s * 0.215, -0.08, 0.05, 0.02, 0.1, 0.12, C.white, 0); // eye
    h.box(s * 0.225, -0.07, 0.07, 0.02, 0.07, 0.06, C.black, 0);
    h.box(s * 0.19, -0.35, 0.3, 0.02, 0.3, 0.05, C.red, 0); // cheek strap
    h.box(s * 0.2, -0.2, 0.3, 0.03, 0.08, 0.08, C.white, 0); // rosette
  }
  h.box(0, -0.2, 0.35, 0.39, 0.05, 0.47, C.red, 0); // noseband
  h.box(0, 0.12, 0.21, 0.44, 0.05, 0.05, C.red, 0); // browband
  h.box(0, 0.2, 0.12, 0.16, 0.14, 0.16, C.red); // pompom
  h.box(0, 0.33, 0.12, 0.08, 0.08, 0.08, C.gold, 0);
  head.add(h.mesh());
  // lower jaw: the mulassa clacks it (mossegada)
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.29, 0.05);
  jaw.add(new Vox().box(0, -0.13, 0.25, 0.32, 0.13, 0.46, C.brown).box(0, -0.14, 0.44, 0.3, 0.14, 0.1, C.muzzle)
    .box(0, -0.01, 0.47, 0.28, 0.06, 0.03, C.white, 0).box(0, -0.01, 0.25, 0.28, 0.02, 0.4, '#5a1010', 0).mesh());
  head.add(jaw);
  const ears = [1, -1].map(s => {
    const e = new THREE.Group();
    e.position.set(s * 0.14, 0.18, -0.08);
    e.rotation.z = -s * 0.4;
    const ev = new Vox().box(0, 0, 0, 0.15, 0.48, 0.12, C.brown).box(0, 0.12, 0.06, 0.08, 0.3, 0.02, '#b07a5a', 0).box(0, 0.48, 0, 0.09, 0.07, 0.08, C.brown);
    e.add(ev.mesh());
    head.add(e);
    return e;
  });

  return { root, body, neck, head, jaw, ears, tail, peek };
}
