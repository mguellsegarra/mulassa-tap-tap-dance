// A game's board rows and a player's name, as mulassa.cat's boards show them (src/ui/profile-notes.js appendName, src/ui/board-list.js):
// the name quieter for a guest and fainter once released, the check or the chosen badge beside it. The name is the row's
// button (keys, focus) and the mark sits outside it, so a tap on a badge says its name (badge-tip.js) instead of opening
// the card; a tap anywhere else on the row opens it. The game brings the art and the words (`look`), the cells after the name
// (`cells`) and what a tap opens (`onOpen`), so every game's board, and later mulassa.cat's, is this one.
import { setupBadgeTip } from './badge-tip.js';

const el = (doc, tag, cls, text) => Object.assign(doc.createElement(tag), cls ? { className: cls } : {}, text == null ? {} : { textContent: text });
let tips = null; // one listener set per page, however many boards

// look: { badgeOf(id) → { art, name } | null, checkSvg }; with onOpen the name is a button, without it plain text (a card's title)
export function playerName(into, p, look, onOpen = null, doc = document) {
  tips ??= setupBadgeTip({ doc });
  const alias = el(doc, 'span', `alias${p.verified ? '' : ' guest'}${p.released ? ' released' : ''}`, p.alias);
  let name = alias;
  if (onOpen) {
    name = el(doc, 'button', 'player-name'); name.type = 'button'; name.append(alias);
    name.addEventListener('click', e => { e.stopPropagation(); onOpen(p); });
  }
  into.append(name);
  if (!p.verified) return name;
  const badge = look.badgeOf(p.badge_id), mark = el(doc, 'span', badge ? 'player-badge' : 'verified-check');
  mark.setAttribute('role', 'img');
  if (badge?.name) { mark.dataset.tip = badge.name; mark.setAttribute('aria-label', badge.name); }
  mark.innerHTML = badge?.art ?? look.checkSvg; // our own markup, never the player's
  into.append(mark);
  return name;
}

// A board's row: its place, the name with a small line under it (`sub`: Pop's level pill, levelPill), then the game's own
// cells (Pop: points and taps); the player's own row marked
export function boardRow(r, { look, onOpen, cells = [], sub = [] }, doc = document) {
  const row = el(doc, 'li', r.is_self ? 'me' : ''), who = el(doc, 'div', 'who'), col = el(doc, 'div', 'name'), line = el(doc, 'div', 'line');
  who.append(el(doc, 'i', '', r.position), col);
  col.append(line);
  const name = playerName(line, r, look, onOpen, doc);
  if (sub.length) { const under = el(doc, 'div', 'sub'); under.append(...sub); col.append(under); }
  who.append(...cells);
  who.addEventListener('click', () => { if (!doc.getSelection?.()?.toString()) name.click(); }); // a selected name is being copied
  row.append(who);
  return row;
}

// the level played, as mulassa.cat's boards show it: a pill in the level's colour (0 easy, 1 normal, 2 hard)
export const levelPill = (level, text, doc = document) => el(doc, 'span', `lvl lvl${level}`, text);
