// Synthetic, in-memory database only: submit_result keeps the run with the most points per level (the board's order).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const migration = '202610170001_record_by_score.sql';
const migrations = new URL('../../supabase/migrations/', import.meta.url);
const sql = f => readFileSync(new URL(f, migrations), 'utf8');
const query = async (s, p = []) => (await db.query(s, p)).rows;
const id = '00000000-0000-4000-8000-000000000001', short = 'mulassa-v2-short';
const submit = async (perfect, miss, score) => {
  await db.exec("reset role; update leaderboard_private.profiles set last_write_at=now()-interval '11 seconds'");
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
  return (await query('select * from public.submit_result($1,0,$2,0,$3,$4,$2,$5)', [short, perfect, miss, score, 'PerPunts']))[0];
};
const stored = async () => { await db.exec('reset role'); return (await query('select perfect, score from leaderboard_private.entries where user_id=$1 and version=$2', [id, short]))[0]; };
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean,
      email text, email_change text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const f of readdirSync(migrations).filter(f => f.endsWith('.sql') && f < migration).sort()) await db.exec(sql(f));
  await query('insert into auth.users(id,is_anonymous) values ($1,true)', [id]);
  await query("insert into leaderboard_private.profiles(user_id,alias) values ($1,'PerPunts')", [id]);
  await query(`insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo)
    values ($1,'mulassa-v1',0,150,0,0,90000,150)`, [id]);
  const snapshot = await query('select * from leaderboard_private.entries order by id');
  assert(/^[\x00-\x7f]*$/.test(sql(migration)), 'migration is ASCII');
  await db.exec(sql(migration));
  await db.exec(sql(migration)); // safe to rerun
  assert.deepEqual(await query('select * from leaderboard_private.entries order by id'), snapshot, 'migration never rewrites entries');
  // 108 judgments on FÀCIL; coherence ceilings: 109000 at 108 hits, ~104600 at 100.
  assert.equal((await submit(108, 0, 60000)).improved, true, 'first run');
  assert.equal((await submit(100, 8, 70000)).improved, true, 'more points with a lower % replaces the run');
  assert.deepEqual(await stored(), { perfect: 100, score: 70000 });
  assert.equal((await submit(108, 0, 69000)).improved, false, 'a higher % with fewer points does not');
  assert.equal((await submit(100, 8, 70000)).improved, false, 'an identical run does not');
  assert.equal((await submit(108, 0, 70000)).improved, true, 'equal points: the higher % breaks the tie');
  assert.deepEqual(await stored(), { perfect: 108, score: 70000 });
  // The legacy row is a different version: its own entry, untouched; the board shows the player once, by points.
  const rows = (await query("select alias, score from public.get_leaderboard_all('mulassa-v1')")).filter(r => r.alias === 'PerPunts');
  assert.deepEqual(rows, [{ alias: 'PerPunts', score: Math.round(70000 * 96572 / 69350) }]);
  const fn = (await query(`select prosecdef, proconfig, has_function_privilege('anon',oid,'execute') anon,
    has_function_privilege('authenticated',oid,'execute') auth from pg_proc where proname='submit_result'`))[0];
  assert(fn.prosecdef && !fn.anon && fn.auth && String(fn.proconfig).includes('search_path=""'), 'same security and grants');
  // The SQL Editor smoke test (rolled back) also runs here, on the whole migration chain.
  await db.exec('reset role');
  for (const f of readdirSync(migrations).filter(f => f.endsWith('.sql') && f > migration).sort()) await db.exec(sql(f));
  const smoke = await db.exec(readFileSync(new URL('../../supabase/tests/leaderboards-smoke.sql', import.meta.url), 'utf8'));
  assert(smoke.some(r => r.rows?.[0]?.validation?.startsWith('PASS')), 'smoke test passes');
  assert.equal((await query("select count(*)::int n from auth.users where id::text like 'fca4d0d0%'"))[0].n, 0, 'smoke fixtures rolled back');
  console.log('submit_result keeps the most points per level (+ SQL smoke) ok');
} finally { await db.close(); }
