import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeDanceChart } from '../src/game/chart.js';
import { LEADERBOARD_VERSION, EXPECTED_JUDGMENTS, normalizeAlias, snapshotResult, validResult } from '../src/services/leaderboard-rules.js';
import { createLeaderboardService } from '../src/services/leaderboard.js';
import { captureLeaderboardResult, clearLeaderboardResult, getLeaderboardResult, subscribeLeaderboardResult, markLeaderboardDebugUse } from '../src/services/leaderboard-result.js';
const song = JSON.parse(readFileSync(new URL('../src/song.json', import.meta.url)));
for (let d = 0; d < 3; d++) assert.equal(makeDanceChart(song, d).reduce((sum,n) => sum + 1 + (n.end && !n.balloon ? 1 : 0),0), EXPECTED_JUDGMENTS[d], 'chart changes require a new leaderboard version');
assert.equal(normalizeAlias('  A\u0300necd’Òdena '), 'Ànecd’Òdena'); assert.equal(normalizeAlias('Ànec d’Òdena'), null, 'no spaces');
for (const a of ['x','<script>','a@example.com','🎮🎮','a'.repeat(21)]) assert.equal(normalizeAlias(a), null);
const game = { diff:0, counts:{ perfect:120,good:20,miss:10 },score:54321,maxCombo:50 };
const clean = snapshotResult(game,{reason:'end',query:new URLSearchParams()});
assert(clean && Object.isFrozen(clean) && Object.isFrozen(clean.counts));
game.counts.perfect = 1; assert.equal(clean.counts.perfect,120); game.counts.perfect = 120;
for (const q of ['autoplay','from=0','from=50','view=front','perf']) assert.equal(snapshotResult(game,{reason:'end',query:new URLSearchParams(q)}),null);
assert(snapshotResult(game,{reason:'end',query:new URLSearchParams('mute&offset=60')}));
assert.equal(snapshotResult(game,{reason:'collapse',query:new URLSearchParams()}),null);
assert.equal(snapshotResult({...game,practice:{}},{reason:'end',query:new URLSearchParams()}),null);
assert.equal(snapshotResult(game,{reason:'end',query:new URLSearchParams(),debugUsed:true}),null);
assert(validResult({...clean,counts:{perfect:60,good:60,miss:30}}),'under 70% finished runs may publish');
assert(!validResult({...clean,maxCombo:141}));
assert(!validResult({...clean,counts:{perfect:120,good:20,miss:9}}));
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
console.log('leaderboard chart, result, privacy and client contracts ok');
