import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../src/game/chart.js';
import { LEADERBOARD_VERSION, EXPECTED_JUDGMENTS, VERSION_RULES, normalizeAlias, snapshotResult, validResult } from '../src/services/leaderboard-rules.js';
import { createLeaderboardService, displayName, baseName, rememberIdentity, TAG_KEY, FIGURE_VERSIONS } from '../src/services/leaderboard.js';
import { captureLeaderboardResult, clearLeaderboardResult, getLeaderboardResult, subscribeLeaderboardResult, markLeaderboardDebugUse } from '../src/services/leaderboard-result.js';
import { v1Song } from './v1-song.mjs';
const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
const judgedIn = chart => chart.reduce((sum,n) => sum + 1 + (n.end && !n.balloon ? 1 : 0),0);
for (let d = 0; d < 3; d++) assert.equal(judgedIn(makeDanceChart(v1Song, d)), VERSION_RULES['mulassa-v1'].judgments[d], 'chart changes require a new leaderboard version');
// the local trial's short chart is not mulassa-v1: not one of its runs, however good, makes a result to publish
for (let d = 0; d < 3; d++) {
  const n = judgedIn(makeDanceChart(song, d));
  assert.equal(n, EXPECTED_JUDGMENTS[d], 'the short chart has its own contract');
  const result = snapshotResult({ diff: d, counts: { perfect: n, good: 0, miss: 0 }, score: 1000, maxCombo: n }, { reason: 'end', query: new URLSearchParams() });
  assert.equal(result.version, LEADERBOARD_VERSION);
  assert(!validResult({ ...result, version: 'mulassa-v1' }), 'short counts cannot be relabelled as v1');
}
// the Drac publishes to its own board, with its own counts, and only as the Drac
for (const d of [0, 1, 2]) {
  const n = VERSION_RULES['drac-v1'].judgments[d], drac = { figureId: 'drac-valls', figureVersion: 'drac-v1', diff: d, counts: { perfect: n, good: 0, miss: 0 }, score: 1000, maxCombo: n };
  const r = snapshotResult(drac, { reason: 'end', query: new URLSearchParams() });
  assert.equal(r.version, 'drac-v1');
  assert.equal(snapshotResult({ ...drac, figureId: 'mulassa-valls' }, { reason: 'end', query: new URLSearchParams() }), null, 'the Drac’s version is not the Mulassa’s figure');
  assert.equal(snapshotResult({ ...drac, practice: {} }, { reason: 'end', query: new URLSearchParams() }), null);
  assert.equal(snapshotResult(drac, { reason: 'end', query: new URLSearchParams('autoplay') }), null);
}
assert.equal(snapshotResult({ figureId: 'mulassa-valls', figureVersion: 'mulassa-v2-short', diff: 0, counts: { perfect: 108, good: 0, miss: 0 }, score: 1, maxCombo: 1 }, { reason: 'end', query: new URLSearchParams() }), null);
assert.equal(normalizeAlias('  A\u0300necd’Òdena '), 'Ànecd’Òdena'); assert.equal(normalizeAlias('Ànec d’Òdena'), null, 'no spaces');
for (const a of ['x','<script>','a@example.com','🎮🎮','a'.repeat(21)]) assert.equal(normalizeAlias(a), null);
const game = { diff:0, counts:{ perfect:70,good:20,miss:18 },score:54321,maxCombo:50 };
const clean = snapshotResult(game,{reason:'end',query:new URLSearchParams()});
assert(clean && Object.isFrozen(clean) && Object.isFrozen(clean.counts));
game.counts.perfect = 1; assert.equal(clean.counts.perfect,70); game.counts.perfect = 70;
for (const q of ['autoplay','from=0','from=50','view=front','perf']) assert.equal(snapshotResult(game,{reason:'end',query:new URLSearchParams(q)}),null);
assert(snapshotResult(game,{reason:'end',query:new URLSearchParams('mute&offset=60')}));
assert.equal(snapshotResult(game,{reason:'collapse',query:new URLSearchParams()}),null);
assert.equal(snapshotResult({...game,practice:{}},{reason:'end',query:new URLSearchParams()}),null);
assert.equal(snapshotResult(game,{reason:'end',query:new URLSearchParams(),debugUsed:true}),null);
assert(validResult({...clean,counts:{perfect:20,good:50,miss:38}}),'under 70% finished runs may publish');
assert(!validResult({...clean,maxCombo:91}));
assert(!validResult({...clean,counts:{perfect:70,good:20,miss:17}}));
assert(!validResult({...clean,score:NaN}));
let observed;
const off = subscribeLeaderboardResult(r => { observed=r; });
captureLeaderboardResult(game,'end',new URLSearchParams()); assert.equal(observed.score,54321);
clearLeaderboardResult(); assert.equal(getLeaderboardResult(),null);
markLeaderboardDebugUse(); assert.equal(captureLeaderboardResult(game,'end',new URLSearchParams()),null); off();

