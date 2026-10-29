import assert from 'node:assert/strict';
import { waitForWarmup, linkPrograms } from '../../src/platform/boot.js';
function clock() {
  let id = 0;
  const queued = new Map();
  return { queued, setTimeout(fn, ms) { queued.set(++id, { fn, ms }); return id; }, clearTimeout(id) { queued.delete(id); },
    expire() { for (const { fn } of [...queued.values()]) fn(); } };
}
{
  const timers = clock();
  let settle;
  const pending = waitForWarmup(() => new Promise(resolve => { settle = resolve; }), { timers });
  assert.equal([...timers.queued.values()][0].ms, 1500, 'warmup leaves time for real rendering inside the 20s phase deadline');
  timers.expire();
  assert.equal(await pending, 'timeout', 'a shader driver that never completes cannot block the first render forever');
  settle(); await Promise.resolve();
  assert.equal(await pending, 'timeout', 'late compilation cannot start a second loop');
  assert.equal(timers.queued.size, 0);
}
for (const [job, outcome] of [[() => Promise.resolve(), 'ready'], [() => Promise.reject(new Error('compile')), 'failed'], [() => { throw Error('compile'); }, 'failed']]) {
  const timers = clock();
  assert.equal(await waitForWarmup(job, { timers }), outcome);
  assert.equal(timers.queued.size, 0, 'settled warmup releases its fallback timer');
}
console.log('boot warmup: pending, late, fulfilled, rejected and synchronous failures ok');
{ // shader programs are linked a time budget at a time, each slice its own task, so the loader keeps moving
  const timers = clock(), linked = [];
  let t = 0;
  const program = (cost, fail) => ({ getUniforms() { t += cost; if (fail) throw Error('lost'); linked.push(cost); } });
  let finished = false;
  const job = linkPrograms([program(5), program(5, true), program(5), program(5)], { budget: 4, now: () => t, timers }).then(() => { finished = true; });
  assert.equal(linked.length, 1, 'a slice stops once its budget is spent');
  for (let i = 0; i < 5 && timers.queued.size; i++) timers.expire();
  await job;
  assert(finished && linked.length === 3, 'every program is visited; a failing one does not stop the rest');
  assert.equal(await linkPrograms(undefined, { timers }), undefined, 'nothing to link resolves at once');
}
console.log('boot program linking: sliced, resilient ok');
