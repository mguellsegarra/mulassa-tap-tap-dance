// Paints the board and the top card. `s` is the game's live state.
import { COPY as T } from './copy.js';
import { linked, pieceOf, COLS, ROWS } from './rules.js';
import { GROUND, CAMPANAR_GROUND, CYAN, TAN, NAVY, POP, easeInOut } from './art.js';

export function makePainter(ctx, s) {
  const faceW = () => s.L.cw - s.L.gap;
  const faceH = () => s.L.ch - s.L.gap - s.L.depth;
  const groundOf = b => GROUND[b.bells ? CAMPANAR_GROUND : b.color];

  // Adds a plot to the current path: a corner is round unless a neighbour of the same ground joins there, so a group has one outline.
  function addPlot(x, y, near) {
    const w = faceW(), h = faceH(), R = 10, gap = s.L.gap, down = gap + s.L.depth;
    const n = { l: near(-1, 0), r: near(1, 0), u: near(0, -1), d: near(0, 1) };
    const px = x - (n.l ? gap : 0), py = y - (n.u ? down : 0);
    const pw = w + (n.l ? gap : 0) + (n.r ? gap : 0), ph = h + (n.u ? down : 0) + (n.d ? down : 0);
    ctx.roundRect(px, py, pw, ph, [n.u || n.l ? 0 : R, n.u || n.r ? 0 : R, n.d || n.r ? 0 : R, n.d || n.l ? 0 : R]);
    if (n.r && n.d && near(1, 1)) ctx.rect(x + w - 1, y + h - 1, gap + 2, down + 2); // where four plots meet
  }

  function drawMarks(b, x, y) {
    const mark = groundOf(b).mark, w = faceW(), h = faceH();
    if (!mark) return;
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle = 'rgba(40, 30, 20, .1)';
    ctx.lineWidth = 2;
    for (let j = 1; j < 4; j++) for (let i = 1; i < 4; i++) {
      const px = x + w * i / 4, py = y + h * j / 4;
      if (mark === 'grass') ctx.fillRect(px - 1, py - 3, 2, 6);
      if (mark === 'dots') { ctx.beginPath(); ctx.arc(px, py, 2, 0, 7); ctx.fill(); }
      if (mark === 'tiles') ctx.fillRect(px - 5, py, 10, 2);
      if (mark === 'rings') { ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawPiece(b, x, y, scale = 1, alpha = 1) {
    const p = s.pieces?.[pieceOf(b)];
    if (!p) return;
    const w = faceW(), h = faceH();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2, y + h * .84);
    ctx.scale(scale, scale);
    ctx.drawImage(p.canvas, -p.w / 2, -p.h, p.w, p.h);
    ctx.restore();
    if (b.bells > 1) { // the only number on the board: how many campanars this one holds
      const d = Math.max(20, Math.round(w * .32));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = NAVY;
      ctx.beginPath();
      ctx.arc(x + d / 2 + 3, y + h - d / 2 - 3, d / 2, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.round(d * .68)}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.bells, x + d / 2 + 3, y + h - d / 2 - 2);
      ctx.restore();
    }
  }

  function drawHud() {
    ctx.fillStyle = CYAN;
    ctx.fillRect(0, 0, s.W, s.L.panelH);
    const x = 60, y = s.L.cardY, w = s.W - x - 8, cardH = 44;
    ctx.beginPath();
    ctx.roundRect(x, y, w, cardH, 12);
    ctx.fillStyle = NAVY;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    const col = w / 3;
    ctx.textAlign = 'center';
    [[T.year, s.g.years], [T.points, s.g.score], [T.demolitions, s.g.demolitions]].forEach(([label, value], i) => {
      const cx = x + col * (i + .5);
      ctx.fillStyle = '#fff';
      ctx.font = "800 18px 'Baloo 2', sans-serif";
      ctx.fillText(value, cx, y + 22);
      ctx.fillStyle = '#bcd6ef';
      ctx.font = "700 12px 'Baloo 2', sans-serif";
      ctx.fillText(label, cx, y + 37);
    });
  }

  function drawPlain(ground, x, y, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ground.side;
    ctx.beginPath();
    ctx.roundRect(x, y + s.L.depth, faceW(), faceH(), 10);
    ctx.fill();
    ctx.fillStyle = ground.top;
    ctx.beginPath();
    ctx.roundRect(x, y, faceW(), faceH(), 10);
    ctx.fill();
    ctx.restore();
  }

  function drawBoard(dt) {
    ctx.fillStyle = TAN;
    ctx.fillRect(0, s.L.panelH, s.W, s.H - s.L.panelH);
    const blocks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = s.g.grid[r][c], v = s.views.get(b.id);
      if (!v) continue;
      v.pop = Math.max(0, v.pop - dt / POP);
      v.shake = Math.max(0, v.shake - dt * 3);
      const joined = !s.anim;
      blocks.push({ b: v.held ?? b, id: b.id, c, r, v, near: (dx, dy) => { const o = s.g.grid[r + dy]?.[c + dx]; return joined && !!o && linked(b, o); } });
    }
    const paintLayer = (fill, dx, dy, list) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const it of list) addPlot(Math.round(it.v.x) + dx, Math.round(it.v.y) + dy, it.near);
      ctx.fill();
    };
    // Each layer is one path per ground, so a group has one outline, one edge and one shadow.
    const solid = blocks.filter(it => it.v.alpha >= 1);
    paintLayer('rgba(92, 62, 32, .1)', 12, s.L.depth + 12, solid); // a soft long shadow, then a darker one close by
    paintLayer('rgba(92, 62, 32, .18)', 5, s.L.depth + 5, solid);
    GROUND.forEach((ground, i) => {
      const of = solid.filter(it => (it.b.bells ? CAMPANAR_GROUND : it.b.color) === i);
      if (!of.length) return;
      // the slab: dark foot, front face, a lit bevel along its upper edge, then the top
      paintLayer('rgba(40, 25, 15, .35)', 0, s.L.depth, of);
      paintLayer(ground.side, 0, s.L.depth - 3, of);
      paintLayer(ground.bevel, 0, 2, of);
      paintLayer(ground.shine, 0, -2, of);
      paintLayer(ground.top, 0, 0, of);
    });
    for (const f of s.gone) {
      const p = easeInOut(f.p);
      drawPlain(groundOf(f.b), f.x + (f.tx - f.x) * p, f.y + (f.ty - f.y) * p, f.fade ? 1 - p : 1);
    }
    for (const it of solid) drawMarks(it.b, Math.round(it.v.x), Math.round(it.v.y));
    // Pressing lightens the group a little and leaves the rest of the board alone.
    if (s.press) {
      s.press.age += dt;
      const lit = s.press.info ? s.press.info.group.map(([x, y]) => s.g.grid[y][x].id) : s.g.state === 'stuck' ? [s.press.id] : [];
      const list = blocks.filter(it => lit.includes(it.id));
      if (list.length) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.press.age / .1);
        paintLayer('rgba(255, 255, 255, .28)', 0, 0, list);
        ctx.restore();
      }
    }
    for (const it of blocks) if (it.v.alpha < 1) drawPlain(groundOf(it.b), Math.round(it.v.x), Math.round(it.v.y), it.v.alpha);
    for (const f of s.gone) {
      const p = easeInOut(f.p);
      drawPiece(f.b, f.x + (f.tx - f.x) * p, f.y + (f.ty - f.y) * p, 1, f.fade ? 1 - p : 1 - p * .6);
    }
    // Pieces back to front, so a tall one stands in front of the row behind it.
    for (const it of blocks) {
      const shake = it.v.shake ? Math.sin(it.v.shake * 18) * it.v.shake * 3 : 0;
      const isResult = s.press?.info && s.press.age > .2 && s.press.c === it.c && s.press.r === it.r;
      if (!isResult) drawPiece(it.b, Math.round(it.v.x + shake), Math.round(it.v.y), 1 + Math.sin(it.v.pop * Math.PI) * .08, it.v.alpha);
    }
    // After a short hold, what the group would become, standing on the plot it would land on.
    if (s.press?.info && s.press.age > .2) {
      const t = s.tile(s.press.c, s.press.r), result = { ...s.g.grid[s.press.r][s.press.c], v: s.press.info.v, bells: s.press.info.bells };
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(t.x + 2, t.y + 2, faceW() - 4, faceH() - 4, 8);
      ctx.stroke();
      drawPiece(result, t.x, t.y);
    }
  }

  return { drawBoard, drawHud };
}
