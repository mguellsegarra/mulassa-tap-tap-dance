import assert from 'node:assert/strict';
import { APP_VERSION, APP_BUILD } from '../src/core/version.js';
// no define here (plain node): the fallbacks
assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
assert.match(APP_BUILD, /^\d+\.\d+\.\d+\+\w+$/);
assert.ok(APP_BUILD.startsWith(APP_VERSION));
console.log('version ok');
