// The card over the screen: a title, a body and its buttons.
export function createPanels(overlay) {
  let armTimer = 0;

  function panel(title, body, buttons, close) {
    overlay.style.display = '';
    // a player still tapping must not hit a button that has just appeared
    overlay.style.pointerEvents = 'none';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    overlay.innerHTML = `<div class="panel"><h2>${title}</h2>${body}</div>`;
    if (close) {
      const x = document.createElement('button');
      x.className = 'crush-icon crush-close';
      x.setAttribute('aria-label', close.label);
      x.textContent = '✕';
      x.onclick = close.fn;
      overlay.firstChild.append(x);
    }
    for (const [name, fn, kind] of buttons) {
      const b = document.createElement('button');
      b.className = kind === 'text' ? 'crush-text' : kind ? 'btn alt' : 'btn';
      b.textContent = name;
      b.onclick = fn;
      overlay.firstChild.append(b);
    }
  }

  return { panel, closePanel() { overlay.style.display = 'none'; }, dispose() { clearTimeout(armTimer); } };
}
