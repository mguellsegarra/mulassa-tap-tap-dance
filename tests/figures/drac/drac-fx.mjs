// The Drac's fire and powder (src/figures/drac/drac-fx.js, src/figures/common/fire.js): the carretilla jets (streak, finale,
// CARRETILLES), the FLAMARADA on a CREMA / the final hit / the TRO, the red smoke of the last pass, the CARRETILLES' taps
// and TRO on her five fire points, the pools per quality tier, no allocation once warm, and the same picture at 60 and 120 fps.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import * as THREE from 'three';
import { createDracFx } from '../../../src/figures/drac/drac-fx.js';
import { DRAC_FX, streakFire, flareLevel, tracaWindow, DRAC_NIGHTS, dracNightWindows, dracNightAt } from '../../../src/figures/drac/drac-fx-rules.js';
import { FIRE, DRAC_MANUAL_FIRE } from '../../../src/figures/common/fire.js';
import { PROFILES, MINIMAL } from '../../../src/platform/render-quality.js';
import { buildDrac } from '../../../src/figures/drac/drac.js';
import { timeAtBeat } from '../../../src/core/beat-grid.js';

const song = JSON.parse(readFileSync(new URL('../../../src/song-drac.json', import.meta.url)));
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.smoke), [0, 48, 96, 160], 'smoke pool per tier: minimal none, then 48 / 96 / 160 (the bengales fill a red haze)');
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.jets), [140, 260, 420, 640], 'carretilla spark pool per tier');
assert.deepEqual([MINIMAL, ...PROFILES].map(p => p.wheels), [64, 160, 320, 400], 'fire-wheel sparks per tier');

function make(smoke = 128, jets = 640, wheels = 0, calm = false) {
  const scene = new THREE.Scene(), drac = buildDrac(), cam = new THREE.PerspectiveCamera();
  scene.add(drac.root); cam.position.set(0, 4, 12); cam.lookAt(0, 1, 0);
  scene.updateMatrixWorld(true);
  const sounds = [];
  const fx = createDracFx(scene, { smoke, jets, wheels, sound: (k, i) => sounds.push([k, i]), calm: { matches: calm } });
  const s = { on: true, cam, fire: drac.fire, streak: false, flare: false, held: false, max: smoke, jmax: jets, wmax: wheels, viewH: 800, x: 0, z: 0 };
  const step = dt => { for (const f of drac.fire) f.userData.level = 0; fx.update(dt, s); }; // poseDrac sets the dance's own level every frame
  const run = (sec, fps = 60) => { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) step(1 / fps); };
  return { fx, s, drac, sounds, step, run };
}
// each tube's mouth, world (where its jet leaves)
const mouth = (drac, i) => { const f = drac.fire[i], t = f.children[0]; return f.localToWorld(new THREE.Vector3(0, 0, t.position.z + t.geometry.parameters.depth / 2)); };
// the birth positions written into the jets' pool
const births = fx => { const a = fx.objects.jets.geometry.attributes.aA.array, out = []; for (let i = 0; i < a.length; i += 4) if (a[i + 3] > -50) out.push(new THREE.Vector3(a[i], a[i + 1], a[i + 2])); return out; };

// the fire points: five carretilla tubes, always on her, their root in the nozzle (tests/figures/drac/drac-parts.mjs holds the joints)
{
  const drac = buildDrac();
  assert.equal(drac.fire.length, 5);
  for (const f of drac.fire) assert(f.visible && f.children.length === 1 && f.children[0].isMesh && f.userData.size > 0, 'a tube on each fire point');
}

