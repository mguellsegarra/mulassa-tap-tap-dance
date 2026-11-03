import LEVELS_DATA from './levels.json';
import { PLANS } from './plans.js';
import { OBJECT, boardOf, culpritOf, deduce, caseStamp, hintFor, isSolution, lineFree, peopleOf, restore } from './rules.js';
import { figureArt, floorUrl, objectArt, thingArt } from './art.js';
import { CASES, CLUES, FIGURE_NAMES, OBJECT_NAMES, OBJECT_SHORT, PART_NAMES, THING_NAMES, THING_ONE, UI } from './text.js';
import { store } from '../../../platform/storage.js';

const KEY = 'murdoku-progress-2';
const MARK = 'mark';
const LEVELS = LEVELS_DATA.map(l => ({ ...PLANS.find(p => p.id === l.id), ...l }));
const $ = id => document.getElementById(id);
const progress = (() => { try { return { done: {}, cases: {}, ...JSON.parse(store.get(KEY)) }; } catch { return { done: {}, cases: {} }; } })();
const save = () => store.set(KEY, JSON.stringify(progress));
const isDone = l => progress.done[l.id] === caseStamp(l); // solved this exact version of the case

let level, board, at, marks, tool = null, history = [], glow = null;
const partOf = z => level.parts[z];
const zoneName = z => PART_NAMES[partOf(z).key];
const floorStyle = z => `--floor:url(${floorUrl(partOf(z).floor)})`;
const zonePill = z => `<span class="pill"><i style="${floorStyle(z)}"></i>${zoneName(z)}</span>`;
const nameOf = who => who === OBJECT ? OBJECT_SHORT[level.object] : FIGURE_NAMES[who];
const artOf = who => who === OBJECT ? objectArt(level.object) : figureArt(who);
const person = who => `<span class="who">${artOf(who)}${nameOf(who)}</span>`;
// With several of a thing on the map a clue means any of them, so it says "una cadira", never "la cadira".
const thing = id => `<span class="who">${thingArt(id)}${Object.values(level.things).filter(t => t === id).length > 1 ? THING_ONE[id] : THING_NAMES[id]}</span>`;
const cluePhrase = cl => CLUES[cl.t]({ zone: cl.zone && zonePill(cl.zone), thing: cl.thing && thing(cl.thing), other: cl.other && person(cl.other) });
const cardOf = who => level.clues.filter(c => c.who === who).map(cluePhrase).join(' i ');
const allPlaced = () => peopleOf(level).every(p => at[p] != null);
const answer = () => deduce(level);

// The guided case always asks for the next piece the clues settle, so it needs no state of its own.
const guideStep = () => {
  if (!level.guided || isDone(level)) return null;
  const { order, at: right } = answer();
  const who = order.find(p => at[p] !== right[p]);
  return who ? { who, cell: right[who] } : null;
};

function paint() {
  const placedAt = new Map(Object.entries(at).map(([who, i]) => [i, who]));
  const held = tool && tool !== MARK ? tool : null;
  const step = guideStep();
  for (const a of board.cells) {
    const b = $('board').children[a.i], who = placedAt.get(a.i);
    b.classList.toggle('marked', marks.includes(a.i) && !who);
    const shut = !!held && a.free && !who && !lineFree(board.cells, at, held, a.i);
    b.classList.toggle('blocked-line', shut);
    b.classList.toggle('glow', glow === a.i || (!!step && tool === step.who && step.cell === a.i));
    b.setAttribute('aria-disabled', shut);
    b.querySelector('.piece').innerHTML = who ? artOf(who) : '';
    const base = UI.cell(a.r + 1, a.c + 1, zoneName(a.zone));
    const state = who ? nameOf(who) : marks.includes(a.i) ? UI.marked : a.thing ? THING_NAMES[a.thing] : '';
    b.setAttribute('aria-label', state ? `${base}: ${state}` : base);
  }
  for (const b of $('tray').children) {
    const id = b.dataset.who;
    b.setAttribute('aria-pressed', tool === id);
    b.classList.toggle('used', id in at);
    b.classList.toggle('glow', !!step && step.who === id && tool !== id);
  }
  for (const li of $('clues').children) li.classList.toggle('on', li.dataset.who === (step?.who ?? held));
  $('undo').disabled = !history.length;
  const done = allPlaced();
  const culprit = done ? culpritOf(level, at) : null;
  $('accuse').hidden = !done;
  $('accuse').textContent = culprit ? UI.accuse(FIGURE_NAMES[culprit]) : UI.noCulprit;
  $('accuse').disabled = !culprit;
  const note = step ? UI.guide(nameOf(step.who), cardOf(step.who) || UI.guideLine) : done && level.guided && !isDone(level) ? UI.guideCulprit : '';
  $('hint').innerHTML = note;
  $('hint').hidden = !note;
  progress.cases[level.id] = { stamp: caseStamp(level), at, marks };
  save();
}

const remember = () => { history.push({ at: { ...at }, marks: [...marks] }); };

function tap(i) {
  const a = board.cells[i];
  const here = Object.keys(at).find(who => at[who] === i);
  const step = guideStep();
  glow = null;
  if (tool === MARK) {
    if (here || !a.free) return;
    remember();
    marks = marks.includes(i) ? marks.filter(x => x !== i) : [...marks, i];
  } else if (here) {
    if (step) return;
    remember();
    delete at[here]; // pick it back up: a wrong piece moves in one tap
    tool = here;
  } else if (tool && a.free && lineFree(board.cells, at, tool, i)) {
    if (step && i !== step.cell) return;
    remember();
    at[tool] = i;
    marks = marks.filter(x => x !== i);
    tool = null;
  } else return;
  paint();
  $('live').textContent = $('board').children[i].getAttribute('aria-label');
}

