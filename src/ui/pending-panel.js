// The pending figure's panel (and the fold's «Aviat a la plaça» card) in the selector: its words, and the box it keeps while
// it fades out. The selector decides which one shows (select-ui.js panel()).
import { aviatText, inviteText, locationOf } from '../game/figures.js';
import { tr } from '../i18n/messages.js';
import { entityHtml } from './figure-entities.js';
import { GIFTS } from './pending-gifts.js';
import { escapeHtml } from './select-strip.js';
import { DEV_HOST } from '../core/flags.js';

const FROZEN = ['top', 'maxHeight', 'minHeight', 'height', 'transform'];

export function setupPendingPanel({ $, win, pending }) {
  function fill(f) {
    $('aviat-title').textContent = f.fullName || f.name;
    $('aviat-entity').hidden = false;
    $('aviat-entity').innerHTML = entityHtml(f);
    $('aviat-where').textContent = locationOf(f); $('aviat-where').hidden = !$('aviat-where').textContent;
    $('aviat-icon').innerHTML = ''; $('aviat-icon').hidden = true; // the strip below already shows its portrait
    $('aviat-text').innerHTML = (f.invite ? inviteText() : aviatText(f)).split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');
    // i18n-ok: local development dance review; never shown on the public selector.
    if (f.id === 'bou-tradicional-valls' && DEV_HOST.test(win.location?.hostname ?? '')) {
      const link = pending.ownerDocument.createElement('a');
      link.className = 'btn btn-link'; link.href = '/tools/dev/bou-dance.html' + (win.location.search.includes('mute') ? '?mute' : '');
      link.textContent = 'Veure el ball amb la música'; // i18n-ok: local development review only
      $('aviat-text').append(link);
    }
  }
  function teaser() {
    pending.toggleAttribute('data-fold', true); // same GitHub/mail row as a pending figure: the fan yields the room (select-pending.css)
    $('aviat-title').textContent = tr('ui.select.teaserTitle');
    $('aviat-icon').innerHTML = GIFTS; $('aviat-icon').hidden = false;
    $('aviat-entity').hidden = true;
    $('aviat-entity').innerHTML = '';
    $('aviat-where').hidden = true;
    $('aviat-text').innerHTML = `<p>${tr('ui.select.teaserText')}</p>`;
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
  return { fill, teaser, freeze, thaw };
}