// pools: none at minimal (no smoke mesh at all), capped by the tier; the jets pooled per tier
{
  const m = make(0);
  assert.equal(m.fx.objects.smoke, null, 'minimal: no smoke mesh');
  m.fx.crema(); m.run(0.5); assert.equal(m.fx.state().smoke, 0);
  assert(m.fx.state().flamarada > 0, 'the flamarada still burns without smoke');
  for (const n of [48, 96, 160]) {
    const t = make(n); t.s.streak = true; t.s.flare = true;
    for (let i = 0; i < 6; i++) { t.fx.crema(); t.run(0.3); }
    assert(t.fx.state().smoke > 0 && t.fx.state().smoke <= n, `pool ${n}: ${t.fx.state().smoke} puffs live`);
    assert.equal(t.fx.objects.smoke.count, t.fx.state().smoke);
  }
  const q = make(128); q.s.max = 32; q.s.streak = true; for (let i = 0; i < 6; i++) { q.fx.crema(); q.run(0.3); }
  assert(q.fx.state().smoke <= 32, 'a quality step down since: the live puffs follow the lower tier');
  for (const n of [140, 260, 420, 640]) {
    const t = make(0, n); t.s.streak = true; t.run(1);
    const live = t.fx.state().jets;
    assert(live > 0.5 * n && live <= n, `jet pool ${n}: ${live} sparks live`);
  }
  const c = make(0, 640); c.s.streak = true; c.s.jmax = 140; c.run(1.2);
  assert(c.fx.state().jets <= 140, `a quality step down since: the live sparks follow the lower tier (${c.fx.state().jets})`);
  assert.equal(make(0, 0).fx.objects.jets, null, 'no pool: no jet mesh');
}

// the jets: off until a long streak (or the finale: drac-show.js); a tight jet out of each tube's mouth, along the tube
{
  assert(!streakFire(29) && streakFire(30) && streakFire(57));
  const m = make();
  m.run(0.5); assert.equal(m.fx.state().born, 0, 'no streak: no sparks');
  m.s.streak = true; m.run(0.4);
  const st = m.fx.state();
  assert(st.streak === 1 && st.level >= 1 && st.jets > 100, `a streak lights all five (${st.jets} sparks)`);
  const b = births(m.fx);
  for (let i = 0; i < 5; i++) assert(b.some(p => p.distanceTo(mouth(m.drac, i)) < 0.06), `sparks born at tube ${i}'s mouth`);
  assert(b.every(p => [0, 1, 2, 3, 4].some(i => p.distanceTo(mouth(m.drac, i)) < 0.06)), 'and nowhere else');
  m.s.streak = false; m.run(DRAC_FX.streakRamp + 0.02); assert.equal(m.fx.state().level, 0, 'the streak broken: the jets go out');
  const n = m.fx.state().born; m.run(FIRE.jetLife * 1.5 + 0.1);
  assert.equal(m.fx.state().born, n, 'nothing more is born');
  assert.equal(m.fx.state().jets, 0, 'the last sparks fall'); assert(m.fx.idle);
  // the dance's own level (the menu walker, photo mode's take-off) lights them too, without a streak
  const d = make(); d.s.on = false; for (let i = 0; i < 30; i++) { for (const f of d.drac.fire) f.userData.level = 1; d.fx.update(1 / 60, d.s); }
  assert(d.fx.state().jets > 0, 'the pose level lights the jets');
}

