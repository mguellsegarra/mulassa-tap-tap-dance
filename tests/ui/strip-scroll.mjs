import assert from 'node:assert/strict';
import { stripScroll, scrollMs } from '../../src/ui/strip-scroll.js';

function harness(hz = 60, quantize = x => x) {
  let now = 0, id = 0, reduced = false;
  const frames = new Map(), samples = [];
  const row = { scrollLeft: 0, scrollWidth: 5000, clientWidth: 400, scrollTo({ left }) { this.scrollLeft = quantize(left); samples.push(this.scrollLeft); } };
  const win = { performance: { now: () => now }, requestAnimationFrame(f) { frames.set(++id, f); return id; }, cancelAnimationFrame(i) { frames.delete(i); } };
  const scroll = stripScroll(row, win, () => reduced);
  const tick = (ms = 1000 / hz) => { now += ms; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(f => f(now)); };
  const settle = () => { for (let i = 0; frames.size && i < hz * 8; i++) tick(); assert.equal(frames.size, 0, 'motion comes to rest'); };
  return { row, scroll, tick, settle, frames, samples, reduce() { reduced = true; } };
}
for (const hz of [60, 120]) {
  const h = harness(hz), { row, scroll, tick, settle } = h;
  scroll.to(600); assert.equal(row.scrollLeft, 0, 'navigation never teleports to the destination');
  for (let i = 0; i < 6; i++) tick();
  assert(row.scrollLeft > 0 && row.scrollLeft < 600);
  const before = row.scrollLeft;
  scroll.to(1200); assert.equal(row.scrollLeft, before, 'retargeting keeps the visible position');
  tick(); assert(row.scrollLeft > before, 'repeated keys keep moving, with no restarted animation delay');
  for (let i = 0; i < 3; i++) scroll.to(scroll.target + 100); // what the wheel does
  assert.equal(scroll.target, 1500, 'rapid wheel events accumulate their full distance');
  settle(); assert.equal(row.scrollLeft, 1500);
  const steps = h.samples.slice(1).map((x, i) => x - h.samples[i]);
  assert(steps.every(d => d >= 0), 'retargeting forward never stops or reverses the motion');
  assert(Math.max(...steps) <= 1.8 * 1500 / scrollMs(1500) * 1000 / hz + 0.5, 'no animation completion or retargeting causes a large scroll jump');
  scroll.to(0); for (let i = 0; i < hz / 10; i++) tick();
  scroll.to(1800); settle(); assert.equal(row.scrollLeft, 1800, 'direction reversal settles on the latest request');
  scroll.to(500); tick(); scroll.stop(); const stopped = row.scrollLeft;
  tick(); assert.equal(row.scrollLeft, stopped, 'direct manipulation cancels programmatic scrolling');
  scroll.to(10000); settle(); assert.equal(row.scrollLeft, 4600, 'the real right boundary clamps the destination');
  scroll.to(-100); settle(); assert.equal(row.scrollLeft, 0);
  scroll.to(1000); tick(500);
  assert(row.scrollLeft <= 250, 'a delayed frame does not turn into a half-second leap');
  h.reduce(); tick(); assert.equal(row.scrollLeft, 1000); assert.equal(h.frames.size, 0, 'reduced motion cancels remaining animation');
  scroll.to(10); assert.equal(row.scrollLeft, 10, 'reduced motion uses direct navigation');
}
// Every request lands within its bounded time, however far: the speed grows with the distance, the time barely does.
for (const hz of [30, 60, 120]) for (const distance of [150, 450, 1200, 4600]) for (const dir of [1, -1]) {
  const h = harness(hz), start = dir > 0 ? 0 : 4600;
  h.scroll.to(start, true); h.samples.length = 0;
  let frames = 0;
  h.scroll.to(start + dir * distance);
  while (h.frames.size && frames < hz * 2) { h.tick(); frames++; }
  const ms = frames * 1000 / hz;
  assert(!h.frames.size && h.row.scrollLeft === start + dir * distance, `${hz} Hz ${distance}px: arrives exactly`);
  assert(ms <= scrollMs(distance) + 1000 / hz && scrollMs(distance) <= 450, `${hz} Hz ${distance}px: in ${ms.toFixed(0)} ms, capped`);
  assert(h.samples[0] !== start, 'the first frame already moves (a quick start)');
  const s = [start, ...h.samples];
  assert(s.every((x, i) => i === 0 || (x - s[i - 1]) * dir > -1e-6), 'no overshoot, no step back');
  const last = Math.abs(s.at(-1) - s.at(-2)), peak = Math.max(...s.slice(1).map((x, i) => Math.abs(x - s[i])));
  assert(last <= peak * 0.25 + 0.5, 'a soft landing, not a final jump');
}
// A change of mind mid-way bends the motion from where it is: no stop, no queue, no restart from rest.
for (const hz of [60, 120]) {
  const h = harness(hz);
  h.scroll.to(3000); for (let i = 0; i < hz * 0.15; i++) h.tick();
  const a = h.row.scrollLeft, v = a - h.samples.at(-2);
  h.scroll.to(200); h.tick();
  assert(h.row.scrollLeft - a > -0.5 && h.row.scrollLeft - a <= v + 0.5, 'reversing keeps the current speed for a frame, then turns');
  let frames = 1; while (h.frames.size && frames < hz) { h.tick(); frames++; }
  assert.equal(h.row.scrollLeft, 200);
  assert(frames * 1000 / hz <= scrollMs(Math.abs(a - 200)) + 1000 / hz, 'the new destination takes its own bounded time');
}
console.log('strip scroll: bounded arrival at 30/60/120 Hz, both directions, soft landing and mid-way reversal ok');
console.log('strip scroll: retargeting, rapid wheel, reversal, boundaries and reduced motion ok');
const rounded = harness(120, Math.round);
rounded.scroll.to(283.25);
rounded.settle(); // settle() fails if the animation never comes to rest
assert.equal(rounded.row.scrollLeft, 283, 'browser pixel rounding cannot leave the animation running forever');
