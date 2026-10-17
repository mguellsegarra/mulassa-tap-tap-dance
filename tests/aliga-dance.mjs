// The Àliga's dance (src/game/aliga-dance.js): bound to the music's form, deterministic, continuous and bounded at any
// frame rate, feet planted, the aligons clear of her and of each other.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// An outside-Git saved baseline or controlled mutation can exercise the exact same behavioral checks.
const { aligaPose, newAligaPose, standFeet, LEGS, LIMITS } = await import(process.env.ALIGA_DANCE_SOURCE
  ? 'data:text/javascript;base64,' + Buffer.from(readFileSync(process.env.ALIGA_DANCE_SOURCE, 'utf8')).toString('base64')
  : '../src/game/aliga-dance.js');

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const song = read('../src/game/aliga-song.json'), tl = process.env.ALIGA_DANCE_TIMELINE ? JSON.parse(readFileSync(process.env.ALIGA_DANCE_TIMELINE)) : read('../src/game/aliga-dance.json');
const DEG = Math.PI / 180, END = song.end, endBar = song.barTimes.length;

// Drift: a regenerated song that moves a section must fail here, not silently misalign the moves.
assert.deepEqual(tl.sections, song.sections.map(({ name, bar }) => ({ name, bar })), 'timeline sections = aliga-song.json sections');
for (const track of [tl.aliga, tl.aligons]) {
  track.forEach((e, i) => {
    assert(e.bar >= 0 && e.bar < endBar && (!i || e.bar > track[i - 1].bar), `entry at bar ${e.bar} inside the song, in order`);
    assert(['observat', 'inferit', 'adaptat'].includes(e.tag) && e.src, `entry at bar ${e.bar} tagged with its source`);
  });
}

// One pose as numbers, channel by channel.
const NAMES = ['x', 'z', 'yaw', 'pitch', 'roll', 'lift'].map(k => `aliga.${k}`);
for (let i = 0; i < 3; i++) for (const k of ['x', 'z', 'yaw', 'crouch', 'arms', 'lift']) NAMES.push(`aligo${i}.${k}`);
for (const who of ['aliga', 'aligo0', 'aligo1', 'aligo2']) for (let f = 0; f < 2; f++) {
  for (const k of ['x', 'z', 'yaw', 'h']) NAMES.push(`${who}.feet${f}.${k}`);
}
const flat = p => {
  const a = p.aliga, v = [a.x, a.z, a.yaw, a.pitch, a.roll, a.lift];
  for (const g of p.aligons) v.push(g.x, g.z, g.yaw, g.crouch, g.arms, g.lift);
  for (const r of [a, ...p.aligons]) for (const f of r.feet) v.push(f.x, f.z, f.yaw, f.h);
  return v;
};
const at = t => flat(aligaPose(t, song, tl, newAligaPose()));
let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); // reproducible

// Determinism: the same instant gives the same pose whatever was evaluated before, into a reused object or a new one.
const out = newAligaPose(), ts = Array.from({ length: 400 }, () => -5 + rnd() * (END + 10));
const seq = [...ts].sort((a, b) => a - b).map(t => [t, flat(aligaPose(t, song, tl, out))]);
const shuffled = [...seq].sort(() => rnd() - 0.5);
for (const [t, v] of shuffled) assert.deepEqual(flat(aligaPose(t, song, tl, out)), v, `same pose at ${t.toFixed(3)} s in any order`);
assert.equal(aligaPose(10, song, tl, out), out, 'fills the pose it is given');
assert.deepEqual(at(-3), at(0), 'before the song: the start pose');
assert.deepEqual(at(END + 4), at(END), 'after the song: the end pose');
const footObjects = [out.aliga, ...out.aligons].flatMap(r => r.feet);
aligaPose(87, song, tl, out);
assert([out.aliga, ...out.aligons].flatMap(r => r.feet).every((f, i) => f === footObjects[i]), 'reuses every foot object');

