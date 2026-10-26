// «Bústia de la plaça» (#feedback-menu, index.html; opened from Configuració or a pending figure): a message, an
// optional e-mail, Envia. The message's own problem shows beside its counter, the rest (e-mail, Turnstile, network,
// «Rebut!») in the footer's status line over Envia. Opening sends nothing. Envia asks board-ui.js's Turnstile for a single-use token (usually
// silent; the tick box opens over this sheet if Cloudflare asks), then src/services/feedback.js sends it. The draft survives an
// accidental close (Escape, a tap outside) until it is sent, except one seeded from an «Aviat» card, cleared on close. The e-mail is kept once typed; a profile's confirmed one is filled in and locked; after «Rebut!» the sheet closes by itself.
import { feedback as defaultService, checkFeedback, cleanEmail, chars, MESSAGE_MIN, MESSAGE_MAX } from '../services/feedback.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupFeedback({ focusIn, captcha, service = defaultService, doc = document, closeDelay = 4000, report = errors.report, confirmedEmail = async () => '' }) {
  const $ = byId(doc);
  const menu = $('feedback-menu'), form = $('feedback-form'), text = $('feedback-message'), email = $('feedback-email');
  const count = $('feedback-count'), msgError = $('feedback-error'), status = $('feedback-status'), sendBtn = $('feedback-send'), cancelBtn = $('feedback-cancel');
  const fields = { message: text, email };
  const configured = Boolean(service.configured && captcha);
  let req = 0, busy = false, done = false, seeded = false, locked = false, back = null, closeTimer = null;

  const setStatus = statusLine(status);
  // while it sends: a plain ring spins in the button, and the form is locked (no edits, no «Ara no», no closing)
  function setSend(label, disabled = false) {
    setButton(doc, sendBtn, label, disabled); // the ring is decorative: the form's aria-busy says it
    text.readOnly = disabled || done; email.readOnly = disabled || done || locked; cancelBtn.disabled = disabled;
    form.setAttribute('aria-busy', String(disabled));
  }
  const thanks = $('feedback-thanks'), thanksClose = $('feedback-thanks-close');
  thanksClose?.addEventListener('click', () => thanks.close());
  const tooShort = () => chars(text.value.trim()) < MESSAGE_MIN ? tr('ui.feedback.tooShort', { n: MESSAGE_MIN }) : tr('ui.feedback.tooLong', { n: MESSAGE_MAX });
  function setInvalid(field, message = '') { // the field goes red; the why beside the counter (message) or over Envia (e-mail)
    for (const [k, el] of Object.entries(fields)) el.setAttribute('aria-invalid', String(k === field));
    msgError.textContent = field === 'message' ? tooShort() : '';
    setStatus(field === 'email' ? message : '');
  }
  function counter() { count.textContent = `${chars(text.value.trim())}/${MESSAGE_MAX}`; }
  // 4 rows, growing with the text up to 8 (index.html max-height), then it scrolls: read only on input, never per frame
  function grow() {
    text.style.height = '';
    const h = text.scrollHeight, min = text.clientHeight;
    if (h > min) text.style.height = `${h + 4}px`; // + the borders
  }
  let known = ''; // the confirmed address the last time the sheet asked
  function show(onBack = null, draft = '') { // draft: the first words of an empty message («Sobre Reus: », from QUI BALLA?)
    if (menu.open) return;
    back = onBack; clearTimeout(closeTimer);
    seeded = !!draft;
    if (done || seeded) text.value = draft; // a figure's draft replaces whatever was there; sent: a fresh sheet
    if (locked) { email.value = ''; locked = false; } // the profile's address is asked again below (a sign-out frees the field)
    if (known && !email.value) { email.value = known; locked = true; email.readOnly = true; } // the last answer, in place before the first paint: the async one below only confirms it
    done = false; busy = false; req++;
    setInvalid(null); setSend(tr('ui.feedback.send'));
    counter();
    if (!configured) { sendBtn.disabled = true; setStatus(tr('ui.feedback.unavailable')); }
    menu.showModal();
    grow();
    const r = req;
    Promise.resolve(confirmedEmail()).then(m => { // a confirmed address is the profile's: filled in, not editable
      if (r !== req || !menu.open) return;
      known = m || '';
      if (!m) { if (locked) { email.value = ''; locked = false; email.readOnly = false; } return; }
      email.value = m; locked = true; email.readOnly = true;
      if (email.getAttribute('aria-invalid') === 'true') setInvalid(null); // not otherwise: it would wipe the «no disponible» line and shift the sheet
    }, () => {});
    focusIn(menu, 'feedback-message');
  }
  text.addEventListener('input', () => {
    counter(); grow();
    if (text.getAttribute('aria-invalid') === 'true' && checkFeedback(text.value, 'a@b.cat').ok) setInvalid(null);
  });
  email.addEventListener('input', () => {
    const clean = cleanEmail(email.value);
    if (clean !== email.value) { const at = email.selectionStart ?? clean.length; email.value = clean; try { email.setSelectionRange(Math.min(at, clean.length), Math.min(at, clean.length)); } catch { /* type=email has no selection API */ } }
    if (email.getAttribute('aria-invalid') === 'true' && (!email.value || checkFeedback('·····', email.value).ok)) setInvalid(null);
  });
  email.addEventListener('blur', () => { // say it right away, not only on Envia (an empty field waits for Envia)
    if (!email.value) return;
    const ok = checkFeedback('·····', email.value);
    if (!ok.ok && ok.field === 'email') setInvalid('email', ok.message);
  });
  form.addEventListener('submit', e => { e.preventDefault(); send(); });
  async function send() {
    if (done) { menu.close(); return; }
    if (busy || !configured) return; // a double tap sends once; no request without the service
    const ok = checkFeedback(text.value, email.value);
    if (!ok.ok) { setInvalid(ok.field, ok.message); fields[ok.field].focus(); return; }
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
      await service.send({ message: ok.message, email: ok.email, token });
      if (r !== req) return;
      done = true;
      busy = false;
      setSend(tr('ui.feedback.send'));
      menu.close(); // the box closes; a small «Rebut! Gràcies» sheet says it arrived (it closes by itself too)
      text.value = ''; done = false; setStatus(''); counter(); // the e-mail stays for the next message
      if (thanks && !thanks.open) {
        thanks.showModal(); focusIn(thanks, 'feedback-thanks-close');
        closeTimer = setTimeout(() => { if (thanks.open) thanks.close(); }, closeDelay);
      }
    } catch (e) {
      if (r !== req) return;
      if (!['rate_limit', 'offline', 'invalid_message', 'invalid_email'].includes(e?.code)) report('feedback-failed', { code: e?.code || e?.name || 'Error' });
      if (e?.code === 'invalid_message' || e?.code === 'invalid_email') {
        const f = e.code === 'invalid_email' ? 'email' : 'message';
        setInvalid(f, e.message); fields[f].focus();
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
    if (seeded) { text.value = ''; counter(); seeded = false; }
    const b = back; back = null;
    b?.();
  });
  return {
    get open() { return menu.open; },
    configured, show,
    warm() { Promise.resolve(confirmedEmail()).then(m => { known = m || ''; }, () => {}); }, // the sheet opens with the address already in place
  };
}
