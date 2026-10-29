// DOM for the optional online side: publishing the finished run (alias only; a new profile also needs a Turnstile token)
// and the Classificació sheet it builds (src/ui/board-list.js: one board per figure and season). The profile itself (link
// an e-mail, recover, sign out, delete) is src/ui/profile-ui.js. Turnstile (src/services/captcha.js) checks a player only
// when a token is needed; Supabase is touched only when one of these sheets asks for it, never in the game loop, and the
// guest profile is made only on publishing (or «Crea»). After an eligible run the publish sheet opens by itself (a prompt:
// nothing is sent until Publica is pressed; only «No m’ho tornis a recordar» stops it); a publication shows a Mulassa, then «Publicat!» + the
// place with a «D'acord» that closes it; Comparteix only opens from its own button.
import { leaderboard, turnstileSiteKey, subscribeLeaderboardResult } from '../services/leaderboard.js';
import { VERSION_RULES } from '../services/leaderboard-rules.js';
import { FIGURES, hasBoard } from '../game/figures.js';
import { store as defaultStore } from '../platform/storage.js';
import { byId } from './sheet-kit.js';
import { setupVerify, loadTurnstile } from '../services/captcha.js';
import { deviceRisk, DEVICE_NOTES, browserEnv } from './profile-notes.js';
import { setupBoardList } from './board-list.js';
import { ALIAS_KEY } from '../services/leaderboard-identity.js';
import { standingOf, podiumOf } from './board-reads.js';
import { setupPublish, OPTOUT_KEY } from './publish-ui.js';

// once, after the first publication: ask the browser to keep this site's storage (Chrome decides quietly)
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
  // afterPublish: a publication landed (sheets-setup.js refreshes the identity). `settle`: the Mulassa shows at least this long
  // (and waits for the place line) before «Publicat!»
  afterPublish = null, settle = 1100,
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
  const resultsPublish = $('results-publish'), resultsBoard = $('results-board');
  const runs = { snapshot: null, published: null }; // the results screen's frozen run, and the last one published
  let prompted = null, promptTimer = null; // the run the prompt was armed for, and its timer

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
  subscribe(r => { runs.snapshot = r; }); // the frozen run of the results screen; cleared by the title or a new run

  const { openBoard } = setupBoardList({ doc, $, service, store, focusIn, minLoad, now, observe, onCard, onSeasons, onKeep, currentFigure, canPlay, onPlay,
    canPublish: () => Boolean(canWrite && runs.snapshot && runs.published !== runs.snapshot), runFigure: () => VERSION_RULES[runs.snapshot?.version]?.figureId,
    openPublish: () => openPublish(), publishing: () => publishMenu.open });
  const { openPublish, publishQuietly } = setupPublish({ doc, $, service, store, focusIn, now, runs, canWrite, verify, deviceNote, openBoard,
    onRecover, onConfirm, acceptStats, afterPublish, settle, persist });

  // --- ⚙ Configuració: the «Proposta de publicar» row
  const promptsOn = () => !store.get(OPTOUT_KEY);
  function syncPromptRow() { const row = $('settings-prompt-row'); if (row) row.hidden = promptsOn(); } // the row exists only while the prompt is off
  // ⚙ «Proposta de publicar» → «Activa»: clears the opt-out, and the row goes away
  $('settings-prompt')?.addEventListener('click', () => { store.remove(OPTOUT_KEY); syncPromptRow(); });
  function refreshSettings() { if (service.configured) { syncPromptRow(); } } // the «Perfil» block is src/ui/profile-ui.js's

  // --- results screen: two DOM buttons under the canvas card
  resultsPublish.addEventListener('click', () => openPublish());
  resultsBoard.addEventListener('click', () => openBoard());
  let shown = -1;
  let reserveFor = null, reserve = false; // publishable's answer, fixed for the run it was first asked about

  // --- the prompt that opens by itself: once per eligible run, a moment after the row appears, never to nag
  // eligible (a finished run: a collapse, practice, autoplay or ?from leaves no snapshot), whatever its stars, online, with
  // at least one hit, not opted out («Ara no» only closes it for this run)
  const sendable = run => Boolean(canWrite && run && online());
  const promptable = run => sendable(run) && run.counts.perfect + run.counts.good > 0 && promptsOn();
  // a nickname already chosen: every run goes up by itself instead, whatever its stars (publish-land.js publishQuietly; the
  // server keeps the best), no prompt
  const quietly = run => sendable(run) && Boolean(store.get(ALIAS_KEY));
  function firePrompt() {
    promptTimer = null;
    if (!shown || runs.published === runs.snapshot || publishMenu.open || boardMenu.open || !canPrompt() || !promptable(runs.snapshot)) return;
    openPublish({ auto: true });
  }
  return {
    get open() { return boardMenu.open || publishMenu.open || Boolean(verify?.open); },
    configured: service.configured, // offline game: no online entry points (the title's podium button too)
    openBoard, openPublish, refreshSettings, deviceNote, standing: f => standingOf(service, f), levelPodium: (f, level) => podiumOf(service, f, level),
    // the same Turnstile for «Bústia de la plaça» (src/ui/feedback-ui.js): a single-use token per message; null = none here
    captcha: verify && { token: () => verify.token(), cancel: () => verify.cancel() },
    // every frame: only real changes touch the DOM. `show`: the results screen, once taps may land (after its first second).
    // The row (#results-actions) itself is src/ui/share-ui.js's: Comparteix is there even offline; these are its buttons.
    results(show) {
      const offBoard = FIGURES.some(f => f.id === currentFigure() && !hasBoard(f)); // the Bou: no board to show it on
      const key = !show || !service.configured || offBoard ? 0 : canWrite && runs.snapshot && runs.published !== runs.snapshot ? 2 : 1;
      if (key === shown) return;
      if (doc.activeElement === resultsPublish || doc.activeElement === resultsBoard) doc.activeElement.blur?.(); // no focus on a hidden button
      shown = key;
      resultsBoard.hidden = !key;
      resultsPublish.hidden = key !== 2;
      if (key !== 2) { clearTimeout(promptTimer); promptTimer = null; }
      else if (prompted !== runs.snapshot) { // this run's one chance
        prompted = runs.snapshot;
        const run = runs.snapshot;
        if (quietly(run)) {
          publishQuietly().then(ok => { if (!ok && runs.snapshot === run && promptable(run)) firePrompt(); });
          if (runs.published === run) { shown = 1; resultsPublish.hidden = true; } // already on its way: not even one frame of the button
        }
        else if (promptable(run)) promptTimer = setTimeout(firePrompt, promptDelay);
      }
    },
    // «Publica el resultat» may show on this results screen (narrow screens then need a second row, main.js
    // resultsReserve()): for the whole screen, so the card doesn't jump when the button goes after publishing
    // the publish prompt opens (or already did) by itself for this results screen: Comparteix follows that, not this.
    // A named player's run goes up by itself: no button, no row kept for it. Decided once per run: a first publication (a
    // nickname now) or going offline mid-screen must not move the card
    get publishable() {
      const run = service.configured && canWrite ? runs.snapshot : null;
      if (run !== reserveFor) { reserveFor = run; reserve = Boolean(run) && !quietly(run); }
      return reserve;
    },
  };
}
