// Live steps off the song, driven hard (the selector's beat turns, photo mode's gallop, reversals, jumps, Tab round the
// beasts): the Mulassa's eight shoes (figures/mulassa/mula-supports.js createStepper) and the Drac's two
// (figures/drac/drac-demo.js) keep under their carriers at 30, 60 and 120 fps, planted shoes never skate, and a figure that
// reappears somewhere else gets its shoes there, not stretched back to where it was. The song's planned shoes are
// mula-dance.mjs's and drac-feet.mjs's.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
Object.assign(globalThis, { location: { search: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }) }); // (core/env.js)
// An external copy of src/ can run the same assertions (a baseline) without editing the checkout.
const ROOT = process.env.FREE_STEPS_ROOT ? pathToFileURL(process.env.FREE_STEPS_ROOT + '/').href : new URL('../../', import.meta.url).href;
const { createStepper, nominalFoot, SUPPORT_LAYOUT } = await import(ROOT + 'src/figures/mulassa/mula-supports.js');
const { newWalker, manualDracStep, demoStep, resumeWalker } = await import(ROOT + 'src/figures/drac/drac-demo.js');
const { newDracPose } = await import(ROOT + 'src/figures/drac/dance-drac.js');
const { PHOTO, photoBody, setPhotoControl, movePhoto } = await import(ROOT + 'src/game/photo-control.js');
const DRAC_SCALE = 0.492, PIVOT = 1.3;
// The cuffs lean, never stretch: a planted shoe within 0.3 m of its carrier, a lifted one within 0.5 (the song's own
// planted shoes reach 0.47 m).
const PLANTED = 0.31, LIFTED = 0.5 + 1e-9;

// ---- the Mulassa: shells that once left shoes 1.3-2 m behind
const shells = {
  // the selector: the demo's yaw spring kicked ±1.25 rad every second, turning about her front pivot (her rear flies round)
  beatTurns(t, dt, s) {
    if (t >= s.nb) { s.yt += s.sgn * 1.25; if (Math.floor(s.nb) % 3 === 0) s.sgn = -s.sgn; s.nb += 1; }
    s.yv += (60 * (s.yt - s.yx) - 10 * s.yv) * dt; s.yx += s.yv * dt;
    s.px += Math.sin(s.yx) * 0.8 * dt; s.pz += Math.cos(s.yx) * 0.8 * dt;
    return [s.px - Math.sin(s.yx) * PIVOT, s.pz - Math.cos(s.yx) * PIVOT, s.yx];
  },
  // photo mode: a gallop built up to 9 m/s, then reined in
  gallop(t, dt, s) { s.v += ((t < 3 ? 9 : 0) - s.v) * (1 - Math.exp(-dt / 0.12)); s.pz += s.v * dt; return [0, s.pz, 0]; },
  // Actual input velocity through walking, Shift, diagonal running, walking again and braking.
  shiftPaces(t, dt) {
    if (t <= dt) { setPhotoControl(true, 'mulassa-valls'); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 }); }
    PHOTO.keys.clear();
    if (t < 4.5) PHOTO.keys.add('KeyW');
    if (t >= 1 && t < 3) PHOTO.keys.add('ShiftLeft');
    if (t >= 2 && t < 4) PHOTO.keys.add('KeyD');
    movePhoto(dt, () => 99);
    return [photoBody().x, photoBody().z, photoBody().yaw];
  },
  // about turns at the trot, as fast as the moving turn rate allows (540 deg/s, a right drag)
  reversals(t, dt, s) {
    const want = Math.floor(t / 1.2) % 2 ? Math.PI : 0; s.yx += Math.sign(want - s.yx) * Math.min(Math.abs(want - s.yx), 9.4 * dt);
    s.px += Math.sin(s.yx) * 3.2 * dt; s.pz += Math.cos(s.yx) * 3.2 * dt; return [s.px, s.pz, s.yx];
  },
  // R pressed again and again: half turns at photo-control's culada rate (9 rad/s, 60 rad/s²), on the spot
  culadas(t, dt, s) {
    if (t > s.nb) { s.yt += Math.PI; s.nb += 1.2; }
    const left = s.yt - s.yx; s.yv = left > 1e-9 ? Math.min(s.yv + 60 * dt, 9, Math.sqrt(120 * left)) : 0; s.yx += Math.min(left, s.yv * dt);
    return [0, 0, s.yx];
  },
};
const means = {};
for (const [name, move] of Object.entries(shells)) for (const hz of [30, 60, 120]) {
  const st = createStepper(), dt = 1 / hz, s = { yx: 0, yv: 0, yt: 0, px: 0, pz: PIVOT, nb: 0, sgn: 1, v: 0 }, nom = {}, last = [];
  let planted = 0, lifted = 0, slide = 0, sum = 0, n = 0, steps = 0;
  for (let k = 1; k <= 5 * hz; k++) {
    const t = k * dt, [x, z, yaw] = move(t, dt, s), shell = { x, z, yaw, roll: 0.05 * Math.sin(t * 4), pitch: 0 };
    const feet = st.update(dt, shell);
    for (let i = 0; i < 8; i++) {
      const f = feet[i], d = Math.hypot(f.x - nominalFoot(shell, i, nom).x, f.z - nom.z);
      if (t > 0.3) { if (f.contact) planted = Math.max(planted, d); else lifted = Math.max(lifted, d); sum += d; n++; }
      if (last[i]?.contact && f.contact) slide = Math.max(slide, Math.hypot(f.x - last[i].x, f.z - last[i].z));
      if (last[i]?.contact && !f.contact) steps++;
      last[i] = { x: f.x, z: f.z, contact: f.contact };
    }
  }
  const at = `${name} at ${hz} fps`;
  assert(planted < PLANTED, `${at}: planted shoes stay under their carriers (${planted.toFixed(2)} m)`);
  assert(lifted < LIFTED, `${at}: ...and lifted ones too (${lifted.toFixed(2)} m)`);
  assert(slide < 1e-9, `${at}: planted shoes never skate (${slide.toFixed(3)} m in a frame)`);
  assert(steps > 20, `${at}: stepping (${steps})`);
  (means[name] ??= []).push(sum / n);
}
for (const [name, m] of Object.entries(means)) // the same gait at any frame rate (the cadence once waited for whole frames)
  assert(Math.max(...m) / Math.min(...m) < 1.25, `${name}: the same steps at 30, 60, 120 fps (mean ${m.map(v => v.toFixed(2)).join(' / ')} m)`);

