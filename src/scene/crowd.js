// The crowd's behaviour: making way for her, its mood, reactions to hits and to the finale, neighbour separation.
import { PHOTO, PHOTO_SPIN } from '../game/photo-control.js';
import { photoClearance } from './photo-collision.js';
import { photoExtras, updatePhotoExtras, photoEscape, stepPhotoPerson, photoPersonClearance } from './photo-obstacles.js';
import { pushPulse, rippleLive, RIPPLE, ripple } from './crowd-fx.js';
import * as THREE from 'three';
import { judgedCount } from '../game/progress.js';
import { song, figureScale } from '../game/figure-song.js';
import { pick, poseBand } from './models.js';
import { renderProfile, camera, plaza, colla, mulaColla } from './stage.js';
import { CALM } from '../core/env.js';
import { clock, G, chip, figureSfx } from '../game/state.js';
import { activeCrowd, bandSpots, midCrowd, MID, animateRenderQuality } from './quality.js';
import { M, PIVOT, PAIR } from './mula-motion.js';
import { COLLA_SPOTS } from './drac-dance.js';
import { MULA_COLLA_SPOTS } from './mula-stage.js';
import { RING, REACH, arenaNow } from './crowd-build.js';
import { easeIn, smooth01, TAU } from '../core/anim.js';
import { bubble, at } from '../hud/bubbles.js';
import { sootPose, sootAnchored } from './drac-soot.js';
import { crowdRadius, backdropContacts, settleDrawnCrowd } from './crowd-contact.js';

// During the song (not the finale) the plaça stands still and only answers the player's hits, gently: one "groove"
// envelope a frame for everyone. A hit re-arms `kick` (a GUAPA, a GLOBUS pop or a well-played phrase a bit more; a
// miss only lets it settle sooner); `kick` decays over `release` and a chain of one-pole filters (`attack`) rounds
// its rise, so nothing ever steps. Each person reads two taps of the chain (their own slight lag) times their own
// gain: the plaça never moves as one. Amplitudes: bob (m), nod / sway (rad, torso), arms (rad, a small lift), breath.
// maxV: how fast anyone may walk while the song plays (m/s; fleeing her is exempt).
export const GROOVE = { hit: 1, good: 0.8, big: 1.5, pump: 0.5, phrase: 1.3, miss: 0.35, attack: 0.045, release: 0.38,
  bob: 0.03, nod: 0.05, sway: 0.035, arms: 0.14, breath: 0.006, maxV: 0.5 };
