// Three chart proposals for the Mulassa (tools/dev/notes-propostes.html), built only from what the game's MP3 plays
// (chart-events.json: the generator's own hits and tune, in beats), so every tap lands on a sound you hear.
// One side rule for every proposal: GUA (don) = a deep sound (taiko don, kick, a tune step down), PA (ka) = a bright one
// (taiko ka, snare, clap, a tune step up). Each proposal is one DIFÍCIL superset with a fixed side per tap; FÀCIL and
// NORMAL are picked out of it, so harder charts contain the easier ones and a shared note keeps its button.
// The game's chart rules hold (check.mjs; tests/chart-proposals.mjs): half-beat grid, > 0.45 beat apart, the same
// GUAPAs on every level, the game's holds from NORMAL up, nothing inside a GLOBUS.
import EV from './chart-events.json' with { type: 'json' };

const onGrid = b => Math.abs(b * 2 - Math.round(b * 2)) < 1e-6;
const metric = b => b % 4 === 0 ? 1 : b % 2 === 0 ? 0.75 : b % 1 === 0 ? 0.45 : 0.15;
const inBalloon = b => EV.balloons.some(([a, z]) => b > a - 1e-3 && b < z - 1e-3);
const FIRST = Math.min(...EV.melody.map(([b]) => b)); // the tune's first note: before it the game counts in (BALLA!), as the game does

/** The percussion, slot by half beat: { b, side, p }. A taiko in the slot decides its side (it is what you hear
 * as the drum); else a snare or clap makes it PA and a kick GUA. */
function drumSlots() {
  const slot = new Map(), add = (b, kind, v) => {
    if (!onGrid(b) || inBalloon(b) || b < FIRST || b >= EV.end) return;
    const s = slot.get(b) ?? { b }; s[kind] = Math.max(s[kind] ?? 0, v); slot.set(b, s);
  };
  for (const [b, v] of EV.hits.don) add(b, 'don', v);
  for (const [b, v] of EV.hits.ka) add(b, 'ka', v);
  for (const [b, v] of EV.hits.kick) add(b, 'kick', v);
  for (const [b, v] of EV.hits.snare) if (v >= 0.5) add(b, 'snare', v);
  for (const [b, v] of EV.hits.clap) add(b, 'snare', v);
  for (const [b, v] of EV.hits.ohat) add(b, 'ohat', v);
  return [...slot.values()].map(s => {
    const taiko = Math.max(s.don ?? 0, s.ka ?? 0), off = s.b % 1 !== 0;
    // an off-beat eighth with the open hat reads as the bright «txac» even over a taiko (the coda's don runs in eighths)
    const side = off && s.ohat ? 'ka' : taiko ? ((s.don ?? 0) >= (s.ka ?? 0) ? 'don' : 'ka') : s.snare ? 'ka' : s.kick ? 'don' : 'ka';
    return { b: s.b, side, p: Math.max(taiko * 1.2, s.snare ?? 0, (s.kick ?? 0) * 0.8, (s.ohat ?? 0) * 0.5) + metric(s.b) };
  });
}

/** The tune: { b, side, p } per onset; up = PA, down = GUA, a repeat keeps its side; long notes weigh more. */
function tuneSlots() {
  const out = []; let prev = null, side = 'don';
  for (const [b, d, m] of EV.melody) {
    if (prev !== null) side = m > prev ? 'ka' : m < prev ? 'don' : side;
    prev = m;
    if (onGrid(b) && !inBalloon(b) && b < EV.end) out.push({ b, side, p: 0.6 + Math.min(d, 2) * 0.3 + metric(b) });
  }
  return out;
}

// Min gap in beats per level (FÀCIL, NORMAL, DIFÍCIL); the coda (X) lets NORMAL run in eighths.
const GAP = { X: [1, 0.5, 0.5], other: [1, 1, 0.5] };
// At most this many taps per 8 beats, per level (x 2.2 = per 7 s): FÀCIL flat, NORMAL and DIFÍCIL ramp to the coda.
const CAP = {
  tambors: { intro: [3, 3, 4], pickup: [3, 4, 5], A1: [4, 5, 6], A2: [4, 5, 7], B: [4, 6, 10], C: [4, 6, 11], X: [4, 8, 14] },
  melodia: { intro: [3, 3, 4], pickup: [3, 4, 5], A1: [4, 4, 6], A2: [4, 5, 6], B: [4, 6, 9], C: [4, 7, 10], X: [4, 8, 12] },
  mixta: { intro: [3, 3, 4], pickup: [3, 4, 5], A1: [3, 4, 6], A2: [4, 5, 7], B: [4, 7, 10], C: [5, 7, 12], X: [5, 10, 14] },
};
// FÀCIL and NORMAL lean to the bright side so they read «bum… txac», not a row of GUAs on the downbeats.
const KA_FIRST = { tambors: 0.5, melodia: 0.3, mixta: 0.5 };
const part = b => { const l = EV.plan[Math.min(EV.plan.length - 1, Math.floor(b / 4))]; return l.startsWith('intro') ? 'intro' : l; };

