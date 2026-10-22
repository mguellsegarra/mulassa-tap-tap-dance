# Inventari de pantalles i auditoria UI (i18n)

Generat per `tools/ui-inventory.mjs` · 2026-10-22 00:36 · 705 captures (705 correctes) · captures a `shots/`, troballes completes a `findings.json`.

**Troballes:** 134 altes · 18 mitjanes · 177 baixes. Les captures són a mida real (deviceScaleFactor 1), sense reduir; PNG sense comprimir.

Tot amb `?mock` (dades de prova, «MODE PROVA»), sempre `?mute`. Punter: tàctil a V1–V3, fi a la resta; les variants `-fine`, `-rm` (moviment reduït), `-s0/-s3` (estrelles), `-feed`, `-confirm`, `-load/-error`, `-gpu/-ios` s’indiquen al codi.

## Viewports

| Codi | Mida | Quan té sentit |
| --- | --- | --- |
| V1 | 320×568 | mòbil petit, vertical (tàctil) |
| V2 | 375×667 | iPhone SE/8, vertical (tàctil) |
| V3 | 393×852 | iPhone 16, vertical (tàctil) |
| V4 | 667×375 | mòbil horitzontal petit (finestra d’escriptori; la coberta de gira és S28) |
| V5 | 852×393 | mòbil horitzontal gran (finestra d’escriptori; coberta de gira S28) |
| V6 | 768×1024 | tauleta vertical (finestra d’escriptori; coberta de gira S28) |
| V7 | 1280×800 | escriptori |
| V8 | 1440×700 | escriptori ample i baix |
| V9 | 1920×1080 | escriptori gran |

El català es captura a tots els viewports; de, ja, ru, es i `pseudo` a V1, V3 i V7 (de i pseudo = estressos de llargada; ja/ru = escriptures). Els mòbils horitzontals i les tauletes verticals es revisen com a finestres d’escriptori (AGENTS.md); amb tàctil mostren la coberta de gira (S28).

## Escenes i rutes

