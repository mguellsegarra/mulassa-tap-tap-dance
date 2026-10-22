# F1: triatge i arranjaments de l'inventari UI

Referència: `git archive HEAD` a `/tmp/head-src` (node_modules enllaçat), capturat amb la mateixa eina
(`node tools/ui-inventory.mjs --src=/tmp/head-src --out=/tmp/head-inv --dist=/tmp/head-dist --langs=ca --scenes=S02,S03,S04,S05,S13,S15,S16,S17,S20,S22`, 196 captures).
Abans: l'inventari del 2026-10-21 21:17 (383 altes · 39 mitjanes · 166 baixes). Després: l'inventari complet tornat a passar (648 captures, 0 fallides),
més S02–S04, S15–S17 i S19 en tots els idiomes i pseudo a V1 després de l'últim ajust de l'eina. Resultat final: 71 altes · 33 mitjanes · 160 baixes (abans 383 · 39 · 166); cap alta del grup A llevat de les dues de pseudo a 320 px del Pendent. Captures «abans» dels grups A a `shots-before/`, «després» a `shots/` amb el mateix codi.

Català: el bolcat de totes les caixes visibles (S02, S03, S15, S18, S20, S22 a 320×568, 393×852, 1280×800 i 667×375) és idèntic a HEAD element per element.

## A — regressions o defectes nous, arreglats

| Troballa | Causa | Arranjament (fitxers) | Abans → després | Captures |
| --- | --- | --- | --- | --- |
| Text Latin a pes 700 amb una altra font (capçaleres de Classificació «Encerts» +3 px a V5–V9, etc.) | la cara nova `'Baloo 2'` de Nunito (ciríl·lic) es declarava `font-weight: 600 800`: és l'única coincidència exacta per a 700, i el text Latin a 700 queia a `system-ui` | dues cares de pes únic (600, 800), com les de Baloo (`index.html`; proves `tests/fonts-i18n.mjs`, `tests/privacy-fonts.mjs`) | «Sobrenom» 69,5 → 64 px d'ample (= HEAD); `th` desbordat 11 → 1 (el d'S15-V4-ca ja hi era a HEAD) | S15-V5-ca, S15-V7-ca |
| `#select-free` fora de la pantalla (ru, pseudo, V1/V3) | etiqueta `nowrap` i botons que s'encongien per sota de la paraula | idiomes ≠ ca: l'etiqueta pot anar a dues línies i cap botó del moll baixa del seu mot més llarg (`min-width: auto`) (`src/styles/select.css`) | 4 → 0; ru V1: 176..348 → 155..308 px (pantalla 320) | S02-V1-ru, S02-V3-ru, S02-V1-pseudo, S02-V3-pseudo |
| `#select-play` i el botó DIFÍCIL fora de la pantalla (pseudo V1/V3) | igual; la graella de nivells `repeat(3, 1fr)` creixia amb el mot | el mateix + `minmax(0, 1fr)` (`select.css`) | 3 → 0 fora del viewport | S03-V1-pseudo, S03-V3-pseudo |
| `#feedback-status`, `#board-place-sub`, `#results-board` desbordats (pseudo) | paraula més llarga que la línia | `overflow-wrap: break-word` a `dialog p` i als botons de resultats (`src/styles/base.css`) | 3+1+1 → 0 | S20-V1/V3/V7-pseudo, S15-V1-pseudo, S13-V1-pseudo |
| Capçalera «Точность» +11 px, «Aciertos» +8 px (V7) | columna del % feta a mida de «Encerts» | idiomes ≠ ca, ≥ 520 px: columna 4,8 em i trencament dins la cel·la (`base.css`) | 2 → 0 (+ pseudo 1 → 0) | S15-V7-ru, S15-V7-es, S15-V7-pseudo |
| «Прошлые сезоны» / «Конфиденциальность» < 44 px (ru, pseudo) | els dos enllaços de 32 px passen a dues files sense espai: els marges tàctils se solapen | idiomes ≠ ca: `row-gap: 16px` a `.board-links` (`base.css`, `profile.css`) | 4 → 0 | S15-V1-ru, S15-V3-ru |
| `kbd` «Rechtsklick» +4 px (de, V7) | un sol mot en una columna de 72 px | traducció «Rechte Taste» (`src/i18n/locales/de/ui.json`) | 1 → 0 | S05-V7-de |
| Nom de figura del mode foto +13 px (pseudo, V7) | caixa d'amplada fixa 150 px | `min-width: 150px; max-width: 220px` (`src/styles/feedback.css`) | 1 → 0 | S05-V7-pseudo |
| Píndola «TOCA AQUÍ PER ENTRAR» de la splash fora del llenç (pseudo V1, -3..323 px) | sense ajust a l'amplada | s'encongeix només si no cap; el català hi cap a 320 px (`src/hud/title.js`) | 25 → 0 | S01-V3-pseudo |
| `#season-end-hall` 40 px (pseudo) | farciment del pseudo | ve amb el canvi del pseudo (C) | 1 → 0 | S18-V1-pseudo |
| Watchdog d'arrencada amb `?lang=pseudo` | ja resolt a `index.html` (`__mulassaLocalePending` també per a pseudo) abans d'aquesta tasca | cap; verificat | 38 → 0 | S01-V3-pseudo |

## B — ja eren a HEAD (en català)

**B arreglada (Marc, 2026-10-22):** noms de jugador (`button.player-name`) de 19–21 px d'alt a Classificació, podis i Saló de la fama (≈200 troballes en tots els idiomes; 84/46/31/23 captures a HEAD). Ara tenen una zona tàctil invisible de 44 px amb qualsevol punter (`::after`, `src/styles/profile.css`). Les files no canvien d'alçada ni d'aspecte (el bolcat de caixes en català és igual). Pas mesurat entre noms veïns: Classificació 55 px (77 a 667×375), Saló de la fama 47–57 px, sense solapaments. A la classificació del selector les files fan 35 px de pas: allà la zona és la fila sencera (35 px × tota l'amplada, `src/styles/select.css`), perquè una de 44 px tocaria el nom veí. Hi queden 2 troballes (S02-V9-ca), que són aquest límit. Troballes: ≈200 → 2.

