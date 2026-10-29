// Each town's coat of arms, simplified to read at pill size (16-24 px), drawn after the arms on Wikimedia Commons
// ("Escut de <poble>.svg"): each in its own shape (the official ones are "caironats", lozenges), field and charges;
// crowns and outer ornaments are left out, unless the town needs one to be told apart (València's bat, Sant Julià's laurel: `over`,
// drawn outside the shield). Banners and card tints use the game's own town accents (select-cards.css --town).
const ESC_T = { or: '#f5c518', gules: '#d62a2a', argent: '#fffaf0', atzur: '#2479d0', sinople: '#2e8b3e', sable: '#2a1a10', carn: '#e0a878', bru: '#a8642c', porpra: '#8a2a8c' };
const ESC_SHAPE = {
  loz: 'M12 .8 23.2 12 12 23.2.8 12z', // caironat
  ibe: 'M3 1.5h18v10.5a9 9 0 0 1-18 0z', // a square top, a round point
  oval: 'M4.5 1.5h15c1 0 1.7.7 1.7 1.7v11.3c0 4.6-4 8-9.2 8s-9.2-3.4-9.2-8V3.2c0-1 .7-1.7 1.7-1.7z', // Tarragona's cartouche
  crested: 'M12 7.4 19.4 15.2 12 23 4.6 15.2z', // a lozenge lowered under its crest (València's bat)
  ellipse: 'M12 2.6a5.4 7.8 0 1 0 0 15.6a5.4 7.8 0 1 0 0-15.6z', // a narrow oval inside its laurel (Sant Julià)
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

// eight rays round (cx, cy) from r0 to r1, straight or (wavy) flame-like, offset by `turn` of a full circle (Andratx's sun)
const escSunRays = (cx, cy, r0, r1, wavy, turn) => escPolar(8, 1, cx, cy, (x, y) => { const a = Math.atan2(y - cy, x - cx);
  const p = (r, d) => `${(cx + r * Math.cos(a + d)).toFixed(2)} ${(cy + r * Math.sin(a + d)).toFixed(2)}`;
  return wavy ? `<path d="M${p(r0, -.24)}Q${p(r0 + 2, .1)} ${p(r0 + 2.8, -.1)}T${p(r1 - .2, .06)}Q${p(r0 + 3.4, .12)} ${p(r0 + 2.6, .08)}T${p(r0, .24)}z"/>`
    : `<path d="M${p(r0, -.3)}L${p(r1, 0)}L${p(r0, .3)}z"/>`; }, turn);
// an eight-pointed star of radius r (Dénia)
const escStar8 = (cx, cy, r, c) => `<path d="M${Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8 - Math.PI / 2, k = i % 2 ? r * .45 : r;
  return `${(cx + k * Math.cos(a)).toFixed(2)} ${(cy + k * Math.sin(a)).toFixed(2)}`; }).join('L')}z" fill="${ESC_T[c]}"/>`;

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
  // The towns of the third wave, simplified from the arms on Commons the same way. `over` is drawn outside the shield.
  campos: { shape: 'ibe', // d'argent, un ós rampant de bru contornat; una bordura de porpra pomellada d'argent (la vora lila de l'escut aprovat)
    art: escRect(0, 0, 24, 24, 'porpra') + `<path d="M5.6 4.1h12.8v7.9a6.4 6.4 0 0 1-12.8 0z" fill="#e4e1dc"/>`
      + `<g transform="translate(12 11.2) scale(.62) translate(-11.4 -12.4)" fill="${ESC_T.bru}">`
      + `<path d="M4.2 7.4Q4.6 6.6 6 6.2 7.4 4.8 8.8 4.8L9.2 3.8 10.6 4.4Q14.2 5.4 15.8 9.4 17.4 13.6 16.8 17.4 16.4 19.4 15.4 20.4L17.4 21.4H13.4L13.6 18.6Q12.6 17.6 11.6 18.4L11.2 20.4 12.6 21.4H9.2L10 19.6Q10.6 16.6 10.6 14 9.6 12.4 10.4 10.2Q9.6 9.2 8.2 8.8 6.6 8.6 4.6 8.2z"/>`
      + `<path d="M10.4 10.8Q8.6 10.2 7.2 9.4M10.8 13.2Q8.8 12.8 7 12.2" stroke="${ESC_T.bru}" stroke-width="1.6" stroke-linecap="round" fill="none"/></g>`
      + `<g fill="#e4e1dc">${[[7, 2.8], [12, 2.8], [17, 2.8], [4.3, 6.5], [19.7, 6.5], [4.3, 10.5], [19.7, 10.5], [18.31, 16.42], [12, 19.7], [5.69, 16.42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".55"/>`).join('')}</g>` },
  'bisbal-emporda': { shape: 'loz', // de gules, una creu tripomejada d'argent
    art: escRect(0, 0, 24, 24, 'gules') + escRect(10.9, 5.4, 2.2, 13.2, 'argent') + escRect(5.4, 10.9, 13.2, 2.2, 'argent')
      + [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 12 12)" fill="${ESC_T.argent}"><circle cx="12" cy="4.5" r="1.3"/><circle cx="9.9" cy="6.5" r="1.15"/><circle cx="14.1" cy="6.5" r="1.15"/></g>`).join('') },
  cardedeu: { shape: 'loz', // d'or, quatre pals de gules; a la gaia d'atzur, un card d'or
    art: escPales(0, 0, 24, 24) + `<path d="M12 0 5.6 6.4 12 12.8 18.4 6.4z" fill="${ESC_T.atzur}"/>`
      + `<g transform="translate(12 8.6) scale(.82) translate(-12 -7.6)"><path d="M12 10.2 10.1 6M12 10.2V5.2M12 10.2 13.9 6" stroke="${ESC_T.or}" stroke-width=".55" fill="none"/>`
      + [[10, 5.2, -20], [12, 4.4, 0], [14, 5.2, 20]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y})" fill="${ESC_T.or}"><ellipse cx="${x}" cy="${y}" rx=".85" ry="1.05"/><path d="M${x - .8} ${y - .5}l.3-1.3.5 1 .5-1 .5 1 .3-1.3V${y - .3}z"/></g>`).join('')
      + `<path d="M9.8 8.6Q11 11.4 12 11.4T14.2 8.6Q13 10 12 9.8T9.8 8.6z" fill="${ESC_T.or}"/></g>` },
  'artesa-lleida': { shape: 'loz', // de gules, una balança d'or; a la punta, una creu de Malta d'argent
    art: escRect(0, 0, 24, 24, 'gules') + `<ellipse cx="12" cy="5.4" rx=".6" ry="2" fill="${ESC_T.or}"/>` + escRect(5.4, 7.2, 13.2, .9, 'or') + `<circle cx="12" cy="7.6" r=".9" fill="${ESC_T.or}"/>`
      + `<path d="M6 8.1 4 13.4M6 8.1 8 13.4M18 8.1 16 13.4M18 8.1 20 13.4" stroke="${ESC_T.or}" stroke-width=".45" fill="none"/>`
      + [6, 18].map(x => `<path d="M${x - 2.9} 13.2h5.8a2.9 1.7 0 0 1-5.8 0z" fill="${ESC_T.or}"/>`).join('')
      + `<path d="M12 18 10.4 15.6h3.2zM12 18 10.4 20.4h3.2zM12 18 9.6 16.4v3.2zM12 18 14.4 16.4v3.2z" fill="${ESC_T.argent}"/>` },
  valencia: { shape: 'crested', // caironat: d'or, quatre pals de gules; al damunt, el rat penat de sable (corona i lletres fora)
    art: escPales(4, 7, 16, 16.4),
    over: `<path d="M12 2.6Q12.9 2.6 13.1 3.7L14.2 3.1 13.8 4.6Q16.4 2.4 21.6 2.2 20.6 3.6 20.8 5.2 19.4 4.4 18.4 5.6 17.2 4.8 16 6 14.6 5.4 13.4 6.6 12.6 6 12 7 11.4 6 10.6 6.6 9.4 5.4 8 6 6.8 4.8 5.6 5.6 4.6 4.4 3.2 5.2 3.4 3.6 2.4 2.2 7.6 2.4 10.2 4.6L9.8 3.1 10.9 3.7Q11.1 2.6 12 2.6z" fill="${ESC_T.sable}"/>` },
  andratx: { shape: 'ibe', // d'atzur, un sol figurat d'or, de raigs rectes i ondats alterns
    art: escRect(0, 0, 24, 24, 'atzur') + `<g fill="${ESC_T.or}">${escSunRays(12, 11.2, 4.4, 9.8, false, 0)}${escSunRays(12, 11.2, 4.4, 9.8, true, 1 / 16)}<circle cx="12" cy="11.2" r="4.8"/></g>`
      + `<g fill="${ESC_T.sable}"><ellipse cx="10.4" cy="10.4" rx=".55" ry=".45"/><ellipse cx="13.6" cy="10.4" rx=".55" ry=".45"/></g>`
      + `<path d="M12 10.6v1.6M10.9 13.4Q12 13.9 13.1 13.4" stroke="${ESC_T.bru}" stroke-width=".45" fill="none" stroke-linecap="round"/>` },
  prada: { shape: 'loz', // d'or, quatre pals de gules; un escussó d'argent amb sant Pere de gules i sinople, nimbat d'or, amb la clau i el llibre d'or
    art: escPales(0, 0, 24, 24) + escRect(6.2, 5.8, 11.6, 12.4, 'argent')
      + `<circle cx="12.2" cy="8" r="1.8" fill="${ESC_T.or}"/><circle cx="12.2" cy="8.3" r="1.1" fill="${ESC_T.carn}"/>`
      + `<path d="M10.6 17.4 11 12.6 12.4 15 14 17.4z" fill="${ESC_T.sinople}"/>`
      + `<path d="M10 10.2Q12.2 9.2 14.4 10.2L14.2 12.8Q13 15 14 16.8L11.8 15.2 10.6 16.2Q10.8 13 10 10.2z" fill="${ESC_T.gules}"/>`
      + `<path d="M8.6 11.8V16M8.6 15.2h.9M8.6 16h.9" stroke="${ESC_T.or}" stroke-width=".6"/><circle cx="8.6" cy="11.4" r=".9" fill="none" stroke="${ESC_T.or}" stroke-width=".6"/>`
      + escRect(13.2, 11.4, 2.8, 2.4, 'or') + `<path d="M14.6 11.4v2.4" stroke="${ESC_T.bru}" stroke-width=".25"/>` },
  denia: { shape: 'ibe', // mig partit i truncat: d'or, una cotissa de sable; d'or, cinc estrelles d'atzur; d'argent, un castell de bru sobre ones d'atzur
    art: escRect(0, 0, 24, 12, 'or') + `<path d="M3 1.4 4.8 1.4 12 9.4V12H10.6L3 3.4z" fill="${ESC_T.sable}"/>` + escRect(11.85, 0, .3, 12, 'sable')
      + [[14.3, 3.8], [18.7, 3.8], [16.5, 6.8], [14.3, 9.8], [18.7, 9.8]].map(([x, y]) => escStar8(x, y, 1.7, 'atzur')).join('')
      + escRect(0, 12, 24, 12, 'argent') + escRect(0, 11.8, 24, .4, 'sable')
      + `<path d="M9.4 14.6h5.2l-.7 .9v3H10.1v-3z" fill="${ESC_T.bru}"/>` + escTower(9.8, 13, 4.4, 1.8, 'bru')
      + `<path d="M11.3 18.6v-1.5a.7.7 0 0 1 1.4 0v1.5z" fill="${ESC_T.sable}"/>`
      + `<path d="M0 18.2q3-1.4 6 0t6 0 6 0 6 0V25H0z" fill="${ESC_T.atzur}"/><path d="M0 20q3-1.3 6 0t6 0 6 0 6 0" stroke="${ESC_T.argent}" stroke-width=".8" fill="none"/>` },
  'sant-joan': { shape: 'oval', // d'atzur, sobre una terrassa de bru, un anyell pasqual d'argent nimbat d'or, ajagut sobre un llibre, amb la banderola creuada de gules
    art: escRect(0, 0, 24, 24, 'atzur') + escRect(0, 16.6, 24, 8, 'bru')
      + `<path d="M6.4 15.6h11.4l.9 1.4H7.2z" fill="${ESC_T.argent}"/><path d="M7.2 17h11.4" stroke="#c8bfae" stroke-width=".4"/>`
      + `<path d="M8.6 15 16.6 3" stroke="${ESC_T.bru}" stroke-width=".6"/>`
      + `<path d="M16.6 3 20.4 5.4 18.6 11.4 17.6 7.6z" fill="${ESC_T.argent}"/><path d="M16.9 5 19.6 6.6M18.6 4 17.8 9.6" stroke="${ESC_T.gules}" stroke-width=".9"/>`
      + `<path d="M8.6 15.6Q8 13 10.6 12.4 12 11.4 14 12 16.6 11.4 17.6 13.2 18.6 15 16.4 15.6z" fill="${ESC_T.argent}"/>`
      + `<circle cx="9.6" cy="10" r="2.1" fill="${ESC_T.or}"/><ellipse cx="10.2" cy="10.2" rx="1.8" ry="1.2" transform="rotate(20 10.2 10.2)" fill="${ESC_T.argent}"/><path d="M9.2 10.6 9.8 13.4H11.6L11 10.8z" fill="${ESC_T.argent}"/>`
      + `<path d="M9 9.6 7.6 9.6 8.6 8.8z" fill="${ESC_T.argent}"/><circle cx="10.6" cy="9.9" r=".3" fill="${ESC_T.sable}"/>` },
  'sant-julia': { shape: 'ellipse', // d'or, quatre pals de gules, en un oval; voltat de llorer de sinople i, a la punta, el llaç amb els colors d'Andorra
    art: escPales(6.6, 2.6, 10.8, 15.6),
    over: `<g fill="${ESC_T.sinople}">${[[5.2, 17], [4.2, 14], [3.8, 11], [4, 8], [4.8, 5.2]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.7" transform="rotate(${-20 + i * 9} ${x} ${y})"/><ellipse cx="${24 - x}" cy="${y}" rx=".9" ry="1.7" transform="rotate(${20 - i * 9} ${24 - x} ${y})"/>`).join('')}</g>`
      + `<path d="M5.6 19.6h12.8l-1 3.2H6.6z" fill="${ESC_T.atzur}"/>` + escRect(9.9, 19.6, 4.2, 3.2, 'or') + `<path d="M14.1 19.6h4.3l-1 3.2h-3.3z" fill="${ESC_T.gules}"/>`
      + `<path d="M5.6 19.6h12.8l-1 3.2H6.6z" fill="none" stroke="${ESC_T.sable}" stroke-width=".5"/>` },
};

let escN = 0;
// <svg> markup of a town's arms (decorative: the town's name is always next to it), or '' for a town without art.
// The art's group says stroke="none": inside a .btn the svg inherits the icons' currentColor stroke.
export function escutSvg(townId, cls = 'escut') {
  const arms = ESC_ARMS[townId];
  if (!arms) return '';
  const id = `esc-${townId}-${escN++}`, shape = ESC_SHAPE[arms.shape];
  return `<svg class="${cls}" data-shape="${arms.shape}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><clipPath id="${id}"><path d="${shape}"/></clipPath>`
    + `<g clip-path="url(#${id})" stroke="none">${arms.art.replaceAll('{id}', id)}</g><path d="${shape}" fill="none" stroke="${ESC_T.sable}" stroke-width="1.1" stroke-linejoin="round"/>${arms.over ? `<g stroke="none">${arms.over}</g>` : ''}</svg>`;
}
