// The crowd's mood: what the plaça remembers between frames (the groove, the festa, the presence) and this frame's
// shared numbers (F), eased in real time; the judge only nudges it (grooveHit, settleGroove, shoveRing).
import * as THREE from 'three';
import { pushPulse, rippleLive } from './crowd-fx.js';
import { judgedCount } from '../game/progress.js';
import { song } from '../game/figure-song.js';
import { renderProfile, camera } from './stage.js';
import { CALM } from '../core/env.js';
import { clock, G, chip } from '../game/state.js';
import { activeCrowd } from './quality.js';
import { M } from './figure-springs.js';
import { festaNow } from './crowd-effects.js';
import { RING } from './crowd-build.js';
import { easeIn, smooth01 } from '../core/math.js';

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
// A GUAPA (a big hit) shoves the ring: for `hold` s the front row and the first ring want `extra` m more room, so the
// existing making-way (RING: eased, capped, hands up, «ep!») steps them back, and they walk home once it eases (`out`).
export const SHOVE = { extra: 0.9, hold: 0.5, in: 0.12, out: 0.9 };
// The plaça fills with how well it goes: once `after` notes are judged, about 40% of the rows behind the front (they
// stand out in the back rows, `thr` 0.55-0.92, from their own draw) are only there while the ENCERTS % is above their
// threshold: they shrink away / pop back (eased, `soft` = the % it takes to go from gone to whole). Never in the
// finale, the menus or the practice. Hidden = scale 0, which the skinned crowd mesh skips. `slow`: s it takes the % to arrive.
export const PRES = { after: 8, slow: 2.5, soft: 0.06 };
// The first ring (NEAR): only the few people nearest her that the camera sees (PROFILES near; picked again every
// `every` s, each fading in and out over `fade` s) answer the same groove more: a slower tap of its chain (gr4,
// `attack`), times 1 + `streak` as the combo nears `streakAt`, capped at `cap`, as a bigger bob (m), nod and arm lift
// (rad); and while the combo holds `combo` or more, a light bounce on the beat (`bounce` m). Everyone else stays calm.
export const PARTY = 1, PARTY_HOP = 1.6; // section B lifts the still mood all the way; its hop is PARTY_HOP x the old B hop (0.12 m -> ~0.19 m; the finale's is 0.35)
export const NEAR = { every: 0.6, fade: 0.6, attack: 0.08, bob: 0.045, nod: 0.07, arms: 0.5, streak: 0.5, streakAt: 30, cap: 2, combo: 10, bounce: 0.03 };
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
// This frame's numbers, shared by the steps below (one object, reused: nothing is allocated per frame).
export const F = { calm: false, festa: 0, moodK: 0, eager: 0, ex: 0, beatHop: 0, nearFade: 0, wayIn: 0, wayOut: 0, ringE: 0, velK: 0, presE: 0, ripE: 0, standE: 0, showE: 0, fanE: 0,
  slow: false, bold: 1, wavePos: 0, rippling: false, cy: 1, sy: 0, sweep: 0, rearX: 0, rearZ: 0, shotX: 0, shotZ: 0, shotD: 0 };

// Step 1: the mood, every part eased in real time (no pose ever switches in one frame): calm = the song itself, the plaça
// still, answering hits only (the groove); the festa (the finale, the "eeeh!", a clear result) cheers; a collapse
// saddens (a miss alone doesn't: at most the groove settles); section B / the menus clap. Also fills F.
export function updateMood(dt, t, live) {
  const g = G.state === 'splash' || G.state === 'select' ? 70 : G.guapo;
  mood.respect += (g - mood.respect) * Math.min(1, dt * 1.5);
  F.festa = festaNow(); // a figure's festa (the Bou held up over the colla's heads: crowd-effects.js)
  const festa = F.festa > 0.5; // the plaça goes wild
  const calm = G.state === 'play' && !G.finale && !G.eeeh && !G.collapseT && !festa;
  const cheering = G.finale || festa || (G.state === 'play' && G.eeeh && !G.collapseT) || (G.state === 'results' && G.reason === 'clear') || (G.state !== 'play' && clock - G.chantT < 2.5);
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
  const waving = G.finale || festa || (G.state === 'results' && G.reason === 'clear');
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
  F.lens = G.state === 'select' ? camera.position : null; // (framing.js lensShrink: on the selector, gone by a low lens)
}
