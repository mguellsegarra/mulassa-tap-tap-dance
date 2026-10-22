// src/services/stats-sync.js: who owns this device's statistics, when they leave it, and that deleting a profile takes them along.
// The server side is the mock (src/dev/mock-leaderboard.js), which enforces merge_stats' rules (docs/rankings-strategy.md §7).
import assert from 'node:assert/strict';
import { createLeaderboardService } from '../src/services/leaderboard.js';
import { createStatsSync, statsNoticeSeen, markStatsNoticeSeen } from '../src/services/stats-sync.js';
import { mockLeaderboard } from '../src/dev/final-test.js';
import { newStats, endRun, getStatsOwner, setStatsOwner, payload } from '../src/game/stats.js';

const kv = new Map(), mem = { get: k => kv.get(k) ?? null, set: (k, v) => kv.set(k, v), remove: k => kv.delete(k) };
let doc = newStats();
const io = { load: () => doc, save: s => { doc = s; } };
let t = Date.parse('2026-11-10T10:00:00Z'), queue = [];
const now = () => t, timer = (f, ms) => { const h = { f, ms, at: t + ms }; queue.push(h); return h; }, clear = h => { queue = queue.filter(x => x !== h); };
// runs what is due at the fake clock; the rest stays queued
const fire = async (advance = 0) => { t += advance; const due = queue.filter(h => h.at <= t); queue = queue.filter(h => h.at > t); for (const h of due) await h.f(); await new Promise(r => setTimeout(r, 5)); };
const run = (over = {}) => ({ kind: 'end', date: '2026-11-10', figureId: 'mulassa-valls', version: 'mulassa-v3', level: 1, seconds: 80, counts: { perfect: 100, good: 20, miss: 13 }, errors: { early: 6, silent: 7 },
  guapa: 5, guapaTotal: 8, balloons: 1, holds: 2, maxCombo: 60, stars: 2, score: 60000, quality: 90, ...over });
const calls = [], svc = mockLeaderboard({ delay: 0, account: 'guest', now, calls });
const sent = () => calls.filter(c => c === 'merge_stats').length;
const sync = createStatsSync({ service: svc, kv: mem, io, now, timer, clear });

// played before any profile: it goes to the profile that is opened, once
endRun(doc, 'none', run());
assert.equal(sync.owner, null);
await sync.init();
assert.equal(sync.owner, 'prova'); assert.equal(getStatsOwner(), 'prova', 'the game now counts for the profile');
assert(!doc.owners.none && doc.owners.prova.counters['mulassa-valls/mulassa-v3/1'].runs === 1, 'what was played without a profile joins it');
endRun(doc, 'none', run({ date: '2026-11-11' }));
await sync.init(); assert(!doc.owners.none, 'a second opening takes what was played since');

// nothing leaves the device before the privacy notice has been seen
assert.equal(sync.noticeNeeded(), true); assert.equal(statsNoticeSeen('prova', mem), false);
sync.afterRun(); await fire(2000); assert.equal(sent(), 0, 'no upload before the notice');
sync.acceptNotice(); assert(statsNoticeSeen('prova', mem)); assert.equal(sync.noticeNeeded(), false);
await fire(2000); assert.equal(sent(), 1, 'the notice seen: what was waiting goes');
assert(doc.owners.prova.sent && doc.owners.prova.imported, 'remembered, so an unchanged document is not sent again');
const mine = await svc.myStats();
assert(mine.buckets['mulassa-valls/mulassa-v3/1'].runs >= 2 && mine.buckets.practice, 'the server sums this device with the others');

// unchanged: nothing; a new run: waits out the server's minute, then goes
sync.afterRun(); await fire(2000); assert.equal(sent(), 1, 'unchanged: not sent again');
endRun(doc, 'prova', run({ date: '2026-11-11', score: 61000 })); t += 5000;
sync.afterRun(); assert.equal(queue.length, 1); assert(queue[0].ms >= 55000 && queue[0].ms <= 61000, `waits for the minute (${queue[0].ms})`);
sync.afterRun(); assert.equal(queue.length, 1, 'one request at a time');
await fire(); assert.equal(sent(), 1, 'too early: the timer is for later');
await fire(61000); assert.equal(sent(), 2);

