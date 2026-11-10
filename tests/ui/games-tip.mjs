// «Més jocs!» beside the games button where the header has room, under it on a narrow phone (games-tip.js).
import assert from 'node:assert/strict';
import { setCatalog } from '../../src/i18n/messages.js';
setCatalog({ 'ui.games.tip': 'Més jocs!' });
import { setupGamesTip } from '../../src/ui/games-tip.js';

function make({ freeLeft, logoRight, innerWidth = 1280 }) {
  const tip = { style: { setProperty(k, v) { tip.style[k] = v; } }, offsetWidth: 82, offsetHeight: 40, classList: { on: new Set(), toggle(c, v) { v ? this.on.add(c) : this.on.delete(c); } }, setAttribute() {} };
  const free = { after() {}, checkVisibility: () => true, getBoundingClientRect: () => ({ left: freeLeft, top: 10, width: 44, height: 44, bottom: 54 }) };
  const svg = { getScreenCTM: () => ({ a: 1, e: 12 }), getBBox: () => ({ x: 0, width: logoRight - 12 }) };
  const doc = { getElementById: () => free, querySelector: () => svg, createElement: () => tip, body: { append() {} } };
  setupGamesTip({ doc, win: { innerWidth } }).update();
  return tip;
}

const wide = make({ freeLeft: 1100, logoRight: 700 });
assert.ok(wide.classList.on.has('games-tip-side'), 'room on the left: beside the button');
assert.equal(wide.style.left, `${1100 - 14 - 82}px`, 'its right edge 14 px from the button');
assert.equal(wide.style.top, `${10 + 22 - 20}px`, 'centred on the button');

const phone = make({ freeLeft: 215, logoRight: 132, innerWidth: 375 }); // 375×667: the lettering ends at 132
assert.ok(!phone.classList.on.has('games-tip-side'), 'no room beside the lettering: under the button');
assert.equal(phone.style.top, '68px');
assert.equal(phone.style['--tail'], `${237 - (237 - 41)}px`, 'its tail at the button\'s centre');
