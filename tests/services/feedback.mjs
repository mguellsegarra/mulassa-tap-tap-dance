// «Bústia de la plaça»: the mulassa-feedback Worker (workers/feedback: Turnstile, then one plain-text e-mail through Email
// Routing's send_email binding; nothing stored), with mocked env / fetch / cloudflare:email EmailMessage; the migration that
// drops the old feedback tables (PGlite); and the client (src/services/feedback.js): the e-mail pattern shared with the Worker, input
// cleaning, error mapping.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { EMAIL, cleanEmail, checkFeedback, createFeedback } from '../../src/services/feedback.js';

// --- the Worker
const raw = readFileSync(new URL('../../workers/feedback/src/index.js', import.meta.url), 'utf8');
assert.match(raw, /^import \{ EmailMessage \} from 'cloudflare:email';\n/, 'the only import: cloudflare:email');
assert.equal((raw.match(/^import /gm) || []).length, 1, 'no npm dependencies');
assert.equal((raw.match(/^export /gm) || []).length, 1, 'only the default handler is exported');
const source = raw.replace(/^import .*;\n/, '').replace(/^export default /m, '__exports.default = ');
assert.equal(/const EMAIL = (\/.*\/);/.exec(source)?.[1], String(EMAIL), 'the Worker checks e-mails with the same pattern as the client');
const toml = readFileSync(new URL('../../workers/feedback/wrangler.toml', import.meta.url), 'utf8');
assert.match(toml, /^name = "mulassa-feedback"$/m);
assert.match(toml, /^\[\[send_email\]\]\nname = "MAIL"\n/m, 'the send_email binding');
assert.match(toml, /^FEEDBACK_FROM = "holi@mulassa\.cat"$/m);
assert.doesNotMatch(toml, /^(destination_address|FEEDBACK_TO|TURNSTILE_SECRET_KEY) *=/m, 'the recipient and the Turnstile key are secrets, not in the repo');
const tomlOrigins = /^ALLOWED_ORIGINS = "(.*)"$/m.exec(toml)[1].split(',');
for (const o of ['https://mulassa-tap-tap-dance.pages.dev', 'https://mulassa.cat', 'https://www.mulassa.cat']) assert(tomlOrigins.includes(o), `origin ${o}`);
assert(tomlOrigins.every(o => o.startsWith('https://')), 'production origins only: local/LAN ones go in .dev.vars, never in the repo');
// the abuse caps: two rate-limit bindings (limit per 60 s) and the KV day counter
const rl = name => new RegExp(`^\\[\\[ratelimits\\]\\]\\nname = "${name}"\\nnamespace_id = "\\d+"\\n +\\[ratelimits\\.simple\\]\\n +limit = (\\d+)\\n +period = 60$`, 'm').exec(toml)?.[1];
assert.equal(rl('PER_IP'), '3', 'PER_IP: 3 a minute'); assert.equal(rl('ALL'), '10', 'ALL: 10 a minute');
assert.match(toml, /^\[\[kv_namespaces\]\]\nbinding = "DAILY"\nid = "[0-9a-f]{32}"$/m, 'the DAILY KV namespace');
assert.match(toml, /^DAILY_MAX = "150"$/m);

let captchaOk = true, siteverify = 'ok', calls = [], clock = Date.parse('2026-09-28T10:00:00Z');
let sendFail = null, verifyHost = 'localhost';
// rate-limit bindings: max per 60 s of the fake clock, per key (Cloudflare's are per location and approximate)
const limiter = max => { const hits = new Map(), l = { max, fail: null, async limit({ key }) {
  if (l.fail) throw l.fail;
  const h = (hits.get(key) || []).filter(t => clock - t < 60_000);
  const success = h.length < l.max; if (success) h.push(clock); hits.set(key, h); return { success };
} }; return l; };
const PER_IP = limiter(3), ALL = limiter(1e9); // ALL tested on its own below
const kv = new Map(), DAILY = { async get(k) { return kv.get(k) ?? null; }, async put(k, v, o) { assert.equal(o?.expirationTtl, 172800); kv.set(k, v); } };
const sent = []; // every EmailMessage handed to env.MAIL.send
class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } }
const MAIL = { async send(m) { if (sendFail) throw sendFail; assert(m instanceof EmailMessage); sent.push(m); } };
const env = { ALLOWED_ORIGINS: 'http://localhost:5178, https://mulassa.cat', TURNSTILE_SECRET_KEY: 'ts-secret',
  FEEDBACK_FROM: 'holi@mulassa.cat', FEEDBACK_TO: 'dest@example.test', MAIL, PER_IP, ALL, DAILY, DAILY_MAX: '200' };
