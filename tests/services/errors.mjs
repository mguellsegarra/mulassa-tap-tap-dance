// Crash reports (src/services/errors.js): when they may be sent, what gets scrubbed, and the early buffer before the SDK loads.
import assert from 'node:assert/strict';
import { errorsMode, scrubUrl, scrubText, scrubEvent, scrubBreadcrumb, sentryOptions, createErrors, errors, errorName } from '../../src/services/errors.js';

const DSN = 'https://public@o1.ingest.de.sentry.io/1';
const prod = { dsn: DSN, hostname: 'mulassa-tap-tap-dance.pages.dev', search: '' };

// On/off
assert.equal(errorsMode(prod), 'production');
assert.equal(errorsMode({ ...prod, hostname: 'beta.mulassa.cat' }), 'beta', 'the beta channel reports apart');
assert.equal(errorsMode({ ...prod, dsn: '' }), null, 'no DSN: off');
assert.equal(errorsMode({ ...prod, webdriver: true }), null, 'headless/automation: off');
for (const q of ['?autoplay', '?mute&autoplay', '?from=40', '?view=side']) assert.equal(errorsMode({ ...prod, search: q }), null, `${q}: off`);
assert.equal(errorsMode({ ...prod, search: '?mute&repte=94-2' }), 'production', '?mute and challenges are real players');
assert.equal(errorsMode({ ...prod, hostname: 'abc123.mulassa-tap-tap-dance.pages.dev' }), 'preview');
for (const h of ['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.5', '172.20.1.1', 'mac.local', 'game.localhost'])
  assert.equal(errorsMode({ ...prod, hostname: h }), null, `${h}: dev hosts stay quiet`);
assert.equal(errorsMode({ ...prod, hostname: 'localhost', search: '?mute&sentry-test', webdriver: true }), 'development', '?sentry-test on localhost, even headless');
assert.equal(errorsMode({ ...prod, hostname: '192.168.1.20', search: '?sentry-test' }), null, '?sentry-test only on localhost');
assert.equal(errorsMode({ ...prod, search: '?sentry-test', webdriver: true }), null, '?sentry-test does not unlock production headless');
assert.equal(errorsMode({ ...prod, hostname: 'localhost', search: '?sentry-test', dsn: '' }), null, 'no DSN wins over everything');
assert.equal(errors.on, false, 'tests (no window, no DSN) never send');

// Scrubbing
assert.equal(scrubUrl('https://mulassa-tap-tap-dance.pages.dev/?repte=94-2#x'), 'https://mulassa-tap-tap-dance.pages.dev/');
assert.equal(scrubText('fetch https://x.supabase.co/rest/v1/rpc?apikey=k&a=1 failed'), 'fetch https://x.supabase.co/rest/v1/rpc failed');
const event = scrubEvent({
  user: { id: 'u', ip_address: '1.2.3.4' },
  request: { url: 'https://h.pages.dev/?repte=94-2', headers: { 'User-Agent': 'UA', Referer: 'https://h.pages.dev/?repte=94-2' }, cookies: 'c', query_string: 'repte=94-2' },
  message: 'boom at https://h.pages.dev/?repte=1-1',
  exception: { values: [{ value: 'bad https://h.pages.dev/a.js?v=1', stacktrace: { frames: [{ filename: 'https://h.pages.dev/assets/i.js?x=1', abs_path: 'https://h.pages.dev/assets/i.js#l' }] } }] },
  breadcrumbs: [{ category: 'navigation', data: { from: '/?repte=94-2', to: '/' } }, { category: 'console', level: 'log', message: 'hi' },
    { category: 'fetch', data: { url: 'https://x.supabase.co/rpc?apikey=k' } }],
  tags: { a: '1' },
}, { state: 'play', diff: 2 });
assert(!('user' in event), 'no user, no IP');
assert.deepEqual(event.request, { url: 'https://h.pages.dev/', headers: { 'User-Agent': 'UA' } }, 'no query, referer or cookies');
assert(!JSON.stringify(event).includes('repte') && !JSON.stringify(event).includes('apikey'), 'no query strings anywhere');
assert.equal(event.breadcrumbs.length, 2, 'console breadcrumbs below warning are dropped');
assert.deepEqual(event.tags, { a: '1', state: 'play', diff: 2 }, 'game context tags');
assert.equal(scrubBreadcrumb({ category: 'console', level: 'error', message: 'x' })?.level, 'error', 'console errors may stay');

