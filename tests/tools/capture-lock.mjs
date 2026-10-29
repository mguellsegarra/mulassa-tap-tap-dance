// The real-GPU lock (tools/qa/capture-lib.mjs): one Chrome on Metal on the machine at a time. Reentrant for its holder,
// another process queues until it is released; a dead holder's lock is taken.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'capture-lock-')), CAPTURE_LOCK = join(dir, 'lock'), env = { ...process.env, CAPTURE_LOCK };
const lib = JSON.stringify(new URL('../../tools/qa/capture-lib.mjs', import.meta.url).href);
// a process that takes the lock twice, says so, and keeps it until told
const taker = () => {
  const p = spawn(process.execPath, ['--input-type=module', '-e', `const { lock } = await import(${lib}); await lock(); await lock();
    console.log('held'); process.stdin.on('data', () => process.exit(0));`], { env, stdio: ['pipe', 'pipe', 'inherit'] });
  p.held = new Promise(r => p.stdout.on('data', d => /held/.test(d) && r(true)));
  p.exited = new Promise(r => p.on('exit', r));
  return p;
};
const within = (promise, ms) => Promise.race([promise, new Promise(r => setTimeout(() => r(false), ms))]);

const a = taker();
assert.equal(await within(a.held, 10000), true, 'reentrant: its holder takes it again at once');
const b = taker();
assert.equal(await within(b.held, 2500), false, 'held by another live process: the next one queues');
a.stdin.write('x'); await a.exited;
assert.equal(await within(b.held, 5000), true, 'released when its holder exits: the queued one gets it');
b.stdin.write('x'); await b.exited;
assert(!existsSync(CAPTURE_LOCK), 'and released again');
mkdirSync(CAPTURE_LOCK); writeFileSync(join(CAPTURE_LOCK, 'pid'), '999999');
const c = taker();
assert.equal(await within(c.held, 5000), true, 'a dead holder\'s lock is taken'); c.stdin.write('x'); await c.exited;
rmSync(dir, { recursive: true, force: true });
console.log('capture lock ok');
