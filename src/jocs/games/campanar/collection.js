// What a run can collect and pass (bands.js shows it): the prototype's ornaments (ornament-plan.js; B1's lesenes are
// background, not collected) and the famous heights. Every name is provisional, a placeholder until Codex writes the
// words (i18n-ok: POC); each glyph is a small line drawing in stone, 24 units square.
export const ORNAMENTS = {
  // the campanar's own pieces (facade.js, scene.js's crown): basics, ticked in the band without a moment
  portal: { name: 'Portal', rarity: 'B' }, // i18n-ok: POC placeholder
  espitllera: { name: 'Espitllera', rarity: 'B' }, // i18n-ok: POC placeholder
  finestral: { name: 'Finestral', rarity: 'B' }, // i18n-ok: POC placeholder
  faixa: { name: 'Faixa', rarity: 'B' }, // i18n-ok: POC placeholder
  rellotge: { name: 'Rellotge', rarity: 'B' }, // i18n-ok: POC placeholder
  campanes: { name: 'Campanes', rarity: 'B' }, // i18n-ok: POC placeholder
  coberta: { name: 'Coberta i gàbia', rarity: 'B' }, // i18n-ok: POC placeholder
  pinacles: { name: 'Pinacles', rarity: 'B' }, // i18n-ok: POC placeholder
  creu: { name: 'Creu', rarity: 'B' }, // i18n-ok: POC placeholder
  A1: { name: 'Òcul', rarity: 'C' }, // i18n-ok: POC placeholder
  B2: { name: 'Dents de serra', rarity: 'C' }, // i18n-ok: POC placeholder
  A10: { name: "L'escala de dins", rarity: 'PC' }, // i18n-ok: POC placeholder
  B5: { name: 'Gàrgola', rarity: 'C' }, // i18n-ok: POC placeholder
  A6: { name: 'Rosassa', rarity: 'E' }, // i18n-ok: POC placeholder
  F8: { name: 'Vitrall de la Mare de Déu', rarity: 'R' }, // i18n-ok: POC placeholder
  F1: { name: 'Gàrgola de drac', rarity: 'E' }, // i18n-ok: POC placeholder
  D1: { name: 'Agulla amb croquetes', rarity: 'C' }, // i18n-ok: POC placeholder
  G6: { name: 'La lluna engabiada', rarity: 'S' }, // i18n-ok: POC placeholder
  E1: { name: 'Niu de cigonyes', rarity: 'R' }, // i18n-ok: POC placeholder
  D6: { name: 'Parallamps', rarity: 'C' }, // i18n-ok: POC placeholder
};
// the rarities (the study's), each with its name and colour
export const RARITY = {
  B: { name: 'Del campanar', tint: '#cdbb98' }, // i18n-ok: POC placeholder
  C: { name: 'Comú', tint: '#f1cf8f' }, // i18n-ok: POC placeholder
  PC: { name: 'Poc comú', tint: '#8fdca8' }, // i18n-ok: POC placeholder
  R: { name: 'Rar', tint: '#86bdff' }, // i18n-ok: POC placeholder
  E: { name: 'Èpic', tint: '#d2a6ff' }, // i18n-ok: POC placeholder
  S: { name: 'Secret', tint: '#ff9cc4' }, // i18n-ok: POC placeholder
};
// the drawn icons (Astra's, as Alchemy's: public/jocs/campanar/elements/<id>.png); the rest keep their line drawing
export const DRAWN = new Set(['portal', 'espitllera', 'finestral', 'faixa', 'rellotge', 'campanes', 'coberta', 'pinacles', 'creu',
  'A1', 'B2', 'A10', 'B5', 'A6', 'F8', 'F1', 'D1', 'G6']);
