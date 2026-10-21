// Run on the existing dev server (?mute), after entering the playable selector.
// Real layout/hit-testing is needed: the node harness has no CSS hit-test tree.
export async function checkSelectorCameraTargets() {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame);
  const info = document.querySelector('#select-info'), hud = document.querySelector('#hud');
  const bounds = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  const rows = [], failures = [];
  const sample = (name, x, y, expected) => {
    const target = document.elementFromPoint(x, y);
    rows.push({ name, x, y, target: target?.id || target?.className, stack: document.elementsFromPoint(x, y).slice(0, 5).map(e => e.id || e.className) });
    if (target !== expected && !expected.contains(target)) failures.push(`${name}: expected ${expected.id || expected.className}, got ${target?.id || target?.className}`);
  };
  const box = info.getBoundingClientRect();
  const surfaces = [...info.querySelectorAll('.sel-name, .sel-entity, .sel-song, button, a, #select-error')];
  // The panel's padding and the empty right side beside each narrow content row
  // are visibly exposed world, even while those rows retain their scroll targets.
  sample('info padding', box.left + 1, box.top + 1, hud);
  const content = [...info.querySelectorAll('.sel-entity, #select-song, .sel-panel > button')];
  for (const el of content) {
    const selector = el.id || el.className, r = el.getBoundingClientRect();
    const y = (Math.max(r.top, box.top) + Math.min(r.bottom, box.bottom)) / 2;
    // Keep clear of the title's trimmed line box and its overhanging ? target.
    const right = Math.max(r.right, ...['#select-name', '#select-howto'].map(s => info.querySelector(s).getBoundingClientRect().right));
    const x = (right + box.right) / 2;
    const occupied = surfaces.some(e => { const b = e.getBoundingClientRect(); return x >= b.left && x < b.right && y >= b.top && y < b.bottom; });
    if (!occupied && r.width && right + 8 < box.right && y > box.top && y < box.bottom) sample(`beside ${selector}`, x, y, hud);
    if (r.height && r.top >= box.top && r.bottom <= box.bottom) sample(`on ${selector}`, r.left + r.width / 2, r.top + r.height / 2, el);
  }
  const controls = [...document.querySelectorAll('#select-info button, #select-info a, #settings, #music, #feedback, #viewmode')];
  for (const el of controls) {
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    if (el.disabled || !r.width || !r.height || style.visibility === 'hidden' || style.pointerEvents === 'none' || el.closest('[inert]')) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
    // Offscreen carousel cards can be clipped by their scrolling parent.
    if (el.closest('.sel-strip')) continue;
    sample(`control ${el.id || el.className}`, x, y, el);
  }
  return { viewport: [innerWidth, innerHeight], coarse: matchMedia('(pointer: coarse)').matches, info: bounds(info), failures, rows };
}
