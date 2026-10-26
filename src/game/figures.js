// Catalog metadata lives in JSON; only the two integrated songs are playable.
import { tr } from '../i18n/messages.js';
import figureCatalog from './figure-catalog.json' with { type: 'json' };
import { bestRecord, recordPointsKey, saveRecord } from './records.js';
import { CURRENT_SCORE_VERSION, DRAC_SCORE_VERSION, BOU_SCORE_VERSION } from './score-scale.js';
import { FIGURE_PORTRAITS } from './figure-portraits.js';
import { MOCK_BOARD } from '../core/mock-board.js';
import { PLAYABLE_IDS } from '../figures/index.js';
// Valls first, the rest alphabetical by Catalan name, so the catalogue grows without a hand-kept order.
const byTown = (a, b) => (a.id === 'valls' ? -1 : b.id === 'valls' ? 1 : a.name.localeCompare(b.name, 'ca'));
export const TOWNS = [...figureCatalog.towns].sort(byTown);
const playableSongs = {
  // i18n-ok: song titles and composers are proper names
  'mulassa-valls': { song: 'Ball de la Mulassa', composer: 'Francesc Bofarull i Figuerola', year: 1987, version: CURRENT_SCORE_VERSION },
  'drac-valls': { song: 'Ball del Drac', composer: 'Francesc Bofarull i Figuerola', year: 1985, version: DRAC_SCORE_VERSION },
  // the UAF's Bou Tradicional (2012), not the Turba's; no board yet: its version is not publishable (leaderboard-rules.js)
  'bou-tradicional-valls': { song: 'Ball del Bou', composer: 'Francesc Bofarull i Figuerola', year: 2012, version: BOU_SCORE_VERSION, noBoard: true },
};
const townRank = f => TOWNS.findIndex(t => t.id === f.town);
// Hidden entries keep their catalog data and portraits but cannot enter selector navigation.
export const FIGURES = figureCatalog.figures.filter(f => f.selectorVisible !== false).map(f => ({
  ...f, status: playableSongs[f.id] && PLAYABLE_IDS.includes(f.id) ? 'playable' : 'aviat', ...playableSongs[f.id],
})).sort((a, b) => Number(b.status === 'playable') - Number(a.status === 'playable') || townRank(a) - townRank(b)); // stable: each town keeps its catalogue order
export const MULASSA = FIGURES.find(f => f.id === 'mulassa-valls');
export const DRAC = FIGURES.find(f => f.id === 'drac-valls');
export const BOU = FIGURES.find(f => f.id === 'bou-tradicional-valls');
// The strip's last card invites a colla to propose its figure: no real town, no song, outside FIGURES (records, board).
export const INVITE_TOWN = { id: 'el-teu-poble', name: tr('figures.invite.town'), color: '#c8202f' };
export const INVITE = { id: 'la-teva-colla', name: tr('figures.invite.name'), fullName: tr('figures.invite.name'), town: INVITE_TOWN.id, entity: tr('figures.invite.entity'), status: 'aviat', invite: true };
export const townOf = f => f.town === INVITE_TOWN.id ? INVITE_TOWN : TOWNS.find(t => t.id === f.town);
// «Població · Comarca» in Catalunya; elsewhere the island or the territory instead of the comarca (the data keeps them apart).
export const locationOf = f => { const t = townOf(f); return t?.comarca || t?.island ? `${t.name} · ${t.island || (t.territory && t.territory !== 'Catalunya' ? t.territory : t.comarca)}` : ''; };
export const playable = f => f.status === 'playable';
export const hasBoard = f => playable(f) && (!f.noBoard || MOCK_BOARD); // the mock boards have the Bou too; an online board (Classificació, the ranking line, publishing)
// Shown before the fold: the playable figures (an unreleased one, src/figures/index.js, waits behind the fold)
export const upFront = f => playable(f);

// «Aviat»: head, body, arms, legs; one colour, a silhouette
export const AVIAT_ART = ['...xxxxx...', '...xxxxx...', '...xxxxx...', '...xxxxx...', '....xxx....', '.xxxxxxxxx.', 'xxxxxxxxxxx', 'xx.xxxxx.xx', 'xx.xxxxx.xx', 'xx.xxxxx.xx', '...xxxxx...', '...xx.xx...', '...xx.xx...', '...xx.xx...', '..xxx.xxx..'];

