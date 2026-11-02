const figureForms = {
  Drac: ['drac', 'dracs'],
  Nans: ['nan', 'nans'],
  Bou: ['bou', 'bous'],
  Basilisc: ['basilisc', 'basiliscs'],
  Mulassa: ['mulassa', 'mulasses'],
  Lleó: ['lleó', 'lleons'], // i18n-ok: Catalan only until the game is translated
  Àliga: ['àliga', 'àligues'], // i18n-ok: Catalan only until the game is translated
};

const countedFigure = (n, name) => figureForms[name][n === 1 ? 0 : 1];

export const T = {
  title: 'Mulassa Crush',
  how: 'Canvia dues peces de costat i ajunta\'n tres d\'iguals en una fila o columna.',
  play: n => `Juga el nivell ${n}`, // i18n-ok: Catalan only until the game is translated
  menu: 'Menú', // i18n-ok: Catalan only until the game is translated
  back: 'Enrere',
  sound: 'So', // provisional: needs Codex, spoken only by screen readers
  level: 'Nivell',
  moves: 'Jugades',
  names: { drac: 'Drac', nans: 'Nans', bou: 'Bou', basilisc: 'Basilisc', mulassa: 'Mulassa', lleo: 'Lleó', aliga: 'Àliga' }, // i18n-ok: Catalan only until the game is translated
  goal: (n, name) => `Recull ${n} ${countedFigure(n, name)}`,
  // tiers from praiseTier in rules.js: 2 = 3-4 cascades, 3 = 5-6, 4 = 7 or more
  praise: {
    2: ['Ben fet!', 'Així, així!', 'Quin ritme!'], // i18n-ok: Catalan only until the game is translated
    3: ['Quina festa!', 'Amunt!', 'Que soni!'],
    4: ['Tronada!', 'Festa grossa', 'Visca Valls!'],
  },
  shuffle: 'Barregem les peces!', // i18n-ok: Catalan only until the game is translated
  won: 'Nivell superat!',
  lost: 'Ja no queden jugades',
  movesLeft: n => (n === 1 ? 'T\'ha sobrat 1 jugada' : `T'han sobrat ${n} jugades`),
  progress: (a, n, name) => `Ja tens ${a} de ${n} ${countedFigure(n, name)}`, // i18n-ok: Catalan only until the game is translated
  next: 'Nivell següent',
  retry: 'Torna-hi',
  levels: 'Nivells',
  done: 'Tot el seguici fa festa!', // i18n-ok: Catalan only until the game is translated
};
