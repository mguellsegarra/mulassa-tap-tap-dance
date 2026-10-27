// Device tip (#gpu-hint-menu): WebGL in software (turn hardware acceleration on), told once ever by the idle selector's greeting
// (greeting.js), after the profile's news. Closing it either way stores 'gpu-hint' = 'off': it never comes back.
// (The iPhone's fullscreen tip is free play's own: free-gate.js.)
export function setupDeviceHint({ focusIn, store, softwareGl, doc = document }) {
  const key = softwareGl && store.get('gpu-hint') !== 'off' ? 'gpu-hint' : null;
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
