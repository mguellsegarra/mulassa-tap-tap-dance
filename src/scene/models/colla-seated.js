// The colla's seated members, on the paving at the front of the public (the same suit and head as the standing helpers).
import * as THREE from 'three';
import { Vox } from './voxel.js';
import { SKIN } from './people.js';
import { COLLA, seeded, cbox, limb, shoe, collaHead } from './colla.js';

// ---- the seated member, on the paving (hips at y 0), three postures seen at the front of the public:
// 0 knees up, hands on the knees; 1 leaning back on the hands; 2 legs folded to one side, propped on a hand (64 s).
// neck: the torso's top (the head's pivot); legs: [hip, knee, ankle] right then left; hands: right, left. `tap`: what
// marks the beat (the left forearm, pivot at the elbow, or the right shoe, pivot at the heel).
export const SEATED = [
  { neck: [0, 0.7, -0.1], legs: [[[0.1, 0.08, -0.02], [0.11, 0.44, 0.36], [0.11, 0.08, 0.56]], [[-0.1, 0.08, -0.02], [-0.11, 0.44, 0.36], [-0.11, 0.08, 0.56]]],
    hands: [[0.15, 0.5, 0.36], [-0.15, 0.5, 0.36]], tap: 'hand' },
  { neck: [0, 0.62, -0.28], legs: [[[0.1, 0.08, -0.02], [0.12, 0.36, 0.42], [0.13, 0.08, 0.74]], [[-0.1, 0.08, -0.02], [-0.12, 0.36, 0.42], [-0.13, 0.08, 0.74]]],
    hands: [[0.27, 0, -0.5], [-0.27, 0, -0.5]], tap: 'foot' },
  { neck: [0.06, 0.66, -0.08], legs: [[[0.1, 0.08, -0.02], [-0.02, 0.08, 0.46], [-0.36, 0.08, 0.3]], [[-0.1, 0.09, -0.02], [-0.24, 0.09, 0.3], [-0.5, 0.09, 0.06]]],
    hands: [[0.42, 0, -0.04], [-0.1, 0.2, 0.25]], tap: 'hand', side: true },
];
export function buildSeated(look, posture, seed = 1) {
  const rnd = seeded(seed), P = SEATED[posture], g = new THREE.Group(), body = new THREE.Group();
  look = { skin: SKIN[(rnd() * 5) | 0], legs: COLLA.cream, dye: true, sole: COLLA.sole, lace: COLLA.lace, ...look };
  g.add(body);
  const v = new Vox(), [nx, ny, nz] = P.neck, top = look.top, dye = look.dye;
  cbox(v, 0, 0.08, -0.04, 0.4, 0.16, 0.3, look.legs); // the seat of the trousers, on the paving
  const hip = [nx * 0.3, 0.1, -0.04], along = k => hip.map((h, i) => h + (P.neck[i] - h) * k);
  limb(v, hip, P.neck, 0.44, 0.26, top, rnd, dye); // the jacket
  if (look.sash) limb(v, along(0.04), along(0.3), 0.46, 0.28, look.sash, rnd, false); // round the waist, along the torso
  if (look.mocador) cbox(v, nx, ny - 0.035, nz, 0.3, 0.06, 0.3, look.mocador).box(nx, ny - 0.16, nz + 0.12, 0.1, 0.1, 0.06, look.mocador);
  const foot = new THREE.Group(), fv = new Vox(), toe = P.tap === 'foot';
  P.legs.forEach(([H, K, A], i) => {
    limb(v, H, K, 0.16, 0.16, look.legs, rnd, dye);
    limb(v, K, A, 0.15, 0.15, look.legs, rnd, dye);
    const s = toe && i === 0 ? fv : v; // the shoe that taps
    if (P.side) cbox(s, A[0] - 0.07, 0.05, A[2], 0.16, 0.1, 0.12, look.upper ?? look.sole); // feet tucked to the side
    else if (look.upper) shoe(s, A[0], A[2] + 0.06, look, 0.14, 0.26);
    else { cbox(s, A[0], 0.03, A[2] + 0.06, 0.14, 0.06, 0.26, look.sole); cbox(s, A[0], 0.066, A[2] + 0.12, 0.145, 0.012, 0.025, look.lace, 0); }
  });
  if (toe) { const A = P.legs[0][2]; foot.position.set(A[0], 0, A[2] - 0.07); fv.g.forEach(geo => geo.translate(-A[0], 0, 0.07 - A[2])); foot.add(fv.mesh()); }
  const tap = new THREE.Group(), tv = new Vox();
  P.hands.forEach((hand, i) => { // shoulder to hand in two segments, the elbow pushed outwards and down
    const s = i ? -1 : 1, sh = [nx + s * 0.27, ny - 0.06, nz];
    const elb = [(sh[0] + hand[0]) / 2 + s * 0.08, (sh[1] + hand[1]) / 2 - 0.04, (sh[2] + hand[2]) / 2];
    limb(v, sh, elb, 0.12, 0.13, top, rnd, dye);
    const t = !toe && i === 1 ? tv : v; // the forearm that taps
    limb(t, elb, [hand[0], hand[1] + 0.06, hand[2]], 0.11, 0.12, look.rolled ? look.skin : top, rnd, dye); // to the wrist, over the palm
    cbox(t, hand[0], hand[1] + 0.03, hand[2], 0.09, 0.06, 0.1, look.skin);
    if (t === tv) { tap.position.set(...elb); tv.g.forEach(geo => geo.translate(-elb[0], -elb[1], -elb[2])); tap.add(tv.mesh()); }
  });
  body.add(v.mesh());
  const h = collaHead(look, rnd, 0), beat = toe ? foot : tap;
  h.position.set(nx, ny, nz);
  g.add(h, beat);
  return { g, body, head: h, beat, toe, posture: P, bones: [body, h, beat] };
}
// A contained gesture: a nod and a hand (or toe) tap that land on the beat; `half` members mark every other beat.
export function poseSeated(p, beat, energy, half) {
  const b = half ? beat / 2 : beat, f = b - Math.floor(b), u = Math.cos(Math.PI * f) ** 2;
  const k = u * u, amp = 0.35 + 0.65 * Math.min(1, Math.max(0, energy));
  p.head.rotation.x = 0.1 * amp * k;
  p.beat.rotation.x = -(p.toe ? 0.25 : 0.3) * amp * (1 - k); // the toes / the hand lift between the beats, down on it
}
