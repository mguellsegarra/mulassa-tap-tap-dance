// Hearts and the Bústia need a confirmed e-mail. Without one this sheet says why, then the Perfil sheets do the work: without a
// profile, create one and attach the address in one go; with one, attach it. Whatever was asked for runs once, after a real confirmation.
import { byId } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';

export function setupConfirmGate({ focusIn, identity, hasProfile, openProfile, doc = document }) {
  const $ = byId(doc);
  const menu = $('gate-menu'), text = $('gate-text'), go = $('gate-go');
  let pending = null, profiled = false, after = null, going = false; // after: where a guest's offer returns (Perfil); going: on to the profile's steps
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
    const run = pending, b = after;
    pending = after = null;
    if ((await confirmed()).email) run?.();
    b?.();
  }
  const skip = () => { pending = null; const b = after; after = null; b?.(); };
  go.addEventListener('click', () => {
    going = true; menu.close();
    // the profile's sheet goes on to the address; offline it stays shut: back to where the gate came from
    if (openProfile(profiled ? 'link' : 'create', resume, { thenLink: !profiled }) === false) resume();
  });
  $('gate-later').addEventListener('click', () => menu.close());
  // any other way out («Ara no», Escape, a close watcher) is a skip, once the sheet is shut (focus lands where back puts it)
  menu.addEventListener('close', () => { if (going) going = false; else skip(); });
  const sell = (title, textKey) => {
    $('gate-title').textContent = title; text.textContent = tr(textKey);
    go.hidden = $('gate-panel').hidden = $('gate-seal').hidden = false;
    go.textContent = tr(profiled ? 'ui.confirm.action' : 'ui.confirm.createAction');
    $('gate-perks-lead').textContent = tr('ui.confirm.perksLead');
    sellMark();
  };
  // a profile just created (Perfil «Crea»): what confirming earns, nothing waiting on it (a tapped «Confirma el correu» goes straight to its steps)
  function offer(back, titleKey) {
    if (menu.open) { back?.(); return; }
    pending = null; after = back; profiled = true;
    sell(tr(titleKey), 'ui.profile.guestText');
    menu.showModal(); focusIn(menu, 'gate-go');
  }
  async function needConfirmed(reason, action) {
    // A failed read is not «no account»: offering Crea to a real profile would rename it. It only says to try again.
    let unknown = false;
    const me = await identity().catch(() => { unknown = true; return {}; });
    if (me.email) { action(); return; }
    if (menu.open) return;
    if (!unknown) profiled = !!me.hasSession && !!(await Promise.resolve().then(hasProfile).catch(() => { unknown = true; })); // no session reads as no profile without asking; a remembered one needs no network either
    if (menu.open) return;
    pending = unknown ? null : action; after = null;
    if (unknown) {
      $('gate-title').textContent = tr('ui.confirm.title'); text.textContent = tr('ui.board.checkConnection');
      go.hidden = $('gate-panel').hidden = $('gate-seal').hidden = true;
    } else sell(tr(profiled ? 'ui.confirm.title' : 'ui.confirm.createAction'), `ui.confirm.${reason}`);
    menu.showModal(); focusIn(menu, unknown ? 'gate-later' : 'gate-go');
  }
  needConfirmed.offer = offer;
  return needConfirmed;
}
