// The Tombairot in the game (play, practice, results, the selector's showreel, «Mira el ball»): its dance
// (tomba-dance.js) posed at the SONG clock inside its dance frame (tomba-objects.js), the idle sway of the approved
// model (tombairot.js poseTombairot) on the song's beat under it, and the shared tap springs on top (tomba-play.js).
// No clock of its own: a pause or a collapse freezes the song second shown, a restart seeks it, the results keep it.
// Free play drives it like the others (driveTomba).
import { tomba, tombaColla, TOMBA_YAW } from './tomba-objects.js';
import { poseTombairot, TOMBA_SWAY_S } from './tombairot.js';
import { createTombaDance, newTombaPose, TOMBA_PIVOT_Z } from './tomba-dance.js';
import { tombaToWorld } from './tomba-colla.js';
import { TOMBA_JAW } from './tomba-head.js';
import { G, clock } from '../../game/state.js';
import { REEL, REEL_STILL } from '../../game/showreel.js';
import { danceSong, songTimeAtBeat } from '../../game/figure-song.js';
import { TOMBA_ID } from '../../game/figures.js';
import { PHOTO } from '../../game/photo-control.js';
import { CALM, LETTERS } from '../../core/env.js';
import { smooth } from '../../core/math.js';
import { tickColla } from '../common/colla.js';
import { collaRun } from '../common/colla-run.js';
import { lensShrink } from '../../scene/framing.js';
import { stepManualJump, beginManualFlight, manualContact } from '../../scene/manual-jump.js';

export const TOMBA_DANCE = { t: 0 }; // the song second shown
let tombaDance = null, tombaStillDance = null, tombaDanceSong = null;
// planned once per song it dances (game/choreo/: any song, its own or another's); under the selector's held shot, its
// still loop (tomba-dance.js: its bow on its spot) on that song's beat grid
const tombaDanceNow = () => {
  const s = danceSong(TOMBA_ID);
  if (s !== tombaDanceSong) { tombaDance = createTombaDance(s); tombaStillDance = createTombaDance(s, { still: true }); tombaDanceSong = s; }
  return REEL_STILL.on ? tombaStillDance : tombaDance;
};
export const prepareTombaMotion = () => { tombaDanceNow(); };
export const tombaEnd = () => tombaDanceNow().duration;
const TP = newTombaPose(), TP_LAG = newTombaPose(), TOMBA_FOOT = {};

// The model's own sway, bob and loose parts on the song's beat (a sway every two beats), the dance's pose on top.
// acc: { roll, pitch, neck, neckYaw, tail, col } the shared springs' accents and the collapse (0-1).
function poseTombaAt(t, acc) {
  const d = tombaDanceNow(), P = d.pose(t, TP), r = tomba, col = acc.col;
  r.root.position.set(P.x, 0, P.z); r.root.rotation.y = P.yaw;
  poseTombairot(r, P.beat * TOMBA_SWAY_S / 2, { amp: P.amp * (1 - col), hop: P.hop - P.dip, jaw: TOMBA_JAW + P.jaw + gapeAt(t) });
  r.body.rotation.x += acc.pitch + col * 0.06; r.body.rotation.z += acc.roll + col * 0.08; // a collapse: it slumps on its carriers
  r.neck.rotation.x += 0.55 * P.bow + acc.neck + col * 0.5; // the long neck bows (and droops, asleep)
  r.head.rotation.y += P.waggle + acc.neckYaw; r.head.rotation.x += 0.25 * P.bow;
  r.ears.forEach((e, i) => { e.rotation.z += (i ? 1 : -1) * P.ears; });
  r.pupils.forEach((e, i) => { e.position.x -= (i ? 1 : -1) * 0.03 * P.cross; }); // goggle-eyed: both to the nose
  // the tail has weight: a turn swings it out behind, late (the heading a quarter second ago)
  d.pose(Math.max(0, t - 0.25), TP_LAG);
  let lag = P.yaw - TP_LAG.yaw; lag = Math.atan2(Math.sin(lag), Math.cos(lag));
  r.tail.forEach((g, i) => { g.rotation.y += (0.25 + 0.2 * i) * lag + 0.04 * acc.tail; });
  for (let i = 0; i < 4; i++) { const f = d.foot(t, i, TOMBA_FOOT); r.feet[i].position.set(f.x, f.y, f.z); r.feet[i].rotation.set(0, f.yaw, 0); }
  return P;
}
// The both-buttons answer (judge.js): TOMBA!, a wide gape on the song clock (a pause holds it, a restart drops it)
const GAPE = { at: -9 };
const gapeAt = t => { const s = t - GAPE.at; return s < 0 || s > 0.6 ? 0 : 0.35 * Math.sin(Math.PI * Math.min(1, s / 0.6)); };
export function tombaGape() { GAPE.at = TOMBA_DANCE.t; }

