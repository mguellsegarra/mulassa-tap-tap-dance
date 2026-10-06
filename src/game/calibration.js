// Sync calibration maths. A metronome plays CLICKS clicks one beat apart; the player taps on each one.
// Click and tap times are "heard" times on the audio clock (currentTime minus the output latency the browser
// reports, exactly like Chip.now()), so what is measured is only the extra delay the browser can't see
// (Bluetooth, TV, a slow screen) plus the player's own habit, which is what offsetMs must cancel.
export const CAL = { clicks: 10, skip: 2, early: 0.12, min: 4, beat: 0.6 }; // its own 100 BPM: slow enough to read big lags

export const clickTimes = (start, n, beat) => Array.from({ length: n }, (_, i) => start + i * beat);

const median = xs => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Each tap belongs to the click just before it (up to `early` s ahead of it counts as that click too), so lags
// up to a beat minus `early` (~480 ms at the metronome's 100 BPM, enough for any Bluetooth) are read correctly. The first `skip`
// clicks are for finding the pulse, only the first tap per click counts, and far-off taps are dropped as
// outliers. Returns the median lag in whole ms, or null when too few taps were usable.
export function measureOffset(taps, clicks, { skip = CAL.skip, early = CAL.early, min = CAL.min } = {}) {
  if (clicks.length < 2) return null;
  const beat = clicks[1] - clicks[0], lag = new Map();
  for (const tap of [...taps].sort((a, b) => a - b)) {
    const i = Math.floor((tap - clicks[0] + early) / beat);
    if (i < skip || i >= clicks.length || lag.has(i)) continue;
    lag.set(i, tap - clicks[i]);
  }
  let d = [...lag.values()];
  if (d.length < min) return null;
  const m = median(d), spread = median(d.map(x => Math.abs(x - m)));
  d = d.filter(x => Math.abs(x - m) <= Math.max(0.04, 3 * spread));
  return d.length < min ? null : Math.round(median(d) * 1000);
}

export const fmtMs = ms => `${ms > 0 ? '+' : ms < 0 ? '−' : ''}${Math.abs(ms)} ms`;

// One line reading the measured lag, for the result screen.
export const verdict = ms => Math.abs(ms) < 15 ? 'Gairebé perfecte: no cal gaire ajust.'
  : ms > 0 ? 'Els teus auriculars van amb retard: ho compensarem.'
  : 'Marques una mica abans del so: ho compensarem.';

// The sheet edits a draft of the stored offset; commit() writes it only when it really changed, so opening and
// closing the sheet (or nudging − then +) never touches the saved value or its toast.
export function offsetDraft(saved) {
  let value = saved;
  return {
    get value() { return value; },
    get changed() { return value !== saved; },
    set(v) { value = v; },
    commit(write) { if (value === saved) return false; write(value); saved = value; return true; },
  };
}
