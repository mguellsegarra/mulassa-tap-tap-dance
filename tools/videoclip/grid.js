// The song's grid for the clip (clip.json from analyze.py): beats, bars, phrases and how hard each stem plays.
// Everything in the clip is a pure function of the song second t, so a seek, the preview and the frame-by-frame render
// show the same picture.

// a seeded random in [0, 1) (mulberry32): the crowd, the haze and each cut's variation are the same every load
export function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

export function createGrid(clip) {
  // the beats are tracked one by one (Suno's tempo drifts: 166 -> 168 bpm); between and past them, linear
  const T = clip.beatTimes, n = T.length, P = 60 / clip.bpm, BAR = 4;
  const beatAt = t => {
    if (t <= T[0]) return (t - T[0]) / (T[1] - T[0]);
    if (t >= T[n - 1]) return n - 1 + (t - T[n - 1]) / (T[n - 1] - T[n - 2]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
    return lo + (t - T[lo]) / (T[lo + 1] - T[lo]);
  };
  const timeAt = b => {
    if (b <= 0) return T[0] + b * (T[1] - T[0]);
    if (b >= n - 1) return T[n - 1] + (b - n + 1) * (T[n - 1] - T[n - 2]);
    const i = Math.floor(b); return T[i] + (b - i) * (T[i + 1] - T[i]);
  };
  // phrases: start beats; overrides (the tool's section editor) replace the guessed labels
  const phrases = clip.phrases.map((p, i, a) => ({ ...p, end: a[i + 1]?.beat ?? n }));
  const phraseAt = t => {
    const b = Math.max(0, beatAt(t)); let i = phrases.length - 1; // (before the first beat: the first phrase's start)
    while (i > 0 && phrases[i].beat > b) i--;
    return { ...phrases[i], index: i, at: (b - phrases[i].beat) / (phrases[i].end - phrases[i].beat), beatIn: b - phrases[i].beat };
  };
  // a stem's level at t, linear between beats (0..1)
  const level = (stem, t) => {
    const a = clip.levels[stem] ?? clip.kickLevel; const b = Math.max(0, Math.min(n - 1.001, beatAt(t)));
    const i = Math.floor(b), f = b - i; return a[i] * (1 - f) + (a[i + 1] ?? a[i]) * f;
  };
  // how long since the last event of a list (s), Infinity before the first: the lights' and dancers' hits decay from it
  const since = list => t => {
    let lo = 0, hi = list.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (list[m] <= t) lo = m + 1; else hi = m; }
    return lo ? t - list[lo - 1] : Infinity;
  };
  const sinceKick = since(clip.kicks), sinceSnare = since(clip.snares), sinceHat = since(clip.hats);
  const hit = (s, decay) => (s === Infinity ? 0 : Math.exp(-s / decay));
  // the spoken shouts ("Mulassa!", "Guapa!"): which one was last (index, -1 none) and how long ago (s)
  const shouts = clip.shouts ?? [], sinceShout = since(shouts);
  const shout = t => { const s = sinceShout(t); return { s, index: s === Infinity ? -1 : shouts.findLastIndex(x => x <= t) }; };
  // the run of same-kind phrases round phrase i (the intro and outro play as one piece, whatever their 8-bar chunks)
  const runOf = (i, labelOf) => {
    const k = j => labelOf(j) ?? phrases[j].label; let a = i, b = i;
    while (a > 0 && k(a - 1) === k(i)) a--;
    while (b < phrases.length - 1 && k(b + 1) === k(i)) b++;
    return { first: a, last: b, beat: phrases[a].beat, end: phrases[b].end };
  };
  return { clip, P, BAR, beatAt, timeAt, phrases, phraseAt, runOf, level, shout, kick: t => hit(sinceKick(t), .09), snare: t => hit(sinceSnare(t), .12), hat: t => hit(sinceHat(t), .04) };
}
