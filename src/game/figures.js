// Catalog metadata lives in JSON; only the two integrated songs are playable.
import figureCatalog from './figure-catalog.json' with { type: 'json' };
import { bestRecord, recordFamilyKey, saveRecord } from './records.js';
import { CURRENT_SCORE_VERSION } from './score-scale.js';
import { FIGURE_PORTRAITS } from './figure-portraits.js';
export const TOWNS = figureCatalog.towns;
const playableSongs = {
  'mulassa-valls': { song: 'Ball de la Mulassa', composer: 'Francesc Bofarull i Figuerola', year: 1987, version: CURRENT_SCORE_VERSION },
  'drac-valls': { song: 'Ball del Drac', composer: 'Francesc Bofarull i Figuerola', year: 1985, version: 'drac-v1' },
};
// Hidden entries keep their catalog data and portraits but cannot enter selector navigation.
export const FIGURES = figureCatalog.figures.filter(f => f.selectorVisible !== false).map(f => ({
  ...f, status: playableSongs[f.id] ? 'playable' : 'aviat', ...playableSongs[f.id],
})).sort((a, b) => Number(b.status === 'playable') - Number(a.status === 'playable'));
export const MULASSA = FIGURES.find(f => f.id === 'mulassa-valls');
export const DRAC = FIGURES.find(f => f.id === 'drac-valls');
// The strip's last card invites a colla to propose its figure: no real town, no song, outside FIGURES (records, board).
export const INVITE_TOWN = { id: 'el-teu-poble', name: 'El teu poble', color: '#c8202f' };
export const INVITE = { id: 'la-teva-colla', name: 'La teva colla', fullName: 'La teva colla', town: INVITE_TOWN.id, entity: 'Proposa-la', status: 'aviat', invite: true };
export const townOf = f => f.town === INVITE_TOWN.id ? INVITE_TOWN : TOWNS.find(t => t.id === f.town);
export const playable = f => f.status === 'playable';

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
// A figure's record at a level on this device: the mulassa's keys predate the figures (record-v2-duet-<level>)
export const recordKey = (figure, level) => figure.id === MULASSA.id ? recordFamilyKey(level) : `record-${figure.id}-${level}`;

// Mulassa compares its legacy and shortened records; other figures keep their own raw score.
export function readFigureRecord(store, figure, level) {
  if (figure.id === MULASSA.id) return bestRecord(store, level);
  try { return JSON.parse(store.get(recordKey(figure, level))) || null; } catch { return null; }
}
export function saveFigureRecord(store, figure, level, quality, rawScore, combo) {
  if (figure.id === MULASSA.id) saveRecord(store, level, quality, rawScore, combo);
  else store.set(recordKey(figure, level), JSON.stringify({ quality, score: rawScore, combo }));
}

export const aviatText = () => `Encara no s’hi pot jugar. Tens fotos, vídeos, partitures o coneixes el ball? Dona un cop de mà.`;
export const aviatDraft = town => `Sobre ${town}: `; // the Bústia's first words, from an «Aviat» card
export const inviteText = () => `Tens una colla gegantera o de bestiari? Vols que el teu poble surti al joc? Explica’ns quina figura és i d’on és.`;
export const INVITE_DRAFT = 'Proposo una figura. Poble i colla: ';

// Two green necks, red jaws and gold wing membranes, in the same portrait box as the Mulassa.
export const DRAC_ART = ['..gg...gg...', '.ggrr.ggrr..', '..gg...gg...', '..gg...gg...', 'w.ggggggg.w.', '.wggogoggw..', '..ggggggg...', '..ggggggg...', '...d..d.....', '..dd..dd....'];
export const DRAC_PALETTE = { g: '#4a8a4c', r: '#c42a2a', w: '#dfc07a', o: '#e0b03a', d: '#d8c892' };
export const portraitArt = figure => figure.id === DRAC.id ? DRAC_ART : figure.id === MULASSA.id ? MULE_ART : FIGURE_PORTRAITS[figure.id]?.art ?? AVIAT_ART;
const UNKNOWN_PALETTE = { x: '#120b07' };
export const portraitPalette = figure => figure.id === DRAC.id ? DRAC_PALETTE : figure.id === MULASSA.id ? MULE_PALETTE : FIGURE_PORTRAITS[figure.id]?.palette ?? UNKNOWN_PALETTE;