const opts = sentryOptions({ dsn: DSN, environment: 'production', release: 'r', tags: () => { throw new Error('ctx'); } });
assert.equal(opts.dataCollection.userInfo, false, 'Sentry is told never to infer the IP');
assert.equal(opts.sendDefaultPii, false);
assert(!('tracesSampleRate' in opts) && !('replaysSessionSampleRate' in opts), 'no tracing or replay');
assert.equal(opts.beforeSend({ user: { ip_address: '1.2.3.4' }, request: { url: '/?repte=1-1' } }).user, undefined, 'a broken context getter keeps the report, scrubbed');
for (let i = 0; i < 20; i++) opts.beforeSend({});
assert.equal(opts.beforeSend({}), null, 'capped per page');
assert.equal(sentryOptions({ dsn: DSN, environment: 'production', release: 'r' }).beforeSend({}, { originalException: { mulassaReported: true } }), null, 'an error already reported (no WebGL) is not sent again as a crash');

// Early buffer and lazy load
function fakeWindow() {
  const h = {};
  return { h, timers: [],
    addEventListener(t, f) { (h[t] ||= new Set()).add(f); }, removeEventListener(t, f) { h[t]?.delete(f); },
    fire(t, e) { for (const f of h[t] || []) f({ type: t, ...e }); }, setTimeout(f) { this.timers.push(f); } };
}
{
  const win = fakeWindow();
  let loads = 0;
  const off = createErrors({ mode: null, win, load: () => { loads++; } });
  off.start(); off.report('x'); off.breadcrumb('z'); off.capture(new Error('y'));
  assert.equal(loads, 0, 'off: never loads the SDK');
  assert.equal(Object.keys(win.h).length + win.timers.length, 0, 'off: no listeners, no timers');
}
{
  const win = fakeWindow(), sent = [];
  const S = { captureException: (e, h) => sent.push(['exception', e, h]), captureMessage: (m, h) => sent.push(['message', m, h]),
    addBreadcrumb: b => sent.push(['crumb', b.message, b]) };
  let loads = 0, ready;
  const api = createErrors({ mode: 'production', win, idle: f => f(), load: () => { loads++; return new Promise(r => { ready = () => r(S); }); } });
  const early = new Error('early');
  win.fire('error', { error: early });
  win.fire('unhandledrejection', { reason: 'rejected' });
  win.fire('error', { message: 'Script error.' }); // cross-origin noise: nothing to learn
  win.fire('error', { error: Object.assign(new Error('Error creating WebGL context.'), { mulassaReported: true }) }); // no WebGL: already a warning
  win.fire('pointerdown', { pointerType: 'touch' });
  api.context(() => ({ state: 'select' }));
  api.report('webgl-context-lost');
  const actualNow = Date.now;
  try { Date.now = () => 123456000; api.breadcrumb('webgl-context-restored', { n: 1 }); }
  finally { Date.now = actualNow; }
  api.capture(new Error('mid'));
  assert.equal(sent.length, 0, 'nothing is sent before the SDK loads');
  api.start(); api.start(); await new Promise(r => setTimeout(r));
  assert.equal(loads, 1, 'loaded once');
  ready(); await new Promise(r => setTimeout(r));
  assert.equal(sent.length, 5);
  assert.deepEqual(sent.map(s => s[1]).map(v => v?.message ?? v), ['early', 'rejected', 'webgl-context-lost', 'webgl-context-restored', 'mid'], 'early errors, reports and breadcrumbs forwarded in the order they happened');
  assert.equal(sent[3][2].timestamp, 123456, 'the breadcrumb keeps the occurrence time through delayed SDK loading');
  assert.equal(sent[3][2].data.n, 1);
  assert.equal(sent[0][2].mechanism.handled, false);
  assert.equal(sent[2][2].level, 'warning');
  assert.deepEqual(sent[2][2].fingerprint, ['mulassa', 'webgl-context-lost'], 'a manual report groups by its kind');
  assert.equal(sent[0][2].fingerprint, undefined, 'exceptions keep the SDK grouping');
  assert.deepEqual(api.tags(), { state: 'select', pointer: 'touch' });
  win.fire('error', { error: new Error('late') });
  assert.equal(sent.length, 5, 'forwarded once: the SDK handles later errors itself');
  api.capture(new Error('now'));
  assert.equal(sent.length, 6, 'after loading, captures go straight through');
}
{
  const win = fakeWindow(), sent = [];
  const S = { captureException() {}, captureMessage: m => sent.push(m), addBreadcrumb: b => sent.push('b:' + b.message) };
  let ready;
  const api = createErrors({ mode: 'production', win, idle: f => f(), load: () => new Promise(r => { ready = () => r(S); }) });
  for (let i = 0; i < 40; i++) api.breadcrumb('c' + i);
  for (let i = 0; i < 12; i++) api.report('r' + i);
  api.start(); await new Promise(r => setTimeout(r)); ready(); await new Promise(r => setTimeout(r));
  assert.equal(sent.filter(m => !m.startsWith('b:')).length, 10, 'warnings keep their own capacity');
  assert.equal(sent.filter(m => m.startsWith('b:')).length, 20, 'breadcrumbs are capped');
}
{
  const sent = [];
  const S = { captureException: (e, h) => sent.push(h), captureMessage: (m, h) => sent.push(h), addBreadcrumb() {} };
  const api = createErrors({ mode: 'production', win: fakeWindow(), idle: f => f(), load: async () => S });
  api.start(); await new Promise(r => setTimeout(r));
  api.report('webgl-context-lost', { n: 1 });
  api.report('webgl-context-lost', { n: 2, extra: 'x' });
  api.report('audio-load-failed');
  api.capture(new Error('boom'), { n: 3 });
  assert.deepEqual(sent.map(h => h.fingerprint), [['mulassa', 'webgl-context-lost'], ['mulassa', 'webgl-context-lost'], ['mulassa', 'audio-load-failed'], undefined],
    'kinds get separate fingerprints, tags never change them, exceptions are left to the SDK');
}
assert.deepEqual(['TypeError', 'ReferenceError', 'SyntaxError', 'Whatever', undefined].map(n => errorName({ name: n })), ['TypeError', 'ReferenceError', 'SyntaxError', 'Other', 'Other'], 'standard diagnostic names stay recognizable while arbitrary names are rejected');
console.log('crash reports: gating, scrubbing, early buffer ok');

