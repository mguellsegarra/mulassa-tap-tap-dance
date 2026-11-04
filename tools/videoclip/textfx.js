// The clip's full-screen words on the song's spoken shouts (MULASSA, GUAPA): one style per shout with at most one repeat
// (the owner, 2026-11-04), which edit.json's `texts` assigns, in a heavy, serious face (Futura Condensed
// ExtraBold, the reference's family: the owner wants it powerful, nothing comic) and the game's colours (GUA's orange,
// PA's turquoise, the gold and dark-brown edge of its GUAPA note). Each style draws a whole frame on a 2D canvas from
// `src` (the clip's own picture: a video in type.html, the WebGL canvas in the clip) and s: { word, b (beats since the
// shout), sec (s since it), len (how long it is said), syl (its syllables' starts, s), kick }. A word shows its
// syllables as they are sung and stays the shout's length and a little more. Flashing stays at or under one swap a beat.
import { seeded } from './grid.js';

const AFTER = 1.5; // beats a word stays on after it is said (the owner: 7 beats was too long)
export const SYLLABLES = { MULASSA: ['MU', 'LAS', 'SA'], GUAPA: ['GUA', 'PA'] }; // (Catalan splits the double s: mu-las-sa)
export const ease = x => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
export const DIN = px => `700 ${px}px 'DIN Condensed', 'Arial Narrow', sans-serif`;
export const IMPACT = px => `400 ${px}px Impact, 'Arial Black', sans-serif`;
export const PIXEL = px => `400 ${px}px 'Jersey 10', monospace`;

