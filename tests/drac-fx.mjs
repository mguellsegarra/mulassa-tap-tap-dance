// The Drac's fire and powder (src/scene/drac-fx.js): the CREMA burst, the streak fire, the two bengales from the last pass,
// the traca's petards on her five fire points and its TRO, the smoke and spark pools per quality tier, no allocation once
// warm, and the same picture at 60 and 120 fps.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import * as THREE from 'three';
import { createDracFx, DRAC_FX, streakFire, flareLevel, tracaWindow } from '../src/scene/drac-fx.js';
import { PROFILES, MINIMAL } from '../src/platform/render-quality.js';
import { buildDrac } from '../src/scene/models/drac.js';
import { timeAtBeat } from '../src/core/beat-grid.js';

const song = JSON.parse(readFileSync(new URL('../src/song-drac.json', import.meta.url)));
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.smoke), [0, 48, 96, 160], 'smoke pool per tier: minimal none, then 48 / 96 / 160 (the bengales fill a red haze)');
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.embers), [24, 64, 128, 256], 'spark pool per tier: minimal a few, then 64 / 128 / 256');
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.wheels), [64, 160, 320, 400], 'fire-wheel sparks per tier');

function make(smoke = 128, embers = 256, wheels = 0) {
  const scene = new THREE.Scene(), drac = buildDrac(), arm = new THREE.Group(), arm2 = new THREE.Group(), cam = new THREE.PerspectiveCamera();
  scene.add(drac.root, arm, arm2); arm.position.set(4, 1.5, 0); arm2.position.set(-4, 1.5, 0); cam.position.set(0, 4, 12); cam.lookAt(0, 1, 0);
  drac.fire.forEach(f => { f.visible = true; f.scale.setScalar(0.4); }); // world matrices with the flames out, then the dance's own off
  scene.updateMatrixWorld(true);
  const sounds = [];
  const fx = createDracFx(scene, { smoke, embers, wheels, sound: (k, i) => sounds.push([k, i]) });
  const s = { on: true, cam, fire: drac.fire, streak: false, flare: false, max: smoke, emax: embers, wmax: wheels, x: 0, z: 0 };
  const step = dt => { for (const f of drac.fire) { f.visible = false; f.scale.setScalar(0); } fx.update(dt, s); }; // poseDrac resets them every frame
  const run = (sec, fps = 60) => { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) step(1 / fps); };
  return { fx, s, drac, arm, arm2, sounds, step, run };
}

// pools: none at minimal (no smoke mesh at all), capped by the tier
{
  const m = make(0);
  assert.equal(m.fx.objects.smoke, null, 'minimal: no smoke mesh');
  m.fx.crema(); m.run(0.5); assert.equal(m.fx.state().smoke, 0);
  assert(m.fx.state().level > 0, 'the flames still flare without smoke');
  for (const n of [48, 96, 160]) {
    const t = make(n); t.s.streak = true; t.s.flare = true;
    for (let i = 0; i < 6; i++) { t.fx.crema(); t.run(0.3); }
    assert(t.fx.state().smoke > 0 && t.fx.state().smoke <= n, `pool ${n}: ${t.fx.state().smoke} puffs live`);
    assert.equal(t.fx.objects.smoke.count, t.fx.state().smoke);
  }
  const q = make(128); q.s.max = 32; for (let i = 0; i < 6; i++) { q.fx.crema(); q.run(0.3); }
  assert(q.fx.state().smoke <= 32, 'a quality step down since: the live puffs follow the lower tier');
  // sparks (guspires): pooled per tier, from every CREMA and the streak; minimal still shows a few
  for (const [n, s] of [[24, 0], [64, 32], [128, 64], [256, 128]]) {
    const t = make(s, n); t.s.streak = true; t.s.flare = true;
    t.run(0.1); for (let i = 0; i < 6; i++) { t.fx.crema(); t.run(0.15); }
    const live = t.fx.state().embers;
    assert(live > 0 && live <= n && t.fx.objects.sparks.count === live, `spark pool ${n}: ${live} live`);
  }
  const e0 = make(0, 0); e0.fx.crema(); e0.run(0.3); assert.equal(e0.fx.objects.sparks, null, 'no pool: no spark mesh');
}

