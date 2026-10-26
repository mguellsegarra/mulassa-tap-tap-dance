# Anàlisi coreogràfica del Ball del Drac de Valls (vídeo pm-lEViiPK0)

Auditoria independent feta a partir de fotogrames. No he vist el vídeo de manera contínua ni he escoltat l'àudio: tot el que segueix ve de 525 fotogrames presos cada 0,2 s.

## Resum: discrepàncies principals

1. **Final (86,6–104,0).** El real fa 3 voltes CCW cada vegada més ràpides (86,6–93,8), es para de cara (93,8–94,6), **inverteix el sentit** i fa 6 voltes CW més ràpides (94,8–104,0, d'1,4 a 1,9 s per volta). La proposta hi fa 5 voltes, totes CCW, i a partir del vídeo 98,68 s deixa de girar i manté el rumb a +3240°. El real completa les voltes a 103,8–104,0: la proposta s'atura uns 5,1–5,3 s abans. En aquest tram final la proposta no té cap inversió.
2. **Vaivens de 20–31 i 64–74.** No són balanceigs petits: són girs de rumb d'uns 120° entre F-a (de cara, una mica cap a la dreta) i el perfil HL (caps a l'esquerra), amb parades d'1,2–1,8 s a cada extrem i 3 inversions per iteració. La proposta també hi inverteix el sentit, però amb un recorregut més estret i simètric al voltant de 0 (±47° a C, ±36° a C3), sense arribar al perfil HL i sense parades mantingudes. A 23,0 i 28,0 el real és de perfil i el model, de cara.
3. **Sortides cap a càmera (31–42 i 74–86).** El real gira uns +450° CCW mentre s'acosta: arrenca des de HL, passa de cara, va a HR a tocar de càmera, esquena, HL allunyant-se, i acaba de cara. La proposta hi fa −90° i després +360° des de 0. A 35,8 i 79,0 el real és HR i el model és de cara (diferència estimada de 70–90°).
4. **Passos de cara (0–16 i 43–60).** El real obre el rumb cap a un sol costat, HL, fins a uns −45°, i les passes es veuen bé. La proposta hi fa girs simètrics a tots dos costats (±14–25° a A2, ±36° a E). El recorregut total no és més petit que el real, però va cap als dos costats en lloc d'un, i en uns altres moments.
5. **Coincideix**: les dues voltes senceres CCW sobre el lloc (16,7–19,6 i 60,0–63,2), pel que fa al sentit i al nombre de voltes. Segons el `yaw` registrat, el model va fins a ~120° desfasat dins la volta.
6. El que més falla és el **rumb**: cap a quin costat gira, fins on arriba als vaivens grans, quant de temps s'hi queda i quan inverteix. Els balanceigs laterals hi pesen menys.

## 1. Mètode, mostreig i límits

- Font: `pm-lEViiPK0.mp4`, 111,934 s, 50 fps. Tots els temps són **segons de vídeo**.
- Material inspeccionat: els 44 fulls densos `dense/seq-*.jpg`, amb 525 fotogrames exactes cada 0,2 s, de 0,0 a 104,8 s.
- No he vist el vídeo de manera contínua ni he escoltat l'àudio.
- Amb girs d'1,4 s per volta, 0,2 s fan uns 50° entre mostres, lluny dels 180° en què el sentit es podria confondre. Per això el sentit de cada volta queda determinat sense ambigüitat. El que no queda determinat són els angles exactes entre mostres.
- Hi ha dos tipus d'evidència: la **categòrica** (quina cara o perfil es veu, i en quin ordre) és fiable; els **angles** són estimacions sense calibrar. No converteixo píxels a metres: la càmera és única, es mou, fa zoom, de vegades la figura omple el quadre i de vegades queda tapada per espectadors.
- Model renderitzat: he mirat 4 captures (28,0; 35,8; 96,0 i 100,4) i les 13 poses registrades a `rendered-pose-samples.json`.

## 2. Convenció d'orientació (verificada)

Referències del cos (es veuen bé a tota la gravació):