| Escena | Nom | Com s’hi arriba |
| --- | --- | --- |
| S01 | Splash («TOCA AQUÍ PER ENTRAR») | càrrega de la pàgina; espera la coberta aixecada |
| S02 | Selector, pas 1 (Mulassa) | Enter a la splash → G.state=select |
| S03 | Selector, pas 2 (nivells) | pas 1 → #select-next («TRIA DIFICULTAT») |
| S04 | Figura pendent (informació inline) | pas 1 → pastilla d’una vila amb figures pendents (Tarragona) |
| S05 | Mode foto (joc lliure) | pas 1 amb figura jugable → #select-free |
| S06 | ⚙ Configuració (amb selector d’idioma) | clic a #settings |
| S07 | Com es juga | clic a #howto (o #select-howto) |
| S08 | Ajusta la sincronia | ⚙ → #settings-sync |
| S09 | Pausa | a la pràctica, Escape → #pause-menu |
| S10 | Pràctica | selector → __dbg.startPractice() |
| S11 | Partida (HUD + carril) | ?autoplay&from=40 + tutorial fet → __dbg.choose(1) |
| S12 | Col·lapse | a la partida, __dbg.collapse() |
| S13 | Resultats (2 estrelles) | stars=2; espera els resultats |
| S14 | Compartir (Història 9:16) | ?final → «Publica el teu resultat» → «Ara no» → s’obre Comparteix |
| S15 | Classificació | ?final&review=board |
| S16 | Perfil | ?final&review=profile-guest |
| S17 | Saló de la fama | ?final&review=seasons |
| S18 | Fi de temporada | ?final&review=season-end |
| S19 | Fitxa de jugador | ?final&review=card |
| S20 | Feedback (Bústia) | clic a #feedback |
| S21 | Privadesa | ⚙ → #settings-privacy |
| S22 | Publica el teu resultat | ?final&review=publish |
| S23 | Avís d’estadístiques | ?mock&account=guest sense stats-notice vist → greeting al selector |
| S24 | Consell de dispositiu: acceleració per maquinari | WebGL en programari (swiftshader) → greeting al selector inactiu |
| S25 | Carregador (Avisant a la brigada…) | càrrega, captura a ~1 s abans que el carregador s’aixequi |
| S26 | Suggeriment d’idioma (navigator.languages=es, sense desat) | context locale es-ES sense ?lang ni desat → #lang-tip a la splash |
| S27 | Avís d’idioma no carregat (ja) | ?lang=ja amb el paquet del català bloquejat → #lang-notice |
| S28 | Coberta «gira el mòbil» (tàctil) | context tàctil (hasTouch) en un viewport horitzontal/tauleta + mode foto |
| S29 | Selector, pas 2: podi del nivell amb el teu nom | ?mock&board=me → pas 2 (#select-podium, només ≥ 600×600) |
| S30 | Classificació després del salt (#board-jump) | ?final&review=board → clic a #board-jump (al capdamunt: l’enllaç passa a «A la meva fila») |
| S31 | Aviat a la plaça (panell del plec, sense figura) | pas 1 → clic a la targeta del plec (.sel-more): el panell pendent mostra la invitació |

## Cobertura (idiomes capturats · troballes entre parèntesis)

| Escena | V1 | V2 | V3 | V4 | V5 | V6 | V7 | V8 | V9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S02 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +2 var. | ca(0) | ca(0) | ca(0) | ca(5) de(5) ja(5) ru(5) es(5) ps(3) | ca(1) | ca(10) |
| S03 | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +1 var. | ca(1) | ca(1) | ca(2) | ca(3) de(3) ja(3) ru(3) es(3) ps(3) | ca(1) | ca(3) |
| S04 | ca(0) de(0) ja(0) ru(0) es(0) ps(3) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(2) | ca(2) | ca(2) | ca(1) | ca(1) de(1) ja(1) ru(1) es(1) ps(3) | ca(0) | ca(1) |
| S05 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S06 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S07 | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) |
| S08 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S09 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(0) +1 var. | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(1) +1 var. | ca(0) +1 var. | ca(0) +1 var. | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(0) +1 var. | ca(0) +1 var. |
| S10 | ca(4) de(4) ja(4) ru(4) es(4) ps(4) | ca(4) | ca(4) de(4) ja(4) ru(4) es(4) ps(4) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S11 | ca(4) de(4) ja(4) ru(4) es(4) ps(4) | ca(4) | ca(4) de(4) ja(4) ru(4) es(4) ps(4) +2 var. | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S12 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S13 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +3 var. | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +2 var. | ca(0) | ca(0) |
| S14 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(0) +1 var. | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(0) +1 var. | ca(0) +1 var. | ca(0) +1 var. | ca(0) de(0) ja(0) ru(0) es(0) ps(0) +6 var. | ca(0) +1 var. | ca(0) +1 var. |
| S15 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(3) | ca(2) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S16 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S17 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(1) de(1) ja(1) ru(1) es(1) ps(2) | ca(0) | ca(0) | ca(1) | ca(1) de(1) ja(1) ru(1) es(1) ps(1) | ca(0) | ca(1) |
| S18 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S19 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S20 | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(2) | ca(2) de(2) ja(2) ru(2) es(2) ps(3) | ca(0) | ca(1) | ca(2) | ca(2) de(2) ja(2) ru(2) es(2) ps(3) | ca(2) | ca(2) |
| S21 | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(1) | ca(0) | ca(0) |
| S22 | ca(1) de(1) ja(1) ru(1) es(1) ps(1) | ca(1) | ca(1) de(1) ja(1) ru(1) es(1) ps(1) | ca(1) | ca(1) | ca(1) | ca(1) de(1) ja(1) ru(1) es(1) ps(1) | ca(1) | ca(1) |
| S23 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | — | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | — | — | — | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | — |
| S24 | +5 var. | — | +5 var. | — | — | — | +3 var. | — | — |
| S25 | +2 var. | — | +12 var. | — | — | — | +2 var. | — | — |
| S26 | ca(0) | — | ca(0) | — | — | — | ca(0) | — | — |
| S27 | ca(0) | — | ca(0) | — | — | — | ca(0) | — | — |
| S28 | — | — | — | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) | — | — | — |
| S29 | — | — | — | — | — | ca(2) | ca(3) de(3) ja(3) ru(3) es(3) ps(3) | ca(1) | ca(3) |
| S30 | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(3) | ca(2) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(0) | ca(0) | ca(0) |
| S31 | ca(0) de(0) ja(0) ru(0) es(0) ps(3) | ca(0) | ca(0) de(0) ja(0) ru(0) es(0) ps(2) | ca(3) | ca(2) | ca(1) | ca(1) de(1) ja(1) ru(1) es(1) ps(3) | ca(0) | ca(1) |

