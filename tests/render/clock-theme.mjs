// The roundRect polyfill, the smooth song clock, session-only quality recovery and the figure theme on the canvas:
// contracts on the shared running game (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { renderDpr, smoothClock } from '../../src/platform/render-quality.js';
import { vm, THREE, chart, practice, energy, dance, errors, windowHandlers, document, context, run } from './game-context.mjs';
// Canvas roundRect polyfill (src/platform/polyfills.js, Safari 15 / Chrome < 99): number or 1–4 radii, radii that don't fit shrink.
{
  const { roundRect } = await import('../../src/platform/polyfills.js');
  const path = () => { const ops = []; return { ops, moveTo: (...a) => ops.push(['M', ...a]), arcTo: (...a) => ops.push(['A', ...a]), closePath: () => ops.push(['Z']) }; };
  const radii = r => { const p = path(); roundRect.call(p, 0, 0, 100, 40, r); return p.ops.filter(o => o[0] === 'A').map(o => +o[5].toFixed(3)); };
  assert.deepEqual(radii(8), [8, 8, 8, 8], 'one number: every corner (tr, br, bl, tl)');
  assert.deepEqual(radii([8]), [8, 8, 8, 8], 'an array of one');
  assert.deepEqual(radii([0, 6, 6, 0]), [6, 6, 0, 0], 'four radii in CSS order tl, tr, br, bl');
  assert.deepEqual(radii([2, 5]), [5, 2, 5, 2], 'two radii: tl/br and tr/bl');
  assert.deepEqual(radii(40), [20, 20, 20, 20], 'a pill: radii larger than half the height shrink to fit');
  assert.deepEqual(radii(), [0, 0, 0, 0], 'no radius: square corners');
  const p = path(); roundRect.call(p, 10, 20, 30, 40, 5);
  assert.deepEqual(p.ops[0], ['M', 15, 20], 'starts after the top-left corner');
  assert.deepEqual(p.ops.at(-1), ['M', 10, 20], 'a new subpath at (x, y) afterwards, like the native one');
  console.log('canvas roundRect polyfill ok');
}

