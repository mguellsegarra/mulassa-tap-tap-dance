// Each town's coat of arms, simplified to read at pill size (16-24 px), drawn after the arms on Wikimedia Commons
// ("Escut de <poble>.svg"): each in its own shape (the official ones are "caironats", lozenges), field and charges;
// crowns and outer ornaments are left out. Banners and card tints use the game's own town accents (select-cards.css --town).
const ESC_T = { or: '#f5c518', gules: '#d62a2a', argent: '#fffaf0', atzur: '#2479d0', sinople: '#2e8b3e', sable: '#2a1a10', carn: '#e0a878', bru: '#a8642c' };
const ESC_SHAPE = {
  loz: 'M12 .8 23.2 12 12 23.2.8 12z', // caironat
  ibe: 'M3 1.5h18v10.5a9 9 0 0 1-18 0z', // a square top, a round point
  oval: 'M4.5 1.5h15c1 0 1.7.7 1.7 1.7v11.3c0 4.6-4 8-9.2 8s-9.2-3.4-9.2-8V3.2c0-1 .7-1.7 1.7-1.7z', // Tarragona's cartouche
};
const escRect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ESC_T[c]}"/>`;
// the four red pales on gold (the "senyal reial"), in a box: nine equal strips, the even ones red
const escPales = (x, y, w, h) => escRect(x, y, w, h, 'or') + [1, 3, 5, 7].map(i => escRect(+(x + i * w / 9).toFixed(2), y, +(w / 9).toFixed(2), h, 'gules')).join('');
const escCrescent = (x, y, r) => `<path d="M${x - r} ${y - r * 0.2}a${r} ${r} 0 0 0 ${2 * r} 0a${r} ${r * 0.35} 0 0 1 ${-2 * r} 0z" fill="${ESC_T.argent}"/>`;
const escTower = (x, y, w, h, c) => escRect(x, y + 1, w, h - 1, c) + [0, 2, 4].map(i => escRect(+(x + i * w / 5).toFixed(2), y, +(w / 5).toFixed(2), 1.2, c)).join('');
// a fleur-de-lis s units tall, centred on (x, y): the middle petal, two curled side petals, the band and the foot
const escLisSide = '<path d="M.12 .22C.25-.3.85-.55.95-.12c.06.3-.2.48-.42.36.12-.12.06-.3-.12-.24-.14.06-.2.2-.18.34z"/>';
const escLis = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s / 2})" fill="${ESC_T[c]}"><path d="M0-1C.38-.6.36-.15 0 .25-.36-.15-.38-.6 0-1zM-.12.45 0 .95.12.45z"/>`
  + `${escLisSide}<g transform="scale(-1 1)">${escLisSide}</g><rect x="-.48" y=".24" width=".96" height=".2"/></g>`;
// a vine leaf s units wide, centred on (x, y): three round lobes over the stalk's notch
const escLeaf = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s / 2})" fill="${ESC_T[c]}"><circle cy="-.45" r=".5"/><circle cx="-.5" cy="0" r=".45"/><circle cx=".5" cy="0" r=".45"/><circle cy=".25" r=".5"/></g>`;
// a feathered wing pointing down, in the right half of the field (Olot, Vinaròs)
const escWing = `<path d="M15.2 4c3.3 1.2 5 4.4 4.6 8.3-.3 3-1.7 5.8-3.2 7.8-.3-1.8-.3-3.4.1-5-.9.9-1.5 2-1.8 3.2-.6-1.7-.6-3.3 0-4.8-.8.6-1.4 1.4-1.8 2.3-.4-1.8.1-3.6 1.3-5-.7.1-1.3.4-1.8.8.2-2.8 1.3-5.1 2.6-7.6z" fill="${ESC_T.argent}"/>`;
// a bunch of grapes s units wide hanging from (x, y): rows of three, two and one berries
const escGrapes = (x, y, s, c) => [[-1, 0], [0, 0], [1, 0], [-.5, .85], [.5, .85], [0, 1.7]]
  .map(([dx, dy]) => `<circle cx="${+(x + dx * s / 3).toFixed(2)}" cy="${+(y + dy * s / 3).toFixed(2)}" r="${+(s / 5.4).toFixed(2)}" fill="${ESC_T[c]}"/>`).join('');
