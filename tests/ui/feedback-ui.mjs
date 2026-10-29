// «Bústia de la plaça» sheet (src/ui/feedback-ui.js) on a tiny mocked DOM: nothing sent on open, field checks, one token per
// message from the shared Turnstile, success closes by itself, errors in Catalan, a draft survives an accidental close unless an Aviat card seeded it.
import assert from 'node:assert/strict';
import { setupFeedback } from '../../src/ui/feedback-ui.js';
import { FeedbackError } from '../../src/services/feedback.js';

const nodes = new Map();
const el = id => {
  if (!nodes.has(id)) nodes.set(id, {
    id, value: '', textContent: '', style: {}, dataset: {}, scrollHeight: 100, clientHeight: 100, hidden: false, disabled: false, readOnly: false, open: false, attrs: {}, listeners: {}, cls: new Set(),
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, fire(t, e = {}) { for (const f of this.listeners[t] || []) f({ preventDefault() {}, ...e }); },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { toggle(c, on) { const s = nodes.get(id).cls; (on ?? !s.has(c)) ? s.add(c) : s.delete(c); } },
    prepend(c) { this.first = c; }, showModal() { this.open = true; }, close() { if (!this.open) return; this.open = false; this.fire('close'); }, focus() { focused = id; },
  });
  return nodes.get(id);
};
let focused = null;
const doc = { getElementById: el, createElement: tag => ({ tag, className: '', innerHTML: '' }) };
const tick = () => new Promise(r => setImmediate(r));
let tokens = 0, tokenFail = null, cancels = 0, sent = [], sendFail = null, reports = [], timers = [];
const captcha = { token: async () => { if (tokenFail) throw tokenFail; return `tok${++tokens}`; }, cancel() { cancels++; } };
const service = { configured: true, send: async m => { if (sendFail) throw sendFail; sent.push(m); return true; } };
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (f, ms) => { timers.push(f); return timers.length; };
globalThis.clearTimeout = () => {};
const fb = setupFeedback({ focusIn: (menu, id) => el(id).focus(), captcha, service, doc, report: (k, t) => reports.push([k, t]) });
const menu = el('feedback-menu'), text = el('feedback-message'), email = el('feedback-email'), status = el('feedback-status'), send = el('feedback-send');
const submit = async () => { el('feedback-form').fire('submit'); await tick(); await tick(); };

assert.equal(setupFeedback({ focusIn() {}, captcha: null, service, doc }).configured, false, 'no Turnstile here: no button');
assert.equal(fb.configured, true);
let backs = 0;
fb.show(() => backs++);
assert(menu.open && focused === 'feedback-message' && tokens === 0 && sent.length === 0, 'opening sends nothing, asks for no token');
assert.equal(el('feedback-count').textContent, '0/1000');

// too short: the field goes red, the reason in the status line, no token spent
text.value = 'hey'; text.fire('input');
assert.equal(el('feedback-count').textContent, '3/1000'); assert.equal(el('feedback-error').textContent, '', '«Mínim» only once they try');
await submit();
assert.equal(text.attrs['aria-invalid'], 'true'); assert.equal(el('feedback-error').textContent, 'Mínim 5 caràcters'); assert.equal(status.textContent, ''); assert.equal(tokens, 0);
text.scrollHeight = 180; text.fire('input'); assert.equal(text.style.height, '184px', 'the box grows with the text'); text.scrollHeight = 100;
text.value = 'Molt bon joc, però el DIFÍCIL em mata'; text.fire('input');
assert.equal(text.attrs['aria-invalid'], 'false'); assert.equal(el('feedback-error').textContent, '', 'typing a valid message clears the complaint');
email.value = 'no-arroba'; await submit();
assert.equal(email.attrs['aria-invalid'], 'true'); assert.match(status.textContent, /correu/); assert.equal(focused, 'feedback-email');

// the e-mail field: what an address can't hold goes as it is typed; the check runs on leaving the field
email.value = ''; email.fire('input'); email.fire('blur');
assert.equal(email.attrs['aria-invalid'], 'false', 'an empty e-mail waits for Envia: no complaint on leaving the field');
email.value = ' “àlex” @domini.cat'; email.fire('input');
assert.equal(email.value, 'lex@domini.cat', 'spaces, accents and quotes dropped while typing');
email.value = 'jo@exemple'; email.fire('input');
assert.equal(email.attrs['aria-invalid'], 'false', 'no complaint while typing');
email.fire('blur');
assert.equal(email.attrs['aria-invalid'], 'true'); assert.match(status.textContent, /correu/, 'on blur: why, over Envia');
assert.equal(sent.length + tokens, 0, 'blur sends nothing');
email.value = 'jo@exemple.cat'; email.fire('input');
assert.equal(email.attrs['aria-invalid'], 'false'); assert.equal(status.textContent, '', 'fixed: the complaint goes as they type');
email.fire('blur'); assert.equal(email.attrs['aria-invalid'], 'false', 'a valid one stays quiet');

