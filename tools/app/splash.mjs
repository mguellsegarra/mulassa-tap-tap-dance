// The app's launch splash (the web's walking Mulassa, «sense frase») from the web's own art, so app and web can't drift:
// reads MULASSA_SVG (src/ui/loader.js), the ml-* rules and keyframes and the cover's tile (index.html), and writes
//   iOS:     Assets.xcassets/SplashParts/*.imageset (one SVG per layer), Splash.imageset (rest pose, the launch screen),
//            Launcher/SplashArt.swift (the layer tree and keyframe tables)
//   Android: res/drawable/splash_*.xml (VectorDrawables; the rest pose is the system splash icon), launcher/SplashArt.kt
// Run: node tools/app/splash.mjs   (writes only generated files)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const write = (p, s) => { mkdirSync(dirname(join(ROOT, p)), { recursive: true }); writeFileSync(join(ROOT, p), s); };

const FIG = { w: 220, h: 168 }; // the art's units
const VIEW = { x: -20, y: -20, w: 320, h: 208 }; // each layer's canvas: the ears and the road overflow the figure's box
const REST = { x: -20, y: -20, w: 260, h: 208 }; // the rest pose, centred on the figure's centre (110, 84)
const SIZE = 180 / FIG.w; // the web cover's figure is 180 px wide (#loader.page .mula-spinner): points / dp per unit
const BG = '#140c07'; // #loader.page background (var(--page-edge))

// ---------- tiny XML ----------
function parseXml(src) {
  const root = { tag: '#root', attrs: {}, kids: [] }, stack = [root];
  const re = /<(\/?)([\w:-]+)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
  for (let m; (m = re.exec(src));) {
    const [, close, tag, rawAttrs, self] = m;
    if (close) { stack.pop(); continue; }
    const attrs = {};
    for (const a of rawAttrs.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = a[2] ?? a[3];
    const el = { tag, attrs, kids: [] };
    stack.at(-1).kids.push(el);
    if (!self) stack.push(el);
  }
  return root.kids;
}
const xml = el => `<${el.tag}${Object.entries(el.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}${el.kids.length ? `>${el.kids.map(xml).join('')}</${el.tag}>` : '/>'}`;
const classes = el => (el.attrs.class || '').split(/\s+/).filter(Boolean);
const inline = el => Object.fromEntries((el.attrs.style || '').split(';').filter(Boolean).map(d => d.split(':').map(s => s.trim())));

// ---------- CSS: ml-* rules (by specificity, then order) and keyframes ----------
const html = read('index.html');
const css = html.slice(html.indexOf('.mula-load{display:block'), html.indexOf('@media (prefers-reduced-motion: reduce){.mula-load'));
const keyframes = {};
for (const m of css.matchAll(/@keyframes\s+(ml-[\w-]+)\s*\{((?:[^{}]*\{[^}]*\})*)\s*\}/g)) {
  keyframes[m[1]] = [...m[2].matchAll(/([\d%,\sa-z]+)\{([^}]*)\}/g)].map(k => ({
    at: k[1].split(',').map(s => s.trim()).map(s => s === 'from' ? 0 : s === 'to' ? 1 : parseFloat(s) / 100),
    decl: Object.fromEntries(k[2].split(';').filter(Boolean).map(d => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()])),
  }));
}
const rules = [];
for (const m of css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  for (const sel of m[1].split(',').map(s => s.trim())) {
    if (/\.(sad|mini)\b|ml-tear|ml-sad/.test(sel)) continue; // the failure pose and the head-only icon are not the splash
    const last = sel.split(/\s+/).at(-1);
    if (!/^\.ml-/.test(last)) continue;
    rules.push({ need: last.split('.').filter(Boolean), spec: (sel.match(/\./g) || []).length, order: rules.length,
      decl: Object.fromEntries(m[2].split(';').filter(Boolean).map(d => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()])) });
  }
}
function computed(el) {
  const cls = classes(el), out = {};
  rules.filter(r => r.need.every(c => cls.includes(c))).sort((a, b) => a.spec - b.spec || a.order - b.order).forEach(r => Object.assign(out, r.decl));
  return Object.assign(out, inline(el));
}

