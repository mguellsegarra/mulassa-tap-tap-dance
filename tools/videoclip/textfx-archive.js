// The text styles tried and set aside on 2026-11-04 (dev only: type.html's gallery, so the owner can pick among all of
// them). The clip draws only textfx.js's STYLES; one picked from here moves back there.
import { seeded } from './grid.js';
import { SYLLABLES, ease, fit, cover, centred, glitch, heavy, off, offCanvas, DIN, IMPACT, PIXEL, POWER, sylColour, syllables, pop } from './textfx.js';

const FUTURA = px => `800 ${px}px Futura, 'Century Gothic', sans-serif`;

export const ARCHIVE = {
  orMassis: { name: 'Or massís (1a ronda)', note: 'Futura negreta daurada: cop sec sobre negre amb el crit; després la paraula omple la pantalla en files que corren a ritme sobre el vídeo en blanc i negre.',
    draw(ctx, W, H, src, s) {
      const gold = (y0, h) => { const gr = ctx.createLinearGradient(0, y0 - h / 2, 0, y0 + h / 2); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(.45, '#f2c230'); gr.addColorStop(1, '#a87400'); return gr; };
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (s.b < 2) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        const k = ease(s.b / .15), sc = 1.6 - .6 * k, px = fit(ctx, s.word, FUTURA, W * .9, H * .3);
        for (let i = 2; i >= 0; i--) { ctx.save(); ctx.globalAlpha = i ? .18 / i * (1 - k) : 1; ctx.translate(W / 2, H / 2); ctx.scale(sc + i * .08, sc + i * .08); ctx.font = FUTURA(px); ctx.fillStyle = gold(0, px); ctx.fillText(s.word, 0, 0); ctx.restore(); }
        return;
      }
      cover(ctx, src, W, H, 'grayscale(1) brightness(.45) contrast(1.2)');
      const rows = W < H ? 9 : 6, rh = H / rows; ctx.font = FUTURA(rh * .7); ctx.textAlign = 'left';
      const unit = ctx.measureText(s.word + '  ').width, beat = Math.floor(s.b);
      for (let r = 0; r < rows; r++) {
        const y = rh * (r + .5), x0 = (((r % 2 ? 1 : -1) * (s.b - 2) * unit * .25) % unit) - unit, lit = (r + beat) % 3 === 0;
        if (lit) { ctx.fillStyle = gold(y, rh); ctx.fillRect(0, y - rh / 2, W, rh); }
        ctx.fillStyle = lit ? '#000' : gold(y, rh); for (let x = x0; x < W; x += unit) ctx.fillText(s.word, x, y);
      }
    } },
  retallRelleu: { name: 'Retall amb relleu (2a ronda)', note: 'Impact molt gruixuda amb el vídeo dins, contorn negre i relleu, sobre blanc; una franja es desplaça a cada beat.',
    draw(ctx, W, H, src, s) {
      const inv = s.b >= 3.5, beat = Math.floor(s.b), f = s.b - beat, sc = 1 + .06 * Math.pow(1 - f, 4);
      ctx.fillStyle = inv ? '#000' : '#fff'; ctx.fillRect(0, 0, W, H);
      const lines = W >= H ? [s.word] : SYLLABLES[s.word] ?? [s.word], lh = H * .9 / lines.length; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = Math.min(...lines.map(l => fit(ctx, l, IMPACT, W * .92, lh * 1.2))), o = off(W, H);
      ctx.font = o.font = IMPACT(px); o.textBaseline = 'alphabetic'; o.textAlign = 'left';
      const at = lines.map((l, i) => { const m = ctx.measureText(l); return [W / 2 - m.width / 2, H / 2 + (i - (lines.length - 1) / 2) * lh + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2]; });
      lines.forEach((l, i) => o.fillText(l, ...at[i])); o.globalCompositeOperation = 'source-in'; o.filter = inv ? 'invert(1) saturate(1.8)' : 'saturate(1.7) contrast(1.25) brightness(1.3)';
      o.drawImage(src, 0, 0, W, H); o.filter = 'none'; o.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      lines.forEach((l, i) => heavy(ctx, l, ...at[i], px, inv ? '#000' : '#fff', inv ? '#ffd21e' : '#ff2bd6', 7, .045)); ctx.drawImage(offCanvas(), 0, 0); ctx.restore();
      const band = H * .5 + (beat % 3 - 1) * px * .22, bh = px * .16, dx = (beat % 2 ? 1 : -1) * W * .05 * Math.pow(1 - f, 3);
      if (dx) { const img = ctx.getImageData(0, Math.round(band - bh / 2), W, Math.round(bh)); ctx.putImageData(img, Math.round(dx), Math.round(band - bh / 2)); }
    } },
  acidDin: { name: 'Groc àcid condensada (2a ronda)', note: 'El mosaic de files negres sobre groc àcid amb la lletra condensada (DIN) en lloc de la de píxels.',
    draw(ctx, W, H, src, s) {
      const beat = Math.floor(s.b), inv = beat % 4 === 2; ctx.fillStyle = inv ? '#000' : '#e6ff00'; ctx.fillRect(0, 0, W, H);
      const gap = H * .012, base = Math.min(fit(ctx, s.word, DIN, W * .9, H), H / 5.4), hBig = Math.min(fit(ctx, s.word, DIN, W * .96, H), Math.max(base * 1.25, H * .4));
      let rows = Math.max(5, Math.floor((H * .94 - hBig * .86) / (base * .8 * .86 + gap)) + 1); if (rows % 2 === 0) rows--;
      const mid = (rows - 1) / 2, sizes = [...Array(rows)].map((_, r) => (r === mid ? hBig : base * .8));
      let y = (H - sizes.reduce((a, b) => a + b * .86, 0) - gap * (rows - 1)) / 2; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let r = 0; r < rows; r++) {
        if (Math.abs(r - mid) < 1 + Math.floor(s.b * 4)) {
          ctx.font = DIN(sizes[r]); ctx.fillStyle = inv ? '#e6ff00' : '#000'; const step = ctx.measureText(s.word).width + sizes[r] * .35;
          if (r === mid) ctx.fillText(s.word, W / 2, y - sizes[r] * .1);
          else { const x0 = ((((r % 2 ? 1 : -1) * s.b * step * .25 + (r % 2) * step / 2) % step) + step) % step; for (let x = x0 - step; x < W + step; x += step) ctx.fillText(s.word, x, y - sizes[r] * .1); }
        }
        y += sizes[r] * .86 + gap;
      }
    } },
  lletraBlanc: { name: 'Lletra a lletra sobre blanc (2a ronda)', note: 'Cada lletra sola a pantalla completa, negra sobre blanc, una per semicorxera; després la paraula sobre el vídeo.',
    draw(ctx, W, H, src, s) {
      const i = Math.floor(s.b * 4); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      if (i < s.word.length) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); fit(ctx, s.word[i], DIN, W * .9, H * .92); const [x, y] = centred(ctx, s.word[i], W, H); ctx.fillStyle = '#000'; ctx.fillText(s.word[i], x, y); return; }
      cover(ctx, src, W, H); fit(ctx, s.word, DIN, W * .92, H * .5); const [x, y] = centred(ctx, s.word, W, H);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = H * .02; ctx.fillText(s.word, x, y); ctx.shadowBlur = 0;
    } },
  lletraRelleu: { name: 'Lletra a lletra amb relleu (3a ronda)', note: 'Cada lletra sola i gegant, Impact amb contorn i relleu de color, sobre el vídeo fosc, repartides al llarg del crit; després la paraula.',
    draw(ctx, W, H, src, s) {
      const per = s.len / s.word.length, i = Math.floor(s.sec / per); cover(ctx, src, W, H, 'grayscale(.5) brightness(.35)'); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const one = i < s.word.length, text = one ? s.word[i] : s.word, age = one ? s.sec - i * per : s.sec - s.len, sc = 1 + .3 * Math.max(0, 1 - age / .07);
      const px = fit(ctx, text, IMPACT, W * (one ? .8 : .92), H * (one ? .85 : .55)), m = ctx.measureText(text);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); heavy(ctx, text, -m.width / 2, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, px, '#fff', ['#ff2bd6', '#1ee3ff', '#e6ff00'][i % 3], 9); ctx.restore();
    } },
  tunel: { name: 'Túnel (3a ronda)', note: 'Contorns de la paraula que surten del fons i s\'acosten a ritme sobre el vídeo fosc.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'brightness(.35) saturate(1.3)');
      const N = 7, base = fit(ctx, s.word, DIN, W * .9, H * .6); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      for (let i = N - 1; i >= 0; i--) {
        const z = (s.b * .5 + i / N) % 1, sc = .12 * Math.pow(16, z), a = Math.min(1, z * 4) * Math.min(1, (1 - z) * 5);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); ctx.font = DIN(base); const [x, y] = centred(ctx, s.word, W, H);
        ctx.globalAlpha = a; ctx.lineWidth = Math.max(1.5, base * .02) / sc * Math.min(1, sc); ctx.strokeStyle = ['#fff', '#ff2bd6', '#1ee3ff'][i % 3]; ctx.strokeText(s.word, x, y); ctx.restore();
      }
      ctx.globalAlpha = 1;
    } },
  gegant: { name: 'Gegant (4a ronda)', note: 'La paraula a tota la pantalla en la lletra del joc, blanca amb contorn marró i relleu del color de cada síl·laba (GUA taronja, PA turquesa); cada síl·laba cau de dalt quan es diu.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'brightness(.45)');
      const syl = syllables(s), row = W >= H, n = syl.length, lh = row ? H * .8 : H * .92 / n;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = row ? fit(ctx, s.word, POWER, W * .94, lh * 1.25) : Math.min(...syl.map(p => fit(ctx, p.text, POWER, W * .94, lh * 1.3)));
      ctx.font = POWER(px); const widths = syl.map(p => ctx.measureText(p.text).width), total = widths.reduce((a, b) => a + b, 0);
      syl.forEach((p, i) => {
        if (!p.on) return;
        const drop = (1 - Math.min(1, p.age / .1)) ** 2 * H * .25, m = ctx.measureText(p.text), [, dk] = sylColour(s.word, i), [c] = sylColour(s.word, i);
        const x = row ? W / 2 - total / 2 + widths.slice(0, i).reduce((a, b) => a + b, 0) : W / 2 - m.width / 2;
        const y = (row ? H / 2 : H / 2 + (i - (n - 1) / 2) * lh) + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 - drop;
        heavy(ctx, p.text, x, y, px, '#fff', s.word === 'GUAPA' ? c : dk, 10);
      });
    } },
  silabes: { name: 'Síl·labes (4a ronda)', note: 'Les síl·labes en la lletra del joc, cada una del seu color (GUA taronja, PA turquesa) amb contorn marró i relleu, entren quan es diuen; en vertical, apilades a pantalla completa.',
    draw(ctx, W, H, src, s) {
      cover(ctx, src, W, H, 'grayscale(.6) brightness(.35)');
      const syl = syllables(s), row = W >= H, n = syl.length, lineH = row ? H * .7 : H * .9 / n, sp = .1;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      const px = row ? fit(ctx, syl.map(p => p.text).join(' '), POWER, W * .94, lineH) : Math.min(...syl.map(p => fit(ctx, p.text, POWER, W * .92, lineH * 1.3)));
      ctx.font = POWER(px); const widths = syl.map(p => ctx.measureText(p.text).width), total = widths.reduce((a, b) => a + b, 0) + px * sp * (n - 1);
      const f = s.b - Math.floor(s.b), pulse = 1 + .03 * Math.pow(1 - f, 4);
      syl.forEach((p, i) => {
        if (!p.on) return;
        const k = pop(p.age) * pulse, m = ctx.measureText(p.text), [c, dk] = sylColour(s.word, i);
        const cx = row ? W / 2 - total / 2 + widths.slice(0, i).reduce((a, b) => a + b + px * sp, 0) + widths[i] / 2 : W / 2, cy = row ? H / 2 : H / 2 + (i - (n - 1) / 2) * lineH;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); heavy(ctx, p.text, -m.width / 2, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2, px, c, dk, 9); ctx.restore();
      });
    } },
};