const fetchMock = async (url, init) => {
  calls.push(String(url));
  assert.equal(String(url), 'https://challenges.cloudflare.com/turnstile/v0/siteverify', 'Turnstile is the only fetch');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['content-type'], 'application/x-www-form-urlencoded');
  assert(init.body instanceof URLSearchParams, 'a urlencoded form, as Cloudflare documents it');
  assert.deepEqual([...init.body.keys()].sort(), ['remoteip', 'response', 'secret']);
  assert.equal(init.body.get('secret'), 'ts-secret');
  assert.match(init.body.get('remoteip'), /^(203\.0\.113|198\.51\.100)\./, 'remoteip: CF-Connecting-IP');
  if (siteverify === 'throw') throw new TypeError('network down');
  if (siteverify === 'http') return new Response('bad gateway', { status: 502 });
  const success = captchaOk && init.body.get('response') === 'good-token';
  return Response.json(success ? { success, hostname: verifyHost, challenge_ts: new Date(clock).toISOString() } : { success, 'error-codes': ['invalid-input-response'] });
};
class FakeDate extends Date { static now() { return clock; } constructor(...a) { super(...(a.length ? a : [clock])); } }
const errors = [], __exports = {};
vm.runInNewContext(source, {
  Request, Response, URL, URLSearchParams, TextEncoder, btoa, crypto, fetch: fetchMock, Date: FakeDate, EmailMessage, __exports,
  console: { error: (...a) => errors.push(a.join(' ')) },
});
const worker = __exports.default;
const handler = req => worker.fetch(req, env);
let ipN = 0;
const freshIp = () => `203.0.113.${++ipN}`; // every case its own IP, so the rate limit only bites where it is tested
const post = (body, { origin = 'http://localhost:5178', ip = freshIp(), headers = {} } = {}) => handler(new Request('https://mulassa-feedback.test.workers.dev/', {
  method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, 'user-agent': 'UA'.repeat(200),
    ...(origin ? { origin } : {}), ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body) }));
const good = { message: '  Molt bon joc!  ', email: 'jo@exemple.cat', turnstileToken: 'good-token', version: '1.0.0+abc' };
const codeOf = async r => [r.status, (await r.json()).error];
const nothingSent = (label, n = 0) => { assert.equal(calls.length, n, `${label}: Turnstile calls`); assert.equal(sent.length, 0, `${label}: no mail`); };
// a raw message → { headers: Map(lowercase name → value), text } (base64 body decoded as UTF-8)
const parse = rawMail => {
  const [head, body] = rawMail.split('\r\n\r\n');
  assert(!/(^|[^\r])\n/.test(rawMail), 'CRLF line endings only');
  const headers = new Map(head.replace(/\r\n /g, ' \u0000').split('\r\n').map(l => l.replace(/ \u0000/g, '\r\n ')).map(l => { const i = l.indexOf(': '); return [l.slice(0, i).toLowerCase(), l.slice(i + 2)]; }));
  const lines = body.split('\r\n').filter(Boolean);
  assert(lines.every(l => l.length <= 76 && /^[A-Za-z0-9+/=]+$/.test(l)), 'base64 wrapped at 76');
  return { head, headers, text: Buffer.from(lines.join(''), 'base64').toString('utf8') };
};
const decodeWord = v => v.replace(/\?=\r\n =\?/g, '?==?').replace(/=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));

// CORS and method
const pre = await handler(new Request('https://w.test', { method: 'OPTIONS', headers: { origin: 'https://mulassa.cat' } }));
assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'https://mulassa.cat');
assert.match(pre.headers.get('access-control-allow-methods'), /POST/); assert.equal(pre.headers.get('vary'), 'Origin');
assert.match(pre.headers.get('access-control-allow-headers'), /content-type/);
const preBad = await handler(new Request('https://w.test', { method: 'OPTIONS', headers: { origin: 'https://evil.invalid' } }));
assert.equal(preBad.status, 403); assert.equal(preBad.headers.get('access-control-allow-origin'), null);
const denied = await post(good, { origin: 'https://evil.invalid' });
assert.deepEqual(await codeOf(denied), [403, 'origin_not_allowed']); assert.equal(denied.headers.get('access-control-allow-origin'), null);
assert.deepEqual(await codeOf(await handler(new Request('https://w.test', { method: 'GET' }))), [405, 'method_not_allowed']);
nothingSent('CORS / method');

