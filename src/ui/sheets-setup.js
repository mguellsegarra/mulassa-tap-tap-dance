import { leaderboard } from '../services/leaderboard.js';
import { TAG_KEY, ALIAS_KEY, refreshIdentity } from '../services/leaderboard-identity.js';
// Builds the sheets (settings, sync, board, share, profile, Perfil, seasons, cards, feedback, privacy), wires their buttons and registers them in `sheets`.
import { showPhotoHelp, setRadioHint } from './photo-avatars.js';
import { setupSelect } from './select-ui.js';
import { sheetFades } from './sheet-fade.js';
import { setupSync } from './sync-sheet.js';
import { store } from '../platform/storage.js';
import { APP_BUILD } from '../core/version.js';
import { memoryKeys, mockLeaderboard, markTestMode, leaderboardPreviewMode, demoOptions, DEMO_SELF, FINAL } from '../dev/final-test.js';
import { statsSync, markStatsNoticeSeen } from '../services/stats-sync.js';
import { setupAccount } from './account-ui.js';
import { setupSeasons } from './seasons-ui.js';
import { setupSeasonEnd } from './season-end-ui.js';
import { setupCard } from './player-card.js';
import { setupBoard, QUIET_OFF_KEY } from './board-ui.js';
import { DECLINES_KEY, OPTOUT_KEY, PERSIST_KEY } from './publish-ui.js';
import { setupGreeting } from './greeting.js';
import { setupDeviceHint } from './device-hint.js';
import { setupFreeGate } from './free-gate.js';
import { softwareGl } from '../scene/stage.js';
import { makeDanceChart } from '../game/chart.js';
import { song, FINALE_T } from '../game/figure-song.js';
import { setupShare } from './share-ui.js';
import { setupProfile } from './profile-ui.js';
import { setupFeedback } from './feedback-ui.js';
import { sheets } from './sheets.js';
import { tr } from '../i18n/messages.js';
import { pauseMenu, howtoMenu, settingsMenu, privacyMenu, retryEl } from './handles.js';
import { G, chip, menuMusic, clock, setMenuSound, setSelectedFigure, CHALLENGE, offsetMs, setOffsetMs } from '../game/state.js';
import { showPauseOptions } from './pause.js';
import { togglePause, requestPauseAction } from './pause-actions.js';
import { startPractice, startGame, toTitle, endPractice, choose, startWatch } from '../game/flow.js';
import { setupWatch } from './watch-ui.js';
import { setupFreeMusic } from './free-music.js';
import { setupLang } from './lang-ui.js';
import { focusIn, keyboardNav } from './focus.js';
import { Q, CALM, DEMO } from '../core/env.js';
import { idOfKey } from '../figures/index.js';
import { sheetUp, viewMode, viewBtn, enterFree } from './controls.js';
import { loadPhoto } from '../hud/share-card.js';

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
document.getElementById('howto').addEventListener('click', () => { if (viewMode) { showPhotoHelp(); return; } if ((G.state === 'select')) { howtoMenu.showModal(); focusIn(howtoMenu, 'howto-ok'); } });
// The dance demo has nothing to lose: its restart and exit need no confirmation
const pauseAction = a => { if (!G.watch) requestPauseAction(a); else if (a === 'restart') { chip.resume(); startWatch(); } else toTitle(); };
document.getElementById('restart').addEventListener('click', () => pauseAction('restart'));
document.getElementById('exit').addEventListener('click', () => pauseAction('exit'));
// "Ajusta la sincronia": from ⚙ Configuració on the selector, or from the pause menu mid-song
const sync = setupSync({
  get: () => offsetMs,
  set: v => { setOffsetMs(v); store.set('offset', v); }, // the sheet confirms it itself; the global toast is only for the [ ] keys
  onOpen: () => { if ((G.state === 'select')) chip?.menu(false); }, // the metronome alone
  onClose: () => {
    if ((G.state !== 'select')) return;
    chip?.menu(true);
    if (syncBack) { const b = syncBack; syncBack = null; b(); return; } // opened from Configuració or the Perfil: back there
    document.activeElement?.blur(); // Space picks a difficulty again, not the pill
  },
});
sheets.sync = sync;
let syncBack = null;
const fmtOffset = v => tr('ui.sync.now', { value: `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))} ms` });
function openSettings() {
  if ((G.state !== 'select') || settingsMenu.open) return;
  document.getElementById('settings-offset').textContent = fmtOffset(offsetMs);
  settingsMenu.showModal();
  focusIn(settingsMenu, 'settings-sync');
  board.refreshSettings(); // the «Proposta de publicar» row
  document.getElementById('settings-profile').hidden = !board.configured; // Perfil (decision 6): only with a board
}
const versionEl = document.getElementById('settings-version');
versionEl.textContent = `v${APP_BUILD.replace('+', ' · ')}`; // v1.0.54 · d40502a: a phone has no hover, so the sha is plain text
document.getElementById('settings').addEventListener('click', openSettings);
document.getElementById('settings-sync').addEventListener('click', () => { settingsMenu.close(); syncBack = openSettings; sync.show(); });
document.getElementById('settings-feedback').addEventListener('click', () => { settingsMenu.close(); feedback.show(openSettings); }); // the selector's Bústia (its corner slot went to free play); closing it comes back here
// Classificacions (optional, online): from the selector or the results screen.
// After an eligible run its publish sheet opens by itself, only over a bare, visible, upright results screen.
const mockBoard = Boolean(FINAL) || leaderboardPreviewMode({ hostname: location.hostname, search: location.search, configured: leaderboard.configured });
// mocked board: nickname (and its tag), the profile's last answer and prompt choices live in memory, forgotten on reload.
// The demo world comes from the URL (src/dev/final-test.js demoOptions: &account, &seasons, &board, &drac, &card).
const mockOpts = mockBoard && { ...demoOptions(location.search), ...FINAL };
const demoAccount = mockBoard && DEMO && !FINAL && !mockOpts.account; // ?demo: a player with a row, so the board's own row and the rank exist
if (demoAccount) mockOpts.account = 'verified';
const finalStore = mockBoard && memoryKeys(store, [ALIAS_KEY, TAG_KEY, DECLINES_KEY, OPTOUT_KEY, QUIET_OFF_KEY, PERSIST_KEY, `${ALIAS_KEY}:identity`]);
if (mockOpts?.board === 'me') finalStore.set(ALIAS_KEY, 'ProvaRetall');
else if (mockOpts?.account && mockOpts.account !== 'new') { // the mock account's profile is this browser's
  finalStore.set(ALIAS_KEY, DEMO_SELF.alias);
  if (mockOpts.account !== 'verified') finalStore.set(TAG_KEY, String(DEMO_SELF.tag));
}
const mockService = mockBoard && mockLeaderboard({ charts: [0, 1, 2].map(d => makeDanceChart(song, d)), finaleT: FINALE_T, ...mockOpts,
  ...(FINAL?.review != null && { calls: (globalThis.__reviewCalls = []) }) }); // ?final&review: the mock's calls, for QA
