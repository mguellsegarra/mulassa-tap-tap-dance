// DOM for the optional online side: the Classificacions sheet (one all-time top for every level, the player's own row),
// publishing the finished run (alias only; a new profile also needs a Turnstile token). The profile itself (link an
// e-mail, recover, sign out, delete) is src/ui/profile-ui.js. Turnstile (src/services/captcha.js) checks every player once, silently, after their
// first run; Supabase is touched only when one of these sheets asks for it, never in the game loop, and the anonymous profile
// is made only on publishing. After an eligible run the publish sheet opens by itself (a prompt: nothing is sent until
// Publica is pressed; «Ara no» ×3 stops it); a publication shows a calçot, then «Publicat!» + the place with an «D'acord» that opens Comparteix (afterPublish).
import { leaderboard, turnstileSiteKey, subscribeLeaderboardResult, PAGE } from '../services/leaderboard.js';
import { checkAlias } from '../services/alias-rules.js';
import { DIFFS } from '../game/chart.js';
import { quality, starsFor } from '../game/progress.js';
import { errors } from '../services/errors.js';
import { store as defaultStore } from '../platform/storage.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { calcotSpinner } from './loader.js';
import { setupVerify, turnstileMessage, TURNSTILE_SRC } from '../services/captcha.js';

export const ALIAS_KEY = 'leaderboard-alias';
export const ROW_KEY = 'leaderboard-row'; // the alias the last answer (or a publication) gave a row to: only for that alias does the sheet open on On sóc
// «Ara no» to the prompt that opens by itself after a run, in a row: at MAX_DECLINES it stops opening by itself (the
// results row's «Publica el resultat» stays); any publication starts the count again. Only this number is kept.
export const DECLINES_KEY = 'publish-declines', MAX_DECLINES = 3;
const PROMPT_STARS = 2; // the publish prompt opens by itself only from this many stars
export const OPTOUT_KEY = 'publish-optout'; // «No m’ho tornis a recordar»: the prompt never opens by itself again (⚙ Configuració turns it back on)
const BOARD_CAP = 500; // rows the list shows at most (10 pages): past it, «Mostrant els 500 primers»
const NAMES = ['Timbaler', 'Portador', 'Gegant', 'Capgròs', 'Drac', 'Castellera', 'Balladora', 'Mulasser'];
const num = v => Math.round(Number(v)).toLocaleString('ca-ES');

// A fictional, editable suggestion: nobody should feel asked for their real name.
export const suggestAlias = (rand = Math.random) => `${NAMES[Math.floor(rand() * NAMES.length)]}${100 + Math.floor(rand() * 900)}`; // no spaces

