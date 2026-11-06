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
    Date: clock, setTimeout: f => timers.push(f), location: { reload() {} },
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

// the home's portraits: one file per card, no longer drawn on the player's device
const kinds = [...html.matchAll(/class="c-card"[^>]*data-kind="(\w+)"[^>]*><div class="c-por"><img alt="" src="\/jocs\/pop\/cards\/(\w+)\.png">/g)];
assert.equal(kinds.length, 8, 'every card has its portrait file');
for (const [, kind, file] of kinds) {
  assert.equal(kind, file);
  assert.ok(existsSync(new URL(`../../public/jocs/pop/cards/${file}.png`, import.meta.url)), `${file}.png`);
}
console.log('pop boot: the error card on a failed or stuck boot, not after it; portraits as files ok');