// Turnstile fails: its reason, a retry label; nothing sent
email.value = ' jo@exemple.cat '; email.fire('input');
assert.equal(email.value, 'jo@exemple.cat');
tokenFail = { code: '300010' }; await submit();
assert.match(status.textContent, /robot/); assert.equal(send.textContent, 'Torna-ho a provar'); assert.equal(sent.length, 0);
tokenFail = null;

// the server says rate limit: the message in Catalan, not reported as a crash
sendFail = new FeedbackError('rate_limit', 'Has enviat molts missatges seguits.'); await submit();
assert.equal(status.textContent, 'Has enviat molts missatges seguits.'); assert.equal(reports.length, 0);
sendFail = new FeedbackError('unavailable', 'Ara mateix no s’ha pogut enviar.'); await submit();
assert.deepEqual(reports, [['feedback-failed', { code: 'unavailable' }]], 'service failures: a code, never the text');
sendFail = null;

// a close by accident keeps the draft
menu.close();
assert.equal(backs, 1); assert(cancels >= 1, 'nobody waits for a token after closing');
fb.show(); assert.equal(text.value, 'Molt bon joc, però el DIFÍCIL em mata'); assert.equal(status.textContent, '');

// success: one fresh token, trimmed values, «Rebut!», then it closes by itself; the next open is empty
const before = tokens;
el('feedback-form').fire('submit'); await submit(); // a double tap sends once
assert.equal(sent.length, 1); assert.equal(tokens, before + 1);
assert.deepEqual(sent[0], { message: 'Molt bon joc, però el DIFÍCIL em mata', email: 'jo@exemple.cat', token: `tok${tokens}` });
assert.equal(menu.open, false, 'sent: the box closes');
assert(el('feedback-thanks').open && focused === 'feedback-thanks-close', 'and «Rebut! Gràcies» opens');
timers.at(-1)(); assert.equal(el('feedback-thanks').open, false, 'the thank-you closes by itself');
fb.show(); assert.equal(text.value, ''); assert.equal(email.value, 'jo@exemple.cat', 'the e-mail stays for the next message'); assert(!text.readOnly && !email.readOnly && !el('feedback-cancel').disabled, 'the next one starts empty and open');
menu.close(); fb.show(null, 'Sobre Tarragona: ');
assert.equal(text.value, 'Sobre Tarragona: ', 'Aviat can seed an empty draft');
text.value = 'Un esborrany meu'; email.value = 'jo@exemple.cat'; menu.close(); fb.show(null, 'Sobre Reus: ');
assert.equal(text.value, 'Sobre Reus: ', 'a figure draft replaces an unsent message'); assert.equal(email.value, 'jo@exemple.cat', 'the typed e-mail stays');
text.value = 'Sobre Reus: i més'; menu.close(); fb.show();
assert.equal(text.value, '', 'closing a seeded sheet empties it, so the next plain opening is blank'); assert.equal(email.value, 'jo@exemple.cat');
{ // while it sends: the calçot in the button, the form locked, no closing
  let release; service.send = () => new Promise(r => { release = r; });
  text.value = 'Un altre missatge'; email.value = 'jo@exemple.cat'; el('feedback-form').fire('submit'); await tick(); await tick();
  assert(send.disabled && send.first?.className === 'btn-spin' && text.readOnly && email.readOnly && el('feedback-cancel').disabled, 'spinner + locked');
  let prevented = false; menu.fire('cancel', { preventDefault() { prevented = true; } });
  assert(prevented, 'Escape / a tap outside do nothing while it sends');
  assert(menu.open && el('feedback-cancel').disabled, '«Ara no» is disabled (a disabled button gets no clicks)');
  release(true); await tick(); await tick();
  assert(!menu.open && el('feedback-thanks').open);
}
globalThis.setTimeout = realTimeout;

{ // a profile's confirmed address: filled in and not editable; a sign-out frees the field again
  let mail = 'conf@exemple.cat', fail = false;
  const f = setupFeedback({ focusIn() {}, captcha, service, doc, confirmedEmail: async () => { if (fail) throw new Error('offline'); return mail; } });
  menu.close(); email.value = 'altre@exemple.cat'; f.show(); await tick();
  assert.equal(email.value, 'conf@exemple.cat', 'the confirmed address replaces a typed one'); assert(email.readOnly, 'and cannot be changed');
  let got = null; service.send = async m => { got = m; return true; };
  text.value = 'Un missatge prou llarg'; await submit(); assert.equal(got?.email, 'conf@exemple.cat', 'it is the one sent'); assert(!menu.open);
  mail = ''; f.show(); await tick();
  assert.equal(email.value, '', 'signed out: the locked address goes'); assert(!email.readOnly, 'and the field is free');
  menu.close(); mail = 'conf@exemple.cat'; fail = true; email.value = 'meu@exemple.cat'; f.show(); await tick();
  assert.equal(email.value, 'meu@exemple.cat'); assert(!email.readOnly, 'no answer from the server: the field stays as it was');
  menu.close();
}
console.log('feedback sheet ok');
