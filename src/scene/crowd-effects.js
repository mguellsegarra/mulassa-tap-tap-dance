// What the playable figures do to the people round them (the crowd, the band, the balconies), each from its own folder
// (figures/<key>/<key>-crowd.js); a new figure adds its line here. An effect set may have: anchored(p) (rooted to the
// spot), pose(p) (drawn over the live pose), steer(p, dt) (moves them itself: true), knock(p, dt, dx, dz) (free play: after
// their own steering), tick(crowd), pace(p) (m/s its drawn bodies may catch up), hop(p, beat, festa),
// arms(p, beat, clock, festa, A) and festa() (0-1: how wild the plaça goes).
import { MULA_CROWD } from '../figures/mulassa/mula-crowd.js';
import { DRAC_CROWD } from '../figures/drac/drac-crowd.js';
import { BOU_CROWD } from '../figures/bou/bou-crowd.js';

export const CROWD_EFFECTS = [MULA_CROWD, DRAC_CROWD, BOU_CROWD].filter(Boolean); // an unreleased figure's is null in a build
// (plain loops: these run per person, every frame, with no allocation)
export function crowdAnchored(p) { for (const e of CROWD_EFFECTS) if (e.anchored?.(p)) return true; return false; }
export function crowdSteer(p, dt) { for (const e of CROWD_EFFECTS) if (e.steer?.(p, dt)) return true; return false; }
export function crowdPose(p) { for (const e of CROWD_EFFECTS) e.pose?.(p); }
export function crowdKnock(p, dt, dx, dz) { for (const e of CROWD_EFFECTS) e.knock?.(p, dt, dx, dz); }
export function crowdTick(crowd) { for (const e of CROWD_EFFECTS) e.tick?.(crowd); }
export function crowdPace(p) { let v = 0; for (const e of CROWD_EFFECTS) v = Math.max(v, e.pace?.(p) ?? 0); return v; }
export function crowdHop(p, beat, festa) { let h = 0; for (const e of CROWD_EFFECTS) h += e.hop?.(p, beat, festa) ?? 0; return h; }
export function crowdArms(p, beat, clock, festa, A) { let k = 0; for (const e of CROWD_EFFECTS) k = Math.max(k, e.arms?.(p, beat, clock, festa, A) ?? 0); return k; }
export function festaNow() { let k = 0; for (const e of CROWD_EFFECTS) k = Math.max(k, e.festa?.() ?? 0); return k; }
