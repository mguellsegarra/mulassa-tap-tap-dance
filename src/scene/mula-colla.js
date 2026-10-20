// The Mulassa's group, on the Drac's colla bodies and costs (drac-colla.js): four attendants on her compass marks
// (game/mula-layout.js, in the dance frame: the owner places `helpers` with placeMulaDance) and a seated ring, placed by
// seatAt in the plaça; dressed as research/bestiari/mulassa/helpers-design.md describes (models/colla.js MULA_SUIT).
import { createColla } from './drac-colla.js';
import { MULA_HELPER_LOOKS, MULA_SEATED_LOOKS } from './models/colla.js';
import { MULA_HELPERS, MULA_SEATS, MULA_COMPASS, MULA_CENTRE, mulaToWorld } from '../game/mula-layout.js';

// a MULA_SEATS entry [angle from W, radius] in the plaça, for the dance frame turned to `yaw`
export function mulaSeatAt([a, r], yaw) {
  const m = MULA_COMPASS[0], c = Math.cos(a), n = Math.sin(a), dx = m.x * c + m.z * n, dz = -m.x * n + m.z * c;
  return mulaToWorld({}, MULA_CENTRE[0] + dx * r, MULA_CENTRE[1] + dz * r, yaw);
}
export const createMulaColla = (profile, seatAt) => createColla({ profile, spots: MULA_HELPERS, seats: MULA_SEATS, seatAt,
  helperLooks: MULA_HELPER_LOOKS, seatedLooks: MULA_SEATED_LOOKS, name: 'mula-colla' });
