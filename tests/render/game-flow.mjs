// Menus, pause, loading, audio errors, balloons, GUAPA, headlines and every HUD screen: contracts on the shared running
// game (game-context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { verifyCarretillesCounter } from './carretilles-counter.mjs';
import { PROFILES } from '../../src/platform/render-quality.js';
import { dance, flushLoader, nodes, keyHandlers, windowHandlers, drawnText, document, context, hostSeed, run } from './game-context.mjs';
// During the song the plaça stands still and only answers the player's hits, gently (GROOVE): no pose or position
// ever jumps in one frame, however fast the hits come; with no hits, near-still; the finale is still a festa, and its
// arrival eases in. Section B (it used to clap and hop on every beat), 60 fps, the full crowd, seeded.
// Only the first ring (NEAR: the few nearest her that the camera sees, PROFILES near) answers more: a bigger bob and
// nod, arms coming up, more on a GUAPA and on a streak, and a light bounce on the beat while the streak holds; eased,
// with its own per-frame limits. Everyone else keeps the calm limits.
{
  const q0 = run('qualityLevel');
  hostSeed(11);
  const r = JSON.parse(run(`(() => {
    seedR = 11;
    qualityLevel = peopleLevel = 2; applyRenderQuality(); crowdNow = 20; startGame(1); G.state = 'play'; G.guapo = 90; // A1's last runs (N, S) into A2's circle: the ring's distance to her stays comparable across the windows (figures/mulassa/mula-figures.js; at 5 s the burst caught her running at the W-side ring); her runs out bring the crowd onto its feet (making way)
    mood.kick = mood.gr1 = mood.gr2 = mood.gr3 = mood.gr4 = 0; G.combo = 0;
    const who = () => activeCrowd.filter(p => p.g.scale.x);
    const pose = p => [p.g.position.x, p.g.position.y, p.g.position.z, p.torso.rotation.x, p.torso.rotation.z, ...p.arms.flatMap(a => [a.rotation.x, a.rotation.z])];
    let prev = null;
    const step = (dt, out) => {
      crowdNow += dt; clock += dt;
      const t = songTime(), beat = beatAt(t);
      G.sec = sectionAt(song, t); G.finale = t >= FINALE_T;
      animStage(dt, beat, 1); framePlayCamera(dt, M.pos.x, M.pos.y); animCrowd(dt, beat, t, 1);
      const ppl = who(), now = ppl.map(pose);
      if (prev && out) now.forEach((q, i) => {
        const o = prev[i], w = ppl[i].way > 0.001 || ppl[i].away || ppl[i].spd > 0.05 || ppl[i].vel.lengthSq() > 4e-4 ? out.way : ppl[i].nearK > 0.02 ? out.ring : out; // the first ring (even fading in or out) has its own limits; walking (making way, settling after it: the next test): their own bucket
        w.pos = Math.max(w.pos, Math.hypot(q[0] - o[0], q[2] - o[2])); w.y = Math.max(w.y, Math.abs(q[1] - o[1]));
        for (let k = 3; k < q.length; k++) w.rot = Math.max(w.rot, Math.abs(q[k] - o[k]));
        w.top = Math.max(w.top, q[1]); if (!ppl[i].fan) w.arm = Math.min(w.arm, q[5]); // arm 0 (ventalls: by the face)
      });
      if (out) { out.ringN = Math.max(out.ringN, ppl.filter(p => p.near).length); out.shove = Math.max(out.shove || 0, mood.shoveK); }
      prev = now;
    };
    const win = () => ({ pos: 0, y: 0, rot: 0, top: 0, arm: 0, ringN: 0, ring: { pos: 0, y: 0, rot: 0, top: 0, arm: 0 }, way: { pos: 0, y: 0, rot: 0, top: 0, arm: 0 } });
    for (let f = 0; f < 240; f++) step(1 / 60); // the first note is long gone: they settle where startGame put them
    const quiet = win(); for (let f = 0; f < 180; f++) step(1 / 60, quiet);
    const burst = win();
    for (let f = 0, k = 0; f < 240; f++) {
      if (f % 9 === 0) { k++; judge({ phrase: 0, input: k % 5 ? (k % 2 ? 'L' : 'R') : 'B', big: !(k % 5) }, k % 4 ? 'perfect' : 'good'); }
      if (f === 200) judge({ phrase: 0, input: 'L' }, 'miss');
      step(1 / 60, burst);
    }
    G.combo = 0; for (let f = 0; f < 120; f++) step(1 / 60); // settle again
    G.combo = 24; const groove = win(); for (let f = 0; f < 240; f++) step(1 / 60, groove); // a streak, no hit: the ring bounces on the beat
    const streak = win(); // a long streak and GUAPAs: the ring's liveliest
    for (let f = 0, k = 0; f < 240; f++) { if (f % 9 === 0) { k++; G.combo = 40; judge({ phrase: 0, input: k % 3 ? 'L' : 'B', big: !(k % 3) }, 'perfect'); } step(1 / 60, streak); }
    crowdNow = 60; prev = null; G.combo = 0; for (let f = 0; f < 240; f++) step(1 / 60); // section B: the plaça loosens up
    const party = win(); for (let f = 0; f < 240; f++) step(1 / 60, party);
    crowdNow = FINALE_T - 1; prev = null; step(1 / 60);
    const fin = win(); for (let f = 0; f < 240; f++) step(1 / 60, fin);
    return JSON.stringify({ quiet, burst, groove, streak, party, fin, calm: mood.calmK, fest: mood.festK });
  })()`));
  const { quiet, burst, groove, streak, party, fin } = r, mm = v => `${(v * 1000).toFixed(1)} mm`;
  // (rot: the crowd's random draws decide it: 0.001-0.009 across eight seeds)
  assert(quiet.pos < 2e-3 && quiet.y < 1e-3 && quiet.top < 5e-3 && quiet.rot < 0.01,
    `no hits: the plaça stands near-still (per frame ${mm(quiet.pos)} across, ${mm(quiet.y)} up, ${quiet.rot.toFixed(4)} rad; highest ${mm(quiet.top)})`);
  assert(burst.pos < 9e-3 && burst.y < 0.022 && burst.rot < 0.09, // (the ripple: a hit is seen hopping round the ring, still eased)
    `a burst of hits (GUAPA and a miss among them) never jolts anyone: per frame ${mm(burst.pos)} across, ${mm(burst.y)} up, ${burst.rot.toFixed(3)} rad`);
  assert(party.y > quiet.y * 3 && party.y < fin.y, `section B: the plaça hops on the beat (${mm(party.y)} up a frame), less than the finale's ${mm(fin.y)}`);
  assert((quiet.shove || 0) === 0 && burst.shove > 0.5 && burst.shove <= 1, `a GUAPA shoves the ring (up to ${(burst.shove || 0).toFixed(2)}), silence does not`);
  assert(burst.top > 0.03 && burst.top < 0.11 && burst.arm > -1.3, `hits answer with a visible bob (up to ${mm(burst.top)}), arms down (${burst.arm.toFixed(2)} rad)`);
  assert(quiet.ring.top < 5e-3 && quiet.ring.rot < 6e-3, `no hits, no streak: the first ring is as still as everyone (${mm(quiet.ring.top)})`);
  for (const [name, w] of [['a streak', groove], ['a streak of GUAPAs', streak]]) {
    assert(w.pos < 9e-3 && w.y < 0.022 && w.top < 0.13 && w.arm > -1.3 && w.rot < 0.09, `${name}: the rest of the plaça stays calm (per frame ${mm(w.pos)} across, ${mm(w.y)} up, ${w.rot.toFixed(3)} rad; up to ${mm(w.top)}, arms ${w.arm.toFixed(2)})`);
    assert(w.ringN >= 10 && w.ringN <= PROFILES[2].near, `${name}: a first ring of ${w.ringN} reacts`);
    assert(w.ring.pos < 9e-3 && w.ring.y < 0.03 && w.ring.rot < 0.12,
      `${name}: the first ring moves smoothly: per frame ${mm(w.ring.pos)} across, ${mm(w.ring.y)} up, ${w.ring.rot.toFixed(3)} rad`);
  }
  assert(groove.ring.top > 0.02, `a streak: the first ring bounces on the beat (up to ${mm(groove.ring.top)})`);
  assert(streak.ring.top > 0.06 && streak.ring.top < 0.25 && streak.ring.arm < -0.4 && streak.ring.arm > -2.1,
    `hits on a streak: the first ring answers noticeably (bob up to ${mm(streak.ring.top)}, arms up to ${streak.ring.arm.toFixed(2)} rad)`);
  assert(streak.ring.top > burst.ring.top && burst.ring.top > burst.top, 'the ring answers more than the plaça, and more on a streak');
  assert(r.fest > 0.9 && r.calm < 0.05 && Math.max(fin.top, fin.ring.top, fin.way.top) > 0.25 && Math.min(fin.arm, fin.ring.arm, fin.way.arm) < -2.5, `the finale is still a festa: hops up to ${Math.max(fin.top, fin.ring.top, fin.way.top).toFixed(2)} m, arms up`);
  for (const [name, w] of [['no hits', quiet], ['hits', burst], ['a streak', groove], ['a streak of GUAPAs', streak]])
    // (0.16: an arm slews at most 0.1 rad a frame, plus the stride's counter-swing; a GUAPA's shove makes more people make way.
    // The worst frame moves 0.13-0.155 with the seeded crowd, e.g. after the escut's boxes changed: a snap is far above, see the festa below)
    assert(w.way.pos < 0.024 && w.way.rot < 0.16, `${name}: whoever walks (making way, settling) walks smoothly (${mm(w.way.pos)}, ${w.way.rot.toFixed(3)} rad per frame)`);
  const finRot = Math.max(fin.rot, fin.ring.rot, fin.way.rot), finY = Math.max(fin.y, fin.ring.y, fin.way.y);
  assert(finRot < 0.25 && finY < 0.1, `the festa eases in, no snap (per frame ${finRot.toFixed(3)} rad, ${mm(finY)} up)`);
  console.log('the crowd stays calm during the song and answers hits gently ok');
  run(`qualityLevel = peopleLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); G.finale = false; mood.kick = mood.gr1 = mood.gr2 = mood.gr3 = mood.gr4 = 0; G.combo = 0;`);
}

