// What a run can collect and pass (bands.js, pieces.js show it): the special pieces (ornament-plan.js) and the famous
// heights. The campanar's own parts (portal, windows, clock, bells, crown…) are the tower, not finds (Marc chose Fable's
// review, 27 Nov 2026). Every word is provisional, a placeholder until Codex writes them (i18n-ok: POC): each piece's
// name, why a run earned it (the toast) and how to earn it (the collection's «?»).
export const ORNAMENTS = {
  A1: { name: 'Òcul', rarity: 'C', why: '4 pisos llisos seguits', hint: 'Fes un tram de fust llis' }, // i18n-ok: POC placeholder
  B2: { name: 'Dents de serra', rarity: 'C', why: 'Un altre tram llis', hint: 'Fes dos trams de fust llis' }, // i18n-ok: POC placeholder
  B5: { name: 'Gàrgola', rarity: 'C', why: 'Una faixa a més de 74 m', hint: 'Passa de 74 m' }, // i18n-ok: POC placeholder
  D1: { name: 'Agulla amb croquetes', rarity: 'C', why: 'La torre acaba prima', hint: 'Acaba la torre molt prima' }, // i18n-ok: POC placeholder
  D6: { name: 'Parallamps', rarity: 'C', why: 'Una torre de 150 m', hint: 'Arriba a 150 m' }, // i18n-ok: POC placeholder
  A10: { name: "L'escala de dins", rarity: 'R', why: 'Una finestra sobre el rellotge', hint: 'Fes el rellotge i segueix ample' }, // i18n-ok: POC placeholder
  F8: { name: 'Vitrall de la Mare de Déu', rarity: 'R', why: '8 pisos amb la torre prima', hint: 'Aguanta 8 pisos amb la torre prima' }, // i18n-ok: POC placeholder
  E1: { name: 'Niu de cigonyes', rarity: 'R', why: 'Un campanar ample de 74 m', hint: 'Arriba a 74 m amb la torre ampla' }, // i18n-ok: POC placeholder
  F1: { name: 'Gàrgola de drac', rarity: 'E', why: '6 perfectes seguits', hint: 'Fes 6 perfectes seguits' }, // i18n-ok: POC placeholder
  A6: { name: 'Rosassa', rarity: 'E', why: '8 pisos amples a 100 m', hint: 'Arriba a 100 m amb la torre ampla' }, // i18n-ok: POC placeholder
  G6: { name: 'La lluna engabiada', rarity: 'E', why: 'Una torre de 350 m', hint: 'Arriba a 350 m (300 m de nit)' }, // i18n-ok: POC placeholder
  // the stretch from 100 to 400 m (Marc, 27 Nov 2026; ornament-plan.js says why each threshold)
  H1: { name: 'Casa del campaner', rarity: 'R', why: '100 m sense aprimar-se gaire', hint: 'Passa de 100 m amb la torre no gaire prima' }, // i18n-ok: POC placeholder
  H2: { name: 'Balconada', rarity: 'E', why: '15 pisos amples sobre 120 m', hint: 'Arriba a 145 m amb la torre ampla' }, // i18n-ok: POC placeholder
  H3: { name: 'Rellotge de sol', rarity: 'E', why: '8 perfectes seguits sobre 150 m', hint: 'Fes 8 perfectes seguits passats 150 m' }, // i18n-ok: POC placeholder
  H4: { name: 'Fanal', rarity: 'R', why: 'Una faixa a 250 m', hint: 'Arriba a 250 m' }, // i18n-ok: POC placeholder
};
// three rarities (Fable's review: six were too many to read), each with its name and colour
export const RARITY = {
  C: { name: 'Comuna', tint: '#f1cf8f' }, // i18n-ok: POC placeholder
  R: { name: 'Rara', tint: '#86bdff' }, // i18n-ok: POC placeholder
  E: { name: 'Èpica', tint: '#d2a6ff' }, // i18n-ok: POC placeholder
};
// the drawn icons (Astra's, as Alchemy's: public/jocs/campanar/elements/<id>.png); a piece listed here keeps a line
// drawing in stone, 24 units square, until its icon is drawn (none now)
export const GLYPHS = {};
// The heights a run passes, in metres (rules.js metresOf), checked 27 Nov 2026 (two research rounds, sources in the
// thread): 3 de 10 amb folre i manilles 11, to the enxaneta's head (URV castellsciencia; the press's "13" is unsourced);
// Tortosa cathedral's unfinished bell tower 28.66 (campaners.com); one Catalan bell tower a run, in turn (milestonesOf):
// Vic 46 (ca.wikipedia; campaners says 57.5, to check), Manresa 50.5, Vilafranca 53.87 with its angel, Tarragona 54.25
// (campaners; others say ~70, to check), the Seu Vella de Lleida 60 (campaners 60.6); Valls 74 (Inventari del
// Patrimoni; rules.js REAL); Big Ben 96; the Cercs power plant's chimney 120 (Diputació de Barcelona; still standing
// Feb 2025, its demolition asked for); Torre Glòries 144.4 (CTBUH); Sagrada Família, tower of Jesus, 172.5 (Vatican
// News); the Tres Xemeneies 200 (Diputació); Collserola 288, Eiffel 330 with antennas, Empire State 381 to its roof,
// Petronas 452, One World Trade Center 541, Tokyo Skytree 634 to its antenna, Burj Khalifa 828 (CTBUH, en.wikipedia);
// the Montsant line at 750 (the Muntanyes de Prades hide it from Valls below ~700 m); then summits, altitude above
// the sea, not a building's height (Marc kept them): la Mola 1104, Sant Jeroni 1236, Mont Caro 1442, Turó de l'Home
// 1706, Puigmal 2910, Pica d'Estats 3143 (ca.wikipedia). Every pair at least 12 m apart, so one never covers the next
// on the ruler (bands.js shows one from 20 m before it). Marc left out dams, rides, depths and a castle's altitude.
export const TOWERS = [ // the 46-60 m band: one of them a run, so every comarca has its turn
  { name: 'Campanar de la catedral de Vic', m: 46 }, // i18n-ok: POC placeholder
  { name: 'Campanar de la Seu de Manresa', m: 50.5 }, // i18n-ok: POC placeholder
  { name: 'Campanar de Santa Maria de Vilafranca', m: 53.87 }, // i18n-ok: POC placeholder
  { name: 'Campanar de la catedral de Tarragona', m: 54.25 }, // i18n-ok: POC placeholder
  { name: 'Campanar de la Seu Vella de Lleida', m: 60 }, // i18n-ok: POC placeholder
];
const FIXED = [
  { name: '3d10fm', m: 11 }, // Marc: the castellers' own notation (3 de 10 amb folre i manilles) — i18n-ok: POC placeholder
  { name: 'Campanar de la catedral de Tortosa', m: 28.66 }, // i18n-ok: POC placeholder
  { name: 'Campanar de Valls', m: 74 }, // i18n-ok: POC placeholder
  { name: 'Big Ben', m: 96 }, // i18n-ok: POC placeholder
  { name: 'Xemeneia de la tèrmica de Cercs', m: 120 }, // i18n-ok: POC placeholder
  { name: 'Torre Glòries', m: 144.4 }, // i18n-ok: POC placeholder
  { name: 'Sagrada Família', m: 172.5 }, // i18n-ok: POC placeholder
  { name: 'Tres Xemeneies', m: 200 }, // i18n-ok: POC placeholder
  { name: 'Torre de Collserola', m: 288 }, // i18n-ok: POC placeholder
  { name: 'Torre Eiffel', m: 330 }, // i18n-ok: POC placeholder
  { name: 'Empire State', m: 381 }, // i18n-ok: POC placeholder
  { name: 'Torres Petronas', m: 452 }, // i18n-ok: POC placeholder
  { name: 'One World Trade Center', m: 541 }, // i18n-ok: POC placeholder
  { name: 'Tokyo Skytree', m: 634 }, // i18n-ok: POC placeholder
  { name: 'Des d\'aquí es veu el Montsant', m: 750 }, // i18n-ok: POC placeholder
  { name: 'Burj Khalifa', m: 828 }, // i18n-ok: POC placeholder
  { name: 'Cim de la Mola', m: 1104 }, // i18n-ok: POC placeholder
  { name: 'Cim de Sant Jeroni', m: 1236 }, // i18n-ok: POC placeholder
  { name: 'Cim del Mont Caro', m: 1442 }, // i18n-ok: POC placeholder
  { name: 'Cim del Turó de l\'Home', m: 1706 }, // i18n-ok: POC placeholder
  { name: 'Cim del Puigmal', m: 2910 }, // i18n-ok: POC placeholder
  { name: 'Cim de la Pica d\'Estats', m: 3143 }, // i18n-ok: POC placeholder
];
// run k's heights, in order: the fixed ones and the k-th bell tower of the band
export const milestonesOf = k => [...FIXED, TOWERS[((k % TOWERS.length) + TOWERS.length) % TOWERS.length]].sort((a, b) => a.m - b.m);
