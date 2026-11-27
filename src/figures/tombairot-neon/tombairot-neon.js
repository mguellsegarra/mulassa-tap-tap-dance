// El Tombairot (Escola Mare de Déu de la Candela, Valls) — Gemini Neon voxel model & deterministic pose.
// Public API: buildTombairotNeon(), poseTombairotNeon(t, p), TOMBAIROT_NEON_SIZE.
import * as THREE from 'three';
import { TOMBAIROT_NEON_DIM as D, TOMBAIROT_NEON_SIZE } from './tombairot-neon-palette.js';
import { buildTombairotNeonBody, buildTombairotNeonNeck, buildTombairotNeonLegs } from './tombairot-neon-body.js';
import { buildTombairotNeonHead } from './tombairot-neon-head.js';

export { TOMBAIROT_NEON_SIZE };

// Reused scratch vectors for carrier leg alignment (zero per-frame allocations).
const NEON_UP = new THREE.Vector3(0, 1, 0);
const NEON_HIP = new THREE.Vector3();
const NEON_ANKLE = new THREE.Vector3();
const NEON_DIR = new THREE.Vector3();

export function buildTombairotNeon() {
  const root = new THREE.Group();
  root.name = 'tombairot-neon';

  const body = buildTombairotNeonBody();
  const neck = buildTombairotNeonNeck();
  const { head, jaw, tongue, ears, pupils } = buildTombairotNeonHead();
  head.position.set(0, D.neckLen, D.headPivotZ);

  neck.add(head);
  body.add(neck);
  root.add(body);

  const legs = buildTombairotNeonLegs();
  for (const { shoe, pants } of legs) root.add(shoe, pants);

  const rig = { root, body, neck, head, jaw, tongue, ears, pupils, legs };
  poseTombairotNeon(rig, 0);
  return rig;
}

// Deterministic festive sway, bob, ear flop, pupil glance and carrier step read purely from time.
// `t`: rig returned by buildTombairotNeon(). `p`: time in seconds (number) or { t/time, amp, yaw }.
export function poseTombairotNeon(t, p = 0) {
  const sec = typeof p === 'number' ? p : (p?.time ?? p?.t ?? 0);
  const amp = typeof p === 'object' && p !== null && p.amp != null ? p.amp : 1;
  const yaw = typeof p === 'object' && p !== null && p.yaw != null ? p.yaw : 0;

  const w1 = sec * Math.PI;        // 2.0 s full left-right sway cycle
  const w2 = sec * Math.PI * 2;    // 1.0 s bounce / step cadence
  const wHalf = sec * Math.PI * 0.5;

  t.root.rotation.y = yaw;

  // Body: gentle bob (always >= 0 so skirt clears floor), festive waddle roll and soft lilt
  const bob = 0.036 * (0.5 - 0.5 * Math.cos(w2)) * amp;
  t.body.position.y = D.bodyY + bob;
  t.body.rotation.set(
    0.022 * Math.sin(w2 - 0.5) * amp,
    0.055 * Math.sin(wHalf) * amp,
    0.042 * Math.sin(w1) * amp
  );

  // Curved neck: elastic secondary follow-through slightly behind the body
  t.neck.rotation.set(
    0.038 * Math.sin(w2 - 0.85) * amp,
    0.065 * Math.sin(wHalf - 0.4) * amp,
    0.052 * Math.sin(w1 - 0.55) * amp
  );

  // Expressive head: gentle gaze slightly down toward spectators + curious side-to-side nod
  t.head.rotation.set(
    0.045 + 0.058 * Math.sin(w2 - 1.15) * amp,
    0.135 * Math.sin(wHalf - 0.7) * amp,
    0.058 * Math.sin(w1 - 0.9) * amp
  );

  // Happy breathing grin & playful dangling forked tongue
  t.jaw.rotation.x = 0.045 + 0.065 * (0.5 + 0.5 * Math.sin(w2 - 1.3)) * amp;
  t.tongue.rotation.set(
    0.09 * Math.sin(w2 - 1.6) * amp,
    0,
    0.13 * Math.sin(w1 - 1.2) * amp
  );

  // Floppy pointed ears bouncing gently out of phase with the step
  for (let i = 0; i < t.ears.length; i++) {
    const s = i === 0 ? -1 : 1;
    t.ears[i].rotation.z = s * (-0.15 + 0.13 * Math.sin(w2 - 1.05 + i * 0.35) * amp);
    t.ears[i].rotation.y = s * (0.06 + 0.05 * Math.sin(w1 - 0.7 + i) * amp);
  }

  // Lively googly pupils: independent wandering well inside each white eyeball
  if (t.pupils?.length === 2) {
    t.pupils[0].position.set(-0.096 + 0.016 * Math.sin(sec * 2.1) * amp, 0.317 + 0.015 * Math.cos(sec * 2.7) * amp, 0.258);
    t.pupils[1].position.set(0.096 + 0.016 * Math.sin(sec * 1.7 + 1.1) * amp, 0.312 + 0.014 * Math.sin(sec * 2.4 + 0.6) * amp, 0.258);
  }

  // Single carrier inside: small grounded march steps with legs recomputed hip -> ankle
  t.body.updateMatrix();
  for (let i = 0; i < t.legs.length; i++) {
    const { shoe, pants, side } = t.legs[i];
    const phase = w1 + i * Math.PI;
    const lift = Math.max(0, Math.sin(phase)) * 0.032 * amp;
    const stride = Math.cos(phase) * 0.042 * amp;
    shoe.position.set(side * D.footX, lift, D.footZ + stride);
    shoe.rotation.x = -Math.max(0, Math.sin(phase)) * 0.14 * amp;

    NEON_ANKLE.set(shoe.position.x, D.ankleY + lift, shoe.position.z);
    NEON_HIP.set(side * D.footX, D.hipY - D.bodyY, D.footZ).applyMatrix4(t.body.matrix);
    NEON_DIR.subVectors(NEON_HIP, NEON_ANKLE);
    const len = Math.max(0.1, NEON_DIR.length());
    pants.position.copy(NEON_ANKLE);
    pants.scale.set(1, len, 1);
    pants.quaternion.setFromUnitVectors(NEON_UP, NEON_DIR.divideScalar(len));
  }
}
