// Hearts and the Bústia need a confirmed e-mail. Without one this sheet says why, then the Perfil sheets do the work: without a
// profile, create one first; with one, attach the address. Whatever was asked for runs once, after a real confirmation.
import { byId } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupConfirmGate({ focusIn, identity, hasProfile, openProfile, doc = document }) {
  const $ = byId(doc);
  const menu = $('gate-menu'), text = $('gate-text'), go = $('gate-go');
  let pending = null, profiled = false;
  const confirmed = async () => { try { return await identity(); } catch { return { email: '' }; } };
  const profileThere = async () => { try { return !!(await hasProfile()); } catch { return false; } };
  // Perfil closed: confirmed runs the action; a profile really created still needs its address; anything else was a cancel.
  async function resume(linked) {
    const run = pending;
    if ((await confirmed()).email) { pending = null; run?.(); return; }
    if (!linked && await profileThere()) openProfile('link', () => resume(true));
    else pending = null;
  }
  go.addEventListener('click', () => {
    menu.close();
    openProfile(profiled ? 'link' : 'create', () => resume(profiled));
  });
  $('gate-later').addEventListener('click', () => { pending = null; menu.close(); });
  menu.addEventListener('cancel', () => { pending = null; });
  return async function needConfirmed(reason, action) {
    if ((await confirmed()).email) { action(); return; }
    if (menu.open) return;
    profiled = await profileThere();
    if (menu.open) return;
    pending = action;
    $('gate-title').textContent = tr(profiled ? 'ui.confirm.title' : 'ui.confirm.createAction');
    text.textContent = tr(`ui.confirm.${reason}`);
    go.textContent = tr(profiled ? 'ui.confirm.action' : 'ui.confirm.createAction');
    menu.showModal(); focusIn(menu, 'gate-go');
  };
}
