// «Bústia de la plaça» sheet (src/ui/feedback-ui.js) on a tiny mocked DOM: nothing sent on open, field checks, one token per
// message from the shared Turnstile, success closes by itself, errors in Catalan, a draft survives an accidental close, each way of helping keeps its own draft for its figure.
import assert from 'node:assert/strict';
import { setupFeedback } from '../../src/ui/feedback-ui.js';
import { FeedbackError } from '../../src/services/feedback.js';

const nodes = new Map();
const el = id => {
  if (!nodes.has(id)) nodes.set(id, {
    id, value: '', textContent: '', style: {}, getBoundingClientRect: () => ({ top: 40 }), dataset: {}, scrollHeight: 100, clientHeight: 100, hidden: false, disabled: false, readOnly: false, open: false, attrs: {}, listeners: {}, cls: new Set(),
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }, fire(t, e = {}) { for (const f of this.listeners[t] || []) f({ preventDefault() {}, ...e }); },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    classList: { toggle(c, on) { const s = nodes.get(id).cls; (on ?? !s.has(c)) ? s.add(c) : s.delete(c); } },
    querySelectorAll() { return this.choices ?? []; }, prepend(c) { this.first = c; }, showModal() { this.open = true; }, close() { if (!this.open) return; this.open = false; this.fire('close'); }, focus() { focused = id; },
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
let opened = 0; globalThis.open = () => {}; // the harness's other sheets share these nodes
assert.equal(setupFeedback({ focusIn() {}, captcha: null, service, doc }).configured, false, 'no Turnstile here: no button');
for (const n of nodes.values()) n.listeners = {}; // that sheet is gone: only one owns these nodes
const fb = setupFeedback({ focusIn: (menu, id) => el(id).focus(), captcha, service, doc, report: (k, t) => reports.push([k, t]), accessToken: async () => 'jwt', openCode: () => opened++ });
const menu = el('feedback-menu'), text = el('feedback-message'), status = el('feedback-status'), send = el('feedback-send');
const submit = async () => { el('feedback-form').fire('submit'); await tick(); await tick(); };

assert.equal(fb.configured, true);
let backs = 0;
fb.show(() => backs++);
assert(menu.open && focused === 'feedback-message' && tokens === 0 && sent.length === 0, 'opening sends nothing, asks for no token');
assert.equal(el('feedback-count').textContent, '0/1000');

// too short: the field goes red, the reason in the status line, no token spent
text.value = 'hey'; text.fire('input');
assert.equal(el('feedback-count').textContent, '3/1000'); assert.equal(el('feedback-error').textContent, '', '«Mínim» only once they try');
await submit();
assert.equal(text.attrs['aria-invalid'], 'true'); assert.equal(el('feedback-error').textContent, 'Escriu com a mínim 5 caràcters'); assert.equal(status.textContent, ''); assert.equal(tokens, 0);
text.scrollHeight = 180; text.fire('input'); assert.equal(text.style.height, '184px', 'the box grows with the text'); text.scrollHeight = 100;
text.value = 'Molt bon joc, però el DIFÍCIL em mata'; text.fire('input');
assert.equal(text.attrs['aria-invalid'], 'false'); assert.equal(el('feedback-error').textContent, '', 'typing a valid message clears the complaint');
// Turnstile fails: its reason, a retry label; nothing sent
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
assert.deepEqual(sent[0], { kind: 'general', figure: null, options: [], entity: '', message: 'Molt bon joc, però el DIFÍCIL em mata', token: `tok${tokens}`, accessToken: 'jwt' }, 'the address never comes from the client');
assert.equal(menu.open, false, 'sent: the box closes');
assert(el('feedback-thanks').open && focused === 'feedback-thanks-close', 'and «Rebut! Gràcies» opens');
timers.at(-1)(); assert.equal(el('feedback-thanks').open, false, 'the thank-you closes by itself');
fb.show(); assert.equal(text.value, ''); assert(!text.readOnly && !el('feedback-cancel').disabled);

// the sheet for a figure: starts empty over an unsent message, asks what you have, needs 20 characters
text.value = 'Un esborrany meu'; menu.close();
const figure = { id: 'bou', name: 'Bou de Valls' }, material = el('feedback-material'), entity = el('feedback-entity'), kinds = el('feedback-kind'), name = el('feedback-entity-name');
const help = { kind: 'material', figure, choose: true };
fb.show(null, help);
assert.equal(text.value, ''); assert(!material.hidden && entity.hidden && !kinds.hidden); assert.equal(el('feedback-title').textContent, 'Vull ajudar'); assert.equal(el('feedback-lead').textContent, 'Bou de Valls');
sent.length = 0; text.value = 'Tinc la partitura original del ball'; await submit();
assert.equal(status.textContent, 'Marca quin material tens.'); assert.equal(sent.length, 0);
material.choices = [{ value: 'music' }]; text.value = 'Tinc fotos'; await submit();
assert.equal(el('feedback-error').textContent, 'Escriu com a mínim 20 caràcters'); assert.equal(sent.length, 0);
text.value = 'Tinc la partitura original del ball'; await submit();
assert.deepEqual([sent[0].kind, sent[0].figure, sent[0].options], ['material', figure, ['music']]);
timers.at(-1)(); material.choices = [];
// each tab has its own draft and asks its own questions; the sheet's top holds so the tabs stay under the finger
fb.show(null, help); assert.equal(text.value, '', 'sent: that draft is gone'); text.value = 'Un esborrany de material';
kinds.fire('change', { target: { value: 'entity' } });
assert(material.hidden && !entity.hidden); assert.equal(text.value, '', 'not the other tab\'s words');
assert.equal(menu.style.marginBlock, '40px auto', 'held where it was');
text.value = 'Som la colla i en volem parlar'; kinds.fire('change', { target: { value: 'material' } });
assert.equal(text.value, 'Un esborrany de material', 'back on a tab: its own words'); kinds.fire('change', { target: { value: 'entity' } });
assert.equal(text.value, 'Som la colla i en volem parlar');
menu.close(); assert.equal(menu.style.marginBlock, '', 'centred again on the next opening');
fb.show(null, { ...help, kind: 'entity' }); assert.equal(text.value, 'Som la colla i en volem parlar', 'an accidental close keeps it for this figure');
menu.close(); fb.show(null, { kind: 'entity', figure: { id: 'drac', name: 'Drac' }, choose: true }); assert.equal(text.value, '', 'another figure: nothing of the last one');
menu.close(); fb.show(null, { ...help, kind: 'entity' }); assert.equal(text.value, '', 'and it does not come back'); text.value = 'Som la colla i en volem parlar';
sent.length = 0; await submit(); assert.equal(status.textContent, 'Tria des d’on ens escrius.'.replace('’', "'"));
entity.choices = [{ value: 'colla' }]; await submit(); assert.equal(status.textContent, 'Escriu el nom de la colla o entitat.'); assert.equal(sent.length, 0);
name.value = 'Colla de Prova'; await submit();
assert.deepEqual([sent[0].kind, sent[0].options, sent[0].entity], ['entity', ['colla'], 'Colla de Prova']);
timers.at(-1)(); entity.choices = [];
// the code tab: no fields, no message; its button opens GitHub
fb.show(null, help); text.value = ''; sent.length = 0;
kinds.fire('change', { target: { value: 'code' } }); assert(el('feedback-fields').hidden && !el('feedback-code').hidden);
assert.equal(send.textContent, 'Obre GitHub'); await submit(); assert.equal(opened, 1); assert.equal(sent.length, 0, 'nothing sent');
menu.close();
// a proposal: no figure, no tabs
fb.show(null, { kind: 'entity', figure: null }); assert(kinds.hidden); assert.equal(el('feedback-title').textContent, 'Proposa una figura');
name.value = ''; menu.close();
// the daily limit: its own words with the hour, the draft kept, not reported as a crash
fb.show(); text.value = 'Un missatge qualsevol'; reports.length = 0;
sendFail = new FeedbackError('daily_limit', 'x'); await submit();
assert.match(status.textContent, /^Avui ja has fet 3 enviaments/); assert.equal(text.value, 'Un missatge qualsevol'); assert.equal(reports.length, 0);
sendFail = null; menu.close();
{ // while it sends: the calçot in the button, the form locked, no closing
  let release; service.send = () => new Promise(r => { release = r; });
  fb.show(); text.value = 'Un altre missatge'; el('feedback-form').fire('submit'); await tick(); await tick();
  assert(send.disabled && send.first?.className === 'btn-spin' && text.readOnly && el('feedback-cancel').disabled, 'spinner + locked');
  let prevented = false; menu.fire('cancel', { preventDefault() { prevented = true; } });
  assert(prevented, 'Escape / a tap outside do nothing while it sends');
  assert(menu.open && el('feedback-cancel').disabled, '«Ara no» is disabled (a disabled button gets no clicks)');
  release(true); await tick(); await tick();
  assert(!menu.open && el('feedback-thanks').open);
}
globalThis.setTimeout = realTimeout;

console.log('feedback sheet ok');
