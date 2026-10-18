// DOM handles and the hint and loader singletons the other modules look up here.
import { store } from '../platform/storage.js';
import { setupLoader } from './loader.js';
import { softwareGl } from '../scene/stage.js';

export const pauseMenu = document.getElementById('pause-menu');
export const howtoMenu = document.getElementById('howto-menu'); // "Com es juga?": the notes and their buttons, off the title screen
// ⚙ Configuració (title only): the two things you may want to redo, the sync and the practice
export const settingsMenu = document.getElementById('settings-menu');
// Privadesa: opened by any [data-privacy-open] button, stacked over the sheet that asked (closing it goes back there)
export const privacyMenu = document.getElementById('privacy-menu');
// iPhone Safari (not the home-screen app): a small, dismissible tip on the title screen only. The same tip (its place
// in the title layout, its ×) says so once when WebGL runs in software: this session's title screens, then never again.
export const iosHint = document.getElementById('ios-hint'), gpuHint = softwareGl && store.get('gpu-hint') !== 'off', HINT_KEY = gpuHint ? 'gpu-hint' : 'ios-hint';
export let hintOff = gpuHint ? false : !/iPhone|iPod/.test(navigator.userAgent ?? '') || navigator.standalone !== false || store.get('ios-hint') === 'off';
if (gpuHint) {
  store.set('gpu-hint', 'off');
  iosHint.querySelector('svg').innerHTML = '<path d="M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>'; // a chip
  iosHint.querySelector('span').innerHTML = 'El navegador no fa servir la targeta gràfica: el joc anirà més fluid si actives l’<b>acceleració per maquinari</b>.';
}
document.getElementById('ios-hint-close').addEventListener('click', () => { hintOff = true; store.set(HINT_KEY, 'off'); });
export const ctl = id => document.getElementById(id), hide = (el, v) => { if (el.hidden !== v) el.hidden = v; }; // every frame: only real changes touch the DOM
export const howtoEl = ctl('howto'), settingsEl = ctl('settings'), leadersEl = ctl('leaders'), pauseEl = ctl('pause'), skipEl = ctl('skip'), retryEl = ctl('results-retry');
export const feedbackEl = ctl('feedback'), musicEl = ctl('music');
// First paint: index.html's #loader covers the page until the first frame. Shaders are compiled up front (in parallel
// where KHR_parallel_shader_compile exists, so the cover keeps painting) instead of inside that frame; compile()
// takes every material, hidden ones too (confetti, fireworks), so none stalls a later frame.
export const loader = setupLoader(document); // after readiness, finish at least three complete loading lines
