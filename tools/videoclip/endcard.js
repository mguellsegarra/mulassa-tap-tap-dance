// The clip's end card (dev only, endcard.html): the call to play on black, the question in the game's Baloo 2 and the
// yellow mulassa.cat pill under it with the splash logo's glint (src/hud/title.js glint(): a slanted band, a soft wide one
// and a bright core). Four proposals for the owner to pick from; each is draw(ctx, W, H, t) at t s from the card's start,
// pure, so the preview and a frame-by-frame render agree. ?text= changes the question (provisional copy).
// ?render=<key>&ar=169|916: one proposal filling the window, driven by window.__card.frame(t) (render.mjs's contract).
const q = new URLSearchParams(location.search), $ = id => document.getElementById(id);
const TEXT = q.get('text') ?? "T'atreveixes a fer-la ballar?", URL_TEXT = 'mulassa.cat';
const PILL = '#f5c518', INK = '#2a1a10'; // the game's GUAPA gold and dark-brown edge (src/styles/base.css)
const FONT = px => `800 ${px}px 'Baloo 2', system-ui, sans-serif`;
const clamp = x => Math.max(0, Math.min(1, x)), ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const back = x => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; }; // a small overshoot

// the layout, shared: question and pill centred, the pill under it (sizes from the frame's narrower side)
function layout(ctx, W, H) {
  const tall = H > W, px = Math.min(W * (tall ? .085 : .05), H * .09);
  ctx.font = FONT(px);
  let lines = [TEXT];
  if (ctx.measureText(TEXT).width > W * .86) { const w = TEXT.split(' '), h = Math.ceil(w.length / 2); lines = [w.slice(0, h).join(' '), w.slice(h).join(' ')]; }
  const lh = px * 1.15, pillPx = px * .95; ctx.font = FONT(pillPx);
  const pw = ctx.measureText(URL_TEXT).width + pillPx * 1.5, ph = pillPx * 1.75, gap = px * 1.1;
  const total = lines.length * lh + gap + ph, y0 = H / 2 - total / 2;
  return { px, lines, lh, textY: y0 + lh * .78, pillPx, pw, ph, pillX: W / 2 - pw / 2, pillY: y0 + lines.length * lh + gap };
}
function drawText(ctx, L, W, alpha, dy = 0, glow = 0) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = FONT(L.px); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
  if (glow) { ctx.shadowColor = `rgba(255,255,255,${.55 * glow})`; ctx.shadowBlur = L.px * .45; }
  L.lines.forEach((l, i) => ctx.fillText(l, W / 2, L.textY + i * L.lh + dy));
  ctx.restore();
}
const pillPath = (ctx, L, s = 1) => { const w = L.pw * s, h = L.ph * s; ctx.beginPath(); ctx.roundRect(L.pillX + (L.pw - w) / 2, L.pillY + (L.ph - h) / 2, w, h, h / 2); };
// the pill, scaled by s round its centre, and its glint at p (0..1: the band's way across; null: none)
function drawPill(ctx, L, alpha, s = 1, glow = 0, p = null) {
  ctx.save(); ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = `rgba(255,236,170,${.7 * glow})`; ctx.shadowBlur = L.ph * .6; }
  ctx.fillStyle = PILL; pillPath(ctx, L, s); ctx.fill(); ctx.shadowBlur = 0;
  const cx = L.pillX + L.pw / 2, cy = L.pillY + L.ph / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  ctx.font = FONT(L.pillPx); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(URL_TEXT, cx, cy + L.pillPx * .08);
  ctx.restore();
  if (p != null && p > 0 && p < 1) { // the glint: one slanted band of light, its edges a gradient (hard-edged bands showed their lines: the owner)
    const w = L.ph * 1.1, lean = L.ph * .5, x = L.pillX - w + p * (L.pw + 2 * w), cy = L.pillY + L.ph / 2;
    pillPath(ctx, L, s); ctx.clip();
    ctx.translate(x, cy); ctx.transform(1, 0, -lean / L.ph, 1, 0, 0); // a shear: the band leans like the logo's
    const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.42, 'rgba(255,255,255,.18)'); gr.addColorStop(.5, 'rgba(255,255,255,.6)');
    gr.addColorStop(.58, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(-w / 2, -L.ph, w, L.ph * 2);
  }
  ctx.restore();
}
const black = (ctx, W, H, a) => { if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`; ctx.fillRect(0, 0, W, H); } };

// round 2 (the owner liked the minimal one, but wants the pair lit naturally: no cone, no pool edge). Round 1 kept in
// media/versions/endcard-ronda1.js. Each: the question fades in from black, the pill a second later with the logo's
// glint, a hold, a fade to black.
// a light with no shape: a huge, faint radial falloff (centre at cx, cy; k: 0..1), brighter where the pair is
function wash(ctx, W, H, cx, cy, k, tint = '255,248,236', r = Math.hypot(W, H) * .55) {
  if (k <= 0) return;
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gr.addColorStop(0, `rgba(${tint},${.2 * k})`); gr.addColorStop(.35, `rgba(${tint},${.08 * k})`); gr.addColorStop(1, `rgba(${tint},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// a soft bloom behind a drawn thing: draw() painted again blurred and added (light spilling round its edges)
function bloom(ctx, k, blur, draw) {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.filter = `blur(${blur}px)`; draw(); ctx.restore();
}
const fadeOut = (ctx, W, H, t, dur) => black(ctx, W, H, (t - (dur - .8)) / .8);

export const CARDS = {
  // over the video's last seconds (edit.json endcardAt): the picture blurs and dims under the pair, then all fades to black.
  // src: the clip's picture this frame (the tool's WebGL region; the gallery has none: black)
  sobre: { name: 'E · Sobre el vídeo', dur: 5.5, note: 'Entra per sobre dels últims segons del vídeo: la frase i la píndola apareixen amb un fos mentre la imatge es desenfoca i s\'enfosqueix al darrere, i després tot es fon a negre.',
    draw(ctx, W, H, t, src) {
      const k = ease(t / 1.6); // the background's blur and dimming
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (src) { ctx.save(); ctx.filter = `blur(${(k * .014 * Math.min(W, H)).toFixed(1)}px) brightness(${1 - .2 * k})`; ctx.drawImage(src, 0, 0, W, H); ctx.restore(); } // (dimmed only a little: the blur must read)
      const L = layout(ctx, W, H);
      drawText(ctx, L, W, ease((t - .2) / 1), 0, .6);
      drawPill(ctx, L, ease((t - 1.7) / .6), 1, .6 * ease((t - 1.7) / .8), t > 2.4 && t < 2.9 ? ease((t - 2.4) / .5) : null); // (1.5 s after the question)
      black(ctx, W, H, (t - 4.8) / .7); // (to black only at the very end)
    } },
  minim: { name: 'A · Mínim', dur: 5.5, note: 'La proposta 4 tal com era: negre pur, acostament molt lent i una resplendor blanca suau enganxada a les lletres. Sense cap llum a l\'escena.',
    draw(ctx, W, H, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const z = 1 + .05 * ease(t / 5.5); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const L = layout(ctx, W, H);
      drawText(ctx, L, W, ease(t / 1), 0, .6);
      drawPill(ctx, L, ease((t - 1) / .6), 1, .6 * ease((t - 1) / .8), t > 1.7 && t < 2.2 ? ease((t - 1.7) / .5) : null);
      ctx.restore(); fadeOut(ctx, W, H, t, 5.5);
    } },
  ambient: { name: 'B · Llum ambiental', dur: 5.5, note: 'Una claror molt àmplia i tènue que neix al centre, darrere la frase, sense cap forma ni vora: el negre s\'aclareix una mica al voltant de les lletres, com si hi hagués llum fora de pla. Acostament lent.',
    draw(ctx, W, H, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const z = 1 + .04 * ease(t / 5.5); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const L = layout(ctx, W, H);
      wash(ctx, W, H, W / 2, (L.textY + L.pillY) / 2, ease(t / 1.6));
      drawText(ctx, L, W, ease(t / 1), 0, .35);
      drawPill(ctx, L, ease((t - 1) / .6), 1, .45 * ease((t - 1) / .8), t > 1.7 && t < 2.2 ? ease((t - 1.7) / .5) : null);
      ctx.restore(); fadeOut(ctx, W, H, t, 5.5);
    } },
  contrallum: { name: 'C · Contrallum', dur: 5.5, note: 'La llum ve de darrere de les lletres: un halo blanc difús que les retalla sobre el negre (com un rètol il·luminat per darrere) i un halo daurat darrere la píndola. Les lletres queden nítides al davant.',
    draw(ctx, W, H, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const z = 1 + .04 * ease(t / 5.5); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const L = layout(ctx, W, H), kt = ease(t / 1.2), kp = ease((t - 1) / .7);
      bloom(ctx, .9 * kt, L.px * .55, () => drawText(ctx, L, W, 1));
      bloom(ctx, .55 * kt, L.px * 1.4, () => drawText(ctx, L, W, 1));
      bloom(ctx, .8 * kp, L.ph * .5, () => drawPill(ctx, L, 1));
      drawText(ctx, L, W, kt);
      drawPill(ctx, L, kp, 1, 0, t > 1.7 && t < 2.2 ? ease((t - 1.7) / .5) : null);
      ctx.restore(); fadeOut(ctx, W, H, t, 5.5);
    } },
  passada: { name: 'D · Llum que passa', dur: 5.5, note: 'Una claror suau i sense vores travessa el quadre en diagonal un cop, molt a poc a poc, i en passar per sobre de la frase i la píndola les il·lumina una mica més (alhora que la brillantor del logo). Després queda una claror fixa i tènue.',
    draw(ctx, W, H, t) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const L = layout(ctx, W, H), u = ease((t - .3) / 3.2), cx = -W * .3 + u * W * 1.6, cy = H * .2 + u * H * .5;
      wash(ctx, W, H, cx, cy, Math.sin(Math.PI * clamp((t - .3) / 3.2)) * 1.3, '255,246,228', Math.hypot(W, H) * .45);
      wash(ctx, W, H, W / 2, (L.textY + L.pillY) / 2, .5 * ease((t - 2.5) / 1.5));
      const near = Math.max(0, 1 - Math.abs(cx - W / 2) / (W * .5));
      drawText(ctx, L, W, ease(t / 1), 0, .25 + .5 * near);
      drawPill(ctx, L, ease((t - 1) / .6), 1, .3 + .5 * near, t > 1.9 && t < 2.4 ? ease((t - 1.9) / .5) : null);
      fadeOut(ctx, W, H, t, 5.5);
    } },
};

if (location.pathname.endsWith('endcard.html')) { // (app.js imports CARDS: the page's own code runs only here)
const RENDER = q.get('render');
const size = ar => (ar === '916' ? [1080, 1920] : [1920, 1080]);
if (RENDER) { // one card, the whole window (render.mjs: ?render=<key>&ar=169|916&scale=)
  document.body.classList.add('render');
  const c = document.createElement('canvas'); c.id = 'out'; const k = +q.get('scale') || 1, [w0, h0] = size(q.get('ar') ?? '169'), w = Math.round(w0 * k), h = Math.round(h0 * k);
  c.width = w; c.height = h; c.style.cssText = `width:${w}px;height:${h}px`; document.body.append(c);
  const card = CARDS[RENDER], ctx = c.getContext('2d');
  window.__card = { duration: card.dur, size: [w, h], frame: t => card.draw(ctx, w, h, t), ready: document.fonts.load("800 40px 'Baloo 2'") };
} else {
  let ar = '169', t0 = performance.now(), loop = true;
  const grid = $('grid'), panels = Object.entries(CARDS).map(([key, card]) => {
    const fig = document.createElement('figure'), c = document.createElement('canvas'), cap = document.createElement('figcaption');
    cap.innerHTML = `<b>${card.name} · ${key}</b><span>${card.note} (${card.dur} s)</span>`; fig.append(c, cap); grid.append(fig);
    return { card, c, ctx: c.getContext('2d') };
  });
  // Codex's four still frames (media/endcard-codex/, imagegen), after the animated ones; their format follows the buttons
  const stills = [['E1', 'Halo íntim'], ['E2', 'Llum de ras'], ['E3', 'Alè fred'], ['E4', 'Reflex de seda']].map(([k, name]) => {
    const fig = document.createElement('figure'), img = new Image(), cap = document.createElement('figcaption');
    img.style.cssText = 'width:100%;border-radius:6px;display:block'; cap.innerHTML = `<b>${k} · ${name} · Codex (imatge fixa)</b><span>media/endcard-codex/README.md</span>`;
    fig.append(img, cap); grid.append(fig); return { img, k };
  });
  const resize = () => {
    for (const x of stills) x.img.src = `media/endcard-codex/${x.k.toLowerCase()}-${ar}.png`; const [w, h] = size(ar).map(v => v / 2); for (const p of panels) { p.c.width = w; p.c.height = h; } grid.classList.toggle('tall', ar === '916'); };
  for (const b of document.querySelectorAll('[data-ar]')) b.onclick = () => { ar = b.dataset.ar; document.querySelectorAll('[data-ar]').forEach(x => x.classList.toggle('on', x === b)); resize(); };
  $('play').onclick = () => { t0 = performance.now(); };
  $('loop').onclick = () => { loop = !loop; $('loop').classList.toggle('on', loop); };
  resize();
  const frame = () => {
    const t = (performance.now() - t0) / 1000, longest = Math.max(...panels.map(p => p.card.dur)) + .8;
    const tt = loop ? t % longest : t;
    for (const p of panels) p.card.draw(p.ctx, p.c.width, p.c.height, Math.min(tt, p.card.dur));
    $('t').textContent = `${tt.toFixed(1)} s`; requestAnimationFrame(frame);
  };
  document.fonts.load("800 40px 'Baloo 2'").finally(frame);
  window.__cards = { at: s => { t0 = performance.now() - s * 1000; loop = false; } };
}
}