// not configured: the Turnstile secret, the sender, the recipient or the binding missing
for (const k of ['TURNSTILE_SECRET_KEY', 'FEEDBACK_FROM', 'FEEDBACK_TO', 'MAIL', 'PER_IP', 'ALL', 'DAILY', 'DAILY_MAX']) {
  const v = env[k]; delete env[k];
  assert.deepEqual(await codeOf(await post(good)), [503, 'not_configured'], `no ${k}`);
  env[k] = v;
}
nothingSent('not configured');

// the body: JSON, sizes, the message
assert.deepEqual(await codeOf(await post('{nope')), [400, 'invalid']);
assert.deepEqual(await codeOf(await post(JSON.stringify({ ...good, message: 'x'.repeat(8000) }))), [413, 'invalid']);
for (const message of [' abc ', '    ', 'x'.repeat(1001), 42, undefined])
  assert.deepEqual(await codeOf(await post({ ...good, message })), [400, 'invalid_message'], `message ${JSON.stringify(message)}`);
nothingSent('invalid messages');
assert.equal((await post({ ...good, message: '😀'.repeat(1000) })).status, 200, '1000 code points (an emoji is one)');
assert.ok(parse(sent[0].raw).text.startsWith('😀'.repeat(1000) + '\r\n'), 'emoji survive the base64 round trip');
sent.length = 0; calls = [];

// e-mails: the strict pattern; nothing that could break a mail header gets through
for (const email of ['a@b.cat\r\nBcc: x@y.cat', 'a@b.cat\nBcc: x@y.cat', 'a@b.cat\rBcc: x@y.cat', 'a b@c.cat', 'jo@exemple .cat', 'a@@b.cat', 'a@b@c.cat',
  'àlex@domini.cat', 'jo@dòmini.cat', 'a@b', 'a@b.c', 'x@-b.cat', 'x@b-.cat', 'no-arroba', '"jo"@exemple.cat', `${'a'.repeat(250)}@b.cat`])
  assert.deepEqual(await codeOf(await post({ ...good, email })), [400, 'invalid_email'], `email ${JSON.stringify(email)}`);
nothingSent('invalid e-mails');

// Turnstile: missing, forged, refused, or unreachable
assert.deepEqual(await codeOf(await post({ ...good, turnstileToken: '' })), [403, 'captcha']);
assert.deepEqual(await codeOf(await post({ ...good, turnstileToken: 'x'.repeat(2049) })), [403, 'captcha']);
nothingSent('no token: no Turnstile call');
assert.deepEqual(await codeOf(await post({ ...good, turnstileToken: 'forged' })), [403, 'captcha']);
captchaOk = false; assert.deepEqual(await codeOf(await post(good)), [403, 'captcha']); captchaOk = true;
errors.length = 0;
siteverify = 'http'; assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']);
siteverify = 'throw'; assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']);
siteverify = 'ok';
assert.equal(errors.length, 2, 'Turnstile outages are logged');
nothingSent('Turnstile refusals', 4);
calls = [];
// a valid token solved on another site (our public site key copied): refused, logged
errors.length = 0;
for (const h of ['evil.invalid', undefined, 'mulassa.cat.evil.invalid']) {
  verifyHost = h; assert.deepEqual(await codeOf(await post(good)), [403, 'captcha'], `hostname ${h}`);
}
verifyHost = 'mulassa.cat'; assert.equal((await post(good)).status, 200, 'any hostname of ALLOWED_ORIGINS');
verifyHost = 'localhost';
assert.equal(errors.length, 3); assert.match(errors[0], /hostname/);
assert.equal(sent.length, 1, 'only the allowed hostname sent a mail');
sent.length = 0; calls = [];


