// Browser regression: load the existing dev server with ?mute, enter the selector,
// unfold Pròximament, then import this module and await checkSelectorText().
// Run at 375×667, 393×852, 667×375, 768×1024 and 1280×800.
// Reads the current catalog through the rendered cards; no copied fixture names.
export async function checkSelectorText() {
  await document.fonts.ready;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const rect = el => el.getBoundingClientRect();
  const failures = [], rows = [];
  const inside = (a, b) => a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  const textFits = (el, box, label) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const bounds = rect(box);
    for (const fragment of range.getClientRects()) {
      if (!inside(fragment, bounds)) failures.push(`${label}: text outside container`);
    }
    if (el.scrollWidth > el.clientWidth + 1) failures.push(`${label}: scroll overflow`);
  };
  const cards = [...document.querySelectorAll('.sel-card[data-id]')];
  for (const card of cards) {
    card.click();
    await wait(420); // dock drop, cross-fade and scroll complete before bounds are read
    const id = card.dataset.id, name = card.querySelector('.sel-card-name'), entity = card.querySelector('small');
    const caption = card.querySelector('.nb'), portrait = card.querySelector('.por');
    textFits(name, caption, `${id}: name`);
    textFits(entity, caption, `${id}: entity`);
    if (rect(name).bottom > rect(entity).top + 1) failures.push(`${id}: name/entity overlap`);
    if (rect(portrait).height < 24) failures.push(`${id}: portrait collapsed`);
    const panel = document.querySelector('#select-pending:not([hidden]), #select-info:not([hidden])');
    const panelEntity = panel.querySelector('.sel-entity');
    textFits(panelEntity, panel, `${id}: panel entity`);
    if (!inside(rect(panel), { left: 0, top: 0, right: innerWidth, bottom: innerHeight })) failures.push(`${id}: panel outside viewport`);
    if (panel.id === 'select-pending') {
      if (panel.scrollHeight > panel.clientHeight + 1) failures.push(`${id}: pending content overflow`);
      const strip = rect(document.querySelector('#select-strip')), p = rect(panel);
      if (Math.min(p.right, strip.right) > Math.max(p.left, strip.left) && p.bottom > strip.top + 1) failures.push(`${id}: pending/strip overlap`);
    }
    rows.push({ id, name: name.textContent, entity: entity.textContent, panelEntity: panelEntity.textContent,
      cardWidth: rect(card).width, cardHeight: rect(card).height, captionHeight: rect(caption).height,
      entityHeight: rect(entity).height, entityFont: getComputedStyle(entity).fontSize, panelHeight: rect(panel).height });
  }
  if (new Set(rows.map(r => Math.round(r.cardHeight))).size > 1 || new Set(rows.map(r => Math.round(r.captionHeight))).size > 1) failures.push('Unequal card/caption heights');
  return { viewport: [innerWidth, innerHeight], count: rows.length, failures: [...new Set(failures)], rows };
}
