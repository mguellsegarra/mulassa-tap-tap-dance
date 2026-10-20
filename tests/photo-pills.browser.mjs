// On the existing dev server with ?mute and photo mode open, at each viewport.
// Measure painted circles, selection shadows and keyboard outlines, not just button boxes.
export function measurePhotoPills() {
  const group = document.querySelector('#photo-figs');
  if (group.hidden) return { hidden: true, rows: [] }; // touch never gets this control
  const root = getComputedStyle(document.documentElement);
  const canvas = document.querySelector('#gl').getBoundingClientRect();
  const viewport = window.visualViewport;
  const bounds = { top: Math.max(canvas.top, viewport?.offsetTop ?? 0) + (parseFloat(root.getPropertyValue('--sat')) || 0),
    bottom: Math.min(canvas.bottom, viewport ? viewport.offsetTop + viewport.height : innerHeight) - (parseFloat(root.getPropertyValue('--sab')) || 0) };
  const rows = [...group.querySelectorAll('.pf')].map(button => {
    const portrait = button.querySelector('.pf-por'), label = button.querySelector('.pf-nb');
    const p = portrait.getBoundingClientRect(), b = button.getBoundingClientRect(), n = label.getBoundingClientRect();
    const style = getComputedStyle(portrait);
    // These controls use a concentric, unblurred shadow. Include its spread and the focus outline.
    const shadow = style.boxShadow === 'none' ? 0 : Math.max(0, ...[...style.boxShadow.matchAll(/(-?[\d.]+)px/g)].map(m => +m[1]));
    const outline = style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const outset = Math.max(shadow, outline), labelVisible = getComputedStyle(label).position !== 'absolute';
    return { id: button.dataset.id, selected: button.getAttribute('aria-pressed') === 'true',
      focused: button.matches(':focus-visible'), width: b.width, height: b.height,
      top: Math.min(p.top - outset, labelVisible ? n.top : Infinity),
      bottom: Math.max(p.bottom + outset, labelVisible ? n.bottom : -Infinity),
      alignment: labelVisible ? Math.abs((n.top + n.bottom - p.top - p.bottom) / 2) : 0 };
  });
  const union = { top: Math.min(...rows.map(r => r.top)), bottom: Math.max(...rows.map(r => r.bottom)) };
  return { viewport: [innerWidth, innerHeight], bounds, union, rows,
    margins: [union.top - bounds.top, bounds.bottom - union.bottom],
    gaps: rows.slice(1).map((r, i) => r.top - rows[i].bottom) };
}

export async function checkPhotoPills() {
  await document.fonts.ready;
  await new Promise(requestAnimationFrame); // let the game's resize handler commit --app-h
  if (!document.body.classList.contains('view-mode')) throw new Error('Open photo mode before checking its pills');
  const group = document.querySelector('#photo-figs');
  if (matchMedia('(pointer: coarse)').matches) {
    if (!group.hidden) throw new Error('Touch must not expose the keyboard photo controls');
    return [measurePhotoPills()];
  }
  if (group.hidden) throw new Error('Photo pills missing with a fine pointer');
  const results = [];
  for (const button of document.querySelectorAll('#photo-figs .pf')) {
    if (document.querySelector('#photo-figs').hidden) break;
    if (button.getAttribute('aria-pressed') !== 'true') button.click();
    await Promise.all([...document.querySelectorAll('#photo-figs .pf-por')].flatMap(p => p.getAnimations()).map(a => a.finished));
    const result = measurePhotoPills();
    if (result.rows.length !== 3 || result.rows.filter(r => r.selected).length !== 1 || !result.rows.find(r => r.id === button.dataset.id)?.selected) throw new Error('Photo selection did not reach the requested option');
    const target = result.bounds.top + (result.bounds.bottom - result.bounds.top) * .4;
    if (Math.abs((result.union.top + result.union.bottom) / 2 - target) > .5) throw new Error(`Photo pills not at 40% of the safe height: ${JSON.stringify(result)}`);
    if (result.rows.some(r => r.width < 44 || r.height < 44 || r.alignment > .5)) throw new Error('Photo pill target/alignment regression');
    if (result.gaps.some(g => g < 0) || result.margins.some(g => g < 0)) throw new Error('Photo pills overlap or escape the game viewport');
    if (Math.abs(result.gaps[0] - result.gaps[1]) > .5) throw new Error('Photo pills have unequal visual gaps');
    results.push(result);
  }
  return results;
}