// ---------- transforms ----------
const num = s => parseFloat(s);
const pct = (s, of) => s.endsWith('%') ? num(s) / 100 * of : num(s);
function transform(str, box) {
  const t = { tx: 0, ty: 0, r: 0, sx: 1, sy: 1 };
  if (!str || str === 'none') return t;
  for (const [, fn, args] of str.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean);
    if (fn === 'translateY') t.ty = pct(a[0], box.h);
    else if (fn === 'translateX') t.tx = pct(a[0], box.w);
    else if (fn === 'translate') { t.tx = pct(a[0], box.w); t.ty = pct(a[1] ?? '0', box.h); }
    else if (fn === 'rotate') t.r = num(a[0]);
    else if (fn === 'scale') { t.sx = num(a[0]); t.sy = num(a[1] ?? a[0]); }
    else throw new Error(`transform ${fn}`);
  }
  // CSS interpolates translate-then-rotate lists that differ in length through matrix decomposition, which for these
  // (no skew, angles under 180°) equals interpolating each component: the tables below hold the components.
  if (/scale/.test(str) && /rotate/.test(str)) throw new Error('scale and rotate together');
  return t;
}
const EASE = { linear: 0, 'ease-in-out': 1, 'ease-out': 2, ease: 3 };
const secs = s => s.endsWith('ms') ? num(s) / 1000 : num(s);