// success: one plain-text mail through the binding
const ok = await post(good);
assert.equal(ok.status, 200); assert.deepEqual(await ok.json(), { ok: true });
assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5178');
assert.equal(sent.length, 1);
assert.equal(sent[0].from, 'holi@mulassa.cat', 'envelope from: the project address'); assert.equal(sent[0].to, 'dest@example.test', 'envelope to: FEEDBACK_TO');
let mail = parse(sent[0].raw), h = mail.headers;
assert.equal(h.get('from'), 'Mulassa Tap Tap Dance <holi@mulassa.cat>');
assert.equal(h.get('to'), 'holi@mulassa.cat', 'To header = the shared address, so Gmail replies from it (the envelope still goes to FEEDBACK_TO)');
assert.equal(h.get('reply-to'), 'jo@exemple.cat', 'Reply-To: the player');
assert(h.get('subject').split('\r\n ').every(w => /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/.test(w) && w.length <= 75), 'RFC 2047 encoded-words of at most 75 characters, folded');
assert.equal(decodeWord(h.get('subject')), 'Bústia · 28/9 12:00 · Molt bon joc!', 'one subject per message: the time and the first words (Gmail threads equal subjects)');
{ // a long message: its first 40 characters and «…»; line breaks in it never reach the header
  const long = await post({ ...good, message: 'Primera línia\r\nBcc: x@y.cat i molt més text que no hi cap gens' });
  assert.equal(long.status, 200);
  const hs = parse(sent.at(-1).raw).headers;
  assert.equal(decodeWord(hs.get('subject')), 'Bústia · 28/9 12:00 · Primera línia Bcc: x@y.cat i molt més te…');
  assert(!hs.has('bcc'), 'no header injection through the message');
  sent.pop();
}
assert.equal(h.get('date'), 'Mon, 28 Sep 2026 10:00:00 +0000');
assert.match(h.get('message-id'), /^<[0-9a-f-]{36}@mulassa\.cat>$/);
assert.equal(h.get('mime-version'), '1.0');
assert.equal(h.get('content-type'), 'text/plain; charset=UTF-8', 'plain text only');
assert.equal(h.get('content-transfer-encoding'), 'base64');
assert(/^[\x20-\x7e\r\n]*$/.test(mail.head), 'headers are pure ASCII');
assert.equal(h.size, 9);
assert(mail.text.startsWith('Molt bon joc!\r\n'), 'the trimmed message first');
assert(mail.text.includes('Correu per contestar: jo@exemple.cat') && mail.text.includes('Versió: 1.0.0+abc'));
assert(mail.text.includes('Quan: 28/9/2026') || /Quan: .*2026.*12:00:00/.test(mail.text), `the time in Europe/Madrid: ${mail.text}`);
assert(mail.text.endsWith(`Navegador: ${'UA'.repeat(80)}`), 'user agent cut at 160');
assert(!mail.text.includes('203.0.113.'), 'no IP in the mail');

sent.length = 0;
assert.deepEqual(await codeOf(await post({ ...good, email: '  ' })), [400, 'invalid_email'], 'the e-mail is required');
assert.deepEqual(await codeOf(await post({ ...good, email: undefined })), [400, 'invalid_email']);
assert.equal(sent.length, 0, 'nothing mailed without one');
sent.length = 0;
await post({ ...good, message: 'Línia 1\nLínia 2\r\nLínia 3' + 'ç'.repeat(300) });
mail = parse(sent[0].raw);
assert(mail.text.startsWith('Línia 1\r\nLínia 2\r\nLínia 3ççç'), 'line breaks in the message become CRLF inside the body');

// a recipient with a line break (a broken secret) never reaches a header
sent.length = 0; errors.length = 0;
env.FEEDBACK_TO = 'dest@example.test\r\nBcc: x@y.test';
assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']);
assert.equal(sent.length, 0);
env.FEEDBACK_TO = 'dest@example.test';

// sending fails (destination not verified, binding error…): 503 unavailable, logged without the message
errors.length = 0;
sendFail = new Error('destination address is not a verified address');
assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']);
assert.equal(errors.length, 1); assert.match(errors[0], /send failed/); assert(!errors[0].includes('Molt bon joc'), 'never the message');
sendFail = null;

// rate limit: 3 per IP per 10 minutes, counted after Turnstile (a refused captcha costs nothing)
sent.length = 0;
const ip = '198.51.100.9';
captchaOk = false; for (let i = 0; i < 3; i++) await post(good, { ip }); captchaOk = true;
for (let i = 0; i < 3; i++) assert.equal((await post(good, { ip })).status, 200, `message ${i + 1}`);
clock += 9 * 60_000;
assert.deepEqual(await codeOf(await post(good, { ip })), [429, 'rate_limit'], 'the 4th within 10 minutes');
assert.equal(sent.length, 3, 'the refused one sends nothing');
assert.equal((await post(good)).status, 200, 'another IP is not affected');
assert.equal((await post(good, { headers: { 'x-forwarded-for': ip } })).status, 200, 'X-Forwarded-For is ignored (the client sets it)');
clock += 60_001;
assert.equal((await post(good, { ip })).status, 200, 'ten minutes later: again');