## Troballes per tipus

| Tipus | Gravetat màx. | Nre |
| --- | --- | --- |
| objectiu-menor-de-44 | alta | 119 |
| botons-solapats | alta | 12 |
| text-tallat | alta | 3 |
| text-desbordat | alta | 2 |
| marges-desiguals | mitjana | 18 |
| text-desbordat-vertical | baixa | 150 |
| pseudo-sense-passar-pel-cataleg | baixa | 22 |
| scroll-intern | baixa | 3 |

## Llista de troballes (agrupades per tipus + selector + text; 68 grups de 329)

Cada fila: gravetat · tipus · selector · mesura d’una captura · codis (primers 6). Detall complet a `findings.json`.

| Gravetat | Tipus | Selector | Mesura | Text | Captures |
| --- | --- | --- | --- | --- | --- |
| alta | objectiu-menor-de-44 | `a#feedback-mailto` | 116x22 px | holi@mulassa.cat | S20-V3-ca, S20-V2-ca, S20-V6-ca, S20-V7-ca, S20-V8-ca, S20-V3-de (+10) |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 67x20 px | Privadesa | S22-V1-ca, S22-V2-ca, S22-V3-ca, S22-V4-ca, S22-V5-ca, S22-V6-ca (+3) |
| alta | objectiu-menor-de-44 | `ol#select-podium-list > li > span.who > button.player-name` | 65x19 px | Mulatera | S03-V6-ca, S03-V7-ca, S03-V9-ca, S03-V7-de, S03-V7-ja, S03-V7-ru (+2) |
| alta | objectiu-menor-de-44 | `ol#select-podium-list > li > span.who > button.player-name.guest` | 118x19 px | Portadora#0209 | S03-V6-ca, S03-V7-ca, S03-V9-ca, S03-V7-de, S03-V7-ja, S03-V7-ru (+2) |
| alta | objectiu-menor-de-44 | `ol#select-podium-list > li > span.who > button.player-name.guest` | 95x19 px | Prova2#1001 | S29-V6-ca, S29-V7-ca, S29-V9-ca, S29-V7-de, S29-V7-ja, S29-V7-ru (+2) |
| alta | objectiu-menor-de-44 | `ol#select-podium-list > li > span.who > button.player-name.guest` | 95x19 px | Prova5#1004 | S29-V6-ca, S29-V7-ca, S29-V9-ca, S29-V7-de, S29-V7-ja, S29-V7-ru (+2) |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name.guest` | 94x20 px | Baldufa#1103 | S02-V7-ca, S02-V9-ca, S02-V7-de, S02-V7-ja, S02-V7-ru, S02-V7-es (+1) |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name` | 67x20 px | Cercavila | S02-V7-ca, S02-V9-ca, S02-V7-de, S02-V7-ja, S02-V7-ru, S02-V7-es (+1) |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 71x21 px | Privadesa | S20-V3-ca, S20-V2-ca, S20-V6-ca, S20-V7-ca, S20-V8-ca, S20-V9-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name` | 74x20 px | Portadora | S02-V7-ca, S02-V9-ca, S02-V7-de, S02-V7-ja, S02-V7-ru, S02-V7-es |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name` | 80x20 px | Rabassuda | S02-V7-ca, S02-V9-ca, S02-V7-de, S02-V7-ja, S02-V7-ru, S02-V7-es |
| alta | botons-solapats | `div#select-towns > button.btn.btn-secondary ⟷ button#select-forward` | 17x43 px (27 % del més petit) |  | S31-V4-ca, S31-V4-ca, S04-V4-ca, S31-V5-ca, S04-V5-ca |
| alta | botons-solapats | `div#select-towns > button.btn.btn-secondary ⟷ button#select-prev` | 58x43 px (95 % del més petit) |  | S31-V4-ca, S04-V4-ca, S31-V5-ca, S04-V5-ca |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 83x20 px | Datenschutz | S22-V1-de, S22-V3-de, S22-V7-de |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 85x20 px | プライバシー | S22-V1-ja, S22-V3-ja, S22-V7-ja |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 151x20 px | Конфиденциальность | S22-V1-ru, S22-V7-ru, S22-V3-ru |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 71x20 px | Privacidad | S22-V1-es, S22-V3-es, S22-V7-es |
| alta | objectiu-menor-de-44 | `button#publish-privacy` | 104x20 px | [Prívádésá ~~~~] | S22-V1-pseudo, S22-V3-pseudo, S22-V7-pseudo |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 89x21 px | Datenschutz | S20-V3-de, S20-V7-de |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 91x21 px | プライバシー | S20-V3-ja, S20-V7-ja |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 162x21 px | Конфиденциальность | S20-V3-ru, S20-V7-ru |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 75x21 px | Privacidad | S20-V3-es, S20-V7-es |
| alta | objectiu-menor-de-44 | `button#feedback-privacy` | 111x21 px | [Prívádésá ~~~~] | S20-V3-pseudo, S20-V7-pseudo |
| alta | text-tallat | `div#select-strip` | scrollHeight 98 > clientHeight 88 | VALLSMulassaUAFDracUAFÀligaAjuntament+UAFBou TradicionalUAFÓsUAFGegants i GegantonsAjuntam | S31-V1-pseudo, S04-V1-pseudo |
| alta | text-desbordat | `table.board-head > thead > tr > th` | text 82..146 · caixa 78..120 (+26 px) | Sobrenom | S15-V4-ca, S30-V4-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name.guest` | 113x21 px | Timbaler#0029 | S02-V9-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name.guest` | 110x21 px | Timbaler#7292 | S02-V9-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name.guest` | 91x21 px | Pessic#7947 | S02-V9-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name` | 86x21 px | Mace_Gran | S02-V9-ca |
| alta | objectiu-menor-de-44 | `ol#select-standings-rows > li > span.who > button.player-name.guest` | 91x21 px | Cargol#3514 | S02-V9-ca |
| alta | text-tallat | `button#select-play` | scrollHeight 66 > clientHeight 44 | [Á BÁLLÁR! ~~~~] | S03-V1-pseudo |
| alta | botons-solapats | `tr > td > div.who > button.player-name.guest ⟷ button#board-seasons` | 79x19 px (54 % del més petit) |  | S30-V5-ca |
| mitjana | marges-desiguals | `div#select-bottom` | marge superior 51 · inferior 11 (gaps 51/50/11) |  | S03-V4-ca, S03-V5-ca, S03-V7-ca, S03-V9-ca, S03-V7-de, S03-V7-ja (+10) |
| mitjana | botons-solapats | `button#feedback-cancel ⟷ button#feedback-privacy` | 7x14 px (10 % del més petit) |  | S20-V5-ca |
| mitjana | botons-solapats | `tr.me > td > div.who > button.player-name ⟷ button#board-seasons` | 66x3 px (18 % del més petit) |  | S15-V5-ca |
| baixa | text-desbordat-vertical | `div#pad > button.gua > span.lbl > span.arr` | +7 px per sota | ◀︎ | S10-V1-ca, S10-V2-ca, S10-V3-ca, S10-V1-de, S10-V3-de, S10-V1-ja (+21) |
| baixa | text-desbordat-vertical | `div#pad > button.gua > span.lbl > span.word` | +16 px per sota | GUA | S10-V1-ca, S10-V2-ca, S10-V3-ca, S10-V1-de, S10-V3-de, S10-V1-ja (+21) |
| baixa | text-desbordat-vertical | `div#pad > button.pa > span.lbl > span.arr` | +7 px per sota | ▶︎ | S10-V1-ca, S10-V2-ca, S10-V3-ca, S10-V1-de, S10-V3-de, S10-V1-ja (+21) |
| baixa | text-desbordat-vertical | `div#pad > button.pa > span.lbl > span.word` | +16 px per sota | PA | S10-V1-ca, S10-V2-ca, S10-V3-ca, S10-V1-de, S10-V3-de, S10-V1-ja (+21) |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | Àliga de Tarragona | S04-V6-ca, S04-V7-ca, S04-V9-ca, S04-V7-de, S04-V7-ja, S04-V7-ru (+2) |
| baixa | pseudo-sense-passar-pel-cataleg | `section#select-pending > div.sel-pending-links > a.btn.btn-link > span` | text | holi@ | S31-V1-pseudo, S31-V3-pseudo, S04-V1-pseudo, S04-V3-pseudo, S31-V7-pseudo, S04-V7-pseudo |
| baixa | pseudo-sense-passar-pel-cataleg | `section#select-pending > div.sel-pending-links > a.btn.btn-link > span` | text | mulassa.cat | S31-V1-pseudo, S31-V3-pseudo, S04-V1-pseudo, S04-V3-pseudo, S31-V7-pseudo, S04-V7-pseudo |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | Saló de la fama | S17-V3-ca, S17-V6-ca, S17-V7-ca, S17-V9-ca |
| baixa | text-desbordat-vertical | `h2#board-title` | +9 px per sota | Classificació | S15-V4-ca, S30-V4-ca, S15-V5-ca, S30-V5-ca |
| baixa | pseudo-sense-passar-pel-cataleg | `a#privacy-contact-link` | text | holi@mulassa.cat | S21-V1-pseudo, S21-V3-pseudo, S21-V7-pseudo |
| baixa | pseudo-sense-passar-pel-cataleg | `ul#controls-legend > li > span > small` | text | Cada error desanima la plaça: si es buida, la Mulassa cau! | S07-V1-pseudo, S07-V3-pseudo, S07-V7-pseudo |
| baixa | pseudo-sense-passar-pel-cataleg | `a#feedback-mailto` | text | holi@mulassa.cat | S20-V1-pseudo, S20-V3-pseudo, S20-V7-pseudo |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | Tria la dificultat | S02-V8-ca, S02-V7-ca, S02-V9-ca |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | Aviat a la plaça | S31-V6-ca, S31-V7-ca, S31-V9-ca |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | Ruhmeshalle | S17-V3-de, S17-V7-de |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | 殿堂 | S17-V3-ja, S17-V7-ja |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | Зал славы | S17-V3-ru, S17-V7-ru |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | Salón de la fama | S17-V3-es, S17-V7-es |
| baixa | text-desbordat-vertical | `h2#seasons-title` | +6 px per sota | [Sáló dé lá fámá ~~~~~ ~] | S17-V3-pseudo, S17-V7-pseudo |
| baixa | marges-desiguals | `div#select-bottom` | marge superior 39 · inferior 13 (gaps 39/42/13) |  | S03-V8-ca, S29-V8-ca |
| baixa | scroll-intern | `dialog#board-menu` | scrollHeight 355 > clientHeight 339 |  | S15-V4-ca, S30-V4-ca |
| baixa | scroll-intern | `dialog#pause-menu` | scrollHeight 348 > clientHeight 339 |  | S09-V4-ca |
| baixa | pseudo-sense-passar-pel-cataleg | `section.hall-season > div.hall-stext > p.hall-dates > span.d-long` | text | 27 de setembre – 7 d’octubre de 2026 | S17-V3-pseudo |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | Stufe wählen | S02-V7-de |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | Bald auf dem Platz | S31-V7-de |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | 難易度を選ぶ | S02-V7-ja |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | もうすぐ広場へ | S31-V7-ja |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | Выбери сложность | S02-V7-ru |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | Скоро на площади | S31-V7-ru |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | Elige la dificultad | S02-V7-es |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | Pronto en la plaza | S31-V7-es |
| baixa | text-desbordat-vertical | `span#select-next-label` | +6 px per sota | [Tríá lá dífíçúltát ~~~~~ ~~~] | S02-V7-pseudo |
| baixa | text-desbordat-vertical | `h2#aviat-title > span` | +6 px per sota | [Ávíát á lá pláçá ~~~~~ ~~] | S31-V7-pseudo |

