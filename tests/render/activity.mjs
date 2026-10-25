// Delayed effects are invalidated by actual page lifecycle handlers, even if a timer is delivered after focus returns.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const handlers = {}, timers = [];
let active = true, cleared = 0, suspended = 0, woke = 0;
const activityEpoch = Number(read('../../src/game/state.js').match(/export const G = \{ activityEpoch: (\d+),/)[1]);
const G = { activityEpoch, state: 'select', paused: false };
const ctx = vm.createContext({ G, pageActive: () => active,
  chip: { suspend() { this.ctx.suspend(); }, clearMenuSfx() { cleared++; }, ctx: { state: 'running', currentTime: 0, suspend() { suspended++; } }, wake() { woke++; } },
  pauseGame() { if (G.state === 'play') G.paused = true; },
  document: { addEventListener(k, f) { handlers[k] = f; } },
  addEventListener(k, f) { handlers[k] = f; }, setTimeout(f, ms) { timers.push({ f, ms }); },
});
vm.runInContext(read('../../src/ui/pause-actions.js').replace(/^import .*;$/gm, '').replaceAll('export ', ''), ctx);
vm.runInContext(read('../../src/game/state.js').match(/export function afterActive\([\s\S]*?\n\}/)[0].replace('export ', ''), ctx);
for (const state of ['select', 'play']) for (const gap of [300, 120000]) for (const event of ['blur', 'visibilitychange', 'pagehide']) {
  G.state = state; G.paused = false;
  let fired = 0;
  ctx.afterActive(700, () => fired++);
  assert.equal(timers[0].ms, 700);
  active = false; handlers[event]();
  active = true; handlers.focus();
  // Deliver an overdue browser timer only after foreground / explicit resume; the elapsed gap cannot revive it.
  G.paused = false;
  timers.splice(0).forEach(({ f }) => f());
  assert.equal(fired, 0, `${state}, ${event}, ${gap} ms: expired effect cannot catch up`);
  ctx.afterActive(700, () => fired++); timers.splice(0).forEach(({ f }) => f());
  assert.equal(fired, 1, 'a fresh, uninterrupted effect still fires');
}
assert(cleared > 0 && suspended > 0 && woke > 0);

// Back from another app (no gesture): an unlocked menu resumes by itself, a paused run stays suspended (iOS stayed mute until a tap).
{
  let resumes = 0; const chip = ctx.chip; chip.woke = true; chip.resume = () => { resumes++; };
  Object.assign(G, { state: 'select', paused: false }); active = true; handlers.focus();
  assert.equal(resumes, 1, 'the selector comes back with its sound');
  const before = suspended; Object.assign(G, { state: 'play', paused: true, resuming: null }); handlers.focus();
  assert.equal(resumes, 1, 'a paused run is not resumed');
  assert.equal(suspended, before + 1, 'and stays suspended');
  delete chip.woke; delete chip.resume; G.resuming = undefined;
}

// A run's audio clock that stands still (suspended, or `running` with a frozen currentTime) pauses the run after 1 s.
const audio = ctx.chip.ctx;
const watch = (ms, step, frames = 75) => { for (let i = 0; i <= frames; i++) { audio.currentTime += step; ctx.watchAudio(ms + i * 16); } };
Object.assign(G, { state: 'play', paused: false }); ctx.chip.t0 = 0; active = true;
watch(0, 0.016); assert.equal(G.paused, false, 'a moving clock plays on');
watch(2000, 0); assert.equal(G.paused, true, 'running but frozen (stuck at PREPARATS): paused');
G.paused = false; audio.state = 'suspended'; watch(4000, 0); assert.equal(G.paused, true, 'suspended mid-run: paused');
G.paused = false; audio.state = 'running'; watch(6000, 0, 50); assert.equal(G.paused, false, 'under a second: no pause');
G.paused = false; ctx.chip.t0 = null; watch(8000, 0); assert.equal(G.paused, false, 'still loading the song (no clock yet): no pause');
console.log('deferred effects expire on blur, visibility and page exit; fresh effects and explicit pause preserved');
