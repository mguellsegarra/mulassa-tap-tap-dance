// DOM for the optional online side: publishing the finished run (alias only; a new profile also needs a Turnstile token)
// and the Classificació sheet it builds (src/ui/board-list.js: one board per figure and season). The profile itself (link
// an e-mail, recover, sign out, delete) is src/ui/profile-ui.js. Turnstile (src/services/captcha.js) checks a player only
// when a token is needed; Supabase is touched only when one of these sheets asks for it, never in the game loop, and the
// guest profile is made only on publishing (or «Crea»). After an eligible run the publish sheet opens by itself (a prompt:
// nothing is sent until Publica is pressed; «Ara no» ×3 stops it); a publication shows a Mulassa, then «Publicat!» + the
// place with an «D'acord» that opens Comparteix (afterPublish).
import { leaderboard, turnstileSiteKey, subscribeLeaderboardResult, rememberIdentity } from '../services/leaderboard.js';
import { VERSION_RULES } from '../services/leaderboard-rules.js';
import { checkAlias } from '../services/alias-rules.js';
import { DIFFS } from '../game/chart.js';
import { FIGURES, hasBoard } from '../game/figures.js';
import { quality, starsFor } from '../game/progress.js';
import { store as defaultStore } from '../platform/storage.js';
import { byId, num, statusLine, setButton, trSplit } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { mulaSpinner } from './loader.js';
import { setupVerify, turnstileMessage, TURNSTILE_SRC } from '../services/captcha.js';
import { appendName, deviceRisk, DEVICE_NOTES, browserEnv } from './profile-notes.js';
import { forgetSeasons } from './seasons-ui.js';
import { setupBoardList, ALIAS_KEY, boardIssue, topPct, savedName } from './board-list.js';

export { ALIAS_KEY, refreshIdentity } from './board-list.js';
// «Ara no» to the prompt that opens by itself after a run, in a row: at MAX_DECLINES it stops opening by itself (the
// results row's «Publica el resultat» stays); any publication starts the count again. Only this number is kept.
export const DECLINES_KEY = 'publish-declines', MAX_DECLINES = 3;
const PROMPT_STARS = 2; // the publish prompt opens by itself only from this many stars
export const OPTOUT_KEY = 'publish-optout'; // «No m’ho tornis a recordar»: the prompt never opens by itself again (⚙ Configuració turns it back on)
const NAMES = Array.from({ length: 8 }, (_, i) => tr(`ui.board.alias.${i + 1}`));
// A fictional, editable suggestion: nobody should feel asked for their real name.
export const suggestAlias = (rand = Math.random) => `${NAMES[Math.floor(rand() * NAMES.length)]}${100 + Math.floor(rand() * 900)}`; // no spaces

