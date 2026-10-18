import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const badge = { style: {}, dataset: {}, setAttribute() {} };
const toggle = { addEventListener(_, fn) { this.change = fn; } };
let rail = false, measures = 0;
const context = vm.createContext({
  document: {
    getElementById: id => id === 'fps' ? badge : toggle,
    body: { classList: { toggle: (_, on) => { rail = on; } } },
  },
  store: { get: () => 'on', set() {} }, hide: (el, hidden) => { el.hidden = hidden; },
  sheets: { select: { measure() { measures++; }, fpsFooter: [] } },
  G: { state: 'select' }, pace: { fps: 60 }, COARSE: { matches: false },
  K: 1, HH: 667, SAFE: { t: 0, r: 0, b: 0, l: 0 }, playBottom: () => 600, addEventListener() {},
});
vm.runInContext(readFileSync(new URL('../src/dev/fps.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '').replace('export function', 'function'), context);
let now = 1000;
function tick() {
  vm.runInContext(`fpsTick(${now});fpsTick(${now + 300})`, context);
  now += 600;
  return { top: badge.style.top, bottom: badge.style.bottom };
}
assert(rail, 'remembered FPS reserve their rail before the selector opens');
assert.deepEqual(tick(), { top: '8px', bottom: 'auto' });
// A hidden action returning, a new footer location and rotation must never move the readout into the action row.
for (const height of [568, 667, 852, 375, 1024, 800]) {
  context.HH = height;
  context.sheets.select.fpsFooter = [{ left: 0, right: 375, top: height - 80, bottom: height }];
  assert.deepEqual(tick(), { top: '8px', bottom: 'auto' }, `fixed selector rail at height ${height}`);
}
context.pace.lowPower = true;
tick();
assert(!badge.textContent.includes('\n'), 'selector hint never expands the reserved rail');
context.SAFE.t = 47;
assert.equal(tick().top, '55px', 'rail respects the notch');
toggle.checked = false; toggle.change(); tick();
assert(!rail && badge.hidden && measures === 1, 'switch off releases the rail and remeasures the selector');
toggle.checked = true; toggle.change();
context.G.state = 'play'; context.COARSE.matches = true; context.HH = 800;
assert.deepEqual(tick(), { top: 'auto', bottom: '206px' }, 'game restores the pad-relative position');
context.G.practice = {};
assert.equal(tick().bottom, '232px', 'practice also clears its instruction');
console.log('FPS fixed rail, footer independence, switch, safe areas and game position ok');
