// src/ui/sheet-fade.js: a sheet's scrolling body gets a drawn bar only while it overflows, its thumb tracking the scroll.
import assert from 'node:assert/strict';

const el = (tag, props = {}) => ({ localName: tag, children: [], attrs: {}, style: { }, on: {}, ...props,
  append(c) { this.children.push(c); c.parentNode = this; if (!this.firstChild) this.firstChild = c; },
  setAttribute(k, v) { this.attrs[k] = v; }, toggleAttribute(k, on) { if (on) this.attrs[k] = ''; else delete this.attrs[k]; },
  addEventListener(t, f) { this.on[t] = f; } });
globalThis.document = { createElement: el };
globalThis.ResizeObserver = class { observe() {} };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = f => f();
const { sheetFades } = await import('../src/ui/sheet-fade.js');

const dialog = el('dialog');
const body = el('div', { offsetTop: 20, clientHeight: 400, scrollHeight: 800, scrollTop: 0, matches: s => s === '.sheet > .sheet-body' });
dialog.append(body);
sheetFades({ querySelectorAll: () => [body] });
const bar = body.sheetBar;
assert.equal(bar.parentNode, dialog, 'the bar sits on the frame');
assert.equal(bar.attrs['aria-hidden'], 'true');
dialog.on.toggle();
assert.equal(bar.hidden, false, 'shown while the body overflows');
assert.equal(bar.style.top, '32px', 'clear of the corner X');
const track = parseFloat(bar.style.height), thumb = parseFloat(bar.firstChild.style.height);
assert(Math.abs(thumb - track / 2) < 0.01, 'thumb = the visible share of the track');
assert.equal(bar.firstChild.style.transform, 'translateY(0px)');
body.scrollTop = 400; body.on.scroll();
assert.equal(bar.firstChild.style.transform, `translateY(${track - thumb}px)`, 'at the end, the thumb at the bottom');
assert('data-more-up' in body.attrs && !('data-more-down' in body.attrs));
body.scrollHeight = 403; body.scrollTop = 0; body.on.scroll();
assert.equal(bar.hidden, true, 'a few px over fits: no bar');
assert(!('data-more-down' in body.attrs), 'and no fade');
console.log('sheet bar ok');
