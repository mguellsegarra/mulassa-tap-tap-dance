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
// a fleur-de-lis s units tall, centred on (x, y): the middle petal, two curled side petals, the band and the foot
const escLisSide = '<path d="M.12 .22C.25-.3.85-.55.95-.12c.06.3-.2.48-.42.36.12-.12.06-.3-.12-.24-.14.06-.2.2-.18.34z"/>';
const escLis = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s / 2})" fill="${ESC_T[c]}"><path d="M0-1C.38-.6.36-.15 0 .25-.36-.15-.38-.6 0-1zM-.12.45 0 .95.12.45z"/>`
  + `${escLisSide}<g transform="scale(-1 1)">${escLisSide}</g><rect x="-.48" y=".24" width=".96" height=".2"/></g>`;
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
      + `<circle cx="12" cy="5.4" r="2" fill="${ESC_T.or}"/>` + escRect(11.25, 9.8, 1.5, 12.4, 'or') + escRect(8.6, 12.2, 6.8, 1.5, 'or')
      + escTower(4.8, 11.4, 3.2, 6.8, 'or') + escRect(5.8, 15.4, 1.2, 2.8, 'gules') + `<path d="M17.8 18v-4.6M17.8 15.5l-1.5-1.5M17.8 15.5l1.5-1.5" stroke="${ESC_T.or}" stroke-width=".8" fill="none"/>`
      + [[16.3, 13.6], [17.8, 12.8], [19.3, 13.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${ESC_T.or}"/>`).join('') },
  vilanova: { shape: 'loz', // truncat: d'atzur, un castell d'or obert; d'or, quatre pals de gules
    art: escRect(0, 0, 24, 13, 'atzur') + escTower(10.3, 3.6, 3.4, 9.4, 'or') + escTower(7.2, 8.4, 2.6, 4.6, 'or') + escTower(14.2, 8.4, 2.6, 4.6, 'or')
      + escRect(11.2, 10, 1.6, 3, 'atzur') + escPales(0, 13, 24, 11) },
  barcelona: { shape: 'loz', // quarterat: d'argent, una creu plena de gules; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 12, 'argent') + escRect(7.6, 0, 1.8, 12, 'gules') + escRect(0, 7.6, 12, 1.8, 'gules') + escPales(12, 0, 12, 12) + escPales(0, 12, 12, 12)
      + escRect(12, 12, 12, 12, 'argent') + escRect(14.6, 12, 1.8, 12, 'gules') + escRect(12, 14.6, 12, 1.8, 'gules') },
  berga: { shape: 'ibe', // quarterat: d'or, quatre pals de gules; d'atzur, cinc llunes d'argent
    art: escPales(0, 0, 12, 12) + escRect(12, 0, 12, 12, 'atzur') + escRect(0, 12, 12, 12, 'atzur') + escPales(12, 12, 12, 12)
      + [[14.6, 3.4], [19.4, 3.4], [17, 6.6], [14.6, 9.8], [19.4, 9.8]].map(([x, y]) => escCrescent(x, y, 1.6)).join('')
      + [[5, 14.4], [9.6, 14.4], [7.3, 17.2], [5.4, 20], [9.6, 20]].map(([x, y]) => escCrescent(x, y, 1.6)).join('') },
  olot: { shape: 'ibe', // partit: d'or, quatre pals de gules; d'atzur, una ala d'argent
    art: escPales(0, 0, 12, 24) + escRect(12, 0, 12, 24, 'atzur')
      + `<path d="M15.2 4c3.3 1.2 5 4.4 4.6 8.3-.3 3-1.7 5.8-3.2 7.8-.3-1.8-.3-3.4.1-5-.9.9-1.5 2-1.8 3.2-.6-1.7-.6-3.3 0-4.8-.8.6-1.4 1.4-1.8 2.3-.4-1.8.1-3.6 1.3-5-.7.1-1.3.4-1.8.8.2-2.8 1.3-5.1 2.6-7.6z" fill="${ESC_T.argent}"/>` },
  vilafranca: { shape: 'loz', // d'atzur, una muralla torrejada d'or oberta; al cap, un escudet d'or amb quatre pals de gules
    art: escRect(0, 0, 24, 24, 'atzur') + escRect(0, 13, 24, 4.4, 'or') + Array.from({ length: 10 }, (_, i) => escRect(i * 2.5, 12, 1.4, 1.2, 'or')).join('')
      + escTower(6, 10, 3, 7.4, 'or') + escTower(15, 10, 3, 7.4, 'or') + escRect(11.1, 14.6, 1.8, 2.8, 'atzur') + escPales(10.3, 4, 3.4, 4.2) },
  lleida: { shape: 'loz', // d'or, quatre pals de gules; un ram de lliri de sinople movent de la punta, amb tres flors de lis d'argent
    art: escPales(0, 0, 24, 24) + `<path d="M12 23V7.5M12 18Q9 16 7.4 13.2M12 18Q15 16 16.6 13.2" stroke="${ESC_T.sinople}" stroke-width="1.3" fill="none"/>`
      + [[12, 5.6], [6.8, 11.4], [17.2, 11.4]].map(([x, y]) => escLis(x, y, 4.6, 'argent')).join('') },
  terrassa: { shape: 'loz', // partit: de gules, un castell d'argent tancat de sable; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 24, 'gules') + escRect(4.6, 11.8, 6.4, 3.8, 'argent') + escTower(4.6, 9.8, 1.8, 2.4, 'argent') + escTower(6.9, 8.2, 1.8, 4, 'argent')
      + escTower(9.2, 9.8, 1.8, 2.4, 'argent') + escRect(7.2, 13.4, 1.2, 2.2, 'sable') + escPales(12, 0, 12, 24) },
  manresa: { shape: 'loz', // truncat: d'or, quatre pals de gules; d'argent, una creu de Sant Jordi de gules
    art: escPales(0, 0, 24, 12) + escRect(0, 12, 24, 12, 'argent') + escRect(11, 12, 2, 12, 'gules') + escRect(0, 16.4, 24, 2, 'gules') },
  montblanc: { shape: 'ibe', // d'or, quatre pals de gules; un mont floronat d'argent
    art: escPales(0, 0, 24, 24) + `<path d="M7 24C7 16.5 8.6 13.4 12 13.4S17 16.5 17 24z" fill="${ESC_T.argent}"/>` + escLis(12, 9.2, 8, 'argent') },
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
