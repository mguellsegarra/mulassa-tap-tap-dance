// Free play on an iPhone held upright: Safari recommends the home-screen app first, then a sheet asks for the turn;
// free play starts once the phone is sideways.
import assert from 'node:assert/strict';
import { setupFreeGate } from '../../src/ui/free-gate.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const dialog = () => ({ open: false, showModal() { this.open = true; }, close() { this.open = false; } });
const button = () => ({ addEventListener(k, f) { this.h = f; } });
function make(o = {}) {
  const on = {}, fire = k => on[k]?.forEach(f => f()), up = { v: true };
  const turn = dialog(), fs = dialog();
  const ok = button(), fsX = button(), turnX = button(), home = { hidden: false }, homeGo = button();
  const els = { 'free-hint-menu': turn, 'free-fs-menu': fs, 'free-fs-ok': ok, 'free-fs-close': fsX, 'free-hint-close': turnX, 'free-hint-home': home, 'free-hint-home-go': homeGo };
  let entered = 0, focused = null;
  const gate = setupFreeGate({ focusIn: (m, id) => (focused = id), onEnter: () => entered++, ua: IPHONE, standalone: false, portrait: () => up.v,
    doc: { getElementById: id => els[id] }, listen: (k, f) => (on[k] ||= []).push(f), ...o });
  return { gate, turn, fs, ok, fsX, turnX, home, homeGo, up, fire, get entered() { return entered; }, get focused() { return focused; } };
}

// not an iPhone, or already sideways: free play goes straight in
assert.equal(make({ ua: 'Linux; Android 14' }).gate.ask(), false, 'Android locks the orientation itself');
{ const t = make(); t.up.v = false; assert.equal(t.gate.ask(), false, 'sideways already: nothing to ask'); }

// upright iPhone in Safari: the recommendation first, «D’acord» brings the turn sheet; turning starts free play
const a = make();
assert.equal(a.gate.ask(), true); assert.deepEqual([a.fs.open, a.turn.open, a.focused], [true, false, 'free-fs-ok']);
a.ok.h(); assert.deepEqual([a.fs.open, a.turn.open, a.focused, a.gate.isOpen], [false, true, 'free-hint-close', true]);
a.fire('resize'); assert.deepEqual([a.turn.open, a.entered], [true, 0], 'still upright: it waits');
a.up.v = false; a.fire('orientationchange'); assert.deepEqual([a.turn.open, a.entered], [false, 1]);
a.fire('resize'); assert.equal(a.entered, 1, 'once, not again');

// turning while the recommendation is up skips it and starts too
const t2 = make(); t2.gate.ask(); t2.up.v = false; t2.fire('resize'); assert.deepEqual([t2.fs.open, t2.entered], [false, 1]);

// the home-screen app has no recommendation to give; either × cancels without starting anything
const b = make({ standalone: true });
b.gate.ask(); assert.deepEqual([b.fs.open, b.turn.open], [false, true]); b.turnX.h(); assert.deepEqual([b.turn.open, b.entered], [false, 0]);
b.up.v = false; b.fire('resize'); assert.equal(b.entered, 0, 'closed: turning does not start free play');
const c = make(); c.gate.ask(); c.fsX.h(); assert.deepEqual([c.fs.open, c.turn.open], [false, false], 'the recommendation\'s × cancels');
// the recommendation once: a later tap in Safari only asks to turn
{ const mem = new Map(), kv = { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
  const d = make({ store: kv }); d.gate.ask(); assert(d.fs.open && !d.turn.open, 'first time: the recommendation'); d.fsX.h();
  const e = make({ store: kv }); e.gate.ask(); assert(!e.fs.open && e.turn.open, 'seen: straight to the turn sheet'); }
// the turn sheet in Safari points back at the steps; «Ho entenc» there asks for the turn again
{ const f = make(); f.gate.ask(); f.ok.h(); assert.equal(f.home.hidden, false, 'Safari: the bubble shows');
  f.homeGo.h(); assert.deepEqual([f.turn.open, f.fs.open], [false, true]); f.ok.h(); assert.deepEqual([f.fs.open, f.turn.open], [false, true]); }
assert.equal(make({ standalone: true }).home.hidden, true, 'the home-screen app: no bubble');
console.log('free-gate ok');
