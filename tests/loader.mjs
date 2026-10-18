import vm from 'node:vm';
import { readPage } from './page.mjs';
// The Mulassa loader (src/ui/loader.js + index.html #loader): paints before any JS, releases after readiness and three full phrases,
// only shows later waits past the delay, updates its status line, and respects prefers-reduced-motion.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MULASSA_SVG, MULASSA_MINI_SVG, mulaSpinner, setupLoader, LOADING_JOKES } from '../src/ui/loader.js';
import { applause } from '../src/platform/audio.js';

const html = readPage();
const body = html.slice(html.indexOf('<body'));
assert(body.indexOf('id="loader"') < body.indexOf('<script'), 'the loader is plain HTML, painted before the bundle loads');
assert(/<div id="loader" class="page" role="status" aria-live="polite">/.test(html), 'a live status region, the page cover to start');
assert(/<body aria-busy="true">/.test(html), 'the page says it is busy until the first frame');
assert(html.includes(MULASSA_SVG), 'index.html carries the same Mulassa as src/ui/loader.js');
assert(html.includes('Avisant a la brigada…'), 'Catalan status on the first paint');
const css = html.slice(html.indexOf('#loader {'), html.indexOf('</style>', html.indexOf('#loader {')));
assert(/@media \(prefers-reduced-motion: reduce\)\{\.mula-load \*\{animation:none!important\}\}/.test(css), 'reduced motion: all character parts rest');
assert(/#loader \{[^}]*pointer-events: none/.test(css), 'the loader never takes a tap');
assert(/#loader\.page \.loader-box \{[^}]*animation-delay: 0s/.test(css), 'the page Mulassa shows at once');
// Deterministic time protects the reading time, rather than only a minimum number of milliseconds since navigation.
function timedLoader({ start = 0, ...options } = {}) {
  let t = start, nextId = 0;
  const queue = new Map(), d = dom();
  const timers = { setTimeout(f, ms = 0) { const id = ++nextId; queue.set(id, { f, at: t + ms }); return id; }, clearTimeout(id) { queue.delete(id); } };
  const run = until => {
    for (;;) {
      const due = [...queue].filter(([, x]) => x.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      queue.delete(due[0]); t = due[1].at; due[1].f();
    }
    t = until;
  };
  const L = setupLoader(d.doc, { timers, storage: null, random: () => 0, ...options });
  return { ...d, L, run };
}
for (const start of [0, 7000]) { // also after a slow module load: elapsed navigation time never skips the three lines
  const d = timedLoader({ start });
  d.L.jokes();
  const first = d.label.textContent;
  d.run(start + 500); d.L.ready(); d.L.ready();
  d.run(start + 1599); assert.equal(d.label.textContent, first);
  assert(d.L.covering, 'a fast load still leaves the first phrase readable');
  d.run(start + 1600); const second = d.label.textContent;
  d.run(start + 3200); const third = d.label.textContent;
  assert.equal(new Set([first, second, third]).size, 3, 'three distinct phrases');
  d.run(start + 4799); assert(d.L.covering && !d.classes.has('out'));
  d.run(start + 4800); assert(!d.L.covering && d.classes.has('out'), 'fade only after all three full turns');
  d.run(start + 5050); assert(d.el.hidden);
  d.run(start + 20000); assert.equal(d.label.textContent, third, 'no fourth phrase flashes during or after the fade');
}
{
  const d = timedLoader(); d.L.jokes();
  d.run(5350); const fourth = d.label.textContent;
  assert(d.L.covering, 'three phrases alone never release a game that is still loading');
  d.L.ready();
  d.run(6399); assert(d.L.covering && d.label.textContent === fourth, 'a slow load finishes the current phrase too');
  d.run(6400); assert(!d.L.covering && d.label.textContent === fourth);
}
{
  const d = timedLoader({ giveUp: 3500 }); d.L.jokes();
  d.run(3500); assert(!d.L.covering, 'the safety timeout overrides the minimum reading time');
  const last = d.label.textContent;
  d.run(5000); assert(d.el.hidden && d.label.textContent === last, 'no joke timer survives the timeout');
}
{
  const d = timedLoader(); d.L.jokes(); d.classes.add('fail');
  d.run(20000); assert(!d.el.hidden && !d.classes.has('out'), 'a boot error stays visible past the loader timeout');
}

// A tiny DOM: #loader + #loader-text, and timers run by hand.
function dom() {
  const classes = new Set(['page']), attrs = {};
  const el = { hidden: false, classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)), contains: c => classes.has(c) }, setAttribute: (k, v) => { attrs[k] = v; } };
  const label = { textContent: 'Avisant a la brigada…' };
  let busy = true;
  const doc = { getElementById: id => ({ loader: el, 'loader-text': label })[id], body: { removeAttribute: () => { busy = false; } } };
  const queue = [];
  const timers = { setTimeout: f => queue.push(f), clearTimeout() {} };
  return { el, label, classes, attrs, doc, timers, flush: () => { while (queue.length) queue.shift()(); }, get busy() { return busy; } };
}

