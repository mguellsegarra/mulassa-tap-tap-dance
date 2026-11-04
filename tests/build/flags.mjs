// The URL's debug flags exist only on dev hosts (src/core/flags.js): on a public host only the PUBLIC_FLAGS pass.
import assert from 'node:assert/strict';
import { devSearch, DEV_HOST } from '../../src/core/flags.js';

const at = (hostname, search) => devSearch({ hostname, search });
for (const h of ['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.5', 'mac.local']) assert.equal(at(h, '?mute&autoplay'), '?mute&autoplay', `${h}: flags on`);
for (const h of ['mulassa.cat', 'www.mulassa.cat', 'mulassa-tap-tap-dance.pages.dev', 'abc123.mulassa-tap-tap-dance.pages.dev'])
  for (const s of ['?mute', '?autoplay', '?from=40', '?stars=3', '?final', '?mock', '?demo', '?offset=80', '?cam', '?jitter=70'])
    assert.equal(at(h, s), '', `${h}${s}: ignored on a public host`);
// Diagnostics that change no score, and figure deep links, pass on public hosts; anything mixed in is still dropped.
const pub = new URLSearchParams(at('mulassa.cat', '?perf=sync&hide=crowd&autoplay&vp&from=40&figura=drac&stars=3'));
assert.deepEqual([...pub], [['perf', 'sync'], ['hide', 'crowd'], ['vp', ''], ['figura', 'drac']], 'public flags only');
assert.equal(devSearch(undefined), '', 'no location: no flags');
assert.ok(DEV_HOST.test('localhost') && !DEV_HOST.test('mulassa.cat'));
console.log('flags ok');
