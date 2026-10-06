// Small DOM pieces the sheets (feedback, profile, board) share: the status line and the button that spins while working.
export const byId = doc => id => doc.getElementById(id);
export const statusLine = el => (text, ok = false) => { el.textContent = text; el.classList.toggle('ok', ok); };
// A button's label; `spin` puts the plain ring in front (index.html .btn-spin). Working buttons are disabled and spin.
export function setButton(doc, btn, label, disabled = false, spin = disabled) {
  btn.textContent = label; btn.disabled = disabled;
  if (spin) { const ring = doc.createElement('span'); ring.className = 'btn-spin'; btn.prepend(ring); }
}