// Fills `pos` (the plaça's metres: its pivot, the body's middle) and returns the world heading.
export function danceTomba(beat, dt, acc, pos) {
  const reel = REEL.on && G.state === 'select', dancing = G.state === 'play' || reel;
  if (TOMBA_LIVE.parked && !dancing && G.state === 'select') return driveTomba(dt, TOMBA_LIVE.at, 0, 0, pos); // free play, just looking: it stays where it was driven
  if (TOMBA_LIVE.parked) { TOMBA_LIVE.parked = false; TOMBA_JUMP.air = TOMBA_JUMP.airV = 0; tombaFeetHome = false; }
  tomba.frame.rotation.y = TOMBA_YAW; tomba.frame.position.set(0, 0, 0);
  if (REEL_STILL.on) TOMBA_DANCE.t = clock; // its still loop: no end to wrap
  else if (G.practice || !dancing && G.state !== 'results') TOMBA_DANCE.t = 0; // the practice and the menus: its stance
  else if (reel || dancing && !G.collapseT && !G.paused) TOMBA_DANCE.t = Math.max(0, songTimeAtBeat(beat));
  const P = poseTombaAt(TOMBA_DANCE.t, acc), s = Math.sin(P.yaw), c = Math.cos(P.yaw);
  const w = tombaToWorld(P.x + TOMBA_PIVOT_Z * s, P.z + TOMBA_PIVOT_Z * c, TOMBA_YAW);
  pos.set(w.x, w.z);
  return TOMBA_YAW + P.yaw;
}
// One still pose (the share photo, share-capture.js): its last bow
export function poseTomba(t) { return poseTombaAt(t, TOMBA_REST); }
const TOMBA_REST = { roll: 0, pitch: 0, neck: 0, neckYaw: 0, tail: 0, col: 0 };

