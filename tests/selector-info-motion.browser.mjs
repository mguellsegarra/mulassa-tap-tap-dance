// Run on the existing ?mute preview after entering the selector, at each viewport.
export async function checkSelectorInfoMotion() {
  const { setView } = await import('../src/ui/controls.js');
  const { toTitle, startGame } = await import('../src/game/flow.js');
  const { G } = await import('../src/game/state.js');
  const $ = s => document.querySelector(s), info = $('#select-info'), root = $('#select');
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const rows = [], failures = [], inconclusive = [], reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settle = async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    await Promise.all(root.getAnimations({ subtree: true }).filter(a => a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
  };
  async function entry(name, act) {
    act();
    const frames = [], start = performance.now();
    do {
      await new Promise(requestAnimationFrame);
      if (root.hidden || getComputedStyle(root).display === 'none' || !info.offsetHeight) continue;
      frames.push({ t: performance.now() - start, opacity: +getComputedStyle(info).opacity * +getComputedStyle(root).opacity,
        height: info.offsetHeight, top: info.offsetTop, text: $('#select-name').textContent });
    } while (performance.now() - start < 350 || frames.at(-1)?.opacity < .99 && performance.now() - start < 5000);
    if (!reduced && !frames.some(f => f.opacity > 0 && f.opacity < .98)) {
      const sparse = frames.some((f, i) => f.t - (frames[i - 1]?.t ?? 0) > 100);
      (sparse ? inconclusive : failures).push(`${name}: no sampled frame during fade`);
    }
    if (reduced && frames.some(f => f.opacity < 1)) failures.push(`${name}: reduced motion delayed access`);
    if (frames.at(-1).opacity < .99) failures.push(`${name}: entrance did not finish`);
    if (frames.some(f => f.opacity > 0 && (f.height !== frames.at(-1).height || f.top !== frames.at(-1).top))) failures.push(`${name}: visible layout moved during entry`);
    if (frames.some(f => f.text !== frames.at(-1).text)) failures.push(`${name}: stale identity`);
    rows.push({ name, frames });
  }
  await document.fonts.ready;
  for (const tip of document.querySelectorAll('.hint-menu[open]')) tip.close(); // a device tip (software GL) over the selector
  await settle();
  $('.sel-card[data-id="mulassa-valls"]').click(); await settle();
  setView(true); await settle();
  if (!root.inert) failures.push('photo controls remain active');
  await entry('photo-return', () => setView(false));
  if ($('.sel-more').getAttribute('aria-expanded') === 'false') $('.sel-more').click();
  await settle();
  $('.sel-card.aviat[data-id]').click(); await settle();
  if (!info.inert) failures.push('pending controls remain active');
  await entry('pending-to-drac', () => $('.sel-card[data-id="drac-valls"]').click());
  $('.sel-card[data-id="mulassa-valls"]').click(); await settle();
  if (!$('#select-name').textContent.includes('Mulassa')) failures.push('Mulassa identity');
  $('#select-next').click(); await settle(); $('#select-figures-back').click(); await settle();
  if (root.dataset.step !== 'figures' || info.hidden) failures.push('difficulty return');
  $('#select-watch').click(); // «Mira el ball», on the song row
  await settle();
  if (!G.watch || G.state !== 'play') failures.push('watch button did not start demo');
  await entry('demo-return', toTitle);
  startGame(0); await settle(); await entry('game-return', toTitle);
  setView(true); await wait(50); setView(false); await wait(35); setView(true); await wait(20); setView(false);
  $('.sel-card.aviat[data-id]').click(); await wait(40); $('.sel-card[data-id="drac-valls"]').click();
  await wait(30); $('.sel-card.aviat[data-id]').click(); await wait(20); $('.sel-card[data-id="mulassa-valls"]').click();
  await settle();
  if (info.hidden || info.inert || root.inert || +getComputedStyle(info).opacity !== 1 || !$('#select-name').textContent.includes('Mulassa')) failures.push('interrupted transition stuck');
  const targets = [];
  for (const el of info.querySelectorAll('.sel-name, .sel-entity, .sel-song, button')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest('[hidden]')) continue;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    targets.push({ id: el.id, hit: hit?.id || hit?.className });
    if (hit !== el && !el.contains(hit)) failures.push(`${el.id}: content no longer receives input`);
  }
  const b = info.getBoundingClientRect(), empty = document.elementFromPoint(b.left + 1, b.top + 1);
  if (empty?.id !== 'hud') failures.push('info padding blocks camera');
  return { viewport: [innerWidth, innerHeight], reduced, failures, inconclusive, rows, targets };
}
