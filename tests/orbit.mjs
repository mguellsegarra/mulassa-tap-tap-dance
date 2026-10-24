// Title camera steering (src/scene/orbit.js): tap vs drag, limits that give and spring back, a flick that coasts and
// decays, pinch / wheel zoom, and the automatic orbit coming back when idle, the same at any frame rate.
import assert from 'node:assert/strict';
import { ORBIT, turnFor, rubber, roomAlong, orbitLimits, pinchDist, createOrbit, orbitDown, orbitMove, orbitUp, orbitZoom, orbitStep, wheelFactor } from '../src/scene/orbit.js';

const home = { pitch: 0.33, dist: 11.6 }, ROOM = 14, near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const run = (s, seconds, hz = 60, t0 = 0) => { let t = t0; for (let i = 0; i < seconds * hz; i++) orbitStep(s, 1 / hz, t += 1 / hz, home, ROOM); return t; };

// rubber band: identity inside, gives less and less outside, never more than `give`
assert.equal(rubber(0.5, 0, 1, 0.1), 0.5);
assert(rubber(1.05, 0, 1, 0.1) > 1 && rubber(1.05, 0, 1, 0.1) < 1.05, 'beyond the limit it gives, but less');
assert(rubber(50, 0, 1, 0.1) <= 1.1 && rubber(-50, 0, 1, 0.1) >= -0.1, 'never more than `give`');
assert(near(rubber(1 + 1e-7, 0, 1, 0.1), 1 + 1e-7, 1e-9), 'continuous at the limit (no step)');

// limits: the far limit follows the square's edge, the low pitch keeps the lens above the crowd
assert(near(roomAlong(0, 0, 1, 0, 15.5), 15.5) && near(roomAlong(2, 0, -1, 0, 15.5), 17.5) && near(roomAlong(0, 0, Math.SQRT1_2, Math.SQRT1_2, 15.5), 15.5 * Math.SQRT2));
const L = orbitLimits({}, 7, 0.3, 30);
assert(L.distMax === ORBIT.distMax && L.distMin === ORBIT.distMin, 'the far limit caps at distMax');
assert(orbitLimits({}, 11, 0.3, 8).distMax < 8.5, 'near a wall the far limit comes in');
assert(near(7 * Math.sin(L.pitchMin) + ORBIT.focusY, ORBIT.eye) && L.pitchMin > ORBIT.pitchMin, 'close in, the lens stays at eye height over the crowd');
assert.equal(orbitLimits({}, 17, 0.3, 30).pitchMin, ORBIT.pitchMin);

// tap vs drag: under 8 px is a tap (nothing moves), over it a drag
{
  const s = createOrbit(home);
  orbitDown(s, 1, 100, 100, 0);
  assert.equal(orbitMove(s, 1, 105, 104, 0.02), false, 'a wobbly tap is still a tap');
  assert.equal(orbitUp(s, 1, 0.05), 'tap');
  assert.equal(s.yaw, 0, 'a tap turns nothing');
  orbitDown(s, 2, 100, 100, 1);
  orbitMove(s, 2, 112, 100, 1.02); // crosses the threshold: starts the drag without a jerk
  assert.equal(s.yaw, 0);
  orbitMove(s, 2, 162, 100, 1.04);
  assert(near(s.yaw, -50 * ORBIT.turn), 'then it follows the finger');
  assert.equal(orbitUp(s, 2, 1.05), 'drag');
  assert.equal(orbitUp(s, 99, 1.05), null, 'not ours: ignored');
  assert(turnFor(393) === ORBIT.turn && Math.abs(turnFor(1280) * 1280 - 2.4) < 1e-9, 'phones: fixed rate; wide screens: about 140 degrees across the width');
}

// a flick coasts and decays (no jump, frame-rate independent); held still before letting go, it stops
{
  const flick = hz => {
    const s = createOrbit(home);
    orbitDown(s, 1, 0, 0, 0);
    for (let i = 1; i <= 10; i++) orbitMove(s, 1, i * 20, 0, i * 0.016);
    orbitUp(s, 1, 0.17);
    const v0 = s.spin, y0 = s.yaw;
    run(s, 2, hz, 0.17);
    return { v0, s, travel: s.yaw - y0 };
  };
  const a = flick(60), b = flick(120), c = flick(30);
  assert(a.v0 < -3, `a quick flick spins (${a.v0.toFixed(2)} rad/s)`);
  assert(Math.abs(a.s.spin) < Math.abs(a.v0) * 0.02, 'and it dies down within two seconds');
  assert(Math.abs(a.travel - b.travel) < 0.02 && Math.abs(a.travel - c.travel) < 0.05, `the same coast at 30, 60 and 120 fps (${a.travel.toFixed(3)}, ${b.travel.toFixed(3)}, ${c.travel.toFixed(3)})`);
  const s = createOrbit(home);
  orbitDown(s, 1, 0, 0, 0);
  for (let i = 1; i <= 10; i++) orbitMove(s, 1, i * 20, 0, i * 0.016);
  orbitUp(s, 1, 0.5);
  assert.equal(s.spin, 0, 'held still before letting go: no flick');
}

