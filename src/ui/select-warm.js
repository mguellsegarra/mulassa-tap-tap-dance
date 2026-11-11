// The selector's first paint, paid under the page cover: Chrome compiles a GPU program for every kind of paint a page has
// not drawn yet, and the selector's first show did it right under the splash's tap (S10: two ~300 ms frames, ~125 programs,
// 821-887 ms lost; rehearsed here 268-319, the longest frame 101-117). While the cover is up the selector shows once as it
// will look, inert and telling nothing (select-ui.js visible's rehearsal), then hides; the cover lifts after it.
const REHEARSAL_MS = 900, REHEARSAL_MAX = 2500; // long enough for its two heavy frames; a device that never runs smooth is let go
let rehearsal = 0, rehearsalAt = 0; // 0 not yet, 1 on show, 2 done
export const selectRehearsing = () => rehearsal === 1;
// Every frame while the cover is up and the fonts are in. wanted: the splash is what the cover lifts on (not a debug
// flow already elsewhere); smooth: the frames run smooth again. True once the cover may lift.
export function rehearseSelect(now, smooth, wanted) {
  if (rehearsal === 0 && wanted) { rehearsal = 1; rehearsalAt = now; }
  else if (rehearsal !== 1 || !wanted || now - rehearsalAt > (smooth ? REHEARSAL_MS : REHEARSAL_MAX)) rehearsal = 2;
  return rehearsal === 2;
}
