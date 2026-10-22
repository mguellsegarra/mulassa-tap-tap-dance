// The music-form compiler (src/music-form/CONTRACT.md): a song's form + its score -> one timeline, pure and deterministic.
// Browser-safe (no node, no DOM). Positions are exact rationals while laying out (a 1/6 triplet sums to its bar exactly)
// and become doubles only in the output. Content problems never throw: they go to `unresolved` and the event is dropped,
// never moved to another beat.

// ------------------------------------------------------------------ exact numbers
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const R = (n, d = 1) => { const g = gcd(n, d) * (d < 0 ? -1 : 1); return { n: n / g, d: d / g }; };
const add = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a, b) => R(a.n * b.n, a.d * b.d);
const val = r => r.n / r.d;
const cmp = (a, b) => a.n * b.d - b.n * a.d;
const ZERO = R(0);

/** "0.75", "1/6", "2" or a JSON number -> rational. */
function rat(x) {
  const m = /^(-?\d+)(?:\.(\d+))?(?:\/(\d+))?$/.exec(String(x).trim());
  if (!m) throw new Error(`not a number: ${x}`);
  const f = m[2] ?? '', r = R(Number(m[1] + f), 10 ** f.length);
  return m[3] ? mul(r, R(1, Number(m[3]))) : r;
}

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(name) {
  const m = /^([A-G])([#b]*)(\d)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + m[2].split('#').length - m[2].split('b').length;
}

/** "C5:1.5 R:0.5" -> [{ m: midi|null, d: rational }] (durations in the score's quarters, before any scale). */
const parseBar = text => text.trim().split(/\s+/).filter(Boolean).map(tok => {
  const [name, d] = tok.split(':');
  if (d === undefined) throw new Error(`no duration in "${tok}"`);
  return { m: name === 'R' ? null : midiOf(name), d: rat(d) };
});

// ------------------------------------------------------------------ revision
const canonical = v => Array.isArray(v) ? `[${v.map(canonical)}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`)}}`
    : JSON.stringify(v);

function sha1(text) {
  const bytes = new TextEncoder().encode(text), len = bytes.length;
  const w = new Uint32Array((((len + 8) >>> 6) + 1) * 16);
  for (let i = 0; i < len; i++) w[i >> 2] |= bytes[i] << (24 - (i & 3) * 8);
  w[len >> 2] |= 0x80 << (24 - (len & 3) * 8);
  w[w.length - 1] = len * 8;
  let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const x = new Uint32Array(80), rol = (v, n) => (v << n) | (v >>> (32 - n));
  for (let o = 0; o < w.length; o += 16) {
    for (let i = 0; i < 16; i++) x[i] = w[o + i];
    for (let i = 16; i < 80; i++) x[i] = rol(x[i - 3] ^ x[i - 8] ^ x[i - 14] ^ x[i - 16], 1);
    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1]
        : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rol(a, 5) + f + e + k + x[i]) | 0;
      e = d; d = c; c = rol(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return [h0, h1, h2, h3, h4].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

/** The revision of a form: sha-1 of its canonical JSON (sorted keys, no whitespace). */
export const formRevision = form => sha1(canonical(form));

// ------------------------------------------------------------------ tempo -> seconds
const roundEven = x => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : f % 2 === 0 ? f : f + 1; };

/** `knots` = [[beat, bpm]] ascending. Returns { beatUs, beats } for the whole beats 0..end (end+8 intervals of µs). */
function clockOf(clock, leadIn, knots, end) {
  const n = Math.floor(end) + 8;
  if (clock === 'constant-exact') {
    const spb = 60 / knots[0][1];
    return { beatUs: Array(n).fill(roundEven(60e6 / knots[0][1])), beats: Array.from({ length: Math.floor(end) + 1 }, (_, b) => leadIn + b * spb) };
  }
  // drac-midpoint-us: smoothstep between the knots; each whole beat takes the tempo at its middle in whole µs a quarter
  const tempoAt = b => {
    for (let i = 0; i + 1 < knots.length; i++) {
      const [b0, t0] = knots[i], [b1, t1] = knots[i + 1];
      if (b < b1) { const k = Math.min(1, Math.max(0, (b - b0) / (b1 - b0))); return t0 + (t1 - t0) * k * k * (3 - 2 * k); }
    }
    return knots[knots.length - 1][1];
  };
  const beatUs = Array.from({ length: n }, (_, k) => roundEven(60e6 / tempoAt(k + 0.5)));
  const at = [0];
  for (const u of beatUs) at.push(at[at.length - 1] + u / 1e6);
  return { beatUs, beats: Array.from({ length: Math.floor(end) + 1 }, (_, b) => leadIn + at[b]) };
}

// ------------------------------------------------------------------ laying bars out
/** Plays `entries` one after another from `t0`. Ties join two notes only across ADJACENT occurrences. */
function lay(entries, t0, ties) {
  const occ = [], melody = [];
  let t = t0, prevBar = null, lastNote = false;
  for (const e of entries) {
    const o = { id: `${e.item}#${e.iteration}:${e.u}`, item: e.item, iteration: e.iteration, unfolded: e.u, bar: e.bar, start: t, dur: ZERO, label: e.label, beatScale: e.scale, notes: [] };
    e.tokens.forEach((tok, i) => {
      const d = mul(tok.d, e.scale);
      if (tok.m !== null) {
        const tied = i === 0 && lastNote && ties.some(([a, b]) => a === prevBar && b === e.bar);
        if (tied) melody[melody.length - 1].d = add(melody[melody.length - 1].d, d);
        else melody.push({ s: t, d, m: tok.m, ref: `${o.id}/${o.notes.length}`, item: e.item });
        o.notes.push({ s: t, d, m: tok.m });
      }
      lastNote = tok.m !== null;
      t = add(t, d);
    });
    o.dur = add(t, R(-o.start.n, o.start.d));
    prevBar = e.bar;
    occ.push(o);
  }
  return { occ, melody, end: t };
}