// CREMA: the flames rise fast, peak well over their dance size, gone by ~1.1 s; smoke from the five tips
{
  const m = make();
  m.run(0.2); assert.equal(m.fx.state().level, 0, 'nothing before a GUAPA');
  m.fx.crema(); m.run(0.05);
  const early = m.fx.state().level; m.run(0.05);
  const peak = m.fx.state().level;
  assert(peak > 1.2 && peak > early * 0.9, `CREMA rises to ${peak.toFixed(2)}`);
  assert(m.drac.fire.every(f => f.visible && f.scale.x > 1), 'all five flames flare');
  m.run(0.3); const mid = m.fx.state().level;
  assert(mid > 0 && mid < peak, 'and decay');
  m.run(0.8); assert.equal(m.fx.state().level, 0, 'gone after ~1.1 s');
  assert(m.fx.state().smoke >= 5, 'smoke puffs from the emitters');
  { const t = make(); t.run(0.1); t.fx.crema(); t.step(1 / 60); assert(t.fx.state().embers >= 5 * 8, 'a CREMA throws sparks from all five fire points'); }
  m.s.on = false; m.fx.crema(); m.run(0.1); assert.equal(m.fx.state().level, 0, 'off (the Mulassa, the practice): no burst');
}

// Short streak breaths follow the musical grid; a miss cancels the next pulse.
{
  assert(!streakFire(29, 4) && streakFire(30, 4) && streakFire(57, 8.25));
  for (const b of [-4, 0.5, 1, 3.99, 4.5, 7.9]) assert(!streakFire(50, b), `no breath at beat ${b}`);
  const m = make();
  m.s.streak = streakFire(30, 4); m.run(0.2);
  assert(m.fx.state().streak > 0 && m.fx.state().embers > 0, 'a small burst on the downbeat');
  m.s.streak = streakFire(30, 5); m.run(1.4);
  assert.equal(m.fx.state().level, 0, 'flames settle between bursts');
  assert.equal(m.fx.state().embers, 0, 'sparks clear between bursts');
  m.s.streak = streakFire(0, 8); m.run(0.2);
  assert.equal(m.fx.state().embers, 0, 'a missed streak does not restart on the next downbeat');
}

// the last pass: from the brake before the reversed spins (flareRef) red smoke builds up to the final hit, evenly over the
// whole plaça (never in the corridor between the lens and her), low over the crowd; it dies away after the song
{
  assert.equal(flareLevel(9, 10, 20), 0, 'not lit before its start');
  assert(flareLevel(12, 10, 20) < 0.15 && flareLevel(15, 10, 20) === 0.5 && flareLevel(20, 10, 20) === 1 && flareLevel(99, 10, 20) === 1, 'a crescendo up to the final hit');
  const m = make(96); m.s.x = 0; m.s.z = 0;
  m.s.flare = 0.3; m.run(8); const early = m.fx.state().smoke;
  m.s.flare = 1; m.run(9); const full = m.fx.state().smoke;
  assert(early < full / 2 && full > 30 && full <= 96, `it follows its level: ${early} puffs at 0.3, ${full} at full (pool 96)`);
  const M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), at = [];
  for (let i = 0; i < m.fx.objects.smoke.count; i++) { m.fx.objects.smoke.getMatrixAt(i, M4); M4.decompose(P, Q, S); at.push([Math.hypot(P.x, P.z), Math.atan2(P.x, P.z), P.y, S.x, P.x, P.z]); }
  assert(Math.max(...at.map(a => a[0])) > 7, 'all over the plaça, metres out');
  const quads = [0, 1, 2, 3].map(q => at.filter(a => Math.floor(((a[1] + Math.PI) / (Math.PI / 2))) % 4 === q).length);
  assert(quads.every(n => n >= full / 8), `even all round, not a wedge (${quads.join(' / ')} puffs a quarter)`);
  // the camera (0, 4, 12) looks at her (0, 0): its corridor along +z stays clear (the puffs only sink and grow there)
  assert(at.every(a => !(a[5] > 0.5 && a[5] < 11 && Math.abs(a[4]) < DRAC_FX.flareClear - 0.4)), 'nothing between the lens and her');
  assert(Math.max(...at.map(a => a[3])) > 4 && at.every(a => a[2] < 3.5), 'big puffs, low over the crowd');
  assert(!('flares' in m.fx.objects) && !m.fx.hold, 'no bengala left');
  assert(m.fx.flare > 0.9, 'its level, for the plaça fog');
  m.s.flare = false; m.fx.clearHaze(); m.step(1 / 60); assert(m.fx.state().smoke === 0 && m.fx.flare === 0, 'a menu clears it at once');
  m.s.flare = 1; m.run(12);
  m.s.flare = false; m.run(18); assert(m.fx.state().smoke === 0 && !m.fx.state().flare, 'it thins out as it built up, gone a while after the song');
}

