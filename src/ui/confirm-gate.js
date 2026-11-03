// Hearts and the Bústia need a confirmed e-mail. Without one this sheet says why, then the Perfil sheets do the work: without a
// profile, create one and attach the address in one go; with one, attach it. Whatever was asked for runs once, after a real confirmation.
import { byId } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupConfirmGate({ focusIn, identity, hasProfile, openProfile, doc = document }) {
  const $ = byId(doc);
  const menu = $('gate-menu'), text = $('gate-text'), go = $('gate-go');
  let pending = null, profiled = false;
  // what confirming earns, as the publish sheet sells it: one copy of its seal and list, translated already
  const sellMark = () => {
    for (const [slot, from] of [['gate-seal', '.publish-seal'], ['gate-perks', '.publish-perks']]) {
      const box = $(slot), part = doc.querySelector?.(from);
      if (box && part && !box.firstChild) box.append(part.cloneNode(true));
    }
  };
  const confirmed = async () => { try { return await identity(); } catch { return { email: '' }; } };
  // Perfil closed: confirmed runs the action; anything else was a cancel.
  async function resume() {
    const run = pending;
    pending = null;
    if ((await confirmed()).email) run?.();
  }
  go.addEventListener('click', () => {
    menu.close();
    openProfile(profiled ? 'link' : 'create', resume, { thenLink: !profiled }); // the profile's sheet goes on to the address
  });
  $('gate-later').addEventListener('click', () => { pending = null; menu.close(); });
  menu.addEventListener('cancel', () => { pending = null; });
  return async function needConfirmed(reason, action) {
    // A failed read is not «no account»: offering Crea to a real profile would rename it. It only says to try again.
    let unknown = false;
    const me = await identity().catch(() => { unknown = true; return {}; });
    if (me.email) { action(); return; }
    if (menu.open) return;
    if (!unknown) profiled = !!me.hasSession && !!(await Promise.resolve().then(hasProfile).catch(() => { unknown = true; })); // no session reads as no profile without asking; a remembered one needs no network either
    if (menu.open) return;
    pending = unknown ? null : action;
    $('gate-title').textContent = tr(profiled || unknown ? 'ui.confirm.title' : 'ui.confirm.createAction');
    text.textContent = unknown ? tr('ui.board.checkConnection') : tr(`ui.confirm.${reason}`);
    go.hidden = unknown; $('gate-panel').hidden = unknown; $('gate-seal').hidden = unknown;
    if (!unknown) {
      go.textContent = tr(profiled ? 'ui.confirm.action' : 'ui.confirm.createAction');
      $('gate-perks-lead').textContent = tr('ui.confirm.perksLead');
      sellMark();
    }
    menu.showModal(); focusIn(menu, unknown ? 'gate-later' : 'gate-go');
  };
}
