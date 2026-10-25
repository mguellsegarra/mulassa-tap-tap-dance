// The tablet/phone split is read live: DevTools device mode flips the pointer and the screen size after load.
import assert from 'node:assert/strict';
const coarse = { matches: false };
globalThis.matchMedia = () => coarse;
globalThis.screen = { width: 1280, height: 800 };
globalThis.location = { search: '', hostname: 'localhost' };
globalThis.document = { hidden: false, hasFocus: () => true };
const { isTablet, deviceOrient } = await import('../../src/core/env.js');
assert.equal(isTablet(), false, 'a desktop is not a tablet');
coarse.matches = true; globalThis.screen = { width: 1376, height: 1032 };
assert.equal(isTablet(), true, 'emulation switched on after load: now a tablet');
assert.equal(deviceOrient(), 'landscape');
globalThis.screen = { width: 390, height: 844 };
assert.equal(deviceOrient(), 'portrait', 'a phone wants portrait');
console.log('orientation ok');