const publicOcc = o => ({ id: o.id, item: o.item, iteration: o.iteration, unfolded: o.unfolded, bar: o.bar, start: val(o.start), dur: val(o.dur), label: o.label, beatScale: val(o.beatScale), notes: o.notes.map(n => [val(n.s), val(n.d), n.m]) });

function labelsOf(first, occ, skip) {
  const arr = first.slice();
  let last = null;
  for (const o of occ.slice(skip)) if (o.label !== last) { arr.push([val(o.start), o.label]); last = o.label; }
  return arr;
}

// ------------------------------------------------------------------ the compiler
function setup(form, score) {
  const unresolved = [];
  const bad = (path, message) => unresolved.push({ path, message });
  const src = form.source ?? {};
  const bars = new Map((score?.bars ?? []).map(([n, text]) => [n, text]));
  const transpose = src.transpose ?? 0;
  const unfolded = new Map();
  (src.unfolded ?? []).forEach((u, i) => {
    if (unfolded.has(u.id)) bad(`source.unfolded[${i}].id`, `duplicate id ${u.id}`);
    // i18n-ok: build-tool diagnostic (English)
  else if (!bars.has(u.bar)) bad(`source.unfolded[${i}].bar`, `score has no bar ${u.bar}`);
    else unfolded.set(u.id, u);
  });
  const tokens = (u, notes, path) => {
    try { return parseBar(notes ?? bars.get(unfolded.get(u).bar)).map(t => t.m === null ? t : { ...t, m: t.m + transpose }); }
    catch (err) { bad(path, err.message); return null; }
  };
  return { unresolved, bad, src, unfolded, tokens, ties: src.ties ?? [] };
}

function entry(c, { item, iteration, u, label, scale, notes, path }) {
  const ub = c.unfolded.get(u);
  if (!ub) { if (!iteration) c.bad(path, `bar ${u} is not in source.unfolded`); return null; }
  let s;
  try { s = rat(scale ?? 1); } catch (err) { c.bad(path, err.message); return null; }
  const tokens = c.tokens(u, notes, path);
  return tokens && { item, iteration, u, bar: ub.bar, label, scale: s, tokens };
}

