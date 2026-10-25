// The Drac's colla in the plaça (built by figures/common/colla.js): the four helpers who clap the beat round the dance
// (fixed references for the carrier: they never follow, drift or turn with it) and a few members sitting on the paving by the band.
// `helpers` is in the dance frame (m): its owner places it with placeDance, like the Drac's parent. `seated` is in the
// plaça (m, origin = the helpers' centre). update(beat, energy) is a pure function of the song's beat: seekable.
import { HELPERS } from './drac-layout.js';
import { HELPER_LOOKS, SEATED_LOOKS } from '../../scene/models/colla.js';
import { createColla } from '../common/colla.js';

// Where the members sit (spread round the helpers' ring, not in a heap): on the paving just outside the four helpers
// (5.1 m out, drac-layout.js), in the three gaps between them that the play camera does not look through (it looks in
// between S and E, ~2.99 rad): E-N ~1.42, N-W ~6.27 (behind the Drac, the band's side) and W-S ~4.56. One a gap first,
// so every quality shows the ring, then the others ~0.3-0.4 rad either side, across each gap (less on the camera's side). Clear of the dance, the helpers, the camera's shot and the crowd, which stands beyond
// crowd-build RING.arena while the Drac is out (tests/figures/drac/drac-colla.mjs).
// [azimuth (rad, x = r cos a, z = r sin a), radius (m), posture (models/colla-seated.js SEATED), look]
export const SEATS = [
  [1.42, 6.0, 0, 0], [6.27, 6.0, 1, 1], [4.56, 6.0, 2, 2],
  [1.0, 6.1, 1, 3], [4.14, 6.1, 0, 4], [5.85, 6.1, 2, 3], [1.72, 6.1, 0, 2],
];

const dracSeat = ([a, r]) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });
export const createDracColla = profile => createColla({ profile, spots: HELPERS, seats: SEATS, seatAt: dracSeat,
  helperLooks: HELPER_LOOKS, seatedLooks: SEATED_LOOKS, name: 'colla' });
