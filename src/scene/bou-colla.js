// The Bou Tradicional's group, on the Drac's colla bodies (drac-colla.js), dressed in the UAF's garnet (models/colla.js
// BOU_SUIT): four attendants on W/N/S/E round its dance and the capatàs; no one seated (Marc: the Bou's colla is a
// few people, the Drac's and the Mulassa's seated rings read as too many here). GAME ADAPTATION, like the Mulassa's: the
// sources show the colla round the figure, not a fixed four-point formation. Its dance frame turns at FRONT (the
// approved dance), so the compass is the plaça's own, turned by `yaw` (stage.js BOU_COLLA_YAW): the play camera looks
// in between W and S, never over an attendant's shoulder.
import { createColla } from './drac-colla.js';
import { BOU_HELPER_LOOKS } from './models/colla.js';

// Its dance travels ≤ 1.1 m from the plaça's centre with a 2.7 m body (its ends ~1.6 m from its middle): the
// attendants 5.5 m out, as hers (4.6 put W and S in the play shot's corners), keep 2.5 m of air (tests/bou-colla.mjs).
export const BOU_HELPER_RADIUS = 5.5;
// each attendant in the compass frame (x = sin heading, z = cos heading; local +z faces the centre)
export const BOU_HELPERS = Object.freeze([['W', 0], ['N', 1.5 * Math.PI], ['S', 0.5 * Math.PI], ['E', Math.PI]].map(([id, a]) =>
  Object.freeze({ id, x: Math.sin(a) * BOU_HELPER_RADIUS, z: Math.cos(a) * BOU_HELPER_RADIUS, yaw: a + Math.PI })));
// The capatàs (Marc: near the dance, never one of the four marks): standing on the far side, between E and N, 5.2 m
// out, facing the centre, so the play camera sees him beside the Bou; his look is the last of BOU_HELPER_LOOKS.
export const BOU_CAPATAS = Object.freeze({ id: 'C', x: Math.sin(3.55) * 5.2, z: Math.cos(3.55) * 5.2, yaw: 3.55 + Math.PI });
// a compass-frame point in the plaça, the compass turned to `yaw`
export const bouToWorld = (x, z, yaw) => ({ x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) });
export const createBouColla = profile => createColla({ profile, spots: [...BOU_HELPERS, BOU_CAPATAS], seats: [],
  helperLooks: BOU_HELPER_LOOKS, name: 'bou-colla' });