// a refusal is silent and the next run tries again (the server was told twice inside a minute)
endRun(doc, 'prova', run({ date: '2026-11-11', score: 62000 })); t += 2000;
assert.equal(await sync.send(), 'rate_limit', 'the server allows one a minute'); t += 61000; assert.equal(await sync.send(), 'sent');

// never during play
let playing = true; sync.holdWhile(() => playing);
endRun(doc, 'prova', run({ date: '2026-11-11' })); t += 61000; const before = sent();
sync.afterRun(); await fire(2000); assert.equal(sent(), before, 'a song is on'); assert.equal(queue.length, 1, 'it asks again a little later');
playing = false; await fire(4000); assert.equal(sent(), before + 1);

// what stats.js hands over is what the mock server accepts (it mirrors merge_bucket): practice as its own bucket, a best with its counts
{ const s = newStats(); endRun(s, 'x', run()); endRun(s, 'x', run({ kind: 'practice', seconds: 40 }));
  const p = payload(s, 'x');
  assert.deepEqual(p.buckets.practice, { runs: 1, seconds: 40 }); assert.deepEqual(p.buckets['mulassa-valls/mulassa-v3/1'].best, { score: 60000, perfect: 100, good: 20, miss: 13, maxCombo: 60 });
  assert.deepEqual(await mockLeaderboard({ delay: 0, account: 'verified', now }).syncStats({ ...p, owner: 'prova' }), { synced: true });
  const probe = mockLeaderboard({ delay: 0, account: 'verified', now });
  await assert.rejects(probe.syncStats({ ...p, owner: 'prova', buckets: { ...p.buckets, 'mulassa-valls/mulassa-v3/1': { ...p.buckets['mulassa-valls/mulassa-v3/1'], seconds: 99999 } } }), { code: 'stats' }, 'more time than runs can last');
  await assert.rejects(mockLeaderboard({ delay: 0, account: 'verified', now }).syncStats({ ...p, owner: 'prova', buckets: { 'mulassa-valls/nope/1': p.buckets.practice } }), { code: 'stats' }, 'unknown bucket'); }

// a deleted profile takes its statistics, the notice and the owner with it; later play starts again from nothing
setStatsOwner('prova'); endRun(doc, 'none', run({ date: '2026-11-11' }));
await svc.deleteProfile();
assert.equal(doc.owners.prova, undefined, 'forgotten'); assert.equal(statsNoticeSeen('prova', mem), false); assert.equal(sync.owner, null); assert.equal(getStatsOwner(), 'none');
assert(doc.owners.none, 'what was played without a profile stays under none');
await svc.createProfile('Novell'); await new Promise(r => setTimeout(r, 100)); // the account event also asks the mock server whether the profile exists
assert.equal(sync.owner, 'prova'); assert.equal(Object.keys(doc.owners.prova.counters).length, 1, 'a new profile starts from zero plus what was played unowned');
assert.equal(sync.noticeNeeded(), true, 'a new profile shows the notice again');

// the server says the profile is gone: forgotten; the account vanished: forgotten through the service event
{ let fail = 'gone'; const listeners = new Set();
  const stub = { ownerId: async () => 'u-1', profile: async () => ({}), onAccount: f => { listeners.add(f); return () => listeners.delete(f); },
    syncStats: async () => { throw Object.assign(new Error('x'), { code: fail }); } };
  let d2 = newStats(); endRun(d2, 'u-1', run());
  const s2 = createStatsSync({ service: stub, kv: mem, io: { load: () => d2, save: s => { d2 = s; } }, now, timer, clear });
  markStatsNoticeSeen('u-1', mem); await s2.init();
  assert.equal(await s2.send(), 'gone'); assert.equal(d2.owners['u-1'], undefined);
  endRun(d2, 'u-2', run()); [...listeners].forEach(f => f({ type: 'gone', userId: 'u-2' })); assert.equal(d2.owners['u-2'], undefined);
  assert(!(await createStatsSync({ service: { ...stub, ownerId: async () => null, onAccount: () => () => {} }, kv: mem, io, now, timer, clear }).init()), 'no session: no owner, no network');
  assert.equal(getStatsOwner(), 'none'); }