// the largest font size at which `text` fits `w` px (at most `max`)
export function fit(ctx, text, font, w, max) { let px = max; ctx.font = font(px); const m = ctx.measureText(text).width; if (m > w) px *= w / m; ctx.font = font(px); return px; }
export function cover(ctx, src, W, H, filter = 'none') {
  ctx.filter = filter;
  if (!(src instanceof HTMLVideoElement) || src.readyState >= 2) ctx.drawImage(src, 0, 0, W, H); else { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H); }
  ctx.filter = 'none';
}
// `text` centred on the letters' own box (DIN Condensed's line metrics put a 'middle' baseline well above it)
export function centred(ctx, text, W, H) { const m = ctx.measureText(text); return [W / 2 - m.width / 2, H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2]; }
// the glitch: horizontal bands of what is drawn shifted sideways on the kick (seeded per beat: the same every replay)
export function glitch(ctx, W, H, beat, kick, bands = 16, reach = .1) {
  if (kick < .2) return;
  const rnd = seeded(beat * 97 + 3), bh = Math.ceil(H / bands), img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < bands; i++) { const dx = Math.round((rnd() - .5) * 2 * W * reach * kick); if (rnd() < .4 && dx) ctx.putImageData(img, dx, 0, -dx, i * bh, W, bh); }
}
// the words' face ('VC Power': index.html and type.html map it to the Mac's Futura Condensed ExtraBold) and the game's
// colours (src/styles/base.css --gua, --pa, the GUAPA note's gold and edge)
export const POWER = px => `${px}px 'VC Power', Impact, sans-serif`;
const GAME = { gua: '#ff7a1a', guaDk: '#b34d00', pa: '#14b8a6', paDk: '#0b7f72', gold: '#f5c518', edge: '#2a1a10' };
// a syllable's colour: GUA orange, PA turquoise; MULASSA's all gold
// the blocks' louder take on the game's colours (the owner: brighter), GUA, PA and MULASSA's
const LOUD = ['#ff6200', '#00f5d4', '#ffd600'];
export const sylColour = (word, i) => (word === 'GUAPA' ? (i ? [GAME.pa, GAME.paDk] : [GAME.gua, GAME.guaDk]) : [GAME.gold, '#a87a00']);
// hard lettering: a short, sharp drop shadow down and right in `shade`, a thin black outline with square corners, then
// the face in `fill` (rounded joins and a thick brown edge made it read as a cartoon: the owner); left-aligned at x on
// the baseline y, the current font
let scratch = null; // an offscreen canvas for the knockouts
export const off = (W, H) => { scratch ??= document.createElement('canvas'); scratch.width = W; scratch.height = H; const o = scratch.getContext('2d'); o.clearRect(0, 0, W, H); return o; };
export const offCanvas = () => scratch;
export function heavy(ctx, text, x, y, px, fill, shade, depth = 4, outline = .035) {
  ctx.lineJoin = 'miter'; ctx.miterLimit = 2; const step = px * .012;
  for (let d = depth; d >= 1; d--) { ctx.fillStyle = d === depth ? '#000' : shade; ctx.fillText(text, x + d * step, y + d * step); }
  ctx.strokeStyle = '#000'; ctx.lineWidth = px * outline; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
// the syllables of a word and when each comes in (s from the shout): measured on the voice (clip.json shoutSyl), or
// split evenly over how long it is said
export function syllables(s) {
  const parts = SYLLABLES[s.word] ?? [s.word], at = s.syl?.length === parts.length ? s.syl : parts.map((_, i) => i * s.len / parts.length);
  return parts.map((p, i) => ({ text: p, at: at[i], age: s.sec - at[i], on: s.sec >= at[i] }));
}
// a pop: from `from` to 1 over the first `dur` s after a syllable comes in, a small overshoot
export const pop = (age, from = .55, dur = .12) => { const u = Math.min(1, Math.max(0, age / dur)); return from + (1 - from) * (1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2); };

export const STYLES = {
  titol: { name: 'Títol', note: 'Per a l\'inici: la plaça gairebé a negre i MULASSA en blanc fi i espaiat, amb una mica de resplendor; les lletres apareixen al ritme de la veu, s\'ajunten a poc a poc i es fonen al final.',
    draw(ctx, W, H, src, s) {
      const out = Math.min(1, Math.max(0, (s.until - s.at) / .3)); // the last 0.3 s: the title goes, the shot comes up
      const dimIn = Math.min(1, Math.max(0, (s.at - (s.t - .6)) / .6)), k = dimIn * dimIn * (3 - 2 * dimIn) * out; // the plaça dims over the 0.6 s before it (it dropped at once)
      cover(ctx, src, W, H, `brightness(${1 - .75 * k})`);
      // letters: [start s, how many] a syllable, measured on the voice: its letters come in together as it is sung (40 ms apart)
      const vis = s.letters ? s.letters.flatMap(([at, n]) => [...Array(n)].map((_, k) => Math.min(1, Math.max(0, (s.sec - at - k * .03) / .12)))) : null;
      const shown = s.sec / s.len * s.word.length, spread = (W < H ? .5 : 1) * (.55 - .25 * Math.min(1, s.sec / (s.until - s.t))); // the letters close up slowly (less air in a tall frame: it was tiny)
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = Math.min(H * .16, W * .94 / (s.word.length * (.62 + spread))); ctx.font = `300 ${px}px 'DIN Condensed', 'Avenir Next Condensed', 'Arial Narrow', sans-serif`;
      const adv = [...s.word].map(c => ctx.measureText(c).width + px * spread), total = adv.reduce((a, b) => a + b, 0) - px * spread;
      const m = ctx.measureText(s.word); let x = W / 2 - total / 2; const y = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      ctx.shadowColor = '#ffffffaa'; ctx.shadowBlur = px * .25; ctx.fillStyle = '#fff';
      [...s.word].forEach((c, i) => { ctx.globalAlpha = (vis ? vis[i] : Math.min(1, Math.max(0, shown - i))) * out; ctx.fillText(c, x, y); x += adv[i]; });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } },
  contorn: { name: 'Contorn', note: 'La paraula de banda a banda amb un traç blanc gruixut, sobre el vídeo en blanc i negre; cada síl·laba es dibuixa quan es diu; al kick el traç es desdobla en els colors del joc (taronja i turquesa).',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'grayscale(1) contrast(1.35) brightness(.7)');
      const px = fit(ctx, s.word, POWER, W * .96, H * .75), syl = syllables(s), text = syl.filter(x => x.on).map(x => x.text).join('');
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'miter'; ctx.miterLimit = 2;
      const [x0, y] = centred(ctx, s.word, W, H), lw = Math.max(3, px * .04) * (1 + s.kick), split = px * .035 * s.kick;
      for (const [dx, col, a] of [[-split, GAME.gua, .9], [split, GAME.pa, .9], [0, '#fff', 1]]) {
        if (!dx && col !== '#fff') continue;
        ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeText(text, x0 + dx, y);
      }
      ctx.globalAlpha = 1;
    } },
  acid: { name: 'Groc àcid', note: 'La lletra de píxels del joc en files negres sobre groc àcid, la del mig més gran i quieta; les altres entren per anells i llisquen sense parar, alternant esquerra i dreta; un glitch suau al kick i una inversió per compàs.',
    draw(ctx, W, H, src, s) {
      const font = PIXEL, beat = Math.floor(s.b), f = s.b - beat, inv = beat % 4 === 2; // a bar's third beat: yellow on black (one swap a bar)
      ctx.fillStyle = inv ? '#000' : '#e6ff00'; ctx.fillRect(0, 0, W, H);
      const gap = H * .012, base = Math.min(fit(ctx, s.word, font, W * .9, H), H / 5.4), hBig = Math.min(fit(ctx, s.word, font, W * .96, H), Math.max(base * 1.25, H * .4));
      let rows = Math.max(5, Math.floor((H * .94 - hBig * .86) / (base * .8 * .86 + gap)) + 1); if (rows % 2 === 0) rows--; // fill the height (9:16: more rows), odd
      const mid = (rows - 1) / 2, sizes = [...Array(rows)].map((_, r) => (r === mid ? hBig : base * .8));
      let y = (H - sizes.reduce((a, b) => a + b * .86, 0) - gap * (rows - 1)) / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const shown = 1 + Math.floor(s.b * 4); // the shout lands on the middle row, the rows round it pile in on the sixteenths
      for (let r = 0; r < rows; r++) {
        if (Math.abs(r - mid) < shown) {
          ctx.font = font(sizes[r]); ctx.fillStyle = inv ? '#e6ff00' : '#000';
          const step = ctx.measureText(s.word).width + sizes[r] * .35;
          if (r === mid) { // a wide frame: three times across the middle (one left the band empty: the owner)
            const text = W > H ? [s.word, s.word, s.word].join(' ') : s.word, px = W > H ? fit(ctx, text, font, W * .96, sizes[r]) : sizes[r]; ctx.fillText(text, W / 2, y - sizes[r] * .1 + (sizes[r] - px) * .43); } // (centred in its row's height)
          else { // the side rows slide on and on, every other row the other way, a quarter word a beat (the owner: the jolts were jerky)
            const x0 = ((((r % 2 ? 1 : -1) * s.b * step * .25 + (r % 2) * step / 2) % step) + step) % step;
            for (let x = x0 - step; x < W + step; x += step) ctx.fillText(s.word, x, y - sizes[r] * .1);
          }
        }
        y += sizes[r] * .86 + gap;
      }
      if (beat % 2 === 0) glitch(ctx, W, H, beat, s.kick, 16, .03); // (every other beat, and slight: the rows slide, they should not jerk)
    } },
  invertit: { name: 'Invertit', note: 'El vídeo sencer i, a sobre, la paraula enorme en la lletra del joc que l\'inverteix (negatiu dins de les lletres); cada síl·laba entra de cop quan es diu.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H);
      const syl = syllables(s), lines = W >= H ? [syl] : syl.map(x => [x]), lh = H * .92 / lines.length;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = Math.min(...lines.map(l => fit(ctx, l.map(x => x.text).join(''), POWER, W * .98, lh * 1.25)));
      ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff';
      lines.forEach((l, r) => {
        ctx.font = POWER(px); const word = l.map(x => x.text).join(''), m = ctx.measureText(word); let x = W / 2 - m.width / 2;
        const y = H / 2 + (r - (lines.length - 1) / 2) * lh + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        for (const p of l) { const w = ctx.measureText(p.text).width; if (p.on) { const k = pop(p.age, .8); ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(k, k); ctx.fillText(p.text, -w / 2, 0); ctx.restore(); } x += w; }
      });
      ctx.globalCompositeOperation = 'source-over';
    } },
  blocs: { name: 'Blocs', note: 'Cada síl·laba en un bloc de color sòlid i cridaner de cantonades rectes (GUA taronja, PA turquesa, totes dues amb la lletra negra a la mateixa mida), que entra tallant de costat quan es diu.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'grayscale(.7) brightness(.35)');
      const syl = syllables(s), row = W >= H, n = syl.length, gap = Math.min(W, H) * .025;
      const bw = row ? (W * .92 - gap * (n - 1)) / n : W * .9, bh = row ? H * .62 : (H * .86 - gap * (n - 1)) / n;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = Math.min(...syl.map(p => fit(ctx, p.text, POWER, bw * .86, bh * 1.15))); // one size for every syllable (PA came out bigger than GUA)
      syl.forEach((p, i) => {
        if (!p.on) return;
        const x = row ? W / 2 - (n * bw + (n - 1) * gap) / 2 + i * (bw + gap) : W / 2 - bw / 2, y = row ? H / 2 - bh / 2 : H / 2 - (n * bh + (n - 1) * gap) / 2 + i * (bh + gap);
        const k = Math.min(1, p.age / .09), c = LOUD[s.word === 'GUAPA' ? i : 2], dir = i % 2 ? -1 : 1; // a wipe in from the side
        ctx.save(); ctx.beginPath(); ctx.rect(dir > 0 ? x : x + bw * (1 - k), y, bw * k, bh); ctx.clip();
        ctx.fillStyle = c; ctx.fillRect(x, y, bw, bh); ctx.font = POWER(px); const m = ctx.measureText(p.text);
        ctx.fillStyle = '#000'; ctx.fillText(p.text, x + bw / 2 - m.width / 2, y + bh / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
        ctx.restore();
      });
    } },
  contornDin: { name: 'Contorn fi', note: 'DIN Condensed, només el traç blanc fi; cada síl·laba entra quan es diu; al kick es desdobla en magenta i cian.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'grayscale(1) contrast(1.35) brightness(.75)');
      const px = fit(ctx, s.word, DIN, W * .92, H * .6), shown = syllables(s).filter(x => x.on).reduce((n, x) => n + x.text.length, 0); // (syllable by syllable, as it is said)
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const [x0, y] = centred(ctx, s.word, W, H), lw = Math.max(2, px * .022) * (1 + s.kick * 2), split = px * .03 * s.kick;
      for (const [dx, col, a] of [[-split, '#ff2bd6', .85], [split, '#1ee3ff', .85], [0, '#fff', 1]]) { if (!dx && col !== '#fff') continue; ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeText(s.word.slice(0, shown), x0 + dx, y); }
      ctx.globalAlpha = 1;
    } },
  retallBlanc: { name: 'Retall sobre blanc', note: 'Impact gegant sobre blanc amb el videoclip dins de les lletres; batega al beat; a la meitat s\'inverteix.',
    draw(ctx, W, H, src, s) {
      const inv = s.b >= 3.5, f = s.b - Math.floor(s.b), sc = 1 + .06 * Math.pow(1 - f, 4), o = off(W, H);
      o.textAlign = 'center'; o.textBaseline = 'middle'; o.save(); o.translate(W / 2, H / 2); o.scale(sc, sc);
      if (H > W) { const lh = H * .92 / s.word.length; o.font = IMPACT(lh * 1.12); [...s.word].forEach((c, i) => o.fillText(c, 0, -H * .46 + lh * (i + .5))); }
      else { fit(o, s.word, IMPACT, W * .96, H * .8); o.fillText(s.word, 0, H * .03); }
      o.restore(); o.globalCompositeOperation = 'source-in'; o.filter = inv ? 'invert(1) saturate(1.6)' : 'saturate(1.5) contrast(1.15)';
      o.drawImage(src, 0, 0, W, H); o.filter = 'none'; o.globalCompositeOperation = 'source-over';
      ctx.fillStyle = inv ? '#000' : '#fff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(offCanvas(), 0, 0);
    } },
  pixelGlitch: { name: 'Píxel glitch', note: 'La lletra de píxels del joc, negra sobre groc àcid un beat i invertida sobre el vídeo l\'altre; tartamudeja (MU · MULA · MULASSA) i es trenca en franges al kick.',
    draw(ctx, W, H, src, s) {
      const beat = Math.floor(s.b), acid = beat % 2 === 0;
      const parts = s.word === 'MULASSA' ? ['MU', 'MULAS', 'MULASSA'] : ['GUA', 'GUAPA', 'GUAPA'], text = parts[Math.min(parts.length - 1, Math.floor(s.b * 2))];
      if (acid) { ctx.fillStyle = '#e6ff00'; ctx.fillRect(0, 0, W, H); } else cover(ctx, src, W, H);
      const px = fit(ctx, s.word, PIXEL, W * .94, H * .5); ctx.font = PIXEL(px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = acid ? '#000' : '#fff'; ctx.globalCompositeOperation = acid ? 'source-over' : 'difference'; ctx.fillText(text, W / 2, H / 2); ctx.globalCompositeOperation = 'source-over';
      glitch(ctx, W, H, beat, s.kick, 14, .12);
    } },
};

