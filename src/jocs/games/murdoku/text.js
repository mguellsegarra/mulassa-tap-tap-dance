// i18n-ok: every string here is provisional, Catalan only, until Codex writes them (docs/jocs/murdoku-textos.md).
export const FIGURE_NAMES = { mulassa: 'Mulassa', drac: 'Drac', bou: 'Bou', os: 'Ós', aliga: 'Àliga', basilisc: 'Basilisc', nans: 'Nans', gegants: 'Gegants', cavallets: 'Cavallets', diables: 'Diables' }; // i18n-ok: provisional
export const OBJECT_NAMES = { arracades: "les arracades de l'alcaldessa", gralla: 'la gralla de recanvi', ram: "el ram de l'ofrena", baquetes: 'les baquetes del tabaler', maqueta: 'la maqueta del castell', safata: 'la safata de les coques', clau: 'la clau del bagul de festa', faixa: 'la faixa del cap de colla', cistell: "el cistell de l'avellana", llanterna: 'la llanterna de la visita' }; // i18n-ok: provisional
export const OBJECT_SHORT = { arracades: 'Arracades', gralla: 'Gralla', ram: 'Ram', baquetes: 'Baquetes', maqueta: 'Maqueta', safata: 'Safata', clau: 'Clau', faixa: 'Faixa', cistell: 'Cistell', llanterna: 'Llanterna' }; // i18n-ok: provisional
export const PART_NAMES = { ajuntament: 'Ajuntament', pinya: 'Pinya', gent: 'Públic', porxos: 'Porxos', fruita: 'Fruita', verdura: 'Verdura', carrer: 'Carrer', mesures: 'Oli', capella: 'Capella', farmacia: 'Farmàcia', sabater: 'Sabater', forn: 'Forn', nau: 'Nau', campanar: 'Campanar', placaesglesia: 'Plaça', escolans: 'Escolans', costa: 'Costa', jardi: 'Jardí', castell: 'Castell', escultura: 'Escultura', bar: 'Terrassa', rebuda: 'Rebuda', camises: 'Camises', historia: 'Història', temporal: 'Temporal', cuina: 'Cuina', paller: 'Paller', sala: 'Sala', era: 'Era', celler: 'Celler', vella: 'Vella', joves: 'Joves', museu: 'Museu' }; // i18n-ok: provisional
export const THING_NAMES = { font: 'la font', arbre: "l'arbre", banc: 'el banc', parada: 'la parada', cadira: 'la cadira', tabal: 'el tabal', faixes: 'les faixes', caixa: 'la caixa', cistella: 'la cistella', barril: 'el barril', balanca: 'la balança', ciri: 'el ciri', campana: 'la campana', reclinatori: 'el reclinatori', pessebre: 'el pessebre', morter: 'el morter', escultura: "l'escultura", camises: 'les camises', vitrina: 'la vitrina', pantalla: 'la pantalla', pou: 'el pou', palla: 'la palla', biga: 'la biga', armari: "l'armari", teranyina: 'la teranyina' }; // i18n-ok: provisional
export const THING_ONE = { font: 'una font', arbre: 'un arbre', banc: 'un banc', parada: 'una parada', cadira: 'una cadira', tabal: 'un tabal', faixes: 'unes faixes', caixa: 'una caixa', cistella: 'una cistella', barril: 'un barril', balanca: 'una balança', ciri: 'un ciri', campana: 'una campana', reclinatori: 'un reclinatori', pessebre: 'un pessebre', morter: 'un morter', escultura: 'una escultura', camises: 'unes camises', vitrina: 'una vitrina', pantalla: 'una pantalla', pou: 'un pou', palla: 'una bala de palla', biga: 'una biga', armari: 'un armari', teranyina: 'una teranyina' }; // i18n-ok: provisional
export const CASES = {
  blat: { title: 'Dia de castells', place: 'Plaça del Blat', story: obj => `Just abans de la primera pinya, ningú troba ${obj}. Hi havia figures per tota la plaça...` }, // i18n-ok: provisional
  cort: { title: 'Compres a la Cort', place: 'Carrer de la Cort', story: obj => `Tothom passa per la Cort, i ara ningú troba ${obj}. Qui s'ha entretingut on no tocava?` }, // i18n-ok: provisional
  santjoan: { title: 'Toc de campanes', place: 'Sant Joan', story: obj => `Han sonat les campanes i, entre tanta gent, ningú troba ${obj}.` }, // i18n-ok: provisional
  pati: { title: 'Assaig al Pati', place: 'El Pati', story: obj => `Al Pati hi ha assaig, i fa un moment ${obj} encara era a lloc.` }, // i18n-ok: provisional
  museu: { title: 'Nit al museu', place: 'Museu Casteller', story: obj => `Al Museu Casteller tot està a punt per obrir, però ningú troba ${obj}.` }, // i18n-ok: provisional
  oli: { title: 'Dia de mercat', place: "Plaça de l'Oli", story: obj => `Algú ha amagat ${obj} entre les parades. Cada figura recorda on era.` }, // i18n-ok: provisional
  mas: { title: 'El mas tancat', place: 'Mas Miquel', story: obj => `Al mas abandonat fa temps que no hi va ningú, però algú s'hi ha endut ${obj}. Qui hi ha entrat?` }, // i18n-ok: provisional
  vigilia: { title: 'La vigília', place: 'Plaça del Blat', story: obj => `La vigília, amb les colles a cada banda de la plaça, ningú troba ${obj}.` }, // i18n-ok: provisional
  festa: { title: 'Festa grossa', place: 'Sant Joan', story: obj => `Dia de festa a Sant Joan. Entre tabals i ciris, ningú troba ${obj}.` }, // i18n-ok: provisional
  nit: { title: 'Nit al mas', place: 'Mas Miquel', story: obj => `De nit el mas fa més respecte. L'últim rastre de ${obj} porta aquí.` }, // i18n-ok: provisional
};
export const UI = {
  rule: "Una peça per fila i per columna, mai damunt d'un objecte del plànol. 'Tocant' vol dir a la casella del costat, sense diagonals i dins de la mateixa zona. El culpable és l'única figura a la zona de l'objecte robat.", // i18n-ok: provisional
  menu: 'Tria un cas.', // i18n-ok: provisional
  investigate: 'Investiga', // i18n-ok: provisional
  accuse: who => `Acusa ${who}`, // i18n-ok: provisional
  wrong: 'Alguna cosa no quadra. Revisa les fitxes.', // i18n-ok: provisional
  noCulprit: "A la zona de l'objecte hi ha d'haver una sola figura.", // i18n-ok: provisional
  solved: (who, obj) => `${who} s'ha endut ${obj}!`, // i18n-ok: provisional
  next: 'Cas següent', // i18n-ok: provisional
  allDone: 'Has resolt tots els casos!', // i18n-ok: provisional
  mark: 'Marca una casella descartada', // i18n-ok: provisional
  cell: (r, c, zone) => `Fila ${r}, columna ${c}, ${zone}`, // i18n-ok: provisional
  marked: 'descartada', // i18n-ok: provisional
  hintWrong: who => `${who} no hi pot ser.`, // i18n-ok: provisional
  hintNext: who => `Mira ${who}: és on brilla.`, // i18n-ok: provisional
  guide: (who, clue) => `${who}: ${clue}`, // i18n-ok: provisional
  guideLine: 'Cada peça treu la seva fila i la seva columna.', // i18n-ok: provisional
  guideCulprit: "Ja hi són tots: només queda una figura a la zona de l'objecte.", // i18n-ok: provisional
};
export const CLUES = {
  in: ({ zone }) => `era a ${zone}`, // i18n-ok: provisional
  notIn: ({ zone }) => `no era a ${zone}`, // i18n-ok: provisional
  beside: ({ thing }) => `era tocant ${thing}`, // i18n-ok: provisional
  above: ({ other }) => `era més amunt que ${other}`, // i18n-ok: provisional
  leftOf: ({ other }) => `era més a l'esquerra que ${other}`, // i18n-ok: provisional
};
