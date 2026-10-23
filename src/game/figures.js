// Catalog metadata lives in JSON; only the two integrated songs are playable.
import { tr } from '../i18n/messages.js';
import figureMessages from '../i18n/locales/ca/figures.json' with { type: 'json' };
import figureCatalog from './figure-catalog.json' with { type: 'json' };
import { bestRecord, recordPointsKey, saveRecord } from './records.js';
import { CURRENT_SCORE_VERSION, BOU_SCORE_VERSION } from './score-scale.js';
import { FIGURE_PORTRAITS } from './figure-portraits.js';
export const TOWNS = figureCatalog.towns;
const playableSongs = {
  // i18n-ok: song titles and composers are proper names
  'mulassa-valls': { song: 'Ball de la Mulassa', composer: 'Francesc Bofarull i Figuerola', year: 1987, version: CURRENT_SCORE_VERSION },
  'drac-valls': { song: 'Ball del Drac', composer: 'Francesc Bofarull i Figuerola', year: 1985, version: 'drac-v1' },
  // the UAF's Bou Tradicional (2012), not the Turba's; no board yet: its version is not publishable (leaderboard-rules.js)
  'bou-tradicional-valls': { song: 'Ball del Bou', composer: 'Francesc Bofarull i Figuerola', year: 2012, version: BOU_SCORE_VERSION, noBoard: true },
};
// Hidden entries keep their catalog data and portraits but cannot enter selector navigation.
export const FIGURES = figureCatalog.figures.filter(f => f.selectorVisible !== false).map(f => ({
  ...f, status: playableSongs[f.id] ? 'playable' : 'aviat', ...playableSongs[f.id],
})).sort((a, b) => Number(b.status === 'playable') - Number(a.status === 'playable'));
export const MULASSA = FIGURES.find(f => f.id === 'mulassa-valls');
export const DRAC = FIGURES.find(f => f.id === 'drac-valls');
export const BOU = FIGURES.find(f => f.id === 'bou-tradicional-valls');
// The strip's last card invites a colla to propose its figure: no real town, no song, outside FIGURES (records, board).
export const INVITE_TOWN = { id: 'el-teu-poble', name: tr('figures.invite.town'), color: '#c8202f' };
export const INVITE = { id: 'la-teva-colla', name: tr('figures.invite.name'), fullName: tr('figures.invite.name'), town: INVITE_TOWN.id, entity: tr('figures.invite.entity'), status: 'aviat', invite: true };
export const townOf = f => f.town === INVITE_TOWN.id ? INVITE_TOWN : TOWNS.find(t => t.id === f.town);
export const playable = f => f.status === 'playable';
export const hasBoard = f => playable(f) && !f.noBoard; // an online board (Classificació, the ranking line, publishing)
// Shown before the fold: the playable figures (the Bou, up front since 2026-10-23, is one now)
export const upFront = f => playable(f);

// The mulassa as 12 × 10 pixel art, side-on, facing right: ears, head, long neck, the red caparison with gold dots and
// fringe, the portadors' legs (the ÀNIM portrait, src/hud/top.js, and her card on the select screen)
export const MULE_ART = ['........e.e.', '........hhh.', '........hhhh', '.......hh...', '.rrrrrrh....', 'rrgrrgrr....', 'rrrrrrrr....', 'gggggggg....', '.d....d.....', '.dd...dd....'];
export const MULE_PALETTE = { e: '#e0a868', h: '#b87a44', r: '#c0283c', g: '#f5c518', d: '#2a1a10' };
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

// Complete locale-owned messages per figure; unknown proposals use the explicit generic message.
export const aviatText = figure => tr(Object.hasOwn(figureMessages, 'figures.pending.' + figure.id) ? 'figures.pending.' + figure.id : 'figures.pending.default');
// The Bústia's first words, from an «Aviat» card: the figure and its town (most full names already say the town).
export const aviatDraft = (figure, town) => { const name = figure.fullName || figure.name; return name.includes(town) ? tr('figures.pending.draftName', { name }) : tr('figures.pending.draftTown', { name, town }); };
export const inviteText = () => tr('figures.invite.text');
export const INVITE_DRAFT = tr('figures.invite.draft');

// Two green necks, red jaws and gold wing membranes, in the same portrait box as the Mulassa.
export const DRAC_ART = ['..gg...gg...', '.ggrr.ggrr..', '..gg...gg...', '..gg...gg...', 'w.ggggggg.w.', '.wggogoggw..', '..ggggggg...', '..ggggggg...', '...d..d.....', '..dd..dd....'];
export const DRAC_PALETTE = { g: '#4a8a4c', r: '#c42a2a', w: '#dfc07a', o: '#e0b03a', d: '#d8c892' };
export const portraitArt = figure => figure.id === DRAC.id ? DRAC_ART : figure.id === MULASSA.id ? MULE_ART : FIGURE_PORTRAITS[figure.id]?.art ?? AVIAT_ART;
const UNKNOWN_PALETTE = { x: '#120b07' };
export const portraitPalette = figure => figure.id === DRAC.id ? DRAC_PALETTE : figure.id === MULASSA.id ? MULE_PALETTE : FIGURE_PORTRAITS[figure.id]?.palette ?? UNKNOWN_PALETTE;

// How tall each figure stands beside the others (the gegants = 1), so the selector shows them at roughly their real
// relative size whatever zoom their pixel art was drawn at. Set by eye with ?sizes (src/dev/sizes-edit.js), not measured.
export const STAND = {
  'mulassa-valls': 0.8, 'drac-valls': 0.7, 'aliga-valls': 0.8, 'bou-tradicional-valls': 0.65, 'os-trabucaires-valls': 0.65, 'nans-valls': 0.55,
  'gegants-ciutat-valls': 1, 'cavallets-valls': 0.55, 'basilisc-valls': 0.65, 'diables-valls': 0.8, 'gegant-calcot-valls': 1, 'campanar-valls': 1,
  'aliga-tarragona': 0.8, 'cucafera-tarragona': 0.65, 'gegants-mulassa-reus': 0.8, 'gegants-solsona': 1, 'drac-solsona': 0.8, 'bou-solsona': 0.65,
  'mulassa-solsona': 0.8, 'aliga-solsona': 0.8, 'gegants-bojos-solsona': 1, 'draca-solsona': 0.8, 'boja-vilanova': 0.8, 'drac-vilanova': 0.8, 'aliga-barcelona': 0.8,
  'guites-berga': 1, 'gegants-olot': 1, 'drac-vilafranca': 0.8, 'la-teva-colla': 1,
};
export const portraitStand = figure => STAND[figure.id] ?? 0.8;
// How heavily each figure lands in free mode (the Mulassa = 1): the one place that sets its «BUUUM» (audio.js thud),
// lower, longer and louder with it. The Drac carries the fire kit and its heavier frame.
export const FIGURE_WEIGHT = { 'mulassa-valls': 1, 'drac-valls': 1.5, 'bou-tradicional-valls': 1 };
