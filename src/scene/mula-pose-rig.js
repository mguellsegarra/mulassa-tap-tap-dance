// Pure pose -> rig adapter shared by the game and the editor. No game state, clock or spring integration.
export function poseMulaBody(rig, x, y, z, yaw, roll, pitch) {
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = yaw;
  rig.body.rotation.z = roll;
  rig.body.rotation.x = pitch;
}

// The preview's secondary motion is evaluated directly at the musical beat, so seeking never leaves stale limbs.
// Reactive springs and the demo's following tail belong to animMula; the preview shows the unaccented choreography.
// pose: a game/mula-dance.js pose (roll, pitch, lift, headRoll, drive); x, z, yaw: where it stands and faces. The
// carriers' shoes are posed separately (scene/mula-carriers.js), after this.
export function poseMulassa(rig, pose, beat, x, z, yaw) {
  const bp = beat * Math.PI, amp = pose.drive;
  poseMulaBody(rig, x, pose.lift, z, yaw, pose.roll, pose.pitch);
  rig.body.scale.set(1, 1, 1);
  rig.neck.rotation.set(0.15 + Math.sin(bp * 2) * 0.08 * amp, Math.sin(bp) * 0.12 * amp, 0);
  rig.head.rotation.set(0.2 + Math.sin(bp * 2 + 1) * 0.08 * amp, 0, pose.headRoll ?? 0);
  rig.jaw.rotation.x = Math.max(0, Math.sin(bp * 2)) * 0.12 * amp;
  for (let i = 0; i < rig.ears.length; i++) rig.ears[i].rotation.x = -0.25 + Math.sin(bp * 2 + i) * 0.2;
  rig.tail.rotation.set(0.12, 0, Math.sin(bp) * 0.15 * amp);
  rig.peek.scale.setScalar(0.001);
}
