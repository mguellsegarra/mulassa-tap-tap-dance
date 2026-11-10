// Mulassa Pop's boot (pop/index.html): its watchdog turns the boot screen into the error card when the module fails or
// throws before the home is up, or the home never comes, and never once it is up; the home's portraits are files.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../pop/index.html', import.meta.url), 'utf8');
// the games' shared watchdog (packages/plassa/src/boot-watchdog.js), inlined into the page by vite.config.js
const script = readFileSync(new URL('../../packages/plassa/src/boot-watchdog.js', import.meta.url), 'utf8');
assert.ok(html.indexOf('<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js"></script>') > 0, 'the page asks for the shared watchdog');
assert.ok(html.indexOf('id="boot-watchdog"') < html.indexOf('type="module"'), 'the watchdog runs before the module');

function page({ ready = false, clock = Date } = {}) {
  const listeners = {}, timers = [], classes = new Set(ready ? ['ready'] : []);
  const node = () => ({ textContent: '', onclick: null });
  const parts = { h2: node(), p: node(), button: node() };
  const boot = { className: 'cover', hidden: true, innerHTML: '', querySelector: sel => parts[sel] };
  const win = {
    Date: clock, setTimeout: f => timers.push(f), location: { reload() {}, origin: 'https://mulassa.cat' },
    addEventListener: (type, f) => { listeners[type] = f; },
    document: { hidden: false, documentElement: { classList: { contains: c => classes.has(c), remove: c => classes.delete(c) } },
      getElementById: id => (id === 'boot' ? boot : { innerHTML: '<div class="mula-load"></div>' }) },
  };
  win.window = win;
  vm.runInNewContext(script, win);
  return { win, boot, parts, listeners, timers, classes };
}

let p = page();
p.listeners.error({ target: { tagName: 'SCRIPT' } });
assert.equal(p.boot.className, 'cover fail', 'a module that fails to load: the card');
assert.equal(p.boot.hidden, false);
assert.equal(p.win.__mulassaBootFailure.reason, 'module-load');
assert.match(p.parts.h2.textContent, /Ups/, 'Catalan before the catalogue is in');
assert.match(p.boot.innerHTML, /mula-load sad/, 'the crying Mulassa');

p = page();
p.listeners.error({ target: { tagName: 'SCRIPT', src: 'https://static.cloudflareinsights.com/beacon.min.js' } });
assert.equal(p.boot.className, 'cover', 'another site\'s script failing (the host\'s analytics, an ad blocker) is no boot failure');
p.listeners.error({ target: { tagName: 'SCRIPT', src: 'https://mulassa.cat/assets/index-abc.js' } });
assert.equal(p.boot.className, 'cover fail', '…our own module failing is');

p = page();
p.win.__gameBootWords = { title: 'Oops', text: 'Reload', retry: 'Retry' };
p.listeners.unhandledrejection({});
assert.deepEqual([p.parts.h2.textContent, p.parts.button.textContent], ['Oops', 'Retry'], "the player's language once main.js has it");

p = page({ ready: true });
p.listeners.error({ target: null });
assert.equal(p.boot.className, 'cover', 'an error once the home is up is not a boot failure');

{ // 30 s on screen with no home: the card; time hidden does not count
  let t = 0;
  const q = page({ clock: { now: () => t } });
  const tick = (hidden = false) => { q.win.document.hidden = hidden; t += 1000; q.timers.shift()(); };
  for (let s = 0; s < 20; s++) tick(true);
  for (let s = 0; s < 29; s++) tick();
  assert.equal(q.boot.className, 'cover', '29 s on screen (and 20 hidden): still waiting');
  tick(); tick();
  assert.equal(q.boot.className, 'cover fail', 'past 30 s on screen: the card');
  assert.equal(q.win.__mulassaBootFailure.reason, 'deadline');
}

// the figures' portraits (help.js, the HUD's chip): one file each, no longer drawn on the player's device
const { KINDS } = await import('../../src/jocs/games/pop/help.js');
assert.equal(KINDS.length, 8, 'every figure');
for (const kind of KINDS) assert.ok(existsSync(new URL(`../../public/jocs/pop/cards/${kind}.png`, import.meta.url)), `${kind}.png`);
console.log('pop boot: the error card on a failed or stuck boot, not after it; portraits as files ok');

// the boot screen's first funny line, inlined by vite.config.js before the module: already there on the first paint
assert.ok(html.indexOf('id="boot-line"') < html.indexOf('<!-- boot-first-line -->') && html.indexOf('<!-- boot-first-line -->') < html.indexOf('type="module"'),
  'the first line is written right after its element, before the module');
{
  const first = readFileSync(new URL('../../packages/plassa/src/boot-first-line.js', import.meta.url), 'utf8');
  const T = { aliases: { ca: 'ca', en: 'en', 'en-gb': 'en' }, lines: { ca: ['a', 'b', 'c'], en: ['x', 'y'] } };
  const line = (search, store) => {
    const el = { textContent: '' };
    vm.runInNewContext(first.replace('__BOOT_LINES__', JSON.stringify(T)), {
      URLSearchParams, JSON, Math, String, location: { search }, document: { getElementById: () => el },
      localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    });
    return el.textContent;
  };
  assert.ok(T.lines.en.includes(line('?lang=en_GB', {})), '?lang= picks the language, by locale.js aliases');
  assert.ok(T.lines.en.includes(line('', { 'ui-language-v1': 'en' })), 'else the saved choice');
  assert.ok(T.lines.ca.includes(line('', { 'ui-language-v1': 'xx' })), 'else Catalan');
  const store = { 'loader-jokes-seen': JSON.stringify(['a', 'b']) };
  assert.equal(line('', store), 'c', 'a line not seen yet on this device');
  assert.notEqual(line('', store), 'c', 'all seen: starts over, never the last one again');
}
console.log('pop boot: the first line by language, unseen first ok');
