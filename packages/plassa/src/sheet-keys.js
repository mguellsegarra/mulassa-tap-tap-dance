// The keyboard works in every sheet: ↑↓ (and ←→ outside text fields and a sheet's own row, data-arrows="row") move
// between its controls, and Enter/Space act on the focused one (native). If the focus fell outside the open sheet (a click
// on its padding), the first key brings it back to the sheet's first control ([data-keys-first] if it has one) instead
// of doing nothing. top() names the open layer (null: none); skip(layer) leaves every key to it.
import { uiSound } from './ui-sound.js';

const CONTROLS = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function setupSheetKeys({ top, skip = () => false }) {
  addEventListener('keydown', e => {
    const dlg = top();
    if (!dlg || e.altKey || e.ctrlKey || e.metaKey || skip(dlg)) return;
    const items = [...dlg.querySelectorAll(CONTROLS)].filter(el => !el.disabled && !el.closest('[hidden]') && el.offsetParent !== null);
    if (!items.length) return;
    const at = items.indexOf(document.activeElement), typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    const step = { ArrowDown: 1, ArrowUp: -1, ...(typing || dlg.dataset.arrows === 'row' ? {} : { ArrowRight: 1, ArrowLeft: -1 }) }[e.key];
    if (at < 0 && (step || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const first = items.find(el => el.hasAttribute('data-keys-first')) ?? items[0];
      first.focus();
      if (step && document.activeElement === first) uiSound();
      return;
    }
    if (!step || (typing && document.activeElement.tagName !== 'INPUT')) return; // a textarea/select keeps its own arrows
    e.preventDefault(); e.stopImmediatePropagation(); // not a game key while a sheet is up
    const target = items[(at + step + items.length) % items.length], previous = document.activeElement;
    target.focus();
    if (target !== previous && document.activeElement === target) uiSound();
  }, true);
}