## Límits coneguts

- El text del canvas (HUD) només s’audita com a cadenes (claus, català, pseudo, glifs absents, esprits tallats), no com a posició final a la pantalla: es veu a les captures.
- «Català en una pàgina d’un altre idioma» és una heurística de paraules; els noms propis i les dades de prova poden donar falsos positius (gravetat baixa/mitjana).
- Els marges i buits morts usen `~/.agents/skills/uipolish/scripts/measure-rows.js` només a les targetes fulla (diàleg i els seus fills, `#select-info`, `#select-bottom`, `#select-act`).
- Cap escena fabrica una partida real: S11/S12 van amb `?autoplay`, S13/S14/S15–S22 amb `?final`/`?stars` i el mock en memòria.

## Triatge F2 de l’estat integrat (`fixes-integrat.md`)

Origen de la comparació: l'inventari post-F1 de `t3-i18n-phase0` (648 captures; 71 altes · 33 mitjanes · 160 baixes).
Destí: aquest checkout, amb la mateixa eina i les escenes adaptades a la UX nova (705 captures, totes correctes; català a V1–V9, de/ja/ru/es/pseudo a V1, V3 i V7).
Primera passada del destí: 134 altes · 21 mitjanes · 177 baixes. Després dels arranjaments (S02, S03, S04, S15, S29, S30 i S31 tornades a capturar en tots els idiomes): 134 · 18 · 177.
Les altes de més no són regressions: hi ha més captures (S29–S31) i el selector nou mostra més files de noms a 1280×800 (vegeu B). Captures «abans» a `shots-before/`, «després» a `shots/` amb el mateix codi.

