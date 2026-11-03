// ?reel=A|B|C: the selector's showreel and «Mira el ball» play that proposal from tools/dev/reel-review/proposals.js for the
// Mulassa and the Drac, with a corner label naming the shot now (a reference to point at: A-5…). Dev hosts only (core/flags.js Q).
import { PROPOSALS, applyProposal } from '../../tools/dev/reel-review/proposals.js';
import * as showreel from '../game/showreel.js';
import * as figures from '../game/figures.js';
import * as mulaObjects from '../figures/mulassa/mula-objects.js';

const { REEL, SHOWREELS } = showreel, { MULASSA, DRAC } = figures;
// this game's own module instances (an import() by URL can load a second copy after a hot update)
const MODS = { '/src/game/showreel.js': showreel, '/src/game/figures.js': figures, '/src/figures/mulassa/mula-objects.js': mulaObjects };

export async function setupReelProposal(key) {
  await Promise.all(['mulassa', 'drac'].map(fig => applyProposal(fig, key, async path => MODS[path])));
  const figOf = { [MULASSA.id]: 'mulassa', [DRAC.id]: 'drac' };
  const el = document.body.appendChild(document.createElement('div'));
  el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;padding:4px 8px;border-radius:6px;background:#000c;color:#ffd166;font:700 13px/1.3 monospace;pointer-events:none;white-space:pre';
  setInterval(() => {
    const prop = PROPOSALS[figOf[REEL.id]]?.[key], reel = SHOWREELS[REEL.id];
    if (!REEL.on || !prop) { el.textContent = `?reel=${key}`; return; }
    const i = reel.shots.findLastIndex(s => s[0] <= REEL.beat), s = prop.shots[i];
    if (!s) return;
    el.textContent = `${key} · ${prop.name}  ${key}-${i + 1} ${s[1]}  temps ${REEL.beat.toFixed(0)}\n${s[3]}`;
  }, 200);
}