| Codi | Què es veu | Rumb ψ (estimat) |
|---|---|---|
| **F-b** | Cartell "ESTEM AMB VOSALTRES" de cara; el cap verd baix de perfil apuntant a l'esquerra de la pantalla; el cap alt (morro gris/rosa) mira amunt cap a càmera; ala a la dreta | de cara, una mica cap a HL (≈ −15…−40°) |
| **F-a** | Cartell de cara o lleugerament girat a la dreta; el cap verd mira **directament** a càmera (ulls i dents de front); ala visible a l'**esquerra** | de cara, una mica cap a HR (≈ +15…+40°) |
| **HR** | Perfil: caps a la **dreta** de la pantalla, cua enrotllada amb anelles a l'**esquerra** | +90° |
| **ESQ** | Esquena: cua enrotllada centrada cap a càmera, anelles a tot el voltant, cartell amagat | ±180° |
| **HL** | Perfil: caps a l'**esquerra** de la pantalla, cua a la **dreta** | −90° |

Definició del signe, **vist des de dalt**: la càmera és al sud mirant al nord, i la dreta de la pantalla és l'est. Amb ψ = 0, el davant de la bèstia apunta a càmera (sud). ψ positiu vol dir gir **antihorari vist des de dalt** (CCW): sud → est → nord → oest → sud, és a dir, de cara → HR → esquena → HL → de cara.

Comprovacions del signe:
1. En totes les voltes CCW l'ordre dins del sector frontal és **F-b → F-a → HR**. En totes les CW és **HR → F-a → F-b → HL**. Per tant F-a cau al costat de HR i F-b al costat de HL. Aquest detall confirma el sentit amb una referència independent de la cua.
2. Al codi del laboratori (`stage.js`: la bèstia mira +z, la càmera frontal és a +z, i `drac-motion.js` fa `root.rotation.y = front + yaw`), un `yaw` positiu porta el cap cap a +x, que és la dreta de la pantalla. Rotació positiva sobre +y vol dir antihorari vist des de dalt. **El signe del codi coincideix amb el meu ψ**: un `yaw` positiu al codi és CCW, de cara → HR → esquena → HL.

## 3. Cronologia observada (segons de vídeo)

ψacum = rumb acumulat estimat, sense mòdul. Comença a 0.