// per-IP binding: 3 a minute even across isolates (the in-memory map would forget on another isolate)
sent.length = 0;
PER_IP.max = 0;
assert.deepEqual(await codeOf(await post(good)), [429, 'rate_limit'], 'PER_IP refuses');
PER_IP.max = 3;
// ALL: 10 a minute in total, whatever the IP
clock += 60_001; ALL.max = 2; // a fresh minute
assert.equal((await post(good)).status, 200); assert.equal((await post(good)).status, 200);
assert.deepEqual(await codeOf(await post(good)), [429, 'rate_limit'], 'the 3rd in a minute, from a new IP');
clock += 60_001;
assert.equal((await post(good)).status, 200, 'the next minute: again');
ALL.max = 1e9;
// the day cap: DAILY_MAX e-mails per UTC day, counted before sending; the next day starts again
const today = `mails:${new Date(clock).toISOString().slice(0, 10)}`;
kv.set(today, '199'); sent.length = 0; errors.length = 0;
assert.equal((await post(good)).status, 200, 'the 200th');
assert.equal(kv.get(today), '200');
assert.deepEqual(await codeOf(await post(good)), [429, 'rate_limit'], 'the 201st: refused');
assert.equal(sent.length, 1); assert.match(errors.join(), /daily cap/);
clock += 86_400_000;
assert.equal((await post(good)).status, 200, 'tomorrow: a new count');
assert.equal(kv.get(`mails:${new Date(clock).toISOString().slice(0, 10)}`), '1');
// a limiter or KV outage fails closed: no mail
sent.length = 0;
PER_IP.fail = new Error('binding down');
assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']); PER_IP.fail = null;
const get = DAILY.get; DAILY.get = async () => { throw new Error('kv down'); };
assert.deepEqual(await codeOf(await post(good)), [503, 'unavailable']); DAILY.get = get;
assert.equal(sent.length, 0, 'outages send nothing');

// --- the migration: 202609280007 drops everything 202609280006 made (and the optional pg_cron purge)
const migration = f => readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), 'utf8');
for (const f of ['202609280007_drop_feedback_tables.sql', '202609280008_drop_per_level_board.sql'])
  assert.ok(/^[\x00-\x7f]*$/.test(migration(f)), `${f}: ASCII only (SQL Editor)`);
for (const withCron of [false, true]) {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  if (withCron) await db.exec(`create schema cron; create table cron.job(jobid bigserial primary key, jobname text);
    create function cron.unschedule(p bigint) returns boolean language sql as $$ delete from cron.job where jobid = p returning true $$;
    insert into cron.job(jobname) values ('purge-feedback'), ('other');`);
  await db.exec(migration('202609280006_feedback.sql'));
  await db.exec("set role service_role; select public.submit_feedback(repeat('a', 64), 'Hola, bon joc', null, '1', 'UA'); reset role;");
  await db.exec(migration('202609280007_drop_feedback_tables.sql'));
  const left = (await db.query(`select (select count(*)::int from pg_namespace where nspname = 'feedback_private') s,
    (select count(*)::int from pg_proc where proname in ('submit_feedback', 'purge_feedback')) f`)).rows[0];
  assert.deepEqual(left, { s: 0, f: 0 }, 'schema, tables and functions gone');
  if (withCron) assert.deepEqual((await db.query('select jobname from cron.job')).rows.map(r => r.jobname), ['other'], 'the purge job unscheduled, nothing else');
  await db.exec(migration('202609280007_drop_feedback_tables.sql')); // safe to paste twice
  await db.close();
}

// --- the client (src/services/feedback.js)
for (const e of ['nom@domini.cat', 'a.b+c@sub.domini.com', "o'neil@exemple.ie", 'x_y@a-b.c-d.org']) assert.ok(EMAIL.test(e), `valid: ${e}`);
for (const e of ['a@b', 'a@@b.cat', 'a@b.c', 'x@-b.cat', 'àlex@domini.cat', 'a b@c.cat', 'a@b.cat\r\nBcc: x@y.cat', '@b.cat', 'a@.cat', 'a@b..cat'])
  assert.ok(!EMAIL.test(e), `invalid: ${JSON.stringify(e)}`);