let turnstileLoad = null;
function loadTurnstile() { // the widget script; a failed load may be retried
  turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC; s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => { turnstileLoad = null; s.remove(); reject(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return turnstileLoad;
}
export { deviceRisk, DEVICE_NOTES } from './profile-notes.js';
// once, after the first publication: ask the browser to keep this site's storage (Chrome decides quietly)
export const PERSIST_KEY = 'storage-persist';
const askPersist = () => globalThis.navigator?.storage?.persist?.();

export function setupBoard({ focusIn, store = defaultStore, service = leaderboard, siteKey = turnstileSiteKey,
  captcha = loadTurnstile, doc = document, subscribe = subscribeLeaderboardResult,
  // the prompt that opens by itself: main.js says when the screen allows it (results, no other sheet, page visible)
  canPrompt = () => true, onRecover = null, // onRecover: «Recupera’l» on the publish sheet (main.js → src/ui/profile-ui.js)
  onConfirm = null, // «Confirma el correu» under a guest's «Publicat!» ({ place }: Comparteix after it)
  onCard = () => {}, onSeasons = () => {}, // a name tapped (src/ui/player-card.js); «Temporades anteriors» (src/ui/seasons-ui.js) for a figure
  onKeep = null, // «Confirma el correu per no perdre el perfil» under a guest's own row (the Perfil's e-mail step)
  currentFigure = () => null, // the selector's figure: the board opens on it when no run is on the results screen
  canPlay = () => false, onPlay = () => {}, // an empty open board over the bare selector: «Juga amb …» leaves that figure selected there
  acceptStats = () => {}, // a publication showed the statistics note (src/services/stats-sync.js may send them now)
  online = () => globalThis.navigator?.onLine !== false, promptDelay = 900, now = () => Date.now(), minLoad = 1200,
  // Turnstile's tick box only over the title / results (never mid-song); it runs only when a token is needed (Publica
  // for a new profile, a Bústia message), never ahead: a check after every first run showed the box to people who never publish
  canVerify = () => true, verifyOpts = {},
  // after a publication: Comparteix, for that run (main.js → share-ui.js), from the success sheet's «D'acord»; `shareDelay` (ms, null = never)
  // would also open it by itself. `settle`: the Mulassa shows at least this long (and waits for the place line) before «Publicat!»
  afterPublish = null, shareDelay = null, settle = 1100,
  // the browser the profile lives in (deviceRisk) and the one-off storage.persist() request
  env = browserEnv, persist = askPersist,
  // the list's end coming into view (root: the list box) loads the next page
  observe = (el, root, fn) => { if (globalThis.IntersectionObserver) new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) fn(); }, { root, rootMargin: '0px 0px 240px 0px' }).observe(el); } }) {
  const $ = byId(doc);
  const deviceNote = persistent => DEVICE_NOTES[deviceRisk({ ...env(), persistent })] || '';
  // a nickname remembered from before the no-spaces rule: the server joined its words (migration 0012), so do we
  const old = store.get(ALIAS_KEY);
  if (old && /\s/u.test(old)) store.set(ALIAS_KEY, old.replace(/\s+/gu, ''));
  const boardMenu = $('board-menu'), publishMenu = $('publish-menu');
  const aliasInput = $('publish-alias'), publishStatus = $('publish-status'), fieldError = $('publish-error'), sendBtn = $('publish-send'), cancelBtn = $('publish-cancel'), neverBtn = $('publish-never');
  const resultsPublish = $('results-publish'), resultsBoard = $('results-board');
  const placeLine = $('publish-place'), asLine = $('publish-as'), field = $('publish-field');
  let publishReq = 0, snapshot = null, published = null;
  let done = false, busy = false, shareTimer = null;
  // auto: this sheet opened by itself (closing it unpublished is an «Ara no»); armedAt: a tap already on its way when it
  // appeared must not publish
  let auto = false, armedAt = 0, prompted = null, promptTimer = null;

  if (!service.configured) { if ($('settings-prompt-row')) $('settings-prompt-row').hidden = true; } // offline game: no online entry points
  // Writes need the build flag AND a privacy contact: index.html #privacy-contact data-email is the one place for it.
  // Empty (or missing): the line stays hidden and nobody can publish; reading still works.
  const privacyRoot = $('privacy-content')?.content;
  const contact = privacyRoot?.querySelector('#privacy-contact') || $('privacy-contact');
  const email = contact?.dataset.email?.trim() || '';
  if (email) {
    const a = contact.querySelector?.('#privacy-contact-link') || $('privacy-contact-link');
    a.href = `mailto:${email}`; a.textContent = email;
    contact.hidden = false;
  }
  const canWrite = service.publishingEnabled && !!email;
  const verify = service.configured && canWrite && service.captchaRequired && siteKey
    ? setupVerify({ doc, siteKey, load: captcha, canShow: canVerify, ...verifyOpts }) : null;
  subscribe(r => { snapshot = r; }); // the frozen run of the results screen; cleared by the title or a new run

  const { openBoard, standing, levelPodium } = setupBoardList({ doc, $, service, store, focusIn, minLoad, now, observe, onCard, onSeasons, onKeep, currentFigure, canPlay, onPlay,
    canPublish: () => Boolean(canWrite && snapshot && published !== snapshot), runFigure: () => VERSION_RULES[snapshot?.version]?.figureId,
    openPublish: () => openPublish(), publishing: () => publishMenu.open });
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
    if (!canWrite || !snapshot || published === snapshot) return;
    done = false; busy = false; leaving = false;
    delete form.dataset.view;
    $('publish-recover').hidden = Boolean(store.get(ALIAS_KEY)) || !onRecover; // present from the first paint for new players
    clearTimeout(shareTimer);
    auto = byItself;
    armedAt = auto ? now() + 600 : 0;
    const req = ++publishReq, run = snapshot;
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
  let placeP = null; // the success's place line (a promise), for Comparteix
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
  let leaving = false;
  function toShare() { // Comparteix next, for the run just published; its header keeps where they stand
    if (leaving) return;
    leaving = true;
    clearTimeout(shareTimer); shareTimer = null;
    const place = placeP;
    const go = () => { fade?.cancel(); publishMenu.close(); afterPublish?.({ place }); };
    const fade = reduced() ? null : publishMenu.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    if (fade) fade.finished.then(go, go); else go();
  }
  async function send() {
    if (done) { if (afterPublish) toShare(); else publishMenu.close(); return; }
    if (busy || sendBtn.disabled || now() < armedAt) return; // a double tap (or a tap from before it appeared) is harmless
    // src/services/alias-rules.js: shape, Unicode tricks, insults, reserved; the message names the part that is the problem
    const { alias, message } = checkAlias(aliasInput.value);
    if (!alias) { setInvalid(true, message); aliasInput.focus(); return; }
    const req = publishReq, run = snapshot;
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
      store.set(ALIAS_KEY, alias);
      acceptStats(); // the sheet's note said the statistics' totals go with the profile
      forgetSeasons(service); // the podiums may have moved
      published = run; // the results button goes even if the sheet was closed meanwhile
      store.remove(DECLINES_KEY); // they publish: the prompt may open by itself again
      if (!store.get(PERSIST_KEY)) { store.set(PERSIST_KEY, '1'); try { Promise.resolve(persist()).catch(() => {}); } catch { /* no Storage API */ } }
      if (req !== publishReq) return;
      needsCaptcha = false; // the profile exists now
      auto = false;
      placeP = showPlace(req, run.version);
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
      // Comparteix is «D'acord»; only with `shareDelay` does it also come by itself
      if (afterPublish && shareDelay != null) shareTimer = setTimeout(() => { if (req === publishReq && publishMenu.open && done) toShare(); }, shareDelay);
      done = true;
      aliasInput.readOnly = true;
      setSend(tr(afterPublish ? 'ui.common.ok' : 'ui.common.close'));
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
  neverBtn.addEventListener('click', () => { // «No m’ho tornis a recordar»: a permanent opt-out, then Comparteix like «Ara no»
    const share = auto && !done && afterPublish;
    store.set(OPTOUT_KEY, '1'); auto = false; // not one more decline: the flag already says it all
    publishMenu.close();
    if (share) afterPublish({ place: null, published: false });
  });
  $('publish-board').addEventListener('click', () => { publishMenu.close(); openBoard(); });
  $('publish-confirm').addEventListener('click', () => { // not Comparteix now: the profile sheet, then Comparteix from there
    if (leaving) return;
    leaving = true; clearTimeout(shareTimer); shareTimer = null;
    const place = placeP;
    publishMenu.close(); onConfirm?.({ place });
  });
  publishMenu.addEventListener('close', () => {
    // «Ara no», Escape or a tap outside, on the prompt that opened by itself and wasn't published: one more decline
    const declined = auto && !done;
    if (declined) store.set(DECLINES_KEY, String(declines() + 1));
    auto = false; clearTimeout(shareTimer); shareTimer = null;
    publishReq++; busy = false; verify?.cancel();
    cancelBtn.hidden = false; neverBtn.hidden = true; $('publish-board').hidden = true;
    if (declined && afterPublish) afterPublish({ place: null, published: false }); // Comparteix next, without «Publicat!»
  });

  // --- ⚙ Configuració: the «Proposta de publicar» row
  const promptsOn = () => !store.get(OPTOUT_KEY) && declines() < MAX_DECLINES;
  function syncPromptRow() { const row = $('settings-prompt-row'); if (row) row.hidden = promptsOn(); } // the row exists only while the prompt is off
  // ⚙ «Proposta de publicar» → «Activa»: clears the opt-out and the decline count, and the row goes away
  $('settings-prompt')?.addEventListener('click', () => { store.remove(OPTOUT_KEY); store.remove(DECLINES_KEY); syncPromptRow(); });
  function refreshSettings() { if (service.configured) syncPromptRow(); } // the «Perfil» block is src/ui/profile-ui.js's

  // --- results screen: two DOM buttons under the canvas card
  resultsPublish.addEventListener('click', () => openPublish());
  resultsBoard.addEventListener('click', () => openBoard());
  let shown = -1;

  // --- the prompt that opens by itself: once per eligible run, a moment after the row appears, never to nag
  function declines() { return Number(store.get(DECLINES_KEY)) || 0; }
  // eligible (not practice/autoplay/?from: no snapshot), ≥ 2 stars, online, not declined MAX_DECLINES times in a row
  // ≥ 2 stars: a weak run never gets asked (its «Publica el resultat» button stays for whoever wants it)
  const promptable = run => Boolean(canWrite && run && starsFor(quality(run.counts)) >= PROMPT_STARS && online() && promptsOn());
  function firePrompt() {
    promptTimer = null;
    if (shown !== 2 || published === snapshot || publishMenu.open || boardMenu.open || !canPrompt() || !promptable(snapshot)) return;
    openPublish({ auto: true });
  }
  return {
    get open() { return boardMenu.open || publishMenu.open || Boolean(verify?.open); },
    configured: service.configured, // offline game: no online entry points (the title's podium button too)
    openBoard, openPublish, refreshSettings, deviceNote, standing, levelPodium,
    // the same Turnstile for «Bústia de la plaça» (src/ui/feedback-ui.js): a single-use token per message; null = none here
    captcha: verify && { token: () => verify.token(), cancel: () => verify.cancel() },
    // every frame: only real changes touch the DOM. `show`: the results screen, once taps may land (after its first second).
    // The row (#results-actions) itself is src/ui/share-ui.js's: Comparteix is there even offline; these are its buttons.
    results(show) {
      const offBoard = FIGURES.some(f => f.id === currentFigure() && !hasBoard(f)); // the Bou: no board to show it on
      const key = !show || !service.configured || offBoard ? 0 : canWrite && snapshot && published !== snapshot ? 2 : 1;
      if (key === shown) return;
      if (doc.activeElement === resultsPublish || doc.activeElement === resultsBoard) doc.activeElement.blur?.(); // no focus on a hidden button
      shown = key;
      resultsBoard.hidden = !key;
      resultsPublish.hidden = key !== 2;
      if (key !== 2) { clearTimeout(promptTimer); promptTimer = null; }
      else if (prompted !== snapshot) { // this run's one chance
        prompted = snapshot;
        if (promptable(snapshot)) promptTimer = setTimeout(firePrompt, promptDelay);
      }
    },
    // «Publica el resultat» may show on this results screen (narrow screens then need a second row, main.js
    // resultsReserve()): for the whole screen, so the card doesn't jump when the button goes after publishing
    // the publish prompt opens (or already did) by itself for this results screen: Comparteix follows that, not this
    get promptsItself() { return shown === 2 && promptable(snapshot); },
    get publishable() { return service.configured && canWrite && Boolean(snapshot); },
  };
}