| Tram | Acció | Seqüència de rumbs i referències | Sentit / voltes | ψacum | Confiança |
|---|---|---|---|---|---|
| **0,0–16,6** | Passos curts sobre el lloc o amb poc desplaçament; el portador aixeca peus alternats (p. ex. 0,4; 1,4; 2,6; 5,0; 7,2; 9,2; 10,6; 12,6). Gairebé sempre en **F-b**. Cap a 9,6–10,2 i 15,2–15,8 es veuen les anelles del flanc a la dreta del cos: el rumb s'obre cap a HL, potser fins a uns −45°. 16,0–16,6 torna a F-b ben frontal. | `seq-000.00`…`seq-014.40` | Oscil·lació de rumb entre ≈0 i ≈−45°, sense voltes | 0 (−45…0) | Mitjana en l'amplitud, alta en el fet que no hi ha volta |
| **16,7–19,6** | **Volta sencera 1**, sobre el lloc, amb passets. 16,8 F-a → 17,4–17,8 HR → 18,0 3/4 → 18,2–18,6 ESQ → 18,8–19,2 HL → 19,4 3/4 HL → 19,6 F-b → 20,0 F-a | `seq-016.80-019.00`, `seq-019.20-021.40` | **CCW, 1 volta** (~2,9 s) | 0 → +360 | Alta |
| **19,8–21,8** | Passa de front i queda en **F-a** (sobrepassa uns +20…+45°): ala a l'esquerra, cartell girat a la dreta. Mantinguda ~1,8 s. | `seq-019.20`, `seq-021.60` | segueix CCW i para | ≈ +390 | Alta |
| **21,9–24,2** | **Inversió** a ~21,9–22,0: 22,0 F-b → 22,2–22,4 3/4 HL → **22,6–24,2 HL de perfil**, mantingut ~1,6 s | `seq-021.60-023.80`, `seq-024.00` | CW ~120° | +390 → ≈+270 | Alta |
| **24,3–26,4** | **Inversió** a ~24,3: 24,4 F-b → 24,6–24,8 → **25,0–26,4 F-a** (cap verd mirant a càmera) | `seq-024.00-026.20` | CCW ~120° | +270 → ≈+390 | Alta |
| **26,5–28,6** | **Inversió** a ~26,5: 26,6–26,8 F-b → 27,0 3/4 → **27,2–28,6 HL** (a 28,0 és clarament HL) | `seq-026.40-028.60` | CW ~120° | +390 → ≈+270 | Alta |
| **28,8–31,0** | Continua en HL i **camina endavant** (cap a l'esquerra de la pantalla): gambades llargues a 29,2; 29,6; 30,4; 30,6. La càmera fa panoràmica a l'esquerra per seguir-lo. Translació, no rotació. | `seq-028.80-031.00` | rumb quiet | ≈ +270 | Mitjana: panoràmica i desplaçament es barregen |
| **31,2–35,8** | **Sortida cap a càmera, primera vegada**. 31,2–32,0 3/4 HL → F-b; 32,2–33,4 F-b, la figura creix al quadre; 33,6–34,4 F-a molt gran al quadre; 34,6–35,8 **HR** omplint el quadre | `seq-031.20`, `seq-033.60` | CCW ~180° mentre avança | +270 → +450 | Alta en el sentit; la distància no es pot mesurar |
| **36,0–42,0** | Segueix girant CCW mentre passa per davant de la càmera i torna: 36,0–36,6 HR (flanc omplint el quadre); 36,8–37,4 HR→3/4 esquena; **37,6–38,4 ESQ**; 38,6–38,8 3/4; **39,0–40,6 HL** caminant i allunyant-se; 40,8–41,2 HL; 41,4 3/4; 41,6–42,0 F-b | `seq-036.00`, `seq-038.40`, `seq-040.80` | CCW ~270° | +450 → +720 | Alta |
| **42,0–43,0** | F-b, de cara, assentat | `seq-040.80-043.00` | — | +720 | Alta |
| **43,2–50,2** | Passos en **F-b** amb el rumb obert cap a HL: anelles a la dreta del cos a 44,8–45,4 i 45,6–47,8. Passes visibles a 44,8; 45,0; 45,2 i 47,2. Entre 45,6 i 47,8 la figura queda molt més gran i desplaçada a l'esquerra del quadre (s'acosta, la càmera fa zoom, o totes dues coses: no ho puc separar). Entre 48,0 i 50,2 torna a mida normal, en F-b. | `seq-043.20-045.40`, `seq-045.60-047.80`, `seq-048.00-050.20` | Oscil·lació ≈ 0…−45°, sense voltes | ≈ +720 | Alta (no hi ha volta), mitjana (amplitud) |
| **50,4–59,8** | Passos amb el rumb entre de cara i cap a HL: 50,4–52,6 F-b, cama ben alta a 51,0; 52,8–53,4 s'obre cap a HL (anelles a la dreta); 54,0 3/4 HL amb pas marcat; 56,0–57,4 F-b amb el cartell girat; 58,2–58,4 anelles a la dreta (≈ −45°); 59,4–59,8 gira cap a F-a. La figura es desplaça pel quadre i la càmera la segueix. | `seq-050.40`…`seq-057.60` | Oscil·lació ≈ 0…−45°, sense voltes | ≈ +720 (−45…+30) | Mitjana |
| **60,0–63,2** | **Volta sencera 2**: 60,0 F-a → 60,2–60,6 ala a l'esquerra → 60,8–61,2 HR → 61,4 → **61,6–61,8 ESQ** → 62,0–62,2 → 62,4–62,6 HL → 62,8 3/4 → 63,0–63,2 F-b → 63,4–63,6 F-a | `seq-060.00-062.20`, `seq-062.40-064.60` | **CCW, 1 volta** (~3,1 s) | +720 → +1080 | Alta |
| **63,8–65,0** | Queda en **F-a** (sobrepassa uns +20…+45°) | `seq-062.40`, `seq-064.80` | segueix CCW i para | ≈ +1110 | Alta |
| **65,0–67,4** | **Inversió** a ~65,0: 65,2 → 65,4–65,6 F-b → 65,8–66,0 3/4 HL → **66,2–67,4 HL** | `seq-064.80-067.00`, `seq-067.20` | CW ~120° | → ≈ +990 | Alta |
| **67,5–69,4** | **Inversió** a ~67,5: 67,6 3/4 → 67,8 F-b → **68,2–69,4 F-a** | `seq-067.20-069.40` | CCW ~120° | → ≈ +1110 | Alta |
| **69,5–72,6** | **Inversió** a ~69,5: 69,6–70,0 F-b → 70,2 → **70,4–72,6 HL** | `seq-069.60-071.80`, `seq-072.00` | CW ~120° | → ≈ +990 | Alta |
| **72,8–74,4** | HL i **camina endavant** (gambada llarga 73,0–73,4); la càmera el segueix | `seq-072.00-074.20` | rumb quiet | ≈ +990 | Mitjana |
| **74,4–78,2** | **Sortida cap a càmera, segona vegada**. 74,4–74,8 3/4 HL; 75,0–75,4 → F-b; 75,6–76,6 F-b, molt gran al quadre; 76,8–77,4 F-a; 77,6–78,2 F-a amb l'ala a l'esquerra | `seq-074.40`, `seq-076.80` | CCW ~120° | → ≈ +1110 | Alta |
| **78,4–85,6** | 78,4–79,0 HR gran al quadre; 79,2–80,0 HR amb el flanc omplint el quadre; 80,2–80,6 HR→3/4; 80,8–81,4 cua girant cap a càmera; **81,6–82,2 ESQ**; 82,4–82,6 3/4; **82,8–85,4 HL** allunyant-se i caminant; 85,6–86,2 F-b | `seq-079.20`, `seq-081.60`, `seq-084.00` | CCW ~330° | → ≈ +1440 | Alta en el sentit |
| **86,4–93,8** | **Final, fase 1: 3 voltes CCW seguides, cada vegada més ràpides**. Pas per F-b: 86,6 / 89,5 / 91,8 / 93,8. ESQ: 88,4–88,6 / 90,8–91,0 / 92,8–93,0. HR: 87,6–88,0 / 90,2–90,6 / 92,4–92,6. HL: 88,8–89,0 / 91,2–91,4 / 93,2–93,4. | `seq-086.40`, `seq-088.80`, `seq-091.20`, `seq-093.60` | **CCW, 3 voltes** (≈2,9 / 2,3 / 2,0 s) | +1440 → +2520 | Alta |
| **93,8–94,6** | **Aturada de cara (F-b)**, 5 mostres seguides gairebé iguals (~0,8–1,0 s) | `seq-093.60-095.80` | parada | +2520 | Alta |
| **94,8–104,0** | **Final, fase 2: inversió i 6 voltes CW**. 94,8 3/4 **HL** (de F-b directament cap a HL: sentit invers) → 95,0–95,2 HL → 95,4–95,6 ESQ → 95,8–96,0 HR → 96,2 F-a → 96,4–96,6 F-b → … ESQ a 95,5 / 97,2 / 98,8 / 100,2 / 101,6 / 103,0. F-b a 96,5 / 98,0 / 99,6 / 101,0 / 102,4 / 104,0. | `seq-093.60`, `seq-096.00`, `seq-098.40`, `seq-100.80`, `seq-103.20` | **CW, 6 voltes** (≈1,9 / 1,5 / 1,6 / 1,4 / 1,4 / 1,6 s) | +2520 → +360 | Alta |
| **104,0–104,8** | F-b. Entre 104,4 i 104,8 es tornen a veure anelles a la dreta (lleugerament cap a HL). Un espectador entra en primer pla. | `seq-103.20-104.80` | gairebé quiet | ≈ +360 | Mitjana sobre si està del tot quiet |