{
  const d = dom(), ui = setupLoader(d.doc, { timers: d.timers });
  ui.status('Afinant les gralles…');
  assert.equal(d.label.textContent, 'Afinant les gralles…', 'status updates the line');
  assert(ui.showing, 'the cover shows until the first frame');
  ui.ready();
  assert(d.classes.has('out') && d.classes.has('page') && !d.busy, 'first frame: the whole cover fades out, the page is no longer busy');
  d.flush();
  assert(d.el.hidden === true && !d.classes.has('page'), 'then it is gone (display none: no layout)');
  assert.equal(d.attrs['aria-busy'], 'false');

  const h = ui.wait('Preparant la música…');
  assert.equal(d.el.hidden, true, 'nothing before the delay');
  d.flush();
  assert(d.el.hidden === false && !d.classes.has('out') && d.label.textContent === 'Preparant la música…' && d.attrs['aria-busy'] === 'true', 'a slow wait shows the card');
  const newer = ui.wait('Una altra cosa…');
  ui.done(h);
  assert(!d.classes.has('out'), 'an older wait cannot hide a newer one');
  ui.done(newer); d.flush();
  assert.equal(d.el.hidden, true, 'done hides it');

  const quick = ui.wait('Ràpid…'); ui.done(quick); d.flush();
  assert.equal(d.el.hidden, true, 'a wait shorter than the delay never shows');
}
{
  const d = dom(), ui = setupLoader(d.doc, { timers: d.timers });
  ui.wait('Preparant la música…'); // under the cover: it just takes the line
  ui.ready(); d.flush();
  assert(d.el.hidden === false && !d.classes.has('page'), 'a wait still going when the cover lifts stays, as a card');
  ui.cancel(); d.flush();
  assert.equal(d.el.hidden, true);
}
{
  const d = dom();
  setupLoader(d.doc, { timers: d.timers }); // the first frame never comes (a stuck GPU, a broken frame)
  d.flush();
  assert(d.el.hidden === true && !d.busy, 'the cover lifts by itself after its safety timeout');
}
{
  const made = [];
  const doc = { createElement: tag => { const e = { tag, setAttribute(k, v) { this[k] = v; } }; made.push(e); return e; } };
  const s = mulaSpinner(doc), mini = mulaSpinner(doc, { mini: true });
  assert(s.tag === 'span' && s.className === 'mula-spinner' && s.innerHTML === MULASSA_SVG, 'larger sheet waits use the full figure');
  assert.equal(mini.innerHTML, MULASSA_MINI_SVG, 'small status lines use the head');
  assert.equal(mini['aria-hidden'], 'true', 'the adjacent status text describes the decorative animation');
}
{ // the applause is built in idle slices (it was the freeze after the tap); finish() completes it on demand
  const slices = [];
  const ch = [new Float32Array(48000 * 5), new Float32Array(48000 * 5)];
  const ctx = { sampleRate: 48000, createBuffer: () => ({ getChannelData: i => ch[i] }) };
  const job = applause(ctx, f => slices.push(f));
  assert(!job.done && slices.length === 1, 'nothing synthesised up front');
  slices.shift()();
  assert(!job.done && slices.length === 1, 'a slice does a few people, then waits for the next idle moment');
  const buf = job.finish();
  assert(job.done && ch.every(c => c.some(v => v !== 0)) && buf.getChannelData(1) === ch[1], 'finish() completes both channels');
}

