// Catalogue attribution: complete information labels, compact carousel credits and their marks.
import { townOf } from '../game/figures.js';
import { escutSvg } from './escuts.js';
import { PESSIGOLLA_MARK } from './pessigolla-logo.js';
import { UAF_FLAME } from './uaf-logo.js';
import { TURBA_MARK, CALCOT_MARK } from './bou-valls-logos.js';

const entityText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const entityLabel = f => f.owner && f.manager ? `${f.owner} + ${f.manager}` : f.entityName || f.entity || townOf(f).name;
const ENTITY_MARK = { UAF: UAF_FLAME, 'La Pessigolla': PESSIGOLLA_MARK }; // i18n-ok: entity names are proper names
// a joint figure's two marks, by the full names in its owner and manager
const PART_MARK = { 'Casal Popular La Turba': TURBA_MARK, 'Colla Gegantera El Calçot-AAEET': CALCOT_MARK }; // i18n-ok: proper names
const entityPart = (mark, name) => `<span class="sel-entity-part">${mark}<span>${entityText(name)}</span></span>`;
export function entityHtml(f) {
  if (!f.owner || !f.manager) return ENTITY_MARK[f.entity] ? `${ENTITY_MARK[f.entity]}<span>${entityText(entityLabel(f))}</span>` : entityText(entityLabel(f));
  const owner = entityPart(f.owner.startsWith('Ajuntament') ? escutSvg(f.town) : PART_MARK[f.owner] || '', f.owner);
  const manager = entityPart(f.entity === 'Ajuntament + UAF' ? UAF_FLAME : ENTITY_MARK[f.entity] || PART_MARK[f.manager] || '', f.manager);
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
  : f.entity === 'La Turba + El Calçot' ? `<small class="sel-entity-icons" aria-hidden="true"><span>${TURBA_MARK}La Turba</span><span><span class="sel-entity-plus">+</span>${CALCOT_MARK}El Calçot</span></small>` // i18n-ok: proper names
  : f.entity === 'La Pessigolla' ? `<small class="sel-entity-icons" aria-hidden="true"><span>${PESSIGOLLA_MARK}La Pessigolla</span></small>` // i18n-ok: proper name
  : `<small>${entityText(f.entity || townOf(f).name)}</small>`;
