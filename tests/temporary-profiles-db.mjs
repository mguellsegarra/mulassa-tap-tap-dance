// Temporary profiles (supabase/migrations/202610180001_temporary_profiles.sql) on PGlite, synthetic accounts only: the
// 7-day deadline from the first publication (never moved), the notice for profiles that already had results (from the
// first time it is shown, idempotent), a reserved nickname without a deadline, expiry (hidden at once, nickname free,
// account and results purged), the confirmed-address exemption and its check on the board (a boolean, never the
// address), a pending address that counts for nothing, confirmation against the purge, stale clients and grants.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = new URL('../supabase/migrations/', import.meta.url);
const migration = '202610180001_temporary_profiles.sql';
const sql = f => readFileSync(new URL(f, migrations), 'utf8');
const db = new PGlite();
const query = async (s, p = []) => (await db.query(s, p)).rows;
const one = async (s, p = []) => (await query(s, p))[0];
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const admin = () => db.exec('reset role');
const as = async (id, role = 'authenticated') => { await admin(); await query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']); await db.exec(`set role ${role}`); };
const unlock = async () => { await admin(); await db.exec("update leaderboard_private.profiles set last_write_at = now() - interval '11 seconds'"); };
const account = async ({ anonymous = true, email = null, confirmed = false, pending = null } = {}) => {
  await admin();
  const id = uid();
  await query('insert into auth.users(id,is_anonymous,email,email_confirmed_at,email_change) values ($1,$2,$3,$4,$5)',
    [id, anonymous, email, confirmed ? new Date() : null, pending]);
  return id;
};
const legacy = async (alias, opts) => { // a profile with a result from before the migration (rows written directly)
  const id = await account(opts);
  await query('insert into leaderboard_private.profiles(user_id,alias) values ($1,$2)', [id, alias]);
  await query("insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo) values ($1,'mulassa-v1',0,140,10,0,90000,60)", [id]);
  return id;
};
// a full-song EASY run; `notice` undefined = an old client's 8 named arguments
const publish = (alias, notice, score = 54321) => notice === undefined
  ? one("select * from public.submit_result('mulassa-v1',0,120,20,10,$1,50,$2)", [score, alias])
  : one("select * from public.submit_result('mulassa-v1',0,120,20,10,$1,50,$2,$3)", [score, alias, notice]);
const board = async () => { await as(null, 'anon'); return query("select * from public.get_leaderboard_all('mulassa-v1')"); };
const me = async id => { await as(id); return one('select * from public.my_profile()'); };
const exists = async id => { await admin(); return Boolean(await one('select 1 from auth.users where id = $1', [id])); };
const expire = async id => { await admin(); await query("update leaderboard_private.profiles set expires_at = now() - interval '1 second' where user_id = $1", [id]); };
const purge = async (limit = 500) => { await admin(); return (await one('select leaderboard_private.purge_expired_profiles($1) n', [limit])).n; };
const week = ms => Math.abs(ms - 7 * 864e5);

try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean, email text, email_change text,
      email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  for (const f of readdirSync(migrations).filter(f => f.endsWith('.sql') && f < migration).sort()) await db.exec(sql(f));
  // before the migration: a published guest, one who only reserved a name, a confirmed player, a published guest never told
  const old = await legacy('Veterana'), reserved = await account(), confirmed = await legacy('Confirmat', { anonymous: false, email: 'c@example.test', confirmed: true });
  const untold = await legacy('Silenciosa');
  await query("insert into leaderboard_private.profiles(user_id,alias) values ($1,'Reservat')", [reserved]);
  assert(/^[\x00-\x7f]*$/.test(sql(migration)), 'migration is ASCII');
  await db.exec(sql(migration)); await db.exec(sql(migration)); // idempotent
  const pointsMigration = '202610190001_temporary_record_by_score.sql';
  await db.exec(sql(pointsMigration)); await db.exec(sql(pointsMigration)); // also safe for an already migrated database
  await admin();
  assert.equal((await one('select count(*)::int c from leaderboard_private.profiles where expires_at is not null')).c, 0, 'no deadline is backfilled');

  // --- the board: a check for a confirmed address only, as a boolean; nothing else about the account
  let rows = await board();
  assert.deepEqual(Object.keys(rows[0]), ['position', 'alias', 'difficulty', 'quality', 'score', 'max_combo', 'is_self', 'total', 'verified']);
  assert.deepEqual(Object.fromEntries(rows.map(r => [r.alias, r.verified])), { Veterana: false, Confirmat: true, Silenciosa: false });
  assert(!JSON.stringify(rows).includes('example.test'), 'no address on the public board');

  // --- an old profile with results: told once, 7 days from then; an old client cannot publish around it
  let p = await me(old);
  assert.deepEqual([p.alias, p.verified, p.expires_at, p.published, p.notice_needed, p.expired], ['Veterana', false, null, true, true, false]);
  await as(old);
  await assert.rejects(publish('Veterana'), /leaderboard_notice_required/, 'a stale client without the notice');
  const t0 = Date.now(), until = (await one('select public.ack_expiry_notice() t')).t;
  assert(week(until - t0) < 5000, 'the notice gives 7 days from now');
  assert.equal(+(await one('select public.ack_expiry_notice() t')).t, +until, 'a retry keeps the deadline');
  p = await me(old); assert(p.notice_needed === false && +p.expires_at === +until);
  await as(old); let r = await publish('Veterana');
  assert(r.started === false && +r.expires_at === +until, 'an old client publishes once a deadline exists; it does not move');
  // the untold one: no deadline, never purged, still on the board
  assert.equal((await me(untold)).notice_needed, true);

  // --- a reserved nickname («Crea»): no deadline until it publishes; nothing to acknowledge
  p = await me(reserved); assert(p.published === false && p.notice_needed === false && p.expires_at === null);
  await as(reserved); assert.equal((await one('select public.ack_expiry_notice() t')).t, null);
  const fresh = await account(); await as(fresh);
  assert.equal((await one("select public.update_alias('Novell') a")).a, 'Novell');
  assert.equal((await me(fresh)).expires_at, null, 'creating a profile never starts the clock');

  // --- the first publication starts it (with the notice shown), later ones do not move it
  await unlock(); await as(fresh);
  await assert.rejects(publish('Novell', false), /leaderboard_notice_required/);
  const t1 = Date.now(); r = await publish('Novell', true); // the refusal above was rolled back: no cooldown
  assert(r.started === true && r.improved === true && week(r.expires_at - t1) < 5000, 'exactly 7 days from the first publication');
  await admin(); const told = await one('select notice_at, expires_at from leaderboard_private.profiles where user_id = $1', [fresh]);
  assert.equal(told.expires_at - told.notice_at, 7 * 864e5);
  await unlock(); await as(fresh); const again = await publish('Novell', true, 60000);
  assert(again.started === false && +again.expires_at === +r.expires_at && again.improved, 'a second publication keeps the deadline');

  // The later profile signature must retain master's points-first rule and its notice/deadline contract.
  await unlock(); await as(fresh);
  const morePoints = await one("select * from public.submit_result('mulassa-v1',0,100,20,30,70000,50,'Novell',true)");
  assert(morePoints.improved && morePoints.score === 70000, 'temporary profiles retain more points with a lower percentage');
  assert(morePoints.started === false && +morePoints.expires_at === +r.expires_at, 'a points improvement never restarts the deadline');
  await unlock(); await as(fresh);
  assert.equal((await publish('Novell', true, 69000)).improved, false, 'a higher percentage with fewer points cannot replace the temporary profile record');
  await unlock(); await as(fresh);
  assert.equal((await publish('Novell', true, 70000)).improved, true, 'equal points: the higher percentage breaks the tie');

  // --- nothing is due: nothing goes, whatever the age of the untold profile
  await admin(); await query("update leaderboard_private.profiles set created_at = now() - interval '2 years'");
  assert.equal(await purge(), 0);

  // --- expiry: hidden at the deadline, the nickname free for someone else at once, everything of it gone
  await expire(fresh);
  assert(!(await board()).some(r => r.alias === 'Novell'), 'hidden from the deadline, before any purge');
  assert.equal((await me(fresh)).expired, true);
  const taker = await account(); await as(taker);
  assert.equal((await publish('NOVELL', true)).started, true, 'the expired nickname is free (same key)');
  assert.equal(await exists(fresh), false, 'its holder was removed on the spot');
  await admin(); assert.equal((await one('select count(*)::int c from leaderboard_private.entries where user_id = $1', [fresh])).c, 0);

  // --- a confirmed address: never expires, keeps its results, its old deadline is cleared by the purge
  await expire(confirmed);
  assert((await board()).find(r => r.alias === 'Confirmat'), 'confirmed: shown past any deadline');
  assert.equal((await me(confirmed)).expires_at, null);
  assert.equal(await purge(), 0); assert.equal(await exists(confirmed), true);
  await admin(); assert.equal((await one('select expires_at from leaderboard_private.profiles where user_id = $1', [confirmed])).expires_at, null);
  await unlock(); await as(confirmed); r = await publish('Confirmat', false, 1);
  assert(r.started === false && r.expires_at === null, 'a confirmed player publishes without a clock');

  // --- a pending address (sent, code not entered) counts for nothing: no check, no exemption
  const pending = await account({ pending: 'pendent@example.test' }); await as(pending);
  await publish('Pendent', true);
  assert.equal((await board()).find(r => r.alias === 'Pendent').verified, false);
  assert.equal((await me(pending)).verified, false);
  await expire(pending); assert.equal(await purge(), 1); assert.equal(await exists(pending), false, 'purged with its pending address');

  // --- confirmation against the purge: confirmed first = kept; purged first = nothing left to confirm
  const quick = await account(); await as(quick); await publish('Rapid', true); await expire(quick);
  await admin(); await query("update auth.users set is_anonymous = false, email = 'r@example.test', email_confirmed_at = now(), email_change = null where id = $1", [quick]);
  assert.equal(await purge(), 0); assert.equal(await exists(quick), true);
  assert.equal((await board()).find(r => r.alias === 'Rapid').verified, true);
  const late = await account(); await as(late); await publish('Tard', true); await expire(late);
  assert.equal(await purge(), 1); await admin();
  assert.equal((await db.query("update auth.users set email_confirmed_at = now() where id = $1", [late])).affectedRows, 0, 'a code entered after the purge confirms nothing');
  // the purge's list is only who to look at: each account is decided again under its lock, from the profile as it is
  // then (real concurrent connections: the release checklist's PostgreSQL run; PGlite has one connection)
  const renewed = await account(); await as(renewed); await publish('Renovat', true); await expire(renewed);
  await unlock(); await as(renewed); await publish('Renovat', true); // started again before the purge reached it
  await admin(); assert.equal((await one('select leaderboard_private.drop_expired($1) n', [renewed])).n, 0, 'a stale due id: kept');
  const verifiedLate = await account(); await as(verifiedLate); await publish('Verificat', true); await expire(verifiedLate);
  await admin(); await query("update auth.users set is_anonymous = false, email = 'v@example.test', email_confirmed_at = now() where id = $1", [verifiedLate]);
  assert.equal((await one('select leaderboard_private.drop_expired($1) n', [verifiedLate])).n, 0, 'confirmed before the delete: kept');
  assert(await exists(renewed) && await exists(verifiedLate));
  assert.equal((await one('select leaderboard_private.lock_profile($1, false) ok', [renewed])).ok, true, 'a free account lock is taken');
  const body = (await one("select prosrc from pg_proc where proname = 'drop_expired'")).prosrc;
  assert(/u\.id = p_uid and p\.user_id = u\.id and p\.expires_at <= now\(\)\s+and not \(not coalesce\(u\.is_anonymous, false\) and u\.email is not null and u\.email_confirmed_at is not null\)/.test(body),
    'the delete decides on the account row\'s own columns (re-checked by Postgres on a concurrent confirmation)');

  // --- an expired player publishing again (an old tab): a new profile, a new 7 days, the old results gone
  const back = await account(); await as(back); await publish('Tornada', true, 90000); await expire(back);
  await unlock(); await as(back); r = await publish('Tornada', true, 1);
  assert(r.started === true && r.score > 0 && r.score < 10, 'a fresh profile: the old better result is not kept');
  assert.equal(await purge(), 0, 'nothing else due');
  // the purge's limit
  const due = []; for (let i = 0; i < 3; i++) { const id = await account(); await as(id); await publish(`Lot${i}`, true); due.push(id); await expire(id); }
  assert.equal(await purge(2), 2); assert.equal(await purge(2), 1);

  // --- grants: the reads and the notice for signed-in players, the purge and helpers for nobody outside
  await as(null, 'anon');
  for (const f of ['public.my_profile()', 'public.ack_expiry_notice()']) await assert.rejects(query(`select * from ${f}`), /permission denied/, `anon: ${f}`);
  await as(old);
  for (const f of ['leaderboard_private.purge_expired_profiles(1)', `leaderboard_private.verified('${old}')`, `leaderboard_private.drop_expired('${old}')`, `leaderboard_private.lock_profile('${old}', false)`]) await assert.rejects(query(`select ${f}`), /permission denied/, `authenticated: ${f}`);
  await as(old, 'service_role'); await assert.rejects(query('select leaderboard_private.purge_expired_profiles(1)'), /permission denied/);
  await admin();
  const fns = await query("select proname, prosecdef, proconfig, proacl::text acl from pg_proc where proname in ('submit_result','ack_expiry_notice','my_profile','update_alias') and pronamespace = 'public'::regnamespace");
  assert.equal(fns.length, 4, 'one submit_result: the old signature is gone (no ambiguous overloads)');
  for (const f of fns) assert(f.prosecdef && String(f.proconfig).includes('search_path=""') && /authenticated=X/.test(f.acl) && !/anon=X/.test(f.acl), `${f.proname}: definer, empty path, authenticated only`);
  assert(!/(^|[{,])=X/.test((await one("select proacl::text acl from pg_proc where proname = 'get_leaderboard_all'")).acl), 'the board: no PUBLIC grant');
  console.log('temporary profiles: deadline, notice, reserved names, expiry, confirmation, purge and grants ok');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await db.close(); }