{ // the drawn song clock: the audio clock only moves in whole render buffers (256 samples at 48 kHz = 5.33 ms, 1024 on
  // some phones); the frames must still advance evenly, stay with the audio and never run backwards
  const run = (hz, block, frames = 1200, rate = 1, jitter = 0) => {
    const view = smoothClock(), q = block / 48000, steps = [], drift = [];
    let prev = null, audioReal = 10, now = 0, last = 0;
    for (let i = 0; i < frames; i++) {
      const dt = 1 / hz + (jitter ? (i % 7 - 3) * jitter : 0);
      now += dt; audioReal += dt * rate;
      const audio = Math.floor(audioReal / q) * q; // what ctx.currentTime reads: the last rendered buffer
      const v = view(audio, now - last); last = now;
      if (prev != null) steps.push({ step: v - prev, dt });
      drift.push(v - audio);
      prev = v;
    }
    return { steps: steps.slice(120), drift: drift.slice(120), all: steps };
  };
  for (const [hz, block] of [[60, 256], [120, 256], [60, 1024], [144, 128], [90, 441]]) {
    const { steps, drift, all } = run(hz, block);
    assert(all.every(s => s.step >= 0), `${hz} Hz/${block}: monotonic`);
    const worst = Math.max(...steps.map(s => Math.abs(s.step - s.dt)));
    assert(worst < 0.001, `${hz} Hz/${block}: every frame advances by its real time (±1 ms), got ±${(worst * 1000).toFixed(2)} ms`);
    const raw = 1 / hz % (block / 48000);
    if (raw > 1e-4) assert(worst < raw / 3, `${hz} Hz/${block}: much smoother than the raw buffer steps`);
    assert(Math.max(...drift.map(Math.abs)) <= block / 48000 + 0.002, `${hz} Hz/${block}: within about a buffer of the audio clock`);
  }
  // uneven frame times (a busy phone) and an audio clock 0.2% off the frame clock: still bounded, still monotonic
  { const { drift, all } = run(60, 1024, 3000, 1.002, 0.002);
    assert(all.every(s => s.step >= 0), 'jittery frames: monotonic');
    assert(Math.max(...drift.map(Math.abs)) < 0.03, 'a drifting audio clock is followed (bounded)'); }
  // a jump (new song, seek, restart) is taken at once; dt = 0 (paused) holds it; a long stall re-syncs
  const view = smoothClock();
  view(5, 0.016); for (let i = 0; i < 30; i++) view(5 + i * 0.016, 0.016);
  assert.equal(view(40, 0.016), 40, 'a seek snaps');
  assert.equal(view(-3, 0.016), -3, 'a restart (backwards) snaps');
  const held = view(-2.99, 0.016);
  assert.equal(view(-2.99, 0), held, 'paused: holds');
  assert.equal(view(-2.99, 0), held, 'paused: still holds');
  assert.equal(view(7, 1), 7, 'after a stall (hidden tab) it takes the audio clock');
  // it never runs more than 30 ms ahead of an audio clock that stops (the song ended, the context suspended)
  let v = 0; for (let i = 0; i < 60; i++) v = view(7.05, 0.016);
  assert(v <= 7.05 + 0.03 + 1e-9, 'never far ahead of a stopped audio clock');
  // main.js draws the lane through it on top of the de-stepped audio clock (already smooth): identical while the audio
  // runs evenly, but a jump of the audio device itself (+4.3 ms measured on a Mac; ~27 ms in a rare glitch) is eased
  // in instead of popping every note (at 889 px/s, 4.3 ms = 3.8 px in one frame)
  for (const jump of [0.0043, 0.0267]) {
    const ease = smoothClock(); let a = 20, prevV = ease(a, 0), worst = 0, same = 0;
    for (let i = 1; i < 120; i++) {
      a += 1 / 60 + (i === 60 ? jump : 0);
      const v2 = ease(a, 1 / 60);
      if (i < 60) same = Math.max(same, Math.abs(v2 - a));
      worst = Math.max(worst, Math.abs(v2 - prevV - 1 / 60)); prevV = v2;
    }
    assert(same < 1e-9, 'an even audio clock is drawn as is');
    assert(worst < jump / 8, `a ${jump * 1000} ms jump of the audio device: at most ${(worst * 1000).toFixed(2)} ms extra in one frame`);
    assert(Math.abs(prevV - a) < jump / 4, 'and it is caught up within a second');
  }

  // The de-stepped song clock (audio-clock.js audioClock) that draws, judges and calibrates: ctx.currentTime moves per
  // rendered buffer (each callback up to 0.5 ms late), rAF callbacks land ±1 ms off the refresh and read the clock up
  // to 2 ms into the frame; the audio clock may run ±50 ppm off the system's. `A` is the true audio time.
  const { Chip } = await import('../../src/platform/audio.js'), { audioClock } = await import('../../src/platform/audio-clock.js');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P0 = 5000; // performance.now() at t = 0
  const fakeCtx = (block, rate = 1) => {
    const q = block / 48000, late = k => (k * 7919 % 101) / 101 * 0.0005;
    return { t: 0, A: 3.2, state: 'running', stall: false, outputLatency: 0.012,
      go(dt) { this.t += dt; if (this.state === 'running' && !this.stall) this.A += dt * rate; },
      get currentTime() { const k = Math.floor(this.A / q + 1e-9); return (this.A - k * q < late(k) ? k - 1 : k) * q; } };
  };
  const clockFor = ctx => audioClock(ctx, { perf: () => P0 + ctx.t * 1000 });
  const frames = (ctx, clock, hz, secs, each) => { // rAF frames: the estimate at the frame's time vs the true audio time
    const t0 = ctx.t, out = [];
    for (let i = 1; i <= secs * hz; i++) {
      const at = t0 + i / hz + (rnd() - 0.5) * 0.002;
      each?.(ctx.t - t0);
      ctx.go(at - ctx.t); const truth = ctx.A;
      ctx.go(rnd() * 0.002);
      out.push({ t: at - t0, est: clock.at(P0 + at * 1000), truth, raw: ctx.currentTime });
    }
    return out;
  };
  const worst = (fs, from = 1) => Math.max(...fs.filter(f => f.t > from).map(f => Math.abs(f.est - f.truth)));
  const monotonic = fs => fs.every((f, i) => !i || f.est > fs[i - 1].est);
  for (const block of [256, 1024, 2048]) for (const hz of [60, 144]) for (const rate of [1, 1.00005, 0.99995]) {
    const ctx = fakeCtx(block, rate), fs = frames(ctx, clockFor(ctx), hz, 12), name = `${block} samples, ${hz} Hz, ×${rate}`;
    assert(worst(fs) < 0.001, `${name}: within 1 ms of the true audio time, got ${(worst(fs) * 1000).toFixed(2)} ms`);
    assert(monotonic(fs), `${name}: monotonic`);
    const raw = Math.max(...fs.map(f => f.truth - f.raw));
    assert(raw > block / 48000 * 0.8, `${name}: the raw clock really was stepped (${(raw * 1000).toFixed(1)} ms behind)`);
  }
  { // a new run (Chip.start: song start, seek, restart) snaps at once and settles within a second
    const ctx = fakeCtx(1024), chip = Object.assign(Object.create(Chip.prototype), { ctx, t0: 0 });
    chip._clock = clockFor(ctx);
    frames(ctx, chip.clock, 60, 3);
    chip.t0 = ctx.currentTime + 3 - 40; chip.clock.run(); // `from` 40 s, 3 s of count-in
    const first = chip.now(P0 + ctx.t * 1000);
    assert(Math.abs(first - (40 - 3 - 0.012)) < 1e-9, 'a seek snaps: the song position at once');
    const fs = frames(ctx, chip.clock, 60, 3);
    assert(worst(fs) < 0.001 && monotonic(fs), 'and settles within a second, monotonic');
  }
  { // pause: the context is suspended (its clock stops, performance.now doesn't); resuming takes the device 30 ms
    const ctx = fakeCtx(2048), clock = clockFor(ctx);
    frames(ctx, clock, 60, 2);
    ctx.state = 'suspended';
    const paused = frames(ctx, clock, 60, 3);
    assert(paused.every(f => f.est === paused[0].est && f.est === ctx.currentTime), 'suspended: the held audio clock, not running on');
    ctx.state = 'running'; ctx.stall = true;
    const waking = frames(ctx, clock, 60, 0.03);
    assert(waking.every(f => f.est === paused[0].est), 'resumed, the device not yet started: still held');
    ctx.stall = false;
    const fs = frames(ctx, clock, 60, 3);
    assert(fs.every(f => f.est - f.truth < 0.001), 'never ahead of the resumed audio clock (re-anchored)');
    assert(worst(fs) < 0.001 && monotonic(fs), 'resumed: within 1 ms after a second, monotonic');
  }
  { // audio stalls while running (an underrun): a long one re-anchors; a short one sinks back within a few seconds
    for (const [ms, settle] of [[200, 1], [20, 4]]) {
      const ctx = fakeCtx(1024), clock = clockFor(ctx);
      frames(ctx, clock, 60, 3);
      ctx.stall = true; const during = frames(ctx, clock, 60, ms / 1000); ctx.stall = false;
      const fs = frames(ctx, clock, 60, 6);
      assert(Math.max(...during.concat(fs).map(f => f.est - f.truth)) < 0.052, `${ms} ms stall: never far ahead`);
      assert(worst(fs, settle) < 0.001, `${ms} ms stall: back within 1 ms after ${settle} s`);
      if (ms < 50) assert(monotonic(during.concat(fs)), `${ms} ms stall: still monotonic`);
    }
  }
  { // the output latency is latched per run: the median of its first 0.5 s
    const ctx = fakeCtx(256), clock = clockFor(ctx), wobble = [0.02, 0.031, 0.019, 0.022, 0.05, 0.021];
    let i = 0;
    frames(ctx, clock, 60, 0.5, () => { ctx.outputLatency = wobble[i++ % wobble.length]; clock.latency(); });
    const latched = clock.latency();
    assert(latched >= 0.02 && latched <= 0.022, `the median, not a spike (${latched})`);
    ctx.outputLatency = 0.2; frames(ctx, clock, 60, 1, () => clock.latency());
    assert.equal(clock.latency(), latched, 'then fixed for the run');
    clock.run(); frames(ctx, clock, 60, 0.6, () => clock.latency());
    assert.equal(clock.latency(), 0.2, 'a new run latches again');
  }
  { // a tap at a known event time, with the audio clock in 1024-sample steps, is judged within 1 ms of the truth
    const main = source => vm.runInContext(source, context); // (`run` is the smooth clock's helper here)
    const ctx = fakeCtx(1024), chip = Object.assign(Object.create(Chip.prototype), { ctx, t0: 1, sfx() {} });
    chip._clock = clockFor(ctx);
    context.fakePerf = () => P0 + ctx.t * 1000;
    context.testChip = chip;
    main('performance.now = () => fakePerf(); chip = testChip; offsetMs = 0;');
    frames(ctx, chip.clock, 60, 2);
    const at = P0 + ctx.t * 1000 - 8, truth = ctx.A - 0.008 - chip.t0 - 0.012; // the event happened 8 ms ago
    assert(Math.abs(main(`songTime(eventAt({ timeStamp: ${at} }))`) - truth) < 0.001, 'the tap reads the song clock at its timeStamp, within 1 ms');
    main(`Object.assign(G, { state: 'play', paused: false, collapseT: 0, practice: null, diff: 2, next: 0, streak: 0, combo: 0, energy: 1,
      counts: { perfect: 0, good: 0, miss: 0 }, errors: { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 }, score: 0, maxCombo: 0 });
      G.balloons = []; bigPending = null; G.hold = null; WIN = WINDOWS[2];
      var edgeIn = { t: ${truth - 0.034}, input: 'L', phrase: 0, hit: null }, edgeOut = { t: ${truth - 0.036}, input: 'R', phrase: 0, hit: null };
      G.chart = [edgeIn]; press('L', { timeStamp: ${at} }); G.chart = [edgeOut]; G.next = 0; press('R', { timeStamp: ${at} });`);
    assert.equal(main('edgeIn.hit'), 'perfect', 'DIFÍCIL: 34 ms late is PERFECTE');
    assert.equal(main('edgeOut.hit'), 'good', 'DIFÍCIL: 36 ms late is BÉ');
    main('performance.now = () => 0');
  }
  console.log('smooth song clock ok');
}

