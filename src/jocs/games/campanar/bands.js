// The run's two side bands (Marc, 27 Nov 2026): on the left, a famous height flashes up on altimeter ticks as the
// tower reaches it; on the right, the ornaments found this run, one column with each one's name (it scrolls at the end). The first time this device ever
// finds an ornament it gets its moment (#plassa/discovery.js), then flies into its place. Both sit low at the screen's
// edges, clear of the slab in play, and take no tap. Built only when something changes, never per frame.
import { presentDiscovery } from '#plassa/discovery.js';
import { store } from '#plassa/storage.js';
import { ORNAMENTS, RARITY, GLYPHS, MILESTONES } from './collection.js';

const SEEN = 'campanar-seen', SHOWN = 2800, NEAR = 20; // ms a reached height stays before it fades; m before one it shows
const fmt = m => `${String(m).replace('.', ',')} m`;
function chip(id) {
  const el = document.createElement('div'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.innerHTML = GLYPHS[id];
  el.className = 'find';
  el.dataset.id = id;
  el.style.setProperty('--tint', RARITY[ORNAMENTS[id].rarity].tint);
  el.append(svg);
  return el;
}

// a find's row in the band: its name, then its chip
function row(id) {
  const r = document.createElement('div'), name = document.createElement('span');
  r.className = 'find-row';
  r.dataset.id = id;
  name.textContent = ORNAMENTS[id].name;
  r.append(name, chip(id));
  return r;
}

// its moment: the big chip, its name and rarity, then it flies into el
function present(id, el) {
  const { name, rarity } = ORNAMENTS[id], big = chip(id);
  big.classList.add('big');
  return presentDiscovery({ art: big, title: name, sub: RARITY[rarity].name, tint: RARITY[rarity].tint, to: el, at: 0.84 });
}

// left, right: the bands' elements; remember: what this device has seen (?vitrina: nothing, every moment shows)
export function createBands(left, right, { remember = true } = {}) {
  let seen = new Set(), passed = -1, moment = Promise.resolve();
  const run = new Set();
  if (remember) try { seen = new Set(JSON.parse(store.get(SEEN)) ?? []); } catch { /* nothing seen */ }
  // at the end (Marc): a tap on a find presents it again, its name under it
  right.addEventListener('click', e => {
    const r = e.target.closest('.find-row');
    if (r && right.classList.contains('browse')) moment = moment.then(() => present(r.dataset.id, r.lastChild));
  });

  // Left (Marc, 27 Nov): an altimeter's white ticks, there from the start; as a famous height comes near its own bolder
  // tick, with its name and metres in white, slides down to the middle arrow, stays a moment once reached, then fades.
  // The ticks slide with the metres (--m), the famous one sits at its own (--at).
  left.innerHTML = '<div class="ruler"></div><div class="fita"><b></b><span></span></div>';
  const fita = left.lastChild, [nameEl, metresEl] = fita.children;
  let hide = 0, shown = null, browsing = false; // browsing: the run is over, its heights are gone
  const show = x => {
    if (shown !== x) {
      shown = x;
      nameEl.textContent = x.name;
      metresEl.textContent = fmt(x.m);
      left.style.setProperty('--at', Math.round(x.m / 2) * 2); // on the ruler's nearest 2 m line, never between two (Marc): the label keeps the real metres
    }
    left.classList.add('on');
  };
  // the tower is m metres tall
  function height(m) {
    if (browsing) return;
    left.style.setProperty('--m', m);
    const k = MILESTONES.filter(x => m >= x.m).length, fresh = passed >= 0 && k > passed;
    passed = k;
    if (fresh) {
      show(MILESTONES[k - 1]);
      clearTimeout(hide);
      hide = setTimeout(() => { hide = 0; height(m); }, SHOWN);
      return;
    }
    if (hide) return; // a reached height keeps its moment (~3 s: a few floors in play), then the coming one shows
    const next = MILESTONES[k];
    if (next && next.m - m <= NEAR && m > 0) show(next);
    else left.classList.remove('on');
  }
  // ornaments completed (ornament-plan.js ids), as their stone settles
  function found(ids) {
    for (const id of ids) {
      if (run.has(id) || !ORNAMENTS[id]) continue;
      run.add(id);
      const r = row(id), el = r.lastChild, first = !seen.has(id);
      right.append(r);
      right.scrollTop = right.scrollHeight; // the newest in sight
      if (!first || ORNAMENTS[id].rarity === 'B') continue; // the campanar's own: no moment
      seen.add(id);
      if (remember) store.set(SEEN, JSON.stringify([...seen]));
      r.classList.add('waiting');
      moment = moment.then(() => (el.isConnected ? present(id, el) : null))
        .then(() => r.classList.remove('waiting'));
    }
  }
  return {
    height,
    found,
    browse(on) { browsing = on; right.classList.toggle('browse', on); if (on) { clearTimeout(hide); hide = 0; left.classList.remove('on'); } }, // the heights are the run's, not the end's
    reset() { browsing = false; right.classList.remove('browse'); run.clear(); passed = -1; clearTimeout(hide); hide = 0; right.replaceChildren(); height(0); },
    show(on) { left.hidden = right.hidden = !on; },
  };
}
