# F2: revisió UI de l'estat integrat (character-select-v1-2-0 + i18n)

Origen de la comparació: l'inventari post-F1 de `t3-i18n-phase0` (648 captures; 71 altes · 33 mitjanes · 160 baixes).
Destí: aquest checkout, amb la mateixa eina i les escenes adaptades a la UX nova (705 captures, totes correctes; català a V1–V9, de/ja/ru/es/pseudo a V1, V3 i V7).
Primera passada del destí: 134 altes · 21 mitjanes · 177 baixes. Després dels arranjaments (S02, S03, S04, S15, S29, S30 i S31 tornades a capturar en tots els idiomes): 134 · 18 · 177.
Les altes de més no són regressions: hi ha més captures (S29–S31) i el selector nou mostra més files de noms a 1280×800 (vegeu B). Captures «abans» a `shots-before/`, «després» a `shots/` amb el mateix codi.

## Escenes noves

| Codi | Escena | Com s'hi arriba |
| --- | --- | --- |
| S29 | Pas 2 amb el podi del nivell i el teu lloc a la capçalera | `?mock&board=me` → «D'acord» a l'avís d'estadístiques → `#select-next`; només ≥ 600×600 (V6–V9; altres idiomes a V7) |
| S30 | Classificació després de prémer `#board-jump` | `?final&review=board` → clic a `#board-jump` (al capdamunt; l'enllaç passa a «A la meva fila») |
| S31 | Panell pendent del plec («Aviat a la plaça», sense figura) | pas 1 → clic a la targeta del plec `.sel-more` |

També: S02–S04 ja passen pel panell pendent nou (`pending-panel.js`) i S03 mostra el podi a V6–V9. Una execució parcial que comença a S03/S04/S31 entra primer al selector (abans quedava a la splash).

## A: regressions de la fusió o defectes de la UX nova, arreglats

| Troballa | Causa | Arranjament (fitxers) | Abans → després | Captures |
| --- | --- | --- | --- | --- |
| Noms del podi del pas 2 (`#select-podium-list button.player-name`): zones tàctils encavalcades amb ratolí (32 troballes, totes les llengües) | amb punter fi les files fan 31 px de pas i la zona invisible de 44 px de cada nom (F1) entrava 6–7 px a la fila veïna | amb punter fi la zona és la fila sencera, igual que a la classificació del selector; amb tàctil les files ja fan 44 px (`src/styles/select.css`) | punts de dalt/mig/baix de cada fila: abans el de baix tocava el nom següent → ara 0/0/0 · 1/1/1 · 2/2/2 (ca i pseudo, 1280×800). L'eina el continua comptant (fila de 31 px < 44), igual que la classificació del selector | S03-V7-ca, S03-V7-de, S03-V7-pseudo, S29-V7-ru, S29-V7-pseudo, S29-V6-ca |
| Càpsula de fletxes de la tira sobre la pastilla «Pròximament» (S02-V4-ca, alta, 21×43 px) | la UX nova posa la càpsula al mig de la pantalla; a 667×375 la fila de pobles és just a sobre de la tira, a la mateixa banda | `navX()` (`src/ui/select-strip.js`): al mig, llevat que una pastilla hi comparteixi la banda; llavors, just a la dreta de les pastilles, sense sortir de la pantalla. `select-ui.js` només canvia la línia que la crida (595 línies, no creix). Prova a `tests/selector-controls.mjs` | 274..394 px (sobre la pastilla, que acaba a 390) → 398..518 px; troballa 1 → 0 | S02-V4-ca |
| `#board-jump`: l'amplada reservada per a les dues etiquetes era la del català en tots els idiomes (no ho detecta l'eina) | `content: 'Al capdamunt'` / `'A la meva fila'` escrits al CSS | el CSS llegeix `attr(data-top)` / `attr(data-me)` i `board-list.js` hi posa les dues etiquetes de l'idioma de la pàgina (en canviar d'idioma, la pàgina es torna a carregar) | 393×852, en prémer l'enllaç: l'enllaç i «Posició 18 de 46» no es mouen en ca (239..348), de (229..348) ni pseudo (189..348); el català té la mateixa amplada que abans | S30-V7-de, S30-V7-pseudo, S30-V1-pseudo |

Revisades a ull les fusions delicades (de, ru, ja i pseudo; S02, S03, S04, S15, S29, S30, S31, S06): `select-ui`/`select-standings`, panell pendent, podi i `#board-jump` sense textos tallats ni fora de pantalla; piles de fonts i `data-i18n` d'`index.html` correctes (cap glif absent, cap clau visible); `base.css` conserva les regles de F1 (`.c-pts` més ample al destí, columna del % de 4,8 em en idiomes ≠ ca); la fulla ⚙ té el selector d'idioma i ja no té Classificacions.

## B: ja eren a l'origen, o el mateix límit en més captures

| Troballa | Per què no es toca |
| --- | --- |
| Noms de la classificació del selector < 44 px (S02-V7, tots els idiomes; abans només S02-V9-ca) | el mateix límit acceptat a F1: files de 35 px de pas, la zona és la fila sencera. La UX nova mostra cinc files a 1280×800 |
| Pastilles de poble sobre `#select-prev`/`#select-forward` amb la fila desplegada (S04 i S31 a V4/V5) | igual que a l'origen: la fila desplegada ocupa tota l'amplada i no hi ha banda lliure. La càpsula es mou tant com pot cap a la dreta |
| Classificació a 852×393 (S15-V5, S30-V5): la llista es queda en una fila i «Temporades anteriors»/«Privadesa» hi queden a sobre | igual que a l'origen (finestra d'escriptori; al mòbil horitzontal surt la coberta de gira). S30 només canvia la fila que queda a sota |
| «Sobrenom» +26 px a S30-V4-ca | la mateixa capçalera que S15-V4-ca, ja a HEAD |
| `#select-bottom` marges desiguals al pas 2 (també S29) | igual que a l'origen (mitjana) |
| `#publish-privacy`, `#feedback-privacy`, `a#feedback-mailto` | enllaços dins d'una frase, igual que a l'origen. `#publish-never` (36 px) ja no surt al destí |
| S31-V1-pseudo: la tira desborda 9 px en vertical | el mateix límit del pseudo que S04-V1-pseudo |

## C: artefactes de captura

| Troballa | Motiu |
| --- | --- |
| Línia de classificació sense text a S02-V4-ca (primera passada) | era la transició de color del text, encara a 0 en el moment de la captura; a la segona passada ja s'hi llegeix «Classificació · 45 participants» |

## Pendent

- S03-V1-pseudo (`#select-play` a 3 línies) i S04/S31-V1-pseudo (tira +9 px): límits del pseudo acceptats a F1.
- Pastilles desplegades a 667×375/852×393 i la classificació a 852×393: són de HEAD i cal decidir-ne el disseny (no hi ha banda per a tot).
- No emulat: tàctil real, Safari/iOS i DPR > 1.