| Troballa | Per què no es toca |
| --- | --- |
| `#publish-privacy`, `#feedback-privacy` (≈20 px) i `a#feedback-mailto` (≈22 px) | igual a HEAD; són enllaços dins d'una frase (`p .btn-link`, WCAG 2.5.8 hi fa excepció) |
| `#publish-never` 36 px, `#publish-recover` 38 px | igual a HEAD (mitjanes) |
| Pastilles de poble sobre `#select-prev`/`#select-forward` (S04-V4/V5-ca) | igual a HEAD; no ho causa el botó d'idioma ni cap text nou |
| «Sobrenom» +17 px a S15-V4-ca; solapaments `player-name` ⟷ `#board-privacy`/`#board-seasons` a V4/V5; `#feedback-cancel` ⟷ `#feedback-privacy` a S20-V5 | igual a HEAD |
| `#select-bottom` marges desiguals al pas 2 (V4, V5, V7, V9) | igual a HEAD (mitjana) |

## C — falsos positius de l'eina (eina ajustada)

| Troballa | Motiu | Canvi a `tools/ui-inventory.mjs` |
| --- | --- | --- |
| `#rotate-exit` ⟷ `.ps-btn` (S05-V1, 12) | els botons del mode foto queden sota la coberta «gira el mòbil», que és a pantalla completa: no es poden tocar | un element tapat per una capa a pantalla completa que no el conté no compta com a objectiu ni com a solapament (un botó sobre un botó segueix sortint) |
| `.pf-nb` tallat a V4–V6 (9) | és text només per a lectors de pantalla (1 px, `clip-path: inset(50%)`) | es descarten els elements visualment amagats |
| `span.alias`, `#select-level-title`, `#select-level-sub`, `.nb` «tallats» uns 3–7 px en vertical | el rectangle d'un rang de text és l'àrea de contingut de Baloo 2, més alta que les lletres; a les captures no falta tinta (comprovat ampliant S19-V7-ca i S03-V7-de) | en vertical només compta un desbordament > 0,3 em |
| Desbordaments «només pseudo» d'un mot de 20+ caràcters | el farciment `~~~~` s'enganxava a l'últim mot i en feia una paraula que cap idioma té | `src/i18n/pseudo.js`: el farciment va en mots de ≤ 5 marques (mateix +40 %); prova a `tests/i18n.mjs` |
| Noms a la vora d'una llista desplaçable «< 44 px» | la fila està mig retallada pel desplaçador; en desplaçar-la, la zona sencera entra | l'objectiu no es mesura si el retalla un desplaçador o si en queda a menys de 22 px de la vora |
| Opcions noves `--src/--out/--dist` | per capturar la referència HEAD sense tocar el checkout | — |

## Pendent

- S03-V1-pseudo: a 320 px, «[Á BÁLLÁR! ~~~~]» i «[Çáñvíá dé fígúrá …]» fan 3 línies dins d'un botó de 44 px (1 troballa alta, `text-tallat`). Els idiomes reals (ru, de, es, ja) hi caben en 1–2 línies. Acceptat com a límit del pseudo (Marc, 2026-10-22): arreglar-ho exigiria amagar text o fer el moll més alt.
- S04-V1-pseudo: la tira de targetes desborda 9 px en vertical (`#select-strip`); el peu de la targeta pendent ja es tallava en català a HEAD.
- No emulat: tàctil real (els gestos i el tap de 44 px només amb `hasTouch`), Safari/iOS (fonts del sistema per a CJK, barra d'estat), pantalles amb DPR > 1.
