// The prototype's ornaments (Marc's «Prototip 10 peces», 27 Nov 2026; the study artifact TQx8MQL9j7LNf9WJYR2V9g):
// what a shaft floor wears besides its course, decided once as it settles (facade.js) from what the player built and
// nothing random: its height, a width kept, a perfect streak, a stretch survived in XS, the device's hour. Commons go
// on all four walls; the rest on the camera's wall (openings.js CAM). Pure: no three, no DOM.
import { SIZE } from './rules.js';

const DEMO = typeof location !== 'undefined' && import.meta.env?.DEV && new URLSearchParams(location.search).has('vitrina'); // ?vitrina: all of them early
// floors from which (1 floor = 1.77 m): the drain gargoyles from 74 m, the rose from 100 m, the moon from 350 m (300 m
// by night); the rose wants width A kept ROSE_KEEP floors under it, the dragon gargoyle a streak of STREAK perfects, the
// Virgin's window XS_RUN floors survived in XS; after FILLER_AFTER bare floors in a row (string courses and arrow slits
// count as bare: they hardly show from afar), a one-floor piece. The stork's
// nest on a parapet from 74 m (the tower still A or C wide at 74 m), the lightning rod on a tower of 150 m (85 floors).
// The stretch from 100 to 400 m (Marc, 27 Nov 2026: long runs were empty from 124 to 372 m): the bell-ringer's house from
// 100 m on a tower still C wide, where a cottage has a wall to hang from (rare: most towers are thinner by then); the
// gallery once WIDE_RUN floors from 120 m have all stayed A (a cut never widens: an A tower at 145 m, harder than the
// rose's at 100 m, so epic); the sundial after SUN_STREAK perfects in a row above 150 m (two more than the dragon's six,
// that high up: epic); the lantern on the first string course from 250 m (rare: few runs get there). A string course's
// corners all wear one piece (Marc, 27 Nov 2026: a dragon on one corner, a spout on the other). Device time decides
// no find (a run rebuilt from its taps must find the same ones), so the lantern is earned by height alone and lit always:
// the game's sky is always night. ?vitrina's gallery from 14: a string course of its own, not the dragon's (a piece as rare
// takes the toast)
export const FROM = DEMO ? { gargoyle: 8, rose: 16, moon: 44, moonNight: 44, nest: 16, rod: 40, house: 30, gallery: 14, sundial: 12, lantern: 24 }
  : { gargoyle: 42, rose: 57, moon: 198, moonNight: 170, nest: 42, rod: 85, house: 57, gallery: 68, sundial: 85, lantern: 141 };
const ROSE_KEEP = 8, STREAK = 6, XS_RUN = 8, FILLER_AFTER = DEMO ? 2 : 3;
const WIDE_RUN = 15, SUN_STREAK = 8;
const A = 0.65, C = 0.4, XS = 0.22; // facade.js's width classes, as shares of the full side
const ROSE = 0.69; // the rose's floors' plan at least this wide: its dentil ring clears the lesenes (ornaments.js clearOf)
const shareOf = known => j => Math.min(known[j].w, known[j].d) / SIZE; // floor j's width, a share of the full side
const night = () => { const h = new Date().getHours(); return h >= 21 || h < 7; };

