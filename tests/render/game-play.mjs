// Holds, autoplay, the practice, the dance demo and the settings sheet: contracts on the shared running game (game-
// context.mjs; render-quality.mjs runs the files in order).
import assert from 'node:assert/strict';
import { v1Song } from '../game/v1-song.mjs';
import { referenceScore } from '../../tools/data/reference-score.mjs';
import { readPage } from '../ui/page.mjs';
import { chart, progress, practice, dance, errors, nodes, keyHandlers, windowHandlers, document, privacyTextStub, privacyFragmentStub, privacyBodyStub, context, run } from './game-context.mjs';
// MANTÉN: head judged like a tap; hold the key to the end (last 0.12 s free) for a PERFECTE tail, half for BÉ,
// less is an ERROR; the tail trickles points while held. Head miss loses the whole hold.
const key = (type, code) => windowHandlers[type].forEach(h => h({ code, target: { tagName: 'BODY' }, preventDefault() {} }));
context.key = key;
run(`startGame(1); G.state = 'play'; offsetMs = 0;
  var holds = G.chart.filter(n => n.end && !n.balloon), [h1, h2, h3, h4] = holds;
  function playHold(h, releaseAt, code = h.input === 'L' ? 'KeyD' : 'KeyK') {
    G.next = G.chart.indexOf(h); songNow = h.t; const c0 = { ...G.counts }, s0 = G.score;
    key('keydown', code);
    const holding = G.hold?.n === h;
    for (let x = h.t; x < releaseAt; x += 0.05) { songNow = x; settleHold(x); }
    songNow = releaseAt; key('keyup', code); settleHold(releaseAt);
    return { holding, tail: h.tail, judged: Object.values(G.counts).reduce((a, b) => a + b) - Object.values(c0).reduce((a, b) => a + b), pts: G.score - s0 };
  }
  var full = playHold(h1, h1.end - 0.05), part = playHold(h2, h2.t + (h2.end - h2.t) * 0.6), early = playHold(h3, h3.t + 0.1);`);
assert(run('full.holding && full.tail === "perfect" && full.judged === 2'), 'a hold is head + tail; letting go in the last 0.12 s is full');
assert(run('full.pts > 2 * (300 + 2)'), 'holding trickles points on top of the two judgements');
assert.equal(run('part.tail'), 'good', 'half a hold is BÉ');
assert(run('early.tail === "miss" && G.judge.detail === "HAS DEIXAT ANAR"'), 'letting go early is an error');
run(`G.next = G.chart.indexOf(h4); var c0 = G.counts.miss; advance(h4.t + WIN.miss + 0.01);`);
assert(run('h4.tail === "miss" && G.counts.miss - c0 === 2 && !G.hold'), 'a missed head loses the whole hold');
run(`startGame(1); G.state = 'play'; offsetMs = 0; var hb = G.chart.find(n => n.end && !n.balloon);
  G.next = G.chart.indexOf(hb); songNow = hb.t; key('keydown', hb.input === 'L' ? 'ArrowLeft' : 'ArrowRight');
  songNow = hb.t + 0.2; settleHold(songNow);`);
windowHandlers.blur.forEach(h => h());
assert(run('hb.tail === "miss" && !G.hold'), 'losing the window focus lets go');
{ // a pad that has the keyboard focus (Tab) must not swallow the game keys; other buttons still keep theirs
  const padBtn = { tagName: 'BUTTON', closest: s => (s === '#pad' ? {} : null) }, other = { tagName: 'BUTTON', closest: () => null };
  run(`startGame(1); G.state = 'play'; offsetMs = 0; var tn = G.chart.find(n => !n.end && !n.balloon && !n.pair); G.next = G.chart.indexOf(tn); songNow = tn.t; var j0 = Object.values(G.counts).reduce((a, b) => a + b);`);
  const code = run('tn.input') === 'L' ? 'KeyD' : 'KeyK';
  windowHandlers.keydown.forEach(h => h({ code, target: other, preventDefault() {} }));
  assert.equal(run('Object.values(G.counts).reduce((a, b) => a + b) - j0'), 0, 'a focused ordinary button keeps its keys');
  windowHandlers.keydown.forEach(h => h({ code, target: padBtn, preventDefault() {} }));
  assert.equal(run('Object.values(G.counts).reduce((a, b) => a + b) - j0'), 1, 'a focused pad still plays the note');
  key('keyup', code);
}
console.log('hold contracts ok');

