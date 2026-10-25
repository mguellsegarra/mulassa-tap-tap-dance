import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import config from '../../vite.config.js';
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
assert.equal(JSON.parse(config.define.__APP_VERSION__), pkg.version, 'runtime uses the complete release version');
assert(JSON.parse(config.define.__APP_BUILD__).startsWith(pkg.version + '+'));
import { APP_VERSION, APP_BUILD } from '../../src/core/version.js';
// no define here (plain node): the fallbacks
assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
assert.match(APP_BUILD, /^\d+\.\d+\.\d+\+\w+$/);
assert.ok(APP_BUILD.startsWith(APP_VERSION));
console.log('version ok');
