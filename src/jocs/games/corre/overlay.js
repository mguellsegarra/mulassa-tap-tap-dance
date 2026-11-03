import { T } from './copy.js';

// The run's message panel (start, result, retry), the big gain/loss flash and the people-count badges over the street.
export function createOverlay(overlay, flashEl) {
  let armTimer = 0;
  function panel(title, text, buttons, atBottom) {
    overlay.style.display = '';
    overlay.style.pointerEvents = 'none'; // a player still dragging must not hit a button that has just appeared
    overlay.style.alignItems = atBottom ? 'flex-end' : '';
    overlay.style.background = atBottom ? 'none' : '';
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { overlay.style.pointerEvents = ''; }, 500);
    overlay.innerHTML = `<div class="panel"><h2>${title}</h2><p>${text}</p><div style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:12px"></div></div>`;
    for (const [name, fn, alt] of buttons) {
      const b = document.createElement('button');
      b.className = alt ? 'btn alt' : 'btn';
      b.textContent = name;
      b.onclick = fn;
      overlay.querySelector('.panel > div').append(b);
    }
  }

  function flash(text, gain) {
    if (!text) return;
    flashEl.textContent = text;
    flashEl.style.color = gain ? '#f5c518' : '#ff9d9d';
    flashEl.classList.remove('go');
    void flashEl.offsetWidth; // restart the animation
    flashEl.classList.add('go');
  }
  return { panel, flash, disarm: () => clearTimeout(armTimer) };
}

// a count badge at a projected point (`p`, in clip space), kept on screen and clear of the top bar
export function wireSound(btn, audio) {
  const show = () => { btn.textContent = '♪'; btn.style.opacity = audio.muted ? .45 : 1; btn.setAttribute('aria-label', audio.muted ? T.soundOn : T.soundOff); };
  btn.onclick = () => { audio.toggleMute(); show(); };
  show();
}

export function placeBadge(el, n, p, W, H) {
  el.style.display = n ? '' : 'none';
  if (!n) return;
  const text = String(n);
  if (el.textContent !== text) el.textContent = text;
  const w = el.offsetWidth, h = el.offsetHeight;
  const left = Math.max(8, Math.min(W - w - 8, (p.x + 1) / 2 * W - w / 2)), top = Math.max(56, Math.min(H - h - 8, (1 - p.y) / 2 * H - h));
  el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
