// The songs the music editor and the compiler know (an allowlist: ids never become paths from outside).
// `score` and `form` are relative to music/, `game` (the generated song the game plays) to src/. A new character adds one row here.
export const SONGS = {
  mulassa: { score: 'mulassa/score.json', form: 'mulassa/mulassa-form.json', game: 'song-mulassa.json' },
  drac: { score: 'drac/drac-score.json', form: 'drac/drac-form.json', game: 'song-drac.json' },
};

export const isSong = id => Object.hasOwn(SONGS, id);