// Everything the crowd's mood remembers between frames (eased every frame in updateMood; hits and the judge only nudge kick/shove).
export const mood = {
  respect: 50, // the ànim it reads (G.guapo, or a calm 70 on the menus)
  waveK: 0, // the arms-up wave running round the ring (the finale, a clear result)
  kick: 0, gr1: 0, gr2: 0, gr3: 0, gr4: 0, grSide: 0, grSideT: 0, // the groove: the hit envelope and its chain of filters
  calmK: 0, partyK: 0, festK: 0, sadK: 0, clapK: 0, // the eased mood weights
  shoveK: 0, shoveUntil: -1, // a GUAPA shoves the ring
  presK: 1, murT: 0, ringBeat: 0, ringStreak: 0, nearT: 0,
};
export const settleGroove = k => { mood.kick *= k; }; // a miss: the plaça settles sooner, nothing more
export const shoveRing = () => { mood.shoveUntil = clock + SHOVE.hold; };
export function grooveHit(amount, side = 0) { // side: +1 GUA, -1 PA, 0 both (a straight nod)
  mood.kick = Math.min(GROOVE.big, Math.max(mood.kick, amount));
  mood.grSideT = side;
  if (amount >= 0.6 && renderProfile.ripple >= 0 && !CALM.matches) pushPulse(clock, amount, side, amount >= GROOVE.big ? 1 : 0.2 + 0.35 * amount); // it travels round the ring (crowd-fx.js)
}
// What a pulse does to whoever it reaches: a hop (m), a nod (rad, torso), arms up (rad); times the pulse's 0..1.5.
const RIP = { bob: 0.04, nod: 0.06, arms: 0.5 };
// A GUAPA (a big hit) shoves the ring: for `hold` s the front row and the first ring want `extra` m more room, so the
// existing making-way (RING: eased, capped, hands up, «ep!») steps them back, and they walk home once it eases (`out`).
export const SHOVE = { extra: 0.9, hold: 0.5, in: 0.12, out: 0.9 };
// The plaça fills with how well it goes: once `after` notes are judged, about 40% of the rows behind the front (they
// stand out in the back rows, `thr` 0.55-0.92, from their own draw) are only there while the ENCERTS % is above their
// threshold: they shrink away / pop back (eased, `soft` = the % it takes to go from gone to whole). Never in the
// finale, the menus or the practice. Hidden = scale 0, which the skinned crowd mesh skips. `slow`: s it takes the % to arrive.
const PRES = { after: 8, slow: 2.5, soft: 0.06 };
// The first ring (NEAR): only the few people nearest her that the camera sees (PROFILES near; picked again every
// `every` s, each fading in and out over `fade` s) answer the same groove more: a slower tap of its chain (gr4,
// `attack`), times 1 + `streak` as the combo nears `streakAt`, capped at `cap`, as a bigger bob (m), nod and arm lift
// (rad); and while the combo holds `combo` or more, a light bounce on the beat (`bounce` m). Everyone else stays calm.
const PARTY = 1, PARTY_HOP = 1.6; // section B lifts the still mood all the way; its hop is PARTY_HOP x the old B hop (0.12 m -> ~0.19 m; the finale's is 0.35)
const NEAR = { every: 0.6, fade: 0.6, attack: 0.08, bob: 0.045, nod: 0.07, arms: 0.5, streak: 0.5, streakAt: 30, cap: 2, combo: 10, bounce: 0.03 };
const nearList = [], nearV = new THREE.Vector3();
function pickNear(n) { // a few projections and a sort of a hundred people, twice a second at most
  camera.updateMatrixWorld();
  nearList.length = 0;
  for (const p of activeCrowd) {
    p.near = false;
    if (p.thr && !p.pres) continue; // not there
    nearV.set(p.pos.x, 1.2, p.pos.y).project(camera);
    const seen = Math.abs(nearV.x) < 0.95 && Math.abs(nearV.y) < 0.95 && nearV.z < 1;
    const d = Math.hypot(p.pos.x - M.pos.x, p.pos.y - M.pos.y);
    p.nearS = d + (seen ? 0 : 100);
    p.dM = d; p.side = Math.max(-1, Math.min(1, -nearV.x * 1.5)); // for the ripple: distance to her, and which side of the screen (+1 left = GUA)
    nearList.push(p);
  }
  nearList.sort((a, b) => a.nearS - b.nearS);
  for (let i = 0; i < Math.min(n, nearList.length); i++) nearList[i].near = true;
}
const local = new THREE.Vector2(), away = new THREE.Vector2(), tmp = new THREE.Vector2();
const crowdCells = Array.from({ length: 32 * 32 }, () => []), usedCells = [];
const cellPush = (k, p) => { if (!crowdCells[k].length) usedCells.push(k); crowdCells[k].push(p); };
const crowdCell = p => Math.max(0, Math.min(31, Math.floor(p.pos.x + 16)))
  + 32 * Math.max(0, Math.min(31, Math.floor(p.pos.y + 16)));
