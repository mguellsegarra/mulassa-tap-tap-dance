// The scoring the ceiling model assumes (tools/data/score-ceiling.mjs SCORING) against the real judge. A failure here means
// scoring changed: update SCORING, the ceilings and LEADERBOARD_VERSION. The finale's 70% threshold is in hud-play.mjs.
import assert from 'node:assert/strict';
import { SCORING } from '../../tools/data/score-ceiling.mjs';
import { run } from './game-context.mjs';

run(`chip = { suspend() {}, resume() {}, t0: 0, ctx: { currentTime: 0, suspend() {}, resume() {} }, stop() {}, menu() {}, blip() {}, noiseHit() {}, sfx() {}, now: () => 0, start: () => Promise.resolve(false) };
  startGame(1); G.state = 'play';
  var gained = (combo, double, act) => { G.combo = combo; G.doublePoints = double; const s = G.score; act(); return G.score - s; };
  var scoredNote = () => ({ phrase: 0, input: 'L' });`);
const hit = (kind, combo, double = false) => run(`gained(${combo}, ${double}, () => judge(scoredNote(), '${kind}'))`);
const { perfect, comboStep, comboCap, pump, pop, hold } = SCORING;
assert.equal(hit('perfect', 0), perfect + comboStep, 'a perfect hit counts itself in the combo');
assert.equal(hit('good', 0), 100 + comboStep, 'a good hit');
assert.equal(hit('perfect', comboCap * 5), perfect + comboCap * comboStep, 'the combo bonus is capped');
assert.equal(hit('perfect', 0, true), 2 * (perfect + comboStep), 'the finale doubles a hit');
assert.equal(run(`var pair = { ...scoredNote(), pts: 123 }; gained(0, false, () => guapaHit(pair))`), 123, "a GUAPA pair adds the note's points again");

run(`var roll = () => ({ ...G.balloons[0], count: 0, need: 3 });
  var pumps = (double, n = 1) => { const b = roll(); return gained(0, double, () => { for (let i = 0; i < n; i++) pump(b); }); };`);
assert.equal(run('pumps(false)'), pump, 'a balloon tap');
assert.equal(run('pumps(true)'), 2 * pump, 'the finale doubles a tap');
assert.equal(run('pumps(false, 3)'), 3 * pump + pop * 3, 'a pop pays for its size');
assert.equal(run('pumps(true, 3)'), 2 * (3 * pump + pop * 3), 'the finale doubles a pop');

const trickle = double => run(`gained(0, ${double}, () => {
  G.hold = { n: { t: 10, end: 12, input: 'L', phrase: 0 }, got: 10, pts: 0, auto: true }; settleHold(11); G.hold = null; })`);
assert.equal(trickle(false), hold / 2, "half a hold's trickle");
assert.equal(trickle(true), hold, 'the finale doubles the trickle');

run(`var savedBalloons = G.balloons; G.balloons = [{ t: 10, end: 12 }];
  var windowOpen = [10 - WIN.good + 1e-6, 12 - HANDOFF - 1e-6].every(balloonAt), windowClosed = [10 - WIN.good - 1e-6, 12 - HANDOFF + 1e-6].some(balloonAt);
  G.balloons = savedBalloons; G.doublePoints = false; G.combo = 0;`);
assert(run('windowOpen && !windowClosed'), 'the balloon window runs from a good press early to HANDOFF before its end');
console.log('scoring model ok');
