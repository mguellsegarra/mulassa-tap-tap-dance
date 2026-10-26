// The spectators: who stands where, their footprints, and the one skinned mesh that draws them.
import { rnd, pick, HATS, buildPerson, skinCrowd } from './models.js';
import * as THREE from 'three';
import { renderProfile, scene, plaza } from './stage.js';
import { sootMaterial } from '../figures/drac/drac-soot.js';
import { COLLAS } from '../figures/objects.js';

// The crowd are little agents: they creep closer to watch, and scatter when the mulassa's
// rear comes sweeping round. Seen in every video of the ball.
export const crowd = [];
// The band (models.js placeBand) stands at the ring's edge across the plaça from the play camera (it looks in from
// about 2.6 rad), a little to her left: in the shot behind her on every screen, facing her, never between the two
// (tests/render/render-quality.mjs). The ring leaves it room.
export const BAND_AZ = 5.3, BAND_ARC = 0.32;
// Footprints for the crowd's separation (animCrowd): a circle round each person that holds the shirt (0.46 x 0.28) and
// the arms hanging at the sides (±0.36); a kid is 0.72 of that, a grown-up with a kid on the shoulders reaches 0.38 m
// back. The band's spots (bandSpots): a wider circle 0.25 m in front of each musician, round the instrument.
export const RAD = { adult: 0.36, kid: 0.26, rider: 0.4, band: 0.55 }, REACH = 0.4;
// Making way («quan es mou, la gent s'aparta»): each spectator keeps `clear` m (+ up to `jitter`, + `row` per row back;
// kids `kid` less) from her body box and, while she spins, from the circle her rear sweeps (animCrowd). When she comes
// closer, they step back: eased (velocity over `ease` s), at most `flee` m/s, leaning back with a flinch of the arms
// (`flinch` rad); once she has gone (`back` m more room) they walk back to their spot at `home` m/s (stuck for
// `patience` s, e.g. someone else filled it: they stay where they are). Only people
// within `reach` m of that ring run the check. front: the front row's radius (rows 1.1 m apart behind it): her ends
// (2.3 m from her centre) come within `clear` of it as she turns, her sides (0.75 m) never do. `bold`: the ring's share left late in the song (1 = never bolder).
export const RING = { front: 5.4, clear: 3.8, kid: -0.4, jitter: 0.6, row: 0.9, flee: 1.3, gain: 3, ease: 0.3, back: 0.5, home: 0.35, flinch: 0.9, reach: 2.5, bold: 0.85, patience: 3,
  // the Drac's dance travels round the plaça's centre with its four helpers 4.5 m out (figures/drac/drac-layout.js): while it is
  // the figure, nobody stands closer to the centre than `arena` m (a soft wall, like the mid band's front): beyond the
  // colla members sitting round the helpers' ring (drac-colla.js SEATS, ~6 m). The Mulassa's (`arenaMula`): her whole
  // song's footprint reaches 4.98 m from its centre (figures/mulassa/mula-layout.js), her seated ring sits at ~6.1 m
  arena: 7.2, arenaMula: 6.7 };
// the dance ground's radius while a figure's colla is out (0: none): crowd.js keeps everyone beyond it
export const arenaNow = () => COLLAS.reduce((r, c) => (c.helpers.visible ? Math.max(r, RING[c.arena]) : r), 0); // (the Bou's: four attendants 5.5 m out, as hers, its capatàs at 6.4)
export function placeHome(p) {
  // the front row near enough that her turns reach it (RING); with a colla out, from the dance ground's edge
  const r = Math.max(RING.front + p.row * 1.1 + rnd(-0.4, 0.4), arenaNow() && arenaNow() + 0.3 + p.row * 0.6);
  p.pos.set(Math.cos(p.ang) * r, Math.sin(p.ang) * r);
  p.vel.set(0, 0); p.gx = p.gz = undefined; p.away = false; // (drawn there at once, no easing across)
}
for (let row = 0; row < renderProfile.rows; row++) {
  const n = Math.round(4.3 * (RING.front + row * 1.1)) + 5; // a little denser than ever (0.78–0.83 a metre round each row)
  for (let i = 0; i < n; i += renderProfile.stride) {
    const ang = (i / n) * Math.PI * 2 + row * 0.07 + rnd(-0.03, 0.03);
    const a = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a > 2.0 && a < 3.75) continue; // the play camera's side (CAM_AZ looks in from about 2.6 rad)
    const r0 = RING.front + row * 1.1, al = r0 * Math.cos(a - 2.62); // ...and its shot wedge (animCrowd), with room to spare
    if (al > 0.5 && Math.abs(r0 * Math.sin(a - 2.62)) < 2.1 + 0.45 * al) continue;
    if (Math.abs(a - BAND_AZ) < BAND_ARC) continue; // the band's spot
    const kid = Math.random() < 0.25, r = Math.random(), o = { kid };
    // variety: a kid on the shoulders, hats, ventalls
    if (!kid && r < 0.1) o.rider = true;
    else if (r < 0.26) o.hat = pick(HATS);
    else if (!kid && r < 0.36) o.fan = pick(['#b3122a', '#f5c518', '#14b8a6', '#f7f7f2']);
    const p = buildPerson(o);
    Object.assign(p, { ang, row, kid, fan: !!o.fan, rider: !!o.rider, rad: kid ? RAD.kid : o.rider ? RAD.rider : RAD.adult, ph: rnd(0, Math.PI * 2), pos: new THREE.Vector2(), vel: new THREE.Vector2(),
      slot: i, comfort: RING.clear + (kid ? RING.kid : 0) + rnd(0, RING.jitter) + row * RING.row, // how close they dare to stand (RING)
      spot: new THREE.Vector2(), away: false, way: 0, cap: 0.5, // cap: their eased speed limit (animCrowd)
      nerve: rnd(0.6, 1.4) });
    placeHome(p);
    scene.add(p.g);
    crowd.push(p);
  }
}
// one draw call for everyone (the band and, at high, the balcony people too); p.g/torso/legs/arms drive each pose
export const crowdMesh = skinCrowd([...crowd, ...plaza.band, ...plaza.balcony]);
crowdMesh.material = sootMaterial([...crowd, ...plaza.band, ...plaza.balcony], crowdMesh.skeleton.bones.length); // its own copy of SKIN_MAT: anyone in it can be charred (free mode's fire)
scene.add(crowdMesh);