// The plaça fills with how well it goes: with few hits right, some of the back rows aren't there (scale 0, eased);
// with many they all are; the front row and the menus always are.
{
  const q0 = run('qualityLevel');
  const r = JSON.parse(run(`(() => {
    qualityLevel = peopleLevel = 2; applyRenderQuality(); crowd.forEach(p => placeHome(p)); crowdNow = 0; startGame(1); G.state = 'play';
    const run = (guapo, frames) => { G.counts = { perfect: guapo, good: 0, miss: 100 - guapo }; G.guapo = guapo;
      for (let f = 0; f < frames; f++) { crowdNow += 1 / 60; clock += 1 / 60; const t = songTime(), b = beatAt(t); G.sec = sectionAt(song, t); animStage(1 / 60, b, 1); framePlayCamera(1 / 60, M.pos.x, M.pos.y); animCrowd(1 / 60, b, t, 1); } };
    const gone = () => activeCrowd.filter(p => !p.g.scale.x), front = () => activeCrowd.filter(p => p.row === 0 && !p.g.scale.x).length;
    run(100, 60); const full = gone().length;
    run(50, 60 * 12); const poor = gone().length, poorFront = front();
    run(100, 60 * 12); const back = gone().length;
    G.state = 'results'; run(50, 60 * 12); const menu = gone().length; G.state = 'play';
    return JSON.stringify({ full, poor, poorFront, back, menu, total: activeCrowd.length });
  })()`));
  assert(r.full === 0 && r.back === 0, 'with a good run everyone is there');
  assert(r.poor >= r.total * 0.1 && r.poor <= r.total * 0.5, `a poor run empties part of the back rows (${r.poor} of ${r.total})`);
  assert(r.poorFront === 0, 'the front row is always there');
  assert(r.menu === 0, 'the results screen has the whole plaça');
  console.log('the plaça fills with how well it goes ok');
  run(`qualityLevel = peopleLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); mood.presK = 1;`);
}