const service = mockService || leaderboard, kv = finalStore || store;
// The statistics' upload (src/services/stats-sync.js): never during a song, over the mock when it is on. Its owner is read at
// the first selector (greet), not at load: no Supabase before a sheet or the menu needs it (a run that ends before that
// counts under 'none', which the profile takes over: decision 30)
if (mockService) statsSync.use(mockService);
statsSync.holdWhile(() => G.state === 'play');
// the statistics' notice was on the sheet that created this profile (Crea, the first publication): it may send now
const acceptStats = () => Promise.resolve(service.ownerId()).then(id => { if (id) markStatsNoticeSeen(id); statsSync.acceptNotice(); }, () => {});
const card = setupCard({ focusIn, service });
sheets.card = card;
const seasons = setupSeasons({ focusIn, service, onCard: p => card.open(p),
  onBoard: (figure, e) => board.openBoard(null, e ? { figure, seasonId: e.seasonId, version: e.version, name: e.name } : { figure }) }); // over the board, if it is open; no entry: the open season's
sheets.seasons = seasons;
const board = setupBoard({ focusIn,
  canPrompt: () => FINAL?.review == null && G.state === 'results' && !sheetUp() && !document.hidden && !document.body.classList.contains('wrong-orient'),
  canVerify: () => G.state !== 'play' && !document.hidden, // Turnstile's tick box (src/services/captcha.js) never interrupts a song
  afterPublish: () => { refreshIdentity(service, kv).then(() => share.refreshName()); }, // the name's check follows the server's answer
  onRecover: () => profile.open('recover', () => board.openPublish()), // «Recupera’l» on the publish sheet: recover, then publish
  onConfirm: ({ mail } = {}) => profile.open('link', null, { mail }), // «Envia el codi» under «Publicat!»: the code goes out at once
  onKeep: () => profile.open('link'), onCard: p => card.open(p), onSeasons: f => seasons.open(f), // over the board, which stays under them
  acceptStats, currentFigure: () => select?.figure?.id,
  // «Juga amb …» on an empty board: only with the selector right under it (not over results, Perfil or the Saló de la fama)
  canPlay: () => G.state === 'select' && !viewMode && [...document.querySelectorAll('dialog[open]')].every(d => d.id === 'board-menu'),
  onPlay: id => select.show(id),
  ...(mockBoard && { service: mockService, store: finalStore }) });
