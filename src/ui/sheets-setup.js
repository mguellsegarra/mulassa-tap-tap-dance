import { leaderboard } from '../services/leaderboard.js';
// Builds the sheets (settings, sync, board, share, profile, feedback, nudge, privacy), wires their buttons and registers them in `sheets`.
import { setupSelect } from './select-ui.js';
import { sheetFades } from './sheet-fade.js';
import { setupSync } from './sync-sheet.js';
import { store } from '../platform/storage.js';
import { APP_BUILD } from '../core/version.js';
import { memoryKeys, mockLeaderboard, markTestMode, leaderboardPreviewMode } from '../dev/final-test.js';
import { ALIAS_KEY, ROW_KEY, DECLINES_KEY, OPTOUT_KEY, PERSIST_KEY, setupBoard } from './board-ui.js';
import { makeDanceChart } from '../game/chart.js';
import { song } from '../game/figure-song.js';
import { setupShare } from './share-ui.js';
import { setupProfile } from './profile-ui.js';
import { setupFeedback, setupNudge } from './feedback-ui.js';
import { nudgePlace } from '../hud/title-layout.js';
import { sheets } from './sheets.js';
import { pauseMenu, howtoMenu, settingsMenu, settingsEl, leadersEl, musicEl, howtoEl, iosHint, feedbackEl, privacyMenu, retryEl } from './handles.js';
import { G, chip, menuMusic, engine, clock, setMenuMusic, setSelectedFigure, CHALLENGE } from '../game/state.js';
import { showPauseOptions } from './pause.js';
import { togglePause, requestPauseAction } from './pause-actions.js';
import { startPractice, startGame, toTitle, endPractice, choose, startWatch } from '../game/flow.js';
import { setupWatch } from './watch-ui.js';
import { focusIn, keyboardNav } from './focus.js';
import { offsetMs, FINAL, FINALE_T, setOffsetMs, CALM, DEMO } from '../core/env.js';
import { sheetUp, viewMode, viewBtn } from './controls.js';
import { renderHero } from '../scene/share-capture.js';
import { titleLayoutNow, CORNER } from '../hud/title.js';
import { W, K, HH, SAFE } from '../hud/canvas.js';

