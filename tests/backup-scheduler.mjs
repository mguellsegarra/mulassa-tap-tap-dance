import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { dispatchBackup, CRON } from '../workers/backup-scheduler/src/index.js';

const token = 'synthetic_credential_' + 'x'.repeat(40);
const env = { SCHEDULER_ENABLED: 'true', GITHUB_ACTIONS_TOKEN: token };
const event = { cron: CRON };
const noNetwork = () => { throw new Error('Unexpected network call'); };
const disabled = { get GITHUB_ACTIONS_TOKEN() { throw new Error('Disabled worker read a secret'); } };
assert.equal(await dispatchBackup(event, disabled, noNetwork), 'DISABLED');
assert.equal(await dispatchBackup(event, Object.create(disabled, { SCHEDULER_ENABLED: { value: 'false' } }), noNetwork), 'DISABLED');
for (const invalid of ['', 'TRUE', '1']) {
  await assert.rejects(dispatchBackup(event, { SCHEDULER_ENABLED: invalid }, noNetwork),
    /^Error: BACKUP_DISPATCH_CONFIG$/);
}
await assert.rejects(dispatchBackup({ cron: '* * * * *' }, env, noNetwork), /BACKUP_DISPATCH_CONFIG/);
for (const bad of [undefined, '', 'short', token + '\r\nInjected: value']) {
  await assert.rejects(dispatchBackup(event, { ...env, GITHUB_ACTIONS_TOKEN: bad }, noNetwork),
    /^Error: BACKUP_DISPATCH_CONFIG$/);
}

for (const status of [200, 204]) {
  let calls = 0;
  let cancelled = false;
  const result = await dispatchBackup(event, env, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.github.com/repos/mguellsegarra/mulassa-tap-tap-dance/actions/workflows/db-backup.yml/dispatches');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'manual');
    assert.deepEqual(JSON.parse(init.body), { ref: 'main' });
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    assert.equal(init.headers['X-GitHub-Api-Version'], '2026-03-10');
    assert(init.signal instanceof AbortSignal);
    assert(!init.signal.aborted);
    return { status, body: status === 200 ? {
      cancel() { cancelled = true; },
      getReader() { throw new Error('Response contents must not be inspected'); },
    } : null };
  });
  assert.equal(result, 'DISPATCH_ACCEPTED');
  assert.equal(calls, 1);
  assert.equal(cancelled, status === 200);
}

for (const status of [301, 302, 401, 403, 404, 422, 429, 500, 503]) {
  let calls = 0;
  await assert.rejects(dispatchBackup(event, env, async () => {
    calls++;
    return { status, body: { cancel() {} }, text() { throw new Error(token); } };
  }), /^Error: BACKUP_DISPATCH_FAILED$/);
  assert.equal(calls, 1, 'do not retry an uncertain dispatch or follow redirects');
}
for (const failure of [new Error(token), new DOMException(token, 'TimeoutError')]) {
  await assert.rejects(dispatchBackup(event, env, async () => { throw failure; }),
    /^Error: BACKUP_DISPATCH_FAILED$/);
}

const realFetch = globalThis.fetch;
const realLog = console.log;
const logs = [];
try {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  console.log = value => logs.push(value);
  await worker.scheduled(event, env);
  await worker.scheduled(event, { SCHEDULER_ENABLED: 'false' });
  assert.deepEqual(logs, ['DISPATCH_ACCEPTED', 'DISABLED']);
  assert.equal((await worker.fetch(new Request('https://example.invalid/trigger'), env)).status, 404);
} finally {
  globalThis.fetch = realFetch;
  console.log = realLog;
}
const config = await readFile(new URL('../workers/backup-scheduler/wrangler.toml', import.meta.url), 'utf8');
assert.match(config, /^workers_dev = false$/m);
assert.match(config, /^preview_urls = false$/m);
assert.match(config, /^SCHEDULER_ENABLED = "false"$/m);
assert.match(config, /^crons = \[\]$/m);
assert(!/^GITHUB_ACTIONS_TOKEN\s*=/m.test(config));
console.log('backup scheduler: fixed target, disabled mode, safe failures and dispatch contracts ok');
