import { hugBubble } from './free-gate.js';
import { IN_APP } from './profile-notes.js';
import { errors } from '../services/errors.js';
// «Instal·la l’app» in ⚙ Configuració. Chromium browsers (Chrome, Edge, Samsung Internet) hand over their install prompt
// (beforeinstallprompt) once the page qualifies, and the button opens it. Where no prompt exists the button shows that
// browser's own steps (#install-steps-menu, one list per device): Safari on an iPhone or iPad, Firefox on Android, and an
// app's own browser (Instagram, Facebook… or any Android WebView), which must first open the page in a real browser.
// Elsewhere (desktop Firefox and Safari, the installed app itself) the button stays hidden. The event is not cancelled: Chrome keeps its own install bar too.
export function stepsFor({ ua = '', touch = 0, standalone = false } = {}) {
  if (standalone) return null;
  if (IN_APP.test(ua) || /Android.*; wv\)/.test(ua)) return 'inapp'; // «; wv)»: an Android WebView, whatever app holds it
  if (/Android/.test(ua)) return /Firefox\//.test(ua) ? 'firefox' : null;
  // the steps are Safari's: Chrome, Firefox and Edge on iOS are WebKit too, but their menus differ
  if (!/Version\/[\d.]+.*Safari\//.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|Chrome/.test(ua)) return null;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1)) return 'ipad'; // iPadOS says «Macintosh»: its touch points tell
  return /iPhone|iPod/.test(ua) ? 'iphone' : null;
}
export function setupInstall({ focusIn, back, ua = navigator.userAgent ?? '', touch = navigator.maxTouchPoints ?? 0, standalone = navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches, doc = document, listen = addEventListener }) {
  const by = id => doc.getElementById(id), btn = by('settings-install'), sheet = by('install-steps-menu');
  const steps = stepsFor({ ua, touch, standalone });
  for (const el of sheet.querySelectorAll('[data-for]')) el.hidden = el.dataset.for !== steps;
  let prompt = globalThis.__installPrompt ?? null; // the browser's install prompt, good for one use (index.html's #install-early keeps an early one)
  const refresh = () => {
    btn.hidden = standalone || !(prompt || steps);
    if (prompt) btn.removeAttribute('aria-haspopup'); else btn.setAttribute('aria-haspopup', 'dialog'); // the steps are our dialog; the prompt is the browser's
  };
  listen('beforeinstallprompt', e => { prompt = e; refresh(); });
  listen('appinstalled', () => { prompt = null; refresh(); });
  btn.addEventListener('click', () => {
    if (prompt) { const p = prompt; prompt = null; refresh(); Promise.resolve(p.prompt()).catch(e => errors.report('install-prompt-failed', { reason: e?.name ?? 'unknown' })); return; } // a dismissal brings a fresh event later
    btn.closest('dialog')?.close(); sheet.showModal(); hugBubble(sheet, doc); focusIn(sheet, 'install-steps-ok');
  });
  for (const id of ['install-steps-ok', 'install-steps-close']) by(id).addEventListener('click', () => sheet.close());
  sheet.addEventListener('close', () => back());
  listen('resize', () => { if (sheet.open) hugBubble(sheet, doc); });
  refresh();
  return { get isOpen() { return sheet.open; } };
}