// A travelling body must carry its momentum through musical pulses. A planted
// shoe holds the ground; it must not force the entire torso to stop every eighth.
const gaitStart = song.barTimes[12], gaitEnd = song.barTimes[15];
let pulseProbes = 0, minPulseRatio = Infinity;
for (let j = 0; j < song.subBeatTimes.length - 1; j++) {
  const t = song.subBeatTimes[j].t, d = song.subBeatTimes[j + 1].t - t;
  if (t < gaitStart || t > gaitEnd) continue;
  const speed = q => {
    const a = aligaPose(q - 0.00001, song, tl).aligons[0], b = aligaPose(q + 0.00001, song, tl).aligons[0];
    return Math.hypot(b.x - a.x, b.z - a.z) / 0.00002;
  };
  const ratio = speed(t + 0.0001) / speed(t + d / 4);
  minPulseRatio = Math.min(minPulseRatio, ratio); pulseProbes++;
  assert(ratio > 0.5, `aligó torso stops at a musical pulse: speed ratio ${ratio} at ${t}`);
}
assert(pulseProbes > 5, 'travelling torso checked across consecutive musical pulses');
let groundedGait = 0, gaitSamples = 0;
for (let t = gaitStart; t < gaitEnd; t += 0.001) {
  const g = aligaPose(t, song, tl).aligons[0];
  groundedGait += g.feet.filter(f => f.h === 0).length; gaitSamples += 2;
  assert(g.armSwing?.length === 2 && Math.abs(g.armSwing[0] + g.armSwing[1]) < 1e-12,
    'relaxed arm swing alternates in counterphase');
  const fore = (g.feet[0].x - g.feet[1].x) * Math.sin(g.yaw) + (g.feet[0].z - g.feet[1].z) * Math.cos(g.yaw);
  assert(fore * g.armSwing[0] >= -1e-12, 'the arm goes back when its same-side foot goes forward');
}
assert(groundedGait / gaitSamples > 0.3, 'running feet retain sustained alternating contact, rather than hovering');
console.log(`  gait: minimum pulse speed ratio ${minPulseRatio}, grounded foot fraction ${groundedGait / gaitSamples}`);

// Continuity: the same per-ms bound on every channel at 30, 60, 120 and 144 Hz with jittered frames, and on a 1 kHz sweep.
// Units per ms: m, rad, or 0-1.
const BOUND = { // the eagle / an aligó
  x: [0.0025, 0.004], z: [0.0025, 0.004], yaw: [0.006, 0.002], pitch: [0.003], roll: [0.001], lift: [0.0008, 0.0008],
  h: [0.0012, 0.0012], crouch: [, 0.004], arms: [, 0.0025],
};
// A swing covers two steps' displacement in one airborne interval. These added horizontal/heading bounds include that
// faster return (8 m/s, 22/3 rad/s); height and ALL existing root velocity/acceleration bounds stay unchanged.
// New horizontal foot bounds match the rig's 8 m/s / 200 m/s² gate, including the carrier's wider stance in a turn.
const FOOT_BOUND = { x: [0.008, 0.008], z: [0.008, 0.008], yaw: [0.022, 0.003], h: BOUND.h };
const bound = n => { const [who, ch, foot] = n.split('.'); return (foot ? FOOT_BOUND[foot] : BOUND[ch])[who === 'aliga' ? 0 : 1]; };
const worst = {};
for (const hz of [30, 60, 120, 144, 1000]) {
  let t = -0.5, prev = at(t), max = 0;
  while (t < END + 0.5) {
    const dt = (1000 / hz) * (hz === 1000 ? 1 : 0.6 + 0.8 * rnd()), t1 = t + dt / 1000, v = at(t1);
    v.forEach((x, i) => {
      assert(Number.isFinite(x), `${NAMES[i]} finite at ${t1.toFixed(3)}`);
      const r = Math.abs(x - prev[i]) / dt;
      assert(r <= bound(NAMES[i]), `${NAMES[i]} jumps ${r.toFixed(5)}/ms at ${t1.toFixed(3)} s (${hz} Hz)`);
      worst[NAMES[i]] = Math.max(worst[NAMES[i]] || 0, r / bound(NAMES[i]));
      max = Math.max(max, r / bound(NAMES[i]));
    });
    t = t1; prev = v;
  }
  console.log(`  ${hz} Hz: worst channel at ${(100 * max).toFixed(0)}% of its bound`);
}

