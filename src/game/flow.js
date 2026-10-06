// Game flow: back to the title, start a run, the practice, finish and the final.
import { clearLeaderboardResult, captureLeaderboardResult } from '../services/leaderboard-result.js';
import { makeDanceChart } from './chart.js';
import song from '../song.json';
import { store } from '../platform/storage.js';
import { errors } from '../services/errors.js';
import { WINDOWS, quality, starsFor } from './progress.js';
import { restTimeline } from './bubble-rules.js';
import { stepAt, buildStep, stepBeats, stepDone, stepPassed, STEPS } from './practice.js';
import { pick } from '../scene/models.js';
import { challengeResult } from '../services/share.js';
import { fabricateRun } from '../dev/final-test.js';
import { sheets } from '../ui/sheets.js';
import { chip, audioEngine, G, clock, CHALLENGE, setChip, setBigPending } from './state.js';
import { goFullscreen } from '../ui/fullscreen.js';
import { closePauseMenu } from '../ui/pause.js';
import { pageActive, playFrom, LEAD, BEATS, BEAT, CLICKS, AUTOPLAY, FROM, beatAt, Q, STARS, FINAL, FINALE_T, setWIN } from '../core/env.js';
import { standUp, M, S, PIVOT } from '../scene/mula-motion.js';
import { loader } from '../ui/handles.js';
import { sweepConfetti, burst } from '../scene/confetti.js';
import { warmStart } from '../hud/warm.js';
import { bubbles, setRests, setLastBubble, setShaken, setNextChatter } from '../hud/bubbles.js';
import { releaseAll } from './judge.js';
import { crowd, placeHome } from '../scene/crowd-build.js';
import { lane } from '../hud/layout.js';
import { W } from '../hud/canvas.js';
import { headline } from '../hud/praise.js';
import { debugAction } from '../dev/debug.js';