// traca: the petards ride on her five fire points around the drumroll; each tap fires the next fire point in turn (a
// flash, sparks, a puff, a crack, its flame kicked out), the pop is the TRO from all five at once
{
  const bs = [{ t: 10, end: 12 }, { t: 20, end: 22 }];
  assert.equal(tracaWindow(bs, 9), null); assert.equal(tracaWindow(bs, 9.5), bs[0]); assert.equal(tracaWindow(bs, 12.5), bs[0]); assert.equal(tracaWindow(bs, 13), null);
  const m = make(), need = 8;
  m.step(1 / 60);
  assert.equal(m.fx.pump(1, need), false); assert.equal(m.fx.state().fired, 0, 'not loaded: nothing goes off');
  m.fx.begin(); m.step(1 / 60);
  assert(m.fx.objects.petards.visible, 'loaded on her');
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), M4 = new THREE.Matrix4();
  for (let i = 0; i < 5; i++) { // each petard at its fire point's nozzle
    m.fx.objects.petards.getMatrixAt(i, M4); M4.decompose(P, Q, S);
    const f = m.drac.fire[i], n = f.parent.localToWorld(f.position.clone());
    assert(P.distanceTo(n) < 0.3, `petard ${i} on fire point ${i} (${P.distanceTo(n).toFixed(2)} m)`);
  }
  for (let c = 1; c < need; c++) {
    const e0 = m.fx.state().embers;
    assert.equal(m.fx.pump(c, need), false);
    m.step(1 / 60);
    const st = m.fx.state();
    assert.equal(st.last, (c - 1) % 5, `tap ${c}: fire point ${(c - 1) % 5}`);
    assert(st.flashes[st.last] && st.embers > e0, 'a flash and sparks there');
    assert(m.drac.fire[st.last].visible && m.drac.fire[st.last].scale.x > 1.5, 'its flame kicked out');
  }
  assert.deepEqual(m.sounds.map(s => s[1]), [0, 1, 2, 3, 4, 0, 1], 'one crack per tap, round the five fire points');
  m.run(0.6); assert(m.fx.state().pet.every(p => p === 1), 'the fired ones are replaced');
  const e0 = m.fx.state().embers, f0 = m.fx.state().fired;
  assert.equal(m.fx.pump(need, need), false, 'reaching the target still fires just one petard');
  assert.equal(m.fx.state().fired - f0, 1);
  assert(m.sounds.every(([kind]) => kind === 'crack'), 'no TRO during the drumroll');
  const beforeTro = m.fx.state().fired;
  assert.equal(m.fx.finish(need, need), true, 'the closing hit releases the earned TRO');
  assert.equal(m.fx.finish(need, need), false, 'only one TRO per drumroll');
  m.step(1 / 60);
  const st = m.fx.state();
  assert.equal(st.fired - beforeTro, 5, 'all five at once'); assert(st.flashes.every(Boolean), 'five flashes and the big one');
  assert(st.embers > e0 && st.embers >= 0.8 * 256, `a big burst of sparks: the pool nearly full (${st.embers})`);
  assert.equal(m.sounds.at(-1)[0], 'tro');
  assert(m.fx.state().level > 1, 'and the flames roar');
  // after the window they shrink back into the mouths (Marc: popping out in one frame looked odd), gone in tracaOut s
  const size = () => { const M4 = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); m.fx.objects.petards.getMatrixAt(0, M4); M4.decompose(P, Q, S); return S.x; };
  m.run(DRAC_FX.tracaBack + 0.05); // (the TRO fired all five: let them grow back first)
  m.fx.end(); m.step(1 / 60); const s1 = size();
  assert(m.fx.objects.petards.visible && s1 > 0.5, `still there just after the window, shrinking (${s1.toFixed(2)})`);
  m.run(DRAC_FX.tracaOut / 2); assert(size() < s1 && size() > 0.001, 'smaller half way');
  m.run(DRAC_FX.tracaOut / 2 + 0.05); assert(!m.fx.objects.petards.visible, 'unloaded after the window');
  m.fx.begin(); m.step(1 / 60); assert(m.fx.objects.petards.visible && size() < 0.1, `a new traca grows them out of the mouths (${size().toFixed(3)})`);
  m.fx.end(); m.run(1);
  m.fx.begin(); assert.equal(m.fx.finish(need - 1, need), false, 'too few taps: no TRO');
  assert.equal(m.fx.finish(need * 2, need), true, 'a second window can earn one TRO, even with multiple targets');
}