// The 1 kHz sweep: no velocity spikes (ease at every joint), feet planted, clearances, extremes.
const ACC = { x: 5e-5, z: 5e-5, yaw: 3e-5, pitch: 2e-5, roll: 1e-5, lift: 5e-6, h: 3e-5, crouch: 3e-5, arms: 2e-5 }; // per ms²
// 400 rad/s² at the carrier sole's 0.18 m radius contributes <= 72 m/s² at a corner; the rig also checks full vertex motion.
const FOOT_ACC = { x: [2e-4, 2e-4], z: [2e-4, 2e-4], yaw: [4e-4, 1e-4], h: [ACC.h, ACC.h] };
const acceleration = n => { const [who, ch, foot] = n.split('.'); return foot ? FOOT_ACC[foot][who === 'aliga' ? 0 : 1] : ACC[ch]; };
// Transform every sole corner, including heading: a flat shoe can still skate or spin. Check each planted foot while
// the other swings, not just the roots at the rare double contacts. The rig suite separately checks the actual meshes.
const soleCorners = (f, dim) => [-dim.sole[0] / 2, dim.sole[0] / 2].flatMap(x => [dim.sole[1], -dim.sole[2]].map(z => [
  f.x + x * Math.cos(f.yaw) + z * Math.sin(f.yaw), f.z - x * Math.sin(f.yaw) + z * Math.cos(f.yaw),
]));
const contacts = [0, 0, 0, 0], singleContacts = [0, 0, 0, 0];
function shoesApart(r, dim) {
  const [a, b] = r.feet;
  if (Math.abs(a.h - b.h) >= dim.ankle) return true; // the actual shoes' height = ankle
  const A = soleCorners(a, dim), B = soleCorners(b, dim);
  return [a.yaw, b.yaw].some(yaw => [0, Math.PI / 2].some(turn => {
    const x = Math.cos(yaw + turn), z = -Math.sin(yaw + turn);
    const p = A.map(v => v[0] * x + v[1] * z), q = B.map(v => v[0] * x + v[1] * z);
    return Math.max(...p) <= Math.min(...q) + 1e-8 || Math.max(...q) <= Math.min(...p) + 1e-8;
  }));
}
function checkFeet(p, prev, t) {
  for (const [who, r] of [p.aliga, ...p.aligons].entries()) {
    const dim = who ? LEGS.aligo : LEGS.carrier, offset = 24 + 8 * who;
    const hip = dim.hip + r.lift + (who ? r.crouch * (dim.kneel - dim.hip) : 0);
    assert(shoesApart(r, dim), `${who} rigid shoe boxes intersect at ${t}`);
    r.feet.forEach((f, i) => {
      const o = offset + 4 * i, old = { x: prev[o], z: prev[o + 1], yaw: prev[o + 2], h: prev[o + 3] };
      if (f.h === 0 && old.h === 0) {
        assert(Math.hypot(f.x - old.x, f.z - old.z) < 1e-10 && Math.abs(f.yaw - old.yaw) < 1e-10, `${who}:${i} planted ankle/heading slides at ${t}`);
        const a = soleCorners(f, dim), b = soleCorners(old, dim);
        assert(a.every(([x, z], j) => Math.hypot(x - b[j][0], z - b[j][1]) < 1e-10), `${who}:${i} planted sole corner slides at ${t}`);
        contacts[who]++;
        if (r.feet[1 - i].h > 0.001) singleContacts[who]++;
      }
      const side = i ? -1 : 1, curlZ = who ? r.crouch * dim.curlZ : 0;
      const hx = r.x + side * dim.hipX * Math.cos(r.yaw) + curlZ * Math.sin(r.yaw);
      const hz = r.z - side * dim.hipX * Math.sin(r.yaw) + curlZ * Math.cos(r.yaw);
      const reach = Math.hypot(f.x - hx, f.z - hz, f.h + dim.ankle - hip);
      assert(reach < dim.thigh + dim.shin && reach > Math.abs(dim.thigh - dim.shin), `${who}:${i} leg cannot reach its foot (${reach} m) at ${t}`);
      assert(hip > f.h + dim.ankle + 0.02, `${who}:${i} hip stays above the ankle, clear of the forward-pole singularity at ${t}`);
    });
  }
}
const standing = standFeet(newAligaPose());
checkFeet(standing, flat(standing), 'static standFeet');
let v0 = at(-0.002), v1 = at(-0.001), still = 0, tight = Infinity, crowd = Infinity, deepest = 0;
for (let ms = 0; ms <= END * 1000 + 1; ms++) {
  const t = ms / 1000, v = at(t), p = aligaPose(t, song, tl, out), a = p.aliga;
  v.forEach((x, i) => {
    const acc = Math.abs(x - 2 * v1[i] + v0[i]);
    assert(acc <= acceleration(NAMES[i]), `${NAMES[i]} velocity spike ${acc.toExponential(2)} at ${t} s`);
  });
  // Feet planted: with both feet on the ground (now and a ms ago) nobody travels.
  if (Math.max(a.feet[0].h, a.feet[1].h, v1[27], v1[31]) === 0) {
    assert(Math.hypot(a.x - v1[0], a.z - v1[1]) < 1e-7, `the eagle slides with both feet down at ${t} s`);
    still++;
  }
  p.aligons.forEach((g, i) => {
    const o = 6 + 6 * i, f = 32 + 8 * i;
    if (Math.max(g.feet[0].h, g.feet[1].h, v1[f + 3], v1[f + 7]) === 0) assert(Math.hypot(g.x - v1[o], g.z - v1[o + 1]) < 1e-7, `aligó ${i} slides at ${t} s`);
    const d = Math.hypot(g.x - a.x, g.z - a.z);
    tight = Math.min(tight, d);
    assert(d >= LIMITS.near, `aligó ${i} ${d.toFixed(2)} m from the eagle at ${t} s`);
    for (let j = i + 1; j < 3; j++) {
      const e = Math.hypot(g.x - p.aligons[j].x, g.z - p.aligons[j].z);
      crowd = Math.min(crowd, e);
      assert(e >= LIMITS.apart, `aligons ${i} and ${j} overlap (${e.toFixed(2)} m) at ${t} s`);
    }
    assert(Math.hypot(g.x, g.z) <= LIMITS.radius && g.crouch >= -1e-9 && g.crouch <= 1 + 1e-9, `aligó ${i} inside the plaça at ${t} s`);
    assert(g.feet[0].h >= 0 && g.feet[1].h >= 0 && g.feet[0].h <= 0.15 && g.feet[1].h <= 0.15 && g.arms >= 0 && g.arms <= 1, `aligó ${i} limbs in range at ${t}`);
  });
  assert(a.pitch >= -1e-9 && a.pitch <= LIMITS.pitch && Math.abs(a.roll) <= 20 * DEG, `eagle lean in range at ${t} s`);
  assert(Math.hypot(a.x, a.z) <= LIMITS.radius && a.lift <= 0 && a.lift >= -0.25, `eagle position in range at ${t} s`);
  assert(a.feet[0].h >= 0 && a.feet[1].h >= 0 && a.feet[0].h <= 0.15 && a.feet[1].h <= 0.15 && a.feet[0].h * a.feet[1].h === 0, `one foot at a time at ${t} s`);
  checkFeet(p, v1, t);
  deepest = Math.max(deepest, a.pitch);
  v0 = v1; v1 = v;
}
assert(still > 0, 'the carrier spends time with both feet down; authored stop verified below');
assert(contacts.every(n => n > 1000) && singleContacts.every(n => n > 1000), 'every walker has verified planted soles during single support');
console.log(`  closest aligó ${tight.toFixed(2)} m, closest pair ${crowd.toFixed(2)} m, deepest tilt ${(deepest / DEG).toFixed(1)} deg`);

