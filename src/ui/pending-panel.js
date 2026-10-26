// The pending figure's panel in the selector: its words, and the box it keeps while
// it fades out. The selector decides which one shows (select-ui.js panel()).
import { aviatText, inviteText, locationOf } from '../game/figures.js';
import { entityHtml } from './figure-entities.js';
import { escapeHtml } from './select-strip.js';

const FROZEN = ['top', 'maxHeight', 'minHeight', 'height', 'transform'];

export function setupPendingPanel({ $, win, pending }) {
  function fill(f) {
    $('aviat-title').textContent = f.fullName || f.name;
    $('aviat-entity').innerHTML = entityHtml(f);
    $('aviat-where').textContent = locationOf(f); $('aviat-where').hidden = !$('aviat-where').textContent;
    $('aviat-text').innerHTML = (f.invite ? inviteText() : aviatText(f)).split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
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
  return { fill, freeze, thaw };
}