// The real downgrade callback still updates the scene and resolution, but cannot poison the next page load.
{
  const saved = { 'render-quality': '{"level":-1}', 'leaderboard-alias': 'kept', 'menu-music': '1' };
  const writes = [];
  context.localStorage = { getItem: k => saved[k] ?? null, setItem: (k, v) => writes.push([k, v]), removeItem: k => writes.push([k]) };
  run(`G.state = 'select'; G.paused = false; chip = null;
    qualityLevel = 1; applyRenderQuality(); devicePixelRatio = 3;
    var qualityCompiles = 0, qualityDpr = 0;
    renderer.compileAsync = () => { qualityCompiles++; return Promise.resolve(); };
    renderer.setPixelRatio = dpr => { qualityDpr = dpr; };
    for (let i = 0; i < 400; i++) monitorFrames(1000 / 20, 10, pace, false);`);
  assert.equal(run('qualityLevel'), -1, 'slow frames reach the minimal floor');
  assert.equal(run('renderProfile.name'), 'minimal', 'the scene profile follows the downgrade');
  assert.equal(run('qualityDpr'), run('renderDpr(renderProfile, sizedW, sizedH, devicePixelRatio)'), 'resize applies the lower DPR');
  assert(run('qualityCompiles > 0'), 'the downgraded scene is precompiled');
  assert.deepEqual(writes, [], 'adaptive drops do not write or clear stored preferences');
  const rendererBefore = run('renderer');
  document.hidden = true;
  document.listeners.visibilitychange?.();
  document.hidden = false;
  document.listeners.visibilitychange?.();
  for (const h of windowHandlers.pageshow || []) h({ persisted: true });
  assert.equal(run('qualityLevel'), -1, 'visibility and BFCache resume retain the session level');
  assert.equal(run('renderer'), rendererBefore, 'resume does not recreate the WebGL context');
  context.localStorage = new Proxy({}, { get() { throw new Error('storage blocked'); } });
  run('qualityLevel = 1; for (let i = 0; i < 400; i++) monitorFrames(1000 / 20, 10, pace, false);');
  assert.equal(run('qualityLevel'), -1, 'adaptation also works with blocked storage');
  console.log('session-only quality recovery ok');
}