// pitch: dragging past a limit gives like a rubber band, and springs back inside once let go (no overshoot)
{
  const s = createOrbit(home);
  run(s, 0.1);
  orbitDown(s, 1, 0, 0, 1);
  for (let i = 1; i <= 40; i++) orbitMove(s, 1, 0, i * 20, 1 + i * 0.05); // 800 px down: far past 60 degrees
  assert(s.x[0] > ORBIT.pitchMax && s.x[0] <= ORBIT.pitchMax + ORBIT.pitchGive, 'past the top it only gives a little');
  orbitUp(s, 1, 3.5);
  let t = 3.5, prev = s.x[0], mono = true;
  for (let i = 0; i < 60; i++) { orbitStep(s, 1 / 60, t += 1 / 60, home, ROOM); mono &&= s.x[0] <= prev + 1e-9; prev = s.x[0]; }
  assert(mono && near(s.x[0], ORBIT.pitchMax, 0.01), 'springs back to the limit smoothly');
  assert(s.x[0] >= ORBIT.pitchMax - 1e-3, 'without overshooting into the range');
}

// zoom: two fingers scale the distance by their spread; limits give and spring back; the wheel zooms smoothly
{
  assert.equal(pinchDist(10, 100, 200), 5);
  const s = createOrbit(home);
  run(s, 0.1);
  orbitDown(s, 1, 100, 100, 1); orbitDown(s, 2, 200, 100, 1);
  orbitMove(s, 2, 220, 100, 1.05);
  assert(near(s.x[1], home.dist * 100 / 120), 'spreading the fingers comes closer');
  orbitMove(s, 2, 900, 100, 1.1);
  assert(s.x[1] < ORBIT.distMin && s.x[1] > ORBIT.distMin - ORBIT.distGive, 'never inside her: the near limit only gives');
  orbitUp(s, 2, 1.2);
  assert.equal(orbitMove(s, 1, 100, 100, 1.25), true, 'the finger left behind keeps steering (not a tap)');
  orbitUp(s, 1, 1.3);
  run(s, 1, 60, 1.3);
  assert(near(s.x[1], ORBIT.distMin, 0.01), 'springs back to the near limit');
  const w = createOrbit(home);
  run(w, 0.1);
  for (let i = 0; i < 30; i++) orbitZoom(w, wheelFactor(100, false), 1 + i * 0.01);
  const far = w.lim.distMax;
  assert(far < ORBIT.distMax && near(far, ROOM / Math.cos(w.x[0]), 1e-6), 'the far limit: the square\'s edge behind the camera');
  assert(w.zoomTo > far && w.zoomTo <= far + ORBIT.distGive, 'the wheel backs off to the far limit, with a little give');
  run(w, 1.5, 60, 1.3);
  assert(near(w.x[1], w.lim.distMax, 0.02), 'then settles on it');
  assert(wheelFactor(-50, true) < 1 && wheelFactor(50, true) > wheelFactor(50, false), 'pinch-in closer; a trackpad pinch counts more per step');
}

// idle: after ORBIT.idle s the automatic orbit comes back from where the camera is (no jump), easing in
{
  const s = createOrbit(home);
  orbitDown(s, 1, 0, 0, 0);
  for (let i = 1; i <= 20; i++) orbitMove(s, 1, -i * 10, i * 3, i * 0.02);
  orbitUp(s, 1, 1);
  orbitZoom(s, 0.7, 1);
  let t = run(s, 1, 60, 1);
  const yawA = s.yaw, pitchA = s.x[0], distA = s.x[1];
  t = run(s, ORBIT.idle - 1.2, 60, t);
  assert(Math.abs(s.yaw - yawA) < 1e-3 && near(s.x[0], pitchA, 1e-3) && near(s.x[1], distA, 1e-3), 'before the idle time it stays put');
  let prev = s.yaw, worst = 0;
  for (let i = 0; i < 60 * 8; i++) { orbitStep(s, 1 / 60, t += 1 / 60, home, ROOM); worst = Math.max(worst, Math.abs(s.yaw - prev)); prev = s.yaw; }
  assert(worst <= ORBIT.rate / 60 + 1e-9, 'it resumes without a jump');
  assert(near(s.spin, ORBIT.rate, 0.01), 'at the automatic rate');
  assert(near(s.x[0], home.pitch, 0.02) && near(s.x[1], home.dist, 0.05), 'back at the automatic framing');
}
console.log('title orbit ok');

