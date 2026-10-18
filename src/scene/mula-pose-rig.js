// Pure pose -> rig adapter shared by the game and the editor. No game state, clock or spring integration.
export function poseMulaBody(rig, x, y, z, yaw, roll, pitch) {
  rig.root.position.set(x, y, z);
  rig.root.rotation.y = yaw;
  rig.body.rotation.z = roll;
  rig.body.rotation.x = pitch;
}

// The preview's secondary motion is evaluated directly at the musical beat, so seeking never leaves stale limbs.
// Reactive springs and the demo's following tail belong to animMula; the preview shows the unaccented choreography.
export function poseMulassa(rig, pose, beat, front = 0) {
  const yaw = front + pose.yaw, c = Math.cos(yaw), s = Math.sin(yaw), bp = beat * Math.PI, amp = pose.drive;
  poseMulaBody(rig, pose.x * c + pose.z * s, pose.lift, -pose.x * s + pose.z * c, yaw, pose.roll + pose.shake, pose.pitch + pose.shake * 0.6);
  rig.body.scale.set(1, 1, 1);
  rig.neck.rotation.set(0.15 + Math.sin(bp * 2) * 0.08 * amp, Math.sin(bp) * 0.12 * amp, 0);
  rig.head.rotation.x = 0.2 + Math.sin(bp * 2 + 1) * 0.08 * amp;
  rig.jaw.rotation.x = Math.max(0, Math.sin(bp * 2)) * 0.12 * amp;
  for (let i = 0; i < rig.ears.length; i++) rig.ears[i].rotation.x = -0.25 + Math.sin(bp * 2 + i) * 0.2;
  rig.tail.rotation.set(0.12, 0, Math.sin(bp) * 0.15 * amp);
  rig.peek.scale.setScalar(0.001);
  const stepping = amp > 0.8;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i], ph = (i % 2) * Math.PI + ((i >> 2) & 1) * Math.PI / 2;
    leg.visible = true;
    leg.position.y = Math.max(0, Math.sin(bp * (stepping ? 2 : 1) + ph)) * (stepping ? 0.16 : 0.06);
    leg.position.y += Math.max(0, pose.lift - leg.position.z * Math.sin(rig.body.rotation.x)) - pose.lift;
  }
}
