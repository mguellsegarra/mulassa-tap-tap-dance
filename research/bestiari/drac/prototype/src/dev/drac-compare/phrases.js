// The comparison's evidence (dev only, drac-compare.html): the audited phrase sequence of the source video and the foot
// placements it verified, in video seconds. Copied from public/drac-reference/choreography-audit/steps-v2/
// (phrases-reviewed.json, step-events.json, first-steps.md, phrases-middle.md), which is gitignored with the video;
// tests/drac-compare.mjs checks this copy against the JSON whenever the folder is present.
export const SOURCE = { url: '/drac-reference/pm-lEViiPK0.mp4', fps: 50, start: 0, end: 104.8 };

// [start, end, status, action, count] - the audit's own words
export const PHRASES = [
  [0, 2.2, 'observed', "Avança en diagonal cap a càmera i tanca la base.", "4 col·locacions: 3 que avancen + 1 tancament."],
  [2.2, 6.4, 'observed', "Recula mantenint el davant del cos, allunyant-se de càmera.", "8 col·locacions alternes; confiança mitjana-alta."],
  [6.4, 8.4, 'observed', "Torna a avançar fins aproximadament a la zona intermèdia i recull la base.", "3 passes clares + 1 tancament curt."],
  [8.4, 10.4, 'observed', "Nou avanç més cap a l'esquerra; es va posant de perfil mentre camina.", "3 passes clares + 1 ajust de suport."],
  [10.4, 14.4, 'partial', "Recula sense mitja volta, travessa la zona central i continua fins a l'altre extrem.", "8 col·locacions probables: 5 clares i 3 parcialment ocultes."],
  [14.4, 16.7, 'observed', "Avança de retorn cap a la zona intermèdia i obre la base per girar.", "3 passes clares + obertura/pivot de suport."],
  [16.7, 19.8, 'orientation_verified', "Una volta completa antihorària, amb recol·locació dels suports.", "1 volta. El recompte de petjades no està tancat."],
  [19.8, 21.8, 'observed', "Amb base ampla, torça la closca cap al davant/dreta i carrega el pes.", "Torsió sobre els suports; no una caminada de quatre passes."],
  [21.8, 24.2, 'observed', "Desfà la torsió fins al perfil esquerre i sosté.", "Canvi de rumb amb base de suport gairebé fixa."],
  [24.2, 26.4, 'observed', "Torna la closca cap al davant/dreta i sosté.", "Canvi de pes i torsió."],
  [26.4, 28.8, 'observed', "Torna al perfil esquerre i reuneix els peus per sortir.", "Torsió seguida d'un tancament visible."],
  [28.8, 33, 'observed', "Avança amb gambades llargues i va arquejant el recorregut cap a càmera.", "4 gambades visibles: flors, cercles, flors, cercles."],
  [33, 39.2, 'partial', "Passa a prop de càmera, continua l'arc i mostra l'esquena.", "Total de passes no observable."],
  [39.2, 40.9, 'partial', "S'allunya de càmera caminant cap on miren els caps.", "2 suports nous visibles al final; no són el total del retorn."],
  [40.9, 44.3, 'observed', "Reuneix, pivota fins a frontal i s'assenta; marca el pes abans de la nova frase.", "Tancament i recol·locació; sense total de contactes."],
  [44.3, 46, 'partial', "Nova aproximació en diagonal cap a càmera i cap a l'esquerra.", "Recompte incomplet: peus tallats a partir d'aprox. 45,5."],
  [46, 50, 'partial', "Retorn cap a la dreta, reculant i allunyant-se.", "Total no verificable en aquest tram."],
  [50, 53, 'partial', "Torna a avançar cap a l'esquerra, obrint el rumb.", "Passes visibles; total no tancat."],
  [53, 54, 'observed', "Frena el desplaçament i manté el perfil.", "Base recollida amb possibles ajustos."],
  [54, 57.3, 'partial', "Recula cap a la dreta de la imatge i va tornant frontal.", "Total de contactes no verificat."],
  [57.3, 59, 'partial', "Nou avanç cap a l'esquerra amb gambades.", "2 passes comprovades a 58–58,7; no són tot el tram."],
  [59, 60, 'observed', "Manté la base oberta i reorienta el cos fins a frontal per girar.", "Suport i preparació; sense nova caminada llarga."],
  [60, 63.4, 'orientation_verified', "Una altra volta completa antihorària.", "1 volta; petjades sense recompte complet."],
  [63.4, 65, 'observed', "Obre la base i torça la closca cap al davant/dreta.", "Suport ampli amb canvi de pes."],
  [65, 67.5, 'observed', "Desfà la torsió fins al perfil esquerre i sosté.", "Base de peus gairebé fixa."],
  [67.5, 69.5, 'observed', "Torna a torçar cap al davant/dreta i sosté.", "Torsió sobre els suports."],
  [69.5, 72.8, 'observed', "Torna al perfil esquerre i prepara la sortida.", "Torsió, tancament i recol·locació."],
  [72.8, 76.5, 'observed', "Quatre gambades llargues, de perfil i després en arc cap a càmera.", "4 gambades visibles: flors, cercles, flors, cercles."],
  [76.5, 86.4, 'partial', "Passa a prop, gira, retorna i es prepara per al final.", "Total de petjades no observable."],
  [86.4, 93.8, 'orientation_verified', "Tres voltes antihoràries cada vegada més ràpides.", "3 voltes; no un total verificat de passes."],
  [93.8, 94.8, 'orientation_verified', "Frena de cara, carrega el pes i prepara el sentit contrari.", "Aturada del gir, amb preparació dels suports."],
  [94.8, 104, 'orientation_verified', "Sis voltes horàries i frenada final.", "6 voltes; recompte de petjades no tancat."],
  [104, 104.8, 'orientation_verified', "Queda de cara i s'assenta.", "Final del gir."],
].map(([start, end, status, action, count], i) => Object.freeze({ i, start, end, status, action, count }));
Object.freeze(PHRASES);

