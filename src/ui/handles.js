// DOM handles and the loader singleton the other modules look up here.
import { setupLoader } from './loader.js';
import { applyI18n } from '../i18n/apply-dom.js';

applyI18n(document); // the static markup in the active language, before any module reads or rewrites it

export const pauseMenu = document.getElementById('pause-menu');
export const howtoMenu = document.getElementById('howto-menu'); // "Com es juga?": the notes and their buttons, off the title screen
// ⚙ Configuració (title only): the two things you may want to redo, the sync and the practice
export const settingsMenu = document.getElementById('settings-menu');
// Privadesa: opened by any [data-privacy-open] button, stacked over the sheet that asked (closing it goes back there)
export const privacyMenu = document.getElementById('privacy-menu');
export const ctl = id => document.getElementById(id), hide = (el, v) => { if (el.hidden !== v) el.hidden = v; }; // every frame: only real changes touch the DOM
export const howtoEl = ctl('howto'), settingsEl = ctl('settings'), pauseEl = ctl('pause'), skipEl = ctl('skip'), retryEl = ctl('results-retry');
export const feedbackEl = ctl('feedback'), musicEl = ctl('music'), profileEl = ctl('profile');
// First paint: index.html's #loader covers the page until the first frame. Shaders are compiled up front (in parallel
// where KHR_parallel_shader_compile exists, so the cover keeps painting) instead of inside that frame; compile()
// takes every material, hidden ones too (confetti, fireworks), so none stalls a later frame.
export const loader = setupLoader(document); // after readiness, finish at least three complete loading lines
