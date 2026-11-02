// «Tria insígnia» (#badge-menu), over Perfil: a confirmed player's badge instead of the check (src/ui/player-badges.js). The
// choice stays a draft until the server has saved it; a failure leaves the sheet open with the draft and says so.
import { leaderboard as defaultService } from '../services/leaderboard.js';
import { savedName } from '../services/leaderboard-identity.js';
import { byId, statusLine, setButton } from './sheet-kit.js';
import { CHECK_SVG, appendName } from './profile-notes.js';
import { ASSOCIATION_BADGES, VALLS_BADGES, FLAG_BADGES, TOWN_BADGES } from './player-badges.js';
import { tr } from '../i18n/messages.js';

export function setupBadges({ focusIn, store, service = defaultService, onSaved = () => {}, doc = document }) {
  const $ = byId(doc), menu = $('badge-menu'), choices = $('badge-choices'), preview = $('badge-preview'), save = $('badge-save');
  const setStatus = statusLine($('badge-status'));
  let me = null, draft = null, busy = false, req = 0, back = null;

  function paint() {
    preview.replaceChildren();
    appendName(doc, preview, { alias: me.alias, verified: true, badgeId: draft });
    for (const c of choices.querySelectorAll('[role="radio"]')) c.setAttribute('aria-checked', String((c.dataset.badge || null) === draft));
  }
  function cell(id, name, art, wide = false) {
    const b = doc.createElement('button');
    b.type = 'button'; b.className = `badge-cell${wide ? ' wide' : ''}`; b.setAttribute('role', 'radio'); b.dataset.badge = id ?? '';
    b.innerHTML = art; // ours, from the catalogue
    const label = doc.createElement('span'); label.textContent = name;
    b.appendChild(label);
    return b;
  }
  function group(title, badges) {
    const h = doc.createElement('h3'), grid = doc.createElement('div');
    h.className = 'badge-group'; h.textContent = title; grid.className = `badge-grid${badges.length % 3 && badges.length % 2 === 0 ? ' pair' : ''}`; // two by two when three by three would leave a hole
    grid.append(...badges.map(b => cell(b.id, b.name, b.art())));
    return [h, grid];
  }
  function build() { // once, on the first open: 42 drawings nobody else needs at the start
    if (choices.childElementCount) return;
    const check = doc.createElement('div');
    check.className = 'badge-grid'; check.append(cell(null, tr('ui.badge.default'), `<span class="verified-check">${CHECK_SVG}</span>`, true));
    choices.append(check, ...group(tr('ui.badge.associations'), ASSOCIATION_BADGES), ...group(tr('ui.badge.valls'), VALLS_BADGES),
      ...group(tr('ui.badge.flags'), FLAG_BADGES), ...group(tr('ui.badge.towns'), TOWN_BADGES));
  }
  choices.addEventListener('click', e => {
    const c = e.target.closest?.('[role="radio"]');
    if (!c || busy) return;
    draft = c.dataset.badge || null; setStatus(''); paint();
  });
  async function submit() {
    if (busy) return;
    const r = ++req;
    busy = true; setStatus(''); setButton(doc, save, tr('ui.profile.btn.working'), true);
    try {
      await service.setBadge(draft, me.publicId);
      if (r !== req) return;
      onSaved(draft);
      menu.close();
    } catch (e) {
      if (r !== req) return;
      setStatus(e?.message || tr('ui.profile.failed'));
    } finally {
      if (r === req) { busy = false; setButton(doc, save, tr('ui.badge.save')); }
    }
  }
  save.addEventListener('click', submit);
  $('badge-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { req++; busy = false; const b = back; back = null; b?.(); });
  return {
    open(onBack = null) {
      me = savedName(store);
      draft = me.badgeId; back = onBack; busy = false;
      $('badge-title').textContent = tr('ui.badge.title');
      build(); setStatus(''); setButton(doc, save, tr('ui.badge.save')); paint();
      menu.showModal();
      focusIn(menu, 'badge-save');
    },
    get isOpen() { return menu.open; },
  };
}
