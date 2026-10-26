// Turnstile for every player (src/services/captcha.js) with a fake widget: the silent startup check, the centred tick box only
// when Cloudflare asks (never mid-song, not dismissable, closes by itself), fresh single-use tokens for publishing,
// failures that never block the game (code logged and reported, one retry later, a clear message with the code).
import assert from 'node:assert/strict';
import { setupVerify, turnstileMessage } from '../../src/services/captcha.js';

class El {
  constructor(id) { Object.assign(this, { id, open: false, on: {}, children: [] }); }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t) { const e = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; for (const f of this.on[t] || []) f(e); return e; }
  showModal() { this.open = true; }
  close() { if (this.open) { this.open = false; this.fire('close'); } }
  focus() {}
}
const tick = () => new Promise(r => setTimeout(r, 0));
function make({ loadFails = false } = {}) {
  const els = new Map(['captcha-menu', 'captcha-box'].map(id => [id, new El(id)]));
  const doc = { getElementById: id => els.get(id) };
  const W = { renders: [], resets: 0, loads: 0 }, timers = [], reports = [], warns = [], env = { canShow: true, t: 0, loadFails };
  const turnstile = { render(box, o) { W.renders.push(o); W.box = box; return 'w1'; }, reset() { W.resets++; } };
  const verify = setupVerify({ doc, siteKey: 'site', load: async () => { W.loads++; if (env.loadFails) throw new Error('blocked'); return turnstile; },
    canShow: () => env.canShow, report: (k, t) => reports.push([k, t]), log: { warn: m => warns.push(m) },
    schedule: (f, ms) => timers.push({ f, ms }), now: () => env.t, host: () => 'localhost' });
  const o = () => W.renders.at(-1);
  return { verify, menu: els.get('captcha-menu'), W, timers, reports, warns, env, o, runTimers: () => { const t = timers.splice(0); t.forEach(x => x.f()); } };
}