### Escenes noves

| Codi | Escena | Com s'hi arriba |
| --- | --- | --- |
| S29 | Pas 2 amb el podi del nivell i el teu lloc a la capçalera | `?mock&board=me` → «D'acord» a l'avís d'estadístiques → `#select-next`; només ≥ 600×600 (V6–V9; altres idiomes a V7) |
| S30 | Classificació després de prémer `#board-jump` | `?final&review=board` → clic a `#board-jump` (al capdamunt; l'enllaç passa a «A la meva fila») |
| S31 | Panell pendent del plec («Aviat a la plaça», sense figura) | pas 1 → clic a la targeta del plec `.sel-more` |

També: S02–S04 ja passen pel panell pendent nou (`pending-panel.js`) i S03 mostra el podi a V6–V9. Una execució parcial que comença a S03/S04/S31 entra primer al selector (abans quedava a la splash).

### A: regressions de la fusió o defectes de la UX nova, arreglats

| Troballa | Causa | Arranjament (fitxers) | Abans → després | Captures |
| --- | --- | --- | --- | --- |
| Noms del podi del pas 2 (`#select-podium-list button.player-name`): zones tàctils encavalcades amb ratolí (32 troballes, totes les llengües) | amb punter fi les files fan 31 px de pas i la zona invisible de 44 px de cada nom (F1) entrava 6–7 px a la fila veïna | amb punter fi la zona és la fila sencera, igual que a la classificació del selector; amb tàctil les files ja fan 44 px (`src/styles/select.css`) | punts de dalt/mig/baix de cada fila: abans el de baix tocava el nom següent → ara 0/0/0 · 1/1/1 · 2/2/2 (ca i pseudo, 1280×800). L'eina el continua comptant (fila de 31 px < 44), igual que la classificació del selector | S03-V7-ca, S03-V7-de, S03-V7-pseudo, S29-V7-ru, S29-V7-pseudo, S29-V6-ca |
| Càpsula de fletxes de la tira sobre la pastilla «Pròximament» (S02-V4-ca, alta, 21×43 px) | la UX nova posa la càpsula al mig de la pantalla; a 667×375 la fila de pobles és just a sobre de la tira, a la mateixa banda | `navX()` (`src/ui/select-strip.js`): al mig, llevat que una pastilla hi comparteixi la banda; llavors, just a la dreta de les pastilles, sense sortir de la pantalla. `select-ui.js` només canvia la línia que la crida (595 línies, no creix). Prova a `tests/selector-controls.mjs` | 274..394 px (sobre la pastilla, que acaba a 390) → 398..518 px; troballa 1 → 0 | S02-V4-ca |
| `#board-jump`: l'amplada reservada per a les dues etiquetes era la del català en tots els idiomes (no ho detecta l'eina) | `content: 'Al capdamunt'` / `'A la meva fila'` escrits al CSS | el CSS llegeix `attr(data-top)` / `attr(data-me)` i `board-list.js` hi posa les dues etiquetes de l'idioma de la pàgina (en canviar d'idioma, la pàgina es torna a carregar) | 393×852, en prémer l'enllaç: l'enllaç i «Posició 18 de 46» no es mouen en ca (239..348), de (229..348) ni pseudo (189..348); el català té la mateixa amplada que abans | S30-V7-de, S30-V7-pseudo, S30-V1-pseudo |

