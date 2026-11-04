import { stepsFor } from './install-app.js';
// Device tips, told once ever by the idle selector's greeting (greeting.js), after the profile's news; closing one either way
// stores its key = 'off': it never comes back. First match only:
//   #inapp-hint-menu  inside an app's own browser (Instagram, TikTok, any Android WebView): its storage is easily lost, so
//                     offer a jump to the real browser where one exists, and that app's menu steps as the sure way
//   #gpu-hint-menu    WebGL in software (turn hardware acceleration on)
// (The iPhone's fullscreen tip is free play's own: free-gate.js.)
// The jump out of an app's browser, null where none is known: Android hands an intent:// to the system's default browser,
// iOS 17+ opens x-safari-https:// (or -http) in Safari. Either may be swallowed by the app: the menu steps stay beside the button.
export function browserJump(ua, href) {
  const u = new URL(href), at = u.host + u.pathname + u.search, scheme = u.protocol.slice(0, -1); // an intent's own «#» ends the address: no hash on either; the page's own scheme (a LAN dev server is http)
  if (/Android/.test(ua)) return `intent://${at}#Intent;scheme=${scheme};action=android.intent.action.VIEW;end`;
  const ios = /(?:iPhone|iPad|iPod).* OS (\d+)_/.exec(ua);
  return ios && +ios[1] >= 17 ? `x-safari-${scheme}://${at}` : null;
}
// Who the app's browser holds (account()): 'none' (no profile: only this device's numbers), 'guest' (a profile with no confirmed
// address: lost with this storage, so confirm it first) or 'linked' (confirmed: «Recupera» brings it back in the real browser).
// The in-app tip is told once per state ('inapp-hint' keeps the states told): its risk changes when a profile appears or is confirmed.
const ACCOUNTS = ['none', 'guest', 'linked'];
export function setupDeviceHint({ focusIn, store, softwareGl, account = () => 'none', confirm = () => {}, ua = navigator.userAgent ?? '', standalone = navigator.standalone === true || globalThis.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches === true, href = globalThis.location?.href, doc = document }) {
  const $ = id => doc.getElementById(id);
  const inApp = stepsFor({ ua, standalone }) === 'inapp', jump = inApp ? browserJump(ua, href) : null;
  const told = () => (store.get('inapp-hint') || '').split(',');
  let up = null, back = null, after = null; // up: the sheet shown; after: what its own button asked for, once it has closed
  for (const key of ['inapp-hint', 'gpu-hint']) {
    const menu = $(`${key}-menu`);
    if (!menu) continue;
    for (const id of ['ok', 'close']) $(`${key}-${id}`).addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => {
      store.set(key, key === 'gpu-hint' ? 'off' : [...new Set([...told(), menu.dataset.state])].filter(Boolean).join(','));
      up = null; const b = back, a = after; back = after = null;
      if (a) a(b); else b?.();
    });
  }
  $('inapp-hint-confirm')?.addEventListener('click', () => { after = b => confirm(b); $('inapp-hint-menu').close(); }); // Perfil → confirm the address
  if (jump) $('inapp-hint-go').href = jump;
  // the sheet for this state: its title and text, and one primary (guest: confirm; else the jump, or «D’acord» where none is known)
  function dress(state) {
    for (const s of ACCOUNTS) for (const part of ['title', 'text']) $(`inapp-hint-${part}-${s}`).hidden = s !== state;
    const guest = state === 'guest';
    $('inapp-hint-steps').hidden = guest;
    $('inapp-hint-confirm').hidden = !guest; $('inapp-hint-go').hidden = guest || !jump; $('inapp-hint-ok').hidden = guest || Boolean(jump);
    $('inapp-hint-menu').dataset.state = state;
    return guest ? 'inapp-hint-confirm' : jump ? 'inapp-hint-go' : 'inapp-hint-ok';
  }
  return {
    get isOpen() { return Boolean(up?.open); },
    // true once shown
    show(onBack = null) {
      if (up?.open) return false;
      const state = inApp && account();
      const key = inApp && !told().includes(state) && $('inapp-hint-menu') ? 'inapp-hint' : softwareGl && store.get('gpu-hint') !== 'off' && $('gpu-hint-menu') ? 'gpu-hint' : null;
      if (!key) return false;
      const first = key === 'inapp-hint' ? dress(state) : 'gpu-hint-ok';
      up = $(`${key}-menu`); back = onBack;
      up.showModal(); focusIn(up, first);
      return true;
    },
  };
}