Comprovació del recompte del final: entre dues esquenes seguides hi ha entre 7 i 12 mostres. Cada quadrant (HR, esquena, HL, de cara) apareix com a mínim una vegada per volta, i sempre en el mateix ordre dins de cada fase. Són voltes completes, no balanceigs.

## 4. Motius repetits

Estructura observada, amb dues iteracions gairebé idèntiques i un final propi:

| Motiu | 1a iteració | 2a iteració |
|---|---|---|
| Passos de cara, rumb obrint-se cap a HL | 0,0–16,6 | 42,0–59,8 |
| Volta sencera CCW sobre el lloc | 16,7–19,6 (~2,9 s) | 60,0–63,2 (~3,1 s) |
| Sobrepassa fins a F-a i s'hi para | 19,8–21,8 | 63,8–65,0 |
| Vaivé gran F-a ↔ HL, amb parades als extrems | HL 22,6–24,2 · F-a 25,0–26,4 · HL 27,2–28,6 | HL 66,2–67,4 · F-a 68,2–69,4 · HL 70,4–72,6 |
| Camina endavant en HL | 28,8–31,0 (~2,2 s) | 72,8–74,4 (~1,6 s) |
| Sortida cap a càmera girant CCW ~450° fins a quedar de cara | 31,2–42,0 (~11 s) | 74,4–85,6 (~11 s) |

