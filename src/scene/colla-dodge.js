// The showreel's colla dodge (scene/cameras.js frameMenuCamera calls it on every directed frame).
import * as THREE from 'three';
import { smoothDamp } from './framing.js';
import { COLLAS } from '../figures/objects.js';

const COLLA_V3 = new THREE.Vector3();
// The showreel never shoots over an attendant's shoulder (at the foot of the full screen one loomed half
// her size): the shot's azimuth leaves `rad` either side of every colla helper standing between the lens and her, all of
// them at once (two windows can join), by the nearer way out when a cut or the shot's own arc brings one in, then the same way
// round while it stays (the other only past `max`: no swing across), eased and slow (her travel turns their bearings).
const HELPER_CLEAR = { rad: 0.5, max: 1.2, ease: 0.6, speed: 0.12 }, AVOID = { x: new Float64Array(1), v: new Float64Array(1), side: 1, free: true, d: new Float64Array(16), n: 0 };
function pushOut(dir) { // from the shot's own azimuth out past every window, one way round
  let o = 0;
  for (let k = 0; k < 4; k++) for (let i = 0; i < AVOID.n; i++) if (Math.abs(o - AVOID.d[i]) < HELPER_CLEAR.rad) o = AVOID.d[i] + dir * HELPER_CLEAR.rad;
  return o;
}
export function clearOfColla(yaw, cx, cz, hd, cut, dt) { // hd: the lens's horizontal distance from her
  AVOID.n = 0;
  for (const c of COLLAS) if (c.helpers.visible) for (const p of c.crew) {
    p.g.getWorldPosition(COLLA_V3);
    const dx = COLLA_V3.x - cx, dz = COLLA_V3.z - cz;
    if (dx * dx + dz * dz > hd * hd || AVOID.n === AVOID.d.length) continue; // beyond her: in the background
    const b = Math.atan2(dx, dz); AVOID.d[AVOID.n++] = Math.atan2(Math.sin(b - yaw), Math.cos(b - yaw));
  }
  let off = pushOut(AVOID.side);
  const fresh = cut || AVOID.free; // (nothing in the way until now: the nearer way out)
  if (fresh || Math.abs(off) > HELPER_CLEAR.max) { const other = pushOut(-AVOID.side); if (fresh ? Math.abs(other) < Math.abs(off) : Math.abs(other) < HELPER_CLEAR.max) { AVOID.side = -AVOID.side; off = other; } }
  AVOID.free = off === 0;
  if (cut) { AVOID.x[0] = off; AVOID.v[0] = 0; return off; }
  return smoothDamp(AVOID, 0, off, HELPER_CLEAR.ease, dt, HELPER_CLEAR.speed); // (at most `speed` rad/s: a quick dodge turned the whole plaça, dizzying on a big screen)
}
