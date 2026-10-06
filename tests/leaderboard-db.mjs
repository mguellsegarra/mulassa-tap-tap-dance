import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  await db.exec(readFileSync(new URL('../supabase/migrations/202609270001_leaderboards.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/202609270002_retention.sql', import.meta.url), 'utf8'));
  // the later migrations replace submit_result and the board (get_leaderboard_all; the per-level one is dropped): the same
  // contracts must hold
  for (const f of ['202609280001_leaderboard_all.sql', '202609280002_leaderboard_me.sql', '202609280003_unique_alias.sql', '202609280004_drop_weekly.sql', '202609280005_board_pages.sql', '202609280006_feedback.sql', '202609280007_drop_feedback_tables.sql', '202609280008_drop_per_level_board.sql', '202609280009_alias_hardening.sql', '202609280010_alias_mulassa_allowed.sql', '202609280011_restore_unique_alias.sql', '202609280014_seed_phaseout.sql', '202609280015_score_ceiling.sql', '202609300001_email_players.sql', '202609300002_create_profile.sql', '202609300003_score_coherence.sql', '202609300004_board_streak.sql']) await db.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
  const board = async () => (await db.query("select * from public.get_leaderboard_all('mulassa-v1')")).rows;
  assert.equal((await db.query("select to_regprocedure('public.get_leaderboard(text,integer)') f")).rows[0].f, null, 'the per-level board is gone');
  assert.equal((await board()).length, 0);
  assert.equal((await db.query("select leaderboard_private.normalized_alias('Ànec d’Òdena') as alias")).rows[0].alias, 'Ànec d’Òdena');
  const a = '00000000-0000-0000-0000-000000000001', b = '00000000-0000-0000-0000-000000000002';
  await db.query('insert into auth.users(id,is_anonymous) values ($1,true),($2,true)', [a,b]);
  const submit = (perfect=120,good=20,miss=10,score=54321,alias='Ànec') => db.query("select * from public.submit_result('mulassa-v1',0,$1,$2,$3,$4,50,$5)",[perfect,good,miss,score,alias]);
  const unlock = async () => { await db.exec("reset role; update leaderboard_private.profiles set last_write_at = now()-interval '11 seconds'; set role authenticated;"); };
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from leaderboard_private.entries'), /permission denied/);
  await assert.rejects(submit(), /permission denied/);
  await assert.rejects(db.query("select public.update_alias('Intrús')"), /permission denied/);
  await db.exec('set role authenticated');
  await assert.rejects(submit(), /leaderboard_auth_required/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
  assert.equal((await submit()).rows[0].improved,true);
  await assert.rejects(submit(),/leaderboard_rate_limit/);
  await assert.rejects(db.query("select public.update_alias('Renomat')"),/leaderboard_rate_limit/);
  await assert.rejects(submit(120,20,9),/leaderboard_invalid_result/);
  await assert.rejects(submit(120,20,10,100,'<script>'),/leaderboard_invalid_alias/);
  await assert.rejects(db.query("select * from public.submit_result('bad',0,120,20,10,1,1,'Ànec')"),/leaderboard_invalid_result/);
  // 0015: more than a perfect run can make is refused with its own code (the ceilings: tests/score-ceiling.mjs)
  await assert.rejects(submit(120,20,10,147001),/leaderboard_score_ceiling/);
  await assert.rejects(submit(120,20,9,147001),/leaderboard_invalid_result/, 'a malformed result is still just invalid');
  // 0016: a score has to fit the judgments (audit SEC-01): no misses-only run at the top, no half run at the ceiling
  await assert.rejects(submit(50,0,100,147000),/leaderboard_score_ceiling/);
  await assert.rejects(submit(50,0,100,91001),/leaderboard_score_ceiling/); // (147000-63000)*50/150+63000 = 91000
  await assert.rejects(submit(75,0,75,147000),/leaderboard_score_ceiling/);
  await assert.rejects(db.query('select leaderboard_private.require_player()'),/permission denied/, 'the helper is not for clients');
  await unlock();
  const first = (await db.exec('reset role; select achieved_at from leaderboard_private.entries; set role authenticated;'))[1].rows[0].achieved_at;
  assert.equal((await submit(119,21,10,140999)).rows[0].improved,false, 'quality wins over points');
  await unlock();
  assert.equal((await submit()).rows[0].improved,false,'identical result is idempotent');
  const after = (await db.exec('reset role; select achieved_at from leaderboard_private.entries; set role authenticated;'))[1].rows[0].achieved_at;
  assert.equal(String(after),String(first),'non-improvement keeps its achieved time');
  await unlock();
  assert.equal((await submit(120,20,10,54322)).rows[0].improved,true);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
  await submit(121,19,10,1,'Portador');
  const rows=await board(); // by points: a's 54322 over Portador's 1
  assert.equal(rows.length,2); assert.equal(rows[1].alias,'Portador'); assert.equal(rows[1].score,1);
  assert.equal(rows[1].is_self,true); assert.equal(rows[0].is_self,false);
  assert.deepEqual(Object.keys(rows[0]),['position','alias','difficulty','quality','score','max_combo','is_self','total']);
  await unlock(); await db.query("select public.update_alias('Portador nou')");
  assert.equal((await board())[1].alias,'Portador nou');
  await assert.rejects(db.query("update leaderboard_private.profiles set alias='Robat'"),/permission denied/);
  await assert.rejects(db.query('delete from leaderboard_private.entries'),/permission denied/);
  await db.exec("reset role; update auth.users set is_anonymous=false where id='"+b+"'; set role authenticated;");
  await assert.rejects(submit(),/leaderboard_auth_required/);
  await assert.rejects(db.query("select public.update_alias('Portador tres')"),/leaderboard_auth_required/, 'renaming: also players only');
  // 202609300001: a profile protected with an e-mail (anonymous no more, address confirmed) still plays; an unconfirmed address does not
  await db.exec("reset role; update auth.users set email_confirmed_at=now() where id='"+b+"'; set role authenticated;");
  await unlock(); await submit(121,19,10,2,'Portador'); await unlock(); await db.query("select public.update_alias('Portador tres')");
  await db.exec("reset role; update auth.users set email_confirmed_at=null where id='"+b+"'; set role authenticated;");
  await assert.rejects(submit(),/leaderboard_auth_required/, 'an unconfirmed address is not a player');
  { // 202609300002: «Crea»: a player with no result gets a profile from update_alias (nickname reserved, on no board), then publishes as usual
    const n = '00000000-0000-0000-0000-000000000003';
    await db.exec("reset role; insert into auth.users(id,is_anonymous) values ('"+n+"',true); set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n]);
    const before = (await board()).length;
    assert.equal((await db.query('select public.my_alias() a')).rows[0].a,null);
    await assert.rejects(db.query("select public.update_alias('Portador tres')"),/leaderboard_alias_taken/, 'creating with a taken nickname is refused, no row left behind');
    assert.equal((await db.query("select public.update_alias('Novell') a")).rows[0].a,'Novell');
    assert.equal((await board()).length,before,'no result, no row on the board');
    assert.equal((await db.query('select public.my_alias() a')).rows[0].a,'Novell','my_alias: the name of a profile that is on no board (recovery)');
    await assert.rejects(db.query("select public.update_alias('Novell2')"),/leaderboard_rate_limit/);
    await unlock(); await submit(100,40,10,3,'Novell'); assert.equal((await board()).find(r=>r.is_self).alias,'Novell');
    await db.exec("reset role; delete from auth.users where id='"+n+"'; set role authenticated;");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
  }
  await db.exec("reset role; delete from auth.users where id='"+b+"';");
  assert.equal((await db.query('select count(*)::int n from leaderboard_private.entries')).rows[0].n,1,'account deletion cascades');
  await db.exec("set role anon; select set_config('request.jwt.claim.sub','',false)");
  assert.equal((await board())[0].is_self,false);
  await assert.rejects(db.query('select * from public.leaderboard_expired_players(100)'), /permission denied/);
  await db.exec('reset role');
  await db.exec("update auth.users set created_at=now()-interval '13 months'; update leaderboard_private.profiles set last_active_at=now()-interval '13 months'; set role service_role;");
  assert.equal((await db.query('select * from public.leaderboard_expired_players(100)')).rows.length,1);
  await db.exec("reset role; update leaderboard_private.profiles set last_active_at=now(); set role service_role;");
  assert.equal((await db.query('select * from public.leaderboard_expired_players(100)')).rows.length,0);
  await db.exec('reset role');
  // 0015: the ceilings, and the two writers still security definer, search_path '', through require_player(), same grants
  assert.deepEqual((await db.query("select max_score from leaderboard_private.versions where version='mulassa-v1' order by difficulty")).rows.map(r => r.max_score), [147000, 163000, 250000]);
  const fns = (await db.query("select proname, prosecdef, proconfig, prosrc, proacl::text acl from pg_proc where oid in ('public.submit_result(text,integer,integer,integer,integer,integer,integer,text)'::regprocedure, 'public.update_alias(text)'::regprocedure)")).rows;
  assert.equal(fns.length, 2);
  for (const f of fns) {
    assert(f.prosecdef && String(f.proconfig).includes('search_path=""'), `${f.proname}: security definer, empty search_path`);
    assert(/v_uid := leaderboard_private\.require_player\(\);/.test(f.prosrc) && !/is_anonymous/.test(f.prosrc), `${f.proname}: the one player check`);
    assert(/authenticated=X/.test(f.acl) && !/anon=X/.test(f.acl) && !/(^|[{,])=X/.test(f.acl), `${f.proname}: authenticated only`);
  }
  const rls=(await db.query("select relrowsecurity from pg_class where relnamespace='leaderboard_private'::regnamespace and relkind='r'")).rows;
  assert.equal(rls.length,5); assert(rls.every(r=>r.relrowsecurity)); // versions, profiles, entries + the nickname blocklist and allowlist (0009)
  console.log('leaderboard SQL validation, ranking, permissions, throttling and deletion contracts ok');
} catch (error) { console.error(error.message, error.code, error.position); process.exitCode = 1; }
finally { await db.close(); }

// Production on 2026-09-28: 0003 (check_alias_free, alias_key, the unique index) was never applied, the rest was, so
// submit_result failed with 42883 for everyone. 0011 restores it: publishing works, a taken nickname is refused again.
{
  const prod = new PGlite();
  try {
    await prod.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    const run = f => prod.exec(readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8'));
    for (const f of ['202609270001_leaderboards.sql', '202609270002_retention.sql', '202609280001_leaderboard_all.sql', '202609280002_leaderboard_me.sql', '202609280004_drop_weekly.sql', '202609280005_board_pages.sql', '202609280006_feedback.sql', '202609280007_drop_feedback_tables.sql', '202609280008_drop_per_level_board.sql', '202609280009_alias_hardening.sql', '202609280010_alias_mulassa_allowed.sql']) await run(f);
    const a = '00000000-0000-0000-0000-00000000000a', b = '00000000-0000-0000-0000-00000000000b';
    await prod.query('insert into auth.users(id,is_anonymous) values ($1,true),($2,true)', [a, b]);
    const as = async uid => { await prod.exec('reset role'); await prod.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]); await prod.exec('set role authenticated'); };
    const submit = alias => prod.query("select * from public.submit_result('mulassa-v1',0,135,10,5,90000,60,$1)", [alias]);
    await as(a);
    await assert.rejects(submit('mguellsegarra'), e => e.code === '42883' && /check_alias_free/.test(e.message), 'the production failure');
    await prod.exec('reset role'); await run('202609280011_restore_unique_alias.sql'); await run('202609280011_restore_unique_alias.sql'); // idempotent
    await as(a);
    assert.equal((await submit('mguellsegarra')).rows[0].improved, true);
    await as(b);
    await assert.rejects(submit('MGuell-Segarra'), /leaderboard_alias_taken/);
    assert.equal((await submit('Portador')).rows[0].improved, true);
    await prod.exec("reset role; update leaderboard_private.profiles set last_write_at = now()-interval '11 seconds'");
    await as(b);
    await assert.rejects(prod.query("select public.update_alias('mguellsegarra')"), /leaderboard_alias_taken/, 'update_alias checks too');
    await prod.exec('reset role');
    await prod.query("insert into auth.users(id,is_anonymous) values ('00000000-0000-0000-0000-00000000000c',true)");
    await assert.rejects(prod.query("insert into leaderboard_private.profiles(user_id,alias) values ('00000000-0000-0000-0000-00000000000c','Mguellsegarra')"), /profiles_alias_key/, 'the index backs it up');
    console.log('leaderboard 0011 repair (production without 0003) ok');
  } catch (error) { console.error(error.message, error.code, error.position); process.exitCode = 1; }
  finally { await prod.close(); }
}