- De l'inici de la volta a l'inici de la sortida hi ha uns 14,3–14,4 s en totes dues iteracions (16,7 → 31,0 i 60,0 → 74,4).
- Diferències: a la 2a les dues primeres parades del vaivé són una mica més curtes (1,2 s contra 1,4–1,6 s), la caminada en HL abans de sortir també és més curta (1,6 s contra 2,2 s) i l'última parada en HL abans de caminar és més llarga (2,2 s contra 1,4 s). A totes dues sortides la figura arriba a omplir el quadre. Amb la càmera en moviment no puc dir quina passa més a prop.
- Final: 3 voltes CCW que acceleren, parada de cara de ~1 s, 6 voltes CW més ràpides (1,4–1,9 s per volta) i parada de cara a ~104,0.

## 5. El que la proposta tracta com a "balanceig" o "quiet"

- **20–30 i 64–73 no són balanceigs petits.** Són girs grans de rumb, asimètrics: van d'F-a (≈ +20…+45°) a HL de perfil (≈ −90°), un recorregut d'uns 110–135°, amb parades d'1,2–1,8 s als extrems i cicles d'uns 4,6 s. Hi he vist 3 inversions a cada iteració.
- **0–16 i 43–60** (passos de cara): el rumb no està fix. S'obre cap a HL fins a uns −45° en alguns moments i el portador aixeca els peus de manera visible. El recorregut és d'uns 45°, cap a un sol costat.
- Inclinació del cos: la closca es veu bàsicament dreta, amb els caps alts. No he vist cap balanceig lateral gran i mantingut com els fins a 42° previstos als estils actius de `dance-drac.js`. No en dono xifra: amb una sola càmera, inclinació i rumb es confonen.
- Peus: es veuen passes alternes durant tota la gravació i gambades llargues quan camina en HL (29–31, 39–41, 73–74, 83–85). Durant les voltes del final fa passets ràpids sobre el lloc (peu aixecat, p. ex., a 96,2; 99,2; 101,2; 103,2).

## 6. Translació (separada de la rotació)

