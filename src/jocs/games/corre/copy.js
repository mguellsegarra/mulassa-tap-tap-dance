// PROVISIONAL: every player-facing string, until Codex writes the final copy.
export const NAME = 'Corre i suma colla';
export const T = {
  how: 'Arrossega el dit, tria portes i esquiva els petards. Com més colla, més alt serà el castell.',
  start: 'Som-hi',
  loading: 'Carregant la plaça…',
  loadFailed: "No s'ha pogut carregar la plaça. Torna-ho a provar.",
  menu: 'Menú',
  soundOn: 'Activa el so',
  soundOff: 'Silencia el so',
  street: (a, b) => `Carrer de la Cort · ${a}/${b}`,
  loaded: 'Carregat!',
  result: (name, n) => `${name} amb ${n} ${n === 1 ? 'persona' : 'persones'}`,
  label: c => (c.w === 1 ? `Pilar de ${c.n}` : `${c.w} de ${c.n}`),
  best: name => `Millor castell: ${name}`,
  next: 'Següent',
  again: 'Reinicia',
  retry: 'Torna-hi',
  empty: 'Sense colla!',
  emptyText: 'Aquesta porta us ha deixat sense ningú.',
  beaten: 'La rival guanya!',
  tie: 'Empat, i no queda ningú per fer el castell.',
  beatenText: n => `Encara li quedaven ${n}. Busca portes millors.`,
};