{ // Tab from the Drac back to her: she reappears metres away; her shoes are planted there, not stretched back
  const st = createStepper(), shell = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }, nom = {};
  for (let k = 0; k < 30; k++) st.update(1 / 60, shell);
  Object.assign(shell, { x: 6, z: -3, yaw: 0.3 });
  const feet = st.update(1 / 60, shell);
  for (let i = 0; i < 8; i++) assert(Math.hypot(feet[i].x - nominalFoot(shell, i, nom).x, feet[i].z - nom.z) < 0.05, 'a figure moved elsewhere stands on its own shoes');
  // the shoes she had when she was hidden (after a jump, mula-stage.js hands them over with place()) are as stale
  st.place(feet.map(f => ({ ...f, x: f.x - 6 })));
  const back = st.update(1 / 60, shell);
  for (let i = 0; i < 8; i++) assert(Math.hypot(back[i].x - nominalFoot(shell, i, nom).x, back[i].z - nom.z) < 0.05, 'stale shoes handed over are planted under her again');
}

{ // a hop or a kick lifts her higher than a carrier's leg: off the song the shoe leaves the floor under it (no 1 m cuffs);
  // the song's planned shoes stay as planned
  const { buildMulassa } = await import(ROOT + 'src/figures/mulassa/mulassa.js');
  const { createCarriers, CUFF } = await import(ROOT + 'src/figures/mulassa/mula-carriers.js');
  const rig = buildMulassa(), car = createCarriers(); rig.root.add(car.group);
  const shell = { x: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }, feet = SUPPORT_LAYOUT.map((_, i) => ({ ...nominalFoot(shell, i, {}), y: 0 }));
  rig.root.position.set(0, 0.5, 0); rig.body.rotation.x = 0.3; // up, and the rear kicked higher still
  const lengths = max => { car.pose(rig, feet, max); const a = car.cuffs.instanceMatrix.array, s = car.shoes.instanceMatrix.array;
    return { cuff: Math.max(...feet.map((_, i) => Math.hypot(a[i * 16 + 4], a[i * 16 + 5], a[i * 16 + 6]))), shoeY: Math.max(...feet.map((_, i) => s[i * 16 + 13])) }; };
  const song = lengths(Infinity), free = lengths(CUFF.max);
  assert(song.cuff > CUFF.max + 0.2, `(the test lifts her out of reach: ${song.cuff.toFixed(2)} m)`);
  assert(free.cuff <= CUFF.max + 1e-6, `off the song no cuff passes ${CUFF.max} m (${free.cuff.toFixed(2)})`);
  assert(free.shoeY > song.shoeY + 0.1, '...the shoe comes up with her instead');
  rig.root.position.set(0, 0, 0); rig.body.rotation.x = 0;
  assert(Math.abs(lengths(CUFF.max).cuff - lengths(Infinity).cuff) < 1e-9, 'standing, the cap changes nothing');
}
// ---- the Drac, driven: its two shoes once stepped on the music's beat at any speed (a metre behind at a gallop)
const offsets = (w, out) => Math.max(...w.local.map(L => Math.hypot(L.x - out.x, L.z - out.z) * DRAC_SCALE));
PHOTO.id = 'drac-valls';
for (const hz of [30, 60, 120]) {
  const dt = 1 / hz, w = newWalker(0, 0, 0), out = newDracPose(), body = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, fire: 0 };
  let worst = 0, worstAir = 0, air = 0, av = 0, takeoff = 0, landed = false, moved = 0, prev = null;
  for (let k = 1; k <= 5 * hz; k++) {
    const t = k * dt, v = t < 4 ? Math.min(9, t * 6) : 0;
    body.vz = v; body.z += v * dt; body.yaw = t > 2.5 && t < 2.9 ? (t - 2.5) * 9 : t >= 2.9 ? 3.6 : 0; // a spin mid-run
    if (Math.abs(t - 1.5) < dt / 2) av = 4.8; // a jump at full gallop (photo-control's Space)
    av -= 14 * dt; air = Math.max(0, air + av * dt); if (!air) av = 0;
    PHOTO.air = air > 0;
    manualDracStep(w, out, dt, t * 2, body, DRAC_SCALE, false);
    const d = offsets(w, out);
    if (t > 0.3) worst = Math.max(worst, d);
    if (air && !takeoff) takeoff = d;
    if (air) worstAir = Math.max(worstAir, d); else if (takeoff) landed = true;
    if (prev) moved += Math.hypot(w.feet[0].x - prev.x, w.feet[0].z - prev.z);
    prev = { x: w.feet[0].x, z: w.feet[0].z };
  }
  assert(worst <= 0.5 + 1e-9, `the Drac at a gallop, ${hz} fps: its shoes keep under it (${worst.toFixed(2)} m)`);
  assert(landed && worstAir <= takeoff + 0.02, `...a jump takes them along, not left on the floor (${worstAir.toFixed(2)} m from ${takeoff.toFixed(2)})`);
  assert(moved > 20, `...and they run with it (${moved.toFixed(1)} m)`);
}
// The real Shift speed ramp never resets the Drac's step phase or leaves a shoe behind.
for (const hz of [30, 60, 120]) {
  setPhotoControl(true, 'drac-valls'); Object.assign(photoBody(), { x: 0, z: 0, yaw: 0 });
  const w = newWalker(0, 0, 0), out = newDracPose(), dt = 1 / hz;
  let phase = null, steps = 0, previousUp = false;
  for (let k = 1; k <= 5 * hz; k++) {
    const t = k * dt;
    PHOTO.keys.clear(); if (t < 4.5) PHOTO.keys.add('KeyW');
    if (t >= 1 && t < 3) PHOTO.keys.add('ShiftRight');
    if (t >= 2 && t < 4) PHOTO.keys.add('KeyD');
    movePhoto(dt, () => 99); manualDracStep(w, out, dt, t * 2, photoBody(), DRAC_SCALE, false);
    assert(offsets(w, out) <= 0.5 + 1e-9, 'Shift pace changes keep Drac shoes within their support reach');
    if (phase !== null) assert(w.gp >= phase && w.gp - phase <= dt * 6.5, 'pace changes advance the same phase continuously');
    if (!previousUp && w.feet[0].up) steps++;
    previousUp = w.feet[0].up; phase = w.gp;
  }
  assert(steps > 10, 'Drac keeps stepping through walk/run/walk');
}
setPhotoControl(false);
{ // back to showing off: the steps ease back onto the music's beat, never jumping a phase
  const dt = 1 / 60, w = newWalker(0, 0, 0), out = newDracPose(), body = { x: 0, z: 0, yaw: 0, vx: 0, vz: 6, fire: 0 };
  PHOTO.air = false;
  for (let k = 1; k <= 60; k++) { body.z += 6 * dt; manualDracStep(w, out, dt, k * dt * 2, body, DRAC_SCALE, false); }
  resumeWalker(w, 2);
  let last = w.gp, jump = 0;
  for (let k = 61; k <= 60 * 8; k++) { demoStep(w, out, dt, k * dt * 2, null, DRAC_SCALE); jump = Math.max(jump, w.gp - last); last = w.gp; }
  const off = Math.abs(((w.gp - 16) % 1 + 1.5) % 1 - 0.5);
  assert(jump < 2 * dt * 1.6, `the shoes' phase changes pace, never jumps (${(jump / dt).toFixed(2)} pairs/s at most)`);
  assert(off < 0.02, `...and is back on the beat (${off.toFixed(3)} of a pair off)`);
}
console.log('free steps ok');