// The canvas follows the figure's buttons: the note colours change in place and the Mulassa's come back untouched.
{
  run('setFigureSong(DRAC)');
  assert.deepEqual(run('JSON.stringify([DIRC.L, DIRC.R, DIRLT.L, DIRDK.R, trf("hit.both")])'), JSON.stringify(['#ffc21f', '#b0188c', '#ffe38a', '#66084f', 'CREMA!']));
  // Wheels celebrate only the 50/100 combo milestones, for 1.2 s; other confetti requests stay silent.
  // Earlier clock tests rewind rAF time. Bring particle time forward before these isolated effect checks.
  run("G.state = 'play'; G.practice = null; G.collapseT = 0; animStage(0, 0, 1); dracFrame(Math.max(0, 1 - dracFx.state().t), 0); for (let i = 0; i < 400; i++) { animConfetti(0.05); dracFrame(0.05, 0); } var confBefore = conf.map(c => c.p.y).join();");
  for (const combo of [25, 50, 75, 100, 150]) {
    run(`G.combo = ${combo}; burst(0, 0, 'combo'); dracFrame(1 / 60, 0);`);
    assert.equal(run('dracFx.state().wheels > 0'), combo === 50 || combo === 100, `wheels at combo ${combo}`);
    run('for (let i = 0; i < 80; i++) dracFrame(1 / 60, 0);');
    assert.equal(run('dracFx.state().wheels'), 0, 'wheels stop after 1.2 s');
  }
  run('burst(0, 0); spawnConfetti(50, c => c.p.set(0, 5, 0)); animConfetti(0.01); dracFrame(1 / 60, 0);');
  assert(run('conf.map(c => c.p.y).join() === confBefore && dracFx.state().wheels === 0'), 'no confetti or continuous wheels from other effects');
  // picked on the selector it wanders and shows off from where it stood, burning now and then; a game puts it back on its spot
  run(`G.state = 'select'; REEL.on = false; /* no showreel here: the figure's own selector walk */ var selectorSounds = []; chip = { sfx: k => selectorSounds.push(k) }; var soloFar = 0, soloCrema = false; for (let i = 0; i < 60 * 40; i++) { clock += 1 / 60; animStage(1 / 60, clock / BEAT);
    soloFar = Math.max(soloFar, M.pos.length()); if (SHOWCASE.crema) soloCrema = true; dracFrame(1 / 60, 0); }`);
  assert(run('drac.root.visible && soloFar > 1 && soloFar < 4 && soloCrema && Math.abs(drac.root.parent.position.x - M.pos.x) < 1e-9'), `the selector's Drac walks about (up to ${run('soloFar.toFixed(1)')} m) and burns`);
  assert.equal(run('selectorSounds.length'), 0, 'selector demo keeps its flames visual without requesting figure SFX');
  run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, t0: null, buf: {},
    start: () => Promise.resolve(false) }; startGame(1); frames(1);`);
  // in the game it dances in its dance frame (drac-layout.js placeDance): the helpers' centre on the plaça's, turned to DRAC_YAW
  assert(run('drac.root.parent.position.distanceTo(placeDance(new THREE.Object3D(), DRAC_YAW).position) < 1e-9 && drac.root.parent.rotation.y === DRAC_YAW'), 'in the game it dances on its own spot');
  // the colla claps with it, and freezes with it: a pause and its resume count-in keep the helpers' arms where they were
  // (the count-in's beat runs on the restarted clock while the Drac waits on its frozen beat)
  run(`var armPose = () => JSON.stringify(colla.crew.map(c => c.bones.map(b => b.rotation.toArray().slice(0, 3).map(v => +v.toFixed(6)))));
    G.paused = false; G.collapseT = 0; for (let i = 0; i < 240; i++) animStage(1 / 60, 20.3, 1); /* its eased energy at full */ var armsAt = armPose(); G.paused = true; G.resuming = 1e9;
    for (let i = 0; i < 30; i++) animStage(1 / 60, 20.3 + i * 0.1, 1); var armsPaused = armPose(); G.paused = false; G.resuming = null;`);
  assert(run('colla.helpers.visible && armsPaused === armsAt'), 'the helpers freeze with the Drac through a pause and its resume count-in');
  // A real chart window closes through advance(), never from a target reached by pumping.
  run(`var tracaSounds = []; chip.sfx = k => tracaSounds.push(k); var originalTracas = G.balloons.slice();`);
  for (const ix of [0, 1]) {
    run(`var rollTest = { ...originalTracas[${ix}], hit: null, count: 0 }; G.chart = [rollTest]; G.balloons = [rollTest]; G.next = 0;
      G.hold = null; setBigPending(null); dracFrame(1 / 60, rollTest.t);
      for (let i = 0; i < rollTest.need * 2; i++) { rollTest.count++; dracPump(rollTest); }
      var troBefore = tracaSounds.filter(k => k === 'tro').length; advance(rollTest.end - 0.001);`);
    assert.equal(run("tracaSounds.filter(k => k === 'tro').length"), ix, 'targets reached before the end only crack');
    run('advance(rollTest.end); advance(rollTest.end + 0.01);');
    assert.equal(run("tracaSounds.filter(k => k === 'tro').length"), ix + 1, 'exactly one TRO on the closing beat');
  }
  run('toTitle(); dracFrame(1 / 60, 0);');
  // the last pass's red mist: the plaça's fog thickens and reddens while the dance is on, a menu clears it at once
  run(`G.state = 'play'; G.practice = null; G.collapseT = 0; var fog0 = [scene.fog.near, scene.fog.far, scene.fog.color.getHexString()];
    for (let i = 0; i < 60 * 12; i++) dracFrame(1 / 60, 1e6); var fogIn = [scene.fog.near, scene.fog.far, scene.fog.color.r / Math.max(1e-6, scene.fog.color.b)];
    G.state = 'select'; dracFrame(1 / 60, 0); var fogOut = [scene.fog.near, scene.fog.far, scene.fog.color.getHexString(), scene.background.getHexString(), dracFx.flare];`);
  assert(run('fogIn[0] < 5 && fogIn[1] < 60 && fogIn[2] > 3'), `the dance's red mist closes in, red by day or dark red at night (${run('JSON.stringify(fogIn)')})`);
  assert(run('fogOut[0] === fog0[0] && fogOut[1] === fog0[1] && fogOut[2] === fog0[2] && fogOut[3] === fog0[2] && fogOut[4] === 0'), 'a menu clears it');
  // a pending figure on the selector hides both beasts, and the Drac's colla with them
  run(`G.state = 'select'; selectScreen.pending = true; frame(9e6); frame(9e6 + 17); var collaPending = colla.helpers.visible || colla.seated.visible; selectScreen.pending = false;`);
  assert(run('collaPending === false'), 'a pending figure hides the Drac\'s colla too');
  run('setFigureSong(MULASSA)');
  run('for (let i = 0; i < 400; i++) dracFrame(1 / 60, 0); burst(0, 0); animConfetti(0.01);');
  assert(run('confetti.visible && conf.some(c => c.p.y > 1) && dracFx.state().wheels === 0'), 'the Mulassa keeps her confetti');
  assert.deepEqual(run('JSON.stringify([DIRC.L, DIRC.R, DIRLT.L, DIRDK.R, C.gua, C.pa, trf("hit.both")])'), JSON.stringify(['#ff7a1a', '#14b8a6', '#ffb56b', '#0a6e63', '#ff7a1a', '#14b8a6', 'GUAPA!']));
  console.log('figure theme on the canvas ok');
}
