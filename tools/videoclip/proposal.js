// A montage proposal (proposals/README.md): pieces of the video's timeline played back to back, with overlays. Pure:
// the tool plays it (app.js), check-proposals.mjs validates it. Times: `from`/`to` in the video's seconds, overlays in
// the proposal's own seconds.
export const MAX_T = 164.5; // the scene runs silent under the end card up to here
export const GROUPS = { youtube: [60, 159.1], reel: [30, 60], stories: [8, 16], tiktok: [20, 40] };

export const proposalLength = p => p.segments.reduce((a, s) => a + s.to - s.from, 0);
// the video second shown at proposal second u, and the segment it falls in
export function sourceAt(p, u) {
  let at = 0;
  for (const [i, s] of p.segments.entries()) {
    const len = s.to - s.from;
    if (u < at + len || i === p.segments.length - 1) return { t: s.from + Math.min(len, Math.max(0, u - at)), i, into: u - at };
    at += len;
  }
  return { t: 0, i: 0, into: 0 };
}
export const joins = p => p.segments.slice(0, -1).reduce((a, s) => [...a, (a.at(-1) ?? 0) + s.to - s.from], []);

// problems with p (errors stop it from playing; warnings are for the author): bars from clip.json's beats
export function checkProposal(p, clip) {
  const errors = [], warnings = [], B = clip.beatTimes, bar = t => B.some((b, i) => i % 4 === clip.downbeat % 4 && Math.abs(b - t) < .02);
  if (!/^[a-z0-9-]{3,60}$/.test(p.id ?? '')) errors.push('id: lowercase letters, digits and hyphens');
  if (!GROUPS[p.group]) errors.push(`group: one of ${Object.keys(GROUPS)}`);
  if (!['yt', 'reel'].includes(p.format)) errors.push('format: yt or reel');
  if (!Array.isArray(p.segments) || !p.segments.length) { errors.push('segments: at least one'); return { errors, warnings }; }
  for (const [i, s] of p.segments.entries()) {
    if (!(s.from >= 0 && s.to <= MAX_T && s.from < s.to)) errors.push(`segment ${i}: 0 <= from < to <= ${MAX_T}`);
    if (i > 0 && !bar(s.from)) warnings.push(`segment ${i}: from ${s.from} is not on a bar line`);
    if (i < p.segments.length - 1 && !bar(s.to)) warnings.push(`segment ${i}: to ${s.to} is not on a bar line`);
  }
  if (p.loop) { // the wrap (end -> start) is a join too
    if (!bar(p.segments[0].from)) warnings.push(`loop: the first piece's from ${p.segments[0].from} is not on a bar line`);
    if (!bar(p.segments.at(-1).to)) warnings.push(`loop: the last piece's to ${p.segments.at(-1).to} is not on a bar line`);
    if (p.fade?.in || p.fade?.out) errors.push('loop: no fade (it would be heard on every turn)');
    if ((p.overlays ?? []).some(o => o.type === 'endcard')) errors.push('loop: no end card');
  }
  const len = proposalLength(p), [lo, hi] = GROUPS[p.group] ?? [0, Infinity];
  if (!p.loop && (len < lo - .5 || len > hi + .5)) warnings.push(`length ${len.toFixed(1)} s, ${p.group} wants ${lo}-${hi} s`);
  for (const o of p.overlays ?? []) {
    if (!['watermark', 'title', 'endcard', 'cta', 'shout'].includes(o.type)) errors.push(`overlay type ${o.type}`);
    if (o.type === 'shout' && !(Number.isInteger(o.index) && o.index >= 0 && o.index < (clip.shouts?.length ?? 0))) errors.push(`shout: index 0-${(clip.shouts?.length ?? 1) - 1}`);
    const a = o.at ?? o.from, z = o.type === 'endcard' ? a + 5.5 : o.type === 'shout' ? a + 1 : o.to ?? a + (o.dur ?? 0);
    if (!(a >= 0 && z <= len + .05)) errors.push(`overlay ${o.type} at ${a}: outside the proposal (0-${len.toFixed(2)} s${o.type === 'endcard' ? ', the end card lasts 5.5 s' : ''})`);
  }
  return { errors, warnings, length: len };
}