// Making way (RING): a clear ring of open floor round her all song; when her body or swinging rear comes at someone
// they step back, eased and capped (no jolts), hands up, then walk slowly back to their spot once she has gone.
// Her turns (50 s to the pause before the first reversal: figures/mulassa/mula-dance.js maps the reference's rear half turn, big
// tilts and full turn there), 60 fps, the full crowd, seeded.
{
  const q0 = run('qualityLevel');
  hostSeed(23);
  const r = JSON.parse(run(`(() => {
    seedR = 23;
    qualityLevel = peopleLevel = 2; applyRenderQuality(); crowdNow = 46; startGame(1); G.state = 'play'; G.guapo = 90; G.combo = 0;
    const stop = mulaDance.time.songAtRef(138.6); // she stands, between the full turn and the first reversal
    const ppl = [...activeCrowd], prev = new Map(), out = { minClear: 99, step: 0, dv: 0, rot: 0, made: new Set(), back: 0, frames: 0, calmStep: 0, armRate: 0 };
    const clearOf = p => { const dx = p.pos.x - M.pos.x, dz = p.pos.y - M.pos.y, c = Math.cos(M.yaw), s = Math.sin(M.yaw);
      return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - 0.75), Math.max(0, Math.abs(dx * s + dz * c) - 2.3)); };
    for (let f = 0; crowdNow < stop; f++) {
      const dt = 1 / 60; crowdNow += dt; clock += dt;
      const t = songTime(), beat = beatAt(t);
      G.sec = sectionAt(song, t); G.finale = t >= FINALE_T;
      animStage(dt, beat, 1); framePlayCamera(dt, M.pos.x, M.pos.y); animCrowd(dt, beat, t, 1);
      if (t < 50) continue;
      out.frames++;
      for (const p of ppl) {
        out.minClear = Math.min(out.minClear, clearOf(p));
        const o = prev.get(p), q = [p.g.position.x, p.g.position.z, o ? p.g.position.x - o[0] : NaN, o ? p.g.position.z - o[1] : NaN, p.torso.rotation.x, ...p.arms.flatMap(a => [a.rotation.x, a.rotation.z])];
        prev.set(p, q);
        if (p.way > 0.5) out.made.add(p);
        if (!o) continue;
        for (let k = 5; k < q.length; k++) out.armRate = Math.max(out.armRate, Math.abs(q[k] - o[k]) / dt);
        const step = Math.hypot(q[0] - o[0], q[1] - o[1]);
        if (p.way > 0.001 || p.away) {
          out.step = Math.max(out.step, step); if (o[2] === o[2]) out.dv = Math.max(out.dv, Math.hypot(q[2] - o[2], q[3] - o[3])); // (NaN: no step before)
          for (let k = 4; k < q.length; k++) out.rot = Math.max(out.rot, Math.abs(q[k] - o[k]));
        } else out.calmStep = Math.max(out.calmStep, step);
      }
    }
    for (let f = 0; f < 600; f++) { const dt = 1 / 60; clock += dt; animCrowd(dt, 0, 0, 1); } // she stands still (no song time): they come back
    const free = [...out.made].filter(p => clearOf({ pos: p.spot }) > p.comfort + RING.back + 0.2); // their spot is clear of her again
    out.back = free.filter(p => p.pos.distanceTo(p.spot) < 0.35).length;
    out.away = free.filter(p => p.away).length; out.free = free.length;
    out.made = out.made.size;
    return JSON.stringify(out);
  })()`));
  assert(r.frames > 1000, 'the whole stretch was sampled');
  assert(r.minClear > 1.2, `open floor round her all along (closest ${r.minClear.toFixed(2)} m from her body)`);
  assert(r.made >= 3, `people make way as she turns (${r.made})`);
  assert(r.step < 0.024 && r.dv < 0.008 && r.rot < 0.15, // (dv: the step's change from one frame to the next)
    `making way is smooth: per frame ${(r.step * 1000).toFixed(1)} mm, its change ${(r.dv * 1000).toFixed(2)} mm, ${r.rot.toFixed(3)} rad`);
  assert(r.calmStep < 0.024, `everyone else at most jostled aside (the no-overlap limit), never faster than making way (${(r.calmStep * 1000).toFixed(1)} mm)`);
  assert(r.free >= 1 && r.back >= r.free / 2 && r.away <= r.free / 4, `once she has gone they walk back to their spots (${r.back} of ${r.free} free to, ${r.away} still away)`);
  assert(r.armRate <= 6 + 1e-9, `drawn arms keep the 6 rad/s limit (${r.armRate})`);
  console.log('the crowd makes way for her, smoothly, and comes back ok', { step: r.step, delta: r.dv, rotation: r.rot, armRate: r.armRate });
  run(`qualityLevel = peopleLevel = ${q0}; applyRenderQuality(); crowd.forEach(p => placeHome(p)); G.finale = false; G.combo = 0;`);
}