{ // loading jokes: a new visit opens with lines not seen yet; never the same line twice in a row
  const mem = {}, storage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const lines = ['a', 'b', 'c', 'd', 'e'];
  const visit = n => {
    const d = dom(), queue = [], shown = [];
    const timers = { setTimeout: f => queue.push(f), clearTimeout() {} };
    setupLoader(d.doc, { timers, storage }).jokes(lines, 1);
    queue.shift(); // the giveUp timer
    assert.equal(d.label.textContent, 'Avisant a la brigada…', 'the page\u2019s own line stays a full turn (no flash)');
    for (let i = 0; i < n; i++) { queue.shift()(); shown.push(d.label.textContent); }
    return shown;
  };
  const first = visit(3), second = visit(2);
  assert(second.every(l => !first.includes(l)), 'the next visit starts with unseen lines');
  const long = visit(23);
  assert(long.every((l, i) => i === 0 || l !== long[i - 1]), 'never the same line twice in a row');
  assert(lines.every(l => long.slice(0, 6).includes(l) || long.slice(0, 6).length < 5), 'every line shows before any repeats');
}

{ // the first line: index.html's inline script picks one not seen yet (same list and memory as jokes())
  const { LOADING_JOKES } = await import('../src/ui/loader.js');
  const src = html.match(/<script id="loader-first-joke">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(src.match(/var L = (\[[\s\S]*?\]), k =/)[1]), LOADING_JOKES, 'index.html and loader.js share one list');
  const mem = {}, firsts = [];
  for (let v = 0; v < LOADING_JOKES.length + 3; v++) {
    const label = { textContent: 'Avisant a la brigada…' };
    vm.runInNewContext(src, { document: { getElementById: () => label }, localStorage: { getItem: k => mem[k] ?? null, setItem: (k, x) => { mem[k] = x; } }, Math, JSON });
    firsts.push(label.textContent);
  }
  const round = firsts.slice(0, LOADING_JOKES.length);
  assert.equal(new Set(round).size, LOADING_JOKES.length, 'every visit opens with a line not seen yet, until all are seen');
  assert(firsts.every((l, i) => i === 0 || l !== firsts[i - 1]), 'never the same first line twice in a row');
}
console.log('loader contracts ok');

