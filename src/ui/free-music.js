// Free mode's music («mode foto»): one button paired with the eye and a short list under it (the menu loop, the three
// figures' songs, Sense música). Entering free play (the corner gamepad #free, or a double tap on the plaça) starts that figure's song (playFigure); after that, who you drive never changes it; it lasts while the free mode does (leaving fades back to
// the menu loop). A song that ends hands over to the next in the list (the Bou's to the menu loop, which never ends).
// No music follows the speaker preference; manual figure effects remain available. Sound: chip.radio* (platform/audio.js).
import { chip, menuMusic, setMenuSound } from '../game/state.js';
import { figureSong } from '../game/figure-song.js';
import { MULASSA, DRAC, BOU, portraitArt, portraitPalette } from '../game/figures.js';
import { pixelSvg } from './select-ui.js';
import { mulaSpinner } from './loader.js';
import { PHOTO, clearPhotoKeys } from '../game/photo-control.js';
import { hud } from '../hud/canvas.js';
import { keyboardNav } from './focus.js';
import { beatAtTime } from '../core/beat-grid.js';
import { errors } from '../services/errors.js';
import { audioFailureTags } from '../platform/audio.js';
import { tr } from '../i18n/messages.js';

const FM_NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>';
const FM_NO_MUSIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="m3 3 18 18"/></svg>';
const FM_OFF = 4, FM_NOW_MS = 2600, FM_PRELOAD = 15; // the next song starts loading FM_PRELOAD s before this one ends
export const nextTrack = i => (i + 1) % FM_OFF; // Mulassa → Drac → Bou → the menu loop; no music is never next

