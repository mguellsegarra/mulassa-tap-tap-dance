// Synthetic, in-memory database only: historical rows survive a shared short/full board.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { comparableScore } from '../src/game/score-scale.js';
import { ceilings, ceilingOf, perfectMax, loadSong } from '../tools/score-ceiling.mjs';

const db = new PGlite();
const migration = '202610160001_short_song_rankings.sql';
const migrations = new URL('../supabase/migrations/', import.meta.url);
const sql = f => readFileSync(new URL(f, migrations), 'utf8');
const old = 'mulassa-v1', short = 'mulassa-v2-short';
const counts = { [old]: [150,181,318], [short]: [108,133,240] };
const maxima = { [old]: [147000,163000,250000], [short]: [109000,122000,193000] };
const extras = { [old]: [63000,60000,65000], [short]: [50000,48000,51000] };
assert.deepEqual(maxima[short], ceilings(loadSong()), 'raw SQL limits follow the chart model');
assert.deepEqual(extras[short], [0, 1, 2].map(d => ceilingOf(perfectMax(loadSong(), d).extras)), 'SQL coherence extras follow the chart model');
let sequence = 0;
const query = async (s, p = []) => (await db.query(s, p)).rows;
const uid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
const as = async (id, role = 'authenticated') => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  await db.exec(`set role ${role}`);
};
const unlock = async () => {
  await db.exec("reset role; update leaderboard_private.profiles set last_write_at=now()-interval '11 seconds'");
};
const player = async (alias, seed = false) => {
  await db.exec('reset role');
  const id = uid();
  await query('insert into auth.users(id,is_anonymous) values ($1,true)', [id]);
  await query('insert into leaderboard_private.profiles(user_id,alias,is_seed) values ($1,$2,$3)', [id,alias,seed]);
  return id;
};
const entry = async (id, version, d, score, perfect = counts[version][d], good = 0) => {
  await db.exec('reset role');
  await query(`insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo,achieved_at)
    values ($1,$2,$3,$4,$5,$6,$7,$4,'2026-10-01')`, [id,version,d,perfect,good,counts[version][d]-perfect-good,score]);
};
const board = (version = old, offset = 0, limit = 50) => query('select * from public.get_leaderboard_all($1,$2,$3,$4)', [version,'all',offset,limit]);
const submit = (version, d, perfect, good, miss, score, combo, alias) => query(
  'select * from public.submit_result($1,$2,$3,$4,$5,$6,$7,$8)', [version,d,perfect,good,miss,score,combo,alias]);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, is_anonymous boolean,
      email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for (const f of readdirSync(migrations).filter(f => f.endsWith('.sql') && f < migration).sort()) await db.exec(sql(f));
  // Equal points across levels deliberately have opposite percentage and historical-unit ordering.
  const a = await player('HistoricEasy'), b = await player('HistoricHard');
  await entry(a, old, 0, 50000,150);
  await entry(b, old, 2, 50000,160);
  for (let i=0; i<4; i++) await entry(await player(`Seed${i}`,true),old,1,1000+i);
  const snapshot = await query('select * from leaderboard_private.entries order by id');
  const before = await board();
  assert.deepEqual(before.slice(0,2).map(r=>r.alias), ['HistoricHard','HistoricEasy']);
  assert(/^[\x00-\x7f]*$/.test(sql(migration)), 'migration is ASCII');
  await db.exec(sql(migration));
  await db.exec(sql(migration));
  assert.deepEqual(await query('select * from leaderboard_private.entries order by id'),snapshot,'migration never rewrites old entries');
  assert.deepEqual(await board(),before,'old-only board including cross-level ties is byte-for-byte equivalent');
  assert.deepEqual(await board(short),before,'both clients share the original board');
  for (const version of [old,short]) {
    const versions=await query('select judgments,max_score,extras_max,active from leaderboard_private.versions where version=$1 order by difficulty',[version]);
    assert.deepEqual(versions.map(v=>v.judgments),counts[version]);
    assert.deepEqual(versions.map(v=>v.max_score),maxima[version]);
    assert.deepEqual(versions.map(v=>v.extras_max),extras[version]);
    assert(versions.every(v=>v.active));
    for (let d=0; d<3; d++) {
      // Exhaust the accepted integer range: detects both rounding and coefficient drift from the JS model.
      const parity=await query(`select raw,leaderboard_private.comparable_score($1,$2,raw) score
        from generate_series(0,$3) raw`,[version,d,maxima[version][d]]);
      for (const r of parity) assert.equal(r.score,comparableScore(r.raw,d,version));
      const id=await player(`Publish${version===old?'Old':'Short'}${d}`);
      await as(id);
      const n=counts[version][d], max=maxima[version][d];
      await assert.rejects(submit(version,d,n-1,0,0,max,n-1,'ValidAlias'),/leaderboard_invalid_result/);
      await assert.rejects(submit(version,d,n,0,0,max+1,n,'ValidAlias'),/leaderboard_score_ceiling/);
      await assert.rejects(submit(version,d,0,0,n,extras[version][d]+1,0,'ValidAlias'),/leaderboard_score_ceiling/);
      await assert.rejects(submit(version,d,n,0,0,max,n+1,'ValidAlias'),/leaderboard_invalid_result/);
      await assert.rejects(submit(version,d,null,0,n,0,0,'ValidAlias'),/leaderboard_invalid_result/);
      const hits=Math.floor(n/2), coherent=Math.floor((max-extras[version][d])*hits/n+extras[version][d]);
      await assert.rejects(submit(version,d,hits,0,n-hits,coherent+1,hits,'ValidAlias'),/leaderboard_score_ceiling/);
      const alias=`Publish${version===old?'Old':'Short'}${d}`;
      const result=(await submit(version,d,n,0,0,max,n,alias))[0];
      assert.deepEqual(result,{improved:true,quality:'100.0000000000000000',score:comparableScore(max,d,version)});
      await assert.rejects(submit(version,d,n,0,0,max,n,alias),/leaderboard_rate_limit/);
      await unlock(); await as(id);
      assert.equal((await submit(version,d,0,0,n,extras[version][d],0,alias))[0].improved,false,'lower quality cannot replace the stored run');
      await unlock(); await as(id);
      assert.equal((await submit(version,d,n,0,0,max-1,n,alias))[0].improved,false,'best raw result retained');
      await db.exec('reset role');
      const stored=(await query('select version,perfect,score from leaderboard_private.entries where user_id=$1',[id]))[0];
      assert.deepEqual(stored,{version,perfect:n,score:max},'store raw points and actual judgments');
    }
  }
  // Cross-version tie: same equivalent units, different actual counts; quality uses each source denominator.
  const tieOld=await player('TieOld'), tieShort=await player('TieShort');
  const raw=40000, scaled=comparableScore(raw,0,short);
  await entry(tieOld,old,0,scaled,100); // 2/3 quality
  await entry(tieShort,short,0,raw,72); // also 2/3, same equivalent 500 units
  let rows=await board();
  const tied=rows.filter(r=>r.alias.startsWith('Tie'));
  assert.deepEqual(tied.map(r=>r.alias),['TieOld','TieShort'],'equivalent units tie falls back to achieved_at/id');
  assert.equal(Number(tied[0].quality),Number(tied[1].quality));
  // One player publishing both versions hides only one seed, and has one best board row.
  const both=await player('BothVersions');
  await entry(both,old,1,700);
  await entry(both,short,1,600);
  const seeds=await query(`select count(*)::int n from leaderboard_private.visible_entries($1) e
    join leaderboard_private.profiles p using(user_id) where p.is_seed and e.difficulty=1`,[short]);
  assert.equal(seeds[0].n,1,'three distinct real level-1 players hide three of four seeds, not four');
  rows=await board();
  assert.equal(rows.filter(r=>r.alias==='BothVersions').length,1);
  assert.equal(rows.find(r=>r.alias==='BothVersions').score,comparableScore(600,1,short));
  // Pagination, totals and self neighbours use exactly the same visible best-per-user set.
  for (let i=0;i<65;i++) await entry(await player(`Page${i}`),i%2?short:old,0,10000+i);
  await as(null,'anon');
  const pages=[];
  for (let off=0;;off+=7) { const p=await board(old,off,7); pages.push(...p); if(p.length<7) break; }
  assert(pages.every((r,i)=>Number(r.position)===i+1 && Number(r.total)===pages.length));
  assert.equal(new Set(pages.map(r=>r.alias)).size,pages.length);
  const at=pages.find(r=>r.alias==='BothVersions').position;
  await as(both);
  const first=await board(short,0,3);
  const positions=[...new Set([1,2,3,...Array.from({length:11},(_,i)=>Number(at)-5+i).filter(n=>n>0&&n<=pages.length)])].sort((a,b)=>a-b);
  assert.deepEqual(first.map(r=>Number(r.position)),positions);
  assert.equal(first.filter(r=>r.is_self).length,1);
  // Unknown versions remain isolated, including phase-out; inactive rows cannot hide family seeds.
  await db.exec('reset role');
  await query("insert into leaderboard_private.versions values ('unrelated',0,150,147000,true,63000)");
  counts.unrelated=[150];
  const unrelated=await player('Unrelated'); await entry(unrelated,'unrelated',0,100000);
  assert.deepEqual((await board('unrelated')).map(r=>r.alias),['Unrelated']);
  assert(!(await board()).some(r=>r.alias==='Unrelated'));
  await query('update leaderboard_private.versions set active=false where version=$1 and difficulty=1',[short]);
  assert.equal((await query(`select count(*)::int n from leaderboard_private.visible_entries($1) e
    join leaderboard_private.profiles p using(user_id) where p.is_seed and e.difficulty=1`,[old]))[0].n,2);
  await db.exec(sql(migration));
  assert.equal((await query('select active from leaderboard_private.versions where version=$1 and difficulty=1',[short]))[0].active,false,'rerun respects active flags');
  await query('update leaderboard_private.versions set active=true where version=$1',[short]);
  // Shared profile rate limit and alias checks survive both writers; auth/permissions stay private.
  await unlock(); await as(both);
  await assert.rejects(submit(short,0,108,0,0,100,108,'HistoricEasy'),/leaderboard_alias_taken/);
  await assert.rejects(submit(short,0,108,0,0,100,108,'<script>'),/leaderboard_invalid_alias/);
  await submit(short,0,108,0,0,100,108,'BothVersions');
  await assert.rejects(submit(old,0,150,0,0,100,150,'BothVersions'),/leaderboard_rate_limit/);
  await unlock();
  await query('update auth.users set is_anonymous=false where id=$1',[both]);
  await as(both);
  await assert.rejects(submit(short,0,108,0,0,100,108,'BothVersions'),/leaderboard_auth_required/);
  await db.exec('reset role');
  await query('update auth.users set email_confirmed_at=now() where id=$1',[both]);
  await as(both);
  assert.equal((await submit(short,0,108,0,0,101,108,'BothVersions'))[0].improved,true,'confirmed email accounts still publish');
  await as(null); await assert.rejects(submit(short,0,108,0,0,100,108,'ValidAlias'),/leaderboard_auth_required/);
  await as(null,'anon'); await assert.rejects(submit(old,0,150,0,0,100,150,'ValidAlias'),/permission denied/);
  await assert.rejects(query('select * from leaderboard_private.entries'),/permission denied/);
  await db.exec('reset role');
  const fns=await query(`select proname,prosecdef,proconfig,
    has_function_privilege('anon',oid,'execute') anon,has_function_privilege('authenticated',oid,'execute') auth
    from pg_proc where pronamespace in ('public'::regnamespace,'leaderboard_private'::regnamespace)
      and proname in ('submit_result','get_leaderboard_all','score_family','comparable_score','visible_entries')`);
  assert.equal(fns.length,5);
  for(const f of fns) {
    assert(String(f.proconfig).includes('search_path=""'));
    if(f.proname==='submit_result') assert(f.prosecdef&&!f.anon&&f.auth);
    else if(f.proname==='get_leaderboard_all') assert(f.prosecdef&&f.anon&&f.auth);
    else assert(!f.anon&&!f.auth);
  }
  assert.deepEqual(await query('select * from leaderboard_private.entries where id <= $1 order by id',[snapshot.at(-1).id]),snapshot,'old rows still untouched after new submissions');
  console.log('short rankings: raw storage, legacy preservation, SQL/JS parity, family board, seeds, paging and auth ok');
} finally { await db.close(); }