function recell(p) {
  const nextCell = crowdCell(p);
  if (nextCell === p.cell) return;
  const previous = crowdCells[p.cell];
  previous.splice(previous.indexOf(p), 1);
  cellPush(nextCell, p); p.cell = nextCell;
}
// The hard limit: no two footprints (RAD circles) ever overlap, whatever the forces did this frame (fleeing the rear,
// creeping in, the camera's wedge, the edge of the plaça). Overlapping pairs are pulled apart along the line between
// them, half each (all of it by a mover when the other is fixed: the band), and the velocity into
// the neighbour is dropped so they don't walk on the spot. Four sweeps over the nearby cells, including the larger mobility footprints.
function separate() {
  for (let it = 0; it < 4; it++) {
    for (const p of activeCrowd) {
      if (p.rest || sootAnchored(p)) continue; // at rest during the song (or charred stiff): only a mover can reach them, and resolves it
      const cellX = p.cell % 32, cellZ = Math.floor(p.cell / 32);
      for (let z = Math.max(0, cellZ - 2); z <= Math.min(31, cellZ + 2); z++) {
        for (let x = Math.max(0, cellX - 2); x <= Math.min(31, cellX + 2); x++) {
          for (const q of crowdCells[x + z * 32]) {
            if (q === p) continue;
            let sx = p.pos.x - q.pos.x, sz = p.pos.y - q.pos.y;
            const presence = Math.min(p.qualityScale ?? 1, q.qualityScale ?? 1);
            const min = crowdRadius(p) + crowdRadius(q) + 0.04 * presence, d2 = sx * sx + sz * sz;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2);
            if (d > 1e-6) { sx /= d; sz /= d; } else { sx = Math.cos(p.ang); sz = Math.sin(p.ang); } // on top of each other: outwards
            const stiff = q.fixed || sootAnchored(q), overlap = min - d;
            let pushP = overlap * (stiff ? 1 : 0.5), pushQ = stiff ? 0 : overlap * 0.5;
            if (PHOTO.on) { // neighbour separation must not undo a safe detour by pushing someone into a figure or tree
              const pBase = Math.min(0,photoPersonClearance(p,p.pos.x,p.pos.y))-1e-7;
              const qBase = stiff ? 0 : Math.min(0,photoPersonClearance(q,q.pos.x,q.pos.y))-1e-7;
              if (photoPersonClearance(p,p.pos.x+sx*pushP,p.pos.y+sz*pushP)<pBase) { pushP=0;pushQ=stiff?0:overlap; }
              if (pushQ && photoPersonClearance(q,q.pos.x-sx*pushQ,q.pos.y-sz*pushQ)<qBase) {
                pushQ=0;pushP=photoPersonClearance(p,p.pos.x+sx*overlap,p.pos.y+sz*overlap)>=pBase?overlap:0;
              }
            }
            p.pos.x += sx * pushP; p.pos.y += sz * pushP;
            const pv = p.vel.x * sx + p.vel.y * sz;
            if (pv < 0) { p.vel.x -= sx * pv; p.vel.y -= sz * pv; }
            if (!stiff) {
              q.pos.x -= sx * pushQ; q.pos.y -= sz * pushQ; q.rest = false; // nudged: it checks its own neighbours next
              const qv = q.vel.x * sx + q.vel.y * sz;
              if (qv > 0) { q.vel.x -= sx * qv; q.vel.y -= sz * qv; }
            }
          }
        }
      }
    }
    for (const p of activeCrowd) recell(p);
  }
}
// This frame's numbers, shared by the steps below (one object, reused: nothing is allocated per frame).
const F = { calm: false, moodK: 0, eager: 0, ex: 0, beatHop: 0, nearFade: 0, wayIn: 0, wayOut: 0, ringE: 0, velK: 0, presE: 0, ripE: 0, standE: 0, showE: 0, fanE: 0,
  slow: false, bold: 1, wavePos: 0, rippling: false, cy: 1, sy: 0, sweep: 0, rearX: 0, rearZ: 0, shotX: 0, shotZ: 0, shotD: 0 };

