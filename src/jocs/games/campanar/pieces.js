// The collection of special pieces (collection.js ORNAMENTS; Fable's review, Marc's pick 27 Nov 2026): what this device
// has ever earned (kept across runs), which of those it has already been shown (a first find's toast or this sheet: kept
// apart, so a find the end hid still comes as new), and this run's finds with the height each stands at. Its sheet lists
// them all: the owned ones, this run's new ones marked, the missing ones as «?» with how to earn them; a tap on one of
// this run's sends the end's camera to it (main.js).
import { store } from '#plassa/storage.js';
import { ORNAMENTS, RARITY, GLYPHS } from './collection.js';

const OWNED = 'campanar-owned', SEEN = 'campanar-seen';
export const TOTAL = Object.keys(ORNAMENTS).length;

// a piece's disc (the band's, the toast's, the sheet's): its drawn icon, or its line drawing while it has none
export function orb(id) {
  const el = document.createElement('span');
  el.className = 'orb';
  el.style.setProperty('--tint', RARITY[ORNAMENTS[id].rarity].tint);
  if (GLYPHS[id]) el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[id]}</svg>`;
  else el.append(Object.assign(new Image(), { src: `/jocs/campanar/elements/${id}.png`, alt: '', decoding: 'async' }));
  return el;
}

// remember: keep what this device earned and saw (?vitrina: nothing, every run starts from none)
export function createPieces({ remember = true } = {}) {
  const load = key => { try { return new Set(remember ? (JSON.parse(store.get(key)) ?? []).filter(id => ORNAMENTS[id]) : []); } catch { return new Set(); } };
  const seen = load(SEEN), owned = new Set([...load(OWNED), ...seen]); // seen before owned was kept: owned too
  const run = new Map(), fresh = new Set(); // this run's: id → its height (scene.js); the ones it earned first
  const save = (key, set) => { if (remember) store.set(key, JSON.stringify([...set])); };
  return {
    // a piece settled at height y: null if not a piece or already this run's, else { first: never shown before }
    find(id, y) {
      if (!ORNAMENTS[id] || run.has(id)) return null;
      run.set(id, y);
      if (!owned.has(id)) { owned.add(id); fresh.add(id); save(OWNED, owned); }
      return { first: !seen.has(id) };
    },
    // it has been on screen (its toast, the sheet): never new again
    shown(id) { if (!seen.has(id)) { seen.add(id); save(SEEN, seen); } },
    at: id => run.get(id),
    get count() { return owned.size; },
    reset() {
      run.clear(); fresh.clear();
      if (!remember) { owned.clear(); seen.clear(); } // ?vitrina: each run from none
    },
    // fill the sheet: the count, a line on this run (ran: there is one to tell), the grid; pick(id) for this run's pieces
    // (null: none to pick, the home's sheet)
    fill(countEl, runEl, grid, ran, pick) {
      countEl.textContent = `${owned.size}/${TOTAL}`;
      runEl.hidden = !ran;
      const many = `${run.size} ${run.size === 1 ? 'peça' : 'peces'}`, fresh1 = fresh.size ? `, ${fresh.size} de ${fresh.size === 1 ? 'nova' : 'noves'}` : ''; // i18n-ok: POC placeholder
      const tap = pick ? ' Toca’n una per veure-la a la torre.' : ''; // i18n-ok: POC placeholder
      runEl.textContent = !run.size ? 'Aquesta partida no ha fet cap peça.' : `En aquesta partida: ${many}${fresh1}.${tap}`; // i18n-ok: POC placeholder
      grid.replaceChildren(...Object.keys(ORNAMENTS).map(id => {
        const has = owned.has(id), here = pick && run.has(id), cell = document.createElement(here ? 'button' : 'div');
        cell.className = `piece${has ? '' : ' missing'}`;
        if (here) { cell.type = 'button'; cell.addEventListener('click', () => pick(id)); }
        const name = document.createElement('b');
        if (has) {
          cell.append(orb(id));
          name.textContent = ORNAMENTS[id].name;
          if (fresh.has(id)) cell.append(Object.assign(document.createElement('em'), { textContent: 'NOU' })); // i18n-ok: POC placeholder
          this.shown(id);
        } else {
          cell.append(Object.assign(document.createElement('span'), { className: 'orb empty', textContent: '?' }));
          name.textContent = ORNAMENTS[id].hint;
        }
        cell.append(name);
        return cell;
      }));
    },
  };
}
