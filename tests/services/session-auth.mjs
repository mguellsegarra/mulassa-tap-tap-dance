// The session adapter (src/services/session-auth.js) is the only web code that touches supabase-js `auth`: the app's native
// shell will own the session and answer these calls instead (docs/app/native-shell.md, contract 1), and a client in
// `accessToken` mode throws on any `auth` access. Each call must stay exactly what supabase-js was asked before.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sessionAuth } from '../../src/services/session-auth.js';

// 1. Nothing else in the web code reaches into `auth` (a new caller would break the app's sign-in and its board reads)
const root = new URL('../../', import.meta.url).pathname;
const files = dir => readdirSync(join(root, dir), { recursive: true }).filter(f => /\.js$/.test(f)).map(f => join(dir, f));
const offenders = [...files('src'), ...files('packages/plassa/src')]
  .filter(f => !f.endsWith('services/session-auth.js'))
  .filter(f => /\.auth\??\.\w/.test(readFileSync(join(root, f), 'utf8')));
assert.deepEqual(offenders, [], 'supabase.auth is only touched in services/session-auth.js');

// 2. Each method asks supabase-js exactly what the callers asked before the adapter
const calls = [];
const record = name => (...args) => { calls.push([name, ...args]); return { data: name, error: null }; };
const auth = Object.fromEntries(['getSession', 'onAuthStateChange', 'signInAnonymously', 'signOut', 'updateUser', 'signInWithOtp', 'verifyOtp', 'getUser'].map(n => [n, record(n)]));
const s = sessionAuth({ auth });
assert.deepEqual(s.current(), { data: 'getSession', error: null }, 'the result comes back as supabase-js gives it');
const listener = () => {};
assert.equal(s.watch(listener), true);
s.signInAnonymously('tok');
s.signOut();
s.changeEmail('a@b.cat');
s.sendSignInCode('a@b.cat', 'tok');
s.verifyCode('a@b.cat', '123456', 'email_change');
s.userOf('jwt');
assert.deepEqual(calls, [
  ['getSession'],
  ['onAuthStateChange', listener],
  ['signInAnonymously', { options: { captchaToken: 'tok' } }],
  ['signOut', { scope: 'local' }], // this device only: the profile and other devices stay signed in
  ['updateUser', { email: 'a@b.cat' }],
  ['signInWithOtp', { email: 'a@b.cat', options: { shouldCreateUser: false, captchaToken: 'tok' } }], // a code never creates an account
  ['verifyOtp', { email: 'a@b.cat', token: '123456', type: 'email_change' }],
  ['getUser', 'jwt'],
]);
assert.equal(sessionAuth({}).watch(listener), false, 'a client that cannot tell is asked again next time');
console.log('session adapter: the only door to supabase auth, same calls as before ok');