// Steps start on the actual pulse grid: beats for a slow move, eighths during fast turns/travel. Extra steps change which
// foot lands on the next whole beat. Detect departures at the grid rather than assuming beat-index parity.
const lifted = [];
let eighths = 0;
const pulses = song.subBeatTimes.slice(0, -1).flatMap((s, i) => Array.from({ length: 2 }, (_, j) => ({
  t: s.t + (song.subBeatTimes[i + 1].t - s.t) * j / 2, beat: s.beat + j / 4,
})));
for (let i = 0; i < pulses.length - 1; i++) {
  const { t, beat } = pulses[i], d = pulses[i + 1].t - t;
  const on = aligaPose(t, song, tl), next = aligaPose(t + 0.1 * d, song, tl);
  for (let f = 0; f < 2; f++) if (on.aliga.feet[f].h < 1e-12 && next.aliga.feet[f].h > 1e-6) {
    const before = aligaPose(t - 0.001, song, tl).aliga.feet[f];
    assert(before.h === 0, `foot ${f} takes off at pulse ${i}, not mid-swing`);
    assert(Math.hypot(before.x - on.aliga.feet[f].x, before.z - on.aliga.feet[f].z) < 1e-10 && Math.abs(before.yaw - on.aliga.feet[f].yaw) < 1e-10, `foot ${f} held until pulse ${i}`);
    lifted.push(f);
    if ((beat - song.pickupBeats) % 1 !== 0) eighths++;
  }
}
lifted.forEach((f, i) => assert(f === i % 2, `pulse departure ${i} alternates, left first`));
assert(lifted.length > 0.9 * song.beats.length && eighths > 10, 'the carrier steps throughout the dance and subdivides fast moves');