sheetFades();
// The keyboard works in every sheet: ↑↓ (and ←→ outside text fields) move between its controls, and Enter/Space act on
// the focused one (native). If the focus fell outside the open sheet (a click on its padding), the first key brings it
// back to the sheet's first control instead of doing nothing.
addEventListener('keydown', e => {
  const dlg = [...document.querySelectorAll('dialog.sheet[open]')].pop(); // the topmost
  if (!dlg || e.altKey || e.ctrlKey || e.metaKey) return;
  const items = [...dlg.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && !el.closest('[hidden]') && el.offsetParent !== null);
  if (!items.length) return;
  const at = items.indexOf(document.activeElement), typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  const step = { ArrowDown: 1, ArrowUp: -1, ...(typing ? {} : { ArrowRight: 1, ArrowLeft: -1 }) }[e.key];
  if (at < 0 && (step || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopImmediatePropagation(); items[0].focus(); if (step && document.activeElement === items[0]) chip?.sfx('menu'); return; }
  if (!step || (typing && document.activeElement.tagName !== 'INPUT')) return; // a textarea/select keeps its own arrows
  e.preventDefault(); e.stopImmediatePropagation(); // not a game key while a sheet is up
  const target = items[(at + step + items.length) % items.length], previous = document.activeElement;
  target.focus();
  if (target !== previous && document.activeElement === target) chip?.sfx('menu');
}, true);
pauseMenu.addEventListener('cancel', e => {
  e.preventDefault();
  if (G.pendingAction) showPauseOptions(); else togglePause();
});
document.getElementById('resume').addEventListener('click', togglePause);
document.getElementById('cancel-action').addEventListener('click', showPauseOptions);
document.getElementById('confirm-action').addEventListener('click', () => {
  if (G.pendingAction === 'restart') { chip.resume(); if (G.practice) startPractice(G.practice.then); else startGame(G.diff); }
  else if (G.pendingAction === 'exit') toTitle();
  document.activeElement?.blur();
});
document.getElementById('pause').addEventListener('click', togglePause);
document.getElementById('howto').addEventListener('click', () => { if ((G.state === 'title' || G.state === 'select')) { howtoMenu.showModal(); focusIn(howtoMenu, 'howto-ok'); } });
// The dance demo has nothing to lose: its restart and exit need no confirmation
const pauseAction = a => { if (!G.watch) requestPauseAction(a); else if (a === 'restart') { chip.resume(); startWatch(); } else toTitle(); };
document.getElementById('restart').addEventListener('click', () => pauseAction('restart'));
document.getElementById('exit').addEventListener('click', () => pauseAction('exit'));
// "Ajusta la sincronia": from ⚙ Configuració on the title, or from the pause menu mid-song
const sync = setupSync({
  get: () => offsetMs,
  set: v => { setOffsetMs(v); store.set('offset', v); }, // the sheet confirms it itself; the global toast is only for the [ ] keys
  onOpen: () => { if ((G.state === 'title' || G.state === 'select')) chip?.menu(false); }, // the metronome alone
  onClose: () => {
    if ((G.state !== 'title' && G.state !== 'select')) return;
    chip?.menu(true);
    if (syncFromSettings) { syncFromSettings = false; openSettings(); return; } // opened from Configuració: back to it
    document.activeElement?.blur(); // Space picks a difficulty again, not the pill
  },
});
sheets.sync = sync;
let syncFromSettings = false;
const fmtOffset = v => `Ara: ${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))} ms`;
function openSettings() {
  if ((G.state !== 'title' && G.state !== 'select') || settingsMenu.open) return;
  document.getElementById('settings-offset').textContent = fmtOffset(offsetMs);
  settingsMenu.showModal();
  focusIn(settingsMenu, 'settings-sync');
  board.refreshSettings(); // the «Proposta de publicar» row
  profile?.refresh(); // the «Perfil» row
}
const versionEl = document.getElementById('settings-version');
versionEl.textContent = `v${APP_BUILD.replace('+', ' · ')}`; // v1.0.54 · d40502a: a phone has no hover, so the sha is plain text
document.getElementById('settings').addEventListener('click', openSettings);
document.getElementById('settings-sync').addEventListener('click', () => { settingsMenu.close(); syncFromSettings = true; sync.show(); });
document.getElementById('settings-practice').addEventListener('click', () => { settingsMenu.close(); startPractice(null); });
// Classificacions (optional, online): from Configuració on the title (closing it goes back there) or the results screen.
// After an eligible run its publish sheet opens by itself, only over a bare, visible, upright results screen.
const mockBoard = Boolean(FINAL) || leaderboardPreviewMode({ hostname: location.hostname, search: location.search, configured: leaderboard.configured });
// mocked board: nickname, the profile's last answer and prompt choices live in memory, forgotten on reload
const finalStore = mockBoard && memoryKeys(store, [ALIAS_KEY, ROW_KEY, DECLINES_KEY, OPTOUT_KEY, PERSIST_KEY, `${ALIAS_KEY}:identity`]);
if (FINAL?.board === 'me') { finalStore.set(ALIAS_KEY, 'ProvaRetall'); finalStore.set(ROW_KEY, 'ProvaRetall'); }
else if (FINAL?.account && FINAL.account !== 'new') finalStore.set(ALIAS_KEY, 'Prova123'); // the mock account's profile is this browser's
const mockService = mockBoard && mockLeaderboard({ charts: [0, 1, 2].map(d => makeDanceChart(song, d)), finaleT: FINALE_T, taken: FINAL?.taken, board: FINAL?.board, account: FINAL?.account, fail: FINAL?.fail,
  ...(FINAL?.review != null && { calls: (globalThis.__reviewCalls = []) }) }); // ?final&review: the mock's calls, for QA
const board = setupBoard({ focusIn,
  canPrompt: () => FINAL?.review == null && G.state === 'results' && !sheetUp() && !document.hidden && !document.body.classList.contains('wrong-orient'),
  canVerify: () => G.state !== 'play' && !document.hidden, // Turnstile's tick box (src/services/captcha.js) never interrupts a song
  afterPublish: o => share.openAfterPublish(o), // published: Comparteix next, for that run
  onRecover: () => profile.open('recover', () => board.openPublish()), // «Recupera’l» on the publish sheet: recover, then publish
  onConfirm: o => profile.open('link', () => share.openAfterPublish(o)), // «Confirma el correu» after «Publicat!»: then Comparteix
  ...(mockBoard && { service: mockService, store: finalStore }) });
sheets.board = board;
// Comparteix (results only): the image and the challenge link, made on this device; closing gives the focus back to
// the button only for keyboard players (Space would otherwise press it again instead of leaving the results)
const share = setupShare({ focusIn, restore: () => focusIn({ focus: () => document.activeElement?.blur() }, 'results-share'), hero: (w, h, figureId) => renderHero(w, h, figureId), standing: () => board.standing(), sfx: k => chip?.sfx(k), store: finalStore || store,
  auto: () => !board.promptsItself, ready: () => !sheetUp() && !document.hidden && !document.body.classList.contains('wrong-orient') }); // a record / 3 stars / a beaten challenge: Comparteix by itself when no publish prompt does it
sheets.share = share;
if (mockBoard) markTestMode(); // «MODE PROVA»: synthetic rows remain clearly labelled
// ?final&review=<state>: dev-only deep links into the profile flows over the mock (src/dev/account-review.js, its own chunk)
if (FINAL?.review != null) import('../dev/account-review.js').then(m => m.startReview({ state: FINAL.review, board: () => board, openSettings, toTitle, store: finalStore }));
document.getElementById('settings-board').addEventListener('click', () => { settingsMenu.close(); board.openBoard(() => { openSettings(); focusIn(settingsMenu, 'settings-board'); }); });
// The player's profile (src/ui/profile-ui.js): recover / link an e-mail / sign out / delete, all from the ⚙ «Perfil» block; closing the
// sheet goes back to Configuració. «Recupera’l» on the publish sheet recovers, then the publication opens again. ?final / ?mock:
// the same sheet over the mock service and the in-memory keys (src/dev/final-test.js), nothing real.
const profile = setupProfile({ focusIn, captcha: board.captcha, store: finalStore || store, aliasKey: ALIAS_KEY, deviceNote: board.deviceNote, ...(mockBoard && { service: mockService }) });
sheets.profile = profile;
document.getElementById('settings-profile-row').addEventListener('click', e => {
  const act = e.target.closest?.('button')?.dataset.act;
  if (!act || !profile) return;
  if (act === 'forget') { profile.forget(); return; }
  settingsMenu.close();
  profile.open(act, () => { openSettings(); focusIn(settingsMenu, 'settings-profile-main'); });
});
settingsMenu.addEventListener('close', () => { if (!sync.open && !board.open && (G.state === 'title' || G.state === 'select')) document.activeElement?.blur(); });
// the title's podium button: straight to the level picked; closing blurs it (Space picks a difficulty again, not it)
document.getElementById('leaders').addEventListener('click', () => {
  if ((G.state === 'title' || G.state === 'select') && !settingsMenu.open) board.openBoard(() => document.activeElement?.blur());
});
// «Bústia de la plaça» (src/ui/feedback-ui.js): the title's speech bubble, next to the ⚙; Turnstile is board-ui.js's (one widget)
const feedback = setupFeedback({ focusIn, captcha: board.captcha, onOpen: () => nudge.done() });
sheets.feedback = feedback;
const select = setupSelect({ store, keyboard: () => keyboardNav, busy: () => sheetUp() || viewMode, reduced: () => CALM.matches,
  firstLevel: CHALLENGE?.diff ?? null, demo: DEMO, getError: () => G.audioError, standing: () => board.standing(), onBoard: () => board.openBoard(() => select.refocus()),
  sfx: k => chip?.sfx(k), onSelect: setSelectedFigure,
  onPlay: (level, figure) => { setSelectedFigure(figure); choose(level); },
  onHowto: () => { howtoMenu.showModal(); focusIn(howtoMenu, 'howto-ok'); },
  onWrite: draft => feedback.show(() => select.refocus(), draft) });
sheets.select = select;
sheets.watch = setupWatch({ select, busy: () => sheetUp() || viewMode });
howtoMenu.addEventListener('close', () => select.refocus());
const nudge = setupNudge({ store, button: document.getElementById('feedback'), onTitle: () => G.state === 'title',
  free: () => !sheetUp() && !viewMode && !document.hidden && !document.body.classList.contains('wrong-orient'), place: placeNudge });
sheets.nudge = nudge;
// a spot for the nudge beside (or under) the bubble button, clear of the title's logo, choice and controls (css px)
function placeNudge() {
  const L = titleLayoutNow(), k = L.K, cv = (x, y, w, h) => ({ x: x * k, y: y * k, w: w * k, h: h * k });
  const dom = el => { const r = el && !el.hidden && el.getBoundingClientRect(); return r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
  const avoid = [cv(L.logo.x, L.logo.y, L.logo.w, L.logo.h), ...L.buttons.map(b => cv(b.x, b.y, b.w, b.h)),
    L.hintY != null && cv(W / 2 - 110, L.hintY - 9, 220, 18), L.chipY != null && cv(W / 2 - 110, L.chipY - 12, 220, 24),
    dom(settingsEl), dom(leadersEl), dom(musicEl), dom(howtoEl), dom(iosHint), dom(viewBtn)].filter(Boolean);
  const button = dom(feedbackEl);
  return button && nudgePlace({ button, avoid, W: W * K, H: HH * K, safe: SAFE, corner: CORNER.matches });
}
// The speaker controls every menu sound; the saved preference never silences a run.
const musicBtn = document.getElementById('music');
function showMusic() {
  const label = menuMusic ? 'Silencia el so del menú' : 'Activa el so del menú';
  musicBtn.dataset.state = menuMusic ? 'on' : 'off';
  musicBtn.setAttribute('aria-label', label); musicBtn.title = label;
}
showMusic();
musicBtn.addEventListener('click', () => {
  setMenuMusic(!menuMusic);
  store.set('menu-music', menuMusic ? 'on' : 'off');
  engine?.setMenuMusic(menuMusic);
  showMusic();
});
document.getElementById('feedback').addEventListener('click', () => {
  if ((G.state === 'title' || G.state === 'select') && !sheetUp()) feedback.show(() => document.activeElement?.blur());
});
const privacyContent = document.getElementById('privacy-content');
const privacyBody = privacyMenu.querySelector?.('.sheet-body');
privacyMenu.addEventListener('close', () => {
  // Reuse the same nodes, including the contact link initialized by setupBoard.
  if (!privacyMenu.open && privacyBody) privacyContent.content.append(...privacyBody.childNodes);
});
function openPrivacy() {
  if (privacyMenu.open) return;
  privacyBody.append(privacyContent.content);
  privacyMenu.showModal();
  const body = privacyMenu.querySelector?.('.sheet-body'); if (body) body.scrollTop = 0;
  focusIn(privacyMenu, 'privacy-ok');
}
document.addEventListener('click', e => { if (e.target.closest?.('[data-privacy-open]')) openPrivacy(); });
document.getElementById('pause-sync').addEventListener('click', () => sync.show());
document.getElementById('howto-practice').addEventListener('click', () => { howtoMenu.close(); startPractice(null); });
document.getElementById('howto-ok').addEventListener('click', () => howtoMenu.close());
document.getElementById('privacy-ok').addEventListener('click', () => privacyMenu.close());
document.getElementById('skip').addEventListener('click', () => { if (G.practice && !G.paused) { chip.sfx('menu'); endPractice(); } });
// «Torna-ho a provar» starts the same figure and level again after any result.
retryEl.addEventListener('click', () => { if (G.state === 'results' && clock - G.resT > 1) { const d = G.diff; toTitle(); startGame(d); } });
