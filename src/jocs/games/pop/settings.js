// ⚙ Configuració on Pop's home, with Perfil, the Bústia, the language and Privadesa: mulassa.cat's own sheets (its index.html,
// put in this page by vite.config.js) run by mulassa.cat's own code, a chunk main.js loads while the boot screen runs. One
// account everywhere (packages/plassa/docs/inventari.md); the statistics stay each game's (decision 3), so Perfil here is the
// profile block alone. The rows that are mulassa.cat's game (the sync, the publish prompt) stay hidden.
import boardCss from '../../../styles/board.css?inline';
import profileCss from '../../../styles/profile.css?inline';
import feedbackCss from '../../../styles/feedback.css?inline';
import { leaderboard, turnstileSiteKey } from '../../../services/leaderboard.js';
import { ALIAS_KEY, ownerKey, savedName, refreshIdentity } from '../../../services/leaderboard-identity.js';
import { setupVerify, loadTurnstile } from '../../../services/captcha.js';
import { setupProfile } from '../../../ui/profile-ui.js';
import { setupBadges } from '../../../ui/badge-picker.js';
import { setupFeedback } from '../../../ui/feedback-ui.js';
import { setupConfirmGate } from '../../../ui/confirm-gate.js';
import { setupLang } from '../../../ui/lang-ui.js';
import { DEVICE_NOTES, deviceRisk, browserEnv } from '../../../ui/profile-notes.js';
import { tr } from '../../../i18n/messages.js';
import { APP_BUILD } from '../../../core/version.js';
import { store } from '#plassa/storage.js';
import { focusIn } from '#plassa/focus.js';
import { mountMainSheets } from '../../main-sheets.js';
import { setupGameInstall } from '../../install.js';
import { setupDeviceHint } from '../../../ui/device-hint.js';
import '../../../ui/keyboard-room.js'; // a field's sheet rises above the on-screen keyboard (plassa sheets.css reads the <html data-kb> it sets)

const $ = id => document.getElementById(id);
// a dev server with no Supabase: mulassa.cat's in-memory account (src/dev/mock-leaderboard.js, ?account=new|guest|verified…),
// its keys in memory too, so nothing real is touched
const mock = import.meta.env.DEV && !leaderboard.configured, mockAccount = new URLSearchParams(location.search).get('account') ?? 'new';
const service = mock ? (await import('../../../dev/mock-leaderboard.js')).mockLeaderboard({ account: mockAccount }) : leaderboard;
const kv = mock ? (m => ({ get: k => m.get(k) ?? null, set: (k, v) => m.set(k, String(v)), remove: k => m.delete(k) }))(new Map()) : store;
if (mock && mockAccount !== 'new') kv.set(ALIAS_KEY, 'Prova123'); // the mock's own player (DEMO_SELF)

// mulassa.cat's sheets, with its CSS for them kept inside them: it also names #music, #settings and #board-menu, which here are Pop's
mountMainSheets([boardCss, profileCss, feedbackCss]);
for (const id of ['settings-sync', 'settings-install', 'settings-prompt-row']) $(id).hidden = true;
for (const s of $('account-menu').querySelectorAll('section.account-section')) s.hidden = true;
$('settings-profile').querySelector('.sub').textContent = tr('ui.settings.profileSubGames'); // a game's Perfil: no statistics or podiums
$('settings-version').textContent = `v${APP_BUILD.replace('+', ' · ')}`;

// Turnstile only where a profile or a message can be written (src/ui/board-ui.js): the privacy contact says publishing is on
const contact = $('privacy-content').content.querySelector('#privacy-contact'), email = contact?.dataset.email?.trim() || '';
if (email) { const a = contact.querySelector('#privacy-contact-link'); a.href = `mailto:${email}`; a.textContent = email; contact.hidden = false; }
const verify = service.configured && service.publishingEnabled && email && service.captchaRequired && turnstileSiteKey
  ? setupVerify({ siteKey: turnstileSiteKey, load: loadTurnstile }) : null;
const captcha = verify && { token: () => verify.token(), cancel: () => verify.cancel() };

const deviceNote = persistent => DEVICE_NOTES[deviceRisk({ ...browserEnv(), persistent })] || '';
const needConfirmed = setupConfirmGate({ focusIn, identity: () => service.identity(), hasProfile: async () => !!kv.get(ALIAS_KEY) || !!(await service.profile?.())?.alias,
  openProfile: (what, back, opts) => profile.open(what, back, opts) });
const profile = setupProfile({ focusIn, captcha, store: kv, aliasKey: ALIAS_KEY, deviceNote, service, offerLink: (back, title) => needConfirmed.offer(back, title) });
const badges = setupBadges({ focusIn, service, store: kv, onSaved: id => { profile.badgeSaved(id); refreshIdentity(service, kv, { fresh: true }); } });
const feedback = setupFeedback({ focusIn, captcha, service, accessToken: () => service.accessToken() });
setupLang({ store, state: () => 'select' }); // its row goes after the sheet's buttons; the home is the only place ⚙ opens