function candidates(id) {
  if (id === 'tambors') return drumSlots();
  if (id === 'melodia') { // the tune; where it rests (all of part A's tune is already FÀCIL) the drums fill in, quietly
    const tune = tuneSlots(), at = new Set(tune.map(c => c.b));
    return [...tune.map(c => ({ ...c, p: c.p + 2 })), ...drumSlots().filter(c => !at.has(c.b))];
  }
  // mixta: the tune where it sings (A), the drums where they drive (B, C, X); each fills the other's rests
  const tune = tuneSlots(), drums = drumSlots(), by = new Map();
  for (const c of tune) by.set(c.b, { ...c, p: c.p + (part(c.b).startsWith('A') ? 0.6 : 0) });
  for (const c of drums) {
    const own = !part(c.b).startsWith('A'), had = by.get(c.b);
    const cand = { ...c, p: c.p + (own ? 0.6 : -0.3) };
    if (!had || cand.p > had.p) by.set(c.b, cand);
  }
  return [...by.values()];
}

/** Build one proposal as song.json-like notes [[t, kind, level, big, holdEnd]] on `beats` (the song's own grid). */
export function buildProposal(id, beats) {
  const time = b => { const k = Math.min(Math.floor(b), beats.length - 2); return Math.round((beats[k] + (b - k) * (beats[k + 1] - beats[k])) * 1e4) / 1e4; };
  const fixed = new Map(); // b -> { side, big, hold }: on every level (GUAPAs, the final hit, hold heads)
  const cand = new Map(candidates(id).map(c => [c.b, c]));
  for (const b of EV.big) fixed.set(b, { side: cand.get(b)?.side ?? 'don', big: 1, hold: 0 });
  fixed.set(EV.end, { side: 'don', big: 1, hold: 0 });
  for (const [b, e, kind] of EV.holds) fixed.set(b, { side: kind, big: 0, hold: e });
  const blocked = b => EV.holds.some(([h, e]) => b > h && b < e + 1) || [...fixed.keys()].some(f => f !== b && Math.abs(f - b) < 0.5);
  const free = [...cand.values()].filter(c => !fixed.has(c.b) && !blocked(c.b)).sort((x, y) => y.p - x.p || x.b - y.b);
  const level = new Map([...fixed.keys()].map(b => [b, 0]));
  for (let L = 0; L < 3; L++) {
    const count = (w, n = 8) => [...level.keys()].filter(b => Math.floor(b / n) === w).length;
    const order = L === 2 ? free : [...free].sort((x, y) => y.p + (y.side === 'ka') * KA_FIRST[id] - x.p - (x.side === 'ka') * KA_FIRST[id] || x.b - y.b);
    for (const c of order) {
      if (level.has(c.b)) continue;
      const gap = (GAP[part(c.b)] ?? GAP.other)[L], w = Math.floor(c.b / 8);
      const cap = CAP[id][part(c.b)][L]; // per 8 beats, and evenly: no bar takes more than its half (rounded up)
      if (count(w) >= cap || count(Math.floor(c.b / 4), 4) >= Math.ceil(cap / 2)) continue;
      if ([...level.keys()].some(b => Math.abs(b - c.b) < gap - 1e-6)) continue;
      level.set(c.b, L);
    }
  }
  return [...level.entries()].sort((x, y) => x[0] - y[0]).map(([b, L]) => {
    const f = fixed.get(b), c = cand.get(b);
    return [time(b), f?.side ?? c.side, L, f?.big ?? 0, f?.hold ? time(f.hold) : 0];
  });
}

export const PROPOSALS = [
  { id: 'tambors', name: 'V1 Tambors', text: 'Toques la percussió: GUA amb el taiko greu i el bombo, PA amb el taiko agut, la caixa i les picades.' },
  { id: 'melodia', name: 'V2 Melodia', text: 'Toques la tonada: quan puja és PA, quan baixa és GUA, i les notes llargues pesen més.' },
  { id: 'mixta', name: 'V3 Mixta', text: 'La tonada a la part A, els tambors a B, C i el final, i cadascú omple els silencis de l’altre.' },
];