// autoplay: both buttons on every GUAPA and every hold kept down to the end
for (const diff of [0, 1, 2]) {
  run(`startGame(${diff}); G.state = 'play'; offsetMs = 0;
    for (let x = G.chart[0].t - 0.5; x < song.end + 0.5; x += 1 / 30) { songNow = x; G.doublePoints = x >= FINALE_T && G.guapo >= 70; autoplay(x); advance(x); }`);
  // Each full hold may retain <1 uncredited fractional point after the final floor.
  const shortLoss = referenceScore(context.song, diff) - run('G.score');
  assert(shortLoss >= 0 && shortLoss <= run('G.chart.filter(n => n.end && !n.balloon).length'), `active reference vs real scoring ${diff}: ${shortLoss} points of hold rounding`);
  assert.equal(run('G.counts.miss'), 0, `autoplay ${diff}: no errors`);
  assert(run('G.chart.filter(n => n.big).every(n => n.hit === "perfect" && n.gran)'), `autoplay ${diff}: both buttons on every GUAPA`);
  assert(run('G.chart.filter(n => n.end && !n.balloon).every(n => n.tail === "perfect")'), `autoplay ${diff}: every hold kept to the end`);
  assert.equal(run('G.counts.perfect + G.counts.good'), run('G.chart.length + G.chart.filter(n => n.end && !n.balloon).length'), 'a hold counts head + tail');
}
// The old reference also runs through the actual judge/pump/hold code, preserving the old chart's finale.
for (const diff of [0, 1, 2]) {
  run(`beginRun(${diff}, makeDanceChart(${JSON.stringify(v1Song)}, ${diff})); G.state = 'play'; offsetMs = 0;
    for (let x = G.chart[0].t - 0.5; x < ${v1Song.end} + 0.5; x += 1 / 30) {
      songNow = x; G.doublePoints = x >= ${v1Song.finale} && G.guapo >= 70; autoplay(x); advance(x);
    }`);
  assert.equal(run('G.counts.miss'), 0);
  const oldLoss = referenceScore(v1Song, diff) - run('G.score');
  assert(oldLoss >= 0 && oldLoss <= run('G.chart.filter(n => n.end && !n.balloon).length'), `legacy reference vs real scoring ${diff}: ${oldLoss} points of hold rounding`);
}
console.log('autoplay GUAPA and hold contracts ok');

// Practice (first game): the real lane, judge and FX on five small charts over a click track. Picking a
// difficulty the first time runs it; autoplay passes every step first try; then that difficulty starts.
// Skipping every input still gets through (three tries per step), back to the title. Nothing is recorded.
run(`var stored = {}; localStorage.getItem = k => stored[k] ?? null; localStorage.setItem = (k, v) => { stored[k] = String(v); };
  var minEnergy = 1, clicks = 0, started = null, maxTries = 0, seen = new Set(), ticks = [], hits = [], noteTimes = [];
  var menuOn = true; chip = { suspend() { this.ctx.suspend(); }, resume() {}, t0: null, ctx: { currentTime: 50, suspend() {}, resume() {} }, stop() { this.t0 = null; }, menu(on) { menuOn = on; }, sfx() {}, noiseHit() {},
    blip(w, f) { clicks++; if (f === 1320) ticks.push(w - this.t0); }, timbal(w) { clicks++; hits.push(w - this.t0); }, startClock(d, from) { this.t0 = this.ctx.currentTime + d - from; },
    now() { return this.ctx.currentTime - this.t0; }, start() { started = G.diff; return Promise.resolve(false); } };
  function practise(auto, seconds) {
    for (let i = 0; i < seconds * 60 && G.practice; i++) {
      chip.ctx.currentTime += 1 / 60; clock += 1 / 60;
      const x = songTime();
      if (auto) autoplay(x);
      advance(x);
      if (!G.practice) break;
      G.chart.forEach(n => noteTimes.includes(n.t) || noteTimes.push(n.t));
      minEnergy = Math.min(minEnergy, G.energy);
      seen.add(G.practice.step); maxTries = Math.max(maxTries, G.practice.tries);
      practiceTick(x);
      if (i % 20 === 0 && G.state === 'play') drawHud(x);
    }
  }
  offsetMs = 0; G.state = 'select'; choose(2);
  var firstTime = G.state === 'play' && G.practice?.then === 2, practiceWin = WIN;
  practise(true, 60);`);