function clockPart(c, form, endBeat, knots) {
  const t = form.tempo ?? {};
  if (!['constant-exact', 'drac-midpoint-us'].includes(t.clock)) c.bad('tempo.clock', `unknown clock ${t.clock}`);
  else if (t.interpolation && t.interpolation !== 'smoothstep') c.bad('tempo.interpolation', `unknown interpolation ${t.interpolation}`);
  else if (!knots.length) c.bad('tempo.knots', 'no tempo knot');
  else if (knots.some(([b, bpm], i) => !(bpm > 0) || (i && b <= knots[i - 1][0]))) c.bad('tempo.knots', 'knots must have a positive bpm and ascending beats');
  else if (t.clock === 'constant-exact' && knots.length > 1) c.bad('tempo.knots', 'constant-exact takes exactly one knot');
  else if (endBeat !== null) return { clock: t.clock, ...clockOf(t.clock, t.leadIn ?? 0, knots, endBeat) };
  return { clock: t.clock, beatUs: [], beats: [] };
}

// The reference recording's clock (optional): anchors (any anchor -> a second of the source video), strictly rising in
// both, the last on `end`. Song seconds follow the generator's sec(): leadIn + whole beats' µs + the fraction of the next.
function referencePart(c, form, anchor, beatUs) {
  const r = form.reference;
  if (!r) return { ref: [], refEnd: null, refAnchors: [] };
  const leadIn = form.tempo?.leadIn ?? 0, at = [0];
  for (const u of beatUs) at.push(at[at.length - 1] + u / 1e6);
  const anchors = [];
  (r.anchors ?? []).forEach((a, i) => {
    const t = anchor(a.at, `reference.anchors[${i}].at`);
    if (!t) return;
    const b = val(t), k = Math.floor(b);
    if (!(Number.isFinite(a.ref) && a.ref >= 0)) return c.bad(`reference.anchors[${i}].ref`, 'ref must be a second >= 0');
    if (k < 0 || k >= beatUs.length) return c.bad(`reference.anchors[${i}].at`, `beat ${b} is outside the tempo map`);
    const prev = anchors[anchors.length - 1];
    if (prev && !(b > prev[0] && a.ref > prev[2])) return c.bad(`reference.anchors[${i}]`, 'anchors must rise in beats and seconds');
    anchors.push([b, leadIn + at[k] + (b - k) * beatUs[k] / 1e6, a.ref]);
  });
  if (!(r.end > 0)) c.bad('reference.end', 'end must be a positive second');
  else if (anchors.length && anchors[anchors.length - 1][2] !== r.end) c.bad('reference.end', 'the last anchor must sit on end');
  if (anchors.length < 2) c.bad('reference.anchors', 'at least two anchors');
  return { ref: anchors.map(([, s, ref]) => [s, ref]), refEnd: r.end ?? null, refAnchors: anchors.map(([b, , ref]) => [b, ref]) };
}

function checkLabels(c, form, ...pairs) {
  const ok = new Set(form.labels ?? []);
  for (const [path, label] of pairs) if (!ok.has(label)) c.bad(path, `label ${label} is not in labels`);
}