// another tab switches the account A -> B: A's counters never upload as B, and the new owner is picked up by itself
{ let session = { user: { id: 'A' } }, onAuth, merges = [];
  const client = { auth: { getSession: async () => ({ data: { session }, error: null }), onAuthStateChange: f => { onAuth = f; return { data: { subscription: { unsubscribe() {} } } }; } },
    rpc: async (name, args) => { if (name === 'my_profile') return { data: [{ alias: 'Jo' }], error: null }; if (name === 'merge_stats') merges.push({ as: session.user.id, buckets: Object.keys(args.p_buckets) }); return { data: null, error: null }; } };
  const real = createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => client });
  let d3 = newStats(); endRun(d3, 'A', run()); endRun(d3, 'B', run({ figureId: 'drac-valls', version: 'drac-v1' }));
  const kv3 = new Map(), mem3 = { get: k => kv3.get(k) ?? null, set: (k, v) => kv3.set(k, v), remove: k => kv3.delete(k) };
  markStatsNoticeSeen('A', mem3); markStatsNoticeSeen('B', mem3);
  const s3 = createStatsSync({ service: real, kv: mem3, io: { load: () => d3, save: s => { d3 = s; } }, now, timer, clear });
  await s3.init(); assert.equal(s3.owner, 'A'); assert(onAuth, 'the service watches Supabase Auth once its client exists');
  session = { user: { id: 'B' } }; // the other tab; this one has not heard yet
  assert.equal(await s3.send(), 'session', 'the session is not the owner of the counters'); assert.deepEqual(merges, [], 'nothing was sent');
  assert.equal(d3.owners.A.sent, undefined, 'and A is not marked as synced'); assert.equal(s3.owner, 'B', 'the right owner is adopted again');
  t += 61000; assert.equal(await s3.send(), 'sent'); assert.deepEqual(merges, [{ as: 'B', buckets: ['drac-valls/drac-v1/1'] }]);
  // and when told: back to A without any call of ours
  session = { user: { id: 'A' } }; onAuth('SIGNED_IN', session); onAuth('TOKEN_REFRESHED', session); await new Promise(r => setTimeout(r, 20));
  assert.equal(s3.owner, 'A'); assert.equal(getStatsOwner(), 'A');
  t += 61000; assert.equal(await s3.send(), 'sent'); assert.equal(merges.at(-1).as, 'A'); }

// one invalid bucket never blocks the rest: tried alone, the refused one is left out (untouched here), the others go
{ const calls3 = [], badKey = 'drac-valls/drac-v1/1';
  const stub = { ownerId: async () => 'u-3', profile: async () => ({}), onAccount: () => () => {},
    syncStats: async p => { calls3.push(Object.keys(p.buckets)); if (badKey in p.buckets) throw Object.assign(new Error('x'), { code: 'stats' }); } };
  let d4 = newStats(); endRun(d4, 'u-3', run()); endRun(d4, 'u-3', run({ figureId: 'drac-valls', version: 'drac-v1' })); endRun(d4, 'u-3', run({ kind: 'practice', seconds: 20 }));
  markStatsNoticeSeen('u-3', mem);
  const s4 = createStatsSync({ service: stub, kv: mem, io: { load: () => d4, save: s => { d4 = s; } }, now, timer, clear });
  await s4.init(); s4.cancel(); queue = [];
  assert.equal(await s4.send(), 'partial');
  assert.deepEqual(calls3, [['drac-valls/drac-v1/1', 'mulassa-valls/mulassa-v3/1', 'practice'], ['drac-valls/drac-v1/1'], ['mulassa-valls/mulassa-v3/1']], 'whole, then one by one until one is accepted');
  assert.equal(queue.length, 1, 'the rest follows in the normal flow'); s4.cancel();
  assert.equal(await s4.send(), 'sent'); assert.deepEqual(calls3.at(-1), ['mulassa-valls/mulassa-v3/1', 'practice'], 'the refused bucket stays out');
  assert.equal(d4.owners['u-3'].counters[badKey].runs, 1, 'its counters are not changed or dropped locally'); }

