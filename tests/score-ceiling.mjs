// The score ceiling per level (tools/score-ceiling.mjs): generated from the chart and the game's scoring, the same
// numbers in the client (MAX_SCORES) and on the server (202609280015_score_ceiling.sql), above any perfect run and above
// everything ?final makes up. If the chart or the scoring changes, this fails until the ceilings are regenerated (and a
// new migration carries them; a scoring change also needs a LEADERBOARD_VERSION bump).
import assert from 'node:assert/strict';
import { loadMainSource } from './load-main.mjs';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../src/game/chart.js';
import { MAX_SCORES, EXPECTED_JUDGMENTS, validResult, LEADERBOARD_VERSION, VERSION_RULES } from '../src/services/leaderboard-rules.js';
import { fabricateRun, judgments, walk, mockRows } from '../src/dev/final-test.js';
import { ceilings, perfectMax, ceilingOf, loadSong, SCORING, TAP_RATE, MARGIN } from '../tools/score-ceiling.mjs';
import { v1Song } from './v1-song.mjs';

const song = loadSong();
import { comparableScore, FULL_SCORE_ANCHORS, SHORT_SCORE_ANCHORS } from '../src/game/score-scale.js';
import { referenceScore } from '../tools/reference-score.mjs';
const charts = [0, 1, 2].map(d => makeDanceChart(song, d));
const want = ceilings(song);

// one set of numbers: generated = client = server
assert.deepEqual([...MAX_SCORES], want, `MAX_SCORES must be the generated ceilings ${want} (node tools/score-ceiling.mjs)`);
const sql = readFileSync(new URL('../supabase/migrations/202609280015_score_ceiling.sql', import.meta.url), 'utf8');
const values = sql.match(/from \(values ([^)]*\)(?:, \([^)]*\))*)\) as c\(difficulty, max_score\)/)?.[1];
assert(values, 'the migration sets versions.max_score from a values list');
assert.deepEqual([...values.matchAll(/\((\d), (\d+)\)/g)].map(m => [+m[1], +m[2]]), ceilings(v1Song).map((c, d) => [d, c]), 'the migration carries the same ceilings');
assert(/if p_score > v_max then[\s\S]*?'leaderboard_score_ceiling'/.test(sql), 'submit_result refuses a score over the ceiling with its own code');
assert(/^[\x00-\x7f]*$/.test(sql), 'ASCII only (SQL Editor)');

for (const d of [0, 1, 2]) {
  const r = perfectMax(song, d);
  assert.equal(r.judgments, EXPECTED_JUDGMENTS[d], `level ${d}: the model judges what the leaderboard counts`);
  assert(r.max <= MAX_SCORES[d] && MAX_SCORES[d] === ceilingOf(r.max), `level ${d}: the ceiling covers a perfect run (${r.max}) +${Math.round((MARGIN - 1) * 100)}%`);
  // the fabricator's perfect run (one pop per balloon) and a perfect run with the balloons mashed at the assumed rate
  const perfect = walk(judgments(charts[d]), judgments(charts[d]).map(() => 'perfect'), d, song.finale);
  assert(perfect.score <= r.max, `level ${d}: the model is above a perfect ?final run`);
  assert(perfectMax(song, d, { taps: charts[d].filter(n => n.balloon).map(n => n.need) }).max <= r.max, `level ${d}: more taps, more points`);
  // what ?final makes up stays publishable
  for (const pct of [100, 95, 70]) {
    const run = fabricateRun(charts[d], { pct, diff: d, outcome: 'clear' }, song.finale);
    assert(run.score <= MAX_SCORES[d], `?final=${pct}-${d}: under the ceiling`);
    assert(validResult({ version: LEADERBOARD_VERSION, difficulty: d, counts: run.counts, score: run.score, maxCombo: run.maxCombo }), `?final=${pct}-${d}: publishable`);
  }
  // the client refuses to send more than the ceiling
  const counts = { perfect: EXPECTED_JUDGMENTS[d], good: 0, miss: 0 }, res = s => ({ version: LEADERBOARD_VERSION, difficulty: d, counts, score: s, maxCombo: 10 });
  assert(validResult(res(MAX_SCORES[d])) && !validResult(res(MAX_SCORES[d] + 1)), `level ${d}: the client stops at the ceiling`);
}
assert(mockRows(charts, song.finale).every(r => r.score <= comparableScore(MAX_SCORES[r.difficulty], r.difficulty)), '?final mock board under the ceilings');
assert(MAX_SCORES[0] < MAX_SCORES[1] && MAX_SCORES[1] < MAX_SCORES[2], 'harder levels, higher ceilings');
// Preserve the original published contract independently of the active short chart.
assert.deepEqual(VERSION_RULES['mulassa-v1'].ceilings, ceilings(v1Song));
assert.deepEqual(VERSION_RULES['mulassa-v1'].judgments, [0, 1, 2].map(d => perfectMax(v1Song, d).judgments));
for (const d of [0, 1, 2]) {
  assert.equal(referenceScore(v1Song, d), FULL_SCORE_ANCHORS[d]);
  assert.equal(referenceScore(song, d), SHORT_SCORE_ANCHORS[d]);
  assert.equal(comparableScore(SHORT_SCORE_ANCHORS[d], d), FULL_SCORE_ANCHORS[d], 'equal reference performances earn equal displayed points');
  assert.equal(comparableScore(54321, d, 'mulassa-v1'), 54321, 'existing published points stay identical');
  assert(!validResult({ version: 'mulassa-v1', difficulty: d, counts: { perfect: EXPECTED_JUDGMENTS[d], good: 0, miss: 0 }, score: 1000, maxCombo: 1 }));
}

// the scoring the model assumes is still the game's (src/main.js judge / pump / settleHold / guapaHit, the x2 finale)
const main = loadMainSource();
for (const [what, re] of [
  ['a hit: 300/100 + 2 x combo up to 100, x2 in the finale', new RegExp(`\\(\\(kind === 'perfect' \\? ${SCORING.perfect} : 100\\) \\+ Math\\.min\\(G\\.combo, ${SCORING.comboCap}\\) \\* ${SCORING.comboStep}\\) \\* \\(G\\.doublePoints \\? 2 : 1\\)`)],
  ['a GUAPA pair adds the note\'s points again', /function guapaHit\(n\) \{[^}]*G\.score \+= n\.pts;/],
  ['a balloon tap', new RegExp(`G\\.score \\+= ${SCORING.pump} \\* \\(G\\.doublePoints \\? 2 : 1\\);`)],
  ['a balloon pop', new RegExp(`G\\.score \\+= ${SCORING.pop} \\* n\\.need \\* \\(G\\.doublePoints \\? 2 : 1\\);`)],
  ['a hold\'s trickle', new RegExp(`\\/ len \\* ${SCORING.hold} \\* \\(G\\.doublePoints \\? 2 : 1\\)`)],
  ['the finale doubles from song.finale at >= 70%', /const fin = t >= FINALE_T[^,]*, dbl = fin && G\.guapo >= 70;/],
  ['the balloon window', /const HANDOFF = 0\.06;[\s\S]*const balloonAt = t => G\.balloons\.find\(n => t >= n\.t - WIN\.good && t < n\.end - HANDOFF\);/],
]) assert(re.test(main), `main.js scoring changed (${what}): update tools/score-ceiling.mjs, the ceilings and LEADERBOARD_VERSION`);
console.log(`score ceilings ok: ${want.join(' / ')} (perfect run +${Math.round((MARGIN - 1) * 100)}%, balloons at ${TAP_RATE} taps/s)`);
