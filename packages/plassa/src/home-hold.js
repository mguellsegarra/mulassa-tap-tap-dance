// In the app (the native launcher behind), a game's way out is a home button held down for a moment, as a console's: a stray
// tap on the home never drops the player out of the game. A short tap says how; a key press (Enter, Space) or an assistive
// activation leaves at once. The website keeps its own link: the caller only calls this with IN_LAUNCHER, so nothing here runs there.
import { haptic } from './haptics.js';

export const HOLD_MS = 800;
const HOUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2M6 9.8V20h4.5v-5.5h3V20H18V9.8" fill="none" '
  + 'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const RING = '<svg class="hold-ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" pathLength="100"/></svg>';
// the ring sits inside the button (a button may clip, #free does); the tip lives in <body>, fixed, so no button clips it
const CSS = `.hold-home{-webkit-tap-highlight-color:transparent;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
.hold-home .hold-ring{position:absolute;inset:0;width:100%!important;height:100%!important;rotate:-90deg;pointer-events:none}
.hold-home .hold-ring circle{fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:100;opacity:0}
.hold-home.holding .hold-ring circle{opacity:1;stroke-dashoffset:0;transition:stroke-dashoffset ${HOLD_MS}ms linear}
.hold-tip{position:fixed;z-index:20;padding:8px 14px;border-radius:14px;background:#fff3d6;color:#2a1a10;
font:700 15px/1.2 'Baloo 2',system-ui,sans-serif;white-space:nowrap;filter:drop-shadow(0 3px 4px #0008);opacity:0;transition:opacity .2s;pointer-events:none}
.hold-tip.on{opacity:1}`;
const GAP = 12, EDGE = 8, SLOP = 12, POINTER_CLICK_MS = 800;
let styled = false;

// el: the game's exit (a link or a button), its icon swapped for a house; hint: the short tap's words; leave: back to the launcher
export function holdToHome(el, { hint, leave }) {
  if (!styled) { document.head.append(Object.assign(document.createElement('style'), { textContent: CSS })); styled = true; }
  el.classList.add('hold-home');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; // the ring's box; a placed button keeps its own
  // its name stays (Pop's is its bubble's words, removed below); the hold is said as a description, as keys leave at once
  el.setAttribute('aria-label', el.getAttribute('aria-label') || el.textContent.trim());
  el.setAttribute('aria-description', hint);
  el.setAttribute('role', 'button'); // Pop's is a link: Space activates it too (keydown below)
  // the games grid becomes a house where it was (its own sizing rules), and its bubbles go: in the app there is one home, the launcher
  for (const n of el.querySelectorAll('.exit-tip, .exit-dot')) n.remove();
  el.classList.remove('more');
  el.querySelector('svg')?.insertAdjacentHTML('beforebegin', HOUSE);
  el.querySelector('svg + svg')?.remove();
  el.insertAdjacentHTML('beforeend', RING);
  const tip = Object.assign(document.createElement('span'), { className: 'hold-tip', textContent: hint });
  tip.setAttribute('aria-hidden', 'true');
  document.body.append(tip);

  let timer = 0, tipTimer = 0, pointer = null, pointerAt = -1e9, leaving = false;
  const stop = () => { clearTimeout(timer); timer = 0; pointer = null; el.classList.remove('holding'); };
  // only a home still on screen with nothing over it leaves: a run started or a sheet opened by another finger cancels the hold
  // (a cover or a sheet over it, or the menu gone: the page's top element at its middle is no longer the button)
  const actionable = () => {
    const r = el.getBoundingClientRect(), top = r.width && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && el.contains(top) && !document.querySelector('dialog[open]');
  };
  const go = () => { stop(); tip.classList.remove('on'); if (!leaving && actionable()) { leaving = true; setTimeout(() => { leaving = false; }, 2000); haptic('hit'); leave(); } }; // once per exit
  const place = (x, y) => Object.assign(tip.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` });
  const showTip = () => {
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, end = r.left > innerWidth / 2;
    place(end ? r.left - GAP - w : r.right + GAP, r.top + (r.height - h) / 2); // beside it, towards the screen's middle
    // over the corner's other buttons or a title (a narrow phone, a long language) or off the screen: below the button then
    // (by their boxes: a title often takes no pointer, so a hit test misses it)
    const t = tip.getBoundingClientRect(), meets = q => q.width > 0 && q.left < t.right && q.right > t.left && q.top < t.bottom && q.bottom > t.top;
    const under = [...document.querySelectorAll('button, a, svg, img')].some(n => !el.contains(n) && meets(n.getBoundingClientRect()));
    if (under || t.left < EDGE || t.right > innerWidth - EDGE) place(Math.max(EDGE, Math.min(r.left + (r.width - w) / 2, innerWidth - EDGE - w)), r.bottom + GAP);
    tip.classList.add('on'); clearTimeout(tipTimer); tipTimer = setTimeout(() => tip.classList.remove('on'), 2200);
  };
  el.addEventListener('pointerdown', e => {
    pointerAt = e.timeStamp;
    if (e.button || pointer !== null) return; // one finger holds; a second one changes nothing
    pointer = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
    el.classList.add('holding'); tip.classList.remove('on');
    timer = setTimeout(go, HOLD_MS);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    // the release's time too: its click comes after it, a long hold's well past the press
    el.addEventListener(type, e => { pointerAt = e.timeStamp; if (e.pointerId !== pointer) return; const held = type === 'pointerup' && timer; stop(); if (held) showTip(); });
  }
  // a finger sliding off the button (beyond a small slop) lets it go, as a native button's press does
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    const r = el.getBoundingClientRect();
    if (e.clientX < r.left - SLOP || e.clientX > r.right + SLOP || e.clientY < r.top - SLOP || e.clientY > r.bottom + SLOP) stop();
  });
  addEventListener('visibilitychange', stop); addEventListener('blur', stop);
  // the tip leaves with any other press or key (a cover opening over the home must not keep it on top)
  const hideTip = e => { if (!el.contains(e.target)) tip.classList.remove('on'); };
  addEventListener('pointerdown', hideTip, true); addEventListener('keydown', hideTip, true);
  el.addEventListener('contextmenu', e => e.preventDefault()); // a long press opens no link menu
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); go(); } });
  // a click from a finger or a mouse is the hold's (above); a script's (the double-tap guard's, double-tap.js) is not the
  // player's. An assistive activation (VoiceOver, TalkBack, switch control) leaves at once: a trusted click with no pointer
  // type, or, where clicks carry none (older WebKit), one with no finger or mouse just before it
  el.addEventListener('click', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const noPointer = e.pointerType === '' || (e.pointerType === undefined && e.timeStamp - pointerAt > POINTER_CLICK_MS);
    if (e.isTrusted && noPointer) go();
  }, { capture: true });
}
