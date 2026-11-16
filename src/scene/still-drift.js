// The selector's held shot (scene/cameras.js, game/showreel.js REEL_STILL), kept alive by a slow drift round where its cut
// put the lens (2026-11-13, «un breu moviment suau», chosen over a breathing dolly and a float alone): it sways ±0.1 rad
// round her in 24 s and floats a few cm like a steady hand, always aimed at the cut's focus, so she stays where the band
// put her. At most ~0.03 rad/s (the showreel's limit is 0.15). Reduced motion: held.
import * as THREE from 'three';
import { camera } from './stage.js';
import { CALM } from '../core/env.js';
import { clock } from '../game/state.js';
import { TAU } from '../core/math.js';

const DRIFT_V = new THREE.Vector3();
const float = (t, v) => v.set(0.03 * Math.sin(t * 0.61) + 0.015 * Math.sin(t * 1.37 + 2), 0.02 * Math.sin(t * 0.83 + 1) + 0.01 * Math.sin(t * 1.91), 0.025 * Math.sin(t * 0.47 + 4));
const FLOAT0 = float(0, new THREE.Vector3());
// p: the lens where the cut put it, f: the focus it aimed at (world m), t0: the cut's clock; it sets off from there (a drift
// on the absolute clock jumped up to 0.1 rad on the frame after a cut)
export function stillDrift(p, f, t0) {
  const t = clock - t0, k = CALM.matches ? 0 : 1, a = 0.1 * k * Math.sin(t * TAU / 24), c = Math.cos(a), n = Math.sin(a);
  const dx = p.x - f.x, dz = p.z - f.z;
  camera.position.set(f.x + dx * c + dz * n, p.y, f.z + dz * c - dx * n);
  camera.position.add(float(t, DRIFT_V).sub(FLOAT0).multiplyScalar(k));
  camera.lookAt(f);
}
