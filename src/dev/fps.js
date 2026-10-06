// The «Mostra els FPS» readout.
import { store } from '../platform/storage.js';
import { hide } from '../ui/handles.js';
import { G } from '../game/state.js';
import { pace } from '../core/timing.js';
import { COARSE } from '../core/env.js';
import { K, HH, SAFE } from '../hud/canvas.js';
import { playBottom } from '../hud/layout.js';

// «Mostra els FPS» (⚙ Configuració, remembered): just the number, small, in the bottom-left corner (above the pad and
// the practice instruction in play). Drawn frames averaged over ~0.5 s, the DOM touched 4 times a second at most,
// coloured against the pacer's target. ~30 Hz is iOS Low Power Mode (Safari caps rAF there): a short hint says so.
// ?perf stays the detailed debug line.
const fpsEl = document.getElementById('fps'), fpsSwitch = document.getElementById('settings-fps');
const FPS = { on: store.get('fps') === 'on', t: 0, n: 0, pt: 0, pn: 0, text: '', lvl: '', bottom: -1 };
fpsSwitch.checked = FPS.on;
fpsSwitch.addEventListener('change', () => { FPS.on = fpsSwitch.checked; store.set('fps', FPS.on ? 'on' : 'off'); });
export function fpsTick(now) {
  hide(fpsEl, !FPS.on || (G.state !== 'title' && G.state !== 'play'));
  if (fpsEl.hidden) { FPS.t = 0; return; }
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
  const bottom = Math.round((onPad ? (HH - playBottom()) * K + 6 : 8 + SAFE.b) + lift);
  if (bottom !== FPS.bottom) fpsEl.style.bottom = `${FPS.bottom = bottom}px`;
}