// Leaving a paused game must resume the menu and allow the next game to run.
run(`let resumes = 0;
  chip = { stop() {}, menu() {}, resume() { resumes++; }, ctx: {} };
  G.state = 'play'; G.paused = true;
  toTitle();`);
assert.equal(run('G.paused'), false, 'menu clears pause after Escape');
assert.equal(run('resumes'), 1, 'menu resumes suspended audio');

// Loading a recording may finish after the player has already left the game.
run(`let resolveStart, countIns = 0;
  chip = { resume() {}, stop() {}, menu() {}, sfx() {},
    start() { return new Promise(resolve => { resolveStart = resolve; }); },
    countIn() { countIns++; }, ctx: { resume() {} } };
  startGame(0); toTitle(); resolveStart(false);`);
await Promise.resolve();
assert.equal(run('countIns'), 0, 'cancelled starts cannot schedule a count-in');
console.log('menu pause and cancelled start contracts ok');

// A visible page may not own keyboard focus yet (Safari's address bar, another window).
// Boot still paints; normal gameplay remains suspended without focus.
{
  const focus = document.hasFocus;
  document.hasFocus = () => false;
  run("drawn = false; last = null; G.state = 'splash'; chip = null; window.__mulassaBooted = 'module'; frame(4000);");
  assert.equal(run('drawn'), true, 'visible startup paints even before the document gets focus');
  run('coverUp = false;');
  const before = run('clock');
  run('frame(4020)');
  assert(run('clock') > before, 'the visible entrance keeps animating after the cover lifts, even without keyboard focus');
  assert.equal(run('chip'), null, 'animating the entrance never unlocks audio before its tap');
  const entranceClock = run('clock');
  document.hidden = true;
  run('frame(12000)');
  assert.equal(run('clock'), entranceClock, 'the hidden entrance still suspends its animation');
  document.hidden = false;
  run('frame(12020); frame(12040)');
  assert(run('clock') > entranceClock && run('clock') - entranceClock < 0.05, 'returning visible resumes the entrance without a swipe or background catch-up');
  for (const state of ['select', 'play']) {
    run(`G.state = '${state}'; frame(12060);`);
    const inactiveClock = run('clock');
    run('frame(12080)');
    assert.equal(run('clock'), inactiveClock, `${state} retains its existing focus protection`);
  }
  run("G.state = 'splash';");
  document.hasFocus = focus;
  run('coverUp = true;');
  run("drawn = false; renderer.lost = true; window.__mulassaBooted = 'module'; frame(4040);");
  assert.equal(run('drawn'), false, 'a lost WebGL context cannot certify a first frame');
  run('renderer.lost = false; frame(4060);');
  assert.equal(run('drawn'), true, 'the first live frame after restoration completes startup');
  const liveClock = run('clock');
  run('renderer.lost = true; frame(4080);');
  assert(run('clock') > liveClock, 'after startup, context loss must not freeze the HUD and game clock');
  run('renderer.lost = false;');
  run("window.__mulassaBootFailure = { reason: 'deadline' }; drawn = false; frame(4080);");
  assert.equal(run('drawn'), false, 'a failed boot waits for retry instead of starting invisibly behind its error');
  run('delete window.__mulassaBootFailure;');
}

