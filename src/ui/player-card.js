// A player's public card (#card-menu, decision 18; the owner's «Fitxa breu»): opened by tapping a name on a board or a podium.
// The name with its check or «Convidat», the row it was tapped on (when the opener passes it), then the public statistics
// (src/ui/stats-view.js: four facts, the podiums as achievements, «Més estadístiques» unfolding the rest; never days,
// streaks, errors per kind or dates) and a quiet line saying where the numbers come from. Loading, «no data» and errors
// sit inside the sheet's fixed box.
import { byId, num, posDisc } from './sheet-kit.js';
import { tr } from '../i18n/messages.js';
import { mulaSpinner } from './loader.js';
import { appendName, GUEST } from './profile-notes.js';
import { statsData, renderStats, icon, FIGURE_NAMES } from './stats-view.js';
import { figureSeasons, boardName } from './seasons-ui.js';
import { pixelSvg } from './select-strip.js';
import { FIGURES, portraitArt, portraitPalette } from '../game/figures.js';
import { DIFFS } from '../game/chart.js';
import { figureOfVersion } from '../figures/index.js';

export function setupCard({ focusIn, service, doc = document, now = () => Date.now(), minLoad = 600 }) {
  const $ = byId(doc), menu = $('card-menu'), head = $('card-name'), kind = $('card-kind'), from = $('card-from'), box = $('card-stats'), status = $('card-status');
  const retry = $('card-retry');
  let req = 0, back = null, who = null;
  function say(text, { spin = false, again = false, empty = false } = {}) {
    status.textContent = text; retry.hidden = !again; status.parentElement.hidden = !text;
    if (spin) status.prepend(mulaSpinner(doc));
    if (empty) status.prepend(icon(doc, 'bars')); // dotted bars: nothing counted yet
  }
  // «a Tardor 2026 · Mulassa»: the season's name from the hall (get_seasons) of each figure the podiums are on
  async function podiumLines(list) {
    const out = [];
    for (const p of list) {
      const figure = figureOfVersion(p.version);
      const e = (await figureSeasons(service, figure, now()).catch(() => [])).find(x => x.seasonId === p.seasonId && x.version === p.version);
      out.push({ position: p.position, place: num(p.position), text: tr('ui.stats.podiumAt', { season: e?.name ?? tr('ui.card.aSeason'), board: e ? boardName(figure, e) : FIGURE_NAMES[figure] }) });
    }
    return out;
  }
  async function load() {
    const r = ++req;
    box.replaceChildren();
    say(tr('ui.card.loading'), { spin: true });
    const shown = minLoad > 0 ? new Promise(res => setTimeout(res, minLoad)) : null;
    let card, podiums = [];
    try {
      card = await service.playerCard(who.alias, who.tag ?? null);
      if (card?.podiums.length) podiums = await podiumLines(card.podiums);
    } catch (e) {
      await shown; if (r !== req || !menu.open) return;
      say(e?.message || tr('ui.card.loadFailed'), { again: true }); return;
    }
    await shown; if (r !== req || !menu.open) return;
    if (card) paintName(card);
    const d = card && statsData(card.totals);
    if (!d?.runs) { say(tr('ui.card.noStats'), { empty: true }); return; }
    say('');
    renderStats(doc, box, d, { podiums });
  }
  // the name from the first frame (what was tapped), the server's answer after
  function paintName(p) {
    head.replaceChildren();
    appendName(doc, head, p);
    const guest = Number.isInteger(p.tag);
    kind.hidden = !guest; kind.textContent = guest ? GUEST : '';
  }
  // the board row it came from: the figure, the season, the place, the points and the level (information: flat, a strip)
  function paintFrom(f) {
    from.replaceChildren(); from.hidden = !f;
    if (!f) return;
    const figure = FIGURES.find(x => x.id === f.figure), el = (tag, cls, text = '') => { const e = doc.createElement(tag); e.className = cls; e.textContent = text; return e; };
    const pic = el('span', 'card-from-pic');
    if (figure) pic.innerHTML = pixelSvg(portraitArt(figure), portraitPalette(figure), '#2a1a10');
    const v = el('span', 'card-from-v'), pos = Number(f.position), level = DIFFS[Number(f.difficulty)]?.name;
    v.append(posDisc(doc, pos), el('b', 'pts', tr('ui.card.points', { score: num(f.score) })));
    if (level) v.appendChild(el('span', `lvl lvl${Number(f.difficulty)}`, level));
    const t = el('span', 'card-from-t');
    t.append(el('span', 'card-from-k', [FIGURE_NAMES[f.figure], f.season].filter(Boolean).join(' · ')), v);
    from.append(pic, t);
  }
  retry.addEventListener('click', () => { load(); focusIn(menu, 'card-close'); });
  $('card-close').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => { req++; const b = back; back = null; b?.(); });
  return {
    // p: { alias (without the tag), tag (null: a clean name), verified, from? }. from: the row tapped, as the board has it
    // ({ figure, season (its name), position, score, difficulty }); no from (a podium, a link): no row.
    open(p, onBack = null) {
      if (!service.configured || !p?.alias) return;
      who = { alias: String(p.alias), tag: Number.isInteger(p.tag) ? p.tag : null, verified: p.verified === true };
      back = onBack;
      paintName(who);
      paintFrom(Number.isInteger(Number(p.from?.position)) && p.from.position > 0 ? p.from : null);
      if (!menu.open) menu.showModal();
      focusIn(menu, 'card-close');
      menu.querySelector?.('.sheet-body')?.scrollTo?.(0, 0);
      load();
    },
    get isOpen() { return menu.open; },
  };
}
