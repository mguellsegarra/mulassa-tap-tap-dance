// The run's two side bands (Marc, 27 Nov 2026): on the left, a famous height flashes up on altimeter ticks as the
// tower reaches it; on the right, the special pieces found this run as icons only, the newest at the bottom (Fable's
// review). Each find gets one toast (#plassa/discovery.js), «NOU» and rays the first time this device sees it. Both bands
// sit low at the screen's edges, clear of the slab in play, take no tap and go once the run is over. Built only when
// something changes, never per frame.
import { toastDiscovery, clearDiscoveryToast } from '#plassa/discovery.js';
import { store } from '#plassa/storage.js';
import { ORNAMENTS, RARITY, milestonesOf } from './collection.js';
import { orb } from './pieces.js';

const SHOWN = 2800, NEAR = 20; // ms a reached height stays before it fades; m before one it shows
const TURN = 'campanar-fita'; // which of the band's bell towers the next run passes (collection.js TOWERS), kept across sessions
const rank = id => Object.keys(RARITY).indexOf(ORNAMENTS[id].rarity); // rarer, higher

// left, right: the bands' elements; pieces: the collection (pieces.js)
export function createBands(left, right, pieces) {
  let passed = -1, live = false, last = 0; // live: a run in play (its finds get a toast); last: the tower's metres
  let marks = milestonesOf(0); // this run's famous heights, in order
  // Left (Marc, 27 Nov): an altimeter's white ticks, there from the start; as a famous height comes near its own bolder
  // tick, with its name in white on it, slides down to the middle arrow, stays a moment once reached, then fades.
  // The ticks slide with the metres (--m), the famous one sits at its own (--at).
  left.innerHTML = '<div class="ruler"></div><div class="fita"><b></b></div>'; // its name on its tick, no metres (Marc)
  const fita = left.lastChild, nameEl = fita.firstChild;
  let hide = 0, shown = null;
  const show = x => {
    if (shown !== x) {
      shown = x;
      nameEl.textContent = x.name;
      left.style.setProperty('--at', Math.round(x.m / 2) * 2); // on the ruler's nearest 2 m line, never between two (Marc)
    }
    left.classList.add('on');
  };
  // the tower is m metres tall
  function height(m) {
    if (!live) return;
    last = m;
    left.style.setProperty('--m', m);
    const k = marks.filter(x => m >= x.m).length, fresh = passed >= 0 && k > passed;
    passed = k;
    if (fresh) {
      show(marks[k - 1]);
      clearTimeout(hide);
      hide = setTimeout(() => { hide = 0; height(last); }, SHOWN); // the tower's height then, not the one it passed at
      return;
    }
    if (hide) return; // a reached height keeps its moment (~3 s: a few floors in play), then the coming one shows
    const next = marks[k];
    if (next && next.m - m <= NEAR && m > 0) show(next);
    else left.classList.remove('on');
  }
  // special pieces settled at height y (scene.js): each joins the band once a run; while the run is on, the rarest of
  // them gets the toast (two on one floor, the drain and the dragon gargoyles: the other waits for the collection)
  function found(ids, y) {
    let toast = null;
    for (const id of ids) {
      const f = pieces.find(id, y);
      if (!f) continue;
      right.append(orb(id));
      if (!toast || rank(id) > rank(toast.id)) toast = { id, ...f };
    }
    if (!toast || !live) return; // settled as the run ended: the collection sheet tells it (nothing over the tower then)
    const { name, rarity, why } = ORNAMENTS[toast.id];
    toastDiscovery({ art: orb(toast.id), title: name, sub: `${RARITY[rarity].name} · ${why}`, tint: RARITY[rarity].tint, badge: toast.first ? 'NOU' : '' }); // i18n-ok: POC placeholder
    pieces.shown(toast.id); // on screen now: only now is it no longer new
  }
  return {
    height,
    found,
    // the run is over: no more heights nor toasts, and nothing over the tower
    over() { live = false; clearTimeout(hide); hide = 0; clearDiscoveryToast(); left.hidden = right.hidden = true; },
    reset() {
      let k = 0;
      try { k = +store.get(TURN) || 0; store.set(TURN, String(k + 1)); } catch { /* no storage: the first one */ }
      marks = milestonesOf(k);
      live = true; passed = -1; clearTimeout(hide); hide = 0; clearDiscoveryToast(); right.replaceChildren(); height(0);
    },
    show(on) { left.hidden = right.hidden = !on; },
  };
}
