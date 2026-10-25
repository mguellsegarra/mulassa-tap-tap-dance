import assert from 'node:assert/strict';
import { adaptiveQuality } from '../../src/platform/adaptive-quality.js';
import { framePacer } from '../../src/platform/render-quality.js';

const rig = (ceiling = 2) => {
  let level = ceiling, t = 0; const events = [], changes = [];
  const sample = adaptiveQuality({ ceiling, level: () => level, change: q => { changes.push([t, q]); level = q; }, report: e => events.push(e) });
  const run = (seconds, options = {}) => {
    const { hz = 60, fps = hz, cost = 3, miss = 0, ...rest } = options;
    for (let i = 0, end = t + seconds * 1000; t < end; i++) {
      const ms = 1000 / fps * (miss && i % miss === 0 ? 2 : 1); t += ms;
      sample(ms, typeof cost === 'function' ? cost(level) : cost, { hz, fps, half: !!rest.half, lowPower: !!rest.lowPower }, !!rest.hold, rest.ready ?? true);
    }
  };
  return { sample, run, events, changes, get level() { return level; } };
};
{
  const r = rig(); r.run(3); r.run(9, { miss: 4, cost: 14 });
  assert(r.level < 2, 'sustained drag overload lowers actual quality');
  const low = r.level; r.run(11);
  assert.equal(r.level, low, 'a few smooth frames cannot immediately undo the drop');
  r.run(35); assert.equal(r.level, 2, 'sustained measured headroom restores the initial profile without reload');
  assert(r.events.some(e => e.reason === 'headroom-trial' && e.samples > 100 && e.cost < e.budget * .45));
}
{
  const r = rig(); r.run(10, { miss: 4 }); r.run(180, { cost: 12 });
  assert(r.level < 2 && !r.events.some(e => e.reason === 'headroom-trial'), '60 fps with a costly frame is not recovery evidence');
}
{
  const r = rig(); r.run(10, { miss: 4 });
  for (let i = 0; i < 180; i++) r.run(1, { cost: q => q >= 1 ? 18 : 3, miss: r.level >= 1 ? 3 : 0 });
  const trials = r.events.filter(e => e.reason === 'headroom-trial');
  assert(trials.length <= 3, 'a slow device cannot oscillate continuously');
  assert(r.events.some(e => e.reason === 'overload' && e.retry >= 60000), 'failed real trials increase cooldown');
}
for (const policy of [{ hold: true }, { half: true, hz: 120, fps: 60 }, { lowPower: true, hz: 30 }]) {
  const r = rig(); r.run(10, { miss: 4 }); r.run(6, { cost: 12 }); const low = r.level;
  r.run(60, policy); assert.equal(r.level, low, 'song, half-pacer and power cap do not authorize headroom trials');
  r.run(40); assert.equal(r.level, 2, 'recovery resumes after the policy changes');
}
{
  const r = rig(); r.run(10, { miss: 4 }); const low = r.level;
  r.run(10); r.sample.reset('background'); r.run(6);
  assert.equal(r.level, low, 'background time and old headroom cannot qualify reentry');
  r.run(40, { hz: 120 }); assert.equal(r.level, 2, 'stable 120 Hz uses its own budget');
}
{
  const r = rig(-1); r.run(90); assert.equal(r.level, -1, 'software renderer ceiling is preserved');
}
{
  const r = rig(); r.run(3);
  for (let i = 0; i < 12; i++) r.run(1, { hz: i % 2 ? 24 : 40, cost: 30 });
  assert(r.level < 2, 'changing estimated Hz under overload cannot repeatedly erase downgrade evidence');
}
for (const ceiling of [0, 1]) {
  const r = rig(ceiling); r.run(10, { miss: 4 }); r.run(90);
  assert.equal(r.level, ceiling, 'hardware/saveData ceiling survives recovery');
}
{
  const r = rig(); r.run(10, { miss: 4 }); r.run(6, { cost: 12 }); const low = r.level;
  r.run(40, { ready: false }); r.run(10);
  assert.equal(r.level, low, 'shader/loading/suspended frames cannot earn recovery credit');
  r.sample.reset('resize'); r.run(10); assert.equal(r.level, low, 'resize requires fresh stable evidence');
  r.run(40, { half: true, hz: 60 }); assert.equal(r.level, 2, 'a retained half flag at actual 60 Hz is not active half pacing');
}
{
  const r = rig(); r.run(8, { hz: 2.5, cost: 300 });
  assert(r.level < 2, 'repeated 400 ms stalls remain overload evidence');
}
{
  const p = framePacer();
  for (let t = 0; t < 3000; t += 1000 / 120) p(t);
  p.reset();
  for (let t = 20000; t < 21000; t += 1000 / 30) p(t);
  assert(Math.abs(p.hz - 30) < 1 && p.lowPower, 'reentry replaces stale 120 Hz samples with the new 30 Hz cadence');
}
{
  const hitchRun = play => {
    let q = 2;
    const sample = adaptiveQuality({ ceiling: 2, level: () => q, change: v => { q = v; } });
    const pace = { hz: 60, fps: 60, half: false, lowPower: false };
    for (let i = 0; i < 180; i++) sample(1000 / 60, 3, pace, true, true, play);
    for (let k = 0; k < 6; k++) {
      for (let i = 0; i < 27; i++) sample(1000 / 60, 3, pace, true, true, play);
      sample(80, 3, pace, true, true, play);
    }
    for (let i = 0; i < 360; i++) sample(1000 / 60, 3, pace, true, true, play);
    return q;
  };
  assert.equal(hitchRun(false), 2, 'pause excludes the song spike rule while retaining the hold on upgrades');
  assert(hitchRun(true) < 2, 'the same repeated hitches still lower quality during active play');
}
console.log('adaptive quality: overload, measured recovery, failed-trial backoff, caps, background and 120 Hz ok');