let auth=null, log=[], deferred;
const client = {
  auth:{ getSession:async()=>({data:{session:auth}}), signInAnonymously:async args=>{log.push(['signup',args]); auth={access_token:'test-only'};return {data:{session:auth}};},signOut:async()=>{auth=null;return {};} },
  rpc:async(name,args)=>{log.push([name,args]); if(deferred) await deferred; return {data:name==='submit_result'?[{improved:true,quality:90,score:54321}]:[]};},
  functions:{invoke:async(name,args)=>{log.push([name,args]);return {data:{deleted:true}};}},
};
const service=createLeaderboardService({configured:true,publishingEnabled:true,captchaRequired:true,getClient:async()=>client});
await service.listAll(); assert.equal(auth,null,'public reading does not create a player'); assert.deepEqual(log.at(-1),['get_leaderboard_all',{p_version:LEADERBOARD_VERSION,p_period:'all',p_offset:0,p_limit:50}],'the joint board: every level, all time, the first page');
await service.listAll({offset:100,limit:500}); assert.deepEqual(log.at(-1),['get_leaderboard_all',{p_version:LEADERBOARD_VERSION,p_period:'all',p_offset:100,p_limit:50}],'a later page; at most 50 a call');
await service.listAll({offset:-3,limit:0}); assert.deepEqual(log.at(-1)[1].p_offset,0);
await service.levelPodium({figure:'drac-valls',level:2}); assert.deepEqual(log.at(-1),['get_level_podium',{p_version:FIGURE_VERSIONS['drac-valls'],p_difficulty:2}],'one level of the figure\'s own board');
{ const c3={...client,rpc:async()=>({data:null,error:{message:'boom'},status:500})};
  await assert.rejects(createLeaderboardService({configured:true,publishingEnabled:false,captchaRequired:true,getClient:async()=>c3}).listAll(),{code:'server',detail:'rpc:Error:500'},'the server answered with an error: not «connectar»');
  const c4={...client,rpc:async()=>({data:null,error:{message:'TypeError: Failed to fetch',details:'',hint:'',code:''},status:0})};
  await assert.rejects(createLeaderboardService({configured:true,publishingEnabled:false,captchaRequired:true,getClient:async()=>c4}).listAll(),{code:'unavailable'},'no answer at all is a connection problem');
}
// 2026-09-28: production lacked check_alias_free, so submit_result failed with 42883 (PostgREST 404) and the player read
// «No s'ha pogut connectar». A server-side refusal is 'server', with the codes (never the text) in `detail` for Sentry.
{ let session=null;
  const c5={auth:{getSession:async()=>({data:{session}}),signInAnonymously:async()=>({data:{session:null},error:null})},
    rpc:async()=>({data:null,error:{message:'function leaderboard_private.check_alias_free(text, uuid) does not exist',details:null,hint:'No function matches',code:'42883'},status:404})};
  const svc=createLeaderboardService({configured:true,publishingEnabled:true,captchaRequired:true,getClient:async()=>c5});
  session={access_token:'test-only'};
  await assert.rejects(svc.publish(clean,'mguellsegarra'),e=>e.code==='server' && e.detail==='rpc:42883:404' && !/connectar/.test(e.message) && !e.detail.includes('check_alias'));
  // Supabase Auth refusals (supabase-js AuthApiError shapes): the anonymous sign-in with the Turnstile token
  session=null;
  const authFail=(name,code,status,message)=>{c5.auth.signInAnonymously=async()=>({data:{session:null},error:Object.assign(new Error(message),{name,code,status})});};
  for (const [name,code,status,message,want] of [
    ['AuthApiError','captcha_failed',400,'captcha protection: request disallowed (timeout-or-duplicate)','captcha_failed'],
    ['AuthApiError','anonymous_provider_disabled',422,'Anonymous sign-ins are disabled','closed'],
    ['AuthApiError','over_request_rate_limit',429,'Request rate limit reached','rate_limit'],
    ['AuthApiError','unexpected_failure',500,'Internal Server Error','server'],
    ['AuthRetryableFetchError',undefined,0,'Failed to fetch','unavailable']]) {
    authFail(name,code,status,message);
    await assert.rejects(svc.publish(clean,'mguellsegarra',{captchaToken:'t'}),e=>e.code===want && e.detail===`auth:${code??name}:${status}`,`${code??name} → ${want}`);
  }
}
await assert.rejects(service.publish(clean,'Ànec'),{code:'captcha'});
assert.equal(log.filter(x=>x[0]==='signup').length,0);
assert.equal((await service.publish(clean,'Ànec',{captchaToken:'test-token'})).improved,true);
assert.equal(log.find(x=>x[0]==='signup')[1].options.captchaToken,'test-token');
await service.publish(clean,'Ànec'); assert.equal(log.filter(x=>x[0]==='signup').length,1);
{ const c5={...client,rpc:async(name,args)=>{log.push([name,args]);return {data:args.p_alias};}}; let a5=null; c5.auth={...client.auth,getSession:async()=>({data:{session:a5}}),signInAnonymously:async()=>{a5={};return {data:{session:a5}};}};
  const s5=createLeaderboardService({configured:true,publishingEnabled:true,captchaRequired:true,getClient:async()=>c5});
  await assert.rejects(s5.createProfile('a b'),{code:'invalid'}); await assert.rejects(s5.createProfile('Novell'),{code:'captcha'});
  assert.equal(await s5.createProfile(' Novell ',{captchaToken:'t'}),'Novell','«Crea»: a session and a nickname, no result'); assert.deepEqual(log.at(-1),['update_alias',{p_alias:'Novell'}]);
}
let resolve; deferred=new Promise(r=>{resolve=r;});
const pending=service.publish(clean,'Ànec'); await assert.rejects(service.publish(clean,'Ànec'),{code:'busy'}); resolve(); await pending; deferred=null;
await assert.rejects(service.publish({...clean,score:-1},'Ànec'),{code:'invalid'});
client.rpc=async()=>({error:{message:'leaderboard_rate_limit'}});
await assert.rejects(service.publish(clean,'Ànec'),{code:'rate_limit'});
client.rpc=async()=>({error:{message:'leaderboard_alias_taken',code:'23505'}});
await assert.rejects(service.publish(clean,'Ànec'),{code:'taken',message:'Aquest sobrenom ja és d’algú. Prova’n un altre.'});
client.rpc=async()=>({error:{message:'leaderboard_score_ceiling',code:'22023'}}); // 0015: more than a perfect run
await assert.rejects(service.publish(clean,'Ànec'),{code:'ceiling',message:'Aquesta puntuació supera el màxim possible del nivell i no es pot publicar.'});
client.rpc=async()=>({error:{message:'leaderboard_invalid_alias_blocked',code:'22023'}}); // the server's lists drifted from the client's
await assert.rejects(service.publish(clean,'Ànec'),{code:'blocked',message:'Aquest sobrenom no es pot fer servir. Tria’n un altre.'});
client.rpc=async()=>{throw new Error('private-detail');};
await assert.rejects(service.listAll(),e=>e.code==='unavailable' && !e.message.includes('private-detail'));
const readonly=createLeaderboardService({configured:true,publishingEnabled:false,captchaRequired:true,getClient:async()=>client});
await assert.rejects(readonly.publish(clean,'Ànec'),{code:'disabled'});
await readonly.deleteProfile(); assert.equal(auth,null,'deletion remains available when publication is off');
const absent=createLeaderboardService({configured:false,publishingEnabled:false,getClient:()=>{throw new Error('must not load');}});
await assert.rejects(absent.listAll(),{code:'disabled'});
// Recovery by e-mail code: attach the address to this browser's profile; if it already owns one, sign in to that instead.
{ const calls=[]; let session={user:{}}, updateError=null, otpError=null, verifyError=null;
  const c6={auth:{getSession:async()=>({data:{session}}),
    updateUser:async a=>{calls.push(['update',a]);return {error:updateError};},
    signInWithOtp:async a=>{calls.push(['otp',a]);return {error:otpError};},
    verifyOtp:async a=>{calls.push(['verify',a]);return {error:verifyError};}}};
  const svc=createLeaderboardService({configured:true,publishingEnabled:true,captchaRequired:true,getClient:async()=>c6});
  await assert.rejects(svc.sendCode('nope'),{code:'email'});
  assert.deepEqual(await svc.sendCode('a@b.cat'),{type:'email_change'}); assert.deepEqual(calls.at(-1),['update',{email:'a@b.cat'}],'a guest profile here: the address goes on it');
  updateError=Object.assign(new Error('x'),{code:'email_exists',status:422});
  await assert.rejects(svc.sendCode('a@b.cat'),{code:'captcha'},'the address owns a profile: signing in needs a Turnstile token');
  assert.deepEqual(await svc.sendCode('a@b.cat',{captchaToken:'t'}),{type:'email'}); assert.deepEqual(calls.at(-1),['otp',{email:'a@b.cat',options:{shouldCreateUser:false,captchaToken:'t'}}],'never creates a profile');
  updateError=Object.assign(new Error('x'),{code:'over_email_send_rate_limit',status:429});
  await assert.rejects(svc.sendCode('a@b.cat'),{code:'rate_limit'});
  updateError=null; session=null; otpError=Object.assign(new Error('x'),{code:'otp_disabled',status:422});
  await assert.rejects(svc.sendCode('a@b.cat',{captchaToken:'t'}),{code:'noprofile'},'no session here and no profile for the address');
  await assert.rejects(svc.verifyCode('a@b.cat','12345','email'),{code:'code'}); await assert.rejects(svc.verifyCode('a@b.cat','123456','x'),{code:'code'});
  assert.deepEqual(await svc.verifyCode('a@b.cat',' 123 456 ','email'),{email:'a@b.cat'}); assert.deepEqual(calls.at(-1),['verify',{email:'a@b.cat',token:'123456',type:'email'}]);
  verifyError=Object.assign(new Error('x'),{code:'otp_expired',status:403});
  await assert.rejects(svc.verifyCode('a@b.cat','123456','email'),{code:'code'});
}
{ let out=0; const c7={auth:{signOut:async a=>{out=a;return {error:null};}}};
  const svc=createLeaderboardService({configured:true,publishingEnabled:false,captchaRequired:true,getClient:async()=>c7});
  assert.deepEqual(await svc.signOut(),{signedOut:true}); assert.deepEqual(out,{scope:'local'},'this browser only; also with publishing off');
}
// 202610180001: the account behind a still-valid token was purged (its 7 days ran out): the write is refused as no
// player, and this browser leaves that session so the next try signs in to a new profile; other refusals keep it
{ let session={access_token:'test-only'}, outs=0, refuse='leaderboard_auth_required';
  const c8={auth:{getSession:async()=>({data:{session}}),signOut:async()=>{outs++;session=null;return {error:null};}},
    rpc:async()=>({data:null,error:{message:refuse,code:'28000'},status:400})};
  const svc=createLeaderboardService({configured:true,publishingEnabled:true,captchaRequired:false,getClient:async()=>c8});
  const run={version:LEADERBOARD_VERSION,difficulty:0,counts:{perfect:EXPECTED_JUDGMENTS[0],good:0,miss:0},score:1000,maxCombo:EXPECTED_JUDGMENTS[0]};
  await assert.rejects(svc.publish(run,'Novell'),{code:'session'}); assert(outs===1 && session===null,'purged: the session goes');
  session={access_token:'test-only'}; await assert.rejects(svc.createProfile('Novell'),{code:'session'}); assert.equal(outs,2,'«Crea» too');
  session={access_token:'test-only'}; refuse='leaderboard_rate_limit';
  await assert.rejects(svc.publish(run,'Novell'),{code:'rate_limit'}); assert(outs===2 && session,'any other refusal keeps it');
}

