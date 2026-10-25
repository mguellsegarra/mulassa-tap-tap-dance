// Each town's coat of arms, simplified to read at pill size (16-24 px), drawn after the arms on Wikimedia Commons
// ("Escut de <poble>.svg"): each in its own shape (the official ones are "caironats", lozenges), field and charges;
// crowns and outer ornaments are left out. Banners and card tints use the game's own town accents (select-cards.css --town).
const ESC_T = { or: '#f5c518', gules: '#d62a2a', argent: '#fffaf0', atzur: '#2479d0', sinople: '#2e8b3e', sable: '#2a1a10' };
const ESC_SHAPE = {
  loz: 'M12 .8 23.2 12 12 23.2.8 12z', // caironat
  ibe: 'M3 1.5h18v10.5a9 9 0 0 1-18 0z', // a square top, a round point
  oval: 'M4.5 1.5h15c1 0 1.7.7 1.7 1.7v11.3c0 4.6-4 8-9.2 8s-9.2-3.4-9.2-8V3.2c0-1 .7-1.7 1.7-1.7z', // Tarragona's cartouche
};
const escRect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ESC_T[c]}"/>`;
// the four red pales on gold (the "senyal reial"), in a box: nine equal strips, the even ones red
const escPales = (x, y, w, h) => escRect(x, y, w, h, 'or') + [1, 3, 5, 7].map(i => escRect(+(x + i * w / 9).toFixed(2), y, +(w / 9).toFixed(2), h, 'gules')).join('');
const escCrescent = (x, y, r) => `<path d="M${x - r} ${y - r * 0.2}a${r} ${r} 0 0 0 ${2 * r} 0a${r} ${r * 0.7} 0 0 1 ${-2 * r} 0z" fill="${ESC_T.argent}"/>`;
const escTower = (x, y, w, h, c) => escRect(x, y + 1, w, h - 1, c) + [0, 2, 4].map(i => escRect(+(x + i * w / 5).toFixed(2), y, +(w / 5).toFixed(2), 1.2, c)).join('');
const escCross = (cx, cy, arm, t, c) => escRect(cx - t / 2, cy - arm, t, 2 * arm, c) + escRect(cx - arm, cy - t / 2, 2 * arm, t, c);
const escPolar = (n, r, cx, cy, f, turn = 0) => Array.from({ length: n }, (_, i) => { const a = (i / n + turn) * 2 * Math.PI - Math.PI / 2; return f(+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)); }).join('');

