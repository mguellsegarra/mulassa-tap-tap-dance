// Selector-only static illustrations and pending silhouettes; pixel portraits remain in HUD, help, photo mode and the pending peek.
import { MULASSA_SELECTOR_SVG } from '../figures/mulassa/mula-portrait.js';
import { DRAC_SELECTOR_SVG } from '../figures/drac/drac-portrait.js';
import { BOU_SELECTOR_SVG } from '../figures/bou/bou-portrait.js';
import { DRAWN_SILHOUETTES } from './pending-silhouettes.js';
import { UNRELEASED_IDS } from '../figures/index.js';
// Invitation A3: two fictional carriers with a small plain standard, kept in colour.
const INVITE_SELECTOR_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 112\" preserveAspectRatio=\"xMidYMid meet\" class=\"sel-invite-illustration\" aria-hidden=\"true\"><g data-banner=\"\"><path d=\"M77 14V104\" stroke=\"#7a4a2b\" stroke-width=\"2.6\" stroke-linecap=\"butt\"/><circle cx=\"77\" cy=\"12\" r=\"2.5\" fill=\"#d9a521\"/><path d=\"M79 17Q89.5 15 102 19V34L89.5 39L79 35Z\" fill=\"#a3182f\"/><path d=\"M82 21Q89.5 19 99 22M82 31L89.5 35L99 31\" fill=\"none\" stroke=\"#d9a521\" stroke-width=\"1.4\" stroke-linecap=\"round\"/></g><g data-person=\"\" data-ground=\"104\" transform=\"translate(53 104) scale(1.06)\">\n<path d=\"M-8-27L-10-6H-4L0-21L4-6H10L8-27Z\" fill=\"#51454e\"/><path d=\"M0-22L4-6H7L4-25Z\" fill=\"#36303a\"/>\n<path d=\"M-10-7H-4V-2H-10ZM4-7H10V-2H4Z\" fill=\"#f4efe4\"/>\n<g data-soles=\"\"><path d=\"M-10-3H-4L-2 0H-14Q-15-3-10-3ZM4-3H10L14 0H3Z\" fill=\"#241b1c\"/></g>\n<path d=\"M-10-42Q-17-39-17-29L-11-27L-7-37Z\" fill=\"#f4efe4\"/><path d=\"M-17-29L-17-22Q-16-19-14-21L-11-28Z\" fill=\"#b9825b\"/><path d=\"M9-42Q15-40 16-33L11-30L6-36Z\" fill=\"#f4efe4\"/><path d=\"M12-33L22-34Q26-36 27-33Q28-30 24-30L14-28Z\" fill=\"#b9825b\"/><path d=\"M-8-45Q0-48 8-45L11-29Q4-26-11-29Z\" fill=\"#f4efe4\"/>\n<path d=\"M8-42L11-29L7-29Z\" fill=\"#d9ceba\"/>\n<path d=\"M-10-30Q0-28 10-30V-25Q0-23-10-25Z\" fill=\"#a3182f\"/>\n<path d=\"M-3-51H3V-44L0-41L-4-45Z\" fill=\"#b9825b\"/>\n<path d=\"M-7-45L-1-39L0-43L3-39L7-45L0-43Z\" fill=\"#a3182f\"/>\n<path d=\"M-8-63Q-9-70 0-69Q9-70 9-62L8-54Q6-49 1-48Q-6-49-8-55Z\" fill=\"#b9825b\"/>\n<ellipse cx=\"9\" cy=\"-57\" rx=\"2\" ry=\"2.7\" fill=\"#b9825b\"/><path d=\"M-9-58Q-14-61-10-65Q-13-71-6-71Q-4-77 2-73Q8-76 11-70Q16-69 12-63L9-58L6-64Q0-60-7-63Z\" fill=\"#241b1c\"/>\n<g fill=\"#2a1a10\"><ellipse cx=\"-3.5\" cy=\"-57.5\" rx=\".85\" ry=\"1.1\"/><ellipse cx=\"3.5\" cy=\"-57.5\" rx=\".85\" ry=\"1.1\"/></g>\n<path d=\"M0-57V-54H1.5\" fill=\"none\" stroke=\"#9e6547\" stroke-width=\".8\" stroke-linecap=\"round\"/><path d=\"M-2-52Q0-50.5 2-52\" fill=\"none\" stroke=\"#6d3e2e\" stroke-width=\".9\" stroke-linecap=\"round\"/>\n</g><g data-person=\"\" data-ground=\"104\" transform=\"translate(108 104) scale(1.02)\"><path d=\"M-9-60Q-12-75 1-73Q14-73 11-56L14-43Q5-39-1-45L-12-44Z\" fill=\"#4e2e1a\"/>\n<path d=\"M-8-27L-10-6H-4L0-21L4-6H10L8-27Z\" fill=\"#51454e\"/><path d=\"M0-22L4-6H7L4-25Z\" fill=\"#36303a\"/>\n<path d=\"M-10-7H-4V-2H-10ZM4-7H10V-2H4Z\" fill=\"#f4efe4\"/>\n<g data-soles=\"\"><path d=\"M-10-3H-4L-2 0H-14Q-15-3-10-3ZM4-3H10L14 0H3Z\" fill=\"#241b1c\"/></g>\n<path d=\"M-10-42Q-17-39-17-29L-11-27L-7-37Z\" fill=\"#1f5c33\"/><path d=\"M-17-29L-17-22Q-16-19-14-21L-11-28Z\" fill=\"#d4a17c\"/><path d=\"M9-42Q16-40 19-35L15-31L7-36Z\" fill=\"#1f5c33\"/><path d=\"M18-35L25-38L25-42Q26-45 28-42L29-38Q33-41 34-38Q34-35 29-34L18-31Z\" fill=\"#d4a17c\"/><path d=\"M-8-45Q0-48 8-45L11-29Q4-26-11-29Z\" fill=\"#1f5c33\"/>\n<path d=\"M8-42L11-29L7-29Z\" fill=\"#17452a\"/>\n<path d=\"M-10-30Q0-28 10-30V-25Q0-23-10-25Z\" fill=\"#a3182f\"/>\n<path d=\"M-3-51H3V-44L0-41L-4-45Z\" fill=\"#d4a17c\"/>\n<path d=\"M-7-45L-1-39L0-43L3-39L7-45L0-43Z\" fill=\"#a3182f\"/>\n<path d=\"M-8-63Q-9-70 0-69Q9-70 9-62L8-54Q6-49 1-48Q-6-49-8-55Z\" fill=\"#d4a17c\"/>\n<ellipse cx=\"9\" cy=\"-57\" rx=\"2\" ry=\"2.7\" fill=\"#d4a17c\"/><path d=\"M-9-59Q-11-72 1-72Q13-72 10-58L6-65Q0-61-8-63Z\" fill=\"#4e2e1a\"/>\n<g fill=\"#2a1a10\"><ellipse cx=\"-3.5\" cy=\"-57.5\" rx=\".85\" ry=\"1.1\"/><ellipse cx=\"3.5\" cy=\"-57.5\" rx=\".85\" ry=\"1.1\"/></g>\n<path d=\"M0-57V-54H1.5\" fill=\"none\" stroke=\"#9e6547\" stroke-width=\".8\" stroke-linecap=\"round\"/><path d=\"M-2-52Q0-50.5 2-52\" fill=\"none\" stroke=\"#6d3e2e\" stroke-width=\".9\" stroke-linecap=\"round\"/>\n</g></svg>";

