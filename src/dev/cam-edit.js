// ?cam: a camera editor over the real game (play and practice), to choose a view by eye and report it.
// The automatic camera (framePlayCamera) keeps running underneath: `apply` reads its pose as "auto", and the overlay shows
// yours next to it. Until you touch something the auto camera is what you see. Then:
//   drag (touch: one finger)  orbit round her        wheel / pinch      distance      shift+wheel   lens (fov)
//   right-drag / shift-drag   where she stands on the screen (vertical)         overlay buttons: fov, auto, copy, hide
// «Copia» puts one JSON line on the clipboard (the viewport, K, the stage, your values and the auto ones): that is what the
// per-device camera is fitted from. (The clipboard API needs https; on a LAN http page it falls back to a selectable box.)
import { DEG } from '../core/math.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FOCUS_Y = 1.4; // the point of her the camera looks at (as framePlayCamera)

function camPose(ce, mx, mz, out) { // camera position for az/el/dist round (mx, FOCUS_Y, mz)
  const c = Math.cos(ce.el);
  out[0] = mx + ce.dist * c * Math.sin(ce.az); out[1] = FOCUS_Y + ce.dist * Math.sin(ce.el); out[2] = mz + ce.dist * c * Math.cos(ce.az);
  return out;
}
function camParams(pos, mx, mz, fov, shiftPx, cssH) { // the inverse: what the auto camera is, in the editor's terms
  const dx = pos.x - mx, dy = pos.y - FOCUS_Y, dz = pos.z - mz, hd = Math.hypot(dx, dz);
  return { az: Math.atan2(dx, dz), el: Math.atan2(dy, hd), dist: Math.hypot(dx, dy, dz), fov, yf: 0.5 + shiftPx / cssH };
}

