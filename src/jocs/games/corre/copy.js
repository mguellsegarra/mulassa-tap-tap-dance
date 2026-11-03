// PROVISIONAL: every player-facing string, until Codex writes the final copy.
export const NAME = 'Mulassa Run';
export const T = {
  how: 'Arrossega el dit, tria portes i esquiva els petards. Com més colla, més alt serà el castell.', // i18n-ok: provisional, until Codex writes the final copy
  start: 'Som-hi',
  loading: 'Carregant la plaça…', // i18n-ok: provisional, until Codex writes the final copy
  loadFailed: "No s'ha pogut carregar la plaça. Torna-ho a provar.", // i18n-ok: provisional, until Codex writes the final copy
  menu: 'Menú', // i18n-ok: provisional, until Codex writes the final copy
  soundOn: 'Activa el so', // i18n-ok: provisional, until Codex writes the final copy
  soundOff: 'Silencia el so', // i18n-ok: provisional, until Codex writes the final copy
  street: (a, b) => `Carrer de la Cort · ${a}/${b}`, // i18n-ok: provisional, until Codex writes the final copy
  loaded: 'Carregat!',
  result: (name, n) => `${name} amb ${n} ${n === 1 ? 'persona' : 'persones'}`, // i18n-ok: provisional, until Codex writes the final copy
  label: c => (c.w === 1 ? `Pilar de ${c.n}` : `${c.w} de ${c.n}`),
  best: name => `Millor castell: ${name}`,
  next: 'Següent',
  again: 'Reinicia',
  retry: 'Torna-hi',
  empty: 'Sense colla!', // i18n-ok: provisional, until Codex writes the final copy
  emptyText: 'Aquesta porta us ha deixat sense ningú.', // i18n-ok: provisional, until Codex writes the final copy
  beaten: 'La rival guanya!', // i18n-ok: provisional, until Codex writes the final copy
  tie: 'Empat, i no queda ningú per fer el castell.', // i18n-ok: provisional, until Codex writes the final copy
  beatenText: n => `Encara li quedaven ${n}. Busca portes millors.`, // i18n-ok: provisional, until Codex writes the final copy
};
