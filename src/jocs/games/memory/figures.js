// The Valls figures and the levels. Names from mulassa-tap-tap-dance's catalogue and uaf.cat/seguici-ceremonial.
// Pictures in public/jocs/memory/cards (masters in the bestiari-memory project; sources in docs/jocs/memory-sources.md).
const f = (id, name) => ({ id, name });
const mulassa = f('mulassa-valls', 'Mulassa'), drac = f('drac-valls', 'Drac'), bou = f('bou-tradicional-valls', 'Bou'),
  os = f('os-trabucaires-valls', 'Ós'), aliga = f('aliga-valls', 'Àliga'), basilisc = f('basilisc-valls', 'Basilisc'), lleo = f('lleo-valls', 'Lleó'); // i18n-ok: figure names, the same in every language

// Easiest first: more cards each time, and at the same count the figures that look alike come last.
export const LEVELS = [
  { id: 'primers', name: 'Primeres figures', figures: [mulassa, drac, os, aliga] },
  { id: 'bestiari', name: 'Bestiari', figures: [mulassa, drac, bou, os, aliga, basilisc, lleo] },
  { id: 'calcotada', name: 'Calçotada', figures: [ // i18n-ok: figure names, the same in every language
    f('cap-tomaquet', 'Tomàquet'), f('cap-all', 'All'), f('cap-ametlla', 'Ametlla'), f('cap-avellana', 'Avellana'), f('cap-nyora', 'Nyora'), // i18n-ok: figure names, the same in every language
    f('cap-julivert', 'Julivert'), f('cap-sal', 'Sal'), f('cap-pebre', 'Pebre'), f('cap-oli', 'Oli'), f('cap-vinagre', 'Vinagre'),
    f('gegant-antonet', 'Antonet'), f('geganta-angelina', 'Angelina')] },
  { id: 'seguici', name: 'Seguici', figures: [mulassa, drac, bou, os, aliga, basilisc, lleo,
    f('nans-valls', 'Nans'), f('gegants-ciutat-valls', 'Gegants'), f('cavallets-valls', 'Cavallets'), f('diables-valls', 'Diables'),
    f('gitanes-valls', 'Gitanes'), f('primera-valls', 'Primera'), f('moixiganga-valls', 'Moixiganga')] },
  { id: 'nans-gegants', name: 'Nans i Gegants', figures: [
    f('nan-alcalde', 'Alcalde'), f('nan-jaia', 'Jaia'), f('nan-dona-ullet', "Dona de l'Ullet"), f('nan-barret-verd', 'Barret Verd'),
    f('nan-sabater', 'Sabater'), f('nan-catala', 'Català'), f('nan-noia-maca', 'Noia Maca'), f('nan-arlequi', 'Arlequí'), // i18n-ok: figure names, the same in every language
    f('nan-armats', 'Armats'), f('nan-regidors', 'Regidors'),
    f('gegant-porra', 'Gegant de la Porra'), f('geganta', 'Geganta'), f('lladrefaves', 'Lladrefaves'), f('gegantona', 'Gegantona')] }, // i18n-ok: figure names, the same in every language
];
// The hardest mode: 50 cards drawn at random from everything, plus the small versions, which here are pairs of their own and look nearly like the big ones.
const small = [f('mulassa-petita', 'Mulassa petita'), f('drac-petit', 'Drac Petit'), f('os-petit', 'Ós petit'), f('aliga-petita', 'Àliga petita')]; // i18n-ok: figure names, the same in every language
LEVELS.push({ id: 'barreja', name: 'Gran barreja', cards: 50, figures: [...new Set(LEVELS.flatMap(l => l.figures)), ...small] });
export const pictureOf = figure => `/jocs/memory/cards/${figure.id}.jpg`;