const ESC_ARMS = {
  valls: { shape: 'loz', // de gules, una faixa d'argent
    art: escRect(0, 0, 24, 24, 'gules') + escRect(0, 9.5, 24, 5, 'argent') },
  tarragona: { shape: 'oval', // d'or, vairat ondat de gules
    art: escRect(0, 0, 24, 24, 'or') + Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (r + c) % 2 ? ''
      : `<path d="M${c * 3} ${1.5 + r * 3}q.75-.7 1.5 0t1.5 0v3q-.75.7-1.5 0t-1.5 0z" fill="${ESC_T.gules}"/>`).join('')).join('') },
  reus: { shape: 'loz', // d'argent, una rosa de gules botonada d'or i barbada de sinople
    art: escRect(0, 0, 24, 24, 'argent') + escPolar(5, 4.6, 12, 12, (x, y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${ESC_T.sinople}"/>`, 0.1)
      + escPolar(5, 2.9, 12, 12, (x, y) => `<circle cx="${x}" cy="${y}" r="2.7" fill="${ESC_T.gules}"/>`) + `<circle cx="12" cy="12" r="1.7" fill="${ESC_T.or}"/>` },
  solsona: { shape: 'ibe', // de gules, un sol d'or; una torre, una creu i un card d'or
    art: escRect(0, 0, 24, 24, 'gules') + `<g stroke="${ESC_T.or}" stroke-width=".9">${escPolar(12, 3.6, 12, 5.4, (x, y) => `<line x1="12" y1="5.4" x2="${x}" y2="${y}"/>`)}</g>`
      + `<circle cx="12" cy="5.4" r="2" fill="${ESC_T.or}"/>` + escCross(12, 14.6, 3.6, 1.5, 'or') + escRect(11.25, 14.6, 1.5, 5.6, 'or')
      + escTower(4.6, 11.5, 3, 6.5, 'or') + `<path d="M17.8 18v-4.6M17.8 15.5l-1.5-1.5M17.8 15.5l1.5-1.5" stroke="${ESC_T.or}" stroke-width=".8" fill="none"/>`
      + [[16.3, 13.6], [17.8, 12.8], [19.3, 13.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${ESC_T.or}"/>`).join('') },
  vilanova: { shape: 'loz', // truncat: d'atzur, un castell d'or obert; d'or, quatre pals de gules
    art: escRect(0, 0, 24, 13, 'atzur') + escTower(10.3, 3.6, 3.4, 9.4, 'or') + escTower(7.2, 8.4, 2.6, 4.6, 'or') + escTower(14.2, 8.4, 2.6, 4.6, 'or')
      + escRect(11.2, 10, 1.6, 3, 'atzur') + escPales(0, 13, 24, 11) },
  barcelona: { shape: 'loz', // quarterat: d'argent, una creu plena de gules; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 12, 'argent') + escRect(7.6, 0, 1.8, 12, 'gules') + escRect(0, 7.6, 12, 1.8, 'gules') + escPales(12, 0, 12, 12) + escPales(0, 12, 12, 12)
      + escRect(12, 12, 12, 12, 'argent') + escRect(14.6, 12, 1.8, 12, 'gules') + escRect(12, 14.6, 12, 1.8, 'gules') },
  berga: { shape: 'ibe', // quarterat: d'or, quatre pals de gules; d'atzur, cinc llunes d'argent
    art: escPales(0, 0, 12, 12) + escRect(12, 0, 12, 12, 'atzur') + escRect(0, 12, 12, 12, 'atzur') + escPales(12, 12, 12, 12)
      + [[14.8, 4.4], [19.2, 4.4], [14.8, 7.9], [19.2, 7.9], [17, 11.2]].map(([x, y]) => escCrescent(x, y, 1.8)).join('')
      + [[4.8, 15.4], [9.2, 15.4], [4.8, 18.9], [9.2, 18.9], [7, 22]].map(([x, y]) => escCrescent(x, y, 1.8)).join('') },
  olot: { shape: 'ibe', // partit: d'or, quatre pals de gules; d'atzur, una ala d'argent
    art: escPales(0, 0, 12, 24) + escRect(12, 0, 12, 24, 'atzur')
      + `<path d="M15.2 4c3.3 1.2 5 4.4 4.6 8.3-.3 3-1.7 5.8-3.2 7.8-.3-1.8-.3-3.4.1-5-.9.9-1.5 2-1.8 3.2-.6-1.7-.6-3.3 0-4.8-.8.6-1.4 1.4-1.8 2.3-.4-1.8.1-3.6 1.3-5-.7.1-1.3.4-1.8.8.2-2.8 1.3-5.1 2.6-7.6z" fill="${ESC_T.argent}"/>` },
  vilafranca: { shape: 'loz', // d'atzur, una muralla torrejada d'or oberta; al cap, un escudet d'or amb quatre pals de gules
    art: escRect(0, 0, 24, 24, 'atzur') + escRect(2.5, 13, 19, 5, 'or') + [0, 1, 2, 3, 4, 5, 6, 7].map(i => escRect(2.5 + i * 2.5, 12, 1.4, 1.2, 'or')).join('')
      + escTower(7, 10, 3, 8, 'or') + escTower(14, 10, 3, 8, 'or') + escRect(11, 14.6, 2, 3.4, 'atzur') + escPales(10.3, 4, 3.4, 4.2) },
};

let escN = 0;
// <svg> markup of a town's arms (decorative: the town's name is always next to it), or '' for a town without art.
// The art's group says stroke="none": inside a .btn the svg inherits the icons' currentColor stroke.
export function escutSvg(townId, cls = 'escut') {
  const arms = ESC_ARMS[townId];
  if (!arms) return '';
  const id = `esc-${townId}-${escN++}`, shape = ESC_SHAPE[arms.shape];
  return `<svg class="${cls}" data-shape="${arms.shape}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><clipPath id="${id}"><path d="${shape}"/></clipPath>`
    + `<g clip-path="url(#${id})" stroke="none">${arms.art}</g><path d="${shape}" fill="none" stroke="${ESC_T.sable}" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
}