assert(run('firstTime'), 'the first game starts with the practice');
assert.equal(run('practiceWin'), progress.WINDOWS[0], 'practice timing is forgiving');
assert(run('[0, 1, 2, 3, 4].every(k => seen.has(k)) && maxTries === 0 && started === 2 && G.practice === null'), 'autoplay passes all five steps, then the chosen difficulty starts');
assert(run('clicks > 40'), 'a click track plays under the practice');
assert(run('noteTimes.length >= 14 && noteTimes.every(t => hits.some(h => Math.abs(h - t) < 1e-3))'), 'a taiko hit on the audio clock exactly on every practice note (< 1 ms)');
assert(run('[...ticks, ...hits].every(x => song.beats.some(b => Math.abs(b - x) < 1e-3))'), 'every click sits on the song beat grid the notes use');
assert(run('!menuOn'), 'the menu ambient is off during the practice');
assert.equal(run('stored.tutorial'), 'done');
assert(run("!Object.keys(stored).some(k => k.startsWith('record'))"), 'practice records nothing');
run(`started = null; G.state = 'select'; choose(1);`);
assert(run('started === 1 && !G.practice'), 'afterwards a difficulty starts the song straight away');
run(`seen.clear(); startPractice(null); practise(false, 150);`);
assert(run("[0, 1, 2, 3, 4].every(k => seen.has(k)) && G.state === 'select' && !G.practice"), 'nobody gets stuck: three tries per step, then from the Com es juga sheet back to the title');
assert(run('minEnergy === 1 && !G.collapseT'), 'the practice never drains the ànim, however many notes go by');
run(`startPractice(null); G.praise = null; for (const n of G.chart.slice(0, 3)) judge(n, "miss");`);
assert(run("!G.praise || !/VENENU/.test(G.praise.word)"), 'no shaming VENENU! while learning');
run('startPractice(1);');
nodes.get('skip').listeners.click();
assert(run('started === 1 && !G.practice'), 'SALTA skips straight to the song');
// Stepping is bounds-safe: steps skipped as fast as possible (every frame, in debug), bumped far past the last one,
// NaN, a pause and a restart mid-way: never a throw, and past the end it wraps up once (A BALLAR!) and leaves.
run(`var fanfares = 0; chip.sfx = k => { if (k === 'fanfare3') fanfares++; };
  started = null; startPractice(1);
  for (let i = 0; i < 12 && G.practice; i++) { G.practice.step++; G.practice.wait = clock; practise(false, 1 / 60); }`);
assert(run('fanfares === 1 && (G.practice === null || G.practice.doneT != null)'), 'skipping every step rapidly: one A BALLAR!');
run('practise(false, 3);');
assert(run('started === 1 && !G.practice && fanfares === 1'), 'then the song starts, once');
for (const bump of ['STEPS.length', 'STEPS.length + 7', 'NaN', '-3']) {
  run(`started = null; fanfares = 0; startPractice(2); practise(false, 0.5); G.practice.step = ${bump}; drawHud(songTime()); practiceStep(8); practise(false, 4);`);
  assert(run('started === 2 && !G.practice && fanfares === 1'), `step = ${bump}: ends cleanly into the song`);
}
run(`started = null; startPractice(null); practise(false, 0.5); G.practice.step = STEPS.length; practiceTick(songTime());`);
nodes.get('skip').listeners.click(); run('endPractice(); practiceTick(songTime());');
assert(run("started === null && G.state === 'select' && !G.practice"), 'SALTA during A BALLAR!, then a late tick and a second end: harmless');
run(`started = null; startPractice(1); practise(false, 0.5); G.practice.step = 99; pauseGame(); drawHud(songTime());`);
assert(run('G.paused && G.practice && G.practice.step === 99'), 'paused past the end: the HUD still draws');
run(`G.pendingAction = 'restart';`); nodes.get('confirm-action').listeners.click();
assert(run('!G.paused && G.practice && G.practice.step === 0 && G.practice.then === 1 && G.chart.length'), 'restart from the pause: the practice from step 0');
run('practise(true, 60);');
assert(run('started === 1 && !G.practice'), 'and it plays through to the song');
console.log('practice contracts ok');