// With a home azimuth (the title's, which the caller sways) the idle camera springs to it instead of spinning: it never
// goes round the plaça, never jumps when home moves, and a drag still steers until the idle time is up.
{
  const s = createOrbit(home), H = { ...home, yaw: -1.4 };
  let t = 0, maxStep = 0, prev = s.yaw;
  for (let i = 0; i < 60 * 40; i++) { // 40 s idle; home sways +-0.3 rad slowly
    H.yaw = -1.4 + 0.3 * Math.sin(t / 3); orbitStep(s, 1 / 60, t += 1 / 60, H, ROOM);
    maxStep = Math.max(maxStep, Math.abs(s.yaw - prev)); prev = s.yaw;
  }
  assert(Math.abs(s.yaw - H.yaw) < 0.35 && Math.abs(s.yaw + 1.4) < 0.8, `idle: stays round its home azimuth, no revolutions (${s.yaw.toFixed(2)})`);
  assert(maxStep * 60 < 0.6, `idle: never faster than 0.6 rad/s (${(maxStep * 60).toFixed(2)})`);
  const d = createOrbit(home); orbitStep(d, 1 / 60, 0.01, H, ROOM); d.yaw = 2.5; d.spin = 0; d.last = 0; // steered to the far side, then left alone
  let tt = 0.01; for (let i = 0; i < 60 * 12; i++) orbitStep(d, 1 / 60, tt += 1 / 60, H, ROOM);
  assert(Math.abs(Math.atan2(Math.sin(d.yaw - H.yaw), Math.cos(d.yaw - H.yaw))) < 0.4, 'after the idle time it eases back to home by the short way');
}
console.log('title orbit home azimuth ok');

// After a drag the selector eases back to its framing: never while a finger is down, from rest (the velocity grows from 0:
// no lurch on the first frame), done within a few seconds, and the same at 30 and 120 fps. With keep (photo mode) the
// player's framing stays however long it waits; once keep ends it eases back the same way.
{
  const H = { ...home, yaw: -1.4 };
  const dragged = () => { const s = createOrbit(home); s.yaw = H.yaw; orbitDown(s, 1, 0, 0, 0); for (let i = 1; i <= 30; i++) orbitMove(s, 1, i * 12, -i * 2, i * 0.02); return s; };
  { // held still for 10 s: nothing comes back under the finger
    const s = dragged(), yaw = s.yaw; let t = 0.6;
    for (let i = 0; i < 600; i++) orbitStep(s, 1 / 60, t += 1 / 60, H, ROOM);
    assert.equal(s.yaw, yaw, 'a held pointer keeps the view');
  }
  const back = (hz, keepFor = 0) => {
    const s = dragged(); orbitUp(s, 1, 0.65); s.spin = 0; let t = 0.65; const steps = [];
    for (let i = 0; i < hz * keepFor; i++) orbitStep(s, 1 / hz, t += 1 / hz, H, ROOM, true);
    const kept = s.yaw;
    for (let i = 0; i < hz * 11; i++) { const y = s.yaw; orbitStep(s, 1 / hz, t += 1 / hz, H, ROOM); steps.push((s.yaw - y) * hz); }
    return { s, steps, kept };
  };
  const a = back(60), b = back(30), c = back(120);
  const start = a.steps.findIndex(v => Math.abs(v) > 1e-9);
  assert(start >= Math.floor((ORBIT.idle - 0.1) * 60) && start <= Math.ceil(ORBIT.idle * 60) + 1, `it waits ORBIT.idle s (${(start / 60).toFixed(2)} s)`);
  assert(Math.abs(a.steps[start]) < 0.05, 'from rest: no lurch on its first frame');
  assert(a.steps.slice(start + 1).every((v, i) => Math.abs(v - a.steps[start + i]) < 0.03), 'its speed changes smoothly frame to frame');
  assert(Math.abs(a.s.yaw - H.yaw) < 0.02, 'a 120 degree drag is back at the framing (within 1 degree) in 11 s');
  assert(Math.abs(a.s.yaw - b.s.yaw) < 0.01 && Math.abs(a.s.yaw - c.s.yaw) < 0.01, 'the same at 30 and 120 fps');
  const k = back(60, 30);
  assert(Math.abs(k.kept - dragged().yaw) < 0.2 && Math.abs(k.kept - H.yaw) > 0.5, 'keep: 30 s later the player\'s framing is still there');
  assert(Math.abs(k.s.yaw - H.yaw) < 0.02, 'and eases back once keep ends');
}
console.log('selector orbit return ok');

