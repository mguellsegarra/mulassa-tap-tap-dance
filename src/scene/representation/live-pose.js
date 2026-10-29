import * as THREE from 'three';
// Stateful crowd animation. Gallery poses stay deterministic; this adapter owns live transitions and signed travel.
import { pose, timeAtDistance, openSkirt, groundCane } from './pose.js';
import { CHAIR } from './rig.js';
import { clamp01, smooth01 } from '../../core/math.js';

export function crowdMotion(p, source) {
  const joints = [p.torso, ...p.legs, ...p.arms, ...p.forearms];
  return { x: source.g.position.x, z: source.g.position.z, yaw: source.g.rotation.y, distance: 0, turn: 0,
    speed: 0, y: p.g.position.y, started: false,
    joints: joints.map(bone => ({ bone, current: bone.quaternion.clone(), target: bone.quaternion.clone() })) };
}
function capturePose(motion, weight, first = false) {
  for (const j of motion.joints) {
    if (first) j.target.copy(j.bone.quaternion);
    else j.target.slerp(j.bone.quaternion, weight);
  }
}
// upper (0-1): how much the arms keep the clap/festa pose while walking (the Bou's conga dances as it runs: its legs
// walk, its arms clap or wave)
export function animatePerson(p, source, motion, { dt, time, clap = 0, festa = 0, upper = 0 }) {
  const h = Math.max(0, dt), dx = source.g.position.x - motion.x, dz = source.g.position.z - motion.z;
  const yaw = source.g.rotation.y, turn = Math.atan2(Math.sin(yaw - motion.yaw), Math.cos(yaw - motion.yaw));
  const heading = motion.yaw + turn / 2;
  motion.distance += dx * Math.sin(heading) + dz * Math.cos(heading);
  motion.turn += turn;
  motion.x = source.g.position.x; motion.z = source.g.position.z; motion.yaw = yaw;
  const speed = source.spd ?? Math.hypot(source.vel.x, source.vel.y);
  motion.speed += (speed - motion.speed) * (1 - Math.exp(-h / 0.12));
  const fall = source.fall || 0;
  const walk = smooth01((motion.speed - 0.1) / 0.3) * (1 - fall), phase = time + (source.ph ?? 0) / (2 * Math.PI);
  pose(p, 'repos', phase); capturePose(motion, 1, true);
  // A pose blended in at (almost) no weight changes nothing: skip it (the eased moods never reach 0 exactly, and most of
  // the plaça stands still, walk 0). Each pose rebuilds the whole rig, the clap two arm solves.
  if (clap * (1 - fall) > 1e-3) { pose(p, 'picar', phase); capturePose(motion, clamp01(clap) * (1 - fall)); }
  if (festa > 1e-3 || fall > 1e-3) { pose(p, 'festa', phase); capturePose(motion, Math.max(clamp01(festa), fall * .6)); }
  const standingY = p.g.position.y;
  // No binary speed threshold: tiny separation corrections don't switch the whole rig into a walk.
  const gait = timeAtDistance(p, motion.distance);
  if (walk > 0) {
    const J = motion.joints, arms = 1 + p.legs.length, held = upper > 1e-3 ? motion.held ??= J.slice(arms).map(() => new THREE.Quaternion()) : null; // (allocated once)
    if (held) for (let i = arms; i < J.length; i++) held[i - arms].copy(J[i].target);
    pose(p, 'moure', gait); capturePose(motion, walk);
    if (held) for (let i = arms; i < J.length; i++) J[i].target.slerp(held[i - arms], clamp01(upper));
  }
  const targetY = standingY * (1 - walk) + p.g.position.y * walk;
  const ease = 1 - Math.exp(-h / 0.08);
  for (const j of motion.joints) {
    if (!motion.started) j.current.copy(j.target);
    else {
      const angle = j.current.angleTo(j.target);
      j.current.slerp(j.target, angle > 1e-8 ? Math.min(ease, 6 * h / angle) : 1);
    }
    j.bone.quaternion.copy(j.current);
  }
  motion.y += (targetY - motion.y) * ease;
  p.g.position.y = p.hop ? motion.y : 0;
  if (p.base) {
    for (let i = 0; i < p.wheels.length; i++) {
      const side = i ? -1 : 1, distance = motion.distance - side * motion.turn * CHAIR.wheelX * p.spec.k;
      p.wheels[i].rotation.x = distance / (CHAIR.R * p.spec.k);
    }
    for (const wheel of p.casters) wheel.rotation.x = motion.distance / (CHAIR.caster.r * p.spec.k);
  }
  // Solve the held cane after blending, against the actual final torso and bob, rather than blending two contacts.
  groundCane(p, gait, walk);
  openSkirt(p);
  motion.started = true;
}