// the word on screen at t: edit.json's text for the last shout, while it is said and AFTER beats more, or until the next
// drop starts (it lands clean)
export function textAt(g, t, edit, labelOf) {
  for (const ti of edit.titles ?? []) if (t >= ti.t - .6 && t < ti.until) return { ...ti, b: g.beatAt(t) - g.beatAt(ti.t), sec: Math.max(0, t - ti.t), at: t, kick: 0 };
  const sh = g.shout(t); if (sh.index < 0) return null;
  const spec = edit.texts?.[sh.index]; if (!spec) return null;
  const at = t - sh.s, b = g.beatAt(t) - g.beatAt(at), len = g.clip.shoutLens?.[sh.index] ?? .8;
  let end = g.beatAt(at + len) - g.beatAt(at) + (spec.after ?? AFTER), LIFE = end;
  for (let i = g.phraseAt(at).index + 1; i < g.phrases.length; i++) {
    const p = g.phrases[i], lab = labelOf(i) ?? p.label;
    if (p.beat - g.beatAt(at) > LIFE) break;
    if (lab === 'drop' || lab === 'hard') { end = Math.min(end, p.beat - g.beatAt(at)); break; }
  }
  // sec: seconds since the shout; len: how long it is said (clip.json shoutLens), for words that follow the voice
  return b < end ? { ...spec, b, sec: sh.s, len, syl: spec.syl ?? g.clip.shoutSyl?.[sh.index], kick: g.kick(t) } : null;
}
