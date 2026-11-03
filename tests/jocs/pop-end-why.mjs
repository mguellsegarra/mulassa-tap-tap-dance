// Every way a run can end names its culprit on the end sheet: a reason line and the home card whose portrait main.js shows.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, tap, tick, GOODIES, TRAPS } from '../../src/jocs/games/pop/rules.js';

const ca = JSON.parse(readFileSync(new URL('../../src/jocs/games/pop/locales/ca.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../../pop/index.html', import.meta.url), 'utf8');
const culprits = new Set();
for (const kind of ['drac', 'mula', ...GOODIES, ...TRAPS]) for (const tapped of [true, false]) {
  // tapped, or left alone for a second: its own life is one, and the Mulassas that spawn meanwhile last five
  const g = newGame({ rng: () => .5, on: (e, c) => { if (e === 'over' && c.i === 0) culprits.add(c.kind); } });
  Object.assign(g.cells[0], { kind, left: 1 });
  if (tapped) tap(g, 0);
  else for (let s = 0; s < 25 && g.state === 'play'; s++) tick(g, .05);
}
assert.deepEqual([...culprits].sort(), ['drac', 'dracFals', 'mula', 'mulaFalsa', 'petard']);
for (const kind of culprits) {
  assert.ok(ca[`end.why.${kind}`], `end.why.${kind}`);
  assert.ok(new RegExp(`class="c-card"[^>]*data-kind="${kind}"`).test(html), `card ${kind}`);
}
console.log('pop-end-why: ok');
