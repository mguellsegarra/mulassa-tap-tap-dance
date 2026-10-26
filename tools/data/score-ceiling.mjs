// The highest score a human can reach on each level, from the chart and the game's scoring (src/main.js judge,
// guapaHit, pump, settleHold, advance), plus a safety margin: the server's ceiling (versions.max_score,
// supabase/migrations/202609280015_score_ceiling.sql) and the client's MAX_SCORES (src/services/leaderboard-rules.js).
// tests/game/score-ceiling.mjs fails if the chart or scoring moves and these numbers no longer match.
// Run `node tools/data/score-ceiling.mjs` to print them.
//
// A perfect run, every bonus at its most generous:
//   * every judgment (notes, hold heads and tails, balloons) is PERFECTE: 300 + 2 x min(combo, 100); the combo values
//     are paired with the multipliers so the biggest multipliers get the biggest combos (an upper bound whatever the
//     order the judgments come in);
//   * GUAPA pairs count twice (guapaHit adds the note's points again);
//   * the FINAL ESBOJARRAT doubles everything judged from `song.finale` on; to be safe, from FINALE_SLACK before it
//     (the x2 flag is set per frame and a press is judged at its event time, up to 0.5 s old);
//   * each hold's trickle: 400 (x2 in the finale);
//   * balloons: every tap scores 50 and every `need` taps pop it for 300 x need, over the whole window the balloon
//     takes taps (from WIN.good before it to HANDOFF before its end), at TAP_RATE taps a second.
// TAP_RATE is the assumption: the game has no input-rate cap, so 30 taps/s (several fingers drumming on the pad or
// on keys; key auto-repeat is ignored), about double what the fastest single-finger tappers manage.
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../../src/game/chart.js';
import { WINDOWS } from '../../src/game/progress.js';

export const TAP_RATE = 30; // taps per second, the generous human maximum (see above)
export const MARGIN = 1.05; // +5% on top of the perfect run
export const FINALE_SLACK = 1; // s before song.finale that still counts as doubled
const HANDOFF = 0.06; // main.js: a balloon takes taps until 60 ms before its end
// The scoring, as main.js has it (tests/game/score-ceiling.mjs checks these expressions are still in main.js)
export const SCORING = Object.freeze({ perfect: 300, comboStep: 2, comboCap: 100, pump: 50, pop: 300, hold: 400 });

export const loadSong = () => JSON.parse(readFileSync(new URL('../../src/song-mulassa.json', import.meta.url)));
export const loadDracSong = () => JSON.parse(readFileSync(new URL('../../src/song-drac.json', import.meta.url)));

// `taps` (one count per balloon) and `slack` replace the assumptions, to compare with a real run (the test's autoplay)
export function perfectMax(song, diff, { taps: given, slack = FINALE_SLACK } = {}) {
  const chart = makeDanceChart(song, diff), fin = t => (t >= song.finale - slack ? 2 : 1);
  let b = 0;
  const mults = [];
  let extra = 0;
  for (const n of chart) {
    if (n.balloon) {
      const f = fin(n.end), taps = given ? given[b++] : Math.floor(TAP_RATE * (n.end - n.t + WINDOWS[diff].good - HANDOFF)) + 1;
      extra += (SCORING.pump * taps + SCORING.pop * n.need * Math.floor(taps / n.need)) * f;
      mults.push(fin(n.end)); // its judgment, at its end
      continue;
    }
    mults.push((n.big ? 2 : 1) * fin(n.t));
    if (n.end) { mults.push(fin(n.end)); extra += SCORING.hold * fin(n.end); } // the tail's judgment and its trickle
  }
  mults.sort((a, b) => b - a); // the biggest multipliers with the biggest combos
  const n = mults.length;
  const judged = mults.reduce((s, m, i) => s + m * (SCORING.perfect + SCORING.comboStep * Math.min(n - i, SCORING.comboCap)), 0);
  return { judgments: n, extras: extra, max: judged + extra, balloons: extra - chart.filter(c => c.end && !c.balloon).reduce((s, c) => s + SCORING.hold * fin(c.end), 0) };
}

// rounded up to the next thousand, so the SQL and the client carry round numbers
export const ceilingOf = max => Math.ceil(max * MARGIN / 1000) * 1000;
export const ceilings = (song = loadSong()) => [0, 1, 2].map(d => ceilingOf(perfectMax(song, d).max));
// versions.extras_max: what holds and balloons pay whatever the judgments say, with the same margin
export const extrasCeilings = (song = loadSong()) => [0, 1, 2].map(d => ceilingOf(perfectMax(song, d).extras));

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [name, song] of [['mulassa-v3', loadSong()], ['drac-v1', loadDracSong()]]) for (const d of [0, 1, 2]) {
    const r = perfectMax(song, d);
    console.log(`${name} level ${d}: ${r.judgments} judgments, perfect max ${r.max} (balloons ${r.balloons}), ceiling ${ceilingOf(r.max)}, extras_max ${ceilingOf(r.extras)}`);
  }
}