// index.html's boot watchdog: only a fatal start (the entry module failing to load or throwing, or no first frame
// after 60 s of VISIBLE time, 25 s once the module ran) turns the cover into the sad Mulassa with a retry.
{
  const vm = await import('node:vm');
  const src = /<script id="boot-watchdog">([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert(src, 'the boot watchdog is an inline classic script');
  assert(html.indexOf('id="boot-watchdog"') > html.indexOf('<div id="loader"'), 'it runs after the loader is in the page');
  const boot = () => {
    const timers = [], docHandlers = {}, loader = { hidden: true, className: 'out', attrs: {}, innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; },
      parts: {}, querySelector(sel) { return (this.parts[sel] ||= { textContent: '', onclick: null }); } };
    const env = { reloads: 0, window: {}, timers, loader, docHandlers,
      document: { hidden: false, body: { removeAttribute() {} }, getElementById: id => (id === 'loader' ? loader : null),
        querySelector: sel => sel === '#loader .mula-load' ? { outerHTML: MULASSA_SVG } : null,
        addEventListener: (type, f) => { docHandlers[type] = f; } },
      setTimeout: f => timers.push(f), location: { reload() { env.reloads++; } } };
    env.window = env; // window.__mulassa* live on the global, as in a browser
    vm.runInNewContext(src, env);
    env.second = () => { const f = env.timers.shift(); f?.(); };
    env.shown = () => loader.className === 'page fail';
    return env;
  };
  const entry = { tagName: 'SCRIPT', src: 'https://mulassa-tap-tap-dance.pages.dev/assets/index-BBbYn0tK.js' };
  let b = boot();
  b.docHandlers.load({ target: { tagName: 'SCRIPT', src: 'http://localhost:5178/@vite/client' } });
  b.docHandlers.load({ target: { tagName: 'IMG', src: 'x.png' } });
  b.__mulassaBooted = 'module'; b.docHandlers.load({ target: entry });
  for (let i = 0; i < 24; i++) b.second();
  b.__mulassaBooted = true; for (let i = 0; i < 100; i++) b.second();
  assert(!b.shown(), 'a normal load never shows it');
  b = boot();
  b.document.hidden = true; for (let i = 0; i < 200; i++) b.second();
  assert(!b.shown(), 'a hidden tab (no frames) is not a failure');
  b.document.hidden = false; for (let i = 0; i < 60; i++) b.second();
  assert(b.shown(), 'a minute of visible time without the game is');
  assert(b.loader.innerHTML.includes(MULASSA_SVG.replace('class="mula-load"', 'class="mula-load sad"')), 'the pre-bundle error reuses the full artwork in its sad pose');
  assert.equal(b.loader.parts.h1.textContent, 'Ups! No s’ha pogut carregar');
  assert.equal(b.loader.parts.p.textContent, 'Refresca la pàgina per tornar-ho a provar.');
  assert(b.loader.innerHTML.includes('class="btn btn-primary">Torna-ho a provar</button>'), 'the retry is the normal primary button');
  assert(!b.loader.hidden && b.loader.attrs['aria-busy'] === 'false');
  b.loader.parts.button.onclick(); assert.equal(b.reloads, 1, 'the retry reloads');
  b = boot(); b.__mulassaBooted = 'module'; for (let i = 0; i < 25; i++) b.second();
  assert(b.shown(), 'the module ran but no frame came in 25 visible seconds');
  b = boot(); b.docHandlers.load({ target: entry });
  assert(b.shown(), 'the entry module threw while it ran (loaded without the flag): shown at once');
  b = boot(); b.docHandlers.error({ target: { tagName: 'SCRIPT', src: 'http://localhost:5178/src/main.js?t=1' } });
  assert(b.shown(), 'the entry module failed to load');
  b = boot(); b.__mulassaBooted = 'no-webgl'; b.__mulassaFail('Ups! No es pot mostrar el joc', 'El teu navegador…');
  for (let i = 0; i < 100; i++) b.second();
  assert.equal(b.loader.parts.h1.textContent, 'Ups! No es pot mostrar el joc', 'main.js\'s own reason stays (no generic card over it)');
  assert(!b.loader.innerHTML.includes('<button'), 'no retry where a retry cannot help');
  const failCss = html.slice(html.indexOf('#loader.fail {'), html.indexOf('</style>', html.indexOf('#loader.fail {')));
  assert(/#loader\.fail \{[^}]*pointer-events: auto/.test(failCss), 'the failure card takes taps (the retry)');
  console.log('boot watchdog ok');
}

// The full-screen covers' drifting pattern: an inline SVG tile (no request), transform-only, still with reduced motion,
// only on the page cover / its failure card / «gira el mòbil» (never the small in-game wait card).
{
  const rule = /#loader\.page::before, #rotate::before \{([^}]*)\}/.exec(html)?.[1] ?? '';
  const tile = /url\("(data:image\/svg\+xml,[^"]*)"\)/.exec(rule)?.[1] ?? '';
  assert(tile && tile.length <= 1536, 'the tile is a small inline data URI');
  assert(/animation: boot-tiles 9s linear infinite/.test(rule) && /inset: -180px 0 0 -180px/.test(rule) && /180px 180px/.test(rule), 'one 180 px tile per cycle, a tile of overhang');
  assert(/@keyframes boot-tiles \{ to \{ transform: translate3d\(180px, 180px, 0\); \} \}/.test(html), 'moves ↘ by exactly one tile (seamless), compositor only');
  assert(/prefers-reduced-motion: reduce\) \{ #loader\.page::before, #rotate::before \{ animation: none; \} \}/.test(html), 'reduced motion: static');
  assert(!/#loader::before|\.loader-box::before/.test(html), 'not on the in-game wait card');
  console.log('cover pattern ok');
}