// Loading (src/ui/loader.js): the page cover lifts once the first frame is drawn; a game whose song is still
// downloading/decoding shows «Preparant la música…» (only after the delay), gone when the count-in can start.
{
  const card = nodes.get('loader'), line = nodes.get('loader-text');
  run('loader.ready()'); flushLoader();
  assert.equal(card.hidden, true, 'the cover goes after the first frame');
  run(`var resolveSong; chip = { resume() {}, stop() {}, menu() {}, sfx() {}, countIn() {}, ctx: { resume() {} },
    start() { return new Promise(resolve => { resolveSong = resolve; }); } };
    startGame(1);`);
  assert.equal(card.hidden, true, 'no spinner before the delay: short waits never flash one');
  flushLoader();
  assert(card.hidden === false && line.textContent === 'Preparant la música…', 'a slow song load says so');
  run('resolveSong(true)'); await Promise.resolve(); flushLoader();
  assert.equal(card.hidden, true, 'the card goes when the song starts');
  run('chip.buf = {}; startGame(1)'); flushLoader();
  assert.equal(card.hidden, true, 'a decoded song starts with no card');
  run('delete chip.buf; startGame(1); toTitle();'); flushLoader();
  assert.equal(card.hidden, true, 'leaving for the title drops the card');
  // The first drawn frame lifts the cover on every input path (touch too), once; waits on the splash's tap don't matter.
  run(`var readies = 0; { const r = loader.ready; loader.ready = () => { readies++; r(); }; }
    drawn = false; coverUp = true; fontsIn = false; coverAt = null; COARSE.matches = true; G.state = 'splash'; chip = null; warmStart(); frame(5000);`);
  await Promise.resolve(); await Promise.resolve(); // it waits for the web fonts (resolved at once here)
  // and for the queued words (the count-in's big outlined ones, the title's): painted under the cover, one a frame,
  // not on the splash where the first tap lands
  const queued = run('warmups.length');
  assert(queued >= 8, `the splash queues the title's words and the count-in's (${queued})`);
  run(`Object.defineProperty(loader, 'covering', { get: () => coverUp, configurable: true })`); // (this harness lifted its cover long ago)
  run('frame(5020)');
  assert.equal(run('readies'), 0, 'the cover stays while words are still queued');
  assert.equal(run('warmups.length'), queued - 1, 'under the cover: one a frame, not one per 0.25 s');
  for (let f = 2; run('readies') === 0 && f < 60; f++) run(`frame(${5000 + f * 20})`);
  assert.equal(run('readies'), 1, 'touch: then the cover lifts, once');
  assert.equal(run('warmups.length'), 0, 'every queued word painted before it did');
  run(`warmStart(); warmups.push(...Array(200).fill(() => {})); coverUp = true; coverAt = null;`); // a device too slow to finish them
  for (let f = 0; run('coverUp') && f < 100; f++) run(`frame(${8000 + f * 40})`);
  assert(!run('coverUp') && run('warmups.length') > 0, 'the cover never waits more than COVER_WARM for them');
  run(`warmups.length = 0; COARSE.matches = false; Object.defineProperty(loader, 'covering', { get: () => false, configurable: true });`);
}
console.log('loading indicator contracts ok');

const rejectedLoads = [];
const onUnhandled = error => rejectedLoads.push(error);
process.on('unhandledRejection', onUnhandled);
run(`chip = { resume() {}, stop() {}, menu() {}, sfx() {}, ctx: { resume() {} },
  start() { return Promise.reject(new Error('recording unavailable')); } };
  startGame(0);`);