// The level last picked for a figure, per figure (localStorage), NORMAL until there is one
export const LEVEL_DEFAULT = 1;
const levelKey = id => `level-${id}`;
export function rememberedLevel(store, id) {
  const v = store.get(levelKey(id));
  return ['0', '1', '2'].includes(v) ? Number(v) : LEVEL_DEFAULT;
}
export const rememberLevel = (store, id, level) => store.set(levelKey(id), String(level));
// A figure's record at a level on this device: the mulassa's per version (records.js), the others' per figure
export const recordKey = (figure, level) => figure.id === MULASSA.id ? recordPointsKey(level) : `record-${figure.id}-${level}`;

// The Mulassa's record is the current dance's only (the previous dance's: readPreviousDanceRecord); other figures keep their raw score.
export function readFigureRecord(store, figure, level) {
  if (figure.id === MULASSA.id) return bestRecord(store, level);
  try { return JSON.parse(store.get(recordKey(figure, level))) || null; } catch { return null; }
}
export function saveFigureRecord(store, figure, level, quality, rawScore, combo) {
  if (figure.id === MULASSA.id) saveRecord(store, level, quality, rawScore, combo);
  else store.set(recordKey(figure, level), JSON.stringify({ quality, score: rawScore, combo }));
}

// One message per grammatical number: the catalogue's `plural` flag picks it (gegants, guites), anything else is singular.
export const aviatText = figure => tr(figure.plural ? 'figures.pending.plural' : 'figures.pending.default');
// The Bústia's first words, from an «Aviat» card: the figure and its town (most full names already say the town).
export const aviatDraft = (figure, town) => { const name = figure.fullName || figure.name; return name.includes(town) ? tr('figures.pending.draftName', { name }) : tr('figures.pending.draftTown', { name, town }); };
export const inviteText = () => tr('figures.invite.text');
export const INVITE_DRAFT = tr('figures.invite.draft');

export const portraitArt = figure => FIGURE_PORTRAITS[figure.id]?.art ?? AVIAT_ART;
const UNKNOWN_PALETTE = { x: '#120b07' };
export const portraitPalette = figure => FIGURE_PORTRAITS[figure.id]?.palette ?? UNKNOWN_PALETTE;

// How tall each figure stands beside the others (the gegants = 1), so the selector shows them at roughly their real
// relative size whatever zoom their pixel art was drawn at. Set by eye with ?sizes (src/dev/sizes-edit.js), not measured.
export const STAND = {
  'mulassa-valls': 0.8, 'drac-valls': 0.7, 'aliga-valls': 0.8, 'bou-tradicional-valls': 0.65, 'os-trabucaires-valls': 0.65, 'nans-valls': 0.55,
  'gegants-ciutat-valls': 1, 'cavallets-valls': 0.55, 'basilisc-valls': 0.65, 'diables-valls': 0.8,
  'aliga-tarragona': 0.8, 'cucafera-tarragona': 0.65, 'gegants-mulassa-reus': 0.8, 'gegants-solsona': 1, 'drac-solsona': 0.8,
  'mulassa-solsona': 0.8, 'aliga-solsona': 0.8, 'gegants-bojos-solsona': 1, 'draca-solsona': 0.8, 'boja-vilanova': 0.8, 'drac-vilanova': 0.8, 'aliga-barcelona': 0.8,
  'guites-berga': 1, 'aliga-berga': 0.8, 'gegants-olot': 1, 'drac-vilafranca': 0.8, 'marraco-lleida': 0.8, 'drac-baluk-terrassa': 0.8, 'vibria-manresa': 0.8, 'drac-montblanc': 0.8, 'beatusaure-girona': 1.05, 'camell-molins': 1.1, 'filloxera-sant-sadurni': 0.8, 'momerota-mataro': 0.8, 'cucafera-tortosa': 0.6, 'gegants-pi-barcelona': 1.05, 'much-muca-sineu': 0.65, 'gegants-vinaros': 1.0, 'haca-traca-castello': 0.8, 'hamlet-bao': 0.7, 'gegants-fraga': 0.9, 'la-teva-colla': 1,
};
export const portraitStand = figure => STAND[figure.id] ?? 0.8;
// How heavily each figure lands in free mode (the Mulassa = 1): the one place that sets its «BUUUM» (audio.js thud),
// lower, longer and louder with it. The Drac carries the fire kit and its heavier frame.
export const FIGURE_WEIGHT = { 'mulassa-valls': 1, 'drac-valls': 1.5, 'bou-tradicional-valls': 1 };