assert.equal(cleanEmail(' jo @ exemple.cat '), 'jo@exemple.cat', 'spaces go');
assert.equal(cleanEmail('àlex@dòmini.cat'), 'lex@dmini.cat', 'accented letters go (the check then says why)');
assert.equal(cleanEmail('"jo"@exemple.cat'), 'jo@exemple.cat', 'double quotes go');
assert.equal(cleanEmail('“jo”@exemple.cat’'), 'jo@exemple.cat', 'typographic quotes go');
assert.equal(cleanEmail('a@b.cat\r\nBcc: x@y.cat'), 'a@b.catBccx@y.cat', 'line breaks and colons go');
assert.equal(cleanEmail(null), ''); assert.equal(cleanEmail('a'.repeat(300)).length, 254);
assert.equal(checkFeedback('hola', '').field, 'message');
assert.equal(checkFeedback('Hola!', 'x@y').field, 'email');
assert.equal(checkFeedback('Hola!', 'a@b.c').field, 'email');
assert.ok(checkFeedback(' Hola! ', ' jo@exemple.cat ').ok);
assert.equal(checkFeedback('😀😀😀😀😀', 'a@b.cat').ok, true, 'code points, like the server');
assert.equal(checkFeedback('Hola!', '').field, 'email', 'required');
let last = null, answer = () => Response.json({ ok: true });
const svc = createFeedback({ url: 'https://mulassa-feedback.x.workers.dev', enabled: true, fetchFn: async (u, init) => { last = { u, init }; return answer(); }, online: () => true, version: 'v1' });
assert.ok(svc.configured);
await svc.send({ message: 'Hola!', email: 'jo@exemple.cat', token: 't' });
assert.equal(last.u, 'https://mulassa-feedback.x.workers.dev', 'straight to VITE_FEEDBACK_URL');
assert.deepEqual(last.init.headers, { 'content-type': 'application/json' }, 'no apikey, no session');
assert.deepEqual(JSON.parse(last.init.body), { message: 'Hola!', email: 'jo@exemple.cat', turnstileToken: 't', version: 'v1' });
await svc.send({ message: ' Hola! ', email: ' jo@exemple.cat ', token: 't' });
assert.deepEqual(JSON.parse(last.init.body), { message: 'Hola!', email: 'jo@exemple.cat', turnstileToken: 't', version: 'v1' });
last = null;
await assert.rejects(svc.send({ message: 'Hola!', email: 'àlex@domini.cat', token: 't' }), e => e.code === 'invalid_email');
assert.equal(last, null, 'a bad e-mail never leaves the device');
for (const [status, error, code] of [[429, 'rate_limit', 'rate_limit'], [429, undefined, 'rate_limit'], [403, 'captcha', 'captcha'], [400, 'invalid_email', 'invalid_email'],
  [400, 'invalid', 'invalid_message'], [503, 'unavailable', 'unavailable'], [503, 'not_configured', 'unavailable'], [500, undefined, 'unavailable']]) {
  answer = () => Response.json({ error }, { status });
  await assert.rejects(svc.send({ message: 'Hola!', email: 'jo@exemple.cat', token: 't' }), e => e.code === code && /[a-zà-ú]/.test(e.message), `${status} ${error}`);
}
answer = () => new Response('<html>gateway</html>', { status: 502 });
await assert.rejects(svc.send({ message: 'Hola!', email: 'jo@exemple.cat', token: 't' }), e => e.code === 'unavailable');
answer = () => { throw new TypeError('Failed to fetch'); };
await assert.rejects(svc.send({ message: 'Hola!', email: 'jo@exemple.cat', token: 't' }), e => e.code === 'offline');
await assert.rejects(createFeedback({ url: 'u', online: () => false }).send({ message: 'Hola!', email: 'jo@exemple.cat', token: 't' }), e => e.code === 'offline');
assert.equal(createFeedback({ url: '', enabled: true }).configured, false, 'no VITE_FEEDBACK_URL: off');
assert.equal(createFeedback({ url: 'https://x.invalid', enabled: false }).configured, false, 'off until VITE_FEEDBACK_ENABLED=true');
console.log('feedback: Worker (CORS, config, validation, Turnstile + hostname, rate limits, daily cap, MIME mail), drop migration, client ok');
