// «Instal·la l'app» on Mulassa Games: mulassa.cat's steps sheet (the page names it in its mulassa-sheets) and Plassa's
// round button by the speaker. A chunk of its own: it brings mulassa.cat's catalogue, which the menu's first paint never waits for.
import { mountMainSheets } from '../main-sheets.js';
import { setupGameInstall } from '../install.js';

mountMainSheets();
setupGameInstall('games-install');

// The page has drawn no sheet before: their first opening compiled its paints under the player's eyes (S10: a 151-167 ms
// frame). Drawn once where this browser can show the steps, under the opaque #games-menu (z-index -1), then shut.
const steps = document.getElementById('install-steps-menu'), page = document.getElementById('games-menu');
// once the page has faded in (style.css games-in): before that it lets the sheet show through
if (steps.querySelector('[data-for]:not([hidden])')) Promise.allSettled(page.getAnimations().map(a => a.finished)).then(() => {
  const dim = document.querySelector('.sheet-dim'); // shows with any open sheet (main-sheets.js): under the page too
  for (const el of [steps, dim]) el.style.cssText = 'position: fixed; inset: 0; margin: auto; z-index: -1';
  steps.addEventListener('close', e => e.stopImmediatePropagation(), { capture: true, once: true }); // its close gives focus back to the button
  steps.inert = true; // and show() would take the focus from «Juga»
  steps.show();
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { steps.close(); steps.inert = false; requestAnimationFrame(() => { for (const el of [steps, dim]) el.style.cssText = ''; }); }, 300)));
});