// each one's line drawing (bands.js puts it in its chip)
export const GLYPHS = {
  portal: '<path d="M5 21V11a7 7 0 0 1 14 0v10"/><path d="M8.5 21v-9a3.5 3.5 0 0 1 7 0v9M3 21h18"/>',
  espitllera: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M12 6v12"/>',
  finestral: '<path d="M6 21V10a6 6 0 0 1 12 0v11z"/><path d="M12 6v15M6 14h12"/>',
  faixa: '<path d="M3 9h18M3 15h18M3 12h18"/>',
  rellotge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  campanes: '<path d="M7 17c0-6 1.5-10 5-10s5 4 5 10z"/><path d="M5 17h14M12 7V4M11 19.5h2"/>',
  coberta: '<path d="M4 20h16M6 20l6-13 6 13M10 7h4V4h-4z"/>',
  pinacles: '<path d="M5 21V12l2-6 2 6v9M15 21V12l2-6 2 6v9"/>',
  creu: '<path d="M12 3v18M7 8h10"/>',
  A1: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M18 18l-2.1-2.1M18 6l-2.1 2.1M6 18l2.1-2.1"/>',
  B2: '<path d="M3 8h18M3 16h18M3 16l3-8 3 8 3-8 3 8 3-8 3 8"/>',
  A10: '<rect x="3" y="15" width="4" height="5"/><rect x="10" y="10" width="4" height="5"/><rect x="16" y="3" width="5" height="6"/><path d="M16 7.5h5M17.5 7.5v1.5M19.5 7.5v1.5"/>',
  B5: '<path d="M3 9h5l9 3h3l1 2h-4l-1 2h-3l-1-2H8L3 13z"/><path d="M19.5 15v4M19.5 21v.5"/>',
  A6: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6"/><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  F8: '<path d="M6 21V9a6 6 0 0 1 12 0v12z"/><circle cx="12" cy="9.5" r="3.4"/><path d="M12 11c-1.8 0-2.8 3-3.4 8h6.8c-.6-5-1.6-8-3.4-8z"/>',
  F1: '<path d="M3 15l4-4 3-1 1-5 1.6 4 1.4-4.5 1 5 5 3 1 2.5-3 .5-1.5-1H13l-3 2H6z"/><circle cx="15.5" cy="11" r=".6"/>',
  D1: '<path d="M12 2v3M10.5 3.5h3M12 6l-5 15h10z"/><path d="M10.2 11.5l-1.6-.6M13.8 11.5l1.6-.6M9 15.5l-1.7-.6M15 15.5l1.7-.6M8 13.5h8"/>',
  G6: '<path d="M6 21V9a6 6 0 0 1 12 0v12z"/><circle cx="12.5" cy="12" r="3.6"/><path d="M9.5 6v15M14.5 6v15"/>',
  E1: '<path d="M3 18h18M3.5 18c2.5 3.5 14.5 3.5 17 0M2 16.5l3 1.5M22 16.5l-3 1.5"/>'
    + '<path d="M10 18v-4M12 18v-4M7 11c0-2 2-3 5-3 1.5 0 2.5.6 2.5 2.5S13 14 11 14H9c-1.5 0-2-1.5-2-3zM7.5 11.5 4 13"/><path d="M13.5 8.5V5h1.5l5.5 1.6-5.5.4"/>',
  D6: '<path d="M12 2v19M9 21h6M10 4.5 12 2l2 2.5M9.5 8h5"/><path d="M19 5l-2.5 4.5h3L17 14"/>',
};
// the heights a run passes, in metres (rules.js metresOf). Every one is TO VERIFY before it ships:
// Taüll's bell tower: no source found yet, a placeholder; Pisa ~56 (55.9 on its low side, 56.7 on its high side, to
// check); Valls 74 (rules.js REAL); the Sagrada Família 172.5 (its tower of Jesus); the Eiffel tower ~330 with its
// antennas; the Empire State 381 to its roof (443 to its antenna's tip); the Burj Khalifa 828, Marc's «Abu Dhabi»,
// to confirm (it is in Dubai)
export const MILESTONES = [
  { name: 'Sant Climent de Taüll', m: 30 }, // i18n-ok: POC placeholder
  { name: 'Torre de Pisa', m: 56 }, // i18n-ok: POC placeholder
  { name: 'Campanar de Valls', m: 74 }, // i18n-ok: POC placeholder
  { name: 'Sagrada Família', m: 172.5 }, // i18n-ok: POC placeholder
  { name: 'Torre Eiffel', m: 330 }, // i18n-ok: POC placeholder
  { name: 'Empire State', m: 381 }, // i18n-ok: POC placeholder
  { name: 'Burj Khalifa', m: 828 }, // i18n-ok: POC placeholder
];
