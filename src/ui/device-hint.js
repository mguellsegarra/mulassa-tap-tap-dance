// Device tips (#gpu-hint-menu, #ios-hint-menu): told once ever by the idle selector's greeting (greeting.js), after the profile's
// news. WebGL in software (turn hardware acceleration on) comes first; else iPhone Safari outside the home-screen app.
// Closing it either way stores its key ('gpu-hint' / 'ios-hint' = 'off'): it never comes back.
export function setupDeviceHint({ focusIn, store, softwareGl, ua = navigator.userAgent ?? '', standalone = navigator.standalone, doc = document }) {
  const key = softwareGl && store.get('gpu-hint') !== 'off' ? 'gpu-hint'
    : /iPhone|iPod/.test(ua) && standalone === false && store.get('ios-hint') !== 'off' ? 'ios-hint' : null;
  const menu = key && doc.getElementById(`${key}-menu`);
  let back = null;
  if (menu) {
    for (const id of ['ok', 'close']) doc.getElementById(`${key}-${id}`).addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => { store.set(key, 'off'); const b = back; back = null; b?.(); });
  }
  return {
    get isOpen() { return Boolean(menu?.open); },
    // true once shown
    show(onBack = null) {
      if (!menu || menu.open || store.get(key) === 'off') return false;
      back = onBack;
      menu.showModal(); focusIn(menu, `${key}-ok`);
      return true;
    },
  };
}
