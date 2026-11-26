// Tower's background mountains (public/jocs/campanar/carena-<device>.svg) from Valls's real skyline (pano.json): two flat
// planes, the near hills (the Serra de Miramar, the Cogulla and the Tossal Gros) and the far ones behind, paler, and
// the Cogulla's antenna; the near hills fade to the ground's colour, a haze in the valley. One SVG unit is one degree
// of azimuth. The tuner (index.html) and bake.mjs share it; the settings, one set per kind of device, are
// src/jocs/games/campanar/carena.json (sky.js reads them in the game).
const COGULLA = 343.3; // its top, as seen from the Plaça del Blat

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
  let tx = 0, ty = Infinity;
  near.forEach((py, k) => {
    const off = Math.abs(((az0 + k * pano.step - COGULLA + 540) % 360) - 180);
    if (off <= 1.5 && py < ty) { tx = k * pano.step; ty = py; }
  });
  // a thin mast that ends in a sharp point: straight for its lower 70 %, then tapering
  const w = o.antennaW / 2, top = ty - o.antenna, neck = ty - o.antenna * 0.7, g = v => +v.toFixed(3);
  const mast = ty < Infinity ? `<polygon fill="${o.nearColor}" points="${g(tx - w)},${g(ty + 0.05)} ${g(tx - w)},${g(neck)} ${g(tx)},${g(top)} ${g(tx + w)},${g(neck)} ${g(tx + w)},${g(ty + 0.05)}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.span} ${H}" preserveAspectRatio="xMidYMax slice">
<path fill="${o.farColor}" d="${ridge(heights(30))}"/>
<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${y(4.5)}" y2="${H}"><stop offset="0" stop-color="${o.nearColor}"/><stop offset="1" stop-color="${o.groundColor ?? o.nearColor}"/></linearGradient>
<path fill="url(#g)" d="${ridge(near)}"/>
${mast}
</svg>
`;
}