sheets.board = board;
// Comparteix (results only): the image and the challenge link, made on this device; closing gives the focus back to
// the button only for keyboard players (Space would otherwise press it again instead of leaving the results)
const share = setupShare({ focusIn, restore: () => focusIn({ focus: () => document.activeElement?.blur() }, 'results-share'), hero: loadPhoto, standing: f => board.standing(f), sfx: k => chip?.sfx(k), store: finalStore || store }); // only from its button, never by itself
sheets.share = share;
if (mockBoard) markTestMode(); // «MODE PROVA»: synthetic rows remain clearly labelled
// ?final&review=<state>: dev-only deep links into the profile flows over the mock (src/dev/account-review.js, its own chunk)
if (FINAL?.review != null) import('../dev/account-review.js').then(m => m.startReview({ state: FINAL.review, board: () => board,
  openProfile: () => account.open(), openBoard: (o = {}) => board.openBoard(null, o), openSeasons: f => seasons.open(f),
  showSeasonEnd: async () => { const n = await seasonEnd.news(); if (!n) throw new Error('no ended season to tell'); seasonEnd.show(n); },
  openCard: (alias, tag, from) => card.open({ alias, tag, from }), chooseNameReady: () => until(() => profile.choosing) }));
// The player's profile (src/ui/profile-ui.js): recover / link an e-mail / choose a clean name / sign out / delete, from the block
// at the top of «Perfil» (src/ui/account-ui.js, the corner row's person); closing a step goes back to Perfil. «Recupera’l» on the
// publish sheet recovers, then the publication opens again. ?final / ?mock: the same sheets over the mock service and the
// in-memory keys (src/dev/final-test.js), nothing real.
const profile = setupProfile({ focusIn, captcha: board.captcha, store: kv, aliasKey: ALIAS_KEY, deviceNote: board.deviceNote, acceptStats, ...(mockBoard && { service: mockService }) });
sheets.profile = profile;
const account = setupAccount({ focusIn, profile, service, store: kv, stats: statsSync, onSync: back => { syncBack = back; sync.show(); }, onHall: (f, back) => seasons.open(f, back) });
sheets.account = account;
document.getElementById('settings-profile').addEventListener('click', () => { settingsMenu.close(); account.open(openSettings); }); // Perfil lives in ⚙ Configuració (no corner button); closing it comes back here
// «Tardor 2026 s’ha acabat»: once per profile and season (in memory over the mock, so each review shows it)
const seasonEnd = setupSeasonEnd({ focusIn, service, store: mockBoard ? new Map() : store, onHall: (f, back) => seasons.open(f, back) });
sheets.seasonEnd = seasonEnd;
const until = (test, ms = 20000) => new Promise((resolve, reject) => { const t0 = Date.now(); (function tick() { if (test()) resolve(); else if (Date.now() - t0 > ms) reject(new Error('timed out')); else setTimeout(tick, 50); })(); });
// The first selector after the start, and every idle one after it until the profile has nothing left to hear (src/ui/greeting.js).
// An account change (a recovery, a sign-out, another tab) re-asks, and refreshes the name the share image shows.
let cardGreeted = false;
const hint = setupDeviceHint({ focusIn, store, softwareGl }); // the device tips, last: after the profile's own news
sheets.hint = hint;
sheets.freeGate = setupFreeGate({ focusIn, store, onEnter: () => enterFree() }); // an upright iPhone is asked to turn before free play
const greeting = setupGreeting({ stats: statsSync, seasonEnd, account, hint, identity: () => refreshIdentity(service, kv).finally(() => feedback.warm()), back: () => select.refocus(),
  free: () => G.state === 'select' && !sheetUp() && !viewMode && !document.hidden,
  extra: () => {
    const c = !cardGreeted && mockOpts?.card && /^([^#]+)(?:#(\d{1,4}))?$/.exec(mockOpts.card);
    if (!c) return false;
    cardGreeted = true; card.open({ alias: c[1], tag: c[2] ? Number(c[2]) : null }, () => select.refocus());
    return true;
  } });
service.onAccount?.(() => { refreshIdentity(service, kv, { fresh: true }).then(() => { share.refreshName(); feedback.warm(); }); greeting.accountChanged(); });
document.addEventListener('close', () => greeting.poke(), true); // dialogs' close does not bubble
settingsMenu.addEventListener('close', () => { if (!sync.open && !board.open && (G.state === 'select')) document.activeElement?.blur(); });
// Bústia de la plaça: opened from Configuració or a pending figure; one shared Turnstile.
const feedback = setupFeedback({ focusIn, captcha: board.captcha, confirmedEmail: async () => (await service.identity()).email });
sheets.feedback = feedback;
const select = setupSelect({ store, keyboard: () => keyboardNav, busy: () => sheetUp() || viewMode, reduced: () => CALM.matches,
  firstLevel: CHALLENGE?.diff ?? null, firstFigure: idOfKey(Q.get('figura')) ?? CHALLENGE?.figure ?? null, // ?figura (debug), else a challenge's figure: the selector opens on it
  demo: DEMO, getError: () => G.audioError, standing: f => board.standing(f), levelPodium: (f, l) => board.levelPodium(f, l), ranked: board.configured, onBoard: f => board.openBoard(() => select.refocus(), { figure: f.id }), onCard: p => card.open(p, () => select.refocus()),
  sfx: k => chip?.sfx(k), onSelect: f => { setSelectedFigure(f); greeting.greet(); },
  onPlay: (level, figure) => { setSelectedFigure(figure); choose(level); },
  onHowto: () => { howtoMenu.showModal(); focusIn(howtoMenu, 'howto-ok'); },
  onWrite: draft => feedback.show(() => select.refocus(), draft) });
sheets.select = select;
sheets.lang = setupLang({ store, state: () => G.state }); // the language dropdown and the one-time suggestion
sheets.watch = setupWatch({ select, busy: () => sheetUp() || viewMode });
howtoMenu.addEventListener('close', () => select.refocus());
// The speaker controls every menu sound; the saved preference never silences a run.
const musicBtn = document.getElementById('music');
function showMusic() {
  const label = tr(menuMusic ? 'ui.music.mute' : 'ui.music.unmute');
  musicBtn.dataset.state = menuMusic ? 'on' : 'off';
  musicBtn.setAttribute('aria-label', label); musicBtn.title = label;
}
showMusic();
musicBtn.addEventListener('click', () => {
  setMenuSound(!menuMusic);
  showMusic();
});
sheets.music = setupFreeMusic({ eye: viewBtn, onSound: showMusic }); setRadioHint(() => sheets.music.discover()); // free mode's radio: its «Silenci» is this speaker's preference
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