// The observed shape of the dance.
const bt = b => { const i = Math.floor(b); return song.barTimes[i] + (b - i) * ((song.barTimes[i + 1] ?? END) - song.barTimes[i]); };
const pose = t => aligaPose(t, song, tl, newAligaPose());
const front = y => Math.abs(Math.atan2(Math.sin(y), Math.cos(y)));
let held = 0;
for (let t = bt(73); t < bt(83); t += 0.01) if (pose(t).aliga.pitch >= 65 * DEG) held += 0.01;
const climaxPlateau = bt(81) - bt(74.5);
assert(held >= 0.9 * climaxPlateau && held <= bt(82) - bt(73.5), `climax: 65 degree envelope retains the authored plateau (${held.toFixed(1)} s of ${climaxPlateau.toFixed(1)} s)`);
const last = pose(END), turns = last.aliga.yaw / (2 * Math.PI);
const finalChannels = flat(last);
assert(front(last.aliga.yaw) < 1e-6 && last.aliga.pitch < 1e-6 && last.aliga.feet[0].h + last.aliga.feet[1].h === 0, 'ends still, upright, facing the public');
assert(turns > 8 && Math.abs(turns - Math.round(turns)) < 1e-9, `whole turns, mostly to her left (${turns.toFixed(2)} net)`);
assert(last.aligons.every(g => g.crouch > 0.999), 'the three aligons end curled up on the ground');
for (let ms = 0; ms < 1000 * (END - bt(100)); ms += 10) {
  const p = pose(bt(100) + ms / 1000);
  assert(p.aliga.pitch < 1e-3 && Math.abs(p.aliga.roll) < 1e-3, 'the final stop holds still');
  // Reach support may settle in the first 1.5 beats of the authored stop;
  // its remaining half-beat and the short final bar hold every channel exactly.
  if (bt(100) + ms / 1000 >= bt(100.75)) assert(flat(p).every((x, i) => Math.abs(x - finalChannels[i]) < 1e-12), 'the settled final stop holds every root, pelvis and foot still');
}
const sustained = tl.aliga.map((e, i) => e.move === 'sustained' && [e.bar, tl.aliga[i + 1].bar]).filter(Boolean);
for (const s of tl.sections.slice(1, -1)) { // every phrase starts with her upright unless a sustained tilt spans it (the last tilt runs into the coda: WYMdvjRUn9I 320-323)
  if (sustained.some(([a, b]) => s.bar > a && s.bar < b)) continue;
  assert(pose(bt(s.bar)).aliga.pitch < 30 * DEG, `upright (or rising) as ${s.name} starts`);
}
console.log('aliga dance ok');