// Placements the audit verified by trouser identity (F flowers, C circles; null = seen, leg not identified): arrival
// windows [lo, hi] in seconds. `probable` ones were partly hidden. Everything else in the model's step plan is an
// adaptation and says so.
export const VERIFIED = [
  ['F', 0.5, 0.7], ['C', 1.0, 1.2], ['F', 1.5, 1.7], ['C', 2.0, 2.1],
  ['F', 2.6, 2.8], ['C', 3.0, 3.2], ['F', 3.6, 3.8], ['C', 4.0, 4.2], ['F', 4.6, 4.8], ['C', 5.0, 5.2], ['F', 5.6, 5.8], ['C', 6.0, 6.2],
  ['F', 6.6, 6.8], ['C', 7.1, 7.3], ['F', 7.6, 7.7], ['C', 7.9, 8.1],
  ['F', 8.6, 8.8], ['C', 9.1, 9.2], ['F', 9.6, 9.8],
  ['F', 10.6, 10.8], ['C', 11.1, 11.3], ['F', 11.6, 11.8], ['C', 12.1, 12.3], ['F', 12.6, 12.8],
  ['F', 14.5, 14.7], ['C', 15.0, 15.2], ['F', 15.5, 15.7],
  [null, 28.2, 28.8], // the visible closing before the strides (phrases-middle.md)
  ['F', 29.2, 29.4], ['C', 30.2, 30.4], ['F', 31.2, 31.4], ['C', 32.2, 32.4],
  [null, 39.8, 40.0], [null, 40.7, 40.9],
  ['C', 58.2, 58.4], ['F', 58.7, 58.8],
  ['F', 73.3, 73.5], ['C', 74.3, 74.5], ['F', 75.3, 75.5], ['C', 76.2, 76.4],
].map(([leg, lo, hi]) => Object.freeze({ leg, lo, hi }));
export const PROBABLE = [['C', 13.1, 13.3], ['F', 13.6, 13.8], ['C', 14.0, 14.2], [null, 57.6, 57.8]].map(([leg, lo, hi]) => Object.freeze({ leg, lo, hi }));
// support actions that are not counted placements: [leg, lo, hi]
export const SUPPORT = [['C', 9.9, 10.1], ['C', 15.9, 16.1], ['F', 16.3, 16.6], [null, 71.7, 72.7]].map(([leg, lo, hi]) => Object.freeze({ leg, lo, hi }));

export const phraseAt = t => {
  let lo = 0, hi = PHRASES.length - 1;
  if (t >= PHRASES[hi].end) return PHRASES[hi];
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (PHRASES[m].start <= t) lo = m; else hi = m - 1; }
  return PHRASES[lo];
};
