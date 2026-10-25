import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
const source = readFileSync(new URL('../../supabase/functions/delete-player/index.ts', import.meta.url),'utf8').replace(/^import .*;\n/, '');
let handler, removed=[], valid=true, failure=false;
const env = { ALLOWED_ORIGINS:'http://localhost:5178,https://mulassa-tap-tap-dance.pages.dev', SUPABASE_URL:'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY:'test-only' };
vm.runInNewContext(stripTypeScriptTypes(source), {
  Request, Response,
  Deno:{serve: fn=>{handler=fn;},env:{get:key=>env[key]}},
  createClient:()=>({auth:{getUser:async(token)=>({data:{user:valid && token==='valid'?{id:'verified-account',is_anonymous:true}:valid && token==='signed-in'?{id:'stranger',is_anonymous:false,email_confirmed_at:null}:valid && token==='with-email'?{id:'email-account',is_anonymous:false,email_confirmed_at:'2026-09-30T08:00:00Z'}:null},error:valid?null:{}}),
    admin:{deleteUser:async(id)=>{removed.push(id);return failure?{error:{}}:{};}}}}),
});
const request = (token, origin='http://localhost:5178', body={}) => new Request('https://test.invalid/functions/v1/delete-player', {method:'POST', headers:{...(token?{authorization:`Bearer ${token}`} : {}),...(origin?{origin}: {}),'content-type':'application/json'},body:JSON.stringify(body)});
assert.equal((await handler(request(null))).status,401);
assert.equal((await handler(request('forged'))).status,401); assert.equal(removed.length,0);
// isPlayer (the twin of the SQL's require_player): a guest, or a profile with a confirmed e-mail; any other account is refused
assert.equal((await handler(request('signed-in'))).status,401); assert.equal(removed.length,0);
assert(/const isPlayer = [\s\S]*is_anonymous === true \|\| Boolean\(user\?\.email_confirmed_at\)/.test(source) && /!isPlayer\(data\.user\)/.test(source), 'one isPlayer check, used for the deletion');
assert.equal((await handler(request('with-email'))).status,200); assert.deepEqual(removed,['email-account'],'a profile protected with an e-mail can be deleted'); removed.length=0;
assert.equal((await handler(request('valid','https://evil.invalid'))).status,403);
const preflight=await handler(new Request('https://test.invalid',{method:'OPTIONS',headers:{origin:'http://localhost:5178'}}));
assert.equal(preflight.status,204); assert.equal(preflight.headers.get('access-control-allow-origin'),'http://localhost:5178');
const deleted=await handler(request('valid',undefined,{user_id:'someone-else'}));
assert.equal(deleted.status,200); assert.deepEqual(await deleted.json(),{deleted:true});
assert.deepEqual(removed,['verified-account'],'body cannot select another account');
failure=true; assert.equal((await handler(request('valid'))).status,503);
assert.equal((await handler(new Request('https://test.invalid',{method:'GET'}))).status,405);
console.log('leaderboard deletion verifies identity and origin, ignores supplied account IDs');