// 202610200001..4 — guests, seasons, statistics, history: the RPCs the client calls and what it sends and reads back
{ const log = []; let answer = [], failWith = null, session = { user: { id: 'u-1' } };
  const c = { auth: { getSession: async () => ({ data: { session } }), signOut: async a => { log.push(['signOut', a]); session = null; return { error: null }; } },
    rpc: async (name, args) => { log.push([name, args]); return failWith ? { data: null, error: failWith, status: 400 } : { data: answer }; } };
  const svc = createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c });
  const events = []; svc.onAccount(e => events.push(e));
  const last = () => log.at(-1);
  // names: the stored alias never carries the tag
  assert.equal(displayName('Timbaler', 3821), 'Timbaler#3821'); assert.equal(displayName('Timbaler', 7), 'Timbaler#0007'); assert.equal(displayName('Timbaler', null), 'Timbaler');
  assert.equal(displayName('Timbaler', undefined), 'Timbaler'); assert.equal(displayName('Timbaler', 10000), 'Timbaler');
  assert.equal(baseName('Timbaler#0007', 7), 'Timbaler'); assert.equal(baseName('Timbaler', null), 'Timbaler'); assert.equal(baseName('Timbaler#0007', null), 'Timbaler#0007');
  { const kv = new Map(), store = { set: (k, v) => kv.set(k, v), remove: k => kv.delete(k) };
    rememberIdentity(store, 'leaderboard-alias', { alias: 'Timbaler#3821', tag: 3821 }); assert.equal(kv.get('leaderboard-alias'), 'Timbaler'); assert.equal(kv.get(TAG_KEY), '3821');
    rememberIdentity(store, 'leaderboard-alias', { alias: 'Timbaler', tag: null }); assert.equal(kv.get('leaderboard-alias'), 'Timbaler'); assert(!kv.has(TAG_KEY), 'a clean name has no tag'); }
  // boards: a version or a figure, a season only when asked
  await svc.listAll({ figure: 'drac-valls' }); assert.deepEqual(last(), ['get_leaderboard_all', { p_version: FIGURE_VERSIONS['drac-valls'], p_period: 'all', p_offset: 0, p_limit: 50 }]);
  await svc.listAll({ version: 'mulassa-v2-short', season: 0, offset: 50 }); assert.deepEqual(last()[1], { p_version: 'mulassa-v2-short', p_period: 'all', p_offset: 50, p_limit: 50, p_season: 0 });
  // the signed-in profile
  answer = [{ alias: 'Timbaler', tag: 3821, verified: false, published: true }];
  assert.deepEqual(await svc.profile(), { alias: 'Timbaler', tag: 3821, verified: false, published: true });
  answer = [{ alias: 'Timbaler', tag: null, verified: true, published: false }]; assert.deepEqual(await svc.profile(), { alias: 'Timbaler', tag: null, verified: true, published: false });
  answer = []; assert.equal(await svc.profile(), null, 'no row: no profile');
  // choosing the clean name; a taken one has its own message, a not yet confirmed address its own
  answer = 'Timbaler'; assert.equal(await svc.chooseVerifiedAlias(' Timbaler '), 'Timbaler'); assert.deepEqual(last(), ['choose_verified_alias', { p_alias: 'Timbaler' }]);
  failWith = { message: 'leaderboard_alias_taken', code: '23505' };
  await assert.rejects(svc.chooseVerifiedAlias('Timbaler'), { code: 'name_taken', message: 'Aquest nom ja és d’algú. Prova’n un altre.' });
  failWith = { message: 'leaderboard_verification_required', code: '28000' };
  await assert.rejects(svc.chooseVerifiedAlias('Timbaler'), { code: 'verification', message: 'Confirma el correu abans de triar un nom net.' });
  failWith = null;
  await assert.rejects(svc.chooseVerifiedAlias('a b'), { code: 'invalid' });
  // seasons: camelCase, ms, the podium with composed names
  answer = [{ season_id: 1, name: 'Tardor 2026', starts_at: '2026-11-05T00:00:00Z', ends_at: '2027-01-01T00:00:00Z', version: 'mulassa-v3', previous_dance: false, players: 48, my_position: 12, my_score: 142310, my_difficulty: 1,
    podium: [{ position: 1, alias: 'Timbaler', tag: 3821, score: 182400, difficulty: 2, verified: false }, { position: 2, alias: 'Portadora', tag: null, score: 171050, difficulty: 1, verified: true }] },
    { season_id: 0, name: 'Estrena 2026', starts_at: '2026-09-26T22:00:00Z', ends_at: null, version: 'mulassa-v2-short', previous_dance: true, players: 60, my_position: null, podium: [] }];
  { const r = await svc.seasons('mulassa-valls'); assert.deepEqual(last(), ['get_seasons', { p_figure: 'mulassa-valls' }]);
    assert.deepEqual(r[0], { seasonId: 1, name: 'Tardor 2026', startsAt: Date.parse('2026-11-05T00:00:00Z'), endsAt: Date.parse('2027-01-01T00:00:00Z'), version: 'mulassa-v3', previousDance: false, players: 48, myPosition: 12, myScore: 142310, myDifficulty: 1,
      podium: [{ position: 1, alias: 'Timbaler', tag: 3821, score: 182400, difficulty: 2, verified: false, name: 'Timbaler#3821' }, { position: 2, alias: 'Portadora', tag: null, score: 171050, difficulty: 1, verified: true, name: 'Portadora' }] });
    assert(r[1].endsAt === null && r[1].previousDance && r[1].myPosition === null && r[1].myScore === null && r[1].myDifficulty === null); }
  // the public card: a guest needs its tag
  answer = [{ alias: 'Timbaler', tag: 3821, verified: false, totals: { 'mulassa-valls/mulassa-v3/1': { runs: 3 } }, podiums: [{ season_id: 1, version: 'mulassa-v3', position: 2 }] }];
  assert.deepEqual(await svc.playerCard('Timbaler', 3821), { alias: 'Timbaler', tag: 3821, name: 'Timbaler#3821', verified: false, totals: { 'mulassa-valls/mulassa-v3/1': { runs: 3 } }, podiums: [{ seasonId: 1, version: 'mulassa-v3', position: 2 }] });
  assert.deepEqual(last(), ['get_player_card', { p_alias: 'Timbaler', p_tag: 3821 }]);
  await svc.playerCard('Portadora'); assert.deepEqual(last()[1], { p_alias: 'Portadora', p_tag: null });
  await assert.rejects(svc.playerCard('Timbaler', 12345), { code: 'invalid' }); await assert.rejects(svc.playerCard('', null), { code: 'invalid' });
  answer = []; assert.equal(await svc.playerCard('Ningu'), null);
  // statistics
  answer = null; assert.deepEqual(await svc.syncStats({ owner: 'u-1', device: 'd-1', buckets: { practice: { runs: 1, seconds: 30 } }, days: ['2026-11-06'] }), { synced: true });
  assert.deepEqual(last(), ['merge_stats', { p_device: 'd-1', p_buckets: { practice: { runs: 1, seconds: 30 } }, p_days: ['2026-11-06'], p_owner: 'u-1' }]);
  answer = [{ buckets: { practice: { runs: 1, seconds: 30 } }, days: ['2026-11-06'], days_played: 1, current_streak: 1, longest_streak: 4 }];
  assert.deepEqual(await svc.myStats(), { buckets: { practice: { runs: 1, seconds: 30 } }, days: ['2026-11-06'], daysPlayed: 1, currentStreak: 1, longestStreak: 4 });
  for (const [message, code] of [['leaderboard_rate_limit', 'rate_limit'], ['leaderboard_device_limit', 'device'], ['leaderboard_invalid_stats', 'stats'], ['leaderboard_invalid_bucket', 'stats'],
    ['leaderboard_stats_decreased', 'stats'], ['leaderboard_stats_time_limit', 'stats_time'], ['leaderboard_invalid_day', 'stats'], ['leaderboard_auth_profile_missing', 'gone'],
    ['leaderboard_season_closed', 'season'], ['leaderboard_invalid_season', 'board'], ['leaderboard_invalid_version', 'board'], ['leaderboard_invalid_period', 'board']]) {
    failWith = { message, code: 'P0001' };
    await assert.rejects(svc.syncStats({ owner: 'u-1', device: 'd', buckets: {}, days: [] }), e => e.code === code && !/\bP0001\b/.test(e.message), message);
  }
  failWith = { message: 'leaderboard_auth_profile_missing', code: '28000' }; assert.equal(await svc.myStats(), null, 'no profile yet: no statistics, not an error');
  // a vanished account: sign out here and tell the stats layer, once; a missing profile only tells it
  events.length = 0; session = { user: { id: 'u-gone' } }; failWith = { message: 'leaderboard_auth_required', code: '28000' };
  await assert.rejects(svc.syncStats({ owner: 'u-gone', device: 'd', buckets: {}, days: [] }), { code: 'session' });
  assert.deepEqual(events, [{ type: 'gone', userId: 'u-gone' }]); assert.equal(session, null);
  events.length = 0; session = { user: { id: 'u-2' } }; failWith = { message: 'leaderboard_auth_profile_missing', code: '28000' };
  await assert.rejects(svc.syncStats({ owner: 'u-2', device: 'd', buckets: {}, days: [] }), { code: 'gone' }); assert.deepEqual(events, [{ type: 'gone', userId: 'u-2' }]); assert(session, 'the session stays');
  failWith = null; session = null;
  await assert.rejects(svc.syncStats({ owner: 'u-3', device: 'd', buckets: {}, days: [] }), { code: 'session' }, 'statistics never create a player');
  // the server saw another session than the owner the client built the counters for (the SDK re-read it): not a failure of the numbers
  session = { user: { id: 'u-3' } }; failWith = { message: 'leaderboard_owner_mismatch', code: '28000' }; events.length = 0;
  await assert.rejects(svc.syncStats({ owner: 'u-3', device: 'd', buckets: {}, days: [] }), { code: 'session' }); assert.deepEqual(events, [], 'not a vanished account'); failWith = null; session = null;
  await assert.rejects(svc.syncStats({ device: 'd', buckets: {}, days: [] }), { code: 'session' }, 'no owner, no upload');
  assert.equal(await svc.ownerId(), null); assert.equal(await svc.myStats(), null); assert.equal(await svc.profile(), null);
  session = { user: { id: 'u-3' } }; assert.equal(await svc.ownerId(), 'u-3');
  await assert.rejects(createLeaderboardService({ configured: true, publishingEnabled: false, captchaRequired: false, getClient: async () => c }).syncStats({ device: 'd', buckets: {}, days: [] }), { code: 'disabled' });
}
// publishing sends exactly the eight parameters of the production RPC: no p_notice, the raw alias; and tells the stats layer
{ const log = [], events = []; let session = { user: { id: 'u-9' } };
  const c = { auth: { getSession: async () => ({ data: { session } }), signOut: async () => { session = null; return { error: null }; }, verifyOtp: async () => ({ error: null }) },
    rpc: async (name, args) => { log.push([name, args]); return { data: name === 'submit_result' ? [{ improved: true, quality: 90, score: 54321 }] : 'Novell' }; },
    functions: { invoke: async () => ({ data: { deleted: true } }) } };
  const svc = createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c });
  svc.onAccount(e => events.push(e));
  await svc.publish(clean, 'Ànec');
  assert.deepEqual(Object.keys(log.at(-1)[1]).sort(), ['p_alias', 'p_difficulty', 'p_good', 'p_max_combo', 'p_miss', 'p_perfect', 'p_score', 'p_version']);
  assert.equal(log.at(-1)[1].p_alias, 'Ànec'); assert.equal(log.at(-1)[1].p_version, clean.version);
  await svc.createProfile('Novell'); await svc.verifyCode('a@b.cat', '123456', 'email');
  assert.deepEqual(events, [{ type: 'changed' }, { type: 'changed' }, { type: 'changed' }]);
  events.length = 0; await svc.deleteProfile(); assert.deepEqual(events, [{ type: 'gone', userId: 'u-9' }, { type: 'changed' }], 'a deleted profile takes its statistics');
  const failing = createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => ({ ...c, rpc: async () => ({ data: null, error: { message: 'leaderboard_rate_limit' } }) }) });
  let heard = 0; failing.onAccount(() => heard++); session = { user: {} };
  await assert.rejects(failing.createProfile('Novell'), { code: 'rate_limit' }); assert.equal(heard, 0, 'a failed write changes nothing');
  assert.equal(await createLeaderboardService({ configured: true, publishingEnabled: true, captchaRequired: false, getClient: async () => c }).onAccount(() => { throw new Error('x'); }) instanceof Function, true, 'unsubscribe');
}
console.log('leaderboard chart, result, privacy and client contracts ok');
