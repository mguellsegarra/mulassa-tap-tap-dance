// «Bústia de la plaça» (#feedback-menu, index.html): one sheet for the three ways to write (general, material, colla or entity),
// reached only with a confirmed e-mail (confirm-gate.js), which the Worker takes from the session. The message's own problem shows
// beside its counter, the rest (Turnstile, network, «Rebut!») in the footer's status line. Opening sends nothing. Each kind keeps its
// own draft until it is sent, in memory only; a figure's go when another figure's sheet opens. After «Rebut!» the sheet closes by itself.
import { feedback as defaultService, checkFeedback, chars, MESSAGE_MIN, FIGURE_MESSAGE_MIN, MESSAGE_MAX } from '../services/feedback.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupFeedback({ focusIn, captcha, service = defaultService, doc = document, closeDelay = 4000, report = errors.report, accessToken = async () => '', openCode = () => globalThis.open('https://github.com/mguellsegarra/mulassa-tap-tap-dance', '_blank', 'noopener') }) {
  const $ = byId(doc);
  const menu = $('feedback-menu'), form = $('feedback-form'), text = $('feedback-message');
  const title = $('feedback-title'), lead = $('feedback-lead'), kindRow = $('feedback-kind'), material = $('feedback-material'), entity = $('feedback-entity'), entityName = $('feedback-entity-name');
  const count = $('feedback-count'), msgError = $('feedback-error'), status = $('feedback-status'), sendBtn = $('feedback-send'), cancelBtn = $('feedback-cancel');
  const fields = { message: text, entity: entityName };
  const configured = Boolean(service.configured && captcha);
  let req = 0, busy = false, done = false, back = null, closeTimer = null, request = { kind: 'general' };
  let drafts = {}, draftsFor; // by kind, one textarea; draftsFor: the figure the non-general ones belong to

  const setStatus = statusLine(status);
  // while it sends: a plain ring spins in the button, and the form is locked (no edits, no «Ara no», no closing)
  function setSend(label, disabled = false) {
    setButton(doc, sendBtn, label, disabled); // the ring is decorative: the form's aria-busy says it
    text.readOnly = disabled || done; entityName.readOnly = disabled || done; cancelBtn.disabled = disabled;
    form.setAttribute('aria-busy', String(disabled));
  }
  const thanks = $('feedback-thanks'), thanksClose = $('feedback-thanks-close');
  thanksClose?.addEventListener('click', () => thanks.close());
  const sendLabel = () => tr(request.kind === 'code' ? 'ui.code.open' : 'ui.feedback.send');
  const minChars = () => request.kind === 'general' ? MESSAGE_MIN : FIGURE_MESSAGE_MIN;
  const tooShort = () => chars(text.value.trim()) < minChars() ? tr('ui.feedback.tooShort', { n: minChars() }) : tr('ui.feedback.tooLong', { n: MESSAGE_MAX });
  function setInvalid(field) { // the field goes red; the why beside the counter
    for (const [k, el] of Object.entries(fields)) el.setAttribute('aria-invalid', String(k === field));
    msgError.textContent = field === 'message' ? tooShort() : '';
    setStatus('');
  }
  const picked = group => [...group.querySelectorAll('input:checked')].map(i => i.value);
  function clearChoices(within = form) { for (const i of within.querySelectorAll('input')) { if (within === form && !i.closest('.feedback-choices')) continue; if (i.type === 'text') i.value = ''; else i.checked = false; } }
  function counter() { count.textContent = `${chars(text.value.trim())}/${MESSAGE_MAX}`; }
  // 4 rows, growing with the text up to 8 (index.html max-height), then it scrolls: read only on input, never per frame
  function grow() {
    text.style.height = '';
    const h = text.scrollHeight, min = text.clientHeight;
    if (h > min) text.style.height = `${h + 4}px`; // + the borders
  }
  // One sheet, several ways to help: the choice at the top swaps the fields and each way's draft.
  function paintKind() {
    const k = request.kind, propose = k === 'entity' && !request.figure;
    kindRow.hidden = !request.choose;
    const coding = k === 'code';
    $('feedback-code').hidden = !coding; $('feedback-fields').hidden = coding;
    for (const i of kindRow.querySelectorAll('input')) i.checked = i.value === k;
    material.hidden = k !== 'material'; entity.hidden = k !== 'entity';
    $('feedback-direct').hidden = k !== 'general'; // the sheets for a figure stay short; rights and data stay on the general box and in Privadesa
    title.textContent = tr(request.choose || k === 'code' ? 'ui.help.title' : k === 'general' ? 'html.feedbackTitle' : propose ? 'figures.invite.action' : `html.${k}.title`);
    lead.textContent = k === 'general' ? tr('html.feedbackLead') : propose ? tr('figures.invite.text') : request.figure?.name ?? ''; // which figure this is about
    text.placeholder = tr(k === 'general' ? 'html.feedbackMessage.placeholder' : propose ? 'figures.invite.placeholder' : `ui.${k === 'code' ? 'material' : k}.placeholder`);
  }
  kindRow.addEventListener('change', e => {
    if (busy) { paintKind(); return; }
    drafts[request.kind] = text.value;
    // the sheet is centred and each way has its own height: hold its top, or the tabs leave the finger
    const top = menu.getBoundingClientRect().top;
    menu.style.marginBlock = `${top}px auto`; menu.style.maxHeight = `calc(100dvh - ${top + 8}px)`;
    request = { ...request, kind: e.target.value };
    text.value = drafts[request.kind] ?? '';
    setInvalid(null); paintKind(); setSend(sendLabel()); counter(); grow();
  });
  function show(onBack = null, wanted = { kind: 'general' }) {
    if (menu.open) return;
    back = onBack; clearTimeout(closeTimer);
    request = wanted;
    const k = request.kind, about = request.figure?.id ?? null;
    if (k !== 'general' && about !== draftsFor) { drafts = { general: drafts.general }; draftsFor = about; clearChoices(); }
    text.value = drafts[k] ?? '';
    paintKind();
    done = false; busy = false; req++;
    setInvalid(null); setSend(sendLabel());
    counter();
    if (!configured && request.kind !== 'code') { sendBtn.disabled = true; setStatus(tr('ui.feedback.unavailable')); }
    menu.showModal();
    grow();
    if (k === 'general') focusIn(menu, 'feedback-message'); else menu.focus({ preventScroll: true }); // the choices come first: no ring on the X, no keyboard yet
  }
  text.addEventListener('input', () => {
    counter(); grow();
    if (text.getAttribute('aria-invalid') === 'true' && checkFeedback(text.value, minChars()).ok) setInvalid(null);
  });
  form.addEventListener('submit', e => { e.preventDefault(); send(); });
  async function send() {
    if (done) { menu.close(); return; }
    if (request.kind === 'code') { openCode(); return; } // no message: this way of helping is on GitHub
    if (busy || !configured) return; // a double tap sends once; no request without the service
    const options = request.kind === 'material' ? picked(material) : request.kind === 'entity' ? picked(entity) : [];
    if (!options.length && request.kind !== 'general') { setInvalid(null); setStatus(tr(`ui.${request.kind}.${request.kind === 'material' ? 'optionsRequired' : 'typeRequired'}`)); return; }
    if (request.kind === 'entity' && !entityName.value.trim()) { setInvalid('entity'); setStatus(tr('ui.entity.nameRequired')); entityName.focus(); return; }
    const ok = checkFeedback(text.value, minChars());
    if (!ok.ok) { setInvalid(ok.field); fields[ok.field].focus(); return; }
    const sending = { kind: request.kind, figure: request.figure ?? null, options, entity: entityName.value.trim() }; // fixed before the first wait
    setInvalid(null);
    const r = ++req;
    busy = true;
    setSend(tr('ui.feedback.checking'), true); setStatus('');
    let token;
    try { token = await captcha.token(); } catch (e) {
      if (r !== req) return;
      busy = false;
      setStatus(e?.code === 'cancel' ? '' : turnstileMessage(e?.code));
      setSend(tr('ui.common.retry'));
      return;
    }
    if (r !== req) return;
    setSend(tr('ui.feedback.sending'), true);
    try {
      await service.send({ ...sending, message: ok.message, token, accessToken: await accessToken() });
      if (r !== req) return;
      done = true;
      busy = false;
      setSend(tr('ui.feedback.send'));
      menu.close(); // the box closes; a small «Rebut! Gràcies» sheet says it arrived (it closes by itself too)
      text.value = ''; drafts[sending.kind] = ''; if (sending.kind === 'material') clearChoices(material); else if (sending.kind === 'entity') clearChoices(entity);
      done = false; setStatus(''); counter();
      if (thanks && !thanks.open) {
        thanks.showModal(); focusIn(thanks, 'feedback-thanks-close');
        closeTimer = setTimeout(() => { if (thanks.open) thanks.close(); }, closeDelay);
      }
    } catch (e) {
      if (r !== req) return;
      if (!['rate_limit', 'daily_limit', 'auth_required', 'offline', 'invalid_message'].includes(e?.code)) report('feedback-failed', { code: e?.code || e?.name || 'Error' });
      if (e?.code === 'invalid_message') {
        setInvalid('message'); text.focus();
        setSend(tr('ui.feedback.send'));
      } else if (e?.code === 'daily_limit') {
        const reset = new Date(); reset.setUTCHours(24, 0, 0, 0);
        setStatus(tr('services.feedback.daily_limit', { time: reset.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) }));
        setSend(tr('ui.feedback.send'));
      } else { setStatus(e?.message || tr('ui.feedback.sendFailed')); setSend(tr('ui.common.retry')); }
    } finally { if (r === req) busy = false; }
  }
  cancelBtn.addEventListener('click', () => { if (!busy) menu.close(); });
  menu.addEventListener('cancel', e => { if (busy) e.preventDefault(); }); // Escape or a tap outside: not while it sends
  menu.addEventListener('close', () => {
    req++; busy = false; clearTimeout(closeTimer);
    captcha?.cancel(); // nobody waits for a token any more
    cancelBtn.hidden = false;
    drafts[request.kind] = text.value;
    menu.style.marginBlock = menu.style.maxHeight = '';
    const b = back; back = null;
    b?.();
  });
  return {
    get open() { return menu.open; },
    configured, show,
  };
}