export function compileForm(form, score) {
  if (!form || form.version !== 1) throw new Error('music form: version must be 1');
  const c = setup(form, score), { bad } = c;
  const phrases = new Map((form.phrases ?? []).map(p => [p.id, p]));
  const intro = form.intro ?? { beats: 0 };

  // pickup + sequence -> bars to lay out
  const pre = [];
  const pk = intro.pickup && entry(c, { item: 'pickup', iteration: 0, u: intro.pickup.bar, label: intro.pickup.label ?? 'pickup', scale: intro.pickup.beatScale, path: 'intro.pickup.bar' });
  if (pk) pre.push(pk);
  const body = [];
  (form.sequence ?? []).forEach((it, i) => {
    const ph = phrases.get(it.phrase), ids = it.bars ?? ph?.bars;
    if (!ids) return bad(`sequence[${i}].phrase`, `phrase ${it.phrase} not found`);
    checkLabels(c, form, [`sequence[${i}].label`, it.label]);
    for (let r = 0; r < (it.repeat ?? 1); r++) ids.forEach((u, j) => {
      const ov = it.barOverrides?.[u] ?? {};
      const e = entry(c, { item: it.id, iteration: r, u, label: it.label, scale: ov.beatScale ?? it.beatScale, notes: ov.notes, path: `sequence[${i}].${it.bars ? 'bars' : `phrase ${it.phrase}`}[${j}]` });
      if (e) body.push(e);
    });
  });
  const pre0 = lay(pre, ZERO, c.ties);                  // only to measure the pickup
  const seqStart = rat(intro.beats ?? 0), pickStart = add(seqStart, R(-pre0.end.n, pre0.end.d));
  if (cmp(pickStart, ZERO) < 0) bad('intro', 'the pickup is longer than the intro');
  const played = lay([...pre, ...body], pre.length ? pickStart : seqStart, c.ties);
  const occ = played.occ, melody = played.melody;

  // anchors
  const byBar = new Map(occ.map(o => [`${o.item}|${o.iteration}|${o.unfolded}`, o]));
  const spans = [];                                       // one per (item, iteration), in play order
  for (const o of occ) {
    const s = spans.find(x => x.item === o.item && x.iteration === o.iteration);
    if (s) s.end = add(o.start, o.dur); else spans.push({ item: o.item, iteration: o.iteration, start: o.start, end: add(o.start, o.dur) });
  }
  const itemSpan = (item, iteration, edge) => {
    const its = spans.filter(s => s.item === item && (iteration === undefined || s.iteration === iteration));
    return its.length ? its[edge === 'start' ? 0 : its.length - 1][edge] : undefined;
  };
  const anchor = (a, path) => {
    try {
      let t;
      if (a?.beat !== undefined) t = rat(a.beat);
      else if (a?.bar !== undefined) {
        const o = byBar.get(`${a.item}|${a.iteration ?? 0}|${a.bar}`);
        if (!o) return void bad(path, `bar ${a.bar} is not played in item ${a.item}`);
        t = o.start;
        if (a.note !== undefined) {
          const n = a.note < 0 ? o.notes.length + a.note : a.note;
          if (!o.notes[n]) return void bad(path, `note ${a.note} is not in ${o.id}`);
          t = o.notes[n].s;
        }
      } else if (a?.edge === 'start' || a?.edge === 'end') {
        t = itemSpan(a.item, a.iteration, a.edge);
        if (!t) return void bad(path, `item ${a.item} is not played`);
      } else return void bad(path, 'not an anchor');
      return a.offset ? add(t, rat(a.offset)) : t;
    } catch (err) { bad(path, err.message); }
  };

  // events
  const ev = form.events ?? {};
  const span = (list, kind, path) => (list ?? []).flatMap((e, i) => {
    const s = anchor(e.start, `${path}[${i}].start`), t = anchor(e.end, `${path}[${i}].end`);
    if (!s || !t) return [];
    if (cmp(t, s) <= 0) return void bad(`${path}[${i}]`, 'ends before it starts') ?? [];
    if (kind && !['don', 'ka'].includes(e.kind)) return void bad(`${path}[${i}].kind`, 'kind must be don or ka') ?? [];
    return [[val(s), val(t), kind ? e.kind : undefined]];
  }).sort((a, b) => a[0] - b[0]);
  const balloons = span(ev.balloons, false, 'events.balloons').map(([s, t]) => [s, t]);
  const holds = span(ev.holds, true, 'events.holds');
  const fills = (ev.fills ?? []).flatMap(({ at, ...f }, i) => { const t = anchor(at, `events.fills[${i}].at`); return t ? [{ ...f, beat: val(t) }] : []; });
  (ev.noteDurations ?? []).forEach((nd, i) => {
    const a = nd.at ?? {}, path = `events.noteDurations[${i}].at`;
    let k = -1;
    if (a.bar !== undefined) {
      const o = byBar.get(`${a.item}|${a.iteration ?? 0}|${a.bar}`), n = (a.note ?? 0) < 0 ? (o?.notes.length ?? 0) + a.note : (a.note ?? 0);
      k = o ? melody.findIndex(m => m.ref === `${o.id}/${n}`) : -1;
    } else {
      const own = melody.map((m, j) => [m, j]).filter(([m]) => m.item === a.item);
      k = own.length ? own[(a.note ?? 0) < 0 ? own.length + a.note : a.note]?.[1] ?? -1 : -1;
    }
    if (k < 0) return bad(path, 'no melody note there (missing, or tied into the note before)');
    try { melody[k].d = rat(nd.beats); } catch (err) { bad(path, err.message); }
  });

  // ending, arrangement, tempo
  const en = form.ending ?? {};
  const [finale, roll, hit] = ['finale', 'roll', 'hit'].map(k => (en[k] ? anchor(en[k], `ending.${k}`) : void bad(`ending.${k}`, 'missing') ?? null));
  const introLabels = intro.labels ?? [[0, 'intro']];
  const arrangement = labelsOf([...introLabels, ...(pk ? [[val(pickStart), intro.pickup.label ?? 'pickup']] : [])], occ, pk ? 1 : 0);
  if (roll) arrangement.push([val(roll), 'roll']);
  arrangement.sort((a, b) => a[0] - b[0]);
  checkLabels(c, form, ...introLabels.map(([, l], i) => [`intro.labels[${i}]`, l]), ...(pk ? [['intro.pickup.label', intro.pickup.label ?? 'pickup']] : []), ['ending.roll', 'roll']);
  const knots = (form.tempo?.knots ?? []).flatMap((k, i) => { const t = anchor(k.at, `tempo.knots[${i}].at`); return t ? [[val(t), k.bpm]] : []; });
  const clock = clockPart(c, form, hit ? val(hit) : null, knots);
  const reference = referencePart(c, form, anchor, clock.beatUs);

  return {
    song: form.song, revision: formRevision(form), beatsPerBar: c.src.beatsPerBar, bpm: knots[0]?.[1] ?? null,
    occurrences: occ.map(publicOcc),
    melody: melody.map(m => [val(m.s), val(m.d), m.m]), melodyRef: melody.map(m => m.ref),
    arrangement,
    itemSpans: spans.map(s => [s.item, s.iteration, val(s.start), val(s.end)]),
    tempo: { clock: clock.clock, knots, beatUs: clock.beatUs }, beats: clock.beats,
    end: hit ? val(hit) : null, finale: finale ? val(finale) : null,
    balloons, holds: holds.map(([s, t, kind]) => [s, t, kind]), fills, ...reference, unresolved: c.unresolved,
  };
}