Revisades a ull les fusions delicades (de, ru, ja i pseudo; S02, S03, S04, S15, S29, S30, S31, S06): `select-ui`/`select-standings`, panell pendent, podi i `#board-jump` sense textos tallats ni fora de pantalla; piles de fonts i `data-i18n` d'`index.html` correctes (cap glif absent, cap clau visible); `base.css` conserva les regles de F1 (`.c-pts` més ample al destí, columna del % de 4,8 em en idiomes ≠ ca); la fulla ⚙ té el selector d'idioma i ja no té Classificacions.

### B: ja eren a l'origen, o el mateix límit en més captures

| Troballa | Per què no es toca |
| --- | --- |
| Noms de la classificació del selector < 44 px (S02-V7, tots els idiomes; abans només S02-V9-ca) | el mateix límit acceptat a F1: files de 35 px de pas, la zona és la fila sencera. La UX nova mostra cinc files a 1280×800 |
| Pastilles de poble sobre `#select-prev`/`#select-forward` amb la fila desplegada (S04 i S31 a V4/V5) | igual que a l'origen: la fila desplegada ocupa tota l'amplada i no hi ha banda lliure. La càpsula es mou tant com pot cap a la dreta |
| Classificació a 852×393 (S15-V5, S30-V5): la llista es queda en una fila i «Temporades anteriors»/«Privadesa» hi queden a sobre | igual que a l'origen (finestra d'escriptori; al mòbil horitzontal surt la coberta de gira). S30 només canvia la fila que queda a sota |
| «Sobrenom» +26 px a S30-V4-ca | la mateixa capçalera que S15-V4-ca, ja a HEAD |
| `#select-bottom` marges desiguals al pas 2 (també S29) | igual que a l'origen (mitjana) |
| `#publish-privacy`, `#feedback-privacy`, `a#feedback-mailto` | enllaços dins d'una frase, igual que a l'origen. `#publish-never` (36 px) ja no surt al destí |
| S31-V1-pseudo: la tira desborda 9 px en vertical | el mateix límit del pseudo que S04-V1-pseudo |

