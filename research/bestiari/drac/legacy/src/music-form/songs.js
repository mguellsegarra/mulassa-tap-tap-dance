// The songs the music editor and the compiler know (an allowlist: ids never become paths from outside).
// `score` and `form` are relative to music/, `game` (the generated song the game plays) to src/. A new character adds one row here.
export const SONGS = {
  mulassa: { score: 'score.json', form: 'mulassa-form.json', game: 'song.json' },
  drac: { score: 'drac-score.json', form: 'drac-form.json', game: 'song-drac.json' },
};

export const isSong = id => Object.hasOwn(SONGS, id);