// Free play (photo mode): driven like the others (game/photo-control.js movePhoto), body = its pivot. Space hops (the
// whole rig, carriers and all), E held bows its long neck, Q held wags its tail, R is every figure's half turn. Its
// carriers step when their feet fall a stride behind; parked where it stopped while free play looks around.
export const TOMBA_LIVE = { parked: false, at: { x: 0, z: 0, yaw: 0 }, bow: 0, wag: 0 };
const TOMBA_JUMP = { air: 0, airV: 0 };
const TOMBA_STEPS = Array.from({ length: 4 }, () => ({ x: 0, z: 0, fx: 0, fz: 0, t: 1 }));
const TOMBA_HOMES = [[-0.13, 0.1], [0.13, 0.1], [-0.13, -1.6], [0.13, -1.6]], STRIDE = 0.3, SWING_S = 0.22;
let tombaClock = 0, tombaFeetHome = false;
export function driveTomba(dt, body, vx, vz, pos) {
  tombaClock += dt; TOMBA_LIVE.parked = true;
  Object.assign(TOMBA_LIVE.at, { x: body.x, z: body.z, yaw: body.yaw });
  const driving = PHOTO.on && PHOTO.id === TOMBA_ID, keys = PHOTO.keys;
  if (driving && PHOTO.action) { if (TOMBA_JUMP.air === 0 && dt > 0) { TOMBA_JUMP.airV = CALM.matches ? 1.4 : 4.4; beginManualFlight(TOMBA_ID); } PHOTO.action = false; }
  const hit = stepManualJump(TOMBA_JUMP, dt);
  if (hit > 2) manualContact(TOMBA_ID, hit);
  if (driving) PHOTO.air = TOMBA_JUMP.air > 0; // airborne: it keeps its momentum (movePhoto)
  const ease = dt > 0 ? 1 - Math.exp(-dt / 0.18) : 0, reduce = CALM.matches ? 0.4 : 1;
  TOMBA_LIVE.bow += ((driving && keys.has('KeyE') ? reduce : 0) - TOMBA_LIVE.bow) * ease;
  TOMBA_LIVE.wag += ((driving && keys.has('KeyQ') ? reduce : 0) - TOMBA_LIVE.wag) * ease;
  const f = tomba.frame, r = tomba, s = Math.sin(body.yaw), c = Math.cos(body.yaw), speed = Math.hypot(vx, vz);
  f.rotation.y = 0; f.position.y = TOMBA_JUMP.air; // the plaça's own frame: the driven body is in world metres
  r.root.position.set(body.x - TOMBA_PIVOT_Z * s, 0, body.z - TOMBA_PIVOT_Z * c); r.root.rotation.y = body.yaw;
  poseTombairot(r, tombaClock, { amp: 0.6 + Math.min(1, speed / 3) * 0.6, jaw: TOMBA_JAW + 0.25 * TOMBA_LIVE.bow });
  r.neck.rotation.x += 0.6 * TOMBA_LIVE.bow; r.head.rotation.x += 0.2 * TOMBA_LIVE.bow;
  r.tail.forEach((g, i) => { g.rotation.y += TOMBA_LIVE.wag * (0.2 + 0.15 * i) * Math.sin(tombaClock * 12 - i * 0.8); });
  // the carriers: a foot more than a stride from its home steps there (a little ahead, at the body's speed), one of a
  // carrier's pair at a time
  for (let i = 0; i < 4; i++) {
    const [hx, hz] = TOMBA_HOMES[i], st = TOMBA_STEPS[i], x = r.root.position.x + hx * c + hz * s, z = r.root.position.z - hx * s + hz * c;
    if (!tombaFeetHome) Object.assign(st, { x, z, fx: x, fz: z, t: 1 });
    st.t = Math.min(1, st.t + dt / SWING_S);
    const partner = TOMBA_STEPS[i ^ 1];
    if (st.t >= 1 && partner.t >= 1 && Math.hypot(x - st.x, z - st.z) > STRIDE) Object.assign(st, { fx: st.x, fz: st.z, x: x + vx * SWING_S, z: z + vz * SWING_S, t: 0 });
    const e = smooth(st.t), foot = r.feet[i];
    foot.position.set(st.fx + (st.x - st.fx) * e, 0.07 * Math.sin(Math.PI * st.t), st.fz + (st.z - st.fz) * e); foot.rotation.set(0, body.yaw, 0);
  }
  tombaFeetHome = true;
  r.root.updateMatrixWorld(true);
  pos.set(body.x, body.z);
  return body.yaw;
}

// Its colla, every frame, as the Bou's: shown with it (not in free play), clapping on the music's beat in a run and the
// showreel, cheering through the finale; a pause or a collapse freezes them on the beat it froze on.
export const TOMBA_COLLA_SPOTS = []; // fixed obstacles for the crowd while it is out (crowd.js)
const TOMBA_TICK = { obstacles: TOMBA_COLLA_SPOTS, toWorld: h => tombaToWorld(h.x, h.z, TOMBA_YAW), frozenBeat: 0, run: {}, labels: LETTERS, shrink: lensShrink, cheer: 0 };
export function tombaCollaTick(on, beat, dt) {
  if (!tombaColla) return;
  const run = collaRun(TOMBA_TICK.run);
  if (!(run.play && (run.paused || run.collapsed))) TOMBA_TICK.frozenBeat = beat;
  TOMBA_TICK.cheer = TP.move === 'finale' || TP.move === 'end' ? 1 : 0;
  tickColla(tombaColla, on && !PHOTO.on, beat, dt, TOMBA_TICK);
}
