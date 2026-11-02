const figureForms = {
  Drac: ['drac', 'dracs'],
  Calçot: ['calçot', 'calçots'], // i18n-ok: Catalan only until the game is translated
  Bou: ['bou', 'bous'],
  Basilisc: ['basilisc', 'basiliscs'],
  Mulassa: ['mulassa', 'mulasses'],
  Lleó: ['lleó', 'lleons'], // i18n-ok: Catalan only until the game is translated
  Àliga: ['àliga', 'àligues'], // i18n-ok: Catalan only until the game is translated
};

const countedFigure = (n, name) => figureForms[name][n === 1 ? 0 : 1];

export const T = {
  title: 'Mulassa Crush',
  how: 'Intercanvia dues peces veïnes i ajunta\'n tres d\'iguals, en fila o en columna.', // i18n-ok: Catalan only until the game is translated
  play: 'Juga', // i18n-ok: Catalan only until the game is translated
  back: 'Enrere',
  soundOn: 'Activa el so', // i18n-ok: Catalan only until the game is translated
  soundOff: 'Silencia el so', // i18n-ok: Catalan only until the game is translated
  settings: 'Obre els ajustos', // i18n-ok: Catalan only until the game is translated
  settingsLabel: 'So i ajuda', // i18n-ok: Catalan only until the game is translated
  close: 'Tanca',
  tagline: 'El Seguici surt al carrer', // i18n-ok: Catalan only until the game is translated
  start: 'Som-hi!',
  howTo: 'Com es juga', // i18n-ok: Catalan only until the game is translated
  mapTitle: 'El camí', // i18n-ok: Catalan only until the game is translated
  mapCredit: '© OpenStreetMap contributors · Data licensed under ODbL', // i18n-ok: the licence's own wording
  notNow: 'Ara no',
  best: 'Millor resultat anterior', // i18n-ok: Catalan only until the game is translated
  movesCount: n => `${n} jugades`,
  map: 'Camí', // i18n-ok: Catalan only until the game is translated
  replay: 'Repeteix', // i18n-ok: Catalan only until the game is translated
  nextOpen: n => `La parada ${n} ja és oberta`, // i18n-ok: Catalan only until the game is translated
  level: 'Nivell',
  moves: 'Jugades',
  names: { drac: 'Drac', calcot: 'Calçot', bou: 'Bou', basilisc: 'Basilisc', mulassa: 'Mulassa', lleo: 'Lleó', aliga: 'Àliga' }, // i18n-ok: Catalan only until the game is translated
  goal: (n, name) => `Recull ${n} ${countedFigure(n, name)}`,
  // tiers from praiseTier in rules.js: 2 = 3-4 cascades, 3 = 5-6, 4 = 7 or more
  praise: {
    2: ['Ben fet!', 'Així sí!', 'Quina fantasia!'], // i18n-ok: Catalan only until the game is translated
    3: ['FOOOC! 🔥', 'Pit i amunt!', 'AURA!'],
    4: ['Que tremoli el campanar!', 'Festa grossa!', 'Fot-li que és de Valls'], // i18n-ok: Catalan only until the game is translated
  },
  help: 'Si t\'encalles, rebràs una ajuda.', // i18n-ok: Catalan only until the game is translated
  gift: 'Carretilla al rescat!', // i18n-ok: Catalan only until the game is translated
  shuffle: 'Fem ballar les peces!', // i18n-ok: Catalan only until the game is translated
  won: 'Repic de campanes!',
  lost: 'Ha fet llenya!',
  progress: (a, n, name) => `${a} de ${n} ${countedFigure(n, name)} al sac. Seguim!`, // i18n-ok: Catalan only until the game is translated
  next: 'Nivell següent',
  retry: 'Una altra!',
  done: 'Tot el Seguici fa festa!', // i18n-ok: Catalan only until the game is translated
};