await new Promise(resolve => setImmediate(resolve));
process.removeListener('unhandledRejection', onUnhandled);
assert.equal(run('G.state'), 'select', 'failed recording returns to the menu');
assert(run('Boolean(G.audioError)'), 'failed recording explains how to retry');
assert.equal(rejectedLoads.length, 0, 'failed loading is handled');
console.log('audio error recovery contract ok');

run(`chip = { suspend() { this.ctx.suspend(); }, resume() {}, wake() {}, ctx: { suspend() {}, resume() {} }, stop() {}, menu() {} };
  G.state = 'play'; G.paused = false; G.collapseT = 0;`);
for (const handler of keyHandlers) handler({ code: 'Escape', target: { tagName: 'BODY' }, preventDefault() {} });
assert.equal(run('G.state'), 'play', 'Escape keeps the game');
assert.equal(run('G.paused'), true, 'Escape pauses the game');
assert(nodes.get('pause-menu').open, 'pause opens a modal menu');
run('requestPauseAction("exit");');
assert.equal(run('G.state'), 'play', 'menu requires confirmation');
assert.equal(run('G.paused'), true);
nodes.get('pause-menu').listeners.cancel({ preventDefault() {} });
assert.equal(run('G.pendingAction'), null, 'Escape dismisses confirmation first');
assert.equal(run('G.paused'), true, 'dismissing confirmation retains pause');
run('requestPauseAction("exit");');
nodes.get('confirm-action').listeners.click();
assert.equal(run('G.state'), 'select', 'confirmed menu exits');
assert.equal(nodes.get('pause-menu').open, false);
run(`chip = { suspend() { this.ctx.suspend(); }, resume() {}, ctx: { suspend() {}, resume() {} }, stop() {}, menu() {}, sfx() {},
  start() { return Promise.resolve(false); } };
  startGame(0); togglePause(); requestPauseAction('restart');`);
const chartBeforeRestart = run('G.chart');
assert.equal(run('G.chart'), chartBeforeRestart, 'restart waits for confirmation');
nodes.get('cancel-action').listeners.click();
assert.equal(run('G.chart'), chartBeforeRestart, 'cancel preserves the game');
run('requestPauseAction("restart");');
nodes.get('confirm-action').listeners.click();
assert.notEqual(run('G.chart'), chartBeforeRestart, 'confirmed restart creates a new game');
assert.equal(run('G.paused'), false);
console.log('Escape, pause menu and confirmation contracts ok');

run(`let suspends = 0, wakes = 0;
  chip = { suspend() { this.ctx.suspend(); }, resume() {}, wake() { wakes++; }, t0: 0, now: () => 5, start() { return Promise.resolve(true); }, countIn() {}, ctx: { suspend() { suspends++; }, resume() {} } };
  G.state = 'play'; G.paused = false; G.collapseT = 0;`);
document.hidden = true;
document.listeners.visibilitychange?.();
assert.equal(run('G.paused'), true, 'hiding the tab pauses gameplay');
assert(run('suspends > 0'), 'background audio is suspended');
document.listeners.visibilitychange();
assert.equal(run('G.paused'), true, 'repeated background events retain pause');
document.hidden = false;
document.listeners.visibilitychange();
assert.equal(run('G.paused'), true, 'returning to the tab requires explicit resume');
assert.equal(run('wakes'), 0, 'returning does not restart paused audio');
run('togglePause();');
assert.notEqual(run('G.resuming'), null, 'explicit resume starts a 3, 2, 1');
assert.equal(run('G.paused'), true, 'the run stays frozen during the count-in');
run('G.resuming = null; G.paused = false;'); // the count-in ends (frame() does this once the song clock reaches the pause point)
document.focused = false;
windowHandlers.blur.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'an unfocused visible window also pauses');
run('togglePause();');
assert.equal(run('G.paused'), true, 'inactive windows cannot resume');
run("G.state = 'select'; G.paused = false; suspends = 0;");
windowHandlers.blur.forEach(handler => handler());
assert.equal(run('suspends'), 1, 'menu audio is suspended without focus');
document.focused = true;
windowHandlers.focus.forEach(handler => handler());
assert.equal(run('wakes'), 1, 'menu audio wakes when focus returns');
run("G.state = 'play'; G.paused = false; G.collapseT = 1;");
windowHandlers.pagehide.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'page exit also pauses the collapse animation');
windowHandlers.pageshow.forEach(handler => handler());
assert.equal(run('G.paused'), true, 'restoring a page retains the paused game');
console.log('background audio and gameplay pause contracts ok');

run(`G.reason = 'fail'; G.stars = 0; G.resT = clock;
  G.errors = { early: 0, late: 0, move: 5, silent: 0 };
  drawResults();`);