// Crash reports get service failures only (a code, never the alias): the player's own mistakes and limits are expected.
// `server`: the provider's own codes and HTTP status (LeaderboardError.detail, e.g. 'rpc:42883:404'), no text.
const boardIssue = (kind, e) => {
  if (['invalid', 'blocked', 'taken', 'busy', 'rate_limit'].includes(e?.code)) return;
  errors.report(kind, { code: e?.code || e?.name || 'Error', ...(e?.detail && { server: String(e.detail).slice(0, 64) }) });
};
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
// A guest profile lives in this browser's storage only: where that storage is likely to go, a short note — only for
// someone who has published (a remembered alias or a session), never before. Standalone (home screen) apps and ordinary
// browsers get none. `persistent`: identity()'s storage probe (false = storage blocked, e.g. some private modes).
const IN_APP = /\b(Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|WhatsApp|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|LinkedInApp|Pinterest|Twitter)\b/i;
export function deviceRisk({ ua = '', standalone = false, touch = 0, persistent = true } = {}) {
  if (standalone) return null;
  if (!persistent) return 'private';
  if (IN_APP.test(ua)) return 'inapp';
  if (/Safari\//.test(ua) && /Version\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|EdgA?\/|OPR|OPiOS|Android/.test(ua))
    return /iPhone|iPad|iPod/.test(ua) || touch > 1 ? 'ios' : 'safari'; // iPadOS says «Macintosh»: its touch points tell
  return null;
}
const ONLY_HERE = 'Aquest perfil només viu en aquest navegador.';
export const DEVICE_NOTES = Object.freeze({
  ios: `${ONLY_HERE} Safari l’esborra si passes 7 dies sense jugar: afegeix el joc a la pantalla d’inici.`,
  safari: `${ONLY_HERE} Safari l’esborra si passes 7 dies sense jugar.`,
  inapp: `${ONLY_HERE} Dins d’una app es perd fàcilment: juga des del navegador.`,
  private: `${ONLY_HERE} Com que no desa dades, es perdrà en tancar la pàgina.`,
});
const browserEnv = () => {
  const nav = globalThis.navigator ?? {};
  let standalone = nav.standalone === true;
  try { standalone ||= Boolean(globalThis.matchMedia?.('(display-mode: standalone)').matches); } catch { /* no media queries */ }
  return { ua: String(nav.userAgent || ''), standalone, touch: Number(nav.maxTouchPoints) || 0 };
};
// once, after the first publication: ask the browser to keep this site's storage (Chrome decides quietly)
export const PERSIST_KEY = 'storage-persist';
const askPersist = () => globalThis.navigator?.storage?.persist?.();

export function setupBoard({ focusIn, store = defaultStore, service = leaderboard, siteKey = turnstileSiteKey,
  captcha = loadTurnstile, doc = document, subscribe = subscribeLeaderboardResult,
  // the prompt that opens by itself: main.js says when the screen allows it (results, no other sheet, page visible)
  canPrompt = () => true, onRecover = null, // onRecover: «Ja tens un perfil? Recupera’l» on the publish sheet (main.js → src/ui/profile-ui.js)
  online = () => globalThis.navigator?.onLine !== false, promptDelay = 900, now = () => Date.now(), minLoad = 1200,
  // Turnstile's tick box only over the title / results (never mid-song); it runs only when a token is needed (Publica
  // for a new profile, a Bústia message), never ahead: a check after every first run showed the box to people who never publish
  canVerify = () => true, verifyOpts = {},
  // after a publication: Comparteix, for that run (main.js → share-ui.js), from the success sheet's «D'acord»; `shareDelay` (ms, null = never)
  // would also open it by itself. `settle`: the calçot shows at least this long (and waits for the place line) before «Publicat!»
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
  const tbody = $('board-rows'), table = $('board-table'), viewSeg = $('board-views');
  const aliasInput = $('publish-alias'), publishStatus = $('publish-status'), fieldError = $('publish-error'), sendBtn = $('publish-send'), cancelBtn = $('publish-cancel'), neverBtn = $('publish-never');
  const resultsPublish = $('results-publish'), resultsBoard = $('results-board');
  const placeLine = $('publish-place'), asLine = $('publish-as'), field = $('publish-field');
  let listReq = 0, publishReq = 0, snapshot = null, published = null, back = null;
  let done = false, busy = false, shareTimer = null;
  // auto: this sheet opened by itself (closing it unpublished is an «Ara no»); armedAt: a tap already on its way when it
  // appeared must not publish
  let auto = false, armedAt = 0, prompted = null, promptTimer = null;

  if (!service.configured) { $('settings-board').hidden = true; if ($('settings-prompt-row')) $('settings-prompt-row').hidden = true; } // offline game: no online entry points
  // Writes need the build flag AND a privacy contact: index.html #privacy-contact data-email is the one place for it.
  // Empty (or missing): the line stays hidden and nobody can publish; reading still works.
  const contact = $('privacy-contact'), email = contact?.dataset.email?.trim() || '';
  if (email) {
    const a = $('privacy-contact-link');
    a.href = `mailto:${email}`; a.textContent = email;
    contact.hidden = false;
  }
  const canWrite = service.publishingEnabled && !!email;
  const verify = service.configured && canWrite && service.captchaRequired && siteKey
    ? setupVerify({ doc, siteKey, load: captcha, canShow: canVerify, ...verifyOpts }) : null;
  subscribe(r => { snapshot = r; }); // the frozen run of the results screen; cleared by the title or a new run

  // --- Classificació: one all-time board for every level, ranked by score, in pages of 50 (leaderboard.js). Two views of
  // it: «Tots» (every rank in order, the next page as the list's end comes into view, or «Carrega’n més»; at most
  // BOARD_CAP rows here) and «On sóc» (the player's row with 5 above and 5 below, from the first page). The switch between
  // them exists for anyone with a nickname (remembered alias, or an own row in the answer): the list alone before that; it opens
  // on On sóc only while the last answer gave that nickname a row, else on Tots.
  // A late answer (or one for a closed / reopened sheet) is dropped. The sheet keeps one height throughout
  // (index.html: a fixed box holds list, loading, empty, error; the list scrolls inside it).
  const viewBtns = { all: $('board-view-top'), me: $('board-view-me') };
  const more = $('board-more'), moreStatus = $('board-more-status'), moreBtn = $('board-more-btn');
  // shownBoard: { byPos (rank → row, pages and On sóc's neighbours), loaded (ranks 1..loaded all here), total, done }
  let view = 'all', shownBoard = null, moreBusy = false, moreFailed = false;
  const canPublishNow = () => Boolean(canWrite && snapshot && published !== snapshot);
  function setBoardStatus(text, { retry = false, publish = false } = {}) {
    $('board-status').textContent = text;
    $('board-retry').hidden = !retry;
    $('board-publish').hidden = !publish;
  }
  const fetchBoard = async () => (await service.listAll()) ?? []; // the first page (with the caller's row)
  // a page (ranks from+1 .. from+PAGE, plus the first page's neighbours) into the board: ranks deduped, `loaded` = how
  // far the ranks run unbroken from the top; the end: every rank here (total), a short page, or an empty one
  function absorb(b, rows, from) {
    for (const r of rows) b.byPos.set(Number(r.position), r);
    b.total = Number(rows[0]?.total) || b.total;
    let n = b.loaded;
    while (b.byPos.has(n + 1)) n++;
    const page = rows.filter(r => Number(r.position) > from && Number(r.position) <= from + PAGE).length;
    b.loaded = n;
    b.done = !page || (b.total ? n >= b.total : page < PAGE);
  }
  const topPct = (pos, total) => Math.max(1, Math.ceil(100 * pos / total)); // «top 17%»; never «top 0%»
  const placeText = (pos, total) => `#${num(pos)} de ${num(total)} · top ${topPct(pos, total)}%`; // «#347 de 2.140 · top 17%»
  const el = (tag, className, text) => { const e = doc.createElement(tag); e.className = className; if (text != null) e.textContent = text; return e; };
  function row(r) {
    const tr = doc.createElement('tr'), td = () => tr.appendChild(doc.createElement('td'));
    const pos = Number(r.position);
    td().appendChild(el('span', pos <= 3 ? `pos p${pos}` : 'pos', num(pos)));
    const name = td(), who = name.appendChild(el('div', 'who'));
    who.appendChild(el('span', 'alias', String(r.alias))); // aliases are text, never HTML
    if (r.is_self) { tr.className = 'me'; who.appendChild(el('span', 'me-tag', 'TU')); }
    const level = DIFFS[Number(r.difficulty)]?.name; // the level played (a coloured pill) and the longest streak, on a small line under the name
    if (level) {
      const sub = name.appendChild(el('div', 'sub'));
      sub.appendChild(el('span', `lvl lvl${Number(r.difficulty)}`, level));
      if (r.max_combo != null) { const st = sub.appendChild(el('span', 'streak', 'ratxa ')); st.appendChild(el('b', '', num(r.max_combo))); }
    }
    td().textContent = `${Math.round(Number(r.quality))}%`;
    td().textContent = num(r.score);
    return tr;
  }
  const shownRanks = b => Math.min(b.loaded, BOARD_CAP);
  function appendRanks(b, from, to) { for (let p = from; p <= to; p++) tbody.appendChild(row(b.byPos.get(p))); }
  function updateMore() { // the list's end (Tots only): loading, «Carrega’n més», the cap
    const b = shownBoard;
    more.hidden = view !== 'all' || !b || !b.loaded || (b.done && !moreBusy && !moreFailed); // at the end: nothing, no gap
    if (more.hidden) { moreBtn.hidden = true; moreStatus.textContent = ''; return; }
    const capped = !b.done && b.loaded >= BOARD_CAP;
    moreStatus.textContent = moreBusy ? 'Carregant-ne més…' : moreFailed ? 'No s’han pogut carregar més.'
      : capped ? `Mostrant els ${num(BOARD_CAP)} primers` : ''; // the end of the list needs no line
    if (moreBusy) moreStatus.prepend(calcotSpinner(doc));
    moreBtn.hidden = moreBusy || b.done || capped;
  }
  function render() {
    for (const [k, b] of Object.entries(viewBtns)) b.setAttribute('aria-pressed', String(k === view));
    tbody.replaceChildren();
    table.hidden = true;
    $('board-summary').textContent = '';
    updateMore();
    if (!shownBoard) return;
    const b = shownBoard, self = [...b.byPos.values()].find(r => r.is_self);
    if (self && viewSeg.hidden) viewSeg.hidden = false; // published elsewhere on this profile: quietly offer On sóc
    if (view === 'all') {
      if (!b.loaded) return setBoardStatus('Encara no hi ha cap resultat. Pots ser el primer!');
      setBoardStatus('');
      appendRanks(b, 1, shownRanks(b)); // ranks in order only: On sóc's neighbours further down wait for their page
    } else {
      if (!self) {
        if (canPublishNow()) return setBoardStatus('Publica el teu resultat per veure on quedes.', { publish: true });
        return setBoardStatus('Juga una partida i publica el resultat per veure on quedes.');
      }
      setBoardStatus('');
      const at = Number(self.position);
      for (let p = at - 5; p <= at + 5; p++) if (b.byPos.has(p)) tbody.appendChild(row(b.byPos.get(p)));
      $('board-summary').textContent = placeText(at, b.total);
    }
    table.hidden = false;
    // On sóc: the own row in the middle of the box, snapped so no row sits half under the header
    const box = table.parentElement, me = [...tbody.children].find(tr => tr.className === 'me');
    if (!box) return;
    box.scrollTop = 0;
    if (view !== 'me' || !me?.offsetHeight) return;
    const head = table.tHead?.offsetHeight ?? 0;
    const want = me.offsetTop - head - (box.clientHeight - head - me.offsetHeight) / 2;
    const first = [...tbody.children].reverse().find(tr => tr.offsetTop - head <= want) ?? tbody.children[0];
    box.scrollTop = first.offsetTop - head;
  }
  // The dancing calçot shows while it loads, at least `minLoad` ms when the sheet opens so it never just flashes; then
  // the list fades in (index.html).
  async function loadList({ min = minLoad } = {}) {
    const req = ++listReq;
    shownBoard = null; moreBusy = false; moreFailed = false; render();
    setBoardStatus('Carregant la classificació…');
    $('board-status').prepend(calcotSpinner(doc));
    const shown = min > 0 ? new Promise(r => setTimeout(r, min)) : null;
    let rows;
    try { rows = await fetchBoard(); } catch (e) {
      await shown;
      boardIssue('leaderboard-list-failed', e);
      if (req !== listReq || !boardMenu.open) return;
      setBoardStatus(e?.message || 'No s’ha pogut carregar la classificació.', { retry: true });
      return;
    }
    await shown;
    if (req !== listReq || !boardMenu.open) return;
    const b = { byPos: new Map(), loaded: 0, total: 0, done: false };
    absorb(b, rows, 0);
    const hasRow = [...b.byPos.values()].some(r => r.is_self);
    if (hasRow) store.set(ROW_KEY, store.get(ALIAS_KEY) ?? ''); else store.remove(ROW_KEY);
    if (view === 'me' && !hasRow && !canPublishNow()) view = 'all'; // a stale guess: the switch stays, the list shows
    shownBoard = b; render();
  }
  // the next page: from the scroll (the list's end in view) or «Carrega’n més»; one at a time, dropped if stale
  async function loadMore() {
    const b = shownBoard;
    if (moreBusy || !b || b.done || b.loaded >= BOARD_CAP || view !== 'all' || !boardMenu.open) return;
    const req = listReq, from = b.loaded;
    moreBusy = true; moreFailed = false; updateMore();
    let rows;
    try { rows = (await service.listAll({ offset: from, limit: PAGE })) ?? []; } catch (e) {
      if (req !== listReq || shownBoard !== b) return;
      boardIssue('leaderboard-list-failed', e);
      moreBusy = false; moreFailed = true; updateMore(); // the button stays: another try
      return;
    }
    if (req !== listReq || shownBoard !== b || !boardMenu.open) return;
    moreBusy = false;
    const before = shownRanks(b);
    absorb(b, rows, from);
    if (view === 'all') appendRanks(b, before + 1, shownRanks(b));
    updateMore();
    const box = table.parentElement; // still at the end (a tall screen, a fast flick): the next one
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 240) loadMore();
  }
  moreBtn.addEventListener('click', () => loadMore());
  observe(more, table.parentElement, () => loadMore());
  for (const [k, b] of Object.entries(viewBtns)) b.addEventListener('click', () => { if (view !== k) { view = k; render(); } }); // same pages
  $('board-publish').addEventListener('click', () => { openPublish(); boardMenu.close(); }); // the board doesn't go back behind it
  // published here before (the remembered alias): the switch, «On sóc» first from the first frame when the last answer gave
  // a row, else «Tots» (the answer corrects it quietly); never published: the list alone, no switch
  function openBoard(onBack = null) {
    if (!service.configured) return;
    back = onBack;
    const known = Boolean(store.get(ALIAS_KEY));
    viewSeg.hidden = !known;
    view = known && (store.get(ROW_KEY) === store.get(ALIAS_KEY) || canPublishNow()) ? 'me' : 'all'; // no row (never published, or removed): Tots from the first frame, the switch in place so nothing shifts
    if (!boardMenu.open) boardMenu.showModal();
    focusIn(boardMenu, 'board-close');
    loadList();
  }
  $('board-retry').addEventListener('click', () => { loadList(); focusIn(boardMenu, 'board-close'); });
  $('board-close').addEventListener('click', () => boardMenu.close());
  boardMenu.addEventListener('close', () => {
    listReq++;
    const b = back; back = null;
    if (b && !publishMenu.open) b(); // opened from Configuració: back to it
  });
  let needsCaptcha = false, hadSession = true; // hadSession: a profile here when the publish sheet opened
  // An existing profile publishes with one tap (its alias shown); a new one needs a Turnstile token,
  // asked for only once Publica is pressed (the startup check's, if still fresh): opening the sheet sends nothing.
  async function prepare(req) {
    needsCaptcha = false; hadSession = true;
    let id = { hasSession: false, persistent: true };
    try { id = await service.identity(); } catch { /* the publish call reports it */ }
    if (req !== publishReq || !publishMenu.open) return;
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
    if (!verify) { setPublishStatus('Ara mateix no es poden publicar resultats.'); sendBtn.disabled = true; return; }
    needsCaptcha = true;
  }
  // the one-tap view (the remembered alias as text) or the editable field
  function showField(on) {
    field.hidden = !on;
    asLine.hidden = on;
    if (!on) $('publish-as-name').textContent = aliasInput.value;
  }
  // the run in one line: «94% a DIFÍCIL · ★★★» (the stars as the results card shows them)
  const starText = value => (starsFor(value) ? ` · ${'★'.repeat(starsFor(value))}` : ''); // nothing for 0 stars
  const runLine = run => `${Math.round(quality(run.counts))}% a ${DIFFS[run.difficulty].name}${starText(quality(run.counts))}`;
  // «Ets el número 347 · top 17%!»: the own row of the joint board. Resolves to the line (or null) for Comparteix's
  // header too.
  async function showPlace(req) {
    let self = null, total = 0;
    try {
      const rows = await fetchBoard(); // the first page carries the caller's row
      self = rows.find(r => r.is_self); total = Number(self?.total) || 0;
    } catch { /* the success stays */ }
    if (!self || !total) return null;
    const pos = Number(self.position), text = `Ets el número ${num(pos)} · top ${topPct(pos, total)}%!`;
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
    $('publish-recover').hidden = true;
    clearTimeout(shareTimer);
    auto = byItself;
    armedAt = auto ? now() + 600 : 0;
    const req = ++publishReq, run = snapshot;
    setPublishStatus(''); setInvalid(false);
    placeLine.hidden = true; placeLine.textContent = '';
    $('publish-title').textContent = 'Publica el teu resultat!';
    $('publish-temp').hidden = true;
    $('publish-device').hidden = true;
    $('publish-summary').textContent = runLine(run);
    const saved = store.get(ALIAS_KEY);
    // only a grey example: the player types their own (a filled-in name got published as is)
    aliasInput.value = saved || '';
    aliasInput.placeholder = `p. ex. ${suggestAlias()}`;
    aliasInput.readOnly = false;
    // published here before: one tap, as that alias (prepare() swaps to the field if the profile turns out to be gone)
    const oneTap = Boolean(saved) && checkAlias(saved).ok;
    showField(!oneTap);
    setSend('Publica', true);
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
  $('publish-wait')?.append(calcotSpinner(doc));
  // the sheet's view (swap): null (the form) | 'wait' (the calçot) | 'done' (Publicat! + place + D'acord). The frame eases to the
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
    if (!run) { setPublishStatus('Aquest resultat ja no es pot publicar.'); return; }
    busy = true;
    aliasInput.value = alias;
    setInvalid(false);
    let captchaToken = null;
    if (needsCaptcha) { // a fresh token (usually silent; the tick box shows over this sheet if asked)
      setSend('Comprovant…', true, true);
      setPublishStatus('Comprovant que no ets un robot…');
      try { captchaToken = await verify.token(); } catch (e) {
        if (req !== publishReq) return;
        busy = false;
        setPublishStatus(e?.code === 'cancel' ? '' : turnstileMessage(e?.code));
        setSend('Torna-ho a provar');
        return;
      }
      if (req !== publishReq) return;
    }
    setSend('Publicant…', true, true);
    setPublishStatus('');
    const t0 = Date.now();
    swap('wait', 'Publicant…'); publishMenu.focus();
    try {
      await service.publish(run, alias, { captchaToken });
      store.set(ALIAS_KEY, alias); store.set(ROW_KEY, alias);
      published = run; // the results button goes even if the sheet was closed meanwhile
      store.remove(DECLINES_KEY); // they publish: the prompt may open by itself again
      if (!store.get(PERSIST_KEY)) { store.set(PERSIST_KEY, '1'); try { Promise.resolve(persist()).catch(() => {}); } catch { /* no Storage API */ } }
      if (req !== publishReq) return;
      needsCaptcha = false; // the profile exists now
      auto = false;
      placeP = showPlace(req);
      // the calçot for a beat (never a flash), and until the place is known: «Publicat!» and both lines come together
      if (settle) await Promise.race([Promise.all([placeP, sleep(settle - (Date.now() - t0))]), sleep(2500)]);
      if (req !== publishReq) return;
      setPublishStatus('Resultat publicat. La classificació mostra el teu millor resultat.', true);
      // Comparteix is «D'acord»; only with `shareDelay` does it also come by itself
      if (afterPublish && shareDelay != null) shareTimer = setTimeout(() => { if (req === publishReq && publishMenu.open && done) toShare(); }, shareDelay);
      done = true;
      aliasInput.readOnly = true;
      setSend(afterPublish ? 'D’acord' : 'Tanca');
      $('publish-board').hidden = true;
      cancelBtn.hidden = true; neverBtn.hidden = true;
      swap('done', 'Publicat!'); // last: the buttons are final, so the frame eases to its true height
      focusIn(publishMenu, 'publish-send');
    } catch (err) {
      boardIssue('leaderboard-publish-failed', err);
      if (req !== publishReq) return;
      swap(null, 'Publica el teu resultat!'); // back to the form, with what went wrong
      // the sign-in may have worked and the result not: then the retry needs no new Turnstile token
      if (needsCaptcha) service.identity().then(id => { if (req === publishReq && id.hasSession) needsCaptcha = false; }, () => {});
      // the nickname (server rules, blocked, taken): under the field, which gets the focus
      const nick = ['invalid', 'blocked', 'taken'].includes(err?.code);
      if (nick) {
        // no profile here yet: maybe theirs from another browser; no self-service recovery, a person releases it by hand
        const elsewhere = err.code === 'taken' && !hadSession;
        setInvalid(true, elsewhere ? 'Aquest sobrenom ja està agafat. Si és teu, ' : err?.message || 'Revisa el sobrenom.');
        if (elsewhere) { // the way out is in the message: «recupera el perfil» opens the same flow as the link below
          const link = doc.createElement('button');
          link.type = 'button'; link.className = 'btn btn-link'; link.textContent = 'recupera el perfil';
          link.addEventListener('click', () => $('publish-recover').click());
          fieldError.append(link, '.');
          recoverInError ||= !$('publish-recover').hidden; $('publish-recover').hidden = true;
        }
        aliasInput.focus();
      } else setPublishStatus(err?.message || 'No s’ha pogut publicar. Torna-ho a provar.');
      // fix the nickname, then the same press again
      setSend(nick ? 'Publica' : 'Torna-ho a provar');
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
    openBoard, openPublish, refreshSettings, deviceNote,
    // the same Turnstile for «Bústia de la plaça» (src/ui/feedback-ui.js): a single-use token per message; null = none here
    captcha: verify && { token: () => verify.token(), cancel: () => verify.cancel() },
    // every frame: only real changes touch the DOM. `show`: the results screen, once taps may land (after its first second).
    // The row (#results-actions) itself is src/ui/share-ui.js's: Comparteix is there even offline; these are its buttons.
    results(show) {
      const key = !show || !service.configured ? 0 : canWrite && snapshot && published !== snapshot ? 2 : 1;
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
