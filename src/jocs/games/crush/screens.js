// The screens around a game: the title and the Seguici's route through Valls. Plain DOM over the canvas, which they hide.
import { T } from './copy.js';
import { SEGUICI, LEVELS } from './levels.js';

const PAD = 72; // px clear of the route's two ends
// Where a stop's number sits: % of the width, its portrait hanging to the right. A wide screen sweeps across more of its width.
const NARROW = { step: 120, xs: [16, 58] };
const WIDE = { step: 88, xs: [8, 30, 54, 76, 54, 30] };
const wideQuery = matchMedia('(min-width: 800px)');
const shape = () => (wideQuery.matches ? WIDE : NARROW);
export const figureSrc = name => `/jocs/crush/cards/${name}.png`;
export const figureImg = name => `<img src="${figureSrc(name)}" alt="">`;

const stopY = i => PAD + i * shape().step;
const stopX = i => shape().xs[i % shape().xs.length];

function routePath() {
  let d = `M ${stopX(0)} ${stopY(0)}`;
  for (let i = 1; i < LEVELS.length; i++) {
    const bend = shape().step * .75;
    d += ` C ${stopX(i - 1)} ${stopY(i - 1) + bend} ${stopX(i)} ${stopY(i) - bend} ${stopX(i)} ${stopY(i)}`;
  }
  return d;
}

export function createScreens(stage, { leave, settings, pick, isOpen, nextIndex, starsOf }) {
  const box = document.createElement('div');
  box.className = 'crush-screen';
  stage.append(box);
  const icon = (label, text, fn) => {
    const b = document.createElement('button');
    b.className = 'crush-icon';
    b.setAttribute('aria-label', label);
    b.textContent = text;
    b.onclick = fn;
    return b;
  };
  const bar = (back, title) => {
    const top = document.createElement('div');
    top.className = 'crush-bar-top';
    const name = document.createElement('strong');
    name.textContent = title;
    top.append(icon(T.back, '‹', back), name, icon(T.settings, '⚙', settings));
    return top;
  };
  const action = (label, fn, cls = 'btn') => {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.onclick = fn;
    return b;
  };

  function title() {
    box.hidden = false;
    box.className = 'crush-screen crush-title';
    const hero = document.createElement('div');
    hero.className = 'crush-hero';
    hero.innerHTML = `<h1 class="crush-logo">${T.title.replace(' ', '<br>')}</h1><img class="crush-hero-art" src="${figureSrc('mulassa')}" alt="">
      <p class="crush-pill">${T.tagline}</p><div class="crush-row">${SEGUICI.map(figureImg).join('')}</div>`;
    const actions = document.createElement('div');
    actions.className = 'crush-actions';
    actions.append(action(T.start, map), action(T.howTo, settings, 'btn alt'));
    box.replaceChildren(bar(leave, ''), hero, actions);
  }

  function map() {
    box.hidden = false;
    box.className = 'crush-screen crush-map';
    const next = nextIndex(), height = stopY(LEVELS.length - 1) + PAD + 64;
    const scroller = document.createElement('div');
    scroller.className = 'crush-route';
    const road = document.createElement('div');
    road.className = 'crush-road';
    road.style.height = `${height}px`;
    const d = routePath();
    // the plan of the town fills the screen; the route keeps a width it can be read at
    road.innerHTML = `<div class="crush-lane"><svg viewBox="0 0 100 ${height}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" class="lane"/></svg></div>`;
    const lane = road.firstChild;
    road.insertAdjacentHTML('beforeend', `<a class="crush-osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">${T.mapCredit}</a>`);
    LEVELS.forEach((level, i) => {
      const stop = document.createElement('div');
      stop.className = `crush-stop${i === next ? ' now' : ''}`;
      stop.style.left = `${stopX(i)}%`;
      stop.style.top = `${stopY(i)}px`;
      if (i > next) stop.classList.add('later');
      const b = document.createElement('button');
      b.className = 'crush-portrait';
      b.innerHTML = `${figureImg(level.goal)}<b>${i + 1}</b>`;
      b.disabled = !isOpen(i);
      b.setAttribute('aria-label', `${T.level} ${i + 1}, ${T.names[level.goal]}`);
      b.onclick = () => pick(i);
      const stars = document.createElement('i');
      stars.textContent = '★'.repeat(starsOf(i));
      stop.append(b, stars);
      lane.append(stop);
    });
    scroller.append(road);
    box.replaceChildren(bar(title, T.mapTitle), scroller);
    scroller.scrollTop = stopY(next) - scroller.clientHeight / 2;
  }

  wideQuery.addEventListener('change', () => { if (!box.hidden && box.classList.contains('crush-map')) map(); });
  return { title, map, hide() { box.hidden = true; } };
}
