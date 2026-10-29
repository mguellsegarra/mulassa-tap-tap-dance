// The crowd's behaviour: making way for her, creeping in, walking home and keeping clear of the shot (steer), a figure's
// knocks (crowd-effects.js) and the frame's order of steps (animCrowd). The mood, the grid and the pose live in crowd-mood.js,
// crowd-grid.js and crowd-pose.js.
import { PHOTO } from '../game/photo-control.js';
import { photoClearance } from './photo-collision.js';
import { updatePhotoExtras, photoEscape, stepPhotoPerson } from './photo-obstacles.js';
import * as THREE from 'three';
import { figureReach } from '../game/figure-song.js';
import { pick } from './models.js';
import { plaza } from './stage.js';
import { clock, G } from '../game/state.js';
import { activeCrowd, bandSpots, midCrowd, MID, animateRenderQuality } from './quality.js';
import { M, PIVOT } from './figure-springs.js';
import { PAIR } from '../figures/drac/drac-play.js';
import { RING, REACH, arenaNow } from './crowd-build.js';
import { bubble, at } from '../hud/bubbles.js';
import { crowdAnchored, crowdSteer, crowdPose, crowdTick, crowdKnock } from './crowd-effects.js';
import { crowdRadius, settleDrawnCrowd } from './crowd-contact.js';
import { traitsOf } from '../figures/index.js';
import { GROOVE, mood, SHOVE, F, grooveHit, updateMood } from './crowd-mood.js';
import { crowdCells, recell, separate, photoCrowdClearance, fillCells } from './crowd-grid.js';
import { pose, poseScenery } from './crowd-pose.js';