// several attempts, a minute apart (an accepted call uses the minute up, a refused one does not): a valid Drac, a refused Mulassa, a valid
// practice and the days all get through, and the bad bucket is found though the valid one before it keeps being accepted
{ const calls5 = [], bad = 'mulassa-valls/mulassa-v3/1'; let last = -Infinity;
  const stub = { ownerId: async () => 'u-5', profile: async () => ({}), onAccount: () => () => {},
    syncStats: async p => {
      calls5.push({ buckets: Object.keys(p.buckets), days: p.days.length });
      if (t - last < 60000) throw Object.assign(new Error('x'), { code: 'rate_limit' });
      if (bad in p.buckets) throw Object.assign(new Error('x'), { code: 'stats' });
      last = t;
    } };
  let d5 = newStats(); endRun(d5, 'u-5', run()); endRun(d5, 'u-5', run({ figureId: 'drac-valls', version: 'drac-v1' })); endRun(d5, 'u-5', run({ kind: 'practice', seconds: 20 }));
  markStatsNoticeSeen('u-5', mem); t += 61000;
  const s5 = createStatsSync({ service: stub, kv: mem, io: { load: () => d5, save: s => { d5 = s; } }, now, timer, clear });
  await s5.init(); s5.cancel(); queue = [];
  const drac = 'drac-valls/drac-v1/1';
  assert.equal(await s5.send(), 'partial'); assert.equal(calls5.at(-1).buckets.join(), drac, 'the first valid one goes alone');
  t += 61000; assert.equal(await s5.send(), 'partial');
  assert.deepEqual(calls5.slice(-3).map(c => c.buckets.join()), [`${drac},${bad},practice`, bad, 'practice'], 'the valid one is not asked again; the bad one is found');
  t += 61000; assert.equal(await s5.send(), 'sent');
  assert.deepEqual(calls5.at(-1), { buckets: [drac, 'practice'], days: payload(d5, 'u-5').days.length }, 'the rest, practice and days with it, in one');
  assert(calls5.at(-1).days > 0); assert.equal(d5.owners['u-5'].counters[bad].runs, 1, 'the refused bucket is untouched');
  s5.cancel(); }

// too much time for the minutes since the last upload is not bad data: never left out, sent once the clock allows it
{ const calls7 = []; let early = true;
  const stub = { ownerId: async () => 'u-7', profile: async () => ({}), onAccount: () => () => {},
    syncStats: async p => { calls7.push(Object.keys(p.buckets)); if ('practice' in p.buckets && early) throw Object.assign(new Error('x'), { code: 'stats_time' }); } };
  let d7 = newStats(); endRun(d7, 'u-7', run({ kind: 'practice', seconds: 400 }));
  markStatsNoticeSeen('u-7', mem);
  const s7 = createStatsSync({ service: stub, kv: mem, io: { load: () => d7, save: s => { d7 = s; } }, now, timer, clear });
  await s7.init(); s7.cancel(); queue = [];
  assert.equal(await s7.send(), 'later'); assert.equal(queue.length, 1, 'tried again later'); s7.cancel();
  early = false; t += 61000;
  assert.equal(await s7.send(), 'sent'); assert.deepEqual(calls7.at(-1), ['practice'], 'the practice was never left out'); s7.cancel(); }

