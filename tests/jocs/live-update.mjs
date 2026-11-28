// The app's live updates (plassa/native.js): a newer build on the site is downloaded file by file and handed back to switch
// to (never queued with next(): the plugin would apply it whenever the app is backgrounded, mid-run too); the same build, one
// already downloaded, or one the plugin rolled back once are never fetched again.
import test from 'node:test';
import assert from 'node:assert/strict';

const saved = new Map();
globalThis.localStorage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
let local = { build: 'A' }, site = { build: 'B', manifest: [{ file_name: 'jocs/a b.html', file_hash: 'h1' }] };
globalThis.fetch = async url => ({ json: async () => (url === '/version.json' ? local : site) });
const { checkLiveUpdate, applyLiveUpdate } = await import('../../packages/plassa/src/native.js');
const BASE = 'https://example.test';
const plugin = ({ bundles = [], failed = null } = {}) => {
  const calls = [];
  return { calls, list: async () => ({ bundles }), getFailedUpdate: async () => failed,
    download: async o => { calls.push(['download', o]); return { id: 'id-' + o.version }; },
    next: async () => calls.push(['next']), set: async o => { calls.push(['set', o.id]); } };
};

test('a newer build is downloaded file by file from the site and handed back, not queued', async () => {
  const p = plugin();
  assert.equal(await checkLiveUpdate(p, BASE), 'id-B');
  assert.deepEqual(p.calls, [['download', { url: `${BASE}/app-bundle.json`, version: 'B',
    manifest: [{ file_name: 'jocs/a b.html', file_hash: 'h1', download_url: `${BASE}/jocs/a%20b.html` }] }]]);
});

test('nothing when the app already runs it; no second download when an earlier busy check got it', async () => {
  local = { build: 'B' }; let p = plugin(); assert.equal(await checkLiveUpdate(p, BASE), null); assert.equal(p.calls.length, 0, 'same build');
  local = { build: 'A' }; p = plugin({ bundles: [{ id: 'old', version: 'B', status: 'success' }] });
  assert.equal(await checkLiveUpdate(p, BASE), 'old'); assert.equal(p.calls.length, 0, 'already downloaded');
  p = plugin({ bundles: [{ id: 'half', version: 'B', status: 'downloading' }] });
  assert.equal(await checkLiveUpdate(p, BASE), 'id-B', 'an unfinished download is not switched to');
});

test('a build rolled back once is never fetched again, even after the plugin forgets the failure', async () => {
  site = { build: 'C', manifest: [] };
  let p = plugin({ failed: { bundle: { version: 'C' } } }); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls.length, 0, 'the launch that reports the failure');
  p = plugin(); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls.length, 0, 'later launches: getFailedUpdate answers once only');
  site = { build: 'D', manifest: [] }; p = plugin(); await checkLiveUpdate(p, BASE);
  assert.equal(p.calls[0][1].version, 'D', 'a fixed build after it still comes in');
});

test('switching remembers the page, for index.html to go back to after the reload at the root', async () => {
  globalThis.location = { pathname: '/pop/index.html', search: '?x=1' };
  const p = plugin(); await applyLiveUpdate('id-D', p);
  assert.deepEqual(p.calls, [['set', 'id-D']]);
  assert.equal(saved.get('live-update-return'), '/pop/index.html?x=1');
});

test('a bundle the launcher could not switch to yet (pending) is reused, not downloaded again', async () => {
  local = { build: 'A' }; site = { build: 'E', manifest: [] };
  const p = plugin({ bundles: [{ id: 'waiting', version: 'E', status: 'pending' }] });
  assert.equal(await checkLiveUpdate(p, BASE), 'waiting');
  assert.equal(p.calls.length, 0);
});

test('only forwards: an older site build never replaces a newer app, unless either predates seq', async () => {
  local = { build: 'A', seq: 200 }; site = { build: 'F', seq: 100, manifest: [] };
  let p = plugin(); assert.equal(await checkLiveUpdate(p, BASE), null); assert.equal(p.calls.length, 0, 'older');
  site = { build: 'F', seq: 300, manifest: [] }; p = plugin(); assert.equal(await checkLiveUpdate(p, BASE), 'id-F', 'newer');
  site = { build: 'G', manifest: [] }; p = plugin(); assert.equal(await checkLiveUpdate(p, BASE), 'id-G', 'a site from before seq');
  local = { build: 'A' };
});

test('a rollback reported while offline is still remembered', async () => {
  const online = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(checkLiveUpdate(plugin({ failed: { bundle: { version: 'H' } } }), BASE));
  globalThis.fetch = online;
  site = { build: 'H', manifest: [] }; const p = plugin(); assert.equal(await checkLiveUpdate(p, BASE), null);
  assert.equal(p.calls.length, 0);
});

test('the resting page switches only with the launcher\'s yes, by set() itself, and frees the launcher on a failure', async () => {
  const { restCheck } = await import('../../packages/plassa/src/live-rest.js');
  const shell = ok => { const calls = []; return { calls, rested: async () => calls.push('rested'), mayUpdate: async o => { calls.push(['may', o]); return { ok }; } }; };
  saved.delete('live-update-return');
  let s = shell(true), p = plugin(); await restCheck(s, p, async () => 'id-R');
  assert.deepEqual(s.calls, ['rested', ['may', { id: 'id-R' }]], 'the launcher gets the id to check its catalogue');
  assert.deepEqual(p.calls, [['set', 'id-R']]);
  assert.equal(saved.has('live-update-return'), false, 'no return path: a failed switch must not send the next game here');
  s = shell(false); p = plugin(); await restCheck(s, p, async () => 'id-R');
  assert.equal(p.calls.length, 0, 'refused: no switch');
  s = shell(true); p = { set: async () => { throw new Error('no'); } }; await restCheck(s, p, async () => 'id-R');
  assert.equal(s.calls.at(-1), 'rested', 'a failed set() lets the launcher go');
  let base; s = shell(false); s.liveServer = async () => ({ url: 'http://lan:3791' }); await restCheck(s, plugin(), async (u, b) => { base = b; });
  assert.equal(base, 'http://lan:3791', 'a debug build follows the site typed in the launcher');
  s = shell(false); s.liveServer = async () => ({ url: '' }); await restCheck(s, plugin(), async (u, ...b) => { base = b; });
  assert.deepEqual(base, [undefined], 'none typed: the build\'s own site');
});