### C: artefactes de captura

| Troballa | Motiu |
| --- | --- |
| Línia de classificació sense text a S02-V4-ca (primera passada) | era la transició de color del text, encara a 0 en el moment de la captura; a la segona passada ja s'hi llegeix «Classificació · 45 participants» |

### Pendent

- S03-V1-pseudo (`#select-play` a 3 línies) i S04/S31-V1-pseudo (tira +9 px): límits del pseudo acceptats a F1.
- Pastilles desplegades a 667×375/852×393 i la classificació a 852×393: són de HEAD i cal decidir-ne el disseny (no hi ha banda per a tot).
- No emulat: tàctil real, Safari/iOS i DPR > 1.

## Triatge F1 (de `fixes.md`; les A arreglades hi són detallades)

### B — ja eren a HEAD (en català)

**B arreglada (Marc, 2026-10-22):** noms de jugador (`button.player-name`) de 19–21 px d'alt a Classificació, podis i Saló de la fama (≈200 troballes en tots els idiomes; 84/46/31/23 captures a HEAD). Ara tenen una zona tàctil invisible de 44 px amb qualsevol punter (`::after`, `src/styles/profile.css`). Les files no canvien d'alçada ni d'aspecte (el bolcat de caixes en català és igual). Pas mesurat entre noms veïns: Classificació 55 px (77 a 667×375), Saló de la fama 47–57 px, sense solapaments. A la classificació del selector les files fan 35 px de pas: allà la zona és la fila sencera (35 px × tota l'amplada, `src/styles/select.css`), perquè una de 44 px tocaria el nom veí. Hi queden 2 troballes (S02-V9-ca), que són aquest límit. Troballes: ≈200 → 2.

