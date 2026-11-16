// A kept Mulassa Pop run belongs to the account it went out under (ranking.js publish): on a shared device, a run kept by
// one account (offline then) is never sent under the next one; a run made with no name still goes under the first name.
import assert from 'node:assert/strict';
import { viteLoad } from './pop-ssr.mjs';

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
// the Supabase client as the test says: who is signed in, and whether the function answers
let uid = null, online = true, switchTo = null, tokenMissing = false;
const sentAs = [];
globalThis.__client = {
  auth: { getSession: async () => ({ data: { session: uid && { user: { id: uid }, access_token: tokenMissing ? null : `token-${uid}` } } }) },
  functions: { invoke: async (_, { body, headers }) => {
    // A switch after the caller's session read, before the SDK transport resolves its bearer token.
    if (switchTo) uid = switchTo;
    const session = (await globalThis.__client.auth.getSession()).data.session;
    const authorization = headers?.Authorization ?? `Bearer ${session?.access_token}`;
    const requestUid = authorization.replace('Bearer token-', '');
    return online ? (sentAs.push([requestUid, body]), { data: { score: body.points } }) : { error: {} };
  } },
};
const { load, close } = await viteLoad({ '../../../services/supabase-client.js': 'export const getClient = async () => globalThis.__client;' });
const { keep, pending, forget, publish } = await load('ranking.js');
const run = (seed, points) => ({ v: 6, seed, points });
const code = p => p.then(() => null, e => e.code);

{ // A's run, kept while offline, does not go under B
  forget(); sentAs.length = 0;
  uid = 'A'; online = false;
  keep(run(1, 90));
  assert.equal(await code(publish(run(1, 90))), 'unavailable');
  assert.equal(pending().owner, 'A', "kept as A's");
  uid = 'B'; online = true;
  assert.equal(await code(publish(pending())), 'owner', "B's session never sends A's run");
  assert.equal(sentAs.length, 0);
  keep(run(2, 30));
  await publish(run(2, 30));
  assert.deepEqual(sentAs, [['B', run(2, 30)]], "B's own run goes, without the owner field");
  assert.equal(pending().owner, 'B', "and takes the place of A's, which could never go here");
}
{ // a run with no name yet goes under the name made afterwards
  forget(); sentAs.length = 0;
  uid = null;
  keep(run(3, 50));
  assert.equal(await code(publish(run(3, 50))), 'noname');
  assert.equal(pending().owner, undefined, 'nobody owns it yet');
  uid = 'C';
  await publish(pending());
  assert.deepEqual(sentAs, [['C', run(3, 50)]]);
}
{ // the transport sees B, but the retained run was authorized with A's session
  forget(); sentAs.length = 0;
  uid = 'A'; switchTo = 'B';
  keep({ ...run(4, 70), owner: 'A' });
  await publish(pending());
  assert.equal(uid, 'B', 'the account switched before transport authentication');
  assert.deepEqual(sentAs, [['A', run(4, 70)]], "the request still authenticates as A");
  assert.equal(pending().owner, 'A');
  switchTo = null;
}
{ // an incomplete session cannot fall back to the transport's current account
  forget(); sentAs.length = 0;
  uid = 'A'; tokenMissing = true;
  keep(run(5, 80));
  assert.equal(await code(publish(pending())), 'noname');
  assert.equal(sentAs.length, 0);
  assert.equal(pending().owner, undefined);
  tokenMissing = false;
}
await close();
console.log('pop pending run: 4 scenarios passed (owner mismatch, first name, account-switch race, missing token)');