// no allocation in a frame: (1) the per-frame code (update and what it calls, "once a frame" to warm()) makes no objects,
// arrays or closures (lines marked "(once)" excepted); (2) a sampled heap profile of drac-fx.js over busy warm frames
// (CREMA, streak, bengales, traca, sparks) stays near nothing: V8 boxes a few doubles a frame (heap numbers, 16 bytes; JSC does
// not), while one Vector3 per puff or per flame a frame would be kilobytes.
{
  const src = readFileSync(new URL('../src/scene/drac-fx.js', import.meta.url), 'utf8');
  const hot = src.slice(src.indexOf('function wheels('), src.indexOf('function warm(')); // the rodes de foc's per-frame code too
  for (const line of hot.split('\n')) if (!line.includes('(once)')) assert(!/\bnew |\.map\(|\.filter\(|Array\.from|\[\.\.\.|=>|\{ *\w+:/.test(line.replace(/\/\/.*$/, '')), `allocates a frame: ${line.trim()}`);
  const m = make(128, 256, 512); m.s.streak = true; m.s.flare = true; m.fx.begin();
  const busy = n => { for (let i = 0; i < n; i++) { if (i % 30 === 0) m.fx.crema(); if (i % 600 === 0) m.fx.wheels(4); if (i % 4 === 0) m.fx.pump(1 + (i / 4) % 12, 12); m.step(1 / 60); } };
  busy(20000); // warm: optimised
  const ses = new Session(); ses.connect();
  await ses.post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  busy(3000);
  const { profile } = await ses.post('HeapProfiler.stopSampling'); ses.disconnect();
  let bytes = 0;
  (function walk(n, inFx) { const here = inFx || n.callFrame.url.endsWith('drac-fx.js'); if (here) bytes += n.selfSize; n.children.forEach(c => walk(c, here)); })(profile.head, false);
  assert(bytes / 3000 < 256, `drac-fx.js allocates ~${Math.round(bytes / 3000)} bytes a frame`);
}

// 60 vs 120 fps: the same taps give the same state after the same time
{
  const play = fps => {
    const m = make(128, 256, 512); m.fx.begin();
    const n = 3 * fps;
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      if (i === Math.round(0.5 * fps) || i === Math.round(1.5 * fps)) m.fx.crema();
      if (i === Math.round(0.4 * fps)) m.fx.wheels(3);
      if (i % (fps / 10) === 0 && t > 1 && t < 2) m.fx.pump(Math.round((t - 1) * 10), 8);
      m.s.streak = t > 0.8 && t < 2.2; m.s.flare = t > 1.2 - 1e-9; // (on the same frame at both rates: its ramp is long, it never saturates here)
      m.step(1 / fps);
    }
    return m.fx.state();
  };
  const a = play(60), b = play(120);
  for (const k of ['t', 'level', 'streak', 'flare', 'fired', 'last']) assert(Math.abs(a[k] - b[k]) < 1e-6, `${k}: ${a[k]} at 60 fps, ${b[k]} at 120`);
  assert(Math.abs(a.embers - b.embers) <= 4, `sparks ${a.embers} vs ${b.embers}`);
  const first = s => s.sparks.sort((p, q) => q[3] - p[3])[0];
  assert(Math.abs(first(a)[3] - first(b)[3]) < 0.02, 'the oldest spark the same age');
  assert(Math.abs(a.smoke - b.smoke) <= 2, `smoke ${a.smoke} vs ${b.smoke}`);
  assert(a.wheels > 0 && Math.abs(a.wheelSparks - b.wheelSparks) <= Math.max(6, 0.06 * a.wheelSparks), `wheel sparks ${a.wheelSparks} vs ${b.wheelSparks}`);
  const oldest = s => s.puffs.sort((p, q) => q[3] - p[3])[0];
  const pa = oldest(a), pb = oldest(b);
  assert(Math.abs(pa[3] - pb[3]) < 0.02 && Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < 0.05, 'the oldest puff in the same place');
}
// rodes de foc (the Drac's confetti): wheels(sec) spins a wheel of sparks on each of her five fire points (minimal: the two
// mouths) for sec more (a later call extends it), from their own pool sized per tier, never more than it; only sparks (no
// hub, no sprite); born at the fire point where it is that frame (they follow her), and out by themselves
{
  const born = (m, i) => { const f = m.drac.fire[i], nz = f.parent.localToWorld(f.position.clone()); return m.fx.state().wsparks.some(p => Math.hypot(p[0] - nz.x, p[1] - nz.y, p[2] - nz.z) < 0.35 && p[3] < 0.05); };
  for (const [n, wheels] of [[64, 2], [160, 5], [320, 5], [400, 5]]) {
    const m = make(128, 256, n); m.step(1 / 60);
    const before = []; m.drac.root.parent.traverse(o => o.visible && before.push(o));
    assert.equal(m.fx.state().wheels, 0, 'none until called');
    m.fx.wheels(3); m.run(1);
    const st = m.fx.state();
    assert.equal(st.wheels, wheels, `pool ${n}: ${wheels} wheel(s)`);
    assert(st.wheelSparks > 0.5 * n && st.wheelSparks <= n, `pool ${n}: ${st.wheelSparks} sparks live`);
    assert.equal(st.embers, 0, 'their own pool: the embers untouched');
    const shown = []; m.drac.root.parent.traverse(o => o.visible && (o.isSprite || o.isMesh) && !before.includes(o) && shown.push(o));
    assert.deepEqual(shown, [m.fx.objects.sparks], 'only sparks: no hub, no glow sprite');
    for (let i = 0; i < 5; i++) assert.equal(born(m, i), i < wheels, `wheel ${i} on fire point ${i}`);
    m.fx.wheels(1); m.run(1.6); assert(m.fx.state().wheels > 0, 'a later call keeps them spinning');
    m.run(1.2); assert.equal(m.fx.state().wheels, 0, 'out after their time');
    m.run(1.5); assert.equal(m.fx.state().wheelSparks, 0); assert(m.fx.idle, 'and idle once the last spark falls');
  }
  // they follow her: move her and the new sparks are born at the moved fire points
  const m = make(0, 0, 512); m.fx.wheels(3); m.run(0.3);
  m.drac.root.position.x += 3; m.drac.root.updateMatrixWorld(true); m.run(0.1);
  assert([0, 1, 2, 3, 4].every(i => born(m, i)), 'the emitters follow the fire points');
  // a spiral spray, not a jet: from each point they fly out all round (both sides, up and down) and fall
  const w = make(0, 0, 512); w.fx.wheels(3); w.run(0.6);
  const c = w.drac.fire[0].parent.localToWorld(w.drac.fire[0].position.clone()), M4 = new THREE.Matrix4(), sp = [];
  for (let i = 0; i < w.fx.objects.sparks.count; i++) { w.fx.objects.sparks.getMatrixAt(i, M4); const p = new THREE.Vector3().setFromMatrixPosition(M4); if (p.distanceTo(c) < 1.5) sp.push(p.sub(c)); }
  assert(sp.some(p => p.x > 0.5) && sp.some(p => p.x < -0.5) && sp.some(p => p.y > 0.3) && sp.some(p => p.y < -0.5), 'sparks fly out all round and fall');
  const z = make(0, 0, 0); z.fx.wheels(3); z.run(0.5); assert.equal(z.fx.state().wheels, 0, 'no pool: no wheel');
  const nf = make(0, 0, 512); nf.s.fire = null; nf.fx.wheels(3); nf.run(0.5); assert.equal(nf.fx.state().wheelSparks, 0, 'no fire points (the Mulassa): nothing');
}
console.log('drac fx ok');

// Pending selections discard every pool and emission debt, then a visible Drac can start fresh.
{
  const { fx, s, run, step, sounds } = make(160, 256, 400);
  step(1 / 60); fx.crema(); fx.wheels(2); fx.begin(); fx.pump(1, 2);
  s.flare = s.streak = true; run(0.2);
  assert(!fx.idle && fx.state().embers > 0);
  fx.clear();
  assert(fx.idle);
  for (const obj of Object.values(fx.objects).flat()) if (obj) assert.equal(obj.visible, false);
  assert.equal(fx.state().puffs.length, 0);
  assert.equal(fx.state().sparks.length + fx.state().wsparks.length, 0);
  s.on = s.flare = s.streak = false; s.fire = null;
  const n = sounds.length; run(10);
  assert(fx.idle && sounds.length === n, 'no delayed particles or sounds after clearing');
  const fresh = make(); fresh.step(1 / 60); fresh.fx.clear(); fresh.step(1 / 60);
  fresh.fx.crema(); fresh.fx.begin(); fresh.fx.pump(1, 2); fresh.run(0.1);
  assert(fresh.fx.state().embers > 0 && fresh.fx.objects.petards.count === 5);
  assert(fresh.sounds.some(([k]) => k === 'crack'), 'legitimate traca still works after clear');
}
