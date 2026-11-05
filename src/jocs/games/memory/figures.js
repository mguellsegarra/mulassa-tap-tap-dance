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
  { id: 'gegants', name: 'Gegants', figures: [ // i18n-ok: figure names, the same in every language
    f('gegant-calcot', 'Gegant del Calçot'), f('gegant-campanar', 'Gegant del Campanar'), f('elionor', "Elionor d'Aragó"), f('pere-lusignan', 'Pere de Lusignan'), // i18n-ok: figure names, the same in every language
    f('pau-galceran', 'Pau de Galceran'), f('isabel-galceran', 'Isabel de Galceran'), f('gegant-antonet', 'Antonet'), f('geganta-angelina', 'Angelina'),
    f('gegant-porra', 'Gegant de la Porra'), f('geganta', 'Geganta'), f('vella-quaresma', 'Vella Quaresma'), f('carnaval-porra', 'Porra de Carnaval'), f('carnaval-geganta', 'Geganta de Carnaval')] }, // i18n-ok: figure names, the same in every language
  { id: 'seguici', name: 'Seguici', figures: [mulassa, drac, bou, os, aliga, basilisc, lleo,
    f('nans-valls', 'Nans'), f('gegants-ciutat-valls', 'Gegants'), f('cavallets-valls', 'Cavallets'), f('diables-valls', 'Diables'),
    f('gitanes-valls', 'Gitanes'), f('primera-valls', 'Primera'), f('moixiganga-valls', 'Moixiganga')] },
  { id: 'nans-gegants', name: 'Nans i Gegants', figures: [
    f('nan-alcalde', 'Alcalde'), f('nan-jaia', 'Jaia'), f('nan-dona-ullet', "Dona de l'Ullet"), f('nan-barret-verd', 'Barret Verd'),
    f('nan-sabater', 'Sabater'), f('nan-catala', 'Català'), f('nan-noia-maca', 'Noia Maca'), f('nan-arlequi', 'Arlequí'), // i18n-ok: figure names, the same in every language
    f('nan-armats', 'Armats'), f('nan-regidors', 'Regidors'),
    f('gegant-porra', 'Gegant de la Porra'), f('geganta', 'Geganta'), f('lladrefaves', 'Lladrefaves'), f('gegantona', 'Gegantona')] }, // i18n-ok: figure names, the same in every language
  { id: 'gegantons', name: 'Gegantons', figures: [
    f('manotes-arlequi', 'Manotes Arlequí'), f('bruixa-ursula', 'Bruixa Úrsula'), f('ogre-grifoll', 'Grifoll'), f('ogre-gironella', 'Gironella'), f('ogre-pauetet', 'Pauetet'), // i18n-ok: figure names, the same in every language
    f('carmen-bombera', 'Carmen la Bombera'), f('avia-carme', 'Àvia Carme'), f('bandoler-pera', 'Bandoler La Pera'), f('pere-gros', 'Pere el Gros'), f('margarida-lusignan', 'Margarida de Lusignan'), // i18n-ok: figure names, the same in every language
    f('astaroth', 'Astaroth'), f('manotes-milionari', 'Milionari'), f('manotes-bruixot', 'Bruixot'), f('home-nassos', 'Home dels Nassos')] },
];
// The hardest mode: 50 cards drawn at random from every figure.
LEVELS.push({ id: 'barreja', name: 'Gran barreja', cards: 50, figures: [...new Map(LEVELS.flatMap(l => l.figures).map(x => [x.id, x])).values()] });
export const pictureOf = figure => `/jocs/memory/cards/${figure.id}.jpg`;
