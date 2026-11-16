// One frame of controls and HUD; a failed draw resets the canvas before the next frame.
import { G } from '../game/state.js';
import { Q, CALM } from '../core/env.js';
import { PERF } from '../dev/perf.js';
import { errors } from '../services/errors.js';
import { padEl } from '../hud/layout.js';
import { H, W, HH, resize } from '../hud/canvas.js';
import { setBalloonView } from '../hud/balloon.js';
import { drawHud } from '../hud/draw.js';
import { updateControls, viewMode, viewT, hudBlank, setHudBlank } from './controls.js';

let hudError = '';
export function frameHud(now, vt) {
  updateControls();
  const padVis = G.state === 'play' && !G.paused && !G.collapseT && !G.watch ? 'visible' : 'hidden';
  if (padEl.style.visibility !== padVis) padEl.style.visibility = padVis;
  const hudOff = viewMode && now - viewT >= (CALM.matches ? 0 : 200); // «mode foto», faded out: cleared once, then no HUD work at all
  setBalloonView(null);
  if (!hudOff || !hudBlank) H.clearRect(0, 0, W, HH);
  setHudBlank(hudOff);
  if (!hudOff && !Q.has('view') && PERF?.mode !== 'nohud') try { drawHud(vt); } catch (err) {
    if (err.message !== hudError) { hudError = err.message; console.error(err); errors.capture(err, { where: 'hud' }); }
    resize();
  }
}
