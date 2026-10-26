// The woken app's update check (src/services/update-rules.js): reload only for a different, untried build, only when quiet.
import assert from 'node:assert/strict';
import { shouldReload, quietMoment } from '../../src/services/update-rules.js';
assert(shouldReload('1.2.1+abc1234', '1.2.0+def5678', null), 'a newer deploy reloads');
assert(!shouldReload('1.2.0+def5678', '1.2.0+def5678', null), 'the same build stays');
assert(!shouldReload('1.2.1+abc1234', '1.2.0+def5678', '1.2.1+abc1234'), 'a reload already tried for it: no loop on a stale CDN');
assert(!shouldReload(undefined, '1.2.0+def5678', null), 'no build in the file: nothing');
const doc = open => ({ querySelector: () => (open ? {} : null) });
assert(quietMoment('select', doc(false)) && quietMoment('splash', doc(false)), 'the menus with nothing open are quiet');
assert(!quietMoment('play', doc(false)) && !quietMoment('results', doc(false)), 'never mid-song or on the results');
assert(!quietMoment('select', doc(true)), 'never under a sheet or a typed field');
console.log('update check: newer builds only, once, on a quiet menu ok');
// index.html's boot check: the build vite.config.js writes into it, and the same one-try key as update.js
{
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../../index.html', import.meta.url), 'utf8'), update = readFileSync(new URL('../../src/services/update.js', import.meta.url), 'utf8');
  const vite = readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');
  const check = page.match(/<script id="build-check">([\s\S]*?)<\/script>/)?.[1] ?? '';
  assert(check.includes("var own = '__MULASSA_BUILD__';") && vite.includes(`html.replace("'__MULASSA_BUILD__'", JSON.stringify(build))`), 'the page carries its build (vite.config.js transformIndexHtml)');
  const key = update.match(/UPDATE_TRIED = '([^']+)'/)[1];
  assert(check.includes(`sessionStorage.getItem('${key}')`) && check.includes(`sessionStorage.setItem('${key}'`), 'the boot check and update.js share the one-try key');
  assert(page.indexOf('id="build-check"') < page.indexOf('type="module"'), 'it runs before the game\'s module');
  console.log('boot check: page build, shared key, before the game ok');
}