// Step 1: the mood, every part eased in real time (no pose ever switches in one frame): calm = the song itself, the plaça
// still, answering hits only (the groove); the festa (the finale, the "eeeh!", a clear result) cheers; a collapse
// saddens (a miss alone doesn't: at most the groove settles); section B / the menus clap. Also fills F.
function updateMood(dt, t, live) {
  const g = G.state === 'title' || G.state === 'splash' || G.state === 'select' ? 70 : G.guapo;
  mood.respect += (g - mood.respect) * Math.min(1, dt * 1.5);
  const calm = G.state === 'play' && !G.finale && !G.eeeh && !G.collapseT;
  const cheering = G.finale || (G.state === 'play' && G.eeeh && !G.collapseT) || (G.state === 'results' && G.reason === 'clear') || (G.state !== 'play' && clock - G.chantT < 2.5);
  mood.calmK += ((calm ? 1 : 0) - mood.calmK) * easeIn(dt, 0.35);
  mood.festK += ((cheering ? 1 : 0) - mood.festK) * easeIn(dt, 0.25);
  mood.sadK += ((G.collapseT ? 1 : 0) - mood.sadK) * easeIn(dt, 0.25);
  mood.partyK += ((calm && G.sec === 'B' ? PARTY : 0) - mood.partyK) * easeIn(dt, 0.6); // the playful parts of the song: the plaça loosens up (hops, claps), short of the finale
  const moodK = mood.calmK * (1 - mood.partyK); // how still the mood is; the groove (hits) keeps reading calmK
  mood.clapK += (((G.state === 'play' ? G.sec === 'B' : true) ? 1 : 0) - mood.clapK) * easeIn(dt, 0.3);
  const ex = mood.respect / 100, eager = smooth01((ex - 0.45) / 0.1) * (1 - mood.sadK); // a happy plaça hops on the beat
  F.calm = calm; F.moodK = moodK; F.ex = ex; F.eager = eager;
  F.beatHop = (mood.festK * 0.35 + (1 - mood.festK) * mood.clapK * eager * 0.12 * ex * (1 + (PARTY_HOP - 1) * mood.partyK)) * (1 - moodK); // metres, 0 while calm
  mood.kick *= Math.exp(-dt / GROOVE.release); // the groove: attack through three one-pole filters, release on kick
  const ga = easeIn(dt, GROOVE.attack);
  mood.gr1 += (mood.kick - mood.gr1) * ga; mood.gr2 += (mood.gr1 - mood.gr2) * ga; mood.gr3 += (mood.gr2 - mood.gr3) * ga; mood.grSide += (mood.grSideT - mood.grSide) * ga;
  mood.gr4 += (mood.gr3 - mood.gr4) * easeIn(dt, NEAR.attack); // the first ring's slower tap
  mood.ringBeat += ((calm && G.combo >= NEAR.combo ? 1 : 0) - mood.ringBeat) * easeIn(dt, 0.8);
  mood.ringStreak += ((calm ? Math.min(1, G.combo / NEAR.streakAt) : 0) - mood.ringStreak) * easeIn(dt, 0.5);
  F.velK = easeIn(dt, 0.33);
  F.nearFade = easeIn(dt, NEAR.fade); F.wayIn = easeIn(dt, 0.12); F.wayOut = easeIn(dt, 0.6); F.ringE = easeIn(dt, RING.ease); // (per frame, not per person)
  const shoving = calm && clock < mood.shoveUntil;
  mood.shoveK += ((shoving ? 1 : 0) - mood.shoveK) * easeIn(dt, shoving ? SHOVE.in : SHOVE.out); if (mood.shoveK < 1e-3) mood.shoveK = 0;
  const judged = G.state === 'play' ? judgedCount(G.counts) : 0;
  mood.presK += ((G.state === 'play' && !G.finale && !G.practice && judged >= PRES.after ? G.guapo / 100 : 1) - mood.presK) * easeIn(dt, PRES.slow);
  if ((mood.murT -= dt) <= 0) { // the plaça's murmur under the song follows the streak (audio.js setCrowd); a few times a second is plenty
    mood.murT = 0.25;
    chip?.setCrowd?.(G.state !== 'play' || G.paused || G.collapseT ? 0 : G.finale ? 1 : 0.25 + 0.75 * Math.min(1, G.combo / 40));
  }
  F.presE = easeIn(dt, 0.4); F.ripE = easeIn(dt, 0.05); F.standE = easeIn(dt, 0.15); F.showE = easeIn(dt, 0.04); F.fanE = easeIn(dt, 0.2);
  if (G.state === 'play' && (mood.nearT -= dt) <= 0) { mood.nearT = NEAR.every; pickNear(renderProfile.near); }
  F.slow = G.state === 'play' && live > 0; // the song is on: nobody hurries (before the first note they may settle)
  const prog = G.state === 'play' ? Math.min(1, Math.max(0, t / song.end)) : 0.3;
  F.bold = G.state === 'results' ? 0.7 : 1 - prog * (1 - RING.bold); // a little bolder as the dance goes on
  const waving = G.finale || (G.state === 'results' && G.reason === 'clear');
  mood.waveK += ((waving ? 1 : 0) - mood.waveK) * easeIn(dt, 0.65);
  F.wavePos = clock * 2.2; // where the wave is round the ring (radians); the backdrop's shader uses the same
  F.rippling = calm && renderProfile.ripple >= 0 && rippleLive(clock); // a pulse still on its way (crowd-fx.js)
  F.cy = Math.cos(M.yaw); F.sy = Math.sin(M.yaw);
  F.sweep = Math.min(1, Math.abs(M.yawVel) / 1.5); // how hard the rear is swinging round
  F.rearX = M.pos.x - F.sy * 1.9; F.rearZ = M.pos.y - F.cy * 1.9; // the tail end
  // the play camera, on the ground: direction from her (shotX, shotZ) and distance; 0 outside play
  let shotX = camera.position.x - M.pos.x, shotZ = camera.position.z - M.pos.y, shotD = G.state === 'play' ? Math.hypot(shotX, shotZ) : 0;
  if (shotD > 1e-3) { shotX /= shotD; shotZ /= shotD; } else shotD = 0;
  F.shotX = shotX; F.shotZ = shotZ; F.shotD = shotD;
}

