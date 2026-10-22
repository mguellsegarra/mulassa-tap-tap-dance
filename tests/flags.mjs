// The URL's debug flags exist only on dev hosts (src/core/flags.js): on a public host every ?param is invisible.
import assert from 'node:assert/strict';
import { devSearch, DEV_HOST } from '../src/core/flags.js';

const at = (hostname, search) => devSearch({ hostname, search });
for (const h of ['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.5', 'mac.local']) assert.equal(at(h, '?mute&autoplay'), '?mute&autoplay', `${h}: flags on`);
for (const h of ['mulassa.cat', 'www.mulassa.cat', 'mulassa-tap-tap-dance.pages.dev', 'abc123.mulassa-tap-tap-dance.pages.dev'])
  for (const s of ['?mute', '?autoplay', '?from=40', '?stars=3', '?perf', '?final', '?mock', '?demo', '?offset=80', '?cam'])
    assert.equal(at(h, s), '', `${h}${s}: ignored on a public host`);
assert.equal(devSearch(undefined), '', 'no location: no flags');
assert.ok(DEV_HOST.test('localhost') && !DEV_HOST.test('mulassa.cat'));
console.log('flags ok');