// wavy vair: rows of arched cells of colour c on alternate squares, 3 units each (Tarragona, Girona's escutcheon)
const escVair = (cols, rows, c) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, k) => (r + k) % 2 ? ''
  : `<path d="M${k * 3} ${1.5 + r * 3}q.75-.7 1.5 0t1.5 0v3q-.75.7-1.5 0t-1.5 0z" fill="${ESC_T[c]}"/>`).join('')).join('');
const escPolar = (n, r, cx, cy, f, turn = 0) => Array.from({ length: n }, (_, i) => { const a = (i / n + turn) * 2 * Math.PI - Math.PI / 2; return f(+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)); }).join('');

const ESC_ARMS = {
  valls: { shape: 'loz', // de gules, una faixa d'argent
    art: escRect(0, 0, 24, 24, 'gules') + escRect(0, 9.5, 24, 5, 'argent') },
  tarragona: { shape: 'oval', // d'or, vairat ondat de gules
    art: escRect(0, 0, 24, 24, 'or') + escVair(8, 8, 'gules') },
  reus: { shape: 'loz', // d'argent, una rosa de gules botonada d'or i barbada de sinople
    art: escRect(0, 0, 24, 24, 'argent') + escPolar(5, 4.6, 12, 12, (x, y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${ESC_T.sinople}"/>`, 0.1)
      + escPolar(5, 2.9, 12, 12, (x, y) => `<circle cx="${x}" cy="${y}" r="2.7" fill="${ESC_T.gules}"/>`) + `<circle cx="12" cy="12" r="1.7" fill="${ESC_T.or}"/>` },
  solsona: { shape: 'ibe', // de gules, un sol d'or; una torre, una creu i un card d'or
    art: escRect(0, 0, 24, 24, 'gules') + `<g stroke="${ESC_T.or}" stroke-width=".9">${escPolar(12, 3.6, 12, 5.4, (x, y) => `<line x1="12" y1="5.4" x2="${x}" y2="${y}"/>`)}</g>`
      + `<circle cx="12" cy="5.4" r="2" fill="${ESC_T.or}"/>` + escRect(11.25, 9.8, 1.5, 12.4, 'or') + escRect(8.6, 12.2, 6.8, 1.5, 'or')
      + escTower(4.8, 11.4, 3.2, 6.8, 'or') + escRect(5.8, 15.4, 1.2, 2.8, 'gules') + `<path d="M17.8 17.6V13M17.8 16.2 16.3 13.6M17.8 16.2 19.3 13.6" stroke="${ESC_T.or}" stroke-width=".5" fill="none"/>`
      + `<path d="M15.4 15.6Q17.8 19.4 20.2 15.6 17.8 17.2 15.4 15.6z" fill="${ESC_T.or}"/>`
      + [[16.3, 13.2], [17.8, 12.4], [19.3, 13.2]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".75" ry="1" fill="${ESC_T.or}"/><path d="M${x - .6} ${y - .7}l.3-1.1.3.9.3-.9.3 1.1" stroke="${ESC_T.or}" stroke-width=".3" fill="none"/>`).join('') },
  vilanova: { shape: 'loz', // truncat: d'atzur, un castell d'or obert; d'or, quatre pals de gules
    art: escRect(0, 0, 24, 13, 'atzur') + escTower(10.3, 3.6, 3.4, 9.4, 'or') + escTower(7.2, 8.4, 2.6, 4.6, 'or') + escTower(14.2, 8.4, 2.6, 4.6, 'or')
      + escRect(11.2, 10, 1.6, 3, 'atzur') + escPales(0, 13, 24, 11) },
  barcelona: { shape: 'loz', // quarterat: d'argent, una creu plena de gules; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 12, 'argent') + escRect(7.6, 0, 1.8, 12, 'gules') + escRect(0, 7.6, 12, 1.8, 'gules') + escPales(12, 0, 12, 12) + escPales(0, 12, 12, 12)
      + escRect(12, 12, 12, 12, 'argent') + escRect(14.6, 12, 1.8, 12, 'gules') + escRect(12, 14.6, 12, 1.8, 'gules') },
  berga: { shape: 'ibe', // quarterat: d'or, quatre pals de gules; d'atzur, cinc llunes d'argent
    art: escPales(0, 0, 12, 12) + escRect(12, 0, 12, 12, 'atzur') + escRect(0, 12, 12, 12, 'atzur') + escPales(12, 12, 12, 12)
      + [[14.6, 3.4], [19.4, 3.4], [17, 6.6], [14.6, 9.8], [19.4, 9.8]].map(([x, y]) => escCrescent(x, y, 1.8)).join('')
      + [[5, 14.4], [9.6, 14.4], [7.3, 17.2], [5.4, 20], [9.6, 20]].map(([x, y]) => escCrescent(x, y, 1.8)).join('') },
  olot: { shape: 'ibe', // partit: d'or, quatre pals de gules; d'atzur, una ala d'argent
    art: escPales(0, 0, 12, 24) + escRect(12, 0, 12, 24, 'atzur')
      + escWing },
  vilafranca: { shape: 'loz', // d'atzur, una muralla torrejada d'or oberta; al cap, un escudet d'or amb quatre pals de gules
    art: escRect(0, 0, 24, 24, 'atzur') + escRect(0, 13, 24, 4.4, 'or') + Array.from({ length: 10 }, (_, i) => escRect(i * 2.5, 12, 1.4, 1.2, 'or')).join('')
      + escTower(6, 10, 3, 7.4, 'or') + escTower(15, 10, 3, 7.4, 'or') + escRect(11.1, 14.6, 1.8, 2.8, 'atzur') + `<clipPath id="{id}-e"><path d="M10.2 3.6h3.6v2.8a1.8 2 0 0 1-3.6 0z"/></clipPath><g clip-path="url(#{id}-e)">${escPales(10.2, 3.6, 3.6, 4.8)}</g>` },
  lleida: { shape: 'loz', // d'or, quatre pals de gules; un ram de lliri de sinople movent de la punta, amb tres flors de lis d'argent
    art: escPales(0, 0, 24, 24) + `<path d="M12 23V8M12 16Q10.6 12.4 9.4 12M12 16Q13.4 12.4 14.6 12" stroke="${ESC_T.sinople}" stroke-width=".9" fill="none"/>`
      + escLis(12, 5.4, 6, 'argent') + [[6.6, -90], [17.4, 90]].map(([x, a]) => `<g transform="rotate(${a} ${x} 12)">${escLis(x, 12, 6, 'argent')}</g>`).join('') },
  terrassa: { shape: 'loz', // partit: de gules, un castell d'argent tancat de sable; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 24, 'gules') + escRect(4.6, 11.8, 6.4, 3.8, 'argent') + escTower(4.6, 9.8, 1.8, 2.4, 'argent') + escTower(6.9, 8.2, 1.8, 4, 'argent')
      + escTower(9.2, 9.8, 1.8, 2.4, 'argent') + escRect(7.2, 13.4, 1.2, 2.2, 'sable') + escPales(12, 0, 12, 24) },
  manresa: { shape: 'loz', // truncat: d'or, quatre pals de gules; d'argent, una creu de Sant Jordi de gules
    art: escPales(0, 0, 24, 12) + escRect(0, 12, 24, 12, 'argent') + escRect(11, 12, 2, 12, 'gules') + escRect(0, 16.4, 24, 2, 'gules') },
  montblanc: { shape: 'ibe', // d'or, quatre pals de gules; un mont floronat d'argent
    art: escPales(0, 0, 24, 24) + `<path d="M7 24C7 16.5 8.6 13.4 12 13.4S17 16.5 17 24z" fill="${ESC_T.argent}"/>` + escLis(12, 9.2, 8, 'argent') },
  // The towns of the second wave, simplified from the arms on Commons (the downloaded references keep their licences).
  girona: { shape: 'loz', // d'or, quatre pals de gules; un escudet d'argent vairat ondat de gules
    art: escPales(0, 0, 24, 24) + `<clipPath id="{id}-e"><path d="M7.6 7h8.8v6.4a4.4 4.6 0 0 1-8.8 0z"/></clipPath><g clip-path="url(#{id}-e)">` + escRect(7.6, 7, 8.8, 11.2, 'argent')
      + `<g transform="translate(7.6 6.2) scale(.5)">${escVair(6, 8, 'gules')}</g></g><path d="M7.6 7h8.8v6.4a4.4 4.6 0 0 1-8.8 0z" fill="none" stroke="${ESC_T.sable}" stroke-width=".4"/>` },
  molins: { shape: 'ibe', // d'or, quatre pals de gules; una mola d'argent amb una nadilla de sable
    art: escPales(0, 0, 24, 24) + `<circle cx="12" cy="12" r="7.6" fill="${ESC_T.argent}"/>`
      + `<g stroke="#b8b0a0" stroke-width=".35" fill="none">${escPolar(10, 7.4, 12, 12, (x, y) => `<path d="M12 12Q${x + 1.6} ${y - 1.6} ${x} ${y}"/>`)}</g>`
      + `<path d="M8.4 9.8 12 12 8.4 14.2zM15.6 9.8 12 12 15.6 14.2z" fill="${ESC_T.sable}"/><circle cx="12" cy="12" r="1" fill="${ESC_T.sable}"/>` },
  'sant-sadurni': { shape: 'loz', // truncat: de sinople, un trull d'or entre dos raïms d'or; d'or, quatre pals de gules
    art: escRect(0, 0, 24, 13, 'sinople') + escPales(0, 13, 24, 11)
      + escRect(9.4, 4.2, 5.2, 1, 'or') + escRect(9.6, 5.2, .9, 7.6, 'or') + escRect(13.5, 5.2, .9, 7.6, 'or') + escRect(11.6, 5.2, .8, 3.4, 'or') + escRect(10.6, 6.6, 2.8, .5, 'or')
      + `<rect x="10.5" y="8.8" width="3" height="4" rx=".5" fill="${ESC_T.or}"/>` + escRect(10.5, 9.8, 3, .35, 'sinople') + escRect(10.5, 11.6, 3, .35, 'sinople')
      + [6.4, 17.6].map(x => escLeaf(x, 9, 2.4, 'or') + escGrapes(x, 10.2, 2.6, 'or')).join('') },
  mataro: { shape: 'loz', // partit: d'or, quatre pals de gules; d'argent, una mà de carn que sosté una planta de sinople
    art: escPales(0, 0, 12, 24) + escRect(12, 0, 12, 24, 'argent')
      + `<path d="M15.4 11.6 13.6 7.6M15.6 11.6 14.8 6.2M15.8 11.6 16 5.8M16 11.6 17 7M16.2 11.6 18 8.4M15.6 10 14.2 9.2M16 10 17.4 9.4" stroke="${ESC_T.sinople}" stroke-width=".5" fill="none"/>`
      + [[13.6, 7.6], [14.8, 6.2], [16, 5.8], [17, 7], [18, 8.4], [14.2, 9.2], [17.4, 9.4]].map(([x, y]) => escLeaf(x, y, 1.9, 'sinople')).join('')
      + `<path d="M15.8 15.2 14.4 19.4M15.8 15.2 15.6 20.4M15.8 15.2 17 19.8" stroke="${ESC_T.sinople}" stroke-width=".4" fill="none"/>`
      + `<path d="M17.4 11.8H24V15H17.4z" fill="${ESC_T.carn}"/><rect x="14.4" y="11.4" width="3.8" height="3.9" rx="1.3" fill="${ESC_T.carn}"/>`
      + `<path d="M14.4 12.7h1.8M14.4 14h1.8" stroke="${ESC_T.bru}" stroke-width=".3"/>` },
  tortosa: { shape: 'loz', // de gules, una torre d'argent oberta de sable
    art: escRect(0, 0, 24, 24, 'gules') + escTower(9, 4, 6, 16, 'argent') + escRect(10.9, 14.4, 2.2, 5.6, 'sable') + escRect(10, 8.4, 1.3, 2.4, 'sable') + escRect(12.7, 8.4, 1.3, 2.4, 'sable') },
  sineu: { shape: 'ibe', // partit: d'or, una pilota de bru; d'or, quatre pals de gules
    art: escRect(0, 0, 12, 24, 'or') + escPales(12, 0, 12, 24) + `<circle cx="7.6" cy="12" r="3.8" fill="${ESC_T.bru}" stroke="${ESC_T.sable}" stroke-width=".3"/>`
      + `<path d="M6.63 8.38Q8.66 10.16 11.22 11.03Q9.44 13.06 8.57 15.62Q6.54 13.84 3.98 12.97Q5.76 10.94 6.63 8.38M6.63 8.38Q8.99 9.59 11.22 11.03Q10.01 13.39 8.57 15.62Q6.21 14.41 3.98 12.97Q5.19 10.61 6.63 8.38" stroke="${ESC_T.sable}" stroke-width=".25" fill="none"/>` },
  vinaros: { shape: 'ibe', // partit: d'or, un cep de sinople fruitat de gules i una creu de gules; de gules, una ala d'argent
    art: escRect(0, 0, 12, 24, 'or') + escRect(12, 0, 12, 24, 'gules')
      + escWing
      + `<path d="M8.8 21C9.6 18 10.4 15.4 9.4 12.6 8.6 10.4 9.4 8 10.4 6.4" stroke="${ESC_T.bru}" stroke-width="1.3" fill="none"/>`
      + escLeaf(7.2, 7.4, 3.4, 'sinople') + escLeaf(10.4, 4.4, 2.8, 'sinople') + escGrapes(8, 10.2, 3, 'gules') + escRect(5.5, 13.6, 1.4, 4, 'gules') + escRect(4.2, 14.9, 4, 1.4, 'gules') },
  castello: { shape: 'loz', // d'or, quatre pals de gules; un castell d'argent de tres torres
    art: escPales(0, 0, 24, 24) + `<path d="M7.4 12.4H16.6V17L14.6 19.6H9.4L7.4 17z" fill="${ESC_T.argent}"/>`
      + escTower(7.4, 8.6, 2.4, 4.2, 'argent') + escTower(14.2, 8.6, 2.4, 4.2, 'argent') + escTower(10, 4.4, 4, 8.4, 'argent')
      + `<path d="M9.4 12.4V19.6M14.6 12.4V19.6" stroke="#c8bfae" stroke-width=".35"/>`
      + `<path d="M11.1 19.6V17.4a.9.9 0 0 1 1.8 0v2.2zM7.9 18.2v-1.8a.6.6 0 0 1 1.2 0v1.8zM14.9 18.2v-1.8a.6.6 0 0 1 1.2 0v1.8z" fill="${ESC_T.gules}"/>`
      + escRect(11.2, 6.8, .6, 1.8, 'gules') + escRect(12.2, 6.8, .6, 1.8, 'gules') + escRect(8.2, 10.2, .8, 1.4, 'gules') + escRect(15, 10.2, .8, 1.4, 'gules') },
  bao: { shape: 'loz', // d'argent, un cep de sinople fruitat de gules, sobre una terrassa de sinople; al cap, un roquet de gules
    art: escRect(0, 0, 24, 24, 'argent') + escRect(0, 19.2, 24, 5, 'sinople') + `<circle cx="12" cy="5.4" r="3" fill="${ESC_T.gules}"/>` + escRect(11.1, 4.5, 1.8, 1.8, 'argent')
      + `<path d="M11.2 19.4 11.6 13.6" stroke="${ESC_T.sable}" stroke-width="1.2" fill="none"/>`
      + `<path d="M11.6 13.6Q8.6 12.8 5.2 13.8M11.8 13.6Q15 12.6 18.8 13.8M11.7 13.4 11.8 10.6" stroke="${ESC_T.sable}" stroke-width=".8" fill="none"/>`
      + [[6.6, 11.4, 3.6], [9.4, 10, 3.6], [12, 9, 3.4], [14.6, 10, 3.6], [17.4, 11.4, 3.6], [8.4, 15.6, 3], [15.4, 15.6, 3]].map(([x, y, s]) => escLeaf(x, y, s, 'sinople')).join('')
      + escGrapes(5.8, 13.8, 3.2, 'gules') + escGrapes(10.4, 11.8, 3, 'gules') + escGrapes(18.2, 13.8, 3.2, 'gules') },
  fraga: { shape: 'ibe', // partit: d'or, quatre pals de gules; d'argent, un arbre de sinople; brochant, un escudet d'atzur amb una flor de lis d'or
    art: escPales(0, 0, 12, 24) + escRect(12, 0, 12, 24, 'argent') + escRect(17.3, 10.6, 1.2, 9.4, 'sinople') + [[16.6, 9, 2.3], [19.2, 9, 2.3], [17.9, 6.8, 2.4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${ESC_T.sinople}"/>`).join('')
      + `<path d="M12.6 10.4h4.8V14q0 2.4-2.4 3.4-2.4-1-2.4-3.4z" fill="${ESC_T.atzur}"/>` + escLis(15, 13, 3.8, 'or') },
};

let escN = 0;
// <svg> markup of a town's arms (decorative: the town's name is always next to it), or '' for a town without art.
// The art's group says stroke="none": inside a .btn the svg inherits the icons' currentColor stroke.
export function escutSvg(townId, cls = 'escut') {
  const arms = ESC_ARMS[townId];
  if (!arms) return '';
  const id = `esc-${townId}-${escN++}`, shape = ESC_SHAPE[arms.shape];
  return `<svg class="${cls}" data-shape="${arms.shape}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><clipPath id="${id}"><path d="${shape}"/></clipPath>`
    + `<g clip-path="url(#${id})" stroke="none">${arms.art.replaceAll('{id}', id)}</g><path d="${shape}" fill="none" stroke="${ESC_T.sable}" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
}
