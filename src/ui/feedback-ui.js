// «Bústia de la plaça» (#feedback-menu, index.html; opened by the title's speech-bubble button #feedback): a message, an
// optional e-mail, Envia. The message's own problem shows beside its counter, the rest (e-mail, Turnstile, network,
// «Rebut!») in the footer's status line over Envia. Opening sends nothing. Envia asks board-ui.js's Turnstile for a single-use token (usually
// silent; the tick box opens over this sheet if Cloudflare asks), then src/services/feedback.js sends it. The draft survives an
// accidental close (Escape, a tap outside) until it is sent, except one seeded from an «Aviat» card, cleared on close. The e-mail is kept once typed; a profile's confirmed one is filled in and locked; after «Rebut!» the sheet closes by itself.
import { feedback as defaultService, checkFeedback, cleanEmail, chars, MESSAGE_MIN, MESSAGE_MAX } from '../services/feedback.js';
import { turnstileMessage } from '../services/captcha.js';
import { errors } from '../services/errors.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupFeedback({ focusIn, captcha, service = defaultService, doc = document, closeDelay = 4000, report = errors.report, onOpen = () => {}, confirmedEmail = async () => '' }) {
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
  function show(onBack = null, draft = '') { // draft: the first words of an empty message («Sobre Reus: », from QUI BALLA?)
    if (menu.open) return;
    back = onBack; clearTimeout(closeTimer);
    seeded = !!draft;
    if (done || seeded) text.value = draft; // a figure's draft replaces whatever was there; sent: a fresh sheet
    if (locked) { email.value = ''; locked = false; } // the profile's address is asked again below (a sign-out frees the field)
    done = false; busy = false; req++;
    setInvalid(null); setSend(tr('ui.feedback.send'));
    counter();
    if (!configured) { sendBtn.disabled = true; setStatus(tr('ui.feedback.unavailable')); }
    menu.showModal();
    grow();
    const r = req;
    Promise.resolve(confirmedEmail()).then(m => { // a confirmed address is the profile's: filled in, not editable
      if (!m || r !== req || !menu.open) return;
      email.value = m; locked = true; email.readOnly = true; setInvalid(null);
    }, () => {});
    onOpen(); // the nudge (setupNudge) goes, for good
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
  };
}

// The nudge: after a game (a finished or quit run), back on the title, a small bubble beside the button says the box is
// there. At most once a visit and NUDGE_MAX times ever (only the count is kept, NUDGE_KEY), never again once the sheet
// has been opened; never over a sheet or a song. It goes after `life` ms, on any tap or key, a resize, or when the sheet
// opens. `place()` (main.js → title-layout.js nudgePlace) finds it a spot clear of the logo and the controls without
// moving anything; no spot, no bubble (and it doesn't count).
export const NUDGE_KEY = 'feedback-nudges', NUDGE_MAX = 3, NUDGE_TEXT = tr('ui.feedback.nudge');
export function setupNudge({ doc = document, win = globalThis, store, button, onTitle, free, place = () => ({}), delay = 1200, life = 6000,
  timers = { set: (f, ms) => setTimeout(f, ms), clear: id => clearTimeout(id) }, onChange = () => {} }) {
  const el = doc.getElementById('feedback-nudge');
  let armed = false, shownThisVisit = false, timer = null;
  const count = () => { const v = store.get(NUDGE_KEY); return v === 'done' ? Infinity : Number(v) || 0; };
  function hide() {
    timers.clear(timer); timer = null;
    if (el.hidden) return;
    el.hidden = true; el.textContent = '';
    button.removeAttribute('aria-describedby');
    onChange();
  }
  function tryShow() {
    timer = null;
    if (!armed || !onTitle()) { armed = false; return; } // left the title (a new game): this chance is gone
    if (!free() || button.hidden) { timer = timers.set(tryShow, 500); return; } // a sheet is up: wait for it
    armed = false;
    if (shownThisVisit || count() >= NUDGE_MAX) return;
    const box = place();
    if (!box) return;
    Object.assign(el.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    el.style.setProperty?.('--tail-x', `${box.tailX ?? 0}px`);
    el.dataset.tail = box.tail; el.dataset.big = String(box.h >= 50);
    shownThisVisit = true;
    store.set(NUDGE_KEY, String(count() + 1));
    el.textContent = NUDGE_TEXT; el.hidden = false;
    button.setAttribute('aria-describedby', 'feedback-nudge');
    onChange();
    timer = timers.set(hide, life);
  }
  // any tap or key puts it away (capture: before the game or a sheet takes the event)
  for (const ev of ['pointerdown', 'keydown', 'resize']) win.addEventListener?.(ev, () => { if (!el.hidden) hide(); }, true);
  return {
    get shown() { return !el.hidden; },
    // main.js toTitle(): a run just ended (or was left)
    arm() {
      if (shownThisVisit || count() >= NUDGE_MAX) return;
      armed = true; timers.clear(timer); timer = timers.set(tryShow, delay);
    },
    hide,
    done() { armed = false; hide(); store.set(NUDGE_KEY, 'done'); }, // the sheet was opened: it has done its job
  };
}
