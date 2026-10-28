// The song gate follows the current cadence, preserving the selected difficulty on Back.
import assert from 'node:assert/strict';
import { setupLowPowerHint } from '../../src/ui/lowpower-hint.js';

function make(forced = false) {
  const els = new Map();
  const el = id => {
    if (!els.has(id)) els.set(id, { open: false, listeners: {},
      addEventListener(k, f) { this.listeners[k] = f; },
      showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); },
      click() { this.listeners.click?.(); } });
    return els.get(id);
  };
  let low = false, starts = 0, backs = 0, focus = null;
  const hint = setupLowPowerHint({ doc: { getElementById: el },
    lowPower: () => low, restore: () => backs++, focusIn: (menu, id) => { focus = id; },
    params: new URLSearchParams(forced ? 'lowpower=1' : '') });
  return { hint, el: id => el(`lowpower-hint-${id}`), ask: () => hint.ask(() => starts++), setLow: v => { low = v; },
    get starts() { return starts; }, get backs() { return backs; }, get focus() { return focus; } };
}
{
  const t = make();
  assert.equal(t.ask(), false, 'normal cadence: caller starts without a sheet');
  t.setLow(true);
  assert.equal(t.ask(), true);
  assert.equal(t.hint.isOpen, true); assert.equal(t.focus, 'lowpower-hint-ok');
  assert.equal(t.starts, 0, 'opening never starts a song');
  t.el('back').click();
  assert.deepEqual([t.starts, t.backs, t.hint.isOpen], [0, 1, false]);
  t.ask(); t.el('ok').click(); t.el('ok').click();
  assert.equal(t.starts, 1, 'continue starts once, through the original callback');
  assert.equal(t.ask(), true, 'a later song still warns'); t.el('menu').close(); // native Escape/close
  assert.equal(t.backs, 2);
  t.setLow(false); assert.equal(t.ask(), false, 'read the cadence again for the next song');
}
assert.equal(make(true).ask(), true, 'dev override can force desktop screenshots');
console.log('low-power song hint ok');
