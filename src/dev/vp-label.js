// ?vp: a corner label with what the selector's media queries and zoom see, to read off a photo of a device's screen.
export function setupVpLabel() {
  const el = document.body.appendChild(document.createElement('div'));
  el.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;padding:4px 8px;border-radius:6px;background:#000c;color:#0f0;font:700 14px/1.3 monospace;pointer-events:none;white-space:pre';
  const show = () => {
    const sel = document.getElementById('select');
    el.textContent = `${innerWidth}×${innerHeight} dpr ${devicePixelRatio.toFixed(2)}\nzoom ${sel ? getComputedStyle(sel).zoom : '-'} pointer ${['fine', 'coarse', 'none'].find(p => matchMedia(`(pointer: ${p})`).matches) ?? '?'}`
      // after a turn on iPad: which of these the browser got wrong (the canvas follows innerWidth and --app-h)
      + `\nvv ${visualViewport ? `${Math.round(visualViewport.width)}×${Math.round(visualViewport.height)} ×${visualViewport.scale.toFixed(2)}` : '-'} html ${document.documentElement.clientWidth}×${document.documentElement.clientHeight}`
      + `\nscreen ${screen.width}×${screen.height} app-h ${document.documentElement.style.getPropertyValue('--app-h') || '-'} scroll ${scrollX},${scrollY}`;
  };
  addEventListener('resize', show);
  setInterval(show, 1000);
  show();
}