// onSound: the speaker button shows the preference again (ui/sheets-setup.js).
export function setupFreeMusic({ eye, onSound }) {
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const tracks = [{ title: tr('ui.radio.menu'), sub: tr('ui.radio.menuSub'), art: FM_NOTE, kind: 'menu' },
    ...[MULASSA, DRAC, BOU].map(f => {
      const song = figureSong(f.id);
      return { title: f.song, sub: `${f.composer.replace(/^(\S)\S* (\S+).*/, '$1. $2')} · ${f.year} · ${mmss(song.tail)}`, song, art: pixelSvg(portraitArt(f), portraitPalette(f), '#2a1a10'), kind: f.id };
    }),
    { title: tr('ui.radio.off'), sub: tr('ui.radio.offSub'), art: FM_NO_MUSIC, kind: 'off' }];
  const btn = document.createElement('button'), menu = document.createElement('div'), now = document.createElement('div');
  btn.id = 'radio'; btn.className = 'round-btn'; btn.type = 'button'; btn.hidden = true; btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-controls', 'radio-menu');
  menu.id = 'radio-menu'; menu.hidden = true; menu.setAttribute('role', 'radiogroup'); menu.setAttribute('aria-labelledby', 'radio-title');
  menu.innerHTML = `<h2 id="radio-title">${tr('ui.radio.title')}</h2>` + tracks.map((t, i) => `<button type="button" class="fm-row" role="radio" data-i="${i}" data-kind="${t.kind}"><span class="fm-art">${t.art}</span><span class="fm-t"><b>${t.title}</b><small></small></span><span class="fm-st"></span></button>`).join('');
  now.id = 'radio-now'; now.hidden = true; now.setAttribute('role', 'status');
  eye.after(btn, menu, now);
  const rows = [...menu.querySelectorAll('.fm-row')];
  let shown = false, open = false, cur = 0, playing = -1, loading = -1, failed = -1, token = 0, preT = 0, nowT = 0;
  const contextChanged = () => { if (shown) render(); };

  function render() {
    btn.innerHTML = (cur === FM_OFF ? FM_NO_MUSIC : FM_NOTE) + '<span class="fm-dot"></span>';
    btn.dataset.kind = tracks[cur].kind;
    btn.setAttribute('aria-expanded', String(open));
    btn.title = tr('ui.radio.buttonTitle', { track: tracks[cur].title }); btn.setAttribute('aria-label', btn.title);
    rows.forEach((r, i) => {
      r.setAttribute('aria-checked', String(i === cur)); r.tabIndex = i === cur ? 0 : -1;
      const paused = i === cur && i !== FM_OFF && chip?.ctx?.state !== 'running';
      r.querySelector('small').textContent = i === loading ? tr('ui.radio.loading') : i === failed ? tr('ui.radio.failed') : paused ? tr('ui.radio.tapResume') : tracks[i].sub;
      const st = r.querySelector('.fm-st');
      st.replaceChildren();
      if (i === loading) st.append(mulaSpinner(document, { mini: true }));
      else if (i === cur && i !== FM_OFF && !paused && i !== failed) st.innerHTML = '<span class="fm-bars"><i></i><i></i><i></i></span>';
    });
  }
  function place() { // the paired icon and desktop bubble share one anchor; CSS keeps narrow layouts centred
    const r = eye.getBoundingClientRect(), gap = r.width > 50 ? 12 : 8;
    const x = r.right + gap;
    Object.assign(btn.style, { left: `${x}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const root = document.body.style; // «?» (controls.js, #howto.photo-help) sits right of the radio, same size
    root.setProperty('--help-x', `${x + r.width + gap}px`); root.setProperty('--help-y', `${r.top}px`); root.setProperty('--help-size', `${r.width}px`);
    menu.style.setProperty('--radio-anchor-right', `${x + r.width}px`);
    menu.style.setProperty('--radio-anchor-bottom', `${r.bottom}px`);
    if (!menu.hidden) {
      const box = menu.getBoundingClientRect(), w = box.width, h = box.height + 12;
      const tip = Math.max(31, Math.min(w - 31, x + r.width / 2 - box.left));
      // One filled outline: no border crosses the tail, and translucent surfaces never overlap.
      const d = `M21 13H${tip - 10}L${tip} 1L${tip + 10} 13H${w - 21}Q${w - 1} 13 ${w - 1} 33V${h - 21}Q${w - 1} ${h - 1} ${w - 21} ${h - 1}H21Q1 ${h - 1} 1 ${h - 21}V33Q1 13 21 13Z`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${d}" fill="black" fill-opacity=".8" stroke="#f5c518" stroke-width="2" stroke-linejoin="round"/></svg>`;
      menu.style.setProperty('--radio-bubble', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    }
  }
  function announce() {
    const status = tr(cur === FM_OFF ? 'ui.radio.stopped' : chip?.running ? 'ui.radio.playing' : 'ui.radio.tapResume');
    now.innerHTML = `<span class="fm-art">${tracks[cur].art}</span><span><small>${status}</small><b>${tracks[cur].title}</b></span>`;
    now.dataset.kind = tracks[cur].kind; now.hidden = false; now.dataset.visible = 'true'; now.setAttribute('aria-hidden', 'false');
    clearTimeout(nowT); nowT = setTimeout(() => { now.dataset.visible = 'false'; now.setAttribute('aria-hidden', 'true'); }, FM_NOW_MS);
  }
  function settle(i) { // the choice took: list, button, toast
    loading = -1; cur = i;
    setOpen(false); render();
    if (shown) announce();
  }
  function pick(i, auto = false) {
    clearTimeout(preT); failed = -1; token++;
    if (i === FM_OFF) { playing = -1; if (menuMusic) { setMenuSound(false); onSound(); } settle(i); return; } // (stops the radio too)
    const t = tracks[i];
    if (!chip?.radioLoad) return; // no engine yet (tests, a page without Web Audio)
    if (!t.song) { playing = -1; chip?.radio(null); if (!menuMusic) { setMenuSound(true); onSound(); } settle(i); return; }
    if (i === playing && !auto) { loading = -1; chip.wake(); setOpen(false); render(); return; } // resume the same source, never restart it
    const mine = token;
    loading = i; render();
    chip.radioLoad(t.song.audio).then(buf => {
      if (mine !== token || !shown) return;
      chip.radio(buf, { end: t.song.tail, onEnd: () => { playing = -1; if (shown && loading < 0) pick(nextTrack(i), true); } });
      playing = i;
      if (!menuMusic) { setMenuSound(true); onSound(); }
      chip.radioKeep([t.song.audio]);
      const next = tracks[nextTrack(i)].song; // ready by the time this one ends, without two songs held all along
      if (next) preT = setTimeout(() => chip.radioLoad(next.audio).catch(() => {}), Math.max(0, t.song.tail - FM_PRELOAD) * 1000);
      settle(i);
    }).catch(e => {
      if (mine !== token) return;
      errors.report('radio-load-failed', audioFailureTags(e));
      loading = -1; failed = i;
      if (auto || playing < 0) pick(0); else render(); // keep a sounding song; if it ended during this load, restore the menu
    });
  }
  function setOpen(on) {
    if (on === open || on && !shown) return;
    open = on; menu.hidden = !on; btn.setAttribute('aria-expanded', String(on));
    if (on) {
      clearPhotoKeys(); // stops her and drops the mouse look (its pointer lock goes with it: ui/mouse-look.js)
      clearTimeout(nowT); now.hidden = true; now.dataset.visible = 'false'; now.setAttribute('aria-hidden', 'true'); render(); place();
      rows[cur].focus({ preventScroll: true });
    } else if (menu.contains(document.activeElement)) {
      if (PHOTO.on) hud.focus({ preventScroll: true }); // the keys drive her again
      else if (keyboardNav) btn.focus({ preventScroll: true });
      else document.activeElement.blur();
    }
  }
  btn.addEventListener('click', () => setOpen(!open));
  for (const r of rows) r.addEventListener('click', () => pick(+r.dataset.i));
  menu.addEventListener('focusout', e => { if (open && e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== btn) setOpen(false); }); // Tab out
  // A press on the plaça while it is open only closes it: it never also steers or looks.
  addEventListener('pointerdown', e => {
    if (!open || menu.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
    if (e.target === hud) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  // Before input.js: M is no figure key; while open, Escape closes the list before it drops the figure.
  addEventListener('keydown', e => {
    if (!shown || e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) return;
    const take = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.code === 'KeyM') { take(); if (!e.repeat) setOpen(!open); return; }
    if (!open) return;
    const digit = /^Digit([1-5])$/.exec(e.code), step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.code];
    if (e.code === 'Escape') { take(); setOpen(false); }
    else if (digit) { take(); pick(+digit[1] - 1); }
    else if (step) { take(); const i = rows.indexOf(document.activeElement); rows[((i < 0 ? cur : i) + step + rows.length) % rows.length].focus(); }
    else if (e.code === 'Home' || e.code === 'End') { take(); rows[e.code === 'Home' ? 0 : rows.length - 1].focus(); }
  }, true);
  addEventListener('resize', () => { if (shown) place(); });

  return {
    get open() { return open; },
    visible(on) { // ui/controls.js setView: entering starts on what already sounds; leaving fades back to the menu loop
      if (on === shown) return;
      shown = on; btn.hidden = !on;
      if (on) { chip?.ctx?.addEventListener?.('statechange', contextChanged); cur = menuMusic ? 0 : FM_OFF; failed = -1; place(); render(); return; }
      chip?.ctx?.removeEventListener?.('statechange', contextChanged);
      setOpen(false); token++; clearTimeout(preT); clearTimeout(nowT); now.hidden = true; loading = -1;
      playing = -1; chip?.radio?.(null); // ended may have cleared the source while the next track is still decoding
      chip?.radioKeep?.([]);
    },
    playFigure(id) { // entering free play: the driven figure's own song and its «Ara sona», unless the speaker is off
      const i = tracks.findIndex(t => t.kind === id);
      if (shown && menuMusic && i > 0) pick(i);
    },
    beat() { // the plaça claps on the playing song's beats (main.js → animCrowd); null: the menu's own beat
      const t = playing >= 0 ? chip?.radioTime?.() : null;
      return t == null ? null : beatAtTime(tracks[playing].song.beats, t);
    },
  };
}
