// «Instal·la l'app» on a game page: a round button by the sound one, hidden where this page cannot install (desktop Firefox
// and Safari, the installed app itself). mulassa.cat's install-app.js runs it: Chromium's own prompt, else that browser's steps
// in mulassa.cat's #install-steps-menu (the page names it in its mulassa-sheets, mountMainSheets puts it in). What installs is
// the page's own manifest (pop.webmanifest, jocs.webmanifest): Mulassa Pop opens on Pop, Mulassa Games on the games.
import { setupInstall } from '../ui/install-app.js';
import { tr } from '../i18n/messages.js';
import { focusIn } from '#plassa/focus.js';

export function setupGameInstall(id) {
  const btn = document.getElementById(id);
  btn.setAttribute('aria-label', tr('html.installTitle'));
  return setupInstall({ focusIn, button: id, back: () => btn.focus({ focusVisible: false }) });
}