- 28,8–31,0 i 72,8–74,4: avança en el sentit del cap (HL, cap a l'esquerra de la pantalla). La càmera el segueix amb una panoràmica.
- 31–42 i 74–86: s'acosta fins a omplir el quadre (33–38 i 76–82) i després s'allunya en HL (39–41 i 83–85). Aquesta és la trajectòria en arc. No puc dir-ne la distància en metres, i una part del canvi de mida pot venir de la càmera.
- El final (86–104) passa pràcticament al mateix lloc del quadre amb la càmera quieta: gira sobre el lloc.

## 7. Comparació amb el codi i amb el model renderitzat

Signe: el `yaw` positiu de `trial-dance.js` i de `dance-drac.js` és CCW (de cara → HR), el mateix que el meu ψ positiu (vegeu §2).

### Proposta: evidència de codi font (`src/dev/drac-lab/trial-dance.js`, `trial-rig.js`, `programmes.js`)

| Tram real | Real (vídeo) | Proposta (font) | Discrepància |
|---|---|---|---|
| 0–16 | Rumb que s'obre cap a un sol costat, fins a ≈ −45° cap a HL (recorregut ≈45°); passos visibles | `A2.yaw` ±0,04–0,07 voltes (±14–25°, recorregut de fins a ≈50°), simètric | Recorregut total semblant; asimetria i moments equivocats |
| 16,7–19,6 | 1 volta CCW | `B`: +1 volta | **Coincideixen el sentit i el recompte** |
| 20–31 | Vaivé F-a ↔ HL de ~120°, 3 inversions, parades als extrems | `C.yaw` ±0,13 voltes (±47°), simètric al voltant de 0, amb inversions | Recorregut més estret, no arriba al perfil HL, sense parades mantingudes; a 28,0 el real és HL |
| 31–42 | +450° CCW passant per davant de la càmera | `WALK_OUT`: −0,25 i després +1 volta; x −1,4…+1,3, z fins a 3,4 unitats (≈0,7 m i 1,7 m amb `DRAC_SCALE` 0,492) | Hi ha volta CCW, però comença des de 0 i no des de HL; el traçat de temps no quadra (a 35,8 el real és HR) |
| 43–60 | Passos de cara, obrint-se cap a HL (≈45°) | `E.yaw` ±0,1 voltes (±36°), simètric | Simetria no observada; recorregut de la proposta més ample |
| 60–63 | 1 volta CCW | `B3`: +1 volta | Sentit correcte |
| 64–74 | Vaivé F-a ↔ HL com a la 1a iteració | `C3` ±0,1 voltes (±36°), amb inversions | Mateix problema que a 20–31, i encara més estret |
| 74–86 | +450° CCW | `D3` = `WALK_OUT` | Mateix problema que a 31–42 |
| **86,4–93,8** | **3 voltes CCW** que acceleren (2,9 → 2,0 s) | `E3`: 4 voltes de 5,5 temps (≈2,2 s a 151 BPM) | Recompte diferent |
| **93,8–94,6** | **Parada de cara** | cap | Falta |
| **94,8–104,0** | **6 voltes CW** (1,4–1,9 s per volta) | `coda`: +1 volta **CCW**; cap volta CW | **Discrepància principal: al final no hi ha inversió.** Les 9 voltes senceres de la proposta (+3240°) van totes CCW |
| fins a 104,0 | Gira fins a 103,8–104,0 | El `yaw` arriba a +3240° al temps 222 i s'hi queda | Verificació numèrica del coordinador amb Node (`buildProgrammes`, `videoAt`): `videoAt(buildProgrammes().proposal, 222, 'offset')` = 98,676789 s de vídeo. La proposta s'atura uns 5,1–5,3 s abans que el real |

Altres valors de font de la proposta: `MOTION.bank` 6°, `pitch` 3°, `bob` 0,03 unitats (≈1,5 cm), `sway` 1–3,5° de balanceig lateral, mandíbula i ales fixes. Comparat amb el vídeo, el que més falla és el rumb: cap a quin costat va, el recorregut dels vaivens grans, les parades als extrems i la inversió final. Els balanceigs laterals hi pesen menys.

### Joc actual (`src/figures/drac/dance-drac.js`, idèntic a `baseline/dance-drac.js`)

- Es basa en un altre vídeo (Arditproduccions, 2023) i en una graella de temps pròpia. No està pensat per seguir aquesta gravació.
- `DRAC_YAW_CUES` (en mitges voltes): B +1 volta; C torna a 0 (desfà la volta, CW); D +2 voltes; E −2 / +1… Sí que té inversions, però no cauen on cauen al vídeo de 2018.
- Els estils actius preveuen amplituds de balanceig lateral de fins a 42° (`STYLE[0]`), salts i foc; els 44° de D3/E3 no s'utilitzen en la forma actual. No he vist cap d'aquestes coses en aquesta gravació (és de dia i no hi ha foc actiu).

### Model renderitzat: estat registrat contra el vídeo

Font: `rendered-pose-samples.json`, generat pel coordinador amb el laboratori en mode offset, offset 0, proposta "austera".

Columnes:
- **ψ real ≈**: estimació meva a partir de la silueta, sense calibrar.
- **Model yaw**: valor registrat, acumulat.
- **Dif. acumulada**: model − real, sense mòdul. Mesura quantes voltes de més o de menys porta el model, no l'orientació que es veu.
- **Dif. aparent**: la mateixa diferència reduïda a −180…+180°. És la diferència d'orientació que es veuria en una imatge, i també és una estimació.

| Vídeo s | Real (referència visual) | ψ real ≈ | Model yaw | Dif. acumulada | Dif. aparent | Comentari |
|---|---|---|---|---|---|---|
| 16,8 | F-a, comença la volta | +30 | +76° | +46 | +46 | El model ja ha començat la volta |
| 18,4 | ESQ | +180 | +303° | +123 | +123 | El model va per davant |
| 20,8 | F-a quiet | +390 | +380° | −10 | −10 | Orientació semblant en aquest instant |
| 23,0 | **HL de perfil** | +270 | +396° | +126 | +126 | Segons el `yaw`, el model és gairebé de cara |
| 28,0 | **HL** | +270 | (només la captura) | — | — | A `compare-028.0.png` el model es veu de cara |
| 35,8 | **HR** omplint el quadre | +450 | +360°, z 3,38 u | −90 | −90 | A la captura el model es veu de cara |
| 39,0 | HL caminant | +630 | +540° | −90 | −90 | Segons el `yaw`, el model és d'esquena |
| 53,8 | 3/4 HL | +675 | +747° | +72 | +72 | El model mira cap a HR i el real cap a HL |
| 61,6 | ESQ (volta 2) | +900 | +957° | +57 | +57 | Mateixa volta, desfasats |
| 68,0 | F-a quiet | +1110 | +1044° | −66 | −66 | |
| 79,0 | HR omplint el quadre | +1170 | +1100°, z 3,4 u | −70 | −70 | |
| 90,0 | Entre F-a i HR (voltes CCW del final) | +1860 | +1884° | +24 | +24 | Orientació semblant en aquest instant |
| 96,0 | HR **girant CW** | +2250 | +2877° | **+627** (≈1,7 voltes) | −93 | El real ja gira en sentit contrari; a la captura el model es veu de cara |
| 100,4 | HR **girant CW** | +1170 | **+3240°, quiet** (roll 0, lift 0, drive 0) | **+2070** (≈5,75 voltes) | −90 | El model està aturat; el real encara gira |

Captures que he mirat (`compare-028.0.png`, `compare-035.8.png`, `compare-096.0.png`, `compare-100.4.png`): en totes quatre el model renderitzat es veu **de cara**, amb els dos caps junts i el cartell visible. Al vídeo, en canvi, es veu HL de perfil a 28,0, HR omplint el quadre a 35,8, i HR girant a 96,0 i 100,4. Aquesta és evidència d'imatge, categòrica. Els valors de "Dif. aparent" són estimacions angulars sense calibrar.

A més, el model té els dos caps l'un al costat de l'altre, a la mateixa alçada i tots dos de cara, mentre que el real té un cap baix que mira endavant i un cap alt. Per això les referències de silueta (F-a, F-b) no es poden comparar directament. Les captures de 16,8; 18,4; 20,8; 23,0; 39,0; 53,8; 61,6; 68,0; 79,0 i 90,0 no les he mirat: per a aquests instants em baso en el `yaw` registrat.

Lectura de les 13 mostres:
- La diferència aparent va de −93° a +126°. A 20,8 i 90,0 l'orientació coincideix aproximadament, però una coincidència puntual no demostra que la seqüència sigui la mateixa.
- La diferència acumulada creix fins a +2070° a 100,4 perquè, al final, el real inverteix el sentit i la proposta no; a més, el rumb de la proposta queda fix des de 98,68.

## 8. Especificació d'esdeveniments per a una implementació fidel (sense codi)

Sempre en segons de vídeo, ψ acumulat i signe CCW positiu. Els angles marcats amb ≈ són estimacions.

1. 0–16,6: passos alterns visibles; rumb entre 0 i ≈ −45°, amb obertures cap a HL (anelles a la dreta) a ~9,6–10,2 i ~15,2–15,8.
2. 16,7–19,6: +360° sobre el lloc, en uns 2,9 s; continua fins a ≈ +30…+45° (F-a) a 20,0 i hi para fins a 21,8.
3. 21,9 → 22,6: CW fins a ≈ −90° (HL) relatiu; parada fins a 24,2.
4. 24,3 → 25,0: CCW fins a F-a; parada fins a 26,4.
5. 26,5 → 27,2: CW fins a HL; parada fins a 28,6.
6. 28,8–31,0: camina endavant en HL.
7. 31,2–42,0: +450° CCW mentre s'acosta a càmera, hi passa a tocar (HR a 34,6–36,6, esquena a 37,6–38,4) i se n'allunya (HL a 39,0–41,2), fins a quedar de cara a 41,6–42,0.
8. 42–59,8: passos de cara, rumb entre 0 i ≈ −45° cap a HL; a 45,6–47,8 s'acosta a càmera (o la càmera fa zoom).
9. 60,0–63,2: +360°, uns 3,1 s; sobrepassa fins a F-a i hi para fins a 65,0.
10. 65,0 → 66,2 CW fins a HL; 67,5 → 68,2 CCW fins a F-a; 69,5 → 70,4 CW fins a HL i parada fins a 72,6.
11. 72,8–74,4: camina endavant en HL.
12. 74,4–85,6: +450° CCW com al punt 7 (de cara a 75,6, F-a a 77, HR a 78,4–80,0, esquena a 81,6–82,2, HL a 82,8–85,4, de cara a 85,6).
13. 86,6–93,8: 3 voltes CCW, cada una més curta (≈2,9, 2,3 i 2,0 s).
14. 93,8–94,6: parada de cara.
15. 94,6–104,0: 6 voltes CW (≈1,9, 1,5, 1,6, 1,4, 1,4 i 1,6 s), passant per l'esquena a 95,5; 97,2; 98,8; 100,2; 101,6 i 103,0.
16. 104,0: de cara; ψ acumulat ≈ +360° (+1440 + 1080 − 2160).

Regles: no suavitzar les inversions fins que desapareguin; no fer servir un sol sentit de gir; no ajustar el moviment perquè passi els tests de sabates. Primer cal que coincideixin la seqüència i el sentit.

## 9. Incerteses i el que no he observat

- Els angles (F-a, F-b, recorreguts dels vaivens, diferències amb el model) són estimacions sense calibrar. L'evidència sòlida és l'ordre de siluetes i el sentit.
- 45,6–47,8: no puc separar si s'acosta o si la càmera fa zoom.
- Panoràmica de càmera contra desplaçament real: a 0–16, 28–31, 50–60 i 72–74 no ho puc separar del tot.
- Inclinació (roll i pitch), alçada de les passes i distàncies: no les mesuro. Hi ha moments amb espectadors tapant part de la figura.
- No he escoltat l'àudio i no he relacionat els esdeveniments amb compassos.
- Del model renderitzat només he mirat 4 captures; la resta de la comparació ve de les 13 poses registrades i del codi font.
- Imatges útils per mostrar-ho: `canvi-sentit.jpg`, `comparacio-tres-moments.jpg`, les captures `compare-*.png` i els fulls `dense/seq-*.jpg` citats a la cronologia.