// The pre-bundle watchdog forwards only finite category tags, once, including a failure before this module loaded.
{
  const { readFileSync } = await import('node:fs'), { runInNewContext } = await import('node:vm');
  const source = readFileSync(new URL('../../src/services/errors.js', import.meta.url), 'utf8');
  const bridge = source.slice(source.indexOf('if (w) {\n  let bootReported'), source.indexOf("if (MODE === 'development'"));
  for (const early of [false, true]) {
    const sent = [], win = early ? { __mulassaBootFailure: { phase: 'shaders', reason: 'deadline' } } : {};
    const api = { report: (kind, tags) => sent.push([kind, { ...tags }]), start() {} };
    runInNewContext(bridge, { w: win, errors: api });
    if (!early) { win.__mulassaBootFailure = { phase: 'private free text', reason: 'https://example.test/?token=private' }; win.__mulassaReportBoot(); }
    win.__mulassaReportBoot();
    assert.deepEqual(sent, [['boot-failed', early ? { phase: 'shaders', reason: 'deadline' } : { phase: 'unknown', reason: 'unknown' }]]);
  }
  // the card for a WebGL context that never came back (pause-actions.js) already sent webgl-not-restored: no boot-failed too
  const sent = [], win = {};
  runInNewContext(bridge, { w: win, errors: { report: (kind, tags) => sent.push([kind, tags]), start() {} } });
  win.__mulassaBootFailure = { phase: 'frame', reason: 'webgl-not-restored' }; win.__mulassaReportBoot();
  assert.deepEqual(sent, [], 'a WebGL context that never came back is not reported again as boot-failed');
}