| Troballa | Per què no es toca |
| --- | --- |
| `#publish-privacy`, `#feedback-privacy` (≈20 px) i `a#feedback-mailto` (≈22 px) | igual a HEAD; són enllaços dins d'una frase (`p .btn-link`, WCAG 2.5.8 hi fa excepció) |
| `#publish-never` 36 px, `#publish-recover` 38 px | igual a HEAD (mitjanes) |
| Pastilles de poble sobre `#select-prev`/`#select-forward` (S04-V4/V5-ca) | igual a HEAD; no ho causa el botó d'idioma ni cap text nou |
| «Sobrenom» +17 px a S15-V4-ca; solapaments `player-name` ⟷ `#board-privacy`/`#board-seasons` a V4/V5; `#feedback-cancel` ⟷ `#feedback-privacy` a S20-V5 | igual a HEAD |
| `#select-bottom` marges desiguals al pas 2 (V4, V5, V7, V9) | igual a HEAD (mitjana) |

### C — falsos positius de l'eina (eina ajustada)

| Troballa | Motiu | Canvi a `tools/ui-inventory.mjs` |
| --- | --- | --- |
| `#rotate-exit` ⟷ `.ps-btn` (S05-V1, 12) | els botons del mode foto queden sota la coberta «gira el mòbil», que és a pantalla completa: no es poden tocar | un element tapat per una capa a pantalla completa que no el conté no compta com a objectiu ni com a solapament (un botó sobre un botó segueix sortint) |
| `.pf-nb` tallat a V4–V6 (9) | és text només per a lectors de pantalla (1 px, `clip-path: inset(50%)`) | es descarten els elements visualment amagats |
| `span.alias`, `#select-level-title`, `#select-level-sub`, `.nb` «tallats» uns 3–7 px en vertical | el rectangle d'un rang de text és l'àrea de contingut de Baloo 2, més alta que les lletres; a les captures no falta tinta (comprovat ampliant S19-V7-ca i S03-V7-de) | en vertical només compta un desbordament > 0,3 em |
| Desbordaments «només pseudo» d'un mot de 20+ caràcters | el farciment `~~~~` s'enganxava a l'últim mot i en feia una paraula que cap idioma té | `src/i18n/pseudo.js`: el farciment va en mots de ≤ 5 marques (mateix +40 %); prova a `tests/i18n.mjs` |
| Noms a la vora d'una llista desplaçable «< 44 px» | la fila està mig retallada pel desplaçador; en desplaçar-la, la zona sencera entra | l'objectiu no es mesura si el retalla un desplaçador o si en queda a menys de 22 px de la vora |
| Opcions noves `--src/--out/--dist` | per capturar la referència HEAD sense tocar el checkout | — |

### Pendent

- S03-V1-pseudo: a 320 px, «[Á BÁLLÁR! ~~~~]» i «[Çáñvíá dé fígúrá …]» fan 3 línies dins d'un botó de 44 px (1 troballa alta, `text-tallat`). Els idiomes reals (ru, de, es, ja) hi caben en 1–2 línies. Acceptat com a límit del pseudo (Marc, 2026-10-22): arreglar-ho exigiria amagar text o fer el moll més alt.
- S04-V1-pseudo: la tira de targetes desborda 9 px en vertical (`#select-strip`); el peu de la targeta pendent ja es tallava en català a HEAD.
- No emulat: tàctil real (els gestos i el tap de 44 px només amb `hasTouch`), Safari/iOS (fonts del sistema per a CJK, barra d'estat), pantalles amb DPR > 1.