// one run's plan; known: the slabs as built, bottom up (facade.js)
export function createOrnamentPlan(isNight = night()) {
  const done = new Set();
  let plain = 0, family = null; // bare floors in a row; the last face piece's family (no two in a row of one)
  const run = (i, ok) => { let k = 0; for (let j = i; j >= 0 && ok(j); j--) k++; return k; };
  const perfect = (known, j) => j > 0 && known[j].w === known[j - 1].w; // a perfect drop keeps the side whole (rules.js)
  const best = (known, ok) => { let k = 0, most = 0; for (let j = 0; j < known.length; j++) most = Math.max(most, k = ok(j) ? k + 1 : 0); return most; };
  const earned = {
    F1: known => best(known, j => perfect(known, j)) >= STREAK,
    F8: known => { const share = shareOf(known); return best(known, j => share(j) >= XS && share(j) < C) >= XS_RUN; },
    H3: known => best(known, j => j >= FROM.sundial && perfect(known, j)) >= SUN_STREAK,
  };
  const once = id => done.add(id); // truthy
  // a piece carved or hung on the wall, no opening: plain courses under it, floors of them, none of them plain for the
  // fillers (an oculus would open behind it)
  const wall = (id, floors) => { once(id); plain = -floors; return { id, floors }; };
  return {
    // a window's slot at floor i (its set, room(n): n floors there flat and clear, clock: the clock is laid, plan: the
    // plan it wears, its body's, narrower than its slab at times) → the piece that takes it, an opening { name, set, id }
    // or one on the wall { id, floors }, or null for the plain window. Rarest first; each once a run
    slot(i, known, set, room, clock, plan = known[i]) {
      const share = shareOf(known), s = share(i), worn = Math.min(plan.w, plan.d) / SIZE;
      if (!done.has('G6') && i >= (isNight ? FROM.moonNight : FROM.moon) && room(2)) return once('G6') && { name: 'lluna', set, id: 'G6' };
      if (!done.has('A6') && i >= FROM.rose && set === 'A' && worn >= ROSE && run(i - 1, j => share(j) >= A) >= ROSE_KEEP && room(3)) return once('A6') && { name: 'rosassa', set, id: 'A6' };
      if (!done.has('F8') && earned.F8(known) && room(2)) return once('F8') && { name: 'candela', set, id: 'F8' };
      if (!done.has('A10') && clock && s >= C && set !== 'XS' && room(4)) return once('A10') && { name: 'escala', set, id: 'A10' };
      if (!done.has('H3') && earned.H3(known) && room(2)) return wall('H3', 2);
      if (!done.has('H1') && i >= FROM.house && s >= C && room(3)) return wall('H1', 3);
      return null;
    },
    // a string course's floor i: one piece on all four corners, the dragon gargoyle once it is earned (A or C), else the
    // lantern from FROM.lantern, else the drain gargoyles from FROM.gargoyle (a lantern earned with the dragon waits for
    // the next string course); the gallery round it; one set a bay (a string course comes every BAY floors)
    corners(i, known) {
      const share = shareOf(known), out = [];
      if (!done.has('F1') && earned.F1(known) && share(i) >= C && once('F1')) out.push('F1');
      else if (!done.has('H4') && i >= FROM.lantern && once('H4')) out.push('H4');
      else if (i >= FROM.gargoyle) out.push('B5');
      if (!done.has('H2') && run(i, j => j >= FROM.gallery && share(j) >= A) >= WIDE_RUN && once('H2')) out.push('H2');
      return out;
    },
    // the parapet's floor i (facade.js's remat, the topmost cornice): E1's stork nests on its gable on the camera's wall
    // when it stands at 74 m or over on a tower still A or C wide at 74 m (a stork takes the highest ledge, a wide one)
    remat: (i, known) => (!done.has('E1') && i >= FROM.nest && shareOf(known)(FROM.nest) >= C && once('E1') ? ['E1'] : []),
    // a floor after FILLER_AFTER bare ones: the oculus or the sawtooth frieze, never the last face piece's family
    filler: () => (plain >= FILLER_AFTER ? (family === 'A' ? 'serra' : 'ocul') : null),
    // floor i has settled wearing key: count the bare floors, remember the face piece's family
    after(key) {
      plain = /\/(fust|faixa|espitllera)/.test(key) ? plain + 1 : 0;
      if (/\/(ocul|rosassa|escala)/.test(key)) family = 'A';
      else if (/\/serra/.test(key)) family = 'B';
      else if (/\/(candela)/.test(key)) family = 'F';
      else if (/\/(lluna)/.test(key)) family = 'G';
    },
  };
}
