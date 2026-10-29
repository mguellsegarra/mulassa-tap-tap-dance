// Synthetic PGlite integration. Single connection cannot prove concurrent ensure_season,
// alias/tag retries, clean-name claims, Auth confirmation vs purge, or writers vs deletion.
// Run those with separate connections on real PostgreSQL before deployment.
import assert from 'node:assert/strict';
import { fixture, sql } from '../../supabase/tests/fixture.mjs';
import { VERSION_RULES } from '../../src/services/leaderboard-rules.js';
import { loadSong, loadDracSong, perfectMax, ceilingOf } from '../../tools/data/score-ceiling.mjs';
const { db,q,as,player,unlock,migrate,at } = await fixture();
const board = (v='mulassa-v2-short',s=null,offset=0,limit=50) => q('select * from public.get_leaderboard_all($1,$2,$3,$4,$5::smallint)',[v,'all',offset,limit,s]);
const submit = (v,alias,score=1000,d=0,perfect=null,miss=0) => q('select * from public.submit_result($1,$2,$3,0,$4,$5,$3,$6)',
  [v,d,perfect??({ 'mulassa-v2-short':[108,133,240], 'mulassa-v3':[108,133,240], 'drac-v1':[106,200,277] }[v][d]),miss,score,alias]);
const checkReject = async (fn, error) => assert.rejects(fn,new RegExp(error));
try {
  const old = await player('Historic'), verified = await player('Clean',{verified:true});
  await q(`insert into leaderboard_private.entries(user_id,version,difficulty,perfect,good,miss,score,max_combo)
    values($1,'mulassa-v2-short',0,108,0,0,1000,108)`,[old]);
  const before = await q('select * from leaderboard_private.entries order by id');
  await migrate();
  assert.deepEqual((await q('select * from leaderboard_private.entries order by id')).map(({season_id,...e})=>e),before);
  assert((await q('select season_id from leaderboard_private.entries')).every(e=>e.season_id===0));
  assert.equal((await q("select count(*)::int n from information_schema.columns where table_schema='leaderboard_private' and column_name in ('expires_at','notice_at')"))[0].n,0);
  for(const [version,song] of [['mulassa-v3',loadSong()],['drac-v1',loadDracSong()]]) {
    const rules=await q('select judgments,max_score,extras_max,duration_seconds,guapa_count from leaderboard_private.versions where version=$1 order by difficulty',[version]);
    assert.deepEqual(rules.map(r=>r.judgments),[0,1,2].map(d=>perfectMax(song,d).judgments));
    assert.deepEqual(rules.map(r=>r.max_score),[0,1,2].map(d=>ceilingOf(perfectMax(song,d).max)));
    assert.deepEqual(rules.map(r=>r.extras_max),[0,1,2].map(d=>ceilingOf(perfectMax(song,d).extras)));
    assert.deepEqual(rules.map(r=>r.judgments),VERSION_RULES[version].judgments);
    assert.deepEqual(rules.map(r=>r.max_score),VERSION_RULES[version].ceilings);
    assert.deepEqual(rules.map(r=>r.extras_max),VERSION_RULES[version].extras);
    assert(rules.every(r=>Number(r.duration_seconds)===song.end));
  }
  // One signature each; old named/positional calls still resolve without PostgREST ambiguity.
  assert.equal((await q("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and proname='submit_result'"))[0].n,1);
  assert.equal((await q("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and proname='get_leaderboard_all'"))[0].n,1);
  await as(old);
  let legacy=await q("select * from public.get_leaderboard_all('mulassa-v2-short','all',0,50)");
  assert.equal(legacy[0].season_id,0);
  assert.deepEqual(Object.keys(legacy[0]),['position','alias','difficulty','quality','score','max_combo','is_self','total','verified','season_id','public_id','released']);
  assert.equal(legacy[0].alias,'Historic','no tag, ever');
  const raw=(await q('select public.my_alias() alias'))[0].alias;
  assert.equal(raw,'Historic');
  assert.equal((await submit('mulassa-v2-short',raw,1100)).length,1);
  assert.equal((await q('select * from public.my_profile()'))[0].released,false);
  await unlock();await as(old);
  assert.equal((await submit('mulassa-v3',raw,3000))[0].improved,true);
  await unlock();await as(old);
  assert.equal((await submit('mulassa-v3',raw,2000))[0].improved,false);
  assert.equal((await board('mulassa-v3'))[0].season_id,1);
  assert.equal((await board('drac-v1')).length,0);
  await unlock();await as(old); await submit('drac-v1',raw,8000);
  assert.equal((await board('drac-v1'))[0].score,8000);
  assert.equal((await board('mulassa-v3'))[0].score,3000);
  // get_level_podium (202610210001): one level's own ranking. Tercer's best is NORMAL (one row on the joint board, at
  // NORMAL) yet their FACIL result still ranks on FACIL's podium, which the joint board cannot show.
  const third=await player('Tercer');
  await as(third); await submit('mulassa-v3','Tercer',5000,1);
  await unlock(); await as(third); await submit('mulassa-v3','Tercer',2500,0);
  await as(old);
  assert.deepEqual((await board('mulassa-v3')).map(r=>[r.alias,r.difficulty]),[['Tercer',1],['Historic',0]]);
  const podium=d=>q('select * from public.get_level_podium($1,$2)',['mulassa-v3',d]);
  const easy=await podium(0);
  assert.deepEqual(easy.map(r=>[Number(r.position),r.alias,r.is_self,Number(r.total)]),[[1,'Historic',true,2],[2,'Tercer',false,2]]);
  assert.equal(easy[0].score,3000);
  assert.deepEqual((await podium(1)).map(r=>r.alias),['Tercer']);
  assert.equal((await podium(2)).length,0,'nobody on DIFICIL');
  await checkReject(()=>podium(7),'leaderboard_invalid_version');
  await db.exec('reset role'); // Tercer leaves: the checks below count the boards as they were
  for(const t of ['leaderboard_private.entries','leaderboard_private.profiles']) await q(`delete from ${t} where user_id=$1`,[third]);
  await q('delete from auth.users where id=$1',[third]); await as(old);
  await checkReject(()=>q("select * from public.get_leaderboard_all('mulassa-v3','week')"),'leaderboard_invalid_period');
  await checkReject(()=>board('bad'),'leaderboard_invalid_version');
  await checkReject(()=>board('mulassa-v3',99),'leaderboard_invalid_season');
  // Calendar boundaries in Madrid, DST offsets, and missing quarters filled on demand.
  await db.exec('reset role');
  const seasonAt = async t => (await q('select leaderboard_private.ensure_season($1::timestamptz) id',[t]))[0].id;
  assert.equal(await seasonAt('2026-12-31 23:59:59 Europe/Madrid'),1);
  assert.equal(await seasonAt('2027-01-01 00:00:00 Europe/Madrid'),2);
  assert.equal(await seasonAt('2027-07-01 00:00:00 Europe/Madrid'),4);
  assert.equal(await seasonAt('2027-04-01 00:00:00 Europe/Madrid'),3,'gap filled after a later quarter exists');
  // An existing season is read without the calendar lock: every board read and submit calls this, and the lock
  // would last for the caller's whole transaction (one open read blocked every submit on real PostgreSQL).
  const seasonLock = async t => (await q(`select leaderboard_private.ensure_season($1::timestamptz) id,
    (select count(*)::int from pg_locks where locktype='advisory' and classid=18101 and pid=pg_backend_pid()) locks`,[t]))[0];
  await db.exec('begin');
  assert.deepEqual(await seasonLock('2027-01-02 00:00:00 Europe/Madrid'),{ id:2, locks:0 });
  assert.deepEqual(await seasonLock('2027-10-01 00:00:00 Europe/Madrid'),{ id:5, locks:1 },'creating a season still takes it');
  await db.exec('rollback');
  const spring=(await q('select starts_at,ends_at,name from leaderboard_private.seasons where id=3'))[0];
  assert.equal(new Date(spring.starts_at).toISOString(),'2027-03-31T22:00:00.000Z');
  assert.equal(spring.name,'Primavera 2027');
  assert.equal(await seasonAt('2027-03-28 01:59:59 Europe/Madrid'),2);
  assert.equal(await seasonAt('2027-03-28 03:00:00 Europe/Madrid'),2);
  await checkReject(()=>q("insert into leaderboard_private.seasons values(99,'Overlap','2027-01-02','2027-02-01')"),'conflicting key');
  await checkReject(()=>board('mulassa-v3',2),'leaderboard_invalid_season');
  await at('2026-12-31 23:59:59 Europe/Madrid');await unlock();await as(old);
  assert.equal((await submit('mulassa-v3',raw,4000))[0].score,4000);
  await at('2027-01-01 00:00:00 Europe/Madrid');await unlock();await as(old);
  const result=await submit('mulassa-v3',raw,1500);
  assert.equal(result.length,1);assert.equal(result[0].score,1500,'return is the new season, not previous best');
  assert.equal((await board('mulassa-v3'))[0].score,1500);
  assert.equal((await board('mulassa-v3',1))[0].score,4000);
  await unlock();await as(old);await submit('mulassa-v2-short',raw,1200);
  assert.equal((await board())[0].season_id,0,'retired versions still accept publication months later');
  await at('2028-01-01 00:00 Europe/Madrid');await as(null,'anon');
  assert.deepEqual(await board('drac-v1'),[],'first anonymous reader creates empty season');
  await db.exec('reset role');assert.equal((await q('select count(*)::int n from leaderboard_private.seasons where id=6'))[0].n,1);
  // Retirement at a boundary records the PREVIOUS season; later publication never recalculates it.
  await q("update leaderboard_private.versions set retired_at='2027-01-01 00:00 Europe/Madrid',retired_season_id=1 where version='mulassa-v3'");
  assert.equal((await q("select leaderboard_private.season_for('mulassa-v3') id"))[0].id,1);
  await q("update leaderboard_private.versions set retired_at=null,retired_season_id=null where version='mulassa-v3'");
  // Rerun after the first season has ended; 202610280002 changed the board's columns, so it goes first and again after.
  await db.exec('drop function public.get_leaderboard_all(text,text,integer,integer,smallint)');
  await db.exec(sql('202610200002_seasons.sql'));await db.exec(sql('202610280002_reusable_guest_names.sql'));
  await at('2026-11-15 12:00 Europe/Madrid');
  // Seed phase-out is scoped to both family and season, and counts users rather than rows.
  const seedA=await player('SeasonSeedA',{seed:true}),seedB=await player('SeasonSeedB',{seed:true});
  const real=await player('SeasonReal');
  const put=async(id,version,season,score,d=1)=>q(`insert into leaderboard_private.entries
    (user_id,season_id,version,difficulty,perfect,good,miss,score,max_combo)
    select $1,$2,version,difficulty,judgments,0,0,$3,judgments from leaderboard_private.versions where version=$4 and difficulty=$5`,
    [id,season,score,version,d]);
  await put(seedA,'mulassa-v2-short',0,500);await put(seedB,'mulassa-v2-short',0,600);
  await put(real,'mulassa-v3',1,1000);
  const visibleSeeds=async()=>Number((await q(`select count(*) n from leaderboard_private.visible_entries('mulassa-v1',0::smallint) e
    join leaderboard_private.profiles p using(user_id) where p.is_seed`))[0].n);
  assert.equal(await visibleSeeds(),2,'new-family player does not hide old-family seeds');
  await put(real,'mulassa-v2-short',1,1000);
  assert.equal(await visibleSeeds(),2,'another season does not hide old seeds');
  await put(real,'mulassa-v2-short',0,1000);await put(real,'mulassa-v1',0,1000);
  assert.equal(await visibleSeeds(),1,'two comparable versions count as one real player');
  await put(seedA,'mulassa-v3',1,5000);
  assert(!(await board('mulassa-v3')).some(r=>r.alias.startsWith('SeasonSeed')),'no seeds outside season zero');
  await q('delete from auth.users where id=any($1::uuid[])',[[seedA,seedB,real]]);
  // Pagination and self neighbours share the exact same ranked set.
  const pagePlayers=[];
  for(let i=0;i<55;i++) {const id=await player(`PageSeason${i}`);pagePlayers.push(id);await put(id,'mulassa-v3',1,100+i,0);}
  await as(null,'anon');const pages=[];
  for(let offset=0;;offset+=7){const part=await board('mulassa-v3',1,offset,7);pages.push(...part);if(part.length<7)break;}
  assert.equal(new Set(pages.map(r=>r.alias)).size,pages.length);
  assert(pages.every((r,i)=>Number(r.position)===i+1&&Number(r.total)===pages.length));
  await as(pagePlayers[0]);const withMe=await board('mulassa-v3',1,0,3);
  assert(withMe.some(r=>r.is_self));assert(withMe.length<=14);
  await db.exec('reset role');await q('delete from auth.users where id=any($1::uuid[])',[pagePlayers]);
  // A newer family in the same season gets a separate live board and marks the old dance.
  await q(`insert into leaderboard_private.versions(version,difficulty,judgments,max_score,extras_max,figure_id,introduced_at)
    values('mulassa-test-next',0,108,109000,50000,'mulassa-valls','2026-11-01')`);
  await q(`insert into leaderboard_private.entries(user_id,season_id,version,difficulty,perfect,good,miss,score,max_combo)
    values($1,1,'mulassa-test-next',0,108,0,0,9999,108)`,[old]);
  await as(old);
  let history=await q("select * from public.get_seasons('mulassa-valls')");
  assert(history.some(h=>h.season_id===0));
  assert.equal(history.filter(h=>h.season_id===1).length,2);
  assert.equal(history.find(h=>h.version==='mulassa-v3').previous_dance,true);
  assert.equal(history.find(h=>h.version==='mulassa-test-next').previous_dance,false);
  assert(history.every(h=>Number(h.my_position)===1));
  assert.deepEqual([history.find(h=>h.version==='mulassa-test-next')].map(h=>[h.my_score,h.my_difficulty]),[[9999,0]],'the caller\'s own points and level');
  await as(null,'anon');
  assert((await q("select * from public.get_seasons('mulassa-valls')")).every(h=>h.my_position==null&&h.my_score==null&&h.my_difficulty==null),'nobody signed in: no place, no points');
  await as(old);
  // One name per ACTIVE profile (202610280002): a guest 30 days idle loses its name to whoever asks; nobody else does.
  const a=await player(null),b=await player(null),c=await player(null);
  await as(a);await submit('mulassa-v3','Shared',2222);
  await as(b);await checkReject(()=>q("select public.update_alias('Shared')"),'leaderboard_alias_taken');
  await checkReject(()=>q("select public.update_alias('Shàred')"),'leaderboard_alias_taken');
  await checkReject(()=>q("select public.update_alias('Clean')"),'leaderboard_alias_taken');
  const idle=async(id,days)=>{await db.exec('reset role');
    await q(`update auth.users set created_at=now()-make_interval(days=>$2),last_sign_in_at=null where id=$1`,[id,days]);
    await q(`update leaderboard_private.profiles set last_active_at=now()-make_interval(days=>$2) where user_id=$1`,[id,days]);};
  await idle(a,29);await as(b);await checkReject(()=>q("select public.update_alias('Shared')"),'leaderboard_alias_taken');
  await idle(verified,900);await as(b);await checkReject(()=>q("select public.update_alias('Clean')"),'leaderboard_alias_taken');
  await idle(a,31);await as(b);assert.equal((await q("select public.update_alias('Shared') a"))[0].a,'Shared');
  await as(a);let mine=(await q('select * from public.my_profile()'))[0];
  assert.deepEqual([mine.alias,mine.released],['Shared',true],'the old holder keeps its text, released');
  assert.equal((await q('select * from public.my_profile()'))[0].released,true,'reading never takes the name back');
  let rows=(await board('mulassa-v3')).filter(r=>r.alias==='Shared');
  assert.deepEqual(rows.map(r=>r.released),[true],'its result stays, marked released');
  await unlock();await as(a);await checkReject(()=>submit('mulassa-v3','Shared',2300),'leaderboard_alias_taken');
  assert.equal((await submit('mulassa-v3','Tornat',2300))[0].score,2300,'a released profile publishes under a new name');
  mine=(await q('select * from public.my_profile()'))[0];assert.deepEqual([mine.alias,mine.released],['Tornat',false]);
  // An old tab sends the name it stored: never a rename, never a claim.
  await unlock();await as(b);await submit('mulassa-v3','Tornat',1000);
  assert.equal((await q('select public.my_alias() a'))[0].a,'Shared');
  // A released profile whose name is still free gets it back by publishing.
  await idle(b,40);await as(c);await q("select public.update_alias('Shared2')");
  await db.exec('reset role');await q('update leaderboard_private.profiles set released_at=now() where user_id=$1',[b]);
  await unlock();await as(b);await submit('mulassa-v3','Shared',1100);
  assert.equal((await q('select * from public.my_profile()'))[0].released,false);
  await unlock();await as(a);await checkReject(()=>q("select public.update_alias('Name#1234')"),'leaderboard_invalid_alias');
  await as(verified);await q("select public.choose_verified_alias('FreeName')");
  assert.deepEqual((await q('select alias,verified,released from public.my_profile()'))[0],{alias:'FreeName',verified:true,released:false});
  await unlock();await as(verified);await submit('mulassa-v2-short','FreeName',1000);
  const ids=new Set((await board('mulassa-v3')).map(r=>r.public_id));assert.equal(ids.size,(await board('mulassa-v3')).length);
  // Public cards need a publication and expose no private identifiers/addresses/days/error breakdowns.
  await db.exec('reset role');
  const pid=async id=>(await q('select public_id from leaderboard_private.profiles where user_id=$1',[id]))[0].public_id;
  const [aId,cId,vId]=[await pid(a),await pid(c),await pid(verified)];
  await as(null,'anon');assert.deepEqual(await q('select * from public.get_player_card($1::uuid)',[cId]),[],'unpublished profile is private');
  const card=await q('select * from public.get_player_card($1::uuid)',[vId]);assert.equal(card.length,1);
  assert.deepEqual([card[0].alias,card[0].released],['FreeName',false]);
  assert.equal((await q('select * from public.get_player_card($1::uuid)',[aId]))[0].alias,'Tornat','by id, never by name');
  const publicJson=JSON.stringify([...card,...await board(),...await q("select * from public.get_seasons('mulassa-valls')")]);
  assert(!/user_id|device_id|email|example.invalid|errors|first_at|updated_at/.test(publicJson));
  for(const table of ['seasons','profiles','entries','player_stats','player_devices','player_days'])
    await checkReject(()=>q(`select * from leaderboard_private.${table}`),'permission denied');
  await checkReject(()=>submit('mulassa-v3','Denied'),'permission denied');
  await checkReject(()=>q("select public.merge_stats('00000000-0000-4000-8000-000000000001','{}','{}',null)"),'permission denied');
  await checkReject(()=>q('select * from public.my_stats()'),'permission denied');
  await db.exec('reset role');
  const privateFns=await q(`select proname,proconfig,has_function_privilege('anon',oid,'execute') a,
    has_function_privilege('authenticated',oid,'execute') b from pg_proc where pronamespace='leaderboard_private'::regnamespace`);
  assert(privateFns.every(f=>!f.a&&!f.b&&String(f.proconfig).includes('search_path=""')));
  const publicFns=await q(`select proname,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace`);
  assert(publicFns.every(f=>f.prosecdef&&String(f.proconfig).includes('search_path=""')));
  // Nothing deletes an idle profile any more: its results stay in every season.
  assert.equal((await q("select count(*)::int n from pg_proc where proname in ('purge_inactive_guests','leaderboard_expired_players','check_alias_free')"))[0].n,0);
  assert.equal((await q("select count(*)::int n from information_schema.columns where table_schema='leaderboard_private' and table_name='profiles' and column_name='tag'"))[0].n,0);
  history=await q("select * from public.get_seasons('mulassa-valls')");
  assert(history.every(h=>h.podium.every(p=>p.public_id&&typeof p.released==='boolean'&&!('tag' in p))));
  console.log('seasons/names: migration preservation, old RPCs, calendar/DST/gaps, retirement, families, reusable names, cards by id, privacy, no idle deletion OK');
} finally { await db.close(); }
