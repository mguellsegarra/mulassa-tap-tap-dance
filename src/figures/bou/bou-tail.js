// The Bou's tail physics (buildBou wires it to the rig's tail links).
import * as THREE from 'three';

// The tail as a chain of jointed links, each a pair of damped angle springs (the free Verlet chain
// shook against its own collisions). Angles in the body's frame: `a` swings a link back (0 = straight down, + = back,
// never forward: the whole tail stays behind the rump, it can't touch the body), `b` to the side. Each link is pulled
// towards where gravity hangs it (the real gravity minus the dock's own acceleration: it trails when the body moves)
// and towards its parent's angle (the chain carries a swing down to the brush), and no joint bends more than
// TAIL.joint (it curls, it never folds onto itself). Fixed sub-steps: the same at 60 and 120 Hz; a dt over 0.5 s (a
// seek, a long pause) settles it again unseen.
export const TAIL = { step: 1 / 120, hang: 26, follow: 50, damp: 7, dock: 120, rest: .75, min: .12, max: 2.3, side: 1.3, joint: 1, smooth: .06 };
// Its own comic life on the music (like the Mulassa's, it must jump and move): on each beat a flick
// to one side, then the other; every two bars a big flick up and back that falls by its weight.
// Angular speeds (rad/s) given over `ramp` seconds, more down the chain.
export const TAIL_KICK = { side: 6, back: 14, every: 8, at: 4, ramp: .12 };
export function makeTailSwing(tail, lens) {
  const n = lens.length, A = new Float32Array(n), B = new Float32Array(n), VA = new Float32Array(n), VB = new Float32Array(n);
  const body = tail.parent, P = Array.from({ length: n + 1 }, () => new THREE.Vector3()), dir = new THREE.Vector3();
  const pivot = new THREE.Vector3(), last = new THREE.Vector3(), vel = new THREE.Vector3(), lastVel = new THREE.Vector3(), acc = new THREE.Vector3();
  const g = new THREE.Vector3(), q = new THREE.Quaternion(), qi = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'ZYX');
  let ready = false, left = 0, kickLeft = 0, kickA = 0, kickB = 0, hangA = 0, hangB = 0;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  function hang() {   // the angles a link would hang at: effective gravity (or the dev viewer's hand) in the body's frame
    if (swing.grab) g.copy(swing.grab).sub(pivot).multiplyScalar(30); else g.set(0, -9.8, 0).sub(acc);
    g.applyQuaternion(qi); const l = g.length() || 1;
    hangA = clamp(Math.asin(clamp(-g.z / l, -1, 1)), TAIL.min, TAIL.max); hangB = clamp(Math.atan2(g.x, -g.y), -TAIL.side, TAIL.side);
  }
  function step(h) {
    if (kickLeft > 0) { const k = Math.min(h, kickLeft) / TAIL_KICK.ramp; kickLeft -= h;
      for (let i = 1; i < n; i++) { VA[i] += kickA * k * i / (n - 1); VB[i] += kickB * k * i / (n - 1); } }
    for (let i = 0; i < n; i++) {
      // the dock link mostly holds its angle off the rump; the rest hang and follow the link above
      const pa = i ? A[i - 1] : TAIL.rest, pb = i ? B[i - 1] : 0, kh = i ? TAIL.hang : TAIL.hang * .3, kf = i ? TAIL.follow : TAIL.dock;
      VA[i] += (kh * (hangA - A[i]) + kf * (pa - A[i]) - TAIL.damp * VA[i]) * h;
      VB[i] += (kh * (hangB - B[i]) + kf * (pb - B[i]) - TAIL.damp * VB[i]) * h;
    }
    for (let i = 0; i < n; i++) {
      A[i] += VA[i] * h; B[i] += VB[i] * h;
      // limits: soft stops (the speed into a stop goes, nothing bounces)
      const lo = Math.max(TAIL.min, i ? A[i - 1] - TAIL.joint : TAIL.min), hi = Math.min(TAIL.max, i ? A[i - 1] + TAIL.joint : TAIL.max);
      if (A[i] < lo) { A[i] = lo; VA[i] = Math.max(VA[i], 0); } else if (A[i] > hi) { A[i] = hi; VA[i] = Math.min(VA[i], 0); }
      const bl = Math.max(-TAIL.side, i ? B[i - 1] - TAIL.joint : -TAIL.side), bh = Math.min(TAIL.side, i ? B[i - 1] + TAIL.joint : TAIL.side);
      if (B[i] < bl) { B[i] = bl; VB[i] = Math.max(VB[i], 0); } else if (B[i] > bh) { B[i] = bh; VB[i] = Math.min(VB[i], 0); }
    }
  }
  function frame(dt) {   // the dock's world motion this frame -> its smoothed acceleration
    body.updateWorldMatrix(true, true); body.getWorldQuaternion(q); qi.copy(q).invert(); tail.getWorldPosition(pivot);
    if (dt > 0) { vel.subVectors(pivot, last).divideScalar(dt); acc.lerp(lastVel.sub(vel).multiplyScalar(-1 / dt), 1 - Math.exp(-dt / TAIL.smooth)); lastVel.copy(vel); }
    last.copy(pivot);
  }
  function draw() {   // each link from its node, in the tail's (unrotated, body-relative) frame; knuckles halfway
    P[0].set(0, 0, 0);
    for (let i = 0; i < n; i++) {
      const link = tail.children[i]; link.position.copy(P[i]); e.set(A[i], 0, B[i]); link.quaternion.setFromEuler(e);
      dir.set(0, -lens[i], 0).applyQuaternion(link.quaternion); P[i + 1].copy(P[i]).add(dir);
    }
    for (let i = 1; i < n; i++) { const k = tail.children[n - 1 + i]; k.position.copy(P[i]); k.quaternion.slerpQuaternions(tail.children[i - 1].quaternion, tail.children[i].quaternion, .5); }
  }
  function reset() {
    frame(0); acc.set(0, 0, 0); lastVel.set(0, 0, 0); hang();
    for (let i = 0; i < n; i++) { A[i] = i ? hangA : TAIL.rest; B[i] = 0; VA[i] = VB[i] = 0; }
    for (let k = 0; k < 120; k++) step(TAIL.step);   // a second of settling, unseen
    ready = true; left = 0; kickLeft = 0; draw();
  }
  function swing(dt) {
    if (!ready || !(dt > 0) || dt > .5) { reset(); return; }   // first frame, a seek or a long pause: hang still
    frame(dt); hang();
    for (left += dt; left >= TAIL.step; left -= TAIL.step) step(TAIL.step);
    draw();
  }
  swing.reset = () => { ready = false; };
  swing.grab = null;   // a world point the tail reaches for (dev viewer), or null: let go and it falls by its weight
  // beat: the music's beat now (fractional). Kicks on each whole beat crossed; a jump (a seek) only resyncs.
  let lastBeat = NaN;
  swing.beat = beat => {
    const k = Math.floor(beat), crossed = k - Math.floor(lastBeat); lastBeat = beat;
    if (!ready || crossed !== 1) return;
    const big = ((k % TAIL_KICK.every) + TAIL_KICK.every) % TAIL_KICK.every === TAIL_KICK.at;
    kickA = big ? TAIL_KICK.back : .6; kickB = big ? 0 : (k % 2 ? 1 : -1) * TAIL_KICK.side; kickLeft = TAIL_KICK.ramp;
  };
  return swing;
}