// Every other pending figure: a vector silhouette traced from its own pixel grid (same viewBox as pixelSvg, so the
// whole-cell sizing keeps each figure's relative height), dark ink with a faint cream halo so it holds on the dark card.
const SIL_INK = '#120b07', SIL_HALO = '#f5e3b8';
// The exact outline of the filled cells: closed loops, holes included, one cell of margin like pixelSvg's rim.
export function cellOutline(art) {
  const on = (x, y) => (art[y]?.[x] ?? '.') !== '.', next = new Map(), key = (x, y) => `${x},${y}`;
  const edge = (x0, y0, x1, y1) => { const k = key(x0, y0); (next.get(k) ?? next.set(k, []).get(k)).push([x1, y1]); };
  for (let y = 0; y < art.length; y++) for (let x = 0; x < art[0].length; x++) if (on(x, y)) { // clockwise, only the sides facing empty cells
    if (!on(x, y - 1)) edge(x, y, x + 1, y);
    if (!on(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!on(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!on(x - 1, y)) edge(x, y + 1, x, y);
  }
  const loops = [];
  for (const [k0] of next) while (next.get(k0).length) {
    const loop = []; let [x, y] = k0.split(',').map(Number), prev = null;
    for (;;) {
      const outs = next.get(key(x, y)); if (!outs?.length) break;
      // at a diagonal pinch keep turning right, so cells touching at a corner stay separate shapes
      const i = outs.length > 1 && prev ? Math.max(0, outs.findIndex(([nx, ny]) => nx - x === prev[1] - y && ny - y === x - prev[0])) : 0;
      const [nx, ny] = outs.splice(i, 1)[0]; loop.push([x + 1, y + 1]); prev = [x, y]; x = nx; y = ny;
      if (key(x, y) === k0 && !next.get(k0).length) break;
    }
    loops.push(loop.filter((p, j) => { const a = loop.at(j - 1), b = loop[(j + 1) % loop.length]; return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]); }));
  }
  return loops;
}
// Corner cutting: pass 1 cuts each corner by at most .45 cell (staircases become diagonals, long edges keep their
// points: crowns, horns, staffs), pass 2 rounds what is left. One cell grids, so more passes only make blobs.
const softenOutline = loop => [.45, .25].reduce((pts, c, k) => pts.flatMap((p, i) => {
  const a = pts.at(i - 1), b = pts[(i + 1) % pts.length], len = q => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const ta = k ? c : Math.min(c / len(a), .5), tb = k ? c : Math.min(c / len(b), .5);
  return [[p[0] + (a[0] - p[0]) * ta, p[1] + (a[1] - p[1]) * ta], [p[0] + (b[0] - p[0]) * tb, p[1] + (b[1] - p[1]) * tb]];
}), loop);
// A colour drawing as a pending silhouette: every paint in ink, over a copy of it outlined by the same 2 px halo.
function inkSilhouette(svg) {
  const [, open, body] = svg.replace(/ opacity="[^"]*"/g, '').replace(/(fill|stroke)="#\w+"/g, `$1="${SIL_INK}"`).match(/^(<svg[^>]*>)([^]*)<\/svg>$/);
  const halo = body.replace(/ stroke(-\w+)?="[^"]*"/g, '').replace(/<(path|rect|circle|ellipse)\b/g, '<$1 vector-effect="non-scaling-stroke"');
  return `${open}<g stroke="${SIL_HALO}" stroke-opacity=".38" stroke-width="2" stroke-linejoin="round">${halo}</g>${body}</svg>`;
}
export function pendingSilhouette(art) {
  const d = cellOutline(art).map(l => 'M' + softenOutline(l).map(([x, y]) => `${+x.toFixed(1)} ${+y.toFixed(1)}`).join('L') + 'Z').join('');
  // one path: the halo is the outer half of a 2 screen-px stroke under the fill, as thin as the Bou's at any card size
  return `<svg viewBox="0 0 ${art[0].length + 2} ${art.length + 2}" aria-hidden="true"><path d="${d}" fill="${SIL_INK}" stroke="${SIL_HALO}" stroke-opacity=".38" stroke-width="2" stroke-linejoin="round" paint-order="stroke" vector-effect="non-scaling-stroke"/></svg>`;
}
// Drawn pending silhouettes go before the traced ones; a figure that becomes playable needs its colour portrait here
// (an unreleased one keeps it for its release and shows it in ink meanwhile).
export const SELECTOR_PORTRAITS = { 'mulassa-valls': MULASSA_SELECTOR_SVG, 'drac-valls': DRAC_SELECTOR_SVG, ...DRAWN_SILHOUETTES, 'bou-tradicional-valls': UNRELEASED_IDS.has('bou-tradicional-valls') ? inkSilhouette(BOU_SELECTOR_SVG) : BOU_SELECTOR_SVG, 'la-teva-colla': INVITE_SELECTOR_SVG };
