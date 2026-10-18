// «Bústia de la plaça» sheet (src/ui/feedback-ui.js) on a tiny mocked DOM: nothing sent on open, field checks, one token per
// message from the shared Turnstile, success closes by itself, errors in Catalan, a draft survives an accidental close.
import assert from 'node:assert/strict';
import { setupFeedback, setupNudge, NUDGE_KEY, NUDGE_MAX } from '../src/ui/feedback-ui.js';
import { FeedbackError } from '../src/services/feedback.js';

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
fb.show(); assert.equal(text.value, ''); assert.equal(email.value, ''); assert(!text.readOnly && !el('feedback-cancel').disabled, 'the next one starts empty and open');
menu.close(); fb.show(null, 'Sobre Tarragona: ');
assert.equal(text.value, 'Sobre Tarragona: ', 'Aviat can seed an empty draft');
text.value = 'Un esborrany meu'; menu.close(); fb.show(null, 'Sobre Reus: ');
assert.equal(text.value, 'Un esborrany meu', 'a figure hint never overwrites an unsent message');
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

// --- the nudge after a game: waits for a free title, once a visit, NUDGE_MAX ever, never after the sheet was opened
{
  const saved = new Map(), store = { get: k => saved.get(k) ?? null, set: (k, v) => saved.set(k, v) };
  let q = [], title = true, free = true, changes = 0;
  const timers = { set: (f, ms) => (q.push({ f, ms }), q.length), clear: id => { if (id) q[id - 1] = null; } };
  const flush = () => { const run = q; q = []; for (const t of run) t?.f(); };
  const win = { handlers: {}, addEventListener(t, f) { this.handlers[t] = f; } };
  const btn = el('feedback'); btn.removeAttribute = k => { delete btn.attrs[k]; };
  const bubble = el('feedback-nudge'); bubble.hidden = true;
  const visit = () => setupNudge({ doc, win, store, button: btn, onTitle: () => title, free: () => free, timers, onChange: () => changes++ });
  let n = setupNudge({ doc, win, store, button: btn, onTitle: () => title, free: () => free, timers, place: () => null });
  n.arm(); flush(); assert(bubble.hidden && store.get(NUDGE_KEY) == null, 'no spot clear of the logo: no bubble, not counted');
  n = setupNudge({ doc, win, store, button: btn, onTitle: () => title, free: () => free, timers, onChange: () => changes++,
    place: () => ({ x: 64, y: 10, w: 139, h: 44, tail: 'right' }) });
  n.arm(); assert(bubble.hidden, 'not at once: a moment after the title appears');
  free = false; flush(); assert(bubble.hidden, 'never over a sheet'); assert.equal(q.at(-1).ms, 500, 'it waits for the sheet to go');
  free = true; flush();
  assert(!bubble.hidden && bubble.textContent && btn.attrs['aria-describedby'] === 'feedback-nudge' && changes === 1, 'shown, described');
  assert(bubble.style.left === '64px' && bubble.style.width === '139px' && bubble.dataset?.tail === 'right', 'where place() put it');
  assert.equal(store.get(NUDGE_KEY), '1');
  assert.equal(q.at(-1).ms, 6000); flush(); assert(bubble.hidden && !btn.attrs['aria-describedby'] && bubble.textContent === '', 'gone after 6 s');
  n.arm(); flush(); flush(); assert(bubble.hidden, 'once a visit'); assert.equal(store.get(NUDGE_KEY), '1');
  n = visit(); n.arm(); flush(); assert(!bubble.hidden); win.handlers.pointerdown(); assert(bubble.hidden, 'any tap puts it away');
  n = visit(); n.arm(); flush(); assert(!bubble.hidden); win.handlers.keydown(); assert(bubble.hidden, 'any key too');
  assert.equal(store.get(NUDGE_KEY), String(NUDGE_MAX));
  n = visit(); n.arm(); flush(); assert(bubble.hidden, `at most ${NUDGE_MAX} times`);
  saved.set(NUDGE_KEY, '1'); n = visit(); title = false; n.arm(); flush(); title = true; flush(); assert(bubble.hidden, 'a game started meanwhile: no bubble over it');
  n = visit(); n.arm(); flush(); assert(!bubble.hidden); n.done(); assert(bubble.hidden && store.get(NUDGE_KEY) === 'done', 'opening the sheet ends it, for good');
  n = visit(); n.arm(); flush(); assert(bubble.hidden, 'never again');
  // the sheet's opening is what calls done() (main.js onOpen)
  let opened = 0; menu.open = false;
  setupFeedback({ focusIn() {}, captcha, service, doc, onOpen: () => opened++ }).show(); assert.equal(opened, 1);
}
console.log('feedback sheet and nudge ok');