const local = new THREE.Vector2(), away = new THREE.Vector2(), tmp = new THREE.Vector2();
// Step 2: where one person goes: they make way for her (RING), creep in to watch, walk back to their spot, keep clear of the play camera's shot and of each other (a soft push; separate() is the hard limit).
function steer(p, dt, beat, live) {
  if (crowdSteer(p, dt)) { recell(p); return; } // a figure moves them itself (the Bou's conga: bou-crowd.js)
  if (crowdAnchored(p)) { p.vel.set(0, 0); p.rest = false; return; } // rooted to the spot by a figure (the Drac's soot): a fixed footprint
  const { slow, ringE, velK, wayIn, wayOut } = F, { shoveK } = mood;
  // during the song only the front row and the first ring (NEAR) make way; the rows behind hold unless she is right
  // on them (1.2 m): fewer movers, less CPU, and the ones people watch still react
  const dx = p.pos.x - M.pos.x, dz = p.pos.y - M.pos.y, want = G.state === 'play' && p.row && !p.near ? Math.min(1.2, p.comfort * F.bold) : p.comfort * F.bold + (shoveK && G.state === 'play' ? SHOVE.extra * shoveK : 0);
  // clearance to her body (a box in her frame, y = forward) and, while she spins, to the circle her rear sweeps
  // round the pivot; only near the ring (RING.reach): everyone further out is simply clear
  const scale = PAIR.k ? 1 : figureReach(); // M is the Mulassa while the scene pair is visible
  const dpx = p.pos.x - M.pivot.x, dpz = p.pos.y - M.pivot.y, dp = Math.hypot(dpx, dpz) || 1;
  let clear = 99;
  if (dp < want + RING.reach + PIVOT + 2.4 * scale) {
    local.set(dx * F.cy - dz * F.sy, dx * F.sy + dz * F.cy);
    clear = Math.hypot(Math.max(0, Math.abs(local.x) - 0.75 * scale), Math.max(0, Math.abs(local.y) - 2.3 * scale));
    if (F.sweep > 0.2) clear = Math.min(clear, dp - (PIVOT + 2.1) * scale * F.sweep);
  }
  if (PHOTO.on) clear = photoClearance(M.pos.x, M.pos.y, M.yaw, p.pos.x, p.pos.y, 0, traitsOf(PHOTO.id).wideClearance);
  // the splash's Drac beside her (stage-motion.js PAIR): a round footprint, made way for like her
  const qx = p.pos.x - PAIR.x, qz = p.pos.y - PAIR.z, qd = PAIR.k ? Math.hypot(qx, qz) || 1 : 99, pairClear = qd - 1.5;
  if (pairClear < clear) clear = pairClear;
  tmp.set(0, 0);
  let photoFear = 0;
  if (PHOTO.on) {
    photoEscape(p.pos.x, p.pos.y, away);
    photoFear = away.fear;
    clear = Math.min(clear, want - photoFear);
  }
  const fleeing = clear < want, fleeSpeed = PHOTO.on ? Math.max(3.4, PHOTO.speed * 1.3) : RING.flee; // photo: they outrun her gallop
  if (fleeing) { // make way: step back from the nearest danger (the rear if it's swinging, else the body), capped
    const rx = p.pos.x - F.rearX, rz = p.pos.y - F.rearZ, rd = Math.hypot(rx, rz) || 1;
    if (PHOTO.on && photoFear > 0) { /* the anticipated corridor already set away */ }
    else if (clear === pairClear) away.set(qx / qd, qz / qd);
    else if (F.sweep > 0.2 && rd < 3) away.set(rx / rd, rz / rd); else away.set(dpx / dp, dpz / dp);
    tmp.copy(away).multiplyScalar(Math.min(fleeSpeed, (want - clear) * RING.gain * p.nerve));
    p.away = G.state === 'play';
    if (G.state === 'play' && want - clear > 0.6 && clock - (G.uiT || -9) > 1.2 && Math.random() < dt * 3) { // one shout at a time (per second, not per frame: same at 60 and 120 fps)
      G.uiT = clock; bubble(pick(['UI!', 'COMPTE!', 'ALERTA!', 'AI!']), at(p.g, 2.3));
    }
  } else if (!PHOTO.on && G.state !== 'play' && clear > want + 0.4) { // creep in to watch (not while the song plays: they hold their spot)
    tmp.set(-dx, -dz).normalize().multiplyScalar(Math.min(0.7, (clear - want) * 0.35) * live);
  } else if (p.away && clear > want + RING.back) { // she has gone: back to their spot, slowly
    const sx = p.spot.x - p.pos.x, sz = p.spot.y - p.pos.y, sd = Math.hypot(sx, sz);
    if (sd > 0.1) tmp.set(sx, sz).multiplyScalar(Math.min(RING.home, sd * 0.8) / sd); else p.away = false;
  }
  if (p.away && p.vel.lengthSq() < 0.0025 && (p.stuck = (p.stuck || 0) + dt) > RING.patience) p.away = false; // their way back is blocked: stay here
  if (G.state !== 'play' || !p.away) { p.away = false; p.stuck = 0; }
  if (!PHOTO.on && midCrowd?.mesh.count && dp > MID.edge - 1.2) { // the mid band's front (its figures never step aside): a firm soft wall before the hard stop below
    const rr = p.pos.length(), over = rr - (MID.edge - 0.8);
    if (over > 0 && p.pos.x * MID.fx + p.pos.y * MID.fz > rr * MID.cos) { tmp.x -= (p.pos.x / rr) * over * 10; tmp.y -= (p.pos.y / rr) * over * 10; }
  }
  const arena = arenaNow();
  if (arena) { // the figure's dance ground and its colla (shown only with it, never in photo mode): a soft wall round the centre
    const rr = p.pos.length() || 1, under = arena - rr, sr = p.spot.length();
    if (under > 0) { tmp.x += (p.pos.x / rr) * under * 10; tmp.y += (p.pos.y / rr) * under * 10; }
    if (sr < arena + 0.3) p.spot.multiplyScalar((arena + 0.3) / (sr || 1)); // nobody's spot to come back to is inside it (nor against it)
  }
  if (!p.away && (p.rest || G.state !== 'play')) p.spot.copy(p.pos); // where they stand (to come back to)
  if (fleeing || p.way) { p.way += ((fleeing ? 1 : 0) - p.way) * (fleeing ? wayIn : wayOut); if (p.way < 1e-5) p.way = 0; } // the flinch (eased)
  if (F.shotD) { // stand back from the play camera's shot: out of the wedge between the lens and her
    const ox = p.pos.x - M.pos.x, oz = p.pos.y - M.pos.y, along = ox * F.shotX + oz * F.shotZ, side = ox * F.shotZ - oz * F.shotX;
    const half = 1.6 + 0.45 * along;
    if (along > 1 && along < F.shotD + 1 && Math.abs(side) < half) {
      const k = (half - Math.abs(side)) * 8 * (side < 0 ? -1 : 1);
      tmp.x += F.shotZ * k; tmp.y -= F.shotX * k;
    }
  }
  // While the song plays, someone standing at rest (nothing pushing, not moving) stays put and costs nothing: no
  // neighbour search, no step. Movers still keep clear of them (their own search, separate()).
  if (slow && p.rest && !tmp.x && !tmp.y) return;
  // The nearby metre-wide cells include the larger footprints: a soft push keeps 0.2 m of air between
  // footprints (separate() below is the hard limit), and an arm's length more towards her: clapping and cheering
  // hands reach 0.6 m forward, into the shoulders of whoever stands in front.
  const cellX = p.cell % 32, cellZ = Math.floor(p.cell / 32), dm = Math.hypot(dx, dz) || 1;
  for (let z = Math.max(0, cellZ - 2); z <= Math.min(31, cellZ + 2); z++) {
    for (let x = Math.max(0, cellX - 2); x <= Math.min(31, cellX + 2); x++) {
      for (const q of crowdCells[x + z * 32]) {
        if (q === p) continue;
        const sx = p.pos.x - q.pos.x, sz = p.pos.y - q.pos.y, d2 = sx * sx + sz * sz;
        if (d2 > 3.24 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), ahead = Math.max(0, (sx * dx + sz * dz) / (d * dm)); // q between p and her
        const presence = Math.min(p.qualityScale ?? 1, q.qualityScale ?? 1);
        const room = crowdRadius(p) + crowdRadius(q) + (0.2 + REACH * ahead) * presence;
        if (d < room) { tmp.x += (sx / d) * (room - d) * 6 * presence; tmp.y += (sz / d) * (room - d) * 6 * presence; }
      }
    }
  }
  if (slow) { // the song: gentle starts and stops, and a walking pace at most (making way: RING.flee)
    p.vel.lerp(tmp, velK);
    p.cap += ((fleeing ? RING.flee : GROOVE.maxV) - p.cap) * ringE; // (eased: no sudden brake after making way)
    const v = p.vel.length();
    if (v > p.cap) p.vel.multiplyScalar(p.cap / v);
    p.rest = !fleeing && tmp.lengthSq() < 0.0025 && v < 0.02;
    if (p.rest) p.vel.set(0, 0);
  } else { // the menus: brisker, but making way stays eased and capped too
    p.vel.lerp(tmp, fleeing ? ringE : Math.min(1, dt * 8)); p.rest = false;
    const cap = fleeing ? fleeSpeed : 1.3, v = p.vel.length();
    if (v > cap) p.vel.multiplyScalar(cap / v); // neighbour repulsion must not accelerate a menu spectator without a bound
  }
  if (PHOTO.on) crowdKnock(p, dt, dx, dz); else if (p.downT > 0) p.vel.set(0, 0); // (photo mode left mid-fall: they still get up first)
  const r0 = p.pos.length();
  if (PHOTO.on) p.vel.copy(stepPhotoPerson(p,p.vel.x,p.vel.y,dt,photoCrowdClearance));
  else p.pos.addScaledVector(p.vel, dt);
  const r = p.pos.length();
  if (!PHOTO.on && r > MID.edge) { // the edge of the plaça; on the far side the mid band's front (its figures never step aside)
    const lim = midCrowd?.mesh.count && p.pos.x * MID.fx + p.pos.y * MID.fz > r * MID.cos ? MID.edge : 13;
    // a stop, never a pull: whoever walks round into the mid band's arc from beyond its edge stays as far out as they
    // were (the soft wall above walks them in) instead of being snapped in
    if (r > lim) p.pos.multiplyScalar(Math.max(lim, Math.min(r, r0)) / r);
  }
  recell(p);
}

let cheerSeen = -9;
export function animCrowd(dt, beat, t, live = 1) {
  if (M.cheerT !== cheerSeen) { cheerSeen = M.cheerT; if (G.state === 'play') grooveHit(GROOVE.big); } // the figure's cheer cue (the Mulassa's culades, charges, final hit: mula-scene.js)
  if (!PHOTO.on) updatePhotoExtras(dt);
  dt = Math.max(0, dt); // (a clock stepped backwards must not blow up the exponential easing)
  const backgroundContacts = fillCells();
  updateMood(dt, t, live);
  crowdTick(activeCrowd);
  for (const p of activeCrowd) steer(p, dt, beat, live);
  separate();
  for (const p of activeCrowd) pose(p, dt, beat, live);
  settleDrawnCrowd(activeCrowd, bandSpots, 2.5 * dt, backgroundContacts); // (as fast as a brisk walk; the shrunk-away are skipped)
  poseScenery(beat, live);
  for (const p of plaza.band) crowdPose(p); // the figures' marks (the Drac's soot): the band and the balconies too
  for (const p of plaza.balcony) crowdPose(p);
  animateRenderQuality(dt); // apply quality presence after the gameplay presence, without changing its state
}
