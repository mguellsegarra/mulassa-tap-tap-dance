// The app's live updates (plassa/native.js): a newer build on the site is downloaded with its checksum and queued for the
// next launch; the same build, the one already queued, or one the plugin rolled back once are never fetched again.
import test from 'node:test';
import assert from 'node:assert/strict';

const saved = new Map();
globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
let local = { build: 'A' }, site = { build: 'B', checksum: 'abc' };
globalThis.fetch = async url => ({ json: async () => (url === '/version.json' ? local : site) });
const { checkLiveUpdate } = await import('../../packages/plassa/src/native.js');
const BASE = 'https://example.test/app';
const plugin = ({ next = null, failed = null } = {}) => {
  const calls = [];
  return { calls, getNextBundle: async () => next, getFailedUpdate: async () => failed,
    download: async o => { calls.push(['download', o]); return { id: 'id-' + o.version }; }, next: async o => { calls.push(['next', o.id]); } };
};

test('a newer build is downloaded with its checksum and queued for the next launch', async () => {
  const p = plugin();
  await checkLiveUpdate(p, BASE);
  assert.deepEqual(p.calls, [['download', { url: `${BASE}/bundle.zip`, version: 'B', checksum: 'abc' }], ['next', 'id-B']]);
});

test('nothing when the app already runs it or has it queued', async () => {
  local = { build: 'B' }; let p = plugin(); await checkLiveUpdate(p, BASE); assert.equal(p.calls.length, 0, 'same build');
  local = { build: 'A' }; p = plugin({ next: { version: 'B' } }); await checkLiveUpdate(p, BASE); assert.equal(p.calls.length, 0, 'already queued');
});

test('a build rolled back once is never fetched again, even after the plugin forgets the failure', async () => {
  site = { build: 'C', checksum: 'bad' };
  let p = plugin({ failed: { bundle: { version: 'C' } } }); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls.length, 0, 'the launch that reports the failure');
  p = plugin(); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls.length, 0, 'later launches: getFailedUpdate answers once only');
  site = { build: 'D', checksum: 'ok' }; p = plugin(); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls[0][1].version, 'D', 'a fixed build after it still comes in');
});
