// Catalogue attribution: complete information labels, compact carousel credits and their marks.
import { townOf } from '../game/figures.js';
import { escutSvg } from './escuts.js';
import { PESSIGOLLA_MARK } from './pessigolla-logo.js';

const entityText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Reuse the UAF's flame already shown in the game's credits, in its original red.
const UAF_FLAME = `<svg viewBox="0 0 525 829" aria-hidden="true"><path transform="matrix(.1 0 0 -.1 0 829)" d="M1988 8232 c-19 -11 -28 -25 -28 -42 0 -115 -67 -432 -133 -625 -134 -399 -258 -618 -849 -1497 -464 -693 -665 -1089 -806 -1593 -139 -492 -170 -1065 -86 -1565 72 -427 274 -961 493 -1297 l60 -93 68 26 c113 42 257 105 270 117 10 10 2 30 -37 94 -240 398 -413 874 -481 1323 -53 343 -23 835 72 1215 129 511 317 871 875 1676 468 675 698 1121 824 1597 6 23 16 42 22 42 27 0 481 -356 713 -560 1248 -1092 1846 -2225 1846 -3500 0 -1498 -849 -2605 -2488 -3245 -68 -26 -123 -53 -123 -60 0 -21 237 -128 409 -184 l63 -21 97 41 c1183 504 1994 1352 2295 2400 239 834 182 1773 -159 2634 -428 1081 -1374 2138 -2713 3033 -163 110 -163 110 -204 84z M2553 5408 c-506 -474 -762 -905 -864 -1458 -30 -159 -37 -514 -14 -685 43 -323 177 -683 335 -898 l50 -67 43 26 c99 62 247 201 247 232 0 5 -23 47 -50 93 -248 417 -313 948 -175 1429 75 260 208 495 415 729 39 45 77 81 84 81 28 0 230 -252 317 -397 266 -439 328 -1017 164 -1508 -231 -689 -899 -1268 -2012 -1745 -95 -40 -173 -75 -173 -78 0 -11 147 -166 210 -222 l69 -62 128 57 c1268 566 1990 1248 2197 2073 88 352 85 775 -9 1136 -77 296 -233 596 -455 876 -98 124 -410 440 -434 440 -10 0 -42 -24 -73 -52z"/></svg>`;
export const entityLabel = f => f.owner && f.manager ? `${f.owner} + ${f.manager}` : f.entityName || f.entity || townOf(f).name;
const ENTITY_MARK = { UAF: UAF_FLAME, 'La Pessigolla': PESSIGOLLA_MARK };
const entityPart = (mark, name) => `<span class="sel-entity-part">${mark}<span>${entityText(name)}</span></span>`;
export function entityHtml(f) {
  if (!f.owner || !f.manager) return ENTITY_MARK[f.entity] ? `${ENTITY_MARK[f.entity]}<span>${entityText(entityLabel(f))}</span>` : entityText(entityLabel(f));
  const owner = entityPart(f.owner.startsWith('Ajuntament') ? escutSvg(f.town) : '', f.owner);
  const manager = entityPart(f.entity === 'Ajuntament + UAF' ? UAF_FLAME : ENTITY_MARK[f.entity] || '', f.manager);
  return `<span class="sel-entity-unit">${owner}</span><span class="sel-entity-unit"><span class="sel-entity-plus"> + </span>${manager}</span>`;
}
// Selection, resize and font readiness already measure the panel. Keep wrapped labels compact before fitting its title.
export function fitEntityLabel(entity) {
  if (!entity) return;
  entity.toggleAttribute('data-stacked', false);
  const units = entity.querySelectorAll('.sel-entity-unit');
  if (units.length === 2 && Math.abs(units[0].getBoundingClientRect().top - units[1].getBoundingClientRect().top) > 1) entity.toggleAttribute('data-stacked', true);
}
export const cardEntityHtml = f => f.entity === 'UAF' || f.entity === 'Ajuntament + UAF'
  ? `<small class="sel-entity-icons" aria-hidden="true">${f.entity === 'Ajuntament + UAF' ? `<span>${escutSvg('valls')}Ajuntament</span>` : ''}<span>${f.entity === 'Ajuntament + UAF' ? '<span class="sel-entity-plus">+</span>' : ''}${UAF_FLAME}UAF</span></small>`
  : f.entity === 'La Pessigolla' ? `<small class="sel-entity-icons" aria-hidden="true"><span>${PESSIGOLLA_MARK}La Pessigolla</span></small>`
  : `<small>${entityText(f.entity || townOf(f).name)}</small>`;
