// Synthetic in-memory contracts. PGlite has one connection: concurrent quota/device
// admission, merge-vs-delete, and merge-vs-retention need separate real-Postgres sessions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture } from '../supabase/tests/fixture.mjs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { newStats, endRun, payload } = await import('../src/game/stats.js');
const { makeDanceChart } = await import('../src/game/chart.js');
const songs = { 'mulassa-valls': JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url))), 'drac-valls': JSON.parse(readFileSync(new URL('../src/song-drac.json', import.meta.url))) };
const {db,q,as,player,migrate,uid,unlock} = await fixture();
const bucket='mulassa-valls/mulassa-v3/2', other='drac-valls/drac-v1/0';
const complete={runs:1,completed:1,collapsed:0,seconds:88,perfect:232,good:0,miss:8,
  guapa:10,guapaTotal:11,balloons:2,holds:4,bestCombo:200,bestStars:2,
  errors:{early:0,late:2,silent:6,both:0,hold:0,move:0},
  best:{score:100000,perfect:232,good:0,miss:8,maxCombo:200}};
const merge=(device,buckets,days=[])=>q('select public.merge_stats($1,$2::jsonb,$3::date[],auth.uid())',[device,JSON.stringify(buckets),days]);
const fail=(fn,msg)=>assert.rejects(fn,new RegExp(msg));
const relax=async id=>{
  await db.exec("reset role; update leaderboard_private.profiles set last_stats_at=clock_timestamp()-interval '61 seconds'; update leaderboard_private.player_devices set updated_at=clock_timestamp()-interval '61 seconds'");
  await as(id);
};
try {
  await migrate();
  // The game has been out a month: a first import's time budget starts at the first season's day (merge_stats).
  await db.exec("update leaderboard_private.seasons set starts_at='2026-09-21 00:00 Europe/Madrid' where id=1");
  // The REAL client payload (stats.js) of full completed runs of both actual songs, at their real length (flow.js caps a run at
  // song.end), on every level, must be accepted: 109.889 s once rounded to 110 and the server refused every upload after it.
  {
    const rules=await q("select figure_id,version,difficulty,judgments,max_score,guapa_count,balloon_count,hold_count from leaderboard_private.versions where duration_seconds is not null order by 1,2,3");
    assert(rules.some(r=>r.figure_id==='drac-valls')&&rules.some(r=>r.figure_id==='mulassa-valls'));
    // The per-run ceilings are the real charts' (chart.js), so a fully popped and held run is never refused.
    for(const r of rules){
      const chart=makeDanceChart(songs[r.figure_id],r.difficulty);
      assert.equal(r.judgments,chart.length+chart.filter(n=>n.end&&!n.balloon).length,`${r.figure_id}/${r.difficulty} judgments`);
      assert.equal(r.balloon_count,chart.filter(n=>n.balloon).length,`${r.figure_id}/${r.difficulty} balloons`);
      assert.equal(r.hold_count,chart.filter(n=>n.end&&!n.balloon).length,`${r.figure_id}/${r.difficulty} holds`);
    }
    const mine=await player(null);await as(mine);await q("select public.update_alias('RealRuns')");
    for(const runs of [1,3]){ // a second device: its own first import, so the elapsed-time budget is not the subject here
      const stats=newStats();
      for(const r of rules) for(let i=0;i<runs;i++) endRun(stats,'u',{kind:'end',date:'2026-10-20',figureId:r.figure_id,version:r.version,level:r.difficulty,
        seconds:songs[r.figure_id].end,counts:{perfect:r.judgments,good:0,miss:0},errors:{},guapa:r.guapa_count,guapaTotal:r.guapa_count,balloons:r.balloon_count,holds:r.hold_count,
        maxCombo:r.judgments,stars:3,score:r.max_score,quality:100});
      // the shortest real runs: a collapse a few seconds in (every judgment an error), a quit in the count-in (0 s), a tiny practice
      for(const r of rules){
        endRun(stats,'u',{kind:'collapse',date:'2026-10-20',figureId:r.figure_id,version:r.version,level:r.difficulty,seconds:3.9,
          counts:{perfect:0,good:1,miss:12},errors:{late:1,silent:12},guapa:0,guapaTotal:1,balloons:0,holds:0,maxCombo:0});
        endRun(stats,'u',{kind:'quit',date:'2026-10-20',figureId:r.figure_id,version:r.version,level:r.difficulty,seconds:0});
      }
      endRun(stats,'u',{kind:'practice',date:'2026-10-20',seconds:180.4});
      endRun(stats,'u',{kind:'practice',date:'2026-10-20',seconds:0.3});
      const p=payload(stats,'u');
      assert.equal(Object.keys(p.buckets).length,rules.length+1);
      await relax(mine);await merge(uid(),p.buckets,p.days);
    }
  }
  const a=await player(null),b=await player(null),device=uid(),second=uid();
  await as(a);await fail(()=>merge(device,{}),'leaderboard_auth_profile_missing');
  await q("select public.update_alias('StatsGuest')");
  await as(b);await q("select public.update_alias('StatsOther')");
  await as(a);
  // The owner the client built the counters for must be the session's: another tab's account switch between the client's check
  // and the signed request would otherwise credit A's numbers to B. Refused before anything is written (rate limit untouched).
  await fail(()=>q('select public.merge_stats($1,$2::jsonb,$3::date[],$4)',[device,JSON.stringify({practice:{runs:1,seconds:10}}),[],b]),'leaderboard_owner_mismatch');
  await fail(()=>q('select public.merge_stats($1,$2::jsonb,$3::date[],null)',[device,'{}',[]]),'leaderboard_owner_mismatch');
  assert.equal((await q('select * from public.my_stats()'))[0].buckets.practice,undefined,'nothing was written');
  // First import is unrestricted in elapsed hours but must be coherent with runs and chart duration.
  const imported={...complete,runs:10000,completed:10000,perfect:2320000,miss:80000,seconds:880000};
  await merge(device,{[bucket]:imported,practice:{runs:4,seconds:400}},['2026-10-20']);
  let own=(await q('select * from public.my_stats()'))[0];
  assert.equal(own.buckets[bucket].seconds,880000);assert.equal(Number(own.days_played),1);
  await fail(()=>merge(device,{[bucket]:imported}),'leaderboard_rate_limit');
  await relax(a);await merge(device,{[bucket]:imported,practice:{runs:4,seconds:400}},['2026-10-20']);
  assert.deepEqual((await q('select * from public.my_stats()'))[0],own,'retry neither duplicates counters nor days');
  await relax(a);await fail(()=>merge(device,{[bucket]:{runs:9999}}),'leaderboard_stats_decreased');
  await fail(()=>merge(device,{[bucket]:{surprise:1}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{runs:-1}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{seconds:1.5}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{runs:9007199254740992}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{runs:'10000'}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:null}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{errors:{privateEmail:1}}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{errors:{silent:0}}}),'leaderboard_stats_decreased');
  await fail(()=>merge(device,{'mulassa-valls/drac-v1/0':complete}),'leaderboard_invalid_bucket');
  await fail(()=>merge(device,{'mulassa-valls/mulassa-v3/03':complete}),'leaderboard_invalid_bucket');
  await fail(()=>merge(device,{'mulassa-valls/mulassa-v2-short/2':complete}),'leaderboard_invalid_bucket');
  // The PATCH can look reasonable but the resulting state must still account for all completed judgments.
  await fail(()=>merge(device,{[bucket]:{runs:10001,completed:10001}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{perfect:2320001}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{collapsed:1}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{guapa:12}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{guapaTotal:110001}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{bestCombo:241}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{bestStars:4}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{seconds:900000}}),'leaderboard_invalid_stats');
  // Per run, no more GLOBUS or MANTÉN than the chart has (2 and 5 on this level), no more errors than non-perfect judgments.
  await fail(()=>merge(device,{[bucket]:{balloons:20001}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{holds:50001}}),'leaderboard_invalid_stats');
  await fail(()=>merge(device,{[bucket]:{errors:{early:79993}}}),'leaderboard_invalid_stats');
  // Runs cost real time, even quit at once (1 s each): runs (shown on the public card) cannot jump with no time behind them.
  await fail(()=>merge(device,{[bucket]:{runs:10100}}),'leaderboard_stats_time_limit');
  await fail(()=>merge(device,{practice:{runs:9007199254740991,seconds:400}}),'leaderboard_stats_time_limit');
  await merge(device,{[bucket]:{balloons:20000,holds:50000,errors:{early:79992}}});
  await relax(a);
  for(const bad of [
    {...complete.best,score:193001}, {...complete.best,score:193000,perfect:1,miss:239,maxCombo:1},
    {...complete.best,perfect:233}, {...complete.best,maxCombo:233}, {...complete.best,user_id:a}
  ]) await fail(()=>merge(device,{[bucket]:{best:bad}}),'leaderboard_invalid_stats');
  // Later aggregate time growth includes a previously unseen bucket on the same imported device.
  await fail(()=>merge(device,{[other]:{runs:1,seconds:100}}),'leaderboard_stats_time_limit');
  // Two valid bucket increments must share one elapsed-time budget, not receive a budget each.
  await fail(()=>merge(device,{[other]:{runs:1,seconds:40},practice:{runs:5,seconds:440}}),'leaderboard_stats_time_limit');
  await merge(device,{[other]:{runs:1,seconds:30},practice:{runs:5,seconds:420}});
  await relax(a);
  // Whole best tuple wins by points, then quality. No per-field fabricated record.
  await merge(device,{[bucket]:{best:{score:110000,perfect:200,good:0,miss:40,maxCombo:100}}});
  own=(await q('select * from public.my_stats()'))[0];
  assert.deepEqual(own.buckets[bucket].best,{score:110000,perfect:200,good:0,miss:40,maxCombo:100});
  await relax(a);await merge(device,{[bucket]:{best:complete.best}});
  assert.deepEqual((await q('select * from public.my_stats()'))[0].buckets[bucket].best,own.buckets[bucket].best);
  // Collapse on the final note (all 240 judgments) and partial collapse both pass.
  await relax(a);await merge(second,{[bucket]:{...complete,completed:0,collapsed:1,best:null}},['2026-10-21']);
  own=(await q('select * from public.my_stats()'))[0];
  assert.equal(own.buckets[bucket].runs,10001);assert.equal(own.buckets[bucket].bestCombo,200);
  assert.equal(own.buckets[bucket].bestStars,2,'stars max, not summed');
  assert.equal(own.buckets[bucket].errors.silent,12);
  assert.equal(Number(own.days_played),2);assert.equal(own.longest_streak,2);
  await relax(a);await merge(uid(),{[bucket]:{runs:1,completed:0,collapsed:1,seconds:4,perfect:2,good:1,miss:8}});
  // Abandoned runs count time/runs but no judgments.
  await relax(a);await merge(uid(),{[bucket]:{runs:1,seconds:5}});
  // A first import's budget is the time since the first season's day: no device has played more than that.
  await relax(a);await fail(()=>merge(uid(),{[bucket]:{runs:3e9}}),'leaderboard_stats_time_limit');
  // Day bounds are checked inside the transaction, so invalid days cannot partially store counters/devices.
  await relax(a);
  for(const day of ['2026-01-01','2099-01-01',null,'infinity'])
    await fail(()=>merge(uid(),{},[day]),'leaderboard_invalid_day');
  await db.exec('reset role');
  assert.equal((await q('select count(*)::int n from leaderboard_private.player_devices where user_id=$1',[a]))[0].n,4);
  // An empty first import still consumes a device and closes its import window for new buckets.
  const empty=uid();await as(a);await merge(empty,{});
  await relax(a);await fail(()=>merge(empty,{[other]:{runs:1,seconds:100}}),'leaderboard_stats_time_limit');
  for(let i=0;i<3;i++){await relax(a);await merge(uid(),{});}
  await relax(a);await fail(()=>merge(uid(),{}),'leaderboard_device_limit');
  // Quotas are per profile, even when another device is used.
  await merge(device,{});await fail(()=>merge(second,{}),'leaderboard_rate_limit');
  // A -> B -> A: same device UUID has independent counters, practice and private dates per account.
  await as(b);await merge(device,{[bucket]:complete,practice:{runs:1,seconds:10}},['2026-10-20']);
  const bStats=(await q('select * from public.my_stats()'))[0];
  assert.equal(bStats.buckets[bucket].runs,1);assert.equal(bStats.buckets.practice.seconds,10);
  await as(a);own=(await q('select * from public.my_stats()'))[0];
  assert.equal(own.buckets[bucket].runs,10003);assert.equal(own.buckets.practice.seconds,420);
  assert.equal(own.days.length,2);assert.equal(bStats.days.length,1);
  // Public totals have no dates, device IDs, private practice or error taxonomy.
  await unlock();await as(a);
  await q("select * from public.submit_result('mulassa-v3',2,232,0,8,100000,200,'StatsGuest')");
  const profile=(await q('select * from public.my_profile()'))[0];
  await as(null,'anon');
  const card=(await q('select * from public.get_player_card($1,$2::smallint)',[profile.alias,profile.tag]))[0];
  assert.equal(card.totals[bucket].runs,10003);assert.equal(card.totals[bucket].errors,undefined);
  for(const k of ['perfect','good','miss','collapsed'])assert.equal(typeof card.totals[bucket][k],'number',`the card shows ${k} (decision 18, 2026-10-21)`);
  assert.equal(card.totals.practice,undefined);
  assert(!/user_id|device_id|first_at|updated_at|days|early|silent|example.invalid/.test(JSON.stringify(card)));
  // Retention cascades stats/devices/days and published entries; confirmed accounts never qualify.
  await db.exec('reset role');
  await q("update auth.users set created_at='2024-01-01',last_sign_in_at='2024-01-01' where id=$1",[a]);
  await q("update leaderboard_private.profiles set last_active_at='2024-01-01' where user_id=$1",[a]);
  assert.equal((await q('select leaderboard_private.purge_inactive_guests() n'))[0].n,1);
  for(const table of ['entries','player_stats','player_devices','player_days','profiles'])
    assert.equal((await q(`select count(*)::int n from leaderboard_private.${table} where user_id=$1`,[a]))[0].n,0);
  await as(a);await fail(()=>merge(device,{[bucket]:imported}),'leaderboard_auth_required');
  await as(b);assert.deepEqual((await q('select * from public.my_stats()'))[0],bStats,'deleting A preserves B');
  console.log('player stats: imports, monotonic merge, merged validation, whole records, last-note collapse, quotas, ownership, days, privacy, cascades OK');
} finally { await db.close(); }