// the FLAMARADA: a CREMA fires one from all five; it punches out, lets go of the tubes (then stays put in the world while
// she dances on), throws embers and dark smoke, and is gone in its life; another CREMA while it burns kicks the jets
{
  const m = make();
  m.run(0.2); assert.equal(m.fx.state().flamarada, -1, 'nothing before a CREMA');
  const b0 = m.fx.state().born;
  m.fx.crema(); m.step(1 / 60);
  assert(m.fx.objects.blast.visible && m.fx.objects.flash.visible, 'it goes off with a flash');
  assert(m.fx.state().born - b0 >= 5 * Math.round(640 * FIRE.embers), 'a shower of embers from all five');
  const aP = m.fx.objects.blast.geometry.attributes.aP.array;
  for (let i = 2; i < 5; i++) assert(Math.hypot(aP[i * 4] - mouth(m.drac, i).x, aP[i * 4 + 1] - mouth(m.drac, i).y, aP[i * 4 + 2] - mouth(m.drac, i).z) < 1e-4, `flamarada ${i} out of its tube`);
  const mid = mouth(m.drac, 0).add(mouth(m.drac, 1)).multiplyScalar(0.5), lw = m.fx.objects.blast.geometry.attributes.aLW.array;
  assert(Math.hypot(aP[0] - mid.x, aP[1] - mid.y, aP[2] - mid.z) < 1e-4 && lw[2] === 1, 'the two mouths fire one ball, between the snouts');
  assert.equal(lw[3], 0, '...and the second mouth no flame of its own');
  m.run(FIRE.flash); assert(!m.fx.objects.flash.visible, 'the flash is brief');
  m.fx.crema(); assert(m.fx.state().kick.every(k => k === 1), 'a second CREMA while it burns kicks the jets');
  assert(m.fx.state().flamarada > FIRE.flash, '...and does not restart it');
  m.run(FIRE.flareFree);
  const held = [...aP];
  m.drac.root.position.x += 2; m.drac.root.updateMatrixWorld(true); m.run(0.1);
  assert.deepEqual([...aP], held, 'loose, the fireball stays where it was blown');
  assert(m.fx.state().puffs.length > 0, 'dark smoke where it dies');
  m.run(FIRE.flareLife); assert.equal(m.fx.state().flamarada, -1); assert(!m.fx.objects.blast.visible, 'gone in its life');
  m.fx.crema(); m.step(1 / 60); assert(m.fx.state().flamarada >= 0, 'the next CREMA fires a new one');
  // reduced motion: no strobe
  const c = make(128, 640, 0, true); c.fx.crema(); c.step(1 / 60);
  assert(c.fx.objects.blast.visible && !c.fx.objects.flash.visible, 'reduced motion: the flamarada without its flash');
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

// the CARRETILLES: their jets burn round the drumroll; each tap kicks the next tube's jet in turn (a crack, a flash, a puff),
// the TRO fires all five at once and a flamarada
{
  const m = make();
  const balloons = [{ t: 10, end: 12 }];
  assert.equal(tracaWindow(balloons, 9.3), null); assert.equal(tracaWindow(balloons, 9.5), balloons[0]); assert.equal(tracaWindow(balloons, 12.7), balloons[0]); assert.equal(tracaWindow(balloons, 12.9), null);
  const need = 8;
  assert.equal(m.fx.pump(1, need), false); assert.equal(m.fx.state().fired, 0, 'not lit: nothing goes off');
  m.fx.begin(); m.run(DRAC_FX.tracaIn + 0.05);
  assert(m.fx.state().lit === 1 && m.fx.state().level >= DRAC_FX.tracaJet - 1e-6 && m.fx.state().jets > 0, 'lit: all five jets burn');
  for (let c = 1; c <= 7; c++) {
    assert.equal(m.fx.pump(c, need), false);
    m.step(1 / 60);
    const st = m.fx.state();
    assert.equal(st.last, (c - 1) % 5, `tap ${c}: fire point ${(c - 1) % 5}`);
    assert(st.flashes[st.last] && st.kick[st.last] > 0.9, 'a flash and its jet kicked');
    m.run(0.1);
  }
  assert.deepEqual(m.sounds.map(s => s[1]), [0, 1, 2, 3, 4, 0, 1], 'one crack per tap, round the five fire points');
  const f0 = m.fx.state().fired;
  assert.equal(m.fx.pump(need, need), false, 'reaching the target still kicks just one');
  assert.equal(m.fx.state().fired - f0, 1);
  m.run(FIRE.flareLife);
  const beforeTro = m.fx.state().fired;
  assert.equal(m.fx.finish(need, need), true, 'the TRO when the drumroll closes');
  m.step(1 / 60);
  const st = m.fx.state();
  assert.equal(st.fired - beforeTro, 5, 'all five at once'); assert(st.flashes.every(Boolean), 'five flashes and the big one');
  assert(st.flamarada >= 0 && st.kick.every(k => k > 0.9), 'and a flamarada');
  assert.deepEqual(m.sounds.at(-1), ['tro', 0]);
  assert.equal(m.fx.finish(need, need), false, 'one TRO per window');
  m.fx.end(); m.run(DRAC_FX.tracaOut + 0.05); assert.equal(m.fx.state().lit, 0, 'out after the window');
  m.fx.begin(); assert.equal(m.fx.finish(need - 1, need), false, 'short of the target: no TRO');
  assert.equal(m.fx.finish(need * 2, need), true, 'a second window can earn one TRO, even with multiple targets');
}

// no allocation in a frame: (1) the per-frame code makes no objects, arrays or closures (lines marked "(once)" excepted);
// (2) a sampled heap profile of drac-fx.js and common/fire.js over busy warm frames (CREMA, streak, bengales, carretilles,
// wheels) stays near nothing: V8 boxes a few doubles a frame (heap numbers, 16 bytes; JSC does not), while one Vector3 per
// puff or per spark a frame would be kilobytes.
{
  const scan = (file, from, to) => {
    const src = readFileSync(new URL(`../../../src/figures/${file}`, import.meta.url), 'utf8'), hot = src.slice(src.indexOf(from), src.indexOf(to));
    assert(hot.length > 500, `${file}: found its per-frame code`);
    for (const line of hot.split('\n')) if (!line.includes('(once)')) assert(!/\bnew |\.map\(|\.filter\(|Array\.from|\[\.\.\.|=>|\{ *\w+:/.test(line.replace(/\/\/.*$/, '')), `${file} allocates a frame: ${line.trim()}`);
  };
  scan('drac/drac-fx.js', 'function wheels(', 'function warm(');
  scan('common/fire.js', 'function update(', '  return {\n    update,');
  const m = make(128, 640, 512); m.s.flare = true; m.fx.begin();
  const busy = n => { for (let i = 0; i < n; i++) { m.s.held = i % 800 < 400; m.s.streak = i % 400 < 200; if (i % 70 === 0) m.fx.crema(); if (i % 600 === 0) m.fx.wheels(4); if (i % 4 === 0) m.fx.pump(1 + (i / 4) % 12, 12); m.step(1 / 60); } };
  busy(20000); // warm: optimised
  const ses = new Session(); ses.connect();
  await ses.post('HeapProfiler.startSampling', { samplingInterval: 64, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  busy(3000);
  const { profile } = await ses.post('HeapProfiler.stopSampling'); ses.disconnect();
  let bytes = 0;
  (function walk(n, inFx) { const here = inFx || /(drac-fx|common\/fire)\.js$/.test(n.callFrame.url); if (here) bytes += n.selfSize; n.children.forEach(c => walk(c, here)); })(profile.head, false);
  assert(bytes / 3000 < 256, `drac-fx.js + common/fire.js allocate ~${Math.round(bytes / 3000)} bytes a frame`);
}

// 60 vs 120 fps: the same taps give the same state after the same time
{
  const play = fps => {
    const m = make(128, 640, 512); m.fx.begin();
    const n = 3 * fps;
    for (let i = 0; i < n; i++) {
      const t = i / fps;
      if (i === Math.round(0.5 * fps) || i === Math.round(1.7 * fps)) m.fx.crema();
      if (i === Math.round(0.4 * fps)) m.fx.wheels(3);
      if (i % (fps / 10) === 0 && t > 1 && t < 2) m.fx.pump(Math.round((t - 1) * 10), 8);
      m.s.streak = t > 0.8 && t < 2.2; m.s.flare = t > 1.2 - 1e-9; // (on the same frame at both rates: its ramp is long, it never saturates here)
      m.step(1 / fps);
    }
    return m.fx.state();
  };
  const a = play(60), b = play(120);
  for (const k of ['t', 'level', 'streak', 'lit', 'flare', 'fired', 'last', 'flamarada']) assert(Math.abs(a[k] - b[k]) < 1e-6, `${k}: ${a[k]} at 60 fps, ${b[k]} at 120`);
  assert(Math.abs(a.jets - b.jets) <= Math.max(8, 0.05 * a.jets), `jet sparks ${a.jets} vs ${b.jets}`);
  assert(Math.abs(a.smoke - b.smoke) <= 2, `smoke ${a.smoke} vs ${b.smoke}`);
  assert(a.wheels > 0 && Math.abs(a.wheelSparks - b.wheelSparks) <= Math.max(6, 0.06 * a.wheelSparks), `wheel sparks ${a.wheelSparks} vs ${b.wheelSparks}`);
  const oldest = s => s.puffs.sort((p, q) => q[3] - p[3])[0];
  const pa = oldest(a), pb = oldest(b);
  assert(Math.abs(pa[3] - pb[3]) < 0.02 && Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < 0.05, 'the oldest puff in the same place');
}
// rodes de foc (the Drac's confetti): wheels(sec) spins a wheel of sparks on each of her five fire points (minimal: the two
// mouths) for sec more (a later call extends it), from their own pool sized per tier, never more than it; only sparks (no
// hub, no sprite); born at the tube's mouth where it is that frame (they follow her), and out by themselves
{
  const born = (m, i) => { const nz = mouth(m.drac, i); return m.fx.state().wsparks.some(p => Math.hypot(p[0] - nz.x, p[1] - nz.y, p[2] - nz.z) < 0.35 && p[3] < 0.05); };
  for (const [n, wheels] of [[64, 2], [160, 5], [320, 5], [400, 5]]) {
    const m = make(128, 640, n); m.step(1 / 60);
    const before = []; m.drac.root.parent.traverse(o => o.visible && before.push(o));
    assert.equal(m.fx.state().wheels, 0, 'none until called');
    m.fx.wheels(3); m.run(1);
    const st = m.fx.state();
    assert.equal(st.wheels, wheels, `pool ${n}: ${wheels} wheel(s)`);
    assert(st.wheelSparks > 0.5 * n && st.wheelSparks <= n, `pool ${n}: ${st.wheelSparks} sparks live`);
    assert.equal(st.jets, 0, 'their own pool: the jets untouched');
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
  const c = mouth(w.drac, 0), M4 = new THREE.Matrix4(), sp = [];
  for (let i = 0; i < w.fx.objects.sparks.count; i++) { w.fx.objects.sparks.getMatrixAt(i, M4); const p = new THREE.Vector3().setFromMatrixPosition(M4); if (p.distanceTo(c) < 1.5) sp.push(p.sub(c)); }
  assert(sp.some(p => p.x > 0.5) && sp.some(p => p.x < -0.5) && sp.some(p => p.y > 0.3) && sp.some(p => p.y < -0.5), 'sparks fly out all round and fall');
  const z = make(0, 0, 0); z.fx.wheels(3); z.run(0.5); assert.equal(z.fx.state().wheels, 0, 'no pool: no wheel');
  const nf = make(0, 0, 512); nf.s.fire = null; nf.fx.wheels(3); nf.run(0.5); assert.equal(nf.fx.state().wheelSparks, 0, 'no fire points (the Mulassa): nothing');
}

// Pending selections discard every pool and emission debt, then a visible Drac can start fresh.
{
  const { fx, s, run, step, sounds } = make(160, 640, 400);
  step(1 / 60); fx.crema(); fx.wheels(2); fx.begin(); fx.pump(1, 2);
  s.flare = s.streak = true; run(0.2);
  assert(!fx.idle && fx.state().jets > 0);
  fx.clear();
  assert(fx.idle);
  for (const obj of Object.values(fx.objects).flat()) if (obj) assert.equal(obj.visible, false);
  assert.equal(fx.state().puffs.length, 0);
  assert.equal(fx.state().jets + fx.state().wsparks.length, 0);
  s.on = s.flare = s.streak = false; s.fire = null;
  const n = sounds.length; run(10);
  assert(fx.idle && sounds.length === n, 'no delayed particles or sounds after clearing');
  const fresh = make(); fresh.step(1 / 60); fresh.fx.clear(); fresh.step(1 / 60);
  fresh.fx.crema(); fresh.fx.begin(); fresh.fx.pump(1, 2); fresh.run(0.1);
  assert(fresh.fx.state().flamarada >= 0 && fresh.fx.state().jets > 0);
  assert(fresh.sounds.some(([k]) => k === 'crack'), 'legitimate carretilles still work after clear');
}

// Explicit free-mode hold: no repeated CREMA calls, bounded pools, natural flame decay after release.
for (const calm of [false, true]) for (const profile of [MINIMAL, ...PROFILES]) {
  const m = make(profile.smoke, profile.jets, profile.wheels, calm);
  m.s.manual = m.s.held = true;
  const geometry = m.fx.objects.jets.geometry, capacity = geometry.attributes.aA.array;
  for (let i = 0; i < 1200; i++) {
    m.drac.root.position.x = Math.sin(i / 60); m.drac.root.rotation.y = i / 120;
    m.step(1 / 60);
    assert(m.fx.objects.blast.visible, 'held flame has no gaps, including after the burst timeout');
    if (i % 60 === 0) assert(m.fx.state().jets <= profile.jets, 'held sparks stay in their fixed pool');
  }
  assert.equal(geometry.attributes.aA.array, capacity, 'holding never replaces the particle buffer');
  const at = m.fx.objects.blast.geometry.attributes.aP.array;
  const mid = mouth(m.drac, 0).add(mouth(m.drac, 1)).multiplyScalar(0.5);
  assert(Math.hypot(at[0] - mid.x, at[1] - mid.y, at[2] - mid.z) < 1e-4, 'the sustained flame follows the moving, turning mouths');
  assert.equal(m.fx.state().wheels, 0, 'manual fire emits directed jets, no camera-facing wheels');
  m.s.held = false; m.step(1 / 60);
  const born = m.fx.state().born;
  assert(m.fx.objects.blast.visible && m.fx.state().wheels === 0, 'release stops emission while the existing flame fades naturally');
  m.run(3);
  assert.equal(m.fx.state().born, born, 'no extra sparks emitted after release');
  assert(m.fx.idle, 'already emitted particles die naturally');
  for (let tap = 0; tap < 3; tap++) {
    m.s.held = true; m.run(0.05);
    assert(m.fx.objects.blast.visible, 'short presses light the flame, even during the previous decay');
    m.s.held = false; m.step(1 / 60);
    const stopped = m.fx.state().born;
    m.run(0.1);
    assert.equal(m.fx.state().born, stopped, 'rapid re-presses leave no extra jet emission after keyup');
  }
  m.run(3); assert(m.fx.idle, 'rapid taps leave no stuck fire');
}
console.log('drac fx and sustained free-mode fire ok');

// A held action owns its profile through release, then leaving control restores the dance.
{
  const m = make(96, 420, 320);
  m.s.streak = true; m.run(0.5); m.fx.crema(); m.step(1 / 60);
  const lw = m.fx.objects.blast.geometry.attributes.aLW.array;
  assert.deepEqual([...lw].map(v => +v.toFixed(4)), [2, 1.9, 1, 0, 0, 1, 1.8, 1.25, 0, 1.4, 0.95, 0, 1.4, 0.95, 0], 'dance keeps all five original flame dimensions');
  assert.deepEqual([0, 1, 2, 3, 4].map(i => m.fx.nozzles[i * 8 + 6]), [1, 1, 1, 1, 1], 'dance jets keep equal intensity');
  m.s.manual = true; m.s.held = true; m.run(0.5);
  assert.equal(m.fx.fireProfile, DRAC_MANUAL_FIRE);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => +m.fx.nozzles[i * 8 + 6].toFixed(3)), [1, 1, 0.06, 0.035, 0.035], 'explicit action prioritizes the two mouth sockets');
  assert(lw[6] < 0.33 && lw[7] < 0.21 && lw[9] < 0.2 && lw[10] < 0.12, 'tail and wings have residual physical volumes');
  assert.equal(m.fx.state().smoke, 0, 'manual onset has no smoke or radial ember cloud');
  const small = [...lw]; m.s.held = false; m.step(1 / 60);
  assert.deepEqual([...lw], small, 'keyup never expands the cooling residual flames');
  m.s.manual = false; m.s.streak = false; m.step(1 / 60);
  assert.equal(m.fx.fireProfile, null); assert(m.fx.idle, 'mode exit clears the held effect and its emission debt');
  m.fx.crema(); m.step(1 / 60);
  assert.equal(+lw[6].toFixed(2), 1.8, 'the next dance burst restores the full tail');
  assert.equal(+lw[9].toFixed(2), 1.4, 'the next dance burst restores the full wing');
  m.fx.clear(); assert(m.fx.idle);
}

{ // the night proposals: each window inside the song, in order; A covers the mid GLOBUS, B the GLOBUS and the final hit, C misses the GLOBUS
  for (const [k, n] of Object.entries(DRAC_NIGHTS)) for (const [a, b] of dracNightWindows(song, n)) assert(a >= 0 && a < b && (b <= song.end || b === Infinity), `night ${k} window ${a}-${b}`);
  const globus = timeAtBeat(song.beats, 126), last = song.end + 2; // (the tail rings on past the end)
  assert(!!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.a), globus) && !dracNightAt(dracNightWindows(song, DRAC_NIGHTS.a), last));
  assert(!!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.b), last) && !!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.b), globus));
  assert(!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.b), timeAtBeat(song.beats, 180)), 'B: day again between its two nights');
  assert(!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.c), globus) && !!dracNightAt(dracNightWindows(song, DRAC_NIGHTS.d), last));
  assert.equal(dracNightAt(dracNightWindows(song, DRAC_NIGHTS.b), globus)[2].look, 'blue', 'B: its mid-song night in A\'s blue');
  assert.equal(dracNightAt(dracNightWindows(song, DRAC_NIGHTS.b), last)[2].look, 'ember', 'B: its final in red');
  assert.deepEqual(dracNightWindows(song, null), [], 'no night: day all through');
}