export function unlock() {
  setChip(audioEngine());
  chip.unlock();
  toTitle();
  goFullscreen();
}
export function toTitle() {
  clearLeaderboardResult();
  closePauseMenu();
  G.paused = false; G.resuming = null;
  G.practice = null;
  const fromGame = G.state === 'play' || G.state === 'results';
  G.state = 'title';
  chip.stop();
  chip.menu(true); // also silences whatever the run still had queued (the count-in) before the clock runs again
  if (pageActive()) chip.resume();
  standUp();
  loader.cancel(); songWait = null; // left a game still waiting for its music
  sweepConfetti();
  warmStart();
  if (fromGame && sheets.feedback.configured) sheets.nudge.arm(); // a run finished or left: the feedback bubble may say hello (src/ui/feedback-ui.js setupNudge)
}
// A game picked before its song has arrived (a slow line) waits, frozen at the count-in, and says so (after 300 ms),
// with the download's % while it lasts; frame() keeps the line current.
export let songWait = null;
export const musicLine = () => (chip?.loaded < 1 ? `Preparant la música… ${Math.floor(chip.loaded * 100)}%` : 'Preparant la música…');
export function startGame(diff) {
  G.practice = null;
  G.sel = diff;
  beginRun(diff, makeDanceChart(song, diff).filter(n => n.t >= playFrom));
  warmStart(); // already painted on the title unless the screen changed since (sprites are per size)
  G.recordKey = `record-v2-duet-${diff}`;
  try { G.previous = JSON.parse(store.get(G.recordKey)) || null; } catch { G.previous = null; }
  const chart = G.chart;
  const wait = songWait = chip.buf ? null : loader.wait(musicLine());
  const waited = () => { loader.done(wait); if (songWait === wait) songWait = null; };
  chip.start(LEAD, playFrom, song.tail).then(started => {
    waited();
    if (!started) return;
    const b0 = BEATS.find(b => b >= playFrom) ?? playFrom;
    chip.countIn([3, 2, 1].map(k => b0 - k * BEAT)); // 3, 2, 1 on the song's pulse; BALLA! lands on its first beat
    if (CLICKS) chart.forEach(n => chip.tick(n.t));
  }).catch(e => {
    waited();
    errors.report('audio-start-failed', { name: e?.name || 'Error' });
    if (G.state !== 'play' || G.chart !== chart) return;
    toTitle();
    G.audioError = 'No s’ha pogut carregar la música. Torna a provar-ho.';
  });
}
function beginRun(diff, chart) { // shared by the song and the practice: a clean plaça and score, `chart` on the lane
  clearLeaderboardResult();
  closePauseMenu();
  goFullscreen();
  loader.cancel(); songWait = null; // a restart drops the last run's wait (startGame makes its own)
  if (!chip) { setChip(audioEngine()); chip.unlock(); } // never start without an audio engine
  G.diff = diff;
  chip.stop();
  chip.menu(false);
  chip.sfx('start');
  setWIN(WINDOWS[diff]);
  G.paused = false; G.resuming = null;
  G.chart = chart.map(n => ({ ...n, hit: null, count: 0 }));
  G.balloons = G.chart.filter(n => n.balloon);
  setRests(restTimeline(G.chart));
  G.go = G.chart[0]?.t ?? playFrom; // everyone waits for the first note
  G.pop = null;
  bubbles.length = 0; setLastBubble(-9); setShaken(false); setNextChatter(0); // a clean plaça, nobody talking yet
  setBigPending(null);
  G.hold = null;
  releaseAll();
  Object.assign(G, { praise: null, ring: null, finale: false, doublePoints: false, eeeh: false, state: 'play', next: 0, score: 0, combo: 0, maxCombo: 0, streak: 0, guapo: 0, shown: 0, phraseCounts: { perfect: 0, good: 0, miss: 0 }, activePhrase: null, judge: null, chantT: -99, collapseT: 0, sec: null, flash: -9, energy: 1, shownE: 1, energyWarn: [true, true], energyT: -9, energyWarnT: -9 });
  G.counts = { perfect: 0, good: 0, miss: 0 };
  G.errors = { early: 0, late: 0, move: 0, silent: 0, both: 0, hold: 0 };
  G.hold = null;
  Object.assign(M, { yaw: 0, air: 0, airV: 0, missT: -9, vigor: 1 });
  for (const sp of Object.values(S)) Object.assign(sp, { x: 0, v: 0, t: 0 });
  M.pivot.set(0, PIVOT);
  crowd.forEach(p => placeHome(p));
  sweepConfetti();
  G.audioError = null;
}
// ------------------------------------------------------------------ practice (first game)
// Five short steps (practice.js) on the real lane with the real judge and FX, over a click track on the song's
// beat grid, scheduled on the audio clock. Pass a step (or try it three times) to move on; nothing is recorded.
const TUTORIAL = 'tutorial';
const tutorialDone = () => AUTOPLAY || FROM || store.get(TUTORIAL) === 'done';
export function choose(diff) { // a difficulty picked on the title: the very first time, the practice comes first
  if (tutorialDone()) startGame(diff); else startPractice(diff);
}
export function startPractice(then = null) { // then: the difficulty to start afterwards (null: back to the title)
  G.sel = then ?? G.sel;
  beginRun(1, []); // NORMAL rules (GUAPA wants both buttons, holds) ...
  setWIN(WINDOWS[0]); // ... with FÀCIL's forgiving timing
  document.activeElement?.blur();
  G.practice = { then, step: 0, tries: 0, clickK: 0, wait: null, doneT: null };
  chip.startClock(0.3, BEATS[0] - 0.3);
  practiceStep(4, BEATS[0] - 0.3); // four clicks to find the pulse
}
function practiceStep(k0, t) { // t: song time now; the step's first note starts beyond the lane's right edge and scrolls in whole, never pops in
  const P = G.practice, step = P && stepAt(P.step);
  if (!step) return P && practiceDone(P); // past the last step (skipped fast, bumped in debug): wrap up, never read past STEPS
  const build = () => (G.chart = buildStep(step, BEATS, k0, P.step).map(n => ({ ...n, hit: null, count: 0 })));
  build(); // lane() sizes the scroll speed from the chart, so the lead-in is measured on the new one
  const { hx, s, speed } = lane(), lead = ((W - hx) / s + 20) / speed;
  while (BEATS[k0] < t + lead) k0++;
  if (k0 + stepBeats(step) + 4 >= BEATS.length) { // off the end of the beat grid (lots of retries): start it over
    chip.startClock(0.3, BEATS[0] - 0.3);
    P.clickK = 0; k0 = 4; t = BEATS[0] - 0.3;
    while (BEATS[k0] < t + lead) k0++;
  }
  build();
  G.balloons = G.chart.filter(n => n.balloon);
  setRests(restTimeline(G.chart));
  G.next = 0;
  G.go = Math.min(G.go, G.chart[0].t);
  P.endT = Math.max(...G.chart.map(n => n.end || n.t)) + 0.35;
}
export function practiceTick(t) {
  const P = G.practice;
  if (!P) return; // ended (SALTA, restart, exit) earlier this frame
  const at = chip.ctx.currentTime - chip.t0;
  // The only audio in the practice: a click track on the same song clock and beat grid as the notes, 300 ms
  // ahead on the audio clock: a taiko hit exactly on each note (and a hold's end), a soft click on the other beats
  for (; P.clickK < BEATS.length && BEATS[P.clickK] < at + 0.3; P.clickK++) {
    const b = BEATS[P.clickK];
    if (b < at) continue;
    const when = chip.t0 + b, note = G.chart.some(n => Math.abs(n.t - b) < 1e-3 || (n.end && !n.balloon && Math.abs(n.end - b) < 1e-3));
    if (note) chip.timbal(when, 0.4); else chip.blip(when, 1320, 1320, 0.03, P.clickK % 4 ? 0.035 : 0.06);
  }
  if (P.doneT != null) { if (clock > P.doneT) endPractice(); return; }
  if (!stepAt(P.step)) return practiceDone(P);
  if (P.wait != null) {
    if (clock < P.wait) return;
    P.wait = null;
    return practiceStep(Math.ceil(beatAt(t)) + 3, t);
  }
  if (t < P.endT || G.hold || !stepDone(G.chart)) return;
  const ok = stepPassed(stepAt(P.step), G.chart);
  if (ok || ++P.tries >= 3) { P.step++; P.tries = 0; } // three tries and we move on anyway: nobody gets stuck
  if (!stepAt(P.step)) return practiceDone(P);
  P.wait = clock + 1.2;
  if (ok) { headline(pick(['MOLT BÉ!', 'AIXÍ!', 'GENIAL!']), 1, 3, 1.2); chip.sfx('fanfare1'); }
  else headline(P.tries ? 'TORNA-HI!' : 'SEGUIM!', P.tries ? 'bonk' : 0, 3, 1.2);
}
function practiceDone(P) { // past the last step, however it got there: A BALLAR! once, then endPractice after 2 s
  if (P.doneT != null) return;
  Object.assign(P, { step: STEPS.length, tries: 0, wait: null, doneT: clock + 2 });
  headline('A BALLAR!', 'rainbow', 4, 2, Math.random(), true); // the practice's celebration: big, like the song's
  chip.sfx('fanfare3');
  burst(M.pos.x, M.pos.y);
}
export function endPractice() { // finished or skipped (SALTA): either way it won't come back by itself
  if (!G.practice) return; // already ended (SALTA and the timer in the same frame, a second tap)
  const then = G.practice.then;
  store.set(TUTORIAL, 'done');
  G.practice = null;
  if (then != null) startGame(then); else toTitle();
}
export function previewResults(stars) { // ?stars=0-3: a fake run (never a record, never stored) to see the results card
  setTimeout(debugAction(() => {
    startGame(1);
    setTimeout(debugAction(() => { G.counts = [{ perfect: 10, good: 25, miss: 65 }, { perfect: 30, good: 35, miss: 35 }, { perfect: 50, good: 30, miss: 20 }, { perfect: 80, good: 15, miss: 5 }][stars]; G.score = 51200; G.maxCombo = 64; finish('end'); }), 500);
  }), 1200);
}
export function finish(reason) {
  captureLeaderboardResult(G, reason, Q); // a frozen run for optional publication; no network during play
  chip.stop();
  const value = quality(G.counts);
  G.stars = starsFor(value);
  G.reason = reason === 'collapse' ? 'collapse' : value >= 70 ? 'clear' : 'fail';
  G.newRecord = !AUTOPLAY && !FROM && STARS < 0 && reason !== 'collapse' && (!G.previous || value > G.previous.quality || (value === G.previous.quality && G.score > G.previous.score));
  if (G.newRecord && !FINAL) store.set(G.recordKey, JSON.stringify({ quality: value, score: G.score, combo: G.maxCombo }));
  G.state = 'results';
  G.resT = clock;
  const run = { pct: Math.round(value), diff: G.diff, reason: G.reason, stars: G.stars, newRecord: G.newRecord, maxCombo: G.maxCombo, t: G.resT, practice: false };
  G.challenge = challengeResult(CHALLENGE, run); // null unless it was the challenge's level
  G.shareRun = run; // what «Comparteix» shows (share-ui.js); the leaderboard's snapshot above is untouched
  if (G.reason === 'clear') { G.chantT = clock; burst(M.pos.x, M.pos.y); chip.sfx('ovation'); }
  else chip.sfx(G.diff === 2 ? 'laugh' : 'menu');
}
// ?final: the results screen of a consistent made-up run (src/dev/final-test.js) through the real finish(): the snapshot,
// the publish prompt, Comparteix, a friend's ?repte. 'record' has no earlier record to beat; 'clear' a better one;
// 'collapse' ends fallen. No record is saved. The audio engine waits, suspended, for the first tap.
export function startFinal() {
  setChip(audioEngine());
  const { diff, outcome } = FINAL;
  beginRun(diff, makeDanceChart(song, diff));
  const run = fabricateRun(G.chart, FINAL, FINALE_T);
  Object.assign(G, { counts: run.counts, errors: run.errors, score: run.score, combo: run.combo, maxCombo: run.maxCombo, energy: run.energy,
    shownE: run.energy, guapo: quality(run.counts), next: G.chart.length, recordKey: `record-v2-duet-${diff}` });
  G.previous = outcome === 'record' ? null : { quality: Math.min(100, quality(run.counts) + 3), score: run.score + 1000, combo: run.maxCombo };
  if (run.collapsed) G.collapseT = clock;
  finish(run.collapsed ? 'collapse' : 'end');
}