// --- the silent check: rendered once, interaction-only, dark; a passing token shows nothing
{
  const { verify, menu, W, o } = make();
  verify.start(); verify.start(); await tick();
  assert.equal(W.renders.length, 1, 'one widget, however often start() is called');
  assert.deepEqual([o().appearance, o().theme, o().sitekey], ['interaction-only', 'dark', 'site'], 'only shows when needed, dark');
  assert.equal(o()['refresh-expired'], 'never', 'an unused token is not re-challenged every 5 minutes (maybe with the tick box)');
  assert.equal(W.box.id, 'captcha-box', 'rendered inside the (closed) centred sheet, never floating over the game');
  o().callback('tok-start');
  assert(!menu.open, 'passed silently: nothing on screen');
  assert.equal(await verify.token(), 'tok-start', 'publishing within the token’s life uses the startup token');
  const p = verify.token(); await tick();
  assert.equal(W.resets, 1, 'single use: the next publication re-executes the widget');
  o().callback('tok-2');
  assert.equal(await p, 'tok-2', 'a fresh token, straight to the waiting publication');
}
// --- a stale startup token (> ~270 s) is not used
{
  const { verify, W, o, env } = make();
  verify.start(); await tick(); o().callback('old');
  env.t = 280e3;
  const p = verify.token(); await tick();
  assert.equal(W.resets, 1, 'expired: asks again');
  o().callback('new'); assert.equal(await p, 'new');
}
// --- Turnstile says the unused token expired: nothing runs until a publication asks, then one new challenge
{
  const { verify, W, o } = make();
  verify.start(); await tick(); o().callback('old');
  o()['expired-callback']();
  assert.equal(W.resets, 0, 'no challenge on an idle screen');
  const p = verify.token(); await tick();
  assert.equal(W.resets, 1, 'the press asks again');
  o().callback('new'); assert.equal(await p, 'new');
}
// --- the tick box: only when Cloudflare asks, never mid-song, not dismissable, closes by itself with the token
{
  const { verify, menu, env, o, timers, runTimers } = make();
  env.canShow = false; // a song is playing
  verify.start(); await tick();
  o()['before-interactive-callback']();
  assert(!menu.open && timers.length === 1, 'mid-song: it waits');
  runTimers(); assert(!menu.open, 'still playing: still waiting');
  env.canShow = true; runTimers();
  assert(menu.open && verify.open, 'back on the title / results: the centred sheet opens');
  assert(menu.fire('cancel').defaultPrevented && menu.open, 'Escape and the backdrop (a cancel event) do nothing');
  o().callback('tok');
  assert(!menu.open, 'the token closes it by itself');
  assert.equal(await verify.token(), 'tok');
}
// --- at publish time Cloudflare asks again: the sheet opens, the token then continues the publication
{
  const { verify, menu, o } = make();
  verify.start(); await tick(); o().callback('t1'); await verify.token();
  const p = verify.token(); await tick();
  o()['before-interactive-callback']();
  assert(menu.open, 'the tick box over the publish sheet');
  o().callback('t2');
  assert.equal(await p, 't2'); assert(!menu.open);
}
// --- failures never block: code logged (with the host) and reported, retried once later, explained on publish
{
  const { verify, menu, W, o, reports, warns, timers, runTimers } = make();
  verify.start(); await tick();
  o()['before-interactive-callback'](); assert(menu.open);
  assert.equal(o()['error-callback']('110200'), true, 'handled (no console noise from the widget)');
  assert(!menu.open, 'an error closes the tick box: the game goes on');
  assert.deepEqual(reports.at(-1), ['turnstile-failed', { code: '110200' }], 'the code only, nothing personal');
  assert.match(warns.at(-1), /110200 on localhost/, 'the console says which host (Cloudflare: Hostname management)');
  assert.equal(verify.failure.code, '110200');
  assert.equal(timers.length, 1, 'one retry, later');
  runTimers(); await tick();
  assert.equal(W.resets, 1, 'the retry re-executes');
  o()['error-callback']('600010'); assert.equal(timers.length, 0, 'only once');
  const p = verify.token(); await tick();
  o()['error-callback']('600010');
  await assert.rejects(p, { code: '600010' }, 'publishing gets the code');
}
{
  const { verify, W, reports, env, o } = make({ loadFails: true });
  verify.start(); await tick();
  assert.equal(verify.failure.code, 'load', 'blocked / offline: remembered, not thrown at the game');
  assert.deepEqual(reports.at(-1), ['turnstile-failed', { code: 'load' }]);
  await assert.rejects(verify.token(), { code: 'load' }, 'publishing tries again and says so');
  env.loadFails = false;
  const p = verify.token(); await tick(); await tick();
  assert.equal(W.loads, 3, '«Torna-ho a provar» loads it again'); o().callback('ok'); assert.equal(await p, 'ok');
}
{ // the publish sheet went away while waiting: nobody waits any more
  const { verify, o } = make();
  verify.start(); await tick(); o().callback('a'); await verify.token();
  const p = verify.token(); await tick(); verify.cancel();
  await assert.rejects(p, { code: 'cancel' });
}
// --- the messages: clear Catalan with the code
assert.match(turnstileMessage('110200'), /no està autoritzat.*\(codi 110200\)/);
assert.match(turnstileMessage('600010'), /no ha pogut confirmar que no ets un robot\. Torna-ho a provar\. \(codi 600010\)/);
assert.match(turnstileMessage(300030), /robot/);
assert.match(turnstileMessage('110600'), /trigat massa/);
assert.match(turnstileMessage('load'), /No s’ha pogut carregar.*bloquejador/);
assert.match(turnstileMessage('200500'), /No s’ha pogut carregar/);
assert.match(turnstileMessage('999'), /La verificació ha fallat\. Torna-ho a provar\. \(codi 999\)/);
console.log('turnstile verification ok');