// The dance demo (ui/watch-ui.js, flow.js startWatch): the whole song plays itself on NORMAL, even before the
// practice was ever done; GUA/PA do nothing, the ànim never drains, the player's tick is silent. Its end records,
// snapshots, prompts and shares nothing, and its own sheet leads back to the selector.
run(`var preWatch = { chip, stored }; stored = {}; songNow = 0; var watchSfx = [];
  chip = { suspend() { this.ctx.suspend(); }, resume() {}, wake() {}, t0: null, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, noiseHit() {}, blip() {}, countIn() {},
    sfx(k) { watchSfx.push(k); }, start() { this.t0 = 0; return Promise.resolve(true); }, now: () => songNow };
  offsetMs = 0; G.state = 'select'; G.paused = false;
  var toLevels = 0; Object.assign(sheets.select, { figure: selectedFigure, pending: false, toLevels() { toLevels++; } }); // (the selector is stubbed here)`);
nodes.get('select-watch').listeners.click();
assert(run("G.state === 'play' && G.watch && G.diff === 1 && !G.practice"), 'Com es juga starts the demo on NORMAL, never the practice');
assert.equal(nodes.get('watch-song').textContent, run('selectedFigure.song'), 'the label names the dance');
run(`var watchFirst = G.chart.find(n => !n.balloon && !n.big && !n.end); songNow = watchFirst.t; press('L', { timeStamp: 0 });`);
assert(run('!watchFirst.hit'), 'GUA/PA judge nothing during the demo');
run(`for (; songNow < song.tail + 0.5; songNow += 1 / 30) { clock += 1 / 30; autoplay(songNow); advance(songNow); }`);
assert(run("G.chart.every(n => n.hit === 'perfect') && G.energy === 1"), 'it plays every note itself and never touches the ànim');
assert(run("!watchSfx.includes('perfect') && watchSfx.includes('eh')"), 'no tick for a player who isn\'t tapping; the plaça still shouts on a GUAPA');
run(`finish('end'); updateControls();`);
assert(run("G.state === 'results' && G.watch && G.shareRun === null && getLeaderboardResult() === null"), 'its end is no result: nothing to publish or share');
assert(run("!Object.keys(stored).some(k => k.startsWith('record') || k === 'tutorial')"), 'no record, and the practice is still to come');
assert.equal(nodes.get('results-retry').hidden, true, 'no «Torna-ho a provar»');
assert.equal(nodes.get('watch-menu').open, false, 'the plaça cheers a moment first');
run('clock += 1.1; updateControls();');
assert.equal(nodes.get('watch-menu').open, true, 'then «Ara et toca a tu!»');
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BUTTON' }, preventDefault() {} }));
assert.equal(run('G.state'), 'results', 'Space acts on the sheet, not on the results behind it');
nodes.get('watch-play').listeners.click();
assert(run("G.state === 'select' && !G.watch && toLevels === 1 && sheets.select.shown") && !nodes.get('watch-menu').open, '«Juga-hi»: the selector, on its level step');
nodes.get('select-watch').listeners.click(); run('togglePause();');
assert(run('G.paused && G.watch') && nodes.get('pause-sync').hidden, 'its pause has no sync');
assert.equal(nodes.get('restart-label').textContent, 'Torna a començar');
const demoChart = run('G.chart');
nodes.get('restart').listeners.click();
assert(run('!G.paused && G.watch') && run('G.chart') !== demoChart, 'restart needs no confirmation: nothing to lose');
run('togglePause();'); nodes.get('exit').listeners.click();
assert(run("G.state === 'select' && !G.watch && !G.paused"), 'neither does leaving');
run('startGame(1); togglePause();');
assert(!nodes.get('pause-sync').hidden && nodes.get('restart-label').textContent === 'Reinicia', 'a real game\'s pause is unchanged');
run('toTitle(); chip = preWatch.chip; stored = preWatch.stored;');
console.log('dance demo contracts ok');