// ---------- SVG normalisation (shared by both platforms) ----------
// stroke-dasharray becomes explicit dashes (VectorDrawable has none); only straight H/h lines and one q curve occur.
function dashed(d, dash) {
  const m = d.match(/^M\s*([-\d.]+)[\s,]*([-\d.]+)\s*([Hhq])([-\d.\s,]+)$/);
  if (!m) throw new Error(`dash on ${d}`);
  const x0 = num(m[1]), y0 = num(m[2]), v = m[4].trim().split(/[\s,]+|(?=-)/).map(num);
  const pt = m[3] === 'H' ? u => [x0 + (v[0] - x0) * u, y0] : m[3] === 'h' ? u => [x0 + v[0] * u, y0]
    : u => { const [cx, cy, ex, ey] = [x0 + v[0], y0 + v[1], x0 + v[2], y0 + v[3]], w = 1 - u;
      return [w * w * x0 + 2 * w * u * cx + u * u * ex, w * w * y0 + 2 * w * u * cy + u * u * ey]; };
  const N = 400, pts = [], len = [0];
  for (let i = 0; i <= N; i++) pts.push(pt(i / N));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = s => { let i = len.findIndex(l => l >= s); if (i <= 0) return pts[Math.max(0, i)];
    const f = (s - len[i - 1]) / (len[i] - len[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; };
  const total = len[N], dashes = dash.split(/[\s,]+/).map(num);
  let out = '', s = 0, k = 0;
  const r = x => +x.toFixed(3);
  while (s < total) {
    const on = dashes[k % dashes.length], off = dashes[(k + 1) % dashes.length];
    const a = at(s), b = at(Math.min(total, s + on));
    out += `M${r(a[0])} ${r(a[1])}L${r(b[0])} ${r(b[1])}`;
    s += on + off; k += 2;
  }
  return out;
}
const f3 = x => +(+x).toFixed(3);
const shapePath = el => {
  const a = el.attrs, n = k => num(a[k] ?? 0);
  if (el.tag === 'rect') {
    const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')], rx = Math.min(n('rx') || n('ry'), w / 2, h / 2);
    if (!rx) return `M${f3(x)} ${f3(y)}h${f3(w)}v${f3(h)}h${f3(-w)}z`;
    return `M${f3(x + rx)} ${f3(y)}h${f3(w - 2 * rx)}a${f3(rx)} ${f3(rx)} 0 0 1 ${f3(rx)} ${f3(rx)}v${f3(h - 2 * rx)}a${f3(rx)} ${f3(rx)} 0 0 1 ${f3(-rx)} ${f3(rx)}h${f3(2 * rx - w)}a${f3(rx)} ${f3(rx)} 0 0 1 ${f3(-rx)} ${f3(-rx)}v${f3(2 * rx - h)}a${f3(rx)} ${f3(rx)} 0 0 1 ${f3(rx)} ${f3(-rx)}z`;
  }
  const [cx, cy] = [n('cx'), n('cy')], [rx, ry] = el.tag === 'circle' ? [n('r'), n('r')] : [n('rx'), n('ry')];
  return `M${f3(cx - rx)} ${f3(cy)}a${f3(rx)} ${f3(ry)} 0 1 0 ${f3(2 * rx)} 0a${f3(rx)} ${f3(ry)} 0 1 0 ${f3(-2 * rx)} 0z`;
};
// Every drawable becomes a <path> with resolved paint (inherited fill/stroke/width/caps, opacity folded in), under <g>s
// that carry only transforms.
const PAINT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
function normalise(kids, inherit = { fill: '#000', stroke: 'none', 'stroke-width': '1', opacity: 1 }) {
  const out = [];
  for (const el of kids) {
    const ctx = { ...inherit };
    for (const k of PAINT) if (el.attrs[k] != null) ctx[k] = el.attrs[k];
    if (el.attrs.opacity != null) ctx.opacity *= num(el.attrs.opacity);
    if (el.tag === 'g') {
      const kidsOut = normalise(el.kids, ctx);
      out.push(...(el.attrs.transform ? [{ tag: 'g', attrs: { transform: el.attrs.transform }, kids: kidsOut }] : kidsOut));
      continue;
    }
    let d = el.tag === 'path' ? el.attrs.d : shapePath(el);
    if (el.attrs['stroke-dasharray']) d = dashed(d, el.attrs['stroke-dasharray']);
    const attrs = { d };
    for (const k of PAINT) if (ctx[k] != null && !(k !== 'fill' && k !== 'stroke' && ctx.stroke === 'none')) attrs[k] = ctx[k];
    if (attrs.fill && attrs.fill !== 'none' && el.attrs['stroke-dasharray']) attrs.fill = 'none';
    if (ctx.opacity !== 1) attrs.opacity = f3(ctx.opacity);
    const p = { tag: 'path', attrs, kids: [] };
    out.push(el.attrs.transform ? { tag: 'g', attrs: { transform: el.attrs.transform }, kids: [p] } : p);
  }
  return out;
}
const svgDoc = (kids, view, pt) => `<svg xmlns="http://www.w3.org/2000/svg" width="${f3(view.w * pt)}" height="${f3(view.h * pt)}" viewBox="${view.x} ${view.y} ${view.w} ${view.h}">${kids.map(xml).join('')}</svg>\n`;

// VectorDrawable: transforms become nested groups, paint becomes attributes.
const hex = c => { c = c.replace('#', ''); if (c.length === 3) c = [...c].map(x => x + x).join(''); return `#${c.toUpperCase()}`; };
function vdKids(kids, ind) {
  return kids.map(el => {
    if (el.tag === 'g') {
      const fns = [...el.attrs.transform.matchAll(/(\w+)\(([^)]*)\)/g)].map(([, fn, a]) => [fn, a.split(/[\s,]+/).filter(Boolean).map(num)]);
      let open = '', close = '', pad = ind;
      for (const [fn, a] of fns) {
        const attr = fn === 'translate' ? `android:translateX="${a[0]}" android:translateY="${a[1] ?? 0}"`
          : fn === 'rotate' ? `android:rotation="${a[0]}"` : fn === 'scale' ? `android:scaleX="${a[0]}" android:scaleY="${a[1] ?? a[0]}"` : null;
        if (!attr) throw new Error(`vd transform ${fn}`);
        open += `${pad}<group ${attr}>\n`; close = `${pad}</group>\n${close}`; pad += '  ';
      }
      return open + vdKids(el.kids, pad) + close;
    }
    const a = el.attrs, o = a.opacity ?? 1, at = [`android:pathData="${a.d}"`];
    if (a.fill && a.fill !== 'none') at.push(`android:fillColor="${hex(a.fill)}"`, ...(o !== 1 ? [`android:fillAlpha="${o}"`] : []));
    if (a.stroke && a.stroke !== 'none') {
      at.push(`android:strokeColor="${hex(a.stroke)}"`, `android:strokeWidth="${a['stroke-width'] ?? 1}"`);
      if (o !== 1) at.push(`android:strokeAlpha="${o}"`);
      if (a['stroke-linecap']) at.push(`android:strokeLineCap="${a['stroke-linecap']}"`);
      if (a['stroke-linejoin']) at.push(`android:strokeLineJoin="${a['stroke-linejoin']}"`);
    }
    return `${ind}<path ${at.join(' ')}/>\n`;
  }).join('');
}
const vdDoc = (kids, view, dpW, dpH = dpW * view.h / view.w) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- generated by tools/app/splash.mjs from src/ui/loader.js; do not edit -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${f3(dpW)}dp" android:height="${f3(dpH)}dp" android:viewportWidth="${view.w}" android:viewportHeight="${view.h}">\n  <group android:translateX="${-view.x}" android:translateY="${-view.y}">\n${vdKids(kids, '    ')}  </group>\n</vector>\n`;

// ---------- the figure's layer tree ----------
const loaderSrc = read('src/ui/loader.js');
const MULASSA_SVG = JSON.parse('"' + loaderSrc.match(/export const MULASSA_SVG = '([^']*)'/)[1].replace(/"/g, '\\"') + '"');
const fig = parseXml(MULASSA_SVG)[0].kids[0]; // .mula-load > .ml-fig
const nodes = [], parts = [];
const r4 = x => +x.toFixed(2); // the web's percentages are rounded whole units
// art placed in the figure's units: an svg fills its parent's box (the ground's box for the road)
function walk(el, parent, box, vars, clip) {
  if (el.tag === 'svg') {
    const [vx, vy, vw, vh] = el.attrs.viewBox.split(/\s+/).map(num);
    if (vx || vy) throw new Error('viewBox origin');
    let kids = normalise(el.kids.filter(k => !classes(k).includes('ml-sad')));
    if (vw !== FIG.w || vh !== FIG.h || box.x || box.y) kids = [{ tag: 'g', attrs: { transform: `translate(${box.x} ${box.y}) scale(${box.w / vw} ${box.h / vh})`.replace(' scale(1 1)', '') }, kids }];
    const name = `part${String(parts.length).padStart(2, '0')}`;
    parts.push({ name, kids });
    nodes.push({ parent, asset: name, clip });
    return;
  }
  const c = computed(el), cls = classes(el);
  vars = { ...vars, ...Object.fromEntries(Object.entries(inline(el)).filter(([k]) => k.startsWith('--'))) };
  if (cls.includes('ml-ground')) { // inset: T% auto auto L%; width; height — a clipped box in the figure
    const [top, , , left] = c.inset.split(/\s+/);
    box = { x: r4(pct(left, FIG.w)), y: r4(pct(top, FIG.h)), w: r4(pct(c.width, FIG.w)), h: r4(pct(c.height, FIG.h)) };
  }
  const [ox, oy] = (c['transform-origin'] || '0 0').split(/\s+/).map((s, i) => pct(s, i ? box.h : box.w) + (s.endsWith('%') ? (i ? box.y : box.x) : 0));
  const node = { parent, origin: [r4(ox), r4(oy)], opacity: c.opacity != null ? num(c.opacity) : 1 };
  if (c.animation) {
    const [name, dur, ...rest] = c.animation.split(/\s+/);
    const delay = (c['animation-delay'] || '0s').replace(/var\((--[\w-]+),\s*([^)]+)\)/, (_, v, d) => vars[v] ?? d);
    const ease = EASE[rest.find(w => w in EASE) ?? 'ease'];
    const keys = [];
    for (const k of keyframes[name]) for (const at of k.at) {
      const t = transform(k.decl.transform, box);
      keys.push([at, r4(t.tx), r4(t.ty), t.r, t.sx, t.sy, k.decl.opacity != null ? num(k.decl.opacity) : null]);
    }
    keys.sort((a, b) => a[0] - b[0]);
    const animatesOpacity = keys.some(k => k[6] != null), base = node.opacity;
    for (const edge of [0, 1]) if (!keys.some(k => k[0] === edge)) keys.splice(edge ? keys.length : 0, 0, [edge, 0, 0, 0, 1, 1, null]); // implicit from/to: the element's own value
    for (const k of keys) k[6] = animatesOpacity ? (k[6] ?? base) : base;
    node.track = { dur: secs(dur), delay: secs(delay), ease, keys };
  }
  if (cls.includes('ml-ground')) {
    if (node.track) throw new Error('a clipping box must stay still (its clip is drawn in figure space)');
    node.clipBox = [box.x, box.y, box.w, box.h];
  }
  const me = nodes.push(node) - 1;
  for (const k of el.kids) walk(k, me, box, vars, node.clipBox ? me : clip);
}
walk(fig, -1, { x: 0, y: 0, w: FIG.w, h: FIG.h }, {}, -1);
nodes.shift(); for (const n of nodes) n.parent -= 1, n.clip = n.clip >= 0 ? n.clip - 1 : -1; // .ml-fig itself is just the box

