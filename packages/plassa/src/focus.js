// Keyboard vs pointer navigation, and where a sheet puts the focus.

// Focus rings are for keyboard players: a sheet opened by touch or mouse focuses itself (no ring on its buttons);
// opened from the keyboard its main button takes focus, so Enter/Space act on it straight away.
export let keyboardNav = false;
// <html data-keys> for CSS (select-pending.css): a body:has(:focus-visible) made every DOM change restyle all the cards
const setKeyboardNav = on => { if (on !== keyboardNav) document.documentElement.toggleAttribute('data-keys', (keyboardNav = on)); };
addEventListener('keydown', () => setKeyboardNav(true), { capture: true });
addEventListener('pointerdown', () => setKeyboardNav(false), { capture: true });
export const focusIn = (sheet, id) => (keyboardNav ? document.getElementById(id) : sheet).focus();
