// PROVISIONAL: every player-facing string lives here until Codex writes the final copy.
export const COPY = {
  title: 'Vila del Seguici', // i18n-ok: provisional, until Codex writes the final copy
  how: "Toca parcel·les del mateix color que es toquin. Els edificis poden ser diferents: es fusionen on toques i el resultat creix. A partir de 10 surten monuments: junta'ls per arribar al campanar.", // i18n-ok: provisional, until Codex writes the final copy
  play: 'Comença', // i18n-ok: provisional, until Codex writes the final copy
  retry: 'Torna-hi', // i18n-ok: provisional, until Codex writes the final copy
  menu: 'Menú', // i18n-ok: provisional, until Codex writes the final copy
  tap: 'Toca un grup del mateix color', // i18n-ok: provisional, until Codex writes the final copy
  alone: 'Aquesta parcel·la està sola', // i18n-ok: provisional, until Codex writes the final copy
  stuck: n => `Cap grup! Toca una parcel·la per buidar-la (${n})`,
  becomes: (name, points) => `${name}: +${points} veïns`, // i18n-ok: provisional, until Codex writes the final copy
  year: 'Any', // i18n-ok: provisional, until Codex writes the final copy
  points: 'Veïns', // i18n-ok: provisional, until Codex writes the final copy
  demolitions: 'Enderrocs', // i18n-ok: provisional, until Codex writes the final copy
  score: n => `${n} veïns`,
  towers: n => `Monuments: ${n}`,
  record: 'Nou rècord!', // i18n-ok: provisional, until Codex writes the final copy
  best: n => `Millor partida: ${n}`,
  levels: ['Casteller', 'Solar abandonat', 'Local buit', 'Casa amb bastida', 'Masia', 'Bloc de pisos', 'Supermercat', 'Teatre Principal', 'Capella del Roser', 'Mas Miquel', "Plaça de l'Oli", 'Plaça del Pati', 'Plaça del Blat', 'Museu Casteller', 'Campanar de Sant Joan'], // i18n-ok: provisional, until Codex writes the final copy
  // Irony about places and situations, never about people. Shown when a piece is built.
  quips: { 1: 'Futur projecte', 2: 'Es lloga des de sempre', 3: 'Obres fins a nova ordre', 6: 'Només en caben quatre', 9: 'Parc molt natural', 13: 'Ha trigat més que un 3 de 10' }, // i18n-ok: provisional, until Codex writes the final copy
  ranks: { nans: 'Vila de nans', cavallets: 'Vila de cavallets', mulassa: 'Vila de mulasses', aliga: "Vila d'àligues", gegant: 'Vila de gegants' }, // i18n-ok: provisional, until Codex writes the final copy
};