function accuse() {
  if (!isSolution(level, at)) { $('hint').textContent = $('live').textContent = UI.wrong; $('hint').hidden = false; return; }
  progress.done[level.id] = caseStamp(level);
  save();
  const who = culpritOf(level, at), next = LEVELS[LEVELS.indexOf(level) + 1];
  showSheet({ title: CASES[level.id].title, art: figureArt(who) + objectArt(level.object), msg: UI.solved(FIGURE_NAMES[who], OBJECT_NAMES[level.object]),
    action: next ? { label: UI.next, run: () => openCase(next) } : null, cases: !next, note: next ? '' : UI.allDone });
}

function hint() {
  const h = hintFor(level, at);
  if (!h) return;
  if (h.type === 'wrong') { glow = at[h.who]; $('hint').textContent = UI.hintWrong(nameOf(h.who)); }
  else { glow = h.cell; tool = h.who; $('hint').textContent = UI.hintNext(nameOf(h.who)); }
  const text = $('hint').textContent;
  paint();
  $('hint').textContent = $('live').textContent = text;
  $('hint').hidden = false;
}

function undo() {
  const last = history.pop();
  if (!last) return;
  ({ at, marks } = last);
  tool = null;
  glow = null;
  paint();
}

function start(next) {
  level = next;
  board = boardOf(level);
  ({ at, marks } = restore(level, progress.cases[level.id]));
  tool = null; history = []; glow = null;
  $('case').textContent = `${LEVELS.indexOf(level) + 1}. ${CASES[level.id].title}`;
  $('board').style.setProperty('--n', board.n);
  const zoneAt = (r, c) => level.zones[r]?.[c];
  const labelled = new Set();
  $('board').innerHTML = board.cells.map(a => {
    const edges = [['t', a.r - 1, a.c], ['r', a.r, a.c + 1], ['b', a.r + 1, a.c], ['l', a.r, a.c - 1]].filter(([, r, c]) => zoneAt(r, c) && zoneAt(r, c) !== a.zone).map(([e]) => `e-${e}`).join(' ');
    const first = !labelled.has(a.zone) && !a.thing;
    if (first) labelled.add(a.zone);
    return `<button type="button" class="cell ${edges}" style="${floorStyle(a.zone)}" data-i="${a.i}">${a.thing ? `<span class="thing">${thingArt(a.thing)}</span>` : ''}${first ? `<span class="zlabel">${zoneName(a.zone)}</span>` : ''}<span class="piece"></span></button>`;
  }).join('');
  $('tray').innerHTML = [...peopleOf(level), MARK].map(who => who === MARK
    ? `<button type="button" class="chip mark" data-who="${MARK}" aria-label="${UI.mark}">✕</button>`
    : `<button type="button" class="chip" data-who="${who}" aria-label="${nameOf(who)}">${artOf(who)}</button>`).join('');
  $('clues').innerHTML = peopleOf(level).map(who => `<li data-who="${who}"><span class="face">${artOf(who)}</span><span class="say"><b>${nameOf(who)}</b> ${cardOf(who)}</span></li>`).join('');
  paint();
}

function openCase(next) {
  start(next);
  showSheet({ title: CASES[level.id].title, msg: `${CASES[level.id].place}. ${CASES[level.id].story(OBJECT_NAMES[level.object])}`, note: UI.rule, action: { label: UI.investigate, run: () => {} } });
}

function showSheet({ title = '', msg = '', art = '', note = '', action = null, cases = false }) {
  $('title').textContent = title;
  $('msg').textContent = msg;
  $('rule').textContent = note;
  $('rule').hidden = !note;
  $('hero').innerHTML = art;
  $('hero').hidden = !art;
  $('next').hidden = !action;
  if (action) { $('next').textContent = action.label; $('next').onclick = () => { $('sheet').close(); action.run(); }; }
  $('levels').hidden = !cases;
  $('back').hidden = !cases;
  if (cases) $('levels').innerHTML = LEVELS.map((l, i) => `<button type="button" class="btn lvl${isDone(l) ? ' done' : ''}" data-id="${l.id}"><span>${i + 1}. ${CASES[l.id].title}</span><small>${l.zones.length}×${l.zones.length}</small></button>`).join('');
  $('sheet').showModal();
  $('sheet').focus();
}

$('board').addEventListener('click', e => { const b = e.target.closest('.cell'); if (b) tap(+b.dataset.i); });
$('tray').addEventListener('click', e => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const id = b.dataset.who, step = guideStep();
  if (step && id !== step.who) return;
  glow = null;
  if (id !== MARK && id in at) { remember(); delete at[id]; } // choosing a placed piece lifts it
  tool = tool === id ? null : id;
  paint();
  if (tool && tool !== MARK) document.querySelector(`#clues li[data-who="${tool}"]`)?.scrollIntoView({ block: 'nearest' });
});
$('levels').addEventListener('click', e => {
  const b = e.target.closest('[data-id]');
  if (!b) return;
  $('sheet').close();
  openCase(LEVELS.find(l => l.id === b.dataset.id));
});
$('undo').addEventListener('click', undo);
$('hintbtn').addEventListener('click', hint);
$('accuse').addEventListener('click', accuse);
const showMenu = () => showSheet({ title: 'Mulassoku', msg: UI.menu, note: UI.rule, cases: true });
$('menu').addEventListener('click', showMenu);
$('sheet').addEventListener('cancel', e => { if (!level || !$('next').hidden) e.preventDefault(); }); // Esc can't skip a case's opening or the reveal

// A deep link for reviews: ?cas=oli opens that case straight away.
const asked = LEVELS.find(l => l.id === new URLSearchParams(location.search).get('cas'));
if (asked) start(asked); else showMenu();
