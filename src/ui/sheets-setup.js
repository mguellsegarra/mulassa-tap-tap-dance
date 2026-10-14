// Builds the sheets (settings, sync, board, share, profile, feedback, nudge, privacy), wires their buttons and registers them in `sheets`.
import { sheetFades } from './sheet-fade.js';
import { setupSync } from './sync-sheet.js';
import { store } from '../platform/storage.js';
import { APP_BUILD } from '../core/version.js';
import { memoryKeys, mockLeaderboard, markTestMode } from '../dev/final-test.js';
import { ALIAS_KEY, ROW_KEY, DECLINES_KEY, OPTOUT_KEY, setupBoard } from './board-ui.js';
import { makeDanceChart } from '../game/chart.js';
import song from '../song.json';
import { setupShare } from './share-ui.js';
import { setupProfile } from './profile-ui.js';
import { setupFeedback, setupNudge } from './feedback-ui.js';
import { nudgePlace } from '../hud/title-layout.js';
import { sheets } from './sheets.js';
import { pauseMenu, howtoMenu, settingsMenu, settingsEl, leadersEl, musicEl, howtoEl, iosHint, feedbackEl, privacyMenu, retryEl } from './handles.js';
import { G, chip, menuMusic, engine, clock, setMenuMusic } from '../game/state.js';
import { showPauseOptions } from './pause.js';
import { togglePause, requestPauseAction } from './pause-actions.js';
import { startPractice, startGame, toTitle, endPractice } from '../game/flow.js';
import { focusIn } from './focus.js';
import { offsetMs, FINAL, FINALE_T, setOffsetMs } from '../core/env.js';
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
  if (at < 0 && (step || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopImmediatePropagation(); items[0].focus(); return; }
  if (!step || (typing && document.activeElement.tagName !== 'INPUT')) return; // a textarea/select keeps its own arrows
  e.preventDefault(); e.stopImmediatePropagation(); // not a game key while a sheet is up
  items[(at + step + items.length) % items.length].focus();
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
document.getElementById('howto').addEventListener('click', () => { if (G.state === 'title') { howtoMenu.showModal(); focusIn(howtoMenu, 'howto-ok'); } });
document.getElementById('restart').addEventListener('click', () => requestPauseAction('restart'));
document.getElementById('exit').addEventListener('click', () => requestPauseAction('exit'));
// "Ajusta la sincronia": from ⚙ Configuració on the title, or from the pause menu mid-song
const sync = setupSync({
  get: () => offsetMs,
  set: v => { setOffsetMs(v); store.set('offset', v); }, // the sheet confirms it itself; the global toast is only for the [ ] keys
  onOpen: () => { if (G.state === 'title') chip?.menu(false); }, // the metronome alone
  onClose: () => {
    if (G.state !== 'title') return;
    chip?.menu(true);
    if (syncFromSettings) { syncFromSettings = false; openSettings(); return; } // opened from Configuració: back to it
    document.activeElement?.blur(); // Space picks a difficulty again, not the pill
  },
});
sheets.sync = sync;
let syncFromSettings = false;
const fmtOffset = v => `Ara: ${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))} ms`;
function openSettings() {
  if (G.state !== 'title' || settingsMenu.open) return;
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
const finalStore = FINAL && memoryKeys(store, [ALIAS_KEY, ROW_KEY, DECLINES_KEY, OPTOUT_KEY]); // ?final: nickname and «Ara no» forgotten on reload
const board = setupBoard({ focusIn,
  canPrompt: () => G.state === 'results' && !sheetUp() && !document.hidden && !document.body.classList.contains('wrong-orient'),
  canVerify: () => G.state !== 'play' && !document.hidden, // Turnstile's tick box (src/services/captcha.js) never interrupts a song
  afterPublish: o => share.openAfterPublish(o), // published: Comparteix next, for that run
  ...(!FINAL && { onRecover: () => profile.open('recover', () => board.openPublish()) }), // «Ja tens un perfil?» on the publish sheet: recover, then publish
  ...(FINAL && { service: mockLeaderboard({ charts: [0, 1, 2].map(d => makeDanceChart(song, d)), finaleT: FINALE_T, taken: FINAL.taken }), store: finalStore }) });
sheets.board = board;
// Comparteix (results only): the image and the challenge link, made on this device; closing gives the focus back to
// the button only for keyboard players (Space would otherwise press it again instead of leaving the results)
const share = setupShare({ focusIn, restore: () => focusIn({ focus: () => document.activeElement?.blur() }, 'results-share'), hero: (w, h) => renderHero(w, h), sfx: k => chip?.sfx(k), store: finalStore || store,
  auto: () => !board.promptsItself, ready: () => !sheetUp() && !document.hidden && !document.body.classList.contains('wrong-orient') }); // a record / 3 stars / a beaten challenge: Comparteix by itself when no publish prompt does it
sheets.share = share;
if (FINAL) markTestMode(); // «MODE PROVA»: nobody takes the mock leaderboard for the real one
document.getElementById('settings-board').addEventListener('click', () => { settingsMenu.close(); board.openBoard(() => { openSettings(); focusIn(settingsMenu, 'settings-board'); }); });
// The player's profile (src/ui/profile-ui.js): recover / link an e-mail / sign out / delete, all from the ⚙ «Perfil» block; closing the
// sheet goes back to Configuració. «Ja tens un perfil?» on the publish sheet recovers, then the publication opens again. Not in ?final (mock board).
const profile = FINAL ? null : setupProfile({ focusIn, captcha: board.captcha, store, aliasKey: ALIAS_KEY, deviceNote: board.deviceNote });
sheets.profile = profile;
document.getElementById('settings-profile-row').addEventListener('click', e => {
  const act = e.target.closest?.('button')?.dataset.act;
  if (!act || !profile) return;
  if (act === 'forget') { profile.forget(); return; }
  settingsMenu.close();
  profile.open(act, () => { openSettings(); focusIn(settingsMenu, 'settings-profile-main'); });
});
settingsMenu.addEventListener('close', () => { if (!sync.open && !board.open && G.state === 'title') document.activeElement?.blur(); });
// the title's podium button: straight to the level picked; closing blurs it (Space picks a difficulty again, not it)
document.getElementById('leaders').addEventListener('click', () => {
  if (G.state === 'title' && !settingsMenu.open) board.openBoard(() => document.activeElement?.blur());
});
// «Bústia de la plaça» (src/ui/feedback-ui.js): the title's speech bubble, next to the ⚙; Turnstile is board-ui.js's (one widget)
const feedback = setupFeedback({ focusIn, captcha: board.captcha, onOpen: () => nudge.done() });
sheets.feedback = feedback;
const nudge = setupNudge({ store, button: document.getElementById('feedback'), onTitle: () => G.state === 'title',
  free: () => !sheetUp() && !viewMode && !document.hidden && !document.body.classList.contains('wrong-orient'), place: placeNudge });
sheets.nudge = nudge;
// a spot for the nudge beside (or under) the bubble button, clear of the title's logo, choice and controls (css px)
function placeNudge() {
  const L = titleLayoutNow(), k = L.K, cv = (x, y, w, h) => ({ x: x * k, y: y * k, w: w * k, h: h * k });
  const dom = el => { const r = el && !el.hidden && el.getBoundingClientRect(); return r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; };
  const avoid = [cv(L.logo.x, L.logo.y, L.logo.w, L.logo.h), ...L.buttons.map(b => cv(b.x, b.y, b.w, b.h)), cv(W / 2 - 90, L.headingY - 9, 180, 18),
    L.hintY != null && cv(W / 2 - 110, L.hintY - 9, 220, 18), L.chipY != null && cv(W / 2 - 110, L.chipY - 12, 220, 24),
    dom(settingsEl), dom(leadersEl), dom(musicEl), dom(howtoEl), dom(iosHint), dom(viewBtn)].filter(Boolean);
  const button = dom(feedbackEl);
  return button && nudgePlace({ button, avoid, W: W * K, H: HH * K, safe: SAFE, corner: CORNER.matches });
}
// the title's speaker (#music): only the menu loop (never the song, the sfx or the plaça's murmur), a quick fade either way
const musicBtn = document.getElementById('music');
function showMusic() {
  const label = menuMusic ? 'Silencia la música del menú' : 'Activa la música del menú';
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
  if (G.state === 'title' && !sheetUp()) feedback.show(() => document.activeElement?.blur());
});
function openPrivacy() {
  if (privacyMenu.open) return;
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
// a collapse: «Torna-ho a provar» in the results row starts the same level again (as the title would, in one tap)
retryEl.addEventListener('click', () => { if (G.state === 'results' && G.reason === 'collapse' && clock - G.resT > 1) { const d = G.diff; toTitle(); startGame(d); } });