// Use the existing neighbour grid when a walking spectator needs a detour, rather than stepping into the next person.
function photoCrowdClearance(p, x, z) {
  let clear = photoPersonClearance(p,x,z);
  const cx = Math.floor(x+16), cz = Math.floor(z+16);
  for (let iz=Math.max(0,cz-2);iz<=Math.min(31,cz+2);iz++) for (let ix=Math.max(0,cx-2);ix<=Math.min(31,cx+2);ix++) {
    for (const q of crowdCells[ix+iz*32]) {
      if (q===p) continue;
      const presence=Math.min(p.qualityScale??1,q.qualityScale??1);
      clear=Math.min(clear,Math.hypot(x-q.pos.x,z-q.pos.y)-crowdRadius(p)-crowdRadius(q)-.04*presence);
    }
  }
  return clear;
}
// Step 2: where one person goes: they make way for her (RING), creep in to watch, walk back to their spot, keep clear of the play camera's shot and of each other (a soft push; separate() is the hard limit).
function steer(p, dt, beat, live) {
  if (sootAnchored(p)) { p.vel.set(0, 0); p.rest = false; return; } // charred stiff (drac-soot.js): rooted to the spot, a fixed footprint
  const { moodK, slow, ringE, velK, wayIn, wayOut } = F, { festK, clapK, partyK, gr2, gr3, shoveK } = mood;
  // during the song only the front row and the first ring (NEAR) make way; the rows behind hold unless she is right
  // on them (1.2 m): fewer movers, less CPU, and the ones people watch still react
  const dx = p.pos.x - M.pos.x, dz = p.pos.y - M.pos.y, want = G.state === 'play' && p.row && !p.near ? Math.min(1.2, p.comfort * F.bold) : p.comfort * F.bold + (shoveK && G.state === 'play' ? SHOVE.extra * shoveK : 0);
  // clearance to her body (a box in her frame, y = forward) and, while she spins, to the circle her rear sweeps
  // round the pivot; only near the ring (RING.reach): everyone further out is simply clear
  const scale = PAIR.k ? 1 : figureScale(); // M is the Mulassa while the scene pair is visible
  const dpx = p.pos.x - M.pivot.x, dpz = p.pos.y - M.pivot.y, dp = Math.hypot(dpx, dpz) || 1;
  let clear = 99;
  if (dp < want + RING.reach + PIVOT + 2.4 * scale) {
    local.set(dx * F.cy - dz * F.sy, dx * F.sy + dz * F.cy);
    clear = Math.hypot(Math.max(0, Math.abs(local.x) - 0.75 * scale), Math.max(0, Math.abs(local.y) - 2.3 * scale));
    if (F.sweep > 0.2) clear = Math.min(clear, dp - (PIVOT + 2.1) * scale * F.sweep);
  }
  if (PHOTO.on) clear = photoClearance(M.pos.x, M.pos.y, M.yaw, p.pos.x, p.pos.y, 0, !PHOTO.pair && PHOTO.id === 'drac-valls');
  // the splash's Drac beside her (mula-motion.js PAIR): a round footprint, made way for like her
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
  if (PHOTO.on) culadaKnock(p, dt, dx, dz); else if (p.downT > 0) p.vel.set(0, 0); // (photo mode left mid-fall: they still get up first)
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

// The Mulassa's culada (E in photo mode): whoever her swinging rear reaches is flung out and round with it, arms up,
// sliding to a stop and falling flat for a moment (PHOTO_SPIN); never in the game. It overrides their own steering until they are up.
let culadaEh = -9;
function culadaKnock(p, dt, dx, dz) {
  if (p.avoidKnock) return; // chairs and cane users keep the normal anticipatory escape, never an impulse or a fall
  const d = Math.hypot(dx, dz) || 1;
  if (PHOTO.culada && (p.knockT ?? 0) <= 0 && d < PHOTO_SPIN.reach + p.rad) {
    const k = PHOTO_SPIN.kick * (0.8 + 0.4 * ((p.ph * 5.3) % 1)) * (1 - 0.5 * d / PHOTO_SPIN.reach), // weaker further out
      turn = PHOTO.culada * 0.7; // out, and round the way she turns
    p.kx = (dx + dz * turn) / d * k; p.kz = (dz - dx * turn) / d * k; p.knockT = PHOTO_SPIN.slide * 3; p.downT = CALM.matches ? 0 : PHOTO_SPIN.down;
    if (clock - culadaEh > 0.6) { culadaEh = clock; figureSfx('eh'); } // the plaça's «eeh!», once a culada
  }
  if ((p.knockT ?? 0) <= 0) { if (p.downT > 0) { p.vel.set(0, 0); p.rest = false; } return; } // flat on the floor: nobody walks
  const slow = Math.exp(-dt / PHOTO_SPIN.slide);
  p.kx *= slow; p.kz *= slow; p.knockT -= dt;
  p.vel.set(p.kx, p.kz); p.way = 1; p.rest = false; p.away = false;
}

// Step 3: how one person looks. Walk cycle driven by the distance actually covered (feet plant instead of skating), then
// the groove, the first ring's extra, the ripple, the presence that comes and goes with how well it goes, and the arms.
function pose(p, dt, beat, live) {
  const { moodK, showE, standE, fanE, presE, ripE } = F, { calmK, festK, sadK, clapK, waveK, presK, grSide, gr2, gr3, gr4, ringBeat, ringStreak } = mood;
  const toM = Math.atan2(M.pos.x - p.pos.x, M.pos.y - p.pos.y);
  if (p.spd === undefined) { // first frame; lag, gain: how this person reads the groove (a little late, a little more)
    p.spd = 0; p.step = 0; p.ax = 0; p.az = 0; p.lean = 0; p.yaw = toM; p.g.rotation.order = 'YXZ';
    p.lag = (p.ph * 1.618) % 1; p.gain = 0.7 + 0.5 * ((p.ph * 2.71) % 1); p.nearK = 0;
    p.resp = (p.ph * 3.31) % 1; p.pres = 1; p.thr = p.row === 0 || (p.ph * 7.13) % 1 < 0.6 ? 0 : 0.55 + 0.37 * ((p.ph * 3.7) % 1); if (p.dM === undefined) { p.dM = 99; p.side = 0; } // resp: their own draw for the ripple
  }
  p.spd += (p.vel.length() - p.spd) * Math.min(1, dt * 6); // stride builds up and dies down with the body
  const s = p.spd, w = smooth01((s - 0.1) / 0.3); // separation jitter stays below the walk threshold
  const run = smooth01((s - 1.1) / 1.2);
  let face = toM, dir = 1;
  if (w > 0.01) {
    const mv = Math.atan2(p.vel.x, p.vel.y);
    if (run < 0.5 && Math.cos(mv - toM) < -0.3) dir = -1; // making room: keep watching her, step backwards
    else if (w > 0.5) face = mv; // otherwise turn to where they're going
  }
  let dy = face - p.yaw;
  dy -= Math.round(dy / TAU) * TAU;
  const turnLimit = (1.8 + 2 * run) * dt;
  p.yaw += Math.max(-turnLimit, Math.min(turnLimit, dy * Math.min(1, dt * (3 + 6 * run))));
  const k = p.kid ? 0.72 : 1, stride = (0.42 + 0.33 * run) * k; // one step, metres
  p.step += dir * s * dt * Math.PI / stride; // half a cycle per step
  const amp = Math.asin(Math.min(0.9, stride / (1.56 * k))); // hip swing that covers exactly one stride
  const sw = Math.sin(p.step) * amp * w, armK = 0.8 + 0.7 * run;
  if (p.legs.length) { p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw; }
  const bob = w * (0.025 + 0.05 * run) * k * Math.abs(Math.cos(p.step)); // up twice per cycle, over the planted leg
  const up = waveK && waveK * smooth01((Math.cos(p.ang - F.wavePos) - 0.6) / 0.4); // the wave passing by: arms up
  const gv = calmK * Math.min(GROOVE.big, (gr2 + (gr3 - gr2) * p.lag) * p.gain); // this person's groove, 0 off the song
  p.nearK += ((p.near ? 1 : 0) - p.nearK) * F.nearFade;
  const nk = p.nearK * calmK;
  let ringUp = 0, ringNod = 0, ringArms = 0; // the first ring's extra (NEAR)
  if (nk > 1e-4) {
    const nv = Math.min(NEAR.cap, (gr3 + (gr4 - gr3) * p.lag) * p.gain * (1 + NEAR.streak * ringStreak));
    ringUp = nk * (nv * NEAR.bob + ringBeat * NEAR.bounce * (0.5 + 0.5 * Math.cos(TAU * (beat - p.lag * 0.15)))); // up on the beat
    ringNod = nk * nv * NEAR.nod; ringArms = nk * nv * NEAR.arms;
  }
  if (p.thr) { // one of those who come and go with how well it goes (PRES)
    const to = smooth01((presK - p.thr) / PRES.soft);
    if (to !== p.pres) {
      p.pres += (to - p.pres) * presE; if (Math.abs(to - p.pres) < 1e-3) p.pres = to;
      p.g.scale.setScalar(p.pres < 0.01 ? (p.pres = 0) : p.scale * p.pres * p.qualityScale);
    }
    if (!p.pres) return; // not there (scale 0: the skinned mesh skips them)
  }
  let rip = p.rip || 0; // eased, so stacked pulses and the last one leaving never step
  if (F.rippling || rip) {
    const to = F.rippling && p.dM < RIPPLE.reach && (p.near || p.row < renderProfile.ripple) ? ripple(clock, p.dM, p.side, p.resp) * calmK : 0;
    rip = p.rip = Math.abs(rip += (to - rip) * ripE) < 1e-3 ? 0 : rip;
  }
  rip *= 1 - w; // whoever is walking (making way) doesn't also hop
  p.stand = (p.stand ?? 1) + ((1 - w) - (p.stand ?? 1)) * standE; // eased: breaking into a walk mid-hop lands softly
  const hop = (Math.max(0, Math.sin(beat * Math.PI + p.ph)) * F.beatHop + up * 0.25) * p.stand + (gv * GROOVE.bob + ringUp + rip * RIP.bob) * k;
  // drawn a hair behind the simulation (a 40 ms ease): the no-overlap limit's small corrections in a packed crowd never pop
  if (p.gx === undefined) { p.gx = p.pos.x; p.gz = p.pos.y; } else { // (and never faster than 1.6 m/s: a shove is caught up with, not jumped)
    let ex = (p.pos.x - p.gx) * showE, ez = (p.pos.y - p.gz) * showE; const e = Math.hypot(ex, ez), lim = (PHOTO.on ? Math.max(3.4, PHOTO.speed * 1.3, p.knockT > 0 ? PHOTO_SPIN.kick * 1.3 : 0) : 1.6) * dt;
    if (e > lim) { ex *= lim / e; ez *= lim / e; }
    p.gx += ex; p.gz += ez;
  }
  // The culada's fall and recovery use the same gradual ramp, keeping the rendered body and its footprint continuous.
  if (p.downT > 0) p.downT -= dt; // (counted here: it runs every frame, photo mode or not)
  const down = (p.downT ?? 0) > 0.6 ? 1 : 0;
  if (down || p.fall) { p.fall = (p.fall ?? 0) + (down - (p.fall ?? 0)) * easeIn(dt, 0.35); if (p.fall < 0.01) p.fall = 0; }
  p.g.position.set(p.gx, bob + hop + 0.15 * (p.fall || 0), p.gz);
  p.g.rotation.set(-1.45 * (p.fall || 0), p.yaw, 0);
  const lean = 0.12 * (1 - live) + w * dir * (0.05 + 0.22 * run) - 0.14 * p.way; // craning before the start; leaning into the stride; back from her
  p.lean += (lean - p.lean) * Math.min(1, dt * 8);
  p.torso.rotation.x = p.lean + gv * GROOVE.nod + ringNod + rip * RIP.nod + calmK * Math.sin(clock * 1.7 + p.ph) * GROOVE.breath; // nod; breathing
  p.torso.rotation.z = gv * grSide * GROOVE.sway; // a GUA or a PA sways them a touch to its side
  // arms: at rest (the song: a small lift with the groove), clapping (section B, the menus), hands on the head (a
  // collapse, half of them), up and waving (the festa), up as the wave passes; blended by the eased mood
  let tx = -0.1 + Math.sin(beat * 0.5 + p.ph) * 0.05 * live - gv * GROOVE.arms - ringArms - rip * RIP.arms - RING.flinch * p.way, tz = 0.05 + 0.25 * p.way; // making way: hands up, «ep!»
  const clapW = clapK * (1 - moodK);
  tx += (-1.1 - tx) * clapW; tz += (0.1 + Math.abs(Math.sin(beat * Math.PI)) * 0.4 - tz) * clapW;
  if (Math.sin(p.ph * 5) > 0) { tx += (-2.5 - tx) * sadK; tz += (0.9 - tz) * sadK; }
  tx += (-2.8 + Math.sin(clock * 9 + p.ph) * 0.25 - tx) * festK; tz += (0.25 - tz) * festK;
  tx += (-2.9 - tx) * up; tz += (0.3 - tz) * up;
  tx += (-0.05 - 0.75 * run - tx) * w; tz += (0.06 + 0.25 * run - tz) * w; // walking arms, bent up when fleeing
  const armEase = Math.min(1, dt * 10), armMax = 6 * dt; // eased, and never faster than 6 rad/s (a mood or a stride switching mid-swing)
  p.ax += Math.max(-armMax, Math.min(armMax, (tx - p.ax) * armEase));
  p.az += Math.max(-armMax, Math.min(armMax, (tz - p.az) * armEase));
  const a0 = p.arms[0], a1 = p.arms[1]; // counter-swing: each arm goes with the opposite leg
  let x0 = p.ax - sw * armK, z0 = p.az;
  if (p.fan) { // fanning themselves: the ventall arm up by the face, flicking (slow and small while the song plays)
    const f = p.fanK = (p.fanK ?? 1) + ((1 - w) * (1 - festK) * (1 - up) - (p.fanK ?? 1)) * fanE; // eased: a first step never flicks it down
    x0 += (-1.9 - x0) * f;
    z0 += (Math.sin(clock * 13 + p.ph) * 0.2 * (1 - moodK) + Math.sin(clock * 3.5 + p.ph) * 0.06 * moodK) * f;
  }
  // the arm as drawn, swing and ventall included, keeps the 6 rad/s too (raised while a slowing stride swings it the same way)
  const x1 = p.ax + sw * armK;
  p.r0 = p.r0 === undefined ? x0 : p.r0 + Math.max(-armMax, Math.min(armMax, x0 - p.r0));
  p.r1 = p.r1 === undefined ? x1 : p.r1 + Math.max(-armMax, Math.min(armMax, x1 - p.r1));
  a0.rotation.x = p.r0; a0.rotation.z = z0;
  a1.rotation.x = p.r1; a1.rotation.z = -p.az;
  if (p.sootW > 0) sootPose(p); // charred: the pose held at the touch over this live one, eased back into it
}

// Step 4: everyone who isn't in the ring: the band, the balconies and the backdrop's shader.
function poseScenery(beat, live) {
  const { moodK, ex } = F, { festK, clapK, partyK, waveK, gr2 } = mood;
  poseBand(plaza.band, beat, live);
  for (const p of plaza.balcony) { // up on the balconies (high quality): one waves on the beat, the other leans on the rail
    const still = 1 - 0.8 * moodK; // the song: a slow small wave
    p.arms[0].rotation.x = -2.4 - 0.4 * smooth01(Math.max(festK, waveK * 2 - 0.5)); p.arms[0].rotation.z = 0.35 + Math.sin(beat * Math.PI + p.ph) * 0.35 * still;
    p.arms[1].rotation.x = -0.5;
    p.torso.rotation.z = Math.sin(beat * Math.PI * 0.5 + p.ph) * 0.05 * still;
  }
  if (plaza.backdrop) { // the backdrop moves in its shader: four uniforms a frame
    const u = plaza.backdrop.u;
    u.uBeat.value = beat; u.uTime.value = clock; u.uWave.value = waveK; u.uLens.value.copy(camera.position);
    u.uHop.value = Math.max(0.02, festK * 0.3 + (1 - festK) * clapK * F.eager * 0.1 * ex * (1 + (PARTY_HOP - 1) * partyK)) * (1 - moodK) + moodK * (0.01 + 0.02 * gr2);
  }
}

let cheerSeen = -9;
export function animCrowd(dt, beat, t, live = 1) {
  if (M.cheerT !== cheerSeen) { cheerSeen = M.cheerT; if (G.state === 'play') grooveHit(GROOVE.big); } // her culades, charges, final hit
  if (!PHOTO.on) updatePhotoExtras(dt);
  dt = Math.max(0, dt); // (a clock stepped backwards must not blow up the exponential easing)
  for (const k of usedCells) crowdCells[k].length = 0; // only the cells used last frame, not all 1024
  usedCells.length = 0;
  for (const p of activeCrowd) { p.cell = crowdCell(p); cellPush(p.cell, p); }
  for (const b of bandSpots) cellPush(crowdCell(b), b); // the band: fixed, never in anyone's way
  if (colla?.helpers.visible) for (const b of COLLA_SPOTS) cellPush(crowdCell(b), b); // the Drac's colla too
  if (mulaColla?.helpers.visible) for (const b of MULA_COLLA_SPOTS) cellPush(crowdCell(b), b); // and the Mulassa's
  for (const p of photoExtras) if (!p.band) cellPush(crowdCell(p), p);
  const backgroundContacts = backdropContacts([plaza.backdrop, midCrowd]);
  for (const b of backgroundContacts) cellPush(crowdCell(b), b);
  updateMood(dt, t, live);
  for (const p of activeCrowd) steer(p, dt, beat, live);
  separate();
  for (const p of activeCrowd) pose(p, dt, beat, live);
  settleDrawnCrowd(activeCrowd.filter(p => p.g.scale.x > .05), [...bandSpots, ...backgroundContacts], 2.5 * dt); // (as fast as a brisk walk)
  poseScenery(beat, live);
  for (const p of plaza.band) if (p.sootW > 0) sootPose(p); // charred (drac-soot.js): the band and the balconies too
  for (const p of plaza.balcony) if (p.sootW > 0) sootPose(p);
  animateRenderQuality(dt); // apply quality presence after the gameplay presence, without changing its state
}
