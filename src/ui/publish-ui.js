// «Publica el resultat»: the publish sheet (the nickname is chosen once, here; there is no renaming), its Turnstile token for
// a new profile, «Publicat!» with the place, and the prompt's memory (declines, opt-out). setupBoard (board-ui.js) owns the
// results screen's run (`runs`) and when the prompt opens by itself.
import { rememberIdentity, ALIAS_KEY, savedName } from '../services/leaderboard-identity.js';
import { boardIssue } from '../services/leaderboard-errors.js';
import { checkAlias } from '../services/alias-rules.js';
import { DIFFS } from '../game/chart.js';
import { quality, starsFor } from '../game/progress.js';
import { num, statusLine, setButton, trSplit } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { mulaSpinner } from './loader.js';
import { turnstileMessage } from '../services/captcha.js';
import { appendName } from './profile-notes.js';
import { setupLanding } from './publish-land.js';

// «Ara no» to the prompt that opens by itself after a run, in a row: at MAX_DECLINES it stops opening by itself (the
// results row's «Publica el resultat» stays); any publication starts the count again. Only this number is kept.
export const DECLINES_KEY = 'publish-declines', MAX_DECLINES = 3;
export const OPTOUT_KEY = 'publish-optout'; // «No m’ho tornis a recordar»: the prompt never opens by itself again (⚙ Configuració turns it back on)
const NAMES = Array.from({ length: 8 }, (_, i) => tr(`ui.board.alias.${i + 1}`));
// A fictional, editable suggestion: nobody should feel asked for their real name.
export const suggestAlias = (rand = Math.random) => `${NAMES[Math.floor(rand() * NAMES.length)]}${100 + Math.floor(rand() * 900)}`; // no spaces
export { PERSIST_KEY } from './publish-land.js';
const topPct = (pos, total) => Math.max(1, Math.ceil(100 * pos / total)); // «top 17%»; never «top 0%»
export const declines = store => Number(store.get(DECLINES_KEY)) || 0;