// Perfil: the block (src/ui/account-ui.js's, without the statistics); a step it opens comes back here when it closes
const account = $('account-menu');
let accountBack = null;
function openAccount(back = null) {
  if (account.open) return;
  accountBack = back; account.showModal(); focusIn(account, 'account-close');
  profile.refresh();
}
const leaveAccount = () => { const b = accountBack; accountBack = null; account.close(); return b; };
$('profile-row').addEventListener('click', e => {
  const act = e.target.closest?.('button')?.dataset.act;
  if (!act) return;
  if (act === 'forget') { profile.forget(); return; }
  const b = leaveAccount();
  if (act === 'badge') badges.open(() => openAccount(b)); else profile.open(act, () => openAccount(b));
});
$('account-close').addEventListener('click', () => account.close());
account.addEventListener('close', () => { const b = accountBack; accountBack = null; b?.(); });

// Privadesa: any [data-privacy-open] (src/ui/sheets-setup.js), stacked over the sheet that asked
const privacy = $('privacy-menu'), privacyBody = privacy.querySelector('.sheet-body'), privacyContent = $('privacy-content');
privacy.addEventListener('close', () => privacyContent.content.append(...privacyBody.childNodes));
document.addEventListener('click', e => {
  if (!e.target.closest?.('[data-privacy-open]') || privacy.open) return;
  privacyBody.append(privacyContent.content); privacy.showModal(); privacyBody.scrollTop = 0; focusIn(privacy, 'privacy-ok');
});
$('privacy-ok').addEventListener('click', () => privacy.close());

// Configuració
const menu = $('settings-menu');
let onDone = null; // the home's focus once every sheet opened from here has closed
export function openSettings(done = onDone) {
  onDone = done;
  if (menu.open) return;
  $('settings-profile').hidden = !service.configured; // Perfil only with a board (mulassa.cat's decision 6)
  menu.showModal(); focusIn(menu, 'settings-profile');
}
// The boot screen pays Configuració's first paint: Chrome compiles a GPU program for every kind of paint the page has not
// drawn yet, and Pop's home is mostly WebGL (S10: a 352 ms frame on the first ⚙ otherwise; docs/agents/graphics.md). Drawn
// once as it will look, not modal (no top layer, so under #boot), then shut.
export async function warm() {
  $('settings-profile').hidden = !service.configured;
  // Configuració, and the publish sheet whose seal and perks the Bústia's confirm notice copies (confirm-gate.js; its first
  // showing cost 100–117 ms on the S10 otherwise)
  const warmed = [menu, $('publish-menu')];
  // and the install steps where this browser can show them (S10: a 67 ms frame on their first opening otherwise)
  const steps = $('install-steps-menu');
  if (steps.querySelector('[data-for]:not([hidden])')) {
    warmed.push(steps);
    steps.addEventListener('close', e => e.stopImmediatePropagation(), { capture: true, once: true }); // its close gives focus back to the button: not under #boot
  }
  for (const d of warmed) { d.style.cssText = 'position: fixed; inset: 0; margin: auto; z-index: 3'; d.show(); } // the dim comes too (below)
  await new Promise(go => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(go, 300))));
  for (const d of warmed) { d.close(); d.style.cssText = ''; }
}
const fromSettings = open => () => { menu.close(); open(() => openSettings()); };
$('settings-profile').addEventListener('click', fromSettings(openAccount));
$('settings-feedback').addEventListener('click', fromSettings(back => needConfirmed('feedback', () => feedback.show(back))));
// close does not bubble; a task later, once a sheet's own close has opened the one it goes back to
document.addEventListener('close', () => setTimeout(() => { if (!document.querySelector('dialog[open]')) { const d = onDone; onDone = null; d?.(); } }), true);

// A name for the board, asked at a run's end: the profile's own steps (create, or another name for a released one), right here
export function openProfile(kind, back) {
  onDone = back;
  if (!profile.open(kind)) back?.(); // offline: nothing opened
}

// «Instal·la l'app»: the round button by ♪ (index.html #menu-install)
setupGameInstall('menu-install');
// inside an app's own browser (Instagram, TikTok…): mulassa.cat's tip, once per account state (told here or there), when the
// home is whole after «Toca per jugar» (main.js); a guest's «confirm» opens the profile's link step, as the main game's
const hint = setupDeviceHint({ focusIn, store: kv, account: () => (ownerKey(kv) ? (savedName(kv).verified ? 'linked' : 'guest') : 'none'),
  confirm: back => openProfile('link', back) });
export const deviceHint = () => hint.show(() => $('play').focus({ focusVisible: false }));