assert(drawnText.includes('Segueix la fletxa: esquerra o dreta'), 'movement advice explains the available controls');
console.log('results advice matches two-sided control ok');

// GLOBUS: every tap in its window counts (never a wrong move); pops repeat every `need` taps; judged once at the end.
run(`let songNow = 0, bonks = 0;
  chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, blip() {}, noiseHit() {},
    sfx(k) { if (k === 'bonk') bonks++; }, now: () => songNow, start: () => Promise.resolve(false) };
  startGame(1); G.state = 'play'; offsetMs = 0;
  var [b1, b2] = G.balloons; G.next = G.chart.indexOf(b1);
  songNow = b1.t + 0.1; for (let i = 0; i < b1.need; i++) press(i % 2 ? 'R' : 'P');
  var afterPop = G.score; press('L'); var oneTap = G.score - afterPop;
  for (let i = 1; i < b1.need + 1; i++) press(i % 2 ? 'R' : 'L');`);
assert.equal(run('oneTap'), 50, 'taps after the first pop still score');
assert.equal(run('b1.hit'), null, 'a balloon is judged only when its window ends');
assert.equal(run('b1.count'), run('b1.need * 2 + 1'), 'counting goes on after a pop');
assert.equal(run('G.pop.word'), 'PAM! x2!', 'the second pop is announced');
assert.equal(run('bonks'), 0, 'balloon taps are never wrong moves');
run(`var perfects = G.counts.perfect; endBalloon(b1); var judged = G.counts.perfect - perfects;
  G.next = G.chart.indexOf(b2); songNow = b2.t + 0.1;
  for (let i = 0; i < Math.ceil(b2.need / 2); i++) press('L');
  songNow = b2.end - 0.05; press('R'); endBalloon(b2);`);
assert.equal(run('b1.hit'), 'perfect', 'a popped balloon is perfect');
assert.equal(run("judged"), 1, 'a balloon is judged once, however many pops');
assert.equal(run('b2.count'), run('Math.ceil(b2.need / 2)'), 'taps after the hand-off go to the next note');
assert.equal(run('b2.hit'), 'good', 'a half-inflated balloon is good');
assert.equal(run('G.praise'), null, 'balloon completion does not add a headline during the song');
console.log('balloon contracts ok');
verifyCarretillesCounter(run);

// GUAPA: from NORMAL, both buttons within 80 ms = hit x2 (judged on the first press); one button alone is an
// ERROR once the window closes (never a bonk); the partner press never eats the next note. FÀCIL takes either.
run(`startGame(2); G.state = 'play'; offsetMs = 0; bonks = 0; var misses = 0;
  const sfx0 = chip.sfx; chip.sfx = k => { if (k === 'miss') misses++; sfx0(k); }; chip.wake = () => {};
  var bigs = G.chart.filter(n => n.big), gi = G.chart.findIndex(n => n.big && G.chart[G.chart.indexOf(n) + 1].t - n.t < 0.5); // a note right after the GUAPA
  var g1 = G.chart[gi], after = G.chart[gi + 1];
  G.next = gi; songNow = g1.t + 0.06; var s0 = G.score; press('L'); var pending = g1.hit;
  songNow += 0.05; press('R'); var pair = G.score - s0, pairRing = G.ring;
  var g2 = bigs.find(n => n.t > g1.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(g2);
  songNow = g2.t; s0 = G.score; press('R'); var lonePending = g2.hit;
  songNow += 0.09; settleBig(songNow); var lone = G.score - s0;`);
assert.equal(run('pending'), null, 'one button on a GUAPA waits for the other');
assert.equal(run('g1.hit'), 'good', 'a GUAPA is judged on the first press');
assert.equal(run('pair'), run('g1.pts * 2'), 'both buttons together score double');
assert(run('g1.gran && pairRing.kind === "gran"'), 'the pair lights the GUAPA! effect');
assert.equal(run('after.hit'), null, 'the partner press does not eat the next note');
assert.equal(run('lonePending'), null);
assert(run('g2.hit === "miss" && g2.detail === "ELS DOS ALHORA!" && !g2.gran'), 'NORMAL+: one button alone is an error');
assert.equal(run('lone'), 0, 'one button alone scores nothing');
assert(run('misses > 0 && bonks === 0'), 'the lone press plays the miss sound, never the bonk');
run(`var g3 = bigs.find(n => n.t > g2.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(g3);
  songNow = g3.t; s0 = G.score; press('P'); var space = G.score - s0;`);
assert(run('g3.hit === "perfect" && g3.gran && space === g3.pts * 2'), 'Space is both buttons');
run(`startGame(0); G.state = 'play'; offsetMs = 0;
  var e1 = G.chart.find(n => n.big), e1n = G.chart[G.chart.indexOf(e1) + 1]; G.next = G.chart.indexOf(e1); songNow = e1.t;
  s0 = G.score; press('L'); songNow += 0.12; press('R'); var easyPts = G.score - s0;
  var e2 = G.chart.find(n => n.big && n.t > e1.t + 1 && n.t < song.end - 1); G.next = G.chart.indexOf(e2); songNow = e2.t;
  press('R'); songNow += 0.2; settleBig(songNow);`);