export function setupPublish({ doc, $, service, store, focusIn, now, runs, canWrite, verify, deviceNote, openBoard,
  onRecover, onConfirm, acceptStats, afterPublish, settle, persist }) {
  const publishMenu = $('publish-menu');
  const aliasInput = $('publish-alias'), publishStatus = $('publish-status'), fieldError = $('publish-error'), sendBtn = $('publish-send'), cancelBtn = $('publish-cancel'), neverBtn = $('publish-never');
  const { landed, publishQuietly } = setupLanding({ service, store, runs, canWrite, acceptStats, persist, declinesKey: DECLINES_KEY });
  const placeLine = $('publish-place'), asLine = $('publish-as'), field = $('publish-field');
  let publishReq = 0, done = false, busy = false;
  // auto: this sheet opened by itself (closing it unpublished is an «Ara no»); armedAt: a tap already on its way when it
  // appeared must not publish
  let auto = false, armedAt = 0;
  let needsCaptcha = false, hadSession = true; // hadSession: a profile here when the publish sheet opened
  // An existing profile publishes with one tap (its alias shown); a new one needs a Turnstile token,
  // asked for only once Publica is pressed (the startup check's, if still fresh): opening the sheet sends nothing.
  async function prepare(req) {
    needsCaptcha = false; hadSession = true;
    let id = { hasSession: false, persistent: true }, prof;
    try { id = await service.identity(); } catch { /* the publish call reports it */ }
    if (id.hasSession && service.profile) try { prof = await service.profile(); } catch { /* unknown: the remembered name stands */ }
    if (req !== publishReq || !publishMenu.open) return;
    // a remembered name whose profile row is gone (deleted elsewhere, or a guest 12 months away): this browser starts a new one
    if (prof === null && !id.email && store.get(ALIAS_KEY)) {
      try { await service.signOut(); } catch { /* the publication reports it */ }
      if (req !== publishReq || !publishMenu.open) return;
      id = { ...id, hasSession: false };
    }
    if (prof) { rememberIdentity(store, ALIAS_KEY, prof); if (asLine.hidden === false) { aliasInput.value = prof.alias; showField(false, prof); } }
    $('publish-temp').hidden = id.persistent !== false;
    // published before (the remembered alias or a session) in a browser that loses its storage; the blocked-storage case
    // already has publish-temp
    const note = id.persistent !== false && !id.email && (store.get(ALIAS_KEY) || id.hasSession) ? deviceNote(true) : ''; // an e-mail on the profile: it can't be lost
    $('publish-device').textContent = note; $('publish-device').hidden = !note;
    hadSession = id.hasSession;
    $('publish-recover').hidden = id.hasSession || !onRecover; // a profile here: nothing to recover
    sendBtn.disabled = false;
    if (!id.hasSession) showField(true); // no profile here after all: the nickname is theirs to pick
    if (id.hasSession || !service.captchaRequired) return;
    if (!verify) { setPublishStatus(tr('ui.board.publishNoService')); sendBtn.disabled = true; return; }
    needsCaptcha = true;
  }
  // the one-tap view (the remembered name, its tag and check) or the editable field
  function showField(on, who = savedName(store)) {
    field.hidden = !on;
    asLine.hidden = on;
    if (!on) { const b = $('publish-as-name'); b.replaceChildren(); appendName(doc, b, who); }
  }
  // the run in one line: «94% a DIFÍCIL · ★★★» (the stars as the results card shows them)
  const starText = value => (starsFor(value) ? ` · ${'★'.repeat(starsFor(value))}` : ''); // nothing for 0 stars
  const runLine = run => { const lvl = doc.createElement('span'); lvl.className = `lvt${run.difficulty}`; lvl.textContent = DIFFS[run.difficulty].name; // the level in its colour
    const [pre, post] = trSplit('ui.board.runLine', 'level', { pct: Math.round(quality(run.counts)) }); return [pre, lvl, post + starText(quality(run.counts))]; };
  // «Ets el número 347 · top 17%!»: the own row of the joint board. Resolves to the line (or null) for Comparteix's
  // header too.
  async function showPlace(req, version) {
    let self = null, total = 0;
    try {
      const rows = (await service.listAll({ version })) ?? []; // the run's board; the first page carries the caller's row
      self = rows.find(r => r.is_self); total = Number(self?.total) || 0;
    } catch { /* the success stays */ }
    if (!self || !total) return null;
    const pos = Number(self.position), text = tr('ui.board.place', { pos: num(pos), top: topPct(pos, total) });
    if (req === publishReq) { placeLine.textContent = text; placeLine.hidden = false; }
    return text;
  }

  // --- Publica el resultat (the nickname is chosen once, here; there is no renaming). The nickname's own problems (rules, taken) show
  // under the field; everything else (Turnstile, network, success) in the status line over the buttons.
  // A status / place line coming or going eases the end's height (0.2 s) instead of jumping: the buttons stay at its
  // bottom (index.html: flex-end) and the line slides in over them. No room is kept for it beforehand (a blank hole).
  const endIn = $('publish-end-in'), endBox = endIn?.parentElement;
  if (endIn && globalThis.ResizeObserver) {
    let lastH = 0, lastW = 0, grow = null;
    new ResizeObserver(([e]) => {
      const h = e.borderBoxSize?.[0]?.blockSize ?? endIn.offsetHeight, w = e.contentRect.width;
      const running = grow?.playState === 'running', from = running ? endBox.getBoundingClientRect().height : lastH;
      const resized = w !== lastW; // opened (0 → size) or the window changed: no easing
      lastH = h; lastW = w;
      if (running) grow.cancel();
      if (resized || !publishMenu.open || !from || !h || Math.abs(h - from) < 1
        || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      grow = endBox.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${h}px`, overflow: 'hidden' }],
        { duration: 200, easing: 'cubic-bezier(.2, .7, .3, 1)' });
    }).observe(endIn);
  }
  const setPublishStatus = statusLine(publishStatus);
  const setSend = (label, disabled = false, spin = false) => setButton(doc, sendBtn, label, disabled, spin);
  let recoverInError = false; // «recupera el perfil» is inside the error: the link below would say the same twice
  function setInvalid(bad, message = '') {
    aliasInput.setAttribute('aria-invalid', String(bad));
    fieldError.textContent = bad ? message : '';
    fieldError.hidden = !bad;
    $('publish-rule').hidden = bad; // the error takes the hint's place, right under the field
    if (!bad && recoverInError) { recoverInError = false; $('publish-recover').hidden = false; } // its own link was in the message
    if (bad) showField(true); // a refused nickname is shown where it can be fixed
  }
  // auto: opened by itself after the run (the sheet takes focus, not a button: a Space or tap
  // meant for the results screen must never publish).
  function openPublish({ auto: byItself = false } = {}) {
    if (!canWrite || !runs.snapshot || runs.published === runs.snapshot) return;
    done = false; busy = false;
    delete form.dataset.view;
    $('publish-recover').hidden = Boolean(store.get(ALIAS_KEY)) || !onRecover; // present from the first paint for new players
    auto = byItself;
    armedAt = auto ? now() + 600 : 0;
    const req = ++publishReq, run = runs.snapshot;
    setPublishStatus(''); setInvalid(false);
    placeLine.hidden = true; placeLine.textContent = '';
    $('publish-title').textContent = tr('ui.board.publishTitle');
    $('publish-temp').hidden = true;
    $('publish-device').hidden = true;
    $('publish-offer').hidden = true;
    $('publish-summary').replaceChildren(...runLine(run));
    const saved = store.get(ALIAS_KEY);
    // only a grey example: the player types their own (a filled-in name got published as is)
    aliasInput.value = saved || '';
    aliasInput.placeholder = tr('ui.board.aliasPlaceholder', { example: suggestAlias() });
    aliasInput.readOnly = false;
    // published here before: one tap, as that alias (prepare() swaps to the field if the profile turns out to be gone)
    const oneTap = Boolean(saved) && checkAlias(saved).ok;
    showField(!oneTap);
    setSend(tr('ui.board.publish'), true);
    neverBtn.hidden = !auto; // only on the prompt that opened by itself; the slot is fixed for that opening
    $('publish-board').hidden = true;
    if (!publishMenu.open) publishMenu.showModal();
    if (auto) publishMenu.focus();
    else focusIn(publishMenu, oneTap ? 'publish-send' : 'publish-alias');
    prepare(req);
  }
  $('publish-recover').addEventListener('click', () => {
    auto = false; // leaving for the profile sheet is not an «Ara no»
    publishMenu.close();
    onRecover?.();
  });
  aliasInput.addEventListener('input', () => { // typing clears a stale complaint; the rule is checked on send
    if (aliasInput.getAttribute('aria-invalid') === 'true' && checkAlias(aliasInput.value).ok) setInvalid(false);
  });
  $('publish-form').addEventListener('submit', e => { e.preventDefault(); send(); });
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
  const form = $('publish-form');
  $('publish-wait')?.append(mulaSpinner(doc));
  // the sheet's view (swap): null (the form) | 'wait' (the Mulassa) | 'done' (Publicat! + place + D'acord). The frame eases to the
  // new height and the new content fades in (index.html), so the sheet never jumps between them
  function swap(v, title) {
    const h0 = publishMenu.offsetHeight;
    if (v) form.dataset.view = v; else delete form.dataset.view;
    if (title) $('publish-title').textContent = title;
    const h1 = publishMenu.offsetHeight;
    if (h0 && h1 && h0 !== h1 && !reduced() && publishMenu.animate) publishMenu.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 240, easing: 'cubic-bezier(.2, .7, .3, 1)' });
  }
  async function send() {
    if (done) { publishMenu.close(); return; }
    if (busy || sendBtn.disabled || now() < armedAt) return; // a double tap (or a tap from before it appeared) is harmless
    // src/services/alias-rules.js: shape, Unicode tricks, insults, reserved; the message names the part that is the problem
    const { alias, message } = checkAlias(aliasInput.value);
    if (!alias) { setInvalid(true, message); aliasInput.focus(); return; }
    const req = publishReq, run = runs.snapshot;
    if (!run) { setPublishStatus(tr('ui.board.stale')); return; }
    busy = true;
    aliasInput.value = alias;
    setInvalid(false);
    let captchaToken = null;
    if (needsCaptcha) { // a fresh token (usually silent; the tick box shows over this sheet if asked)
      setSend(tr('ui.board.checking'), true, true);
      setPublishStatus(tr('ui.board.checkingRobot'));
      try { captchaToken = await verify.token(); } catch (e) {
        if (req !== publishReq) return;
        busy = false;
        setPublishStatus(e?.code === 'cancel' ? '' : turnstileMessage(e?.code));
        setSend(tr('ui.common.retry'));
        return;
      }
      if (req !== publishReq) return;
    }
    setSend(tr('ui.board.publishing'), true, true);
    setPublishStatus('');
    const t0 = Date.now();
    swap('wait', tr('ui.board.publishing')); publishMenu.focus();
    try {
      await service.publish(run, alias, { captchaToken });
      landed(run, alias);
      afterPublish?.();
      if (req !== publishReq) return;
      needsCaptcha = false; // the profile exists now
      auto = false;
      const placeP = showPlace(req, run.version);
      // who published, as the boards will show it (a guest's «#1234» comes from the server)
      const profP = Promise.resolve(service.profile?.()).catch(() => null);
      // the Mulassa for a beat (never a flash), and until the place is known: «Publicat!» and both lines come together
      if (settle) await Promise.race([Promise.all([placeP, profP, sleep(settle - (Date.now() - t0))]), sleep(2500)]);
      if (req !== publishReq) return;
      const prof = await Promise.race([profP, sleep(2500).then(() => null)]); // never held up by a slow answer
      if (req !== publishReq) return;
      if (prof) rememberIdentity(store, ALIAS_KEY, prof);
      const [pre, post] = trSplit('ui.board.publishedAs', 'name'); setPublishStatus(pre, true);
      appendName(doc, publishStatus, prof ?? savedName(store));
      publishStatus.append(post);
      // a guest: a quiet way to keep the profile (the e-mail), under every «Publicat!»; never by itself
      $('publish-offer').hidden = !(onConfirm && prof && !prof.verified);
      done = true;
      aliasInput.readOnly = true;
      setSend(tr('ui.common.ok'));
      $('publish-board').hidden = true;
      cancelBtn.hidden = true; neverBtn.hidden = true;
      swap('done', tr('ui.board.published')); // last: the buttons are final, so the frame eases to its true height
      focusIn(publishMenu, 'publish-send');
    } catch (err) {
      boardIssue('leaderboard-publish-failed', err);
      if (req !== publishReq) return;
      swap(null, tr('ui.board.publishTitle')); // back to the form, with what went wrong
      // the sign-in may have worked and the result not: then the retry needs no new Turnstile token
      if (needsCaptcha) service.identity().then(id => { if (req === publishReq && id.hasSession) needsCaptcha = false; }, () => {});
      // the nickname (server rules, blocked, taken): under the field, which gets the focus
      const nick = ['invalid', 'blocked', 'taken'].includes(err?.code);
      if (nick) {
        // no profile here yet: maybe theirs from another browser; no self-service recovery, a person releases it by hand
        const elsewhere = err.code === 'taken' && !hadSession;
        const [pre, post] = trSplit('ui.board.takenElsewhere', 'link'); setInvalid(true, elsewhere ? pre : err?.message || tr('ui.board.checkAlias'));
        if (elsewhere) { // the way out is in the message: «recupera el perfil» opens the same flow as the link below
          const link = doc.createElement('button');
          link.type = 'button'; link.className = 'btn btn-link'; link.textContent = tr('ui.board.recoverLink');
          link.addEventListener('click', () => $('publish-recover').click());
          fieldError.append(link, post);
          recoverInError ||= !$('publish-recover').hidden; $('publish-recover').hidden = true;
        }
        aliasInput.focus();
      } else setPublishStatus(err?.message || tr('ui.board.publishFailed'));
      // this session's account is gone (service.publish left it): the retry is a new profile (a token, a nickname)
      if (err?.code === 'session') { hadSession = false; needsCaptcha = Boolean(verify); showField(true); }
      // fix the nickname, then the same press again
      setSend(tr(nick ? 'ui.board.publish' : 'ui.common.retry'));
    } finally { if (req === publishReq) busy = false; }
  }
  cancelBtn.addEventListener('click', () => publishMenu.close());
  neverBtn.addEventListener('click', () => { // «No m’ho tornis a recordar»: a permanent opt-out
    store.set(OPTOUT_KEY, '1'); auto = false; // not one more decline: the flag already says it all
    publishMenu.close();
  });
  $('publish-board').addEventListener('click', () => { publishMenu.close(); openBoard(); });
  $('publish-confirm').addEventListener('click', () => { publishMenu.close(); onConfirm?.(); }); // the profile sheet
  publishMenu.addEventListener('close', () => {
    // «Ara no», Escape or a tap outside, on the prompt that opened by itself and wasn't published: one more decline
    const declined = auto && !done;
    if (declined) store.set(DECLINES_KEY, String(declines(store) + 1));
    auto = false;
    publishReq++; busy = false; verify?.cancel();
    cancelBtn.hidden = false; neverBtn.hidden = true; $('publish-board').hidden = true;
  });
  return { openPublish, publishQuietly };
}
