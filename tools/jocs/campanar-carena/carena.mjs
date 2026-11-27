// Tower's background mountains (public/jocs/campanar/carena-<device>.svg) from Valls's real skyline (pano.json): two flat
// planes, the near hills (the Serra de Miramar, the Cogulla and the Tossal Gros) and the far ones behind, paler, and
// the Cogulla's antenna; the near hills fade to the ground's colour, a haze in the valley. One SVG unit is one degree
// of azimuth; under the foot, o.pad units left empty (a GPU scaling the repeated image smears its bottom row onto its top
// one: an opaque foot there drew a hairline across the sky; sky.js sinks the pad under the ground's strip). The tuner
// (index.html) and bake.mjs share it; the settings, one set per kind of device, are src/jocs/games/campanar/carena.json
// (sky.js reads them in the game).
const COGULLA = 343.3; // its top, as seen from the Plaça del Blat

// the dusk's light over the hills, along the round: two gradients across x (one unit, one degree), a dark blue towards
// the east (the earth's shadow rising) and a warm glow over the ridges under the set sun, and the ground's colour coming
// back down to the foot (top to H), so it still meets the ground's flat strip with no seam. Each ridge is drawn again
// with them (lit), so they light only the hills
function sunlight(o, top, H) {
  const shade = [], glow = [];
  for (let x = 0; x <= o.span; x += 5) {
    const away = (1 - Math.cos((o.center - o.span / 2 + x - o.sun) * Math.PI / 180)) / 2; // 0 under the sun, 1 opposite
    const at = (x / o.span).toFixed(4);
    shade.push(`<stop offset="${at}" stop-color="#241f40" stop-opacity="${(0.92 * away).toFixed(3)}"/>`);
    glow.push(`<stop offset="${at}" stop-color="#f6b593" stop-opacity="${(0.85 * (1 - away) ** 2.5).toFixed(3)}"/>`);
  }
  const grad = (id, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" x2="${o.span}" y1="0" y2="0">${stops.join('')}</linearGradient>`;
  const ground = o.groundColor ?? o.nearColor;
  return `${grad('shade', shade)}${grad('glow', glow)}<linearGradient id="foot" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${H}"><stop offset="0.35" stop-color="${ground}" stop-opacity="0"/><stop offset="1" stop-color="${ground}"/></linearGradient>`;
}
const lit = id => ['url(#glow)', 'url(#shade)', 'url(#foot)'].map(f => `<use href="#${id}" fill="${f}"/>`).join('');

// pano: { step, rays: [[the highest angle within 1, 2 ... km]] } → the SVG's text
export function carenaSvg(pano, o) {
  const n = pano.rays.length, H = +(o.base + o.ex * 5 + 1.5).toFixed(2);
  const angle = (az, km) => pano.rays[Math.round(((az % 360) + 360) % 360 / pano.step) % n][Math.min(km, pano.rays[0].length) - 1];
  const y = a => +(H - o.base - Math.max(a, -o.base / o.ex) * o.ex).toFixed(3);
  const az0 = o.center - o.span / 2;
  // a ridge's heights, smoothed over o.smooth degrees each side (a running mean: the DEM's steps no longer show)
  const heights = km => {
    const raw = [], w = Math.round((o.smooth ?? 0) / pano.step);
    for (let k = -w; k * pano.step <= o.span + w * pano.step; k++) raw.push(angle(az0 + k * pano.step, km));
    return raw.slice(w, raw.length - w).map((_, k) => { let t = 0; for (let j = -w; j <= w; j++) t += raw[k + w + j]; return y(t / (2 * w + 1)); });
  };
  // drawn as a smooth curve through them (Catmull-Rom as cubic Béziers), closed down to the foot
  const ridge = ys => {
    const P = ys.map((v, k) => [k * pano.step, v]), f = v => +v.toFixed(3);
    let d = `M0,${H} L${P[0][0]},${f(P[0][1])}`;
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[Math.max(0, k - 1)], b = P[k], c = P[k + 1], e = P[Math.min(P.length - 1, k + 2)];
      d += ` C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`;
    }
    return `${d} L${o.span},${H} Z`;
  };
  const near = heights(o.near);
  // on the ridge's own top near the Cogulla (the drawn point, not the map's): the mast stands on the peak's tip
  let tx = 0, ty = Infinity, top_ = -1;
  near.forEach((py, k) => {
    const off = Math.abs(((az0 + k * pano.step - COGULLA + 540) % 360) - 180);
    if (off <= 1.5 && py < ty) { top_ = k; ty = py; }
  });
  if (top_ >= 0) { // the curve's own top between the samples: the vertex of the parabola through the highest and its two neighbours
    const a = near[top_ - 1] ?? ty, c = near[top_ + 1] ?? ty, den = a - 2 * ty + c;
    const shift = den ? Math.max(-1, Math.min(1, (a - c) / (2 * den))) : 0;
    tx = (top_ + shift) * pano.step + (o.antennaShift ?? 0); // antennaShift: degrees by hand, where the eye puts the top
    ty -= (a - c) * shift / 4;
  }
  // the mast: a sharp point, a thin straight shaft, and at its foot the hill itself rising to it, a concave cusp that
  // lifts the ridge by antennaRise of the mast at the shaft and fades out over antennaSpread degrees each side; drawn on
  // the hill with the hill's own gradient, so no seam and no other tone
  const w = o.antennaW / 2, top = ty - o.antenna, neck = ty - o.antenna * 0.85, g = v => +v.toFixed(3);
  const hill = x => { const k = Math.max(0, Math.min(near.length - 1.001, x / pano.step)), i = Math.floor(k); return near[i] + (near[i + 1] - near[i]) * (k - i); };
  const cusp = (x, d) => hill(x) + 0.04 - (o.antenna * (o.antennaRise ?? 0.35) + 0.04) * Math.exp(-d / (o.antennaSpread ?? 0.35));
  const side = sgn => Array.from({ length: 25 }, (_, k) => { const d = (o.antennaSpread ?? 0.35) * 5 * (k / 24) ** 2, x = tx + sgn * (w + d); return `${g(x)},${g(cusp(x, d))}`; });
  const mast = ty < Infinity ? `<path id="mast" d="M${g(tx)},${g(top)} L${g(tx + w)},${g(neck)} L${side(1).join(' L')} L${side(-1).reverse().join(' L')} L${g(tx - w)},${g(neck)} Z"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.span} ${H + (o.pad ?? 0)}" preserveAspectRatio="xMidYMax slice">
<defs><path id="far" d="${ridge(heights(30))}"/>${mast}<path id="near" d="${ridge(near)}"/>${sunlight(o, y(4.5), H)}
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${y(4.5)}" y2="${H}"><stop offset="0" stop-color="${o.nearColor}"/><stop offset="1" stop-color="${o.groundColor ?? o.nearColor}"/></linearGradient>
</defs>
<use href="#far" fill="${o.farColor}"/>${lit('far')}
${mast && `<use href="#mast" fill="url(#g)"/>${lit('mast')}`}
<use href="#near" fill="url(#g)"/>${lit('near')}
</svg>
`;
}
// the whole round (the end's camera turns): 360° from the tuned view's own left edge, so the tuned view is the first
// span degrees of it, the Cogulla and its mast just as tuned
export const carena360 = (pano, o) => carenaSvg(pano, { ...o, span: 360, center: o.center - o.span / 2 + 180 });