// ⚙ Configuració on the title: shows the current offset; the sync comes back to it when closed; the practice
// starts from it; title keys don't start a game behind it.
run(`G.state = 'select'; G.practice = null; offsetMs = 40; chip.wake = () => {};`);
nodes.get('settings').listeners.click();
const settingsSheet = nodes.get('settings-menu');
assert(settingsSheet.open, 'the gear opens Configuració');
assert.equal(nodes.get('settings-offset').textContent, 'Ara: +40 ms', 'it shows the current sync offset');
keyHandlers.forEach(h => h({ code: 'Space', target: { tagName: 'BODY' }, preventDefault() {} }));
assert.equal(run('G.state'), 'select', 'Space does not start a game behind the sheet');
document.listeners.click({ target: { closest: sel => (sel === '[data-privacy-open]' ? {} : null) } });
assert(nodes.get('privacy-menu').open && settingsSheet.open, 'Privadesa opens over Configuració, which stays behind it');
assert.deepEqual(privacyBodyStub.childNodes, [privacyTextStub], 'privacy text is attached while open');
assert.equal(privacyFragmentStub.childNodes.length, 0);
keyHandlers.forEach(h => h({ code: 'Enter', target: { tagName: 'DIALOG' }, preventDefault() {} }));
assert.equal(run('G.state'), 'select', 'keys on Privadesa do not start a game');
nodes.get('privacy-menu').close();
assert.equal(privacyBodyStub.childNodes.length, 0, 'closed privacy text is absent from the live DOM');
assert.deepEqual(privacyFragmentStub.childNodes, [privacyTextStub]);
run('openPrivacy(); openPrivacy();');
assert.deepEqual(privacyBodyStub.childNodes, [privacyTextStub], 'reopening preserves the text without duplicates');
nodes.get('privacy-menu').close();
nodes.get('settings-sync').listeners.click();
assert(!settingsSheet.open && context.syncSheet.open, 'Ajusta la sincronia opens the sync sheet');
context.syncSheet.open = false; run('offsetMs = -20;'); context.syncHooks.onClose();
assert(settingsSheet.open, 'closing the sync sheet returns to Configuració');
assert.equal(nodes.get('settings-offset').textContent, 'Ara: −20 ms', 'with the new offset');
settingsSheet.open = false;
context.syncHooks.onClose();
assert(!settingsSheet.open, 'the sync sheet opened from elsewhere does not reopen Configuració');
// menu placement: Configuració has both; Com es juga only the practice; the pause menu only the sync (mid-song)
const html = readPage();
const sheet = id => html.slice(html.indexOf(`<dialog id="${id}"`), html.indexOf('</dialog>', html.indexOf(`<dialog id="${id}"`)));
assert(/Ajusta la sincronia/.test(sheet('settings-menu')) && !/Fes la pràctica/.test(sheet('settings-menu')), 'Configuració: sync only (Com es juga has the practice)');
assert(/Fes la pràctica/.test(sheet('howto-menu')) && !/sincronia/.test(sheet('howto-menu')), 'Com es juga: only the practice');
assert(/Ajusta la sincronia/.test(sheet('pause-menu')) && !/pràctica/.test(sheet('pause-menu')), 'pause: only the sync');
run(`G.state = 'select'; G.practice = null;`);
nodes.get('howto-practice').listeners.click();
assert(run("G.state === 'play' && G.practice"), 'Com es juga → Fes la pràctica starts the practice');
run('endPractice();');
console.log('settings sheet contracts ok');