// a bucket one profile is refused is not another's refusal
{ let owner = 'A', listener; const calls6 = [];
  const stub = { ownerId: async () => owner, profile: async () => ({}), onAccount: f => { listener = f; return () => {}; },
    syncStats: async p => { calls6.push([p.owner, ...Object.keys(p.buckets)]); if (p.owner === 'A' && 'drac-valls/drac-v1/1' in p.buckets) throw Object.assign(new Error('x'), { code: 'stats' }); } };
  let d6 = newStats(); for (const id of ['A', 'B']) { endRun(d6, id, run()); endRun(d6, id, run({ figureId: 'drac-valls', version: 'drac-v1' })); markStatsNoticeSeen(id, mem); }
  const s6 = createStatsSync({ service: stub, kv: mem, io: { load: () => d6, save: s => { d6 = s; } }, now, timer, clear });
  await s6.init(); s6.cancel(); queue = [];
  assert.equal(await s6.send(), 'partial'); assert(calls6.some(c => c.join() === 'A,drac-valls/drac-v1/1'), 'A: Drac refused alone');
  owner = 'B'; listener({ type: 'changed' }); await new Promise(r => setTimeout(r, 20)); s6.cancel(); queue = [];
  calls6.length = 0; assert.equal(await s6.send(), 'sent'); assert.deepEqual(calls6, [['B', 'drac-valls/drac-v1/1', 'mulassa-valls/mulassa-v3/1']], 'B keeps its Drac bucket'); }

// the SDK signs the request with a newer session than the one our own check saw: the server refuses the owner it was not told about
{ let session = { user: { id: 'A' } }, flip = false, credited = [];
  const client = { auth: { getSession: async () => ({ data: { session }, error: null }) },
    rpc: async (name, args) => { // like supabase-js + merge_stats: the request is authenticated as whoever the session is NOW
      if (name === 'my_profile') return { data: [{ alias: 'Jo' }], error: null };
      if (flip) { flip = false; session = { user: { id: 'B' } }; } // the other tab's switch lands after our check
      if (args.p_owner !== undefined && args.p_owner !== session.user.id) return { data: null, error: { message: 'leaderboard_owner_mismatch', code: '28000', status: 401 } };
      credited.push({ as: session.user.id, buckets: Object.keys(args.p_buckets) }); return { data: null, error: null }; } };
  const real = createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => client });
  let d7 = newStats(); endRun(d7, 'A', run()); endRun(d7, 'B', run({ figureId: 'drac-valls', version: 'drac-v1' })); markStatsNoticeSeen('A', mem); markStatsNoticeSeen('B', mem);
  const s7 = createStatsSync({ service: real, kv: mem, io: { load: () => d7, save: s => { d7 = s; } }, now, timer, clear });
  await s7.init(); s7.cancel(); queue = []; flip = true;
  assert.equal(await s7.send(), 'session'); assert.deepEqual(credited, [], 'A\'s counters were not credited to B'); assert.equal(d7.owners.A.sent, undefined);
  assert.equal(s7.owner, 'B', 'the live owner is adopted'); t += 61000; assert.equal(await s7.send(), 'sent'); assert.deepEqual(credited, [{ as: 'B', buckets: ['drac-valls/drac-v1/1'] }]); s7.cancel(); }
// Crea with a taken name: the anonymous sign-in exists but has no profile yet. Its account event must not move what was played
// without a profile onto it (decision 30): recovering another profile by e-mail would leave them stranded there
{ let owner = 'anon', profile = null, listener;
  const stub = { ownerId: async () => owner, profile: async () => profile, onAccount: f => { listener = f; return () => {}; }, syncStats: async () => {} };
  let d8 = newStats(); endRun(d8, 'none', run());
  const s8 = createStatsSync({ service: stub, kv: mem, io: { load: () => d8, save: s => { d8 = s; } }, now, timer, clear });
  await s8.init(); assert.equal(s8.owner, null);
  listener({ type: 'changed' }); await new Promise(r => setTimeout(r, 20)); s8.cancel(); queue = [];
  assert.equal(s8.owner, null, 'a session without a profile owns nothing'); assert(d8.owners.none && !d8.owners.anon, 'the unowned numbers wait');
  owner = 'P'; profile = { alias: 'Recuperat' }; listener({ type: 'changed' }); await new Promise(r => setTimeout(r, 20)); s8.cancel(); queue = [];
  assert.equal(s8.owner, 'P'); assert(!d8.owners.none && d8.owners.P.counters['mulassa-valls/mulassa-v3/1'].runs === 1, 'they join the profile recovered'); }
console.log('stats-sync: ok');
