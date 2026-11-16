import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptiveQuality } from '../../src/platform/adaptive-quality.js';
import { framePacer } from '../../src/platform/render-quality.js';

// Integration boundary: real pacer -> drawn intervals -> real adaptiveQuality/frameMonitor -> device load.
// Unlike the short rule tests, every synthetic row runs for a whole Bou song and responds to quality/cap changes.
// These are deterministic device models, not evidence of physical-device performance or shader-switch cost.
const frame60 = 1000 / 60;
const songMs = JSON.parse(readFileSync(new URL('../../src/song-bou.json', import.meta.url))).end * 1000;
const { recordings } = JSON.parse(readFileSync(new URL('./fixtures/low-power-bou.json', import.meta.url)));
const recording = recordings[1].flatMap(([play, frames]) => frames.map(ms => [ms, 9, 1000 / 24, !!play]));
const missed = i => i % 4 === 0 ? 2 * frame60 : frame60;
const gpu = (i, q) => q === -1 ? frame60 : i % (q === 1 ? 2 : 4) === 1 ? 50 : 2 * frame60;

// Each row declares its final level, maximum cumulative late-frame time (ms), and observable interventions.
// A late frame exceeds 125% of the row's target interval, with 0.01 ms float tolerance. Sum the entire interval,
// clipped to the song end, only during play. The target is independent of the estimator: 60 fps for GPU models,
// 30/24 for externally capped ones, 30 after an accepted CPU cap. ProMotion has the game's 60 fps target.
// External withholding cannot be cured by quality: its allowed late time describes that input, not successful recovery.
const rows = [
  { name: '60 Hz CPU-bound', final: 1, maxLate: 3000, changes: [], caps: [true],
    frame: ({ i, cap }) => [cap ? frame60 : missed(i), 14, cap ? 2 * frame60 : frame60] },
  { name: '60 Hz GPU: one level', final: 0, maxLate: 7000, changes: [0], caps: [],
    frame: ({ i, q }) => [q === 1 ? (i % 2 ? 50 : 2 * frame60) : frame60, 5, frame60] },
  { name: '60 Hz GPU: two useful levels', final: -1, maxLate: 13000, changes: [0, -1], caps: [],
    frame: ({ i, q }) => [gpu(i, q), 5, frame60] },
  { name: 'GPU plateau: only minimal helps', final: -1, maxLate: 13000, changes: [0, -1], caps: [],
    frame: ({ i, q }) => [q === -1 ? frame60 : i % 2 ? 50 : 2 * frame60, 5, frame60] },
  { name: 'GPU plateau: modest cadence gain', final: -1, maxLate: 4000, changes: [0, -1], caps: [],
    frame: ({ i, q }) => [q === -1 ? 2 * frame60 : i % 5 ? 2 * frame60 : 50, 5, 2 * frame60] },
  { name: '120 Hz ProMotion', final: 1, maxLate: 0, changes: [], caps: [], half: true,
    frame: ({ i, half }) => [!half && i % 4 === 0 ? frame60 : frame60 / 2, 5, frame60] },
  { name: 'Low Power 30/24 Hz spells', final: 1, maxLate: 5000, changes: [], caps: [],
    frame: ({ i, t }) => {
      const slot = t % 20000 < 10000 ? 2 * frame60 : 1000 / 24;
      return [i % 60 === 0 ? 4 * frame60 : slot, 9, slot];
    } },
  { name: 'Browser withholds frames', final: 1, maxLate: 85000, changes: [0, -1, 1], caps: [],
    frame: ({ i }) => [i % 2 ? 50 : 2 * frame60, 5, 2 * frame60] },
  { name: 'Browser releases cap, then GPU overload', final: 0, maxLate: 21000, changes: [0, -1, 1, 0], caps: [],
    frame: ({ i, t, q }) => {
      if (t < 30000) return [i % 2 ? 50 : 2 * frame60, 5, 2 * frame60];
      return [t >= 40000 && q === 1 ? missed(i) : frame60, 5, frame60];
    } },
  { name: 'CPU thermal throttle at 60 s', final: 1, maxLate: 3000, changes: [], caps: [true],
    frame: ({ i, t, cap }) => [t > 60000 && !cap ? missed(i) : frame60, t > 60000 ? 14 : 5, cap ? 2 * frame60 : frame60] },
  { name: 'Busy GPU spike train at 60 s', final: 0, maxLate: 1200, changes: [0], caps: [],
    frame: ({ i, t, q }) => [t > 60000 && t < 66000 && q === 1 && i % 28 === 0 ? 80 : frame60, 5, frame60] },
  { name: 'Desktop fine', start: 2, final: 2, maxLate: 0, changes: [], caps: [],
    frame: () => [frame60, 3, frame60] },
  // The full owner recording combines quick-bit cap detection, grouped catch-up frames and early-window decisions.
  // The recording uses a conservative 24 fps budget throughout; its changing physical cap was not recorded.
  // Its CPU time was not captured per frame: 9 ms follows the existing fixture replay, not a claimed measurement.
  { name: 'Owner Low Power full recording', final: 1, maxLate: 30000, changes: [0, -1, 1], caps: [], recording },
];

function simulate(row) {
  let q = row.start ?? 1, t = 0, last = 0, lateMs = 0, playMs = 0;
  const changes = [], caps = [], events = [], pace = framePacer();
  const sample = adaptiveQuality({ ceiling: q, level: () => q,
    change: next => { changes.push(next); q = next; },
    halve: on => { caps.push(on); pace.cap = on; },
    report: e => { if (e.reason !== 'window' && e.reason !== 'cadence') events.push(e); },
  });
  const end = row.recording ? row.recording.reduce((sum, [ms]) => sum + ms, 0) : songMs;
  for (let i = 0; row.recording ? i < row.recording.length : last < end - 1e-6; i++) {
    const [ms, cost, budget, play = true] = row.recording?.[i] ?? row.frame({ i, t, q, cap: pace.cap, half: pace.half });
    t += ms;
    if (!pace(t, play)) continue; // skipped rAFs accumulate in the next drawn interval, as in main.js
    const dt = t - last, span = Math.max(0, Math.min(t, end) - last);
    if (play) { playMs += span; if (dt > budget * 1.25 + 0.01) lateMs += span; }
    last = t;
    sample(dt, cost, pace, play, true, play);
  }
  return { q, changes, caps, lateMs, playMs, half: pace.half, events };
}

let passed = 0;
for (const row of rows) {
  const result = simulate(row);
  const detail = `${row.name}: ${JSON.stringify(result)}`;
  assert.equal(result.q, row.final, detail);
  assert.deepEqual(result.changes, row.changes, detail); // no hidden mid-song recovery/oscillation ending at the right level
  assert.deepEqual(result.caps, row.caps, detail);
  if (row.half !== undefined) assert.equal(result.half, row.half, detail);
  assert(result.playMs >= songMs - 1e-6, `${row.name}: must cover a whole song`);
  assert(result.lateMs <= row.maxLate, detail);
  passed++;
  console.log(`${row.name}: level ${row.final}/${result.q}; late ${(result.lateMs / 1000).toFixed(3)} s / ${row.maxLate / 1000} s max`);
}
console.log(`quality song matrix: ${passed}/${rows.length} rows passed`);

