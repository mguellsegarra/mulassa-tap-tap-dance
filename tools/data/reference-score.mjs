// A calibration performance, not a security ceiling: chronological perfect judgments,
// full holds and the autoplay's 12 taps/s, at the actual finale (no slack or multiplier sorting).
import { makeDanceChart } from '../../src/game/chart.js';
import { judgments, walk } from '../../src/dev/final-test.js';

export function referenceScore(song, difficulty) {
  const chart = makeDanceChart(song, difficulty), events = judgments(chart);
  let score = walk(events, events.map(() => 'perfect'), difficulty, song.finale).score;
  for (const note of chart.filter(n => n.balloon)) {
    // Autoplay: count < (min(time, end - HANDOFF) - start) * 12.
    // Strictly before HANDOFF; no early taps and no frame-rate-dependent rounding.
    const taps = Math.ceil((note.end - 0.06 - note.t) * 12), multiplier = note.end >= song.finale ? 2 : 1;
    score += (50 * taps + 300 * note.need * Math.floor(taps / note.need) - 350 * note.need) * multiplier;
  }
  return score;
}
