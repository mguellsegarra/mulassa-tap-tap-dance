// The judge's pure decisions (src/game/judge-core.js): window edges, ties, repeated presses, the GUAPA partner, holds, balloons, late taps.
import assert from 'node:assert/strict';
import { WINDOWS, eventAge } from '../../src/game/progress.js';
import { gradeOf, pressTarget, noteOnTime, pairWindow, isPartnerPress, pairClosed, HOLD_GRACE, holdVerdict, balloonVerdict, isOverdue } from '../../src/game/judge-core.js';

// The windows are data players feel: moving one is a deliberate act (change it here and in docs/agents/gameplay.md).
assert.deepEqual(WINDOWS, [{ perfect: 0.06, good: 0.14, miss: 0.18 }, { perfect: 0.045, good: 0.11, miss: 0.15 }, { perfect: 0.035, good: 0.09, miss: 0.125 }]);
const note = (t, extra) => ({ t, input: 'L', ...extra });
WINDOWS.forEach((w, lvl) => {
  const at = (t, chart = [note(0)]) => pressTarget(chart, 0, t, w, null);
  // edges (note at 0, so the press time is the error itself): ON the edge still counts, a hair beyond is the next grade
  assert.equal(at(w.perfect).kind, 'perfect', `level ${lvl}: perfect edge`);
  assert.equal(at(-w.perfect).kind, 'perfect');
  assert.equal(at(w.perfect + 1e-6).kind, 'good', `level ${lvl}: just outside perfect`);
  assert.equal(at(w.good).kind, 'good', `level ${lvl}: good edge`);
  assert.equal(at(-w.good - 1e-6).kind, 'miss', `level ${lvl}: just outside good is an ERROR press`);
  assert.equal(at(w.miss).kind, 'miss', `level ${lvl}: still that note's ERROR at the miss edge`);
  assert.equal(at(w.miss + 1e-6), null, `level ${lvl}: beyond it the press is free-style`);
  assert.equal(at(-w.miss - 1e-6), null);
  assert.equal(at(-w.perfect - 1e-6).early, true);
  assert.equal(at(w.perfect + 1e-6).early, false);
  // two notes equidistant from the press: the earlier one in the chart takes it, the second stays for the next press
  const pair = [note(0), note(0.2)];
  assert.equal(pressTarget(pair, 0, 0.1, w, null).n, pair[0], `level ${lvl}: a tie goes to the earlier note`);
  pair[0].hit = 'perfect';
  assert.equal(pressTarget(pair, 0, 0.1, w, null).n, pair[1], 'a resolved note is never judged twice');
  assert.equal(pressTarget(pair, 0, 0.1, w, pair[1]), null, 'the GUAPA waiting for its partner is skipped too');
  // a repeated press at the same instant (key auto-repeat that slipped through, a double tap) cannot hit one note twice
  const one = [note(0)];
  one[0].hit = pressTarget(one, 0, 0.01, w, null).kind;
  assert.equal(pressTarget(one, 0, 0.01, w, null), null);
  // balloons are not tapped through here (press() pumps them first), and a note past the window ends the scan
  assert.equal(pressTarget([note(0, { balloon: true })], 0, 0, w, null), null);
  assert.equal(pressTarget([note(1), note(0)], 0, 0, w, null), null, 'the scan stops at the first note beyond the window');
  // untouched past its window is a silent miss, on the edge it is not yet
  assert.equal(isOverdue(note(0), w.miss, w), false);
  assert.equal(isOverdue(note(0), w.miss + 1e-6, w), true);
  assert.equal(gradeOf(w.perfect, w), 'perfect');
  assert.equal(gradeOf(w.good + 1e-6, w), 'miss');
});

// GUAPA: the other side within the pairing window completes it; the same side, Space or an arrow-less key never does
const bp = { n: note(0, { big: true }), dir: 'L', t: 0 };
assert(isPartnerPress(bp, 'R') && !isPartnerPress(bp, 'L') && !isPartnerPress(bp, 'P') && !isPartnerPress(null, 'R'));
assert.equal(pairWindow(0), 0.15);
assert.equal(pairWindow(1), 0.08);
assert.equal(pairWindow(2), 0.08);
for (const diff of [0, 1, 2]) {
  assert.equal(pairClosed(bp, pairWindow(diff), diff), false, `diff ${diff}: open on the edge`);
  assert.equal(pairClosed(bp, pairWindow(diff) + 1e-6, diff), true);
}
assert.equal(pairClosed(null, 99, 1), false);

// MANTÉN: judged on how much of the tail was held; letting go within the grace of the end is holding to the end
const hold = note(10, { end: 12 });
assert.equal(holdVerdict(hold, 10, 12 - HOLD_GRACE).kind, 'perfect', 'let go exactly at the grace edge');
assert.equal(holdVerdict(hold, 10, 12 - HOLD_GRACE - 1e-6).kind, 'miss', 'a hair earlier is judged on what was held (nothing)');
assert.deepEqual([holdVerdict(hold, 11.8, 11.5), holdVerdict(hold, 11.79, 11.5), holdVerdict(hold, 11, 11.5), holdVerdict(hold, 10.99, 11.5)].map(v => v.kind), ['perfect', 'good', 'good', 'miss'], '90% and 50% of the tail');
assert.equal(holdVerdict(hold, 11, 11.5).more, 'holdMore');
assert.equal(holdVerdict(hold, 10.5, 11.5).more, 'hold');
assert.equal(holdVerdict(hold, 12, 12).more, '');

// GLOBUS at its end: the pop is perfect, half-inflated still good
assert.deepEqual([[8, 8], [9, 8], [4, 8], [3, 8], [0, 8], [1, 1], [1, 2], [0, 1]].map(([c, n]) => balloonVerdict(c, n)), ['perfect', 'perfect', 'good', 'miss', 'miss', 'perfect', 'good', 'miss']);
// a GUAPA on a drumroll's end (the Drac's last): a press on time for it is the note's, not a pump; a mash tap still too early,
// or the wrong button for a plain note, stays the balloon's
const roll = { t: 6, end: 10, balloon: true }, last = note(10, { big: true }), easy = WINDOWS[0];
assert.equal(noteOnTime([roll, last], 0, 10 - 0.1, easy, null, 'R'), true, '100 ms early, inside the old HANDOFF gap');
assert.equal(noteOnTime([roll, last], 0, 10 - easy.miss, easy, null, 'L'), false, 'only a miss away: keeps pumping');
assert.equal(noteOnTime([roll, note(10)], 0, 9.95, easy, null, 'R'), false, 'wrong button for a plain note');
assert.equal(noteOnTime([roll, last], 0, 9.95, easy, last, 'L'), false, 'its GUAPA already pending');

// pause and resume: the song clock holds while paused, so a note is not overdue the moment the game resumes; a tap that
// waited across the pause is rewound by at most 0.5 s, and a foreign or future stamp reads as "now"
assert.equal(isOverdue(note(30), 29.99, WINDOWS[2]), false);
assert.equal(eventAge(1000, 61000), 0.5, 'capped');
assert.equal(eventAge(60900, 61000), 0.1);
assert.equal(eventAge(0, 61000), 0, 'no stamp');
assert.equal(eventAge(62000, 61000), 0, 'future stamp');
assert.equal(eventAge(1.7e12, 61000), 0, 'epoch stamp (foreign clock)');
console.log('judge core ok');