export function setupCamEdit({ hud, camera, active, info, doc = document }) {
  const ce = { az: 0, el: 0.4, dist: 14, fov: 40, yf: 0.5 }, auto = { ...ce }, tmp = [0, 0, 0];
  let touched = false, autoFov = null, shownAt = 0, cssH = 1, hidden = false;
  const ptrs = new Map();
  const touch = () => { touched = true; };

  // --- overlay
  const box = doc.createElement('div');
  box.style.cssText = 'position:fixed;z-index:60;left:calc(env(safe-area-inset-left,0px) + 6px);top:calc(env(safe-area-inset-top,0px) + 64px);max-width:min(300px,calc(100vw - 12px));padding:6px 8px;border-radius:8px;background:#000c;color:#e8ffe8;font:10.5px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre;user-select:text;-webkit-user-select:text';
  const pre = doc.createElement('div'), row = doc.createElement('div'), area = doc.createElement('textarea');
  row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;pointer-events:auto';
  area.readOnly = true; area.style.cssText = 'display:none;width:100%;height:70px;margin-top:5px;font:10px ui-monospace,monospace;pointer-events:auto;user-select:text;-webkit-user-select:text';
  const button = (label, fn) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'font:700 11px system-ui;padding:5px 8px;border:1px solid #8c8;border-radius:5px;background:#132;color:#cfc;touch-action:manipulation'; b.addEventListener('click', e => { e.stopPropagation(); fn(); }); row.append(b); return b; };
  const fovBy = d => { touch(); ce.fov = clamp(ce.fov + d, 15, 100); };
  button('fov −', () => fovBy(-2)); button('fov +', () => fovBy(2));
  button('auto', () => { touched = false; area.style.display = 'none'; });
  const copyBtn = button('copia', () => {
    const text = JSON.stringify(report());
    let ok = false;
    try { area.value = text; area.style.display = 'block'; area.select(); ok = doc.execCommand?.('copy'); } catch { /* selectable box stays */ }
    if (ok) area.style.display = 'none';
    copyBtn.textContent = ok ? 'copiat ✓' : 'selecciona i copia';
    setTimeout(() => { copyBtn.textContent = 'copia'; }, 2500);
  });
  button('amaga', () => { hidden = true; });
  box.append(pre, row, area);
  doc.body?.append(box);
  const showBtn = doc.createElement('button'); // when hidden: a small pill to bring it back
  showBtn.type = 'button'; showBtn.textContent = 'cam'; showBtn.style.cssText = 'position:fixed;z-index:60;left:6px;top:calc(env(safe-area-inset-top,0px) + 64px);display:none;font:700 11px system-ui;padding:4px 8px;border-radius:12px;border:1px solid #8c8;background:#000c;color:#cfc';
  showBtn.addEventListener('click', () => { hidden = false; });
  doc.body?.append(showBtn);

  const deg = v => (v / DEG).toFixed(1), f = (v, n = 2) => (+v).toFixed(n);
  function report() {
    const i = info(), r = v => +(+v).toFixed(4);
    return { viewport: [i.cw, i.ch], dpr: i.dpr, K: i.K, aspect: r(i.cw / i.ch), practice: i.practice, touch: i.touch,
      stage: { lane: r(i.laneBottom), pad: r(i.padTop) }, // css px from the top: the lane's bottom edge, the pad's top edge
      az: r(ce.az / DEG), el: r(ce.el / DEG), dist: r(ce.dist), fov: r(ce.fov), yf: r(ce.yf), edited: touched,
      auto: { az: r(auto.az / DEG), el: r(auto.el / DEG), dist: r(auto.dist), fov: r(auto.fov), yf: r(auto.yf) } };
  }
  function draw(now) {
    if (now - shownAt < 100) return; shownAt = now;
    box.style.display = hidden || !active() ? 'none' : 'block'; showBtn.style.display = hidden && active() ? 'block' : 'none';
    if (hidden || !active()) return;
    const i = info();
    pre.textContent = `${i.cw}×${i.ch} @${i.dpr} K=${f(i.K, 2)} asp ${f(i.cw / i.ch)} ${i.practice ? 'pràctica' : 'joc'}${touched ? '  [EDITAT]' : '  [auto]'}\n` +
      `az   ${deg(ce.az).padStart(6)}°  auto ${deg(auto.az)}\nel   ${deg(ce.el).padStart(6)}°  auto ${deg(auto.el)}\n` +
      `dist ${f(ce.dist).padStart(6)}m  auto ${f(auto.dist)}\nfov  ${f(ce.fov, 1).padStart(6)}°  auto ${f(auto.fov, 1)}\n` +
      `ella y ${f(ce.yf).padStart(5)}    auto ${f(auto.yf)}\ncarril fins ${Math.round(i.laneBottom)}px · botons des de ${Math.round(i.padTop)}px`;
  }

  // --- input (only while the game is on)
  hud.addEventListener('contextmenu', e => { if (active()) e.preventDefault(); });
  hud.addEventListener('pointerdown', e => {
    if (!active()) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, shift: e.shiftKey || e.button === 2 });
    try { hud.setPointerCapture?.(e.pointerId); } catch { /* gone */ }
  });
  hud.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p || !active()) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y, shift = p.shift || e.shiftKey; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size >= 2) { // two fingers: pinch = distance, together up/down = where she stands
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), prev = ptrs.pinch ?? d; ptrs.pinch = d;
      touch(); if (prev > 0) ce.dist = clamp(ce.dist * prev / d, 3, 45); ce.yf = clamp(ce.yf + dy / 2 / cssH, -0.5, 1.5);
    } else if (shift) { touch(); ce.yf = clamp(ce.yf + dy / cssH, -0.5, 1.5); }
    else { touch(); ce.az -= dx * 0.006; ce.el = clamp(ce.el + dy * 0.006, 2 * DEG, 85 * DEG); }
  });
  for (const ev of ['pointerup', 'pointercancel']) hud.addEventListener(ev, e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) ptrs.pinch = null; });
  hud.addEventListener('wheel', e => {
    if (!active()) return; e.preventDefault(); touch();
    if (e.shiftKey) ce.fov = clamp(ce.fov + Math.sign(e.deltaY) * 1.5, 15, 100);
    else ce.dist = clamp(ce.dist * Math.exp(e.deltaY * 0.0012), 3, 45);
  }, { passive: false });

  return {
    restoreFov() { if (autoFov != null) camera.fov = autoFov; }, // the auto camera must see its own lens, not yours (nothing to restore before the first frame)
    idle() { autoFov = null; }, // not playing: the next game starts from the lens the game itself picks
    // after framePlayCamera has placed the camera: read it as "auto", and take over once edited. Returns the lens shift (css px).
    apply(shiftPx, mx, mz, now) {
      cssH = info().ch;
      Object.assign(auto, camParams(camera.position, mx, mz, camera.fov, shiftPx, cssH)); autoFov = camera.fov;
      if (!touched) Object.assign(ce, auto);
      else {
        camPose(ce, mx, mz, tmp); camera.position.set(tmp[0], tmp[1], tmp[2]); camera.lookAt(mx, FOCUS_Y, mz);
        if (camera.fov !== ce.fov) { camera.fov = ce.fov; camera.updateProjectionMatrix(); }
        shiftPx = (ce.yf - 0.5) * cssH;
      }
      draw(now);
      return shiftPx;
    },
  };
}
