// Keyboard vs pointer navigation, and where a sheet puts the focus.

// Focus rings are for keyboard players: a sheet opened by touch or mouse focuses itself (no ring on its buttons);
// opened from the keyboard its main button takes focus, so Enter/Space act on it straight away.
export let keyboardNav = false;
addEventListener('keydown', () => { keyboardNav = true; }, { capture: true });
addEventListener('pointerdown', () => { keyboardNav = false; }, { capture: true });
export const focusIn = (sheet, id) => (keyboardNav ? document.getElementById(id) : sheet).focus();
