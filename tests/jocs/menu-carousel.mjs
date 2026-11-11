// Mulassa Games' card row (src/jocs/menu/carousel.js): a touch only chooses (double-tap.js's detail-0 click included),
// Enter launches only under keyboard navigation, a mouse drag is only the primary button's and always ends, a slower
// earlier picture never overwrites the later one, and a burst of scroll events costs one sync a frame.
import assert from 'node:assert/strict';

const on = {}, fire = (type, e = {}) => on[type]?.forEach(f => f({ type, target: {}, ...e }));
const target = () => { const h = {}; return { h, addEventListener: (t, f) => (h[t] ??= []).push(f), fire: (t, e) => h[t]?.forEach(f => f({ preventDefault() {}, ...e })) }; };
globalThis.addEventListener = (type, f) => (on[type] ??= []).push(f);
globalThis.document = { documentElement: { toggleAttribute() {} } };
const mq = { matches: false, onchange: [], addEventListener(t, f) { mq.onchange.push(f); } };
globalThis.matchMedia = () => mq; // narrow, motion allowed: no clip on these cards
globalThis.getComputedStyle = () => ({});
const frames = [];
globalThis.requestAnimationFrame = f => frames.push(f);
const decodes = []; // each probe's decode, settled by the test
globalThis.Image = class { set src(v) { this.url = v; } decode() { return new Promise(go => decodes.push(() => go())); } };

const classes = () => ({ toggle() {}, add() {}, remove() {}, contains: () => false });
const card = (game, i) => ({ ...target(), getBoundingClientRect: () => ({ left: i * 100 }), dataset: { game, hero: `/h/${game}.jpg` }, classList: classes(),
  querySelector: sel => (sel === 'img' ? { getAttribute: () => `/c/${game}.jpg` } : { textContent: game }) });
const cards = ['tap', 'pop', 'aviat-1'].map(card);
const els = {
  'games-grid': { ...target(), scrollWidth: 0, clientWidth: 0, style: {}, scrollLeft: 0, querySelectorAll: () => cards, getBoundingClientRect: () => ({ left: 0 }) },
  'games-hero': { dataset: {}, classList: classes() },
  'games-hero-name': {}, 'games-hero-desc': {}, 'games-hero-art': {}, 'games-hero-back': {}, 'games-menu': target(),
  'games-hero-video': { classList: { add() {}, remove() {}, contains: () => false }, parentElement: { classList: classes() }, pause() {}, getAttribute: () => null },
};
const { setupGamesCarousel } = await import('../../src/jocs/menu/carousel.js');
const carousel = setupGamesCarousel({ getElementById: id => els[id] });
const row = els['games-grid'];
const settle = async () => { while (decodes.length) decodes.shift()(); await null; await null; };
await settle();
assert.equal(carousel.chosen(), cards[0], 'the first game is chosen from the start');

// a touch (and the detail-0 click a quick second touch becomes) only chooses; Enter launches while the keys drive the page
fire('pointerdown'); // a touch or a mouse press: not keyboard navigation (focus.js)
assert.equal(carousel.take(cards[0], { detail: 0 }), false, 'a detail-0 click with no key before it (double-tap.js) does not launch');
assert.equal(carousel.take(cards[0], { detail: 1 }), false, 'a click on the chosen card only chooses');
fire('keydown');
assert.equal(carousel.take(cards[0], { detail: 0 }), true, 'Enter on the chosen card launches');
assert.equal(carousel.take(cards[1], { detail: 0 }), false, 'Enter on another card chooses it');
assert.equal(carousel.chosen(), cards[1]);

// a stale decode: the screen turned wide while the narrow picture still decoded; the later request's picture stays
await settle();
carousel.take(cards[0], { detail: 1 }); const narrow = decodes.shift(); // the narrow picture's decode, slow
mq.matches = true; mq.onchange.forEach(f => f()); const wide = decodes.shift();
wide(); await null; await null;
assert.equal(els['games-hero-art'].src, '/h/tap.jpg', 'the wide picture is in');
narrow(); await null; await null;
assert.equal(els['games-hero-art'].src, '/h/tap.jpg', 'an older, slower decode does not write its picture over it');
mq.matches = false;

// the mouse: only the primary button drags; a drag ends without pointerup (released outside), and a click after none is not swallowed
const mouse = (extra = {}) => ({ pointerType: 'mouse', clientX: 100, buttons: 1, button: 0, ...extra });
row.fire('pointerdown', mouse({ button: 2, buttons: 3 })); // the right button pressed while the left is held
fire('pointermove', mouse({ clientX: 40, buttons: 3 }));
assert.equal(row.scrollLeft, 0, 'the right button does not drag the row');
row.fire('pointerdown', mouse());
fire('pointermove', mouse({ clientX: 40 }));
assert.equal(row.style.scrollSnapType, 'none', 'the primary button drags');
fire('pointermove', mouse({ clientX: 30, buttons: 0 }));
assert.equal(row.style.scrollSnapType, '', 'the button let go outside the window: the drag ends, snapping back');
fire('pointerdown'); row.fire('pointerdown', { pointerType: 'touch' }); fire('keydown'); // the next press resets the drag's «swallow the click»…
assert.equal(carousel.take(cards[0], { detail: 0 }), true, '…so the next click is a click');
row.fire('pointerdown', mouse()); fire('pointermove', mouse({ clientX: 40 })); fire('pointercancel');
assert.equal(row.style.scrollSnapType, '', 'a cancelled pointer ends the drag too');

// scroll events: one sync a frame
frames.length = 0;
for (let i = 0; i < 5; i++) row.fire('scroll');
assert.equal(frames.length, 1, 'five scroll events, one queued sync');
frames.shift()(); row.fire('scroll');
assert.equal(frames.length, 1, 'the next frame queues the next one');
console.log('menu carousel: touch only chooses, keys launch, drag and stale picture and scroll sync guarded ok');
