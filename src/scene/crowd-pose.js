// The crowd's look, frame by frame: one person's walk, groove, ripple, presence and arms (pose), and everyone outside
// the ring (poseScenery: the band, the balconies, the backdrop's shader).
import { PHOTO, PHOTO_SPIN } from '../game/photo-control.js';
import { RIPPLE, ripple } from './crowd-fx.js';
import { poseBand } from './models.js';
import { renderProfile, camera, plaza } from './stage.js';
import { clock } from '../game/state.js';
import { M } from './figure-springs.js';
import { RING } from './crowd-build.js';
import { lensShrink } from './framing.js';
import { easeIn, smooth01, TAU } from '../core/math.js';
import { crowdPose, crowdPace, crowdHop, crowdArms } from './crowd-effects.js';
const ARMS = { tx: 0, tz: 0 }; // the arm targets a figure's effect bends (crowdArms), reused
import { GROOVE, mood, PRES, PARTY_HOP, NEAR, F } from './crowd-mood.js';

// What a pulse does to whoever it reaches: a hop (m), a nod (rad, torso), arms up (rad); times the pulse's 0..1.5.
const RIP = { bob: 0.04, nod: 0.06, arms: 0.5 };

// Step 3: how one person looks. Walk cycle driven by the distance actually covered (feet plant instead of skating), then
// the groove, the first ring's extra, the ripple, the presence that comes and goes with how well it goes, and the arms.
export function pose(p, dt, beat, live) {
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
  const lens = lensShrink(F.lens, p.pos.x, p.pos.y);
  if (lens !== (p.lensK ?? 1)) { p.lensK = lens; p.g.scale.setScalar(p.scale * (p.pres ?? 1) * p.qualityScale * lens); }
  if (p.thr) { // one of those who come and go with how well it goes (PRES)
    const to = smooth01((presK - p.thr) / PRES.soft);
    if (to !== p.pres) {
      p.pres += (to - p.pres) * presE; if (Math.abs(to - p.pres) < 1e-3) p.pres = to;
      p.g.scale.setScalar(p.pres < 0.01 ? (p.pres = 0) : p.scale * p.pres * p.qualityScale * lens);
    }
    if (!p.pres) return; // not there (scale 0: the skinned mesh skips them)
  }
  if (!lens) return; // (by the lens: not drawn either)
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
    let ex = (p.pos.x - p.gx) * showE, ez = (p.pos.y - p.gz) * showE; const e = Math.hypot(ex, ez), lim = (PHOTO.on ? Math.max(3.4, PHOTO.speed * 1.3, p.knockT > 0 ? PHOTO_SPIN.kick * 1.3 : 0) : crowdPace(p) || 1.6) * dt; // (the Bou's snake runs: drawn at 1.6 m/s its bodies lagged, merged and popped)
    if (e > lim) { ex *= lim / e; ez *= lim / e; }
    p.gx += ex; p.gz += ez;
  }
  // The culada's fall and recovery use the same gradual ramp, keeping the rendered body and its footprint continuous.
  if (p.downT > 0) p.downT -= dt; // (counted here: it runs every frame, photo mode or not)
  const down = (p.downT ?? 0) > 0.6 ? 1 : 0;
  if (down || p.fall) { p.fall = (p.fall ?? 0) + (down - (p.fall ?? 0)) * easeIn(dt, 0.35); if (p.fall < 0.01) p.fall = 0; }
  const dance = p.congaHop = crowdHop(p, beat, F.festa); // a figure's bounce (the Bou's conga, on every beat)
  p.g.position.set(p.gx, bob + hop + dance + 0.15 * (p.fall || 0), p.gz);
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
  ARMS.tx = tx; ARMS.tz = tz;
  const conga = crowdArms(p, beat, clock, F.festa, ARMS); // a figure's arms (the Bou's conga: bou-crowd.js)
  tx = ARMS.tx; tz = ARMS.tz;
  const armEase = Math.min(1, dt * 10), armMax = 6 * dt; // eased, and never faster than 6 rad/s (a mood or a stride switching mid-swing)
  p.ax += Math.max(-armMax, Math.min(armMax, (tx - p.ax) * armEase));
  p.az += Math.max(-armMax, Math.min(armMax, (tz - p.az) * armEase));
  const a0 = p.arms[0], a1 = p.arms[1]; // counter-swing: each arm goes with the opposite leg
  const swing = sw * armK * (1 - conga); // (clapping in the conga: no counter-swing)
  let x0 = p.ax - swing, z0 = p.az;
  if (p.fan) { // fanning themselves: the ventall arm up by the face, flicking (slow and small while the song plays)
    const f = p.fanK = (p.fanK ?? 1) + ((1 - w) * (1 - festK) * (1 - up) - (p.fanK ?? 1)) * fanE; // eased: a first step never flicks it down
    x0 += (-1.9 - x0) * f;
    z0 += (Math.sin(clock * 13 + p.ph) * 0.2 * (1 - moodK) + Math.sin(clock * 3.5 + p.ph) * 0.06 * moodK) * f;
  }
  // the arm as drawn, swing and ventall included, keeps the 6 rad/s too (raised while a slowing stride swings it the same way)
  const x1 = p.ax + swing;
  p.r0 = p.r0 === undefined ? x0 : p.r0 + Math.max(-armMax, Math.min(armMax, x0 - p.r0));
  p.r1 = p.r1 === undefined ? x1 : p.r1 + Math.max(-armMax, Math.min(armMax, x1 - p.r1));
  a0.rotation.x = p.r0; a0.rotation.z = z0;
  a1.rotation.x = p.r1; a1.rotation.z = -p.az;
  crowdPose(p); // a figure's mark drawn over this live pose (the Drac's soot, eased back into it)
}

// Step 4: everyone who isn't in the ring: the band, the balconies and the backdrop's shader.
export function poseScenery(beat, live) {
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