/** The ORIGINAL (`source.unfolded`) played straight: label = section, scale 1, the first tempo knot, no events. */
export function compileOriginal(form, score) {
  if (!form || form.version !== 1) throw new Error('music form: version must be 1');
  const c = setup(form, score);
  const entries = [...c.unfolded.values()].map(u => entry(c, { item: 'original', iteration: 0, u: u.id, label: u.section, path: `source.unfolded[${u.id}]` })).filter(Boolean);
  const { occ, melody, end } = lay(entries, ZERO, c.ties);
  const endBeat = val(end), bpm = form.tempo?.knots?.[0]?.bpm ?? null;
  const knots = bpm ? [[0, bpm]] : [];
  const clock = clockPart(c, form, endBeat, knots);
  return {
    song: form.song, revision: formRevision(form), beatsPerBar: c.src.beatsPerBar, bpm,
    occurrences: occ.map(publicOcc),
    melody: melody.map(m => [val(m.s), val(m.d), m.m]), melodyRef: melody.map(m => m.ref),
    arrangement: labelsOf([], occ, 0), itemSpans: [['original', 0, 0, endBeat]],
    tempo: { clock: clock.clock, knots, beatUs: clock.beatUs }, beats: clock.beats,
    end: endBeat, finale: null, balloons: [], holds: [], fills: [], ref: [], refEnd: null, refAnchors: [], unresolved: c.unresolved,
  };
}