// home.time (leaving photo mode): pitch and distance ease back faster, the azimuth keeps its own pace (and speed limit)
{
  const H = { ...home, yaw: -1.4 }, go = time => { const s = createOrbit(home); s.fresh = false; s.yaw = H.yaw + 0.8; s.x[1] = home.dist + 4; s.x[0] = home.pitch + 0.3; s.last = -Infinity; let t = 0; for (let i = 0; i < 60; i++) orbitStep(s, 1 / 60, t += 1 / 60, { ...H, time }, ROOM); return s; };
  const calm = go(undefined), quick = go(0.6);
  assert(Math.abs(quick.x[1] - home.dist) < 0.25 * Math.abs(calm.x[1] - home.dist) && Math.abs(quick.x[0] - home.pitch) < 0.25 * Math.abs(calm.x[0] - home.pitch), 'home.time: size and height come back much sooner');
  assert(Math.abs(quick.yaw - calm.yaw) < 1e-12, 'home.time: the azimuth is untouched');
}
console.log('quick return after photo mode ok');

// A half turn away (the far side of the plaça) eases back no faster than ORBIT.homeSpeed, smoothly, at any frame rate
{
  const H = { ...home, yaw: -1.4 }, back = hz => { const s = createOrbit(home); s.fresh = false; s.yaw = H.yaw + Math.PI - 0.05; s.spin = 0; s.last = -Infinity; let t = 0, top = 0, jump = 0, prev = 0;
    for (let i = 0; i < hz * 14; i++) { const y = s.yaw; orbitStep(s, 1 / hz, t += 1 / hz, H, ROOM); const r = Math.abs(s.yaw - y) * hz; top = Math.max(top, r); jump = Math.max(jump, Math.abs(r - prev)); prev = r; } return { s, top, jump }; };
  const a = back(60), b = back(30), c = back(144);
  assert(a.top <= 0.6 && b.top <= 0.6 && c.top <= 0.6, `half turn: never over 0.6 rad/s (${a.top.toFixed(2)} ${b.top.toFixed(2)} ${c.top.toFixed(2)})`);
  assert(a.jump < 0.05, 'and its speed changes smoothly');
  assert(Math.abs(Math.atan2(Math.sin(a.s.yaw - H.yaw), Math.cos(a.s.yaw - H.yaw))) < 0.02, 'home within 14 s');
}
console.log('half-turn return speed ok');

{ // «Mira el ball»: a drag and a zoom offset the film's shot; let go, they ease back to it, slowly, at any frame rate
  const { createLook, lookStep, resetLook } = await import('../src/scene/orbit.js');
  for (const hz of [30, 60, 120]) {
    const s = createLook();
    orbitDown(s, 1, 100, 100, 0); orbitMove(s, 1, 120, 100, 0.02); orbitMove(s, 1, 320, 160, 0.5); orbitUp(s, 1, 0.6);
    orbitZoom(s, 1.5, 0.6);
    assert(Math.abs(s.yaw) > 0.5 && s.x[0] > 0.1, 'the drag turns and lifts the shot');
    let t = 0.6, maxV = 0;
    for (let i = 0; i < 1.5 * hz; i++) lookStep(s, 1 / hz, t += 1 / hz);
    assert(s.x[1] > 1.2 && Math.abs(s.yaw) > 0.5, 'held a moment after letting go: the chosen view stays');
    for (let i = 0; i < 14 * hz; i++) { const y = s.yaw; lookStep(s, 1 / hz, t += 1 / hz); maxV = Math.max(maxV, Math.abs(s.yaw - y) * hz); }
    assert(Math.abs(s.yaw) < 5e-3 && Math.abs(s.x[0]) < 5e-3 && Math.abs(s.x[1] - 1) < 5e-3, `back on the film at ${hz} Hz`);
    assert(maxV <= ORBIT.homeSpeed + 1e-6, 'eases back no faster than the orbit');
    resetLook(s); assert.equal(s.yaw, 0);
  }
  console.log('watch look ok');
}
