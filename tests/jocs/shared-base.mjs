// Every mini-game stands on Plassa, packages/plassa/src/ (docs/jocs/README.md, «Shared base»): its page links the base before its own
// CSS and gets the shared watchdog and boot art; its CSS never redefines a base selector; its main.js wires the base's keyboard,
// UI sound, page life and backdrop. The copies of mulassa.cat's modules stay in step until the main game moves onto Plassa.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = p => readFileSync(join(root, p), 'utf8');
const games = readdirSync(join(root, 'src/jocs/games'));
assert(games.length > 0, 'no games found');
const pageOf = id => (id === 'pop' ? 'pop/index.html' : `jocs/${id}/index.html`);

// the selectors a CSS file defines (comments, at-rule preludes, keyframe steps and font faces left out)
function selectors(css) {
  const out = new Set();
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{};]+)\{/g)) {
    const head = m[1].trim();
    if (!head || head.startsWith('@')) continue;
    for (const s of head.split(',').map(x => x.trim().replace(/\s+/g, ' '))) if (s && !/^(from|to|[\d.]+%)$/.test(s)) out.add(s);
  }
  return out;
}
const base = new Set([...selectors(read('packages/plassa/src/base.css')), ...selectors(read('packages/plassa/src/game.css'))]);
base.delete(':root'); // a game's tokens

for (const id of games) {
  const page = read(pageOf(id));
  const links = [...page.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
  const at = href => links.indexOf(href);
  assert(at('/packages/plassa/src/base.css') === 0 && at('/packages/plassa/src/game.css') === 1, `${pageOf(id)}: links base.css then game.css first (got ${links.join(', ')})`);
  assert(page.includes('<script id="boot-watchdog" src="/packages/plassa/src/boot-watchdog.js"></script>'), `${pageOf(id)}: the shared boot watchdog`);
  assert(page.indexOf('id="boot-watchdog"') < page.indexOf('type="module"'), `${pageOf(id)}: the watchdog before the module`);
  assert(page.includes('<!-- mula-load -->'), `${pageOf(id)}: the boot art comes from mula-load.html`);

  const dir = `src/jocs/games/${id}`;
  for (const f of readdirSync(join(root, dir)).filter(f => f.endsWith('.css'))) {
    const again = [...selectors(read(`${dir}/${f}`))].filter(s => base.has(s));
    assert.deepEqual(again, [], `${dir}/${f} redefines base selectors: set a token or add the rule to the base`);
  }
  const main = read(`${dir}/main.js`);
  for (const name of ['setUiSound', 'soundOnPress', 'setupSheetKeys', 'onPageLeave', 'closeOnBackdrop', 'onEveryGesture'])
    assert(new RegExp(`\\b${name}\\(`).test(main), `${dir}/main.js: wire ${name} from packages/plassa/src/`);
  assert(main.includes("import '#plassa/focus.js'"), `${dir}/main.js: import '#plassa/focus.js' (keyboard vs pointer)`);
}

// the boot art is the main game's (src/ui/loader.js) until mulassa.cat uses Plassa's
const art = read('src/ui/loader.js').match(/export const MULASSA_SVG = '([^']+)'/)[1];
assert.equal(read('packages/plassa/src/mula-load.html').trim(), art, 'mula-load.html drifted from src/ui/loader.js MULASSA_SVG');
// the exact copies of mulassa.cat's modules: the same code, imports and comments aside
const body = src => src.split('\n').filter(l => !/^\s*(import\b|\/\/)/.test(l)).join('\n');
const COPIES = { storage: 'platform', haptics: 'platform', boot: 'platform', 'double-tap': 'platform', 'render-quality': 'platform',
  errors: 'services', 'sentry-load': 'services', 'update-watch': 'services', 'update-rules': 'services', locale: 'i18n', focus: 'ui', 'badge-tip': 'ui' };
for (const [name, from] of Object.entries(COPIES)) {
  assert(existsSync(join(root, `src/${from}/${name}.js`)), `src/${from}/${name}.js is gone: drop it from COPIES once mulassa.cat uses Plassa's`);
  assert.equal(body(read(`packages/plassa/src/${name}.js`)), body(read(`src/${from}/${name}.js`)), `packages/plassa/src/${name}.js drifted from src/${from}/${name}.js: change both`);
}
console.log(`shared base: ${games.length} game(s) on Plassa, no base selector redefined, the copies of mulassa.cat in step ok`);