// ---------- the rest pose: every layer untransformed, at its base opacity, the ground clipped ----------
function restKids() {
  const opacity = i => { let o = 1; for (let n = i; n >= 0; n = nodes[n].parent) o *= nodes[n].opacity ?? 1; return o; };
  const out = [];
  nodes.forEach((n, i) => {
    if (!n.asset || opacity(i) === 0) return;
    const kids = parts.find(p => p.name === n.asset).kids;
    if (n.clip < 0) { out.push(...kids); return; }
    out.push({ tag: '#clip', clip: nodes[n.clip].clipBox, kids });
  });
  return out;
}
// clipping the road to the ground's box (VectorDrawable: clip-path; SVG: clipPath)
function restSvg() {
  const kids = restKids().map(k => k.tag !== '#clip' ? k : { tag: 'g', attrs: { 'clip-path': 'url(#ground)' }, kids: k.kids });
  const box = restKids().find(k => k.tag === '#clip').clip;
  const defs = { tag: 'defs', attrs: {}, kids: [{ tag: 'clipPath', attrs: { id: 'ground' }, kids: [{ tag: 'rect', attrs: { x: box[0], y: box[1], width: box[2], height: box[3] }, kids: [] }] }] };
  return svgDoc([defs, ...kids], REST, SIZE);
}
function restVd(dp) { // the system splash icon: a 288 dp square whose centre is the figure's
  const view = { x: 110 - dp / SIZE / 2, y: 84 - dp / SIZE / 2, w: dp / SIZE, h: dp / SIZE };
  const body = restKids().map(k => {
    if (k.tag !== '#clip') return vdKids([k], '    ');
    const [x, y, w, h] = k.clip;
    return `    <group>\n      <clip-path android:pathData="M${x} ${y}h${w}v${h}h${-w}z"/>\n${vdKids(k.kids, '      ')}    </group>\n`;
  }).join('');
  return vdDoc([], view, dp).replace('  </group>', `${body}  </group>`);
}

