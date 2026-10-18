// The «Mostra els FPS» readout.
import { store } from '../platform/storage.js';
import { hide } from '../ui/handles.js';
import { sheets } from '../ui/sheets.js';
import { G } from '../game/state.js';
import { pace } from '../core/timing.js';
import { COARSE } from '../core/env.js';
import { K, W, HH, SAFE } from '../hud/canvas.js';
import { playBottom } from '../hud/layout.js';

// «Mostra els FPS» (⚙ Configuració, remembered): just the number, small, in the bottom-left corner (above the pad and
// the practice instruction in play); the selector uses measured free space. Drawn frames averaged over ~0.5 s, the DOM touched 4 times a second at most,
// coloured against the pacer's target. ~30 Hz is iOS Low Power Mode (Safari caps rAF there): a short hint says so.
// ?perf stays the detailed debug line.
const fpsEl = document.getElementById('fps'), fpsSwitch = document.getElementById('settings-fps');
const FPS = { on: store.get('fps') === 'on', t: 0, n: 0, pt: 0, pn: 0, text: '', lvl: '', bottom: -1, left: -1, raised: false, layerDirty: true, modal: false, width: 90, height: 50 };
if (globalThis.ResizeObserver) new ResizeObserver(entries => {
  const box = entries[0].borderBoxSize?.[0];
  if (box?.inlineSize > 0) { FPS.width = box.inlineSize; FPS.height = box.blockSize; }
}).observe(fpsEl);
// A manual popover keeps this passive readout above modal backdrops too. Re-raise it
// when a dialog opens; z-index alone cannot cross the browser's top layer.
fpsEl.setAttribute('popover', 'manual');
addEventListener('toggle', e => {
  if (e.target.tagName !== 'DIALOG') return;
  FPS.layerDirty = true;
  FPS.modal = document.querySelectorAll('dialog[open]').length > 0;
}, true);
fpsSwitch.checked = FPS.on;
fpsSwitch.addEventListener('change', () => { FPS.on = fpsSwitch.checked; store.set('fps', FPS.on ? 'on' : 'off'); });
export function fpsTick(now) {
  hide(fpsEl, !FPS.on || (G.state !== 'title' && G.state !== 'select' && G.state !== 'play'));
  if (fpsEl.hidden) {
    if (FPS.raised) fpsEl.hidePopover?.();
    FPS.raised = false; FPS.t = 0; return;
  }
  if (fpsEl.showPopover && (!FPS.raised || FPS.layerDirty)) {
    if (FPS.raised) fpsEl.hidePopover();
    fpsEl.showPopover(); FPS.raised = true; FPS.layerDirty = false;
  }
  if (!FPS.t) { FPS.t = now; FPS.n = FPS.pn = FPS.pt = 0; return; }
  FPS.n++;
  const span = now - FPS.t;
  if (span < 250) return;
  const fps = (FPS.n + FPS.pn) * 1000 / (span + FPS.pt), low = pace.lowPower && fps < 36;
  FPS.pn = FPS.n; FPS.pt = span; FPS.n = 0; FPS.t = now;
  const text = low ? `${Math.round(fps)} FPS\nmode d’estalvi?` : `${Math.round(fps)} FPS`; // the hint on its own short line (pre-line)
  const goal = Math.max(60, pace.fps); // a slow device's rAF reads as its own rate: the goal is never under 60
  const lvl = low || fps < goal * 0.92 ? (fps < goal * 0.75 && !low ? 'low' : 'mid') : 'ok'; // 55+ of 60, 110+ of 120
  if (text !== FPS.text) fpsEl.textContent = FPS.text = text;
  if (lvl !== FPS.lvl) fpsEl.dataset.l = FPS.lvl = lvl;
  const onPad = G.state === 'play' && COARSE.matches, lift = G.state === 'play' && G.practice ? 26 * K : 0;
  let bottom = Math.round((onPad ? (HH - playBottom()) * K + 6 : 8 + SAFE.b) + lift);
  const menu = G.state === 'select' && !FPS.modal && sheets.select;
  let left = 8 + SAFE.l;
  if (menu?.band && menu.fpsFooter) {
    // Reserve the hint's full footprint so changing digits / Low Power Mode cannot move the badge between slots.
    const width = Math.max(110, FPS.width), height = Math.max(W * K < 520 ? 50 : 34, FPS.height), screen = HH * K;
    const clear = (x, y) => y >= 8 + SAFE.t && y + height <= screen - 8 - SAFE.b
      && x >= 8 + SAFE.l && x + width <= W * K - 8 - SAFE.r
      && !menu.fpsFooter.some(r => x + width + 6 > r.left && x - 6 < r.right && y + height + 6 > r.top && y - 6 < r.bottom);
    let top = screen - bottom - height;
    // Small screens may have a genuinely free upper corner. Otherwise keep the original corner if it is clear.
    if (W * K < 520 && clear(left, 8 + SAFE.t)) top = 8 + SAFE.t;
    else if (!clear(left, top)) {
      let found = false;
      // Prefer the left edge above the dock; use the right edge when the pending card fills the left.
      for (let side = 0; side < 2 && !found; side++) {
        const x = side ? W * K - 8 - SAFE.r - width : 8 + SAFE.l;
        for (let i = -2; i < menu.fpsFooter.length; i++) {
          const y = i === -2 ? screen - bottom - height : i === -1 ? menu.band.bottom - 6 - height
            : menu.fpsFooter[i].top - 6 - height;
          if (clear(x, y)) { left = x; top = y; found = true; break; }
        }
      }
    }
    bottom = Math.round(screen - top - height);
  }
  if (left !== FPS.left) fpsEl.style.left = `${FPS.left = left}px`;
  if (bottom !== FPS.bottom) fpsEl.style.bottom = `${FPS.bottom = bottom}px`;
}