assert(run('e1.hit === "perfect" && e1.gran && easyPts === e1.pts * 2'), 'FÀCIL: both buttons too, with a wider window (0.12 s apart still pairs)');
assert(run('e2.hit === "miss" && e2.detail === "ELS DOS ALHORA!"'), 'FÀCIL: one button alone is an error as well');
assert.equal(run('e1n.hit'), null, 'FÀCIL: the partner press is swallowed too');
assert.equal(run('G.chart.some(n => n.end && !n.balloon)'), false, 'FÀCIL plays holds as taps');
console.log('GUAPA contracts ok');

// Headline slot: one word at a time; a higher (or equal) priority replaces, a lower one is dropped, not queued.
run(`G.praise = null; clock = 100;
  headline('FINAL ESBOJARRAT!', 'rainbow', 4, 2.2); var praiseTaken = headline('QUIN ESTIL!', 0, 2), pamTaken = headline('PAM!', 3, 3, 0.9);
  var duringFinale = G.praise.word;
  clock += 2.3; var afterFinale = headline('QUIN ESTIL!', 0, 2); var venenuTaken = headline('VENENU!', 'bad', 1);
  var patapam = headline('PATAPAM!', 'bonk', 2, 1);`);
assert(run('!praiseTaken && !pamTaken && duringFinale === "FINAL ESBOJARRAT!"'), 'the finale intro outranks everything while it shows');
assert(run('afterFinale && !venenuTaken && patapam && G.praise.word === "PATAPAM!"'), 'expired words free the slot; lower ranks are dropped; equal ranks replace');
// A wrong move still stumbles and scores an error, without an extra headline.
run(`startGame(1); G.state = 'play'; offsetMs = 0; bonks = 0; G.praise = null; clock += 5;
  var wrong = G.chart.find(n => !n.big && !n.balloon && !n.end && n.input === 'L'); G.next = G.chart.indexOf(wrong);
  songNow = wrong.t; var pitchV = S.pitch.v; press('R');`);
assert(run('bonks === 1 && wrong.hit === "miss" && wrong.detail === "MOVIMENT"'), 'a wrong move is a bonk and an error');
assert(run('G.praise === null && M.missT === clock && S.pitch.v > pitchV'), 'a wrong move trips the mulassa up without a headline');
assert.equal(run('typeof guia'), 'undefined', 'there is no guide beside the mulassa');
console.log('headline slot and wrong-move contracts ok');

// Every HUD screen draws without throwing (an exception mid-frame would leave the canvas transformed/clipped):
// each headline tier, a wrong move, the finale, a globus, a hold, the collapse and every results card.
run(`var hudT = G.chart[G.next].t;
  for (const [w, tier] of [['A', 0], ['B', 1], ['C', 2], ['D', 3], ['VENENU!', 'bad'], ['PATAPAM!', 'bonk'], ['EEEEEEH!!', 'rainbow']]) { G.praise = null; headline(w, tier, 2); drawHud(hudT); }
  G.finale = true; G.finaleT = clock; headline('FINAL ESBOJARRAT!', 'rainbow', 4, 2.2); drawHud(hudT);
  bubbles.length = 0; drawHud(hudT);
  var hb2 = G.chart.find(n => n.end && !n.balloon); G.hold = { n: hb2, got: hb2.t, pts: 0, auto: true }; G.holdDone = { t0: clock, dir: 'L' }; drawHud(hb2.t + 0.2); G.hold = null;
  var bb = G.balloons[0]; bb.count = 3; G.pop = { t0: clock, word: 'PAM!' }; G.pumpT = clock; drawHud(bb.t + 0.2);
  G.collapseT = clock; drawHud(hudT); G.collapseT = 0; G.finale = false;
  G.errors = { early: 1, late: 2, move: 3, silent: 0, both: 0, hold: 0 }; G.resT = clock - 2;
  for (const [reason, rec, prev] of [['clear', true, null], ['fail', false, { quality: 80, score: 182972 }], ['collapse', false, null]]) {
    G.state = 'results'; G.reason = reason; G.stars = 2; G.newRecord = rec; G.previous = prev; drawHud(0);
  }
  for (const st of ['splash', 'select']) { G.state = st; drawHud(0); }`);
assert(drawnText.includes('NOU RÈCORD DE PUNTS!') && drawnText.includes('MILLOR') && drawnText.includes('182.972 PUNTS'), 'the record is told in points, like the board');
console.log('HUD screens draw without exceptions ok');