// ---------- the cover's drifting tile (index.html, #loader.page::before) ----------
const tileUrl = html.match(/#loader\.page::before, #rotate::before \{[^}]*url\("data:image\/svg\+xml,([^"]+)"\)/)[1];
const tileSvg = parseXml(decodeURIComponent(tileUrl))[0];
const tileSize = num(tileSvg.attrs.width);
const tileKids = normalise(tileSvg.kids, { fill: tileSvg.attrs.fill, stroke: tileSvg.attrs.stroke, 'stroke-width': '1', opacity: 1 });
const tileDrift = secs(html.match(/animation: boot-tiles ([\d.]+s)/)[1]);

// ---------- write ----------
const IOS = 'ios/App/App', AND = 'android/app/src/main';
const assets = `${IOS}/Assets.xcassets`;
rmSync(join(ROOT, `${assets}/SplashParts`), { recursive: true, force: true });
write(`${assets}/SplashParts/Contents.json`, JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
const imageset = (dir, file, svg, vector) => {
  write(`${dir}/${file}`, svg);
  write(`${dir}/Contents.json`, JSON.stringify({ images: [{ filename: file, idiom: 'universal' }], info: { author: 'xcode', version: 1 },
    properties: { 'preserves-vector-representation': vector } }, null, 2) + '\n');
};
for (const p of parts) imageset(`${assets}/SplashParts/splash-${p.name}.imageset`, `${p.name}.svg`, svgDoc(p.kids, VIEW, SIZE), true);
imageset(`${assets}/SplashParts/splash-tile.imageset`, 'tile.svg', svgDoc(tileKids, { x: 0, y: 0, w: tileSize, h: tileSize }, 1), true);
// the launch screen's image: rasterised at build time (the launch snapshot is drawn by another process)
rmSync(join(ROOT, `${assets}/Splash.imageset`), { recursive: true, force: true });
imageset(`${assets}/Splash.imageset`, 'splash-rest.svg', restSvg(), false);

for (const f of readdirSync(join(ROOT, `${AND}/res/drawable`))) if (/^splash_(part\d+|tile|rest)\.xml$/.test(f)) rmSync(join(ROOT, `${AND}/res/drawable/${f}`));
for (const p of parts) write(`${AND}/res/drawable/splash_${p.name}.xml`, vdDoc(p.kids, VIEW, VIEW.w * SIZE));
write(`${AND}/res/drawable/splash_tile.xml`, vdDoc(tileKids, { x: 0, y: 0, w: tileSize, h: tileSize }, tileSize));
write(`${AND}/res/drawable/splash_rest.xml`, restVd(288));

// the tables: [parent, origin x, y, base opacity, clip node] + track [dur, delay, ease, keys [t, tx, ty, rot°, sx, sy, opacity]]
const header = '// Generated by tools/app/splash.mjs from src/ui/loader.js (MULASSA_SVG) and index.html (ml-* rules, keyframes, tile); do not edit.\n';
const sw = n => n == null ? 'nil' : String(n);
write(`${IOS}/Launcher/SplashArt.swift`, `${header}import CoreGraphics

enum SplashArt {
    static let figure = CGSize(width: ${FIG.w}, height: ${FIG.h}) // the art's units
    static let view = CGRect(x: ${VIEW.x}, y: ${VIEW.y}, width: ${VIEW.w}, height: ${VIEW.h}) // every layer image covers this
    static let size: CGFloat = ${SIZE} // points per unit: the web cover's 180 px figure
    static let background = 0x${BG.slice(1)}
    static let tile: CGFloat = ${tileSize}, tileDrift: Double = ${tileDrift}
    static let nodes: [SplashNode] = [
${nodes.map(n => `        SplashNode(parent: ${n.parent}, asset: ${n.asset ? `"splash-${n.asset}"` : 'nil'}, origin: CGPoint(x: ${n.origin?.[0] ?? 0}, y: ${n.origin?.[1] ?? 0}), opacity: ${n.opacity ?? 1}, clip: ${n.clip}, clipBox: ${n.clipBox ? `CGRect(x: ${n.clipBox.join(', y: ').replace(/, y: ([^,]+), y: ([^,]+), y: /, ', y: $1, width: $2, height: ')})` : 'nil'}, track: ${n.track ? `SplashTrack(dur: ${n.track.dur}, delay: ${n.track.delay}, ease: ${n.track.ease}, keys: [${n.track.keys.map(k => `[${k.join(', ')}]`).join(', ')}])` : 'nil'}),`).join('\n')}
    ]
}
`);
write(`${AND}/java/cat/mulassa/games/launcher/SplashArt.kt`, `${header}package cat.mulassa.games.launcher

import cat.mulassa.games.R

object SplashArt {
    const val FIG_W = ${FIG.w}f; const val FIG_H = ${FIG.h}f // the art's units
    const val VIEW_X = ${VIEW.x}f; const val VIEW_Y = ${VIEW.y}f; const val VIEW_W = ${VIEW.w}f; const val VIEW_H = ${VIEW.h}f // every layer covers this
    const val SIZE = ${SIZE}f // dp per unit: the web cover's 180 px figure
    const val BACKGROUND = 0xFF${BG.slice(1).toUpperCase()}
    const val TILE = ${tileSize}f; const val TILE_DRIFT = ${tileDrift}f
    val nodes = listOf(
${nodes.map(n => `        SplashNode(${n.parent}, ${n.asset ? `R.drawable.splash_${n.asset}` : 0}, ${n.origin?.[0] ?? 0}f, ${n.origin?.[1] ?? 0}f, ${n.opacity ?? 1}f, ${n.clip}, ${n.clipBox ? `floatArrayOf(${n.clipBox.map(x => x + 'f').join(', ')})` : 'null'}, ${n.track ? `SplashTrack(${n.track.dur}f, ${n.track.delay}f, ${n.track.ease}, arrayOf(${n.track.keys.map(k => `floatArrayOf(${k.map(x => x + 'f').join(', ')})`).join(', ')}))` : 'null'}),`).join('\n')}
    )
}
`);
console.log(`splash: ${parts.length} layers, ${nodes.length} nodes, ${nodes.filter(n => n.track).length} tracks`);
