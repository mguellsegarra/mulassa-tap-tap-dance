// The pending figure's panel in the selector: its words, and the box it keeps while
// it fades out. The selector decides which one shows (select-ui.js panel()).
import { heartCall, heartThanks, inviteText, locationOf, pendingStatus } from '../game/figures.js';
import { MATERIALS, progressOf } from '../game/figure-progress.js';
import { tr } from '../i18n/messages.js';
import { entityHtml } from './figure-entities.js';
import { escapeHtml } from './select-strip.js';

const FROZEN = ['top', 'maxHeight', 'minHeight', 'height', 'transform'];

const ITEM = { photos: 'photos', score: 'score', video: 'dance', choreography: 'choreography' };
export function setupPendingPanel({ $, win, pending, hearts }) {
  const doc = pending.ownerDocument;
  let shownHeart = '';
  function fill(f) {
    pending.scrollTop = 0; // a short phone's scrolled card starts the next figure at its title
    pending.toggleAttribute('data-invite', !!f.invite); // on the panel, not #select: it must outlast the panel's fade-out
    $('aviat-title').textContent = f.fullName || f.name;
    $('aviat-entity').innerHTML = entityHtml(f);
    $('aviat-where').textContent = locationOf(f); $('aviat-where').hidden = !$('aviat-where').textContent;
    $('aviat-text').innerHTML = f.invite ? `<p>${escapeHtml(inviteText())}</p>` : '';
    const { have, builder, agreement, status } = f.invite ? { have: [], builder: false, agreement: false, status: '' } : progressOf(f);
    $('aviat-lower').hidden = !!f.invite;
    $('aviat-entity').hidden = !!f.invite; // the button already says it
    $('aviat-propose').hidden = !f.invite;
    $('aviat-material').hidden = !!f.invite || status !== 'waiting';
    $('aviat-code').hidden = status !== 'open';
    pending.toggleAttribute('data-no-actions', status === 'preparing' || status === 'soon');
    if (f.invite) return;
    const word = m => tr(`figures.pending.${ITEM[m]}`), and = items => (items.length > 1 ? `${items.slice(0, -1).join(', ')}${tr('figures.pending.and')}${items.at(-1)}` : items[0]);
    const missing = [...MATERIALS.filter(m => !have.includes(m)).map(m => word(m).toLowerCase()), ...(builder ? [] : [tr('figures.pending.builderMissing')])];
    $('aviat-status').textContent = pendingStatus(f, status);
    const had = [...have.map(m => word(m).toLowerCase()), ...(builder ? [tr('figures.pending.builderHave')] : []), ...(agreement ? [tr('figures.pending.agreement').toLowerCase()] : [])], list = had.length ? and(had) : '';
    $('aviat-missing').hidden = status === 'waiting' ? !missing.length : !list;
    $('aviat-missing').innerHTML = status === 'waiting'
      ? (missing.length ? tr('figures.pending.missingLine', { list: `<b>${escapeHtml(and(missing))}</b>` }) : '')
      : `<b>${escapeHtml(tr('figures.pending.allIn'))}</b><span>${escapeHtml(list.charAt(0).toUpperCase() + list.slice(1))}</span>`;
    paintHeart(f);
  }
  function paintHeart(f) {
    if (f.invite) return;
    // The count leads in both states (the question only while nobody has given one): the button only says what a tap does
    const on = hearts.mine(f.id), call = heartCall(f), n = hearts.count(f.id) ?? (on ? 1 : 0), line = $('aviat-love-title');
    if (n) {
      const number = doc.createElement('span'), words = doc.createElement('small');
      number.className = 'sel-call-n'; number.textContent = n;
      if (on && shownHeart === `${f.id}:off`) number.classList.add('sel-heart-pop'); // only when this figure has just got the heart
      words.textContent = heartThanks(f, n).sub;
      line.replaceChildren(number, words);
    } else line.textContent = call.title;
    shownHeart = `${f.id}:${on ? 'on' : 'off'}`;
    line.toggleAttribute('data-count', !!n);
    $('aviat-love-sub').textContent = on ? heartThanks(f, n).title : call.sub;
    hearts.paint($('aviat-heart'), f);
  }
  // Leaving, the card keeps the box it had: the dock rising and the room it frees would otherwise resize and move it
  // mid-fade (a jump and a repaint as it went). Its next showing lets go first.
  function freeze() {
    const cs = win.getComputedStyle?.(pending);
    if (!cs) return;
    // getComputedStyle is live: capture every value before any write can change the layout.
    const values = FROZEN.map(k => k === 'minHeight' ? cs.height : cs[k]);
    FROZEN.forEach((k, i) => { pending.style[k] = values[i]; });
    pending.toggleAttribute('data-leaving', true);
  }
  function thaw() { for (const k of FROZEN) pending.style[k] = ''; pending.toggleAttribute('data-leaving', false); }
  return { fill, paintHeart, freeze, thaw };
}
