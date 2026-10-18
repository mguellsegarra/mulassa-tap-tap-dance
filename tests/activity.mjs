// Delayed effects are invalidated by actual page lifecycle handlers, even if a timer is delivered after focus returns.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const handlers = {}, timers = [];
let active = true, cleared = 0, suspended = 0, woke = 0;
const activityEpoch = Number(read('../src/game/state.js').match(/export const G = \{ activityEpoch: (\d+),/)[1]);
const G = { activityEpoch, state: 'select', paused: false };
const ctx = vm.createContext({ G, pageActive: () => active,
  chip: { clearMenuSfx() { cleared++; }, ctx: { suspend() { suspended++; } }, wake() { woke++; } },
  pauseGame() { if (G.state === 'play') G.paused = true; },
  document: { addEventListener(k, f) { handlers[k] = f; } },
  addEventListener(k, f) { handlers[k] = f; }, setTimeout(f, ms) { timers.push({ f, ms }); },
});
vm.runInContext(read('../src/ui/pause-actions.js').replace(/^import .*;$/gm, '').replaceAll('export ', ''), ctx);
vm.runInContext(read('../src/game/state.js').match(/export function afterActive\([\s\S]*?\n\}/)[0].replace('export ', ''), ctx);
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
console.log('deferred effects expire on blur, visibility and page exit; fresh effects and explicit pause preserved');
