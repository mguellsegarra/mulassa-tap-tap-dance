# El Tombairot: model voxel (fase 4), versió final

Bestiari escolar de l'Escola Mare de Déu de la Candela (Valls), vist a la Mostra de Bestiari Escolar i Infantil de la Fira de
Santa Úrsula. Aquesta és la versió final del model, feta després de revisar les tres propostes (Fable v1, Astra i Neon)
i retocada en una segona ronda amb les correccions de l'amo (27-11-2026).
Només hi ha el model i una pose de repòs animada; ball, música, colla i integració al joc no s'han tocat.

- Codi: `src/figures/tombairot/` (`tombairot.js`, `tomba-form.js`, `tomba-body.js`, `tomba-head.js`).
- Visor: `tools/dev/tombairot.html` (`?t=`, `?v=`, `?cam=`, `?amp=`, `?hop=`, `?head=`, `?bare`, `?v1`, i `?joc` per veure'l amb
  els llums del joc).
- Comparació de les quatre versions: `tools/dev/tombairot-compare.html` (`?v=`, `?t=`, `?bare`).
- Captures de la final: `captures/final/` (ronda 2; GPU real, Chrome sense finestra). Les de la ronda 1 són a
  `captures/final-r1/`, per comparar abans i després, i les de l'arrel de `captures/` són de la v1.
- Versions anteriors, per comparar: `src/figures/tombairot-v1/` (la v1 de Fable, amb els noms acabats en `V1`),
  `src/figures/tombairot-astra/`, `src/figures/tombairot-neon/`, i les seves notes a `astra/` i `neon/`.

## Què he agafat de cada versió

| Versió | Què se n'ha quedat | Què s'ha descartat |
| --- | --- | --- |
| Fable v1 (5.088 triangles) | El pas gros de vòxel (anella de 13 cm, escata de 25 cm), les anelles en octàgon amb solc, el cos llarg amb cua, la paleta, el rig amb un pivot per peça i la pose determinista | El cos en capsa, el coll curt, les ales que tapaven el groc, el pis de baix de la faldilla ("mitjó"), la cua en columna |
| Astra (19.020) | Les proporcions mesurades de `astra/fidelity.md` (faldilla ~23 %, llaç a ~0,66 de l'alçada real, espiell a 0,31, coll llarg de 9-11 anelles, que aquí són 7 de grosses) i la sonda | El vòxel fi i el cap petit |
| Neon (6.876) | La cara: ulls grossos amb blanc i pupil·la, dents blanques, llengua bífida, celles en arc i cresta al clatell; els plecs verticals de la faldilla | La faldilla alta, el coll curt, les orelles llargues i planes |

## Què ha canviat respecte a la v1 (ronda 1)

Això és el que va fer la ronda 1; la ronda 2, més avall, en corregeix el con, el coll, la faldilla, la cua i el musell.

- **Menys vòxels**: 3.852 triangles en 18 malles (la v1 en tenia 5.088; l'objectiu era 6.000 com a màxim).
- **Cos**: secció arrodonida per graons (mitja amplada 0,22 / 0,40 / 0,53 / 0,59 / 0,62 de dalt a baix) i llom arquejat
  (2,26 m darrere el coll, 2,42 al mig, 1,98 a la gropa). Cada fila i cada pis és una sola capsa de banda a banda: no hi ha
  res buit i no s'hi pot obrir cap forat.
- **El groc es llegeix com a pit**: les escates comencen darrere l'eix del con. De tres quarts es veu mig con sencer, amb el
  serrell a la vora i el folre de les ales darrere.
- **Coll llarg**: 6 anelles (0,66 m) que avancen pas a pas cap endavant; el cap queda ben amunt del llaç.
- **Cap més gros i simpàtic**: ulls de granota amb blanc i pupil·la que miren una mica cap avall i endins, celles en arc,
  boca oberta amb dents blanques a dalt i a baix, llengua bífida, llaç ample (0,46 m).
- **Faldilla**: un sol tram fins a terra en plecs verticals (un de cada dos surt 4 cm i és més clar). És massissa: per sota
  es veu daurada, sense forat.
- **Cua**: surt del llom sobre la gropa i baixa fins a terra en vuit blocs que s'aprimen (0,54 m a l'arrel, 0,11 a la
  punta), amb una placa vermella a cada bloc. Tres peces articulades: l'arrel segueix la gropa i el mig i la punta es
  gronxen més tard i més ample.

## Ronda 2: correccions de l'amo

Decisions de l'amo que no es toquen: la silueta llarga i la cua fins a terra de `photo6`, el cap més gros que el real
(escala 1,18), la faldilla rígida amb els peus quiets, i només l'edició del 2019 (sense margarides ni medalló).

| Què | Ronda 1 | Ronda 2 |
| --- | --- | --- |
| Con groc | 11 anelles, perfil de cúpula (recte fins a mig con i tancat de cop); la closca feia una paret darrere seu | 12 anelles, rusc alt i punxegut: recte el primer cinquè i després s'estreny a ritme constant fins a l'amplada del coll. Fa 1,56 m sobre una base d'1,28 m i acaba al 62 % de l'alçada (2,46 m) |
| Closca al davant | Un pa de pessic tan ample a dalt com a baix, amb un folre llis de cara | La primera fila d'escates és el darrere del mateix con (3 cm més enfora que les anelles) i la segona fa de pas cap al llom: de davant i de tres quarts el groc es veu sencer |
| Coll | 6 anelles (0,66 m), el cap hi reposava | 7 anelles (0,77 m) que es corben 21 cm endavant; el cap pivota 10 cm més endavant i el coll hi entra per sota del clatell. Es veuen 5 anelles sobre el llaç |
| Faldilla | 0,80 m al davant, però 0,97 i 1,22 m als costats i al darrere; plecs amples | 0,90 m a tot el voltant (23 % de l'alçada); les escates baixen fins a la faldilla. Plecs de 9 a 12 cm, també al davant i al darrere |
| Cua | Columna prima de 8 blocs verds | Segueix la línia del llom: surt ampla (0,60 m) sobre la gropa, hi queda 24 cm per sobre, penja per darrere i es corba fins a terra, on la punta s'arrossega. Verd fosc perquè no es confongui amb les escates, amb 7 plaques vermelles. La punta remena amb retard |
| Musell | Capsa amb una vora | Cantonades en graons: dos pisos més estrets fins als narius, galtes un pas més amples i dos passos fins a un nas petit; el llavi de baix també |
| Blanc d'ulls i dents | `#f7f4ea`, sortia torrat | Un blanc més clar que qualsevol pintura (1,5 · 1,85 · 2,5 en lineal): compensa la llum càlida del joc. Comprovat amb els llums del visor i amb els del joc (`?joc`) |

El serrell ara és continu (un floc per anella, sense forats entremig) i el llom té una cresta baixa amb 6 pompons.

## Fonts

| Font | Autor i data | Què s'hi veu |
| --- | --- | --- |
| https://youtu.be/jsqlt_Qxmgg?t=177 | Ardit Produccions, "Cercaviles de la 20a Mostra de Bestiari Escolar i Infantil", 26-10-2019 | Davant i tres quarts caminant (`t01`-`t44`, `c01`-`c20`); el cos passant de costat i la figura de lluny per darrere (`video/tail/pass.jpg`, `rear.jpg`) |
| `photo1-2018-front-34.jpg` | Foto de l'amo, 2018, autor pendent | Tres quarts dret amb un adult al costat: és el regle |
| `photo2-2019-video-34-left.jpg` | Fotograma del vídeo d'Ardit, 2019 | Tres quarts de prop: cap, llaç, serrell, folre de les ales |
| `photo3-recent-daisies-medallion.jpg` | Foto de l'amo, edició recent, autor pendent | Margarides al serrell i medalló |
| `photo4-2018-10-19-front-side.jpg` | Foto de l'amo, 19-10-2018, autor pendent | Costat davanter: perfil del cap, coll llarg corbat, ala d'escates, setí daurat alt al darrere |
| `photo5-2025-mostra-back-wing.jpg` | Foto de l'amo, Mostra 2025, autor pendent | El llom d'escates continua enrere amb una fila de pompons |
| `photo6-old-edition-full-side.jpg` | Foto impresa d'una **edició anterior**, autor i any pendents | L'únic perfil sencer: cos llarg, llom gairebé pla, faldilla tot al llarg, cua que baixa de la gropa a terra |

Les imatges són de tercers i no es desen al repositori, tret de `captures/final/compara-foto*.jpg` (i les de la v1), que les
porten al costat del model per a la revisió: **no s'han de pujar a Git**.

## Mides del model final

| Mida | Valor | Etiqueta | D'on surt |
| --- | --- | --- | --- |
| Alçada fins a la punta de la banya | 3,96 m | adaptat | El cap és més gros que el real i el coll s'ha allargat perquè es vegi. El real fa 3,2-3,5 m (`photo1`) |
| Faldilla | 0,90 m a tot el voltant (23 % de 3,96) | observat | `t19`, `t22`: 22-25 % |
| Con d'anelles, de la faldilla al llaç | 1,56 m, 12 anelles de 13 cm; acaba al 62 % de l'alçada | observat i adaptat | El real en té 21-23 de 6,5 cm i el llaç al 66 % |
| Amplada del con a baix | 1,28 m (0,82 de la seva alçada) | observat | `t19`: 0,35 / 0,43 = 0,81 |
| Perfil del con | recte fins al 20 %, 0,86 de l'amplada al 40 %, 0,59 al 60 %, 0,36 al 80 % | observat | `photo2`, mesurat fila a fila |
| Espiell | 0,24 × 0,25 m, centre a 1,165 m (29 %) | observat | `t19`: centre a 0,31-0,32 |
| Coll | 0,77 m, 7 anelles d'11 cm, 0,30 m de gruix, 21 cm endavant a dalt | observat i adaptat | `photo4`: 9-11 anelles; `astra/fidelity.md` |
| Cap | 0,66 m d'ample amb les galtes, 0,86 m de llarg | adaptat | El real fa uns 0,45 × 0,65 m: aquí és una vegada i mitja |
| Llargada, del davant del con a la punta de la cua | 4,20 m (1,06 × alçada) | **silueta de l'edició anterior, per confirmar** | `photo6`: 1,05 × alçada |
| Llom | 2,46 m, i 2,56 a la cresta (0,65 × alçada; 0,69 amb els pompons) | **ídem**, i observat prop del coll | `photo1` i `photo5`: pompons a l'alçada del llaç; `photo6`: 0,74 |
| Amplada del cos | 1,32 m | inferit | Cap vista zenital |

## Observat, inferit, adaptat, pendent

| Element | Etiqueta | Nota |
| --- | --- | --- |
| Con d'anelles grogues amb solcs, més ample a baix; coll llarg d'anelles | observat | Totes les fonts del 2018-2025 |
| Serrell verd fosc a les dues vores del groc, del cap a la faldilla | observat | Al coll corre pel darrere (`photo4`) |
| Llaç vermell a la base del coll | observat | Més ample que el real, perquè es vegi |
| Espiell fosc amb fulles als costats | observat | |
| Cap de peluix verd: musell ample, ulls sobre un disc groc, celles vermelles, banya, orelles punxegudes amb l'interior malva, dents blanques, llengua bífida | observat | `photo1`, `photo2`, `photo4`, `c20` |
| Escates de feltre en dos verds i un verd blavós, folre llis al davant de les ales | observat | `photo2`, `c20`, `pass.jpg` |
| Pompons vermells al llom | observat | 4 visibles a `photo5`; a `rear.jpg` es veu una línia vermella contínua. El model en posa 6 i després venen les plaques de la cua |
| Faldilla de setí daurat fins a terra, en plecs | observat | |
| **Cos llarg amb el llom arquejat, faldilla tot al llarg** | silueta de l'edició anterior, per confirmar | `photo6`; al 2019 el cos passa uns segons a `pass.jpg` |
| **Cua que baixa de la gropa a terra amb plaques** | silueta de l'edició anterior, per confirmar | `photo6` (cua fosca, plaques salmó); aquí és verd fosc i les plaques són vermelles com els pompons del 2019 |
| Escates fins a la faldilla a tot el llarg | observat al davant, inferit al darrere | `photo1`. A `photo6` (edició anterior) i darrere l'ala de `photo4` el setí puja més: aquí no, per decisió de l'amo (faldilla al 23 %) |
| Portadors: un a l'espiell i un altre sota el llom | inferit | El segon surt només de la llargada. Per confirmar |
| Peus (vambes blaves, texans) | adaptat | No es veuen a cap font. Només surten quan salta |
| Cap una vegada i mitja el real, ulls grossos, pupil·les que miren avall i endins, dents de baix | adaptat | Perquè es llegeixi simpàtic al mòbil |
| Anelles de 13 cm i escates de 25 cm | adaptat | El pas gros de la Mulassa i el Bou |
| Moviment de mandíbula, orelles, pupil·les i cua; balanceig de repòs | adaptat | El cap real és un peluix amb la boca cosida oberta |
| Margarides i medalló (edició de `photo3`) | pendent | No hi ha commutador de variant |
| Autors i enllaços de les fotos de l'amo | pendent | |

## Interfície

```js
import { buildTombairot, poseTombairot, TOMBA_SWAY_S } from '/src/figures/tombairot/tombairot.js';
const rig = buildTombairot();             // { head: 1.18 } per defecte
poseTombairot(rig, t, { amp, hop, jaw }); // o rig.pose(t, p)
```

- Retorna `{ root, body, rings, shell, skirt, tail[3], neck, head, jaw, tongue, ears[2], pupils[2], feet[4], pose }`.
- Jerarquia: `root > body > (rings, shell, skirt, tail[0] > tail[1] > tail[2], neck > head > (jaw > tongue, ears, pupils))`;
  `feet` pengen de `root`.
- Canvis respecte a la v1: `skirt` ara és una malla fixa al cos (abans era un grup que penjava) i `tail` és una llista de
  tres grups encadenats (abans era un de sol). La sonda (`tools/qa/tombairot-probe.mjs fable`) hi afegeix les tres unions
  de la cua; la resta de l'adaptador no ha canviat. La ronda 2 no canvia la interfície ni la sonda.
- `poseTombairot(rig, t, p)`: determinista, sense estat; `t` en segons. Un balanceig dura `TOMBA_SWAY_S` (2,4 s) i el
  cicle sencer el doble. `p.amp` escala el moviment (0 = repòs), `p.hop` aixeca el cos en metres, `p.jaw` fixa la boca.
- El front és +z. `head.name === 'head'`.

## Què s'ha comprovat

Sortida de `node tools/qa/tombairot-probe.mjs fable` sobre la ronda 2 (577 instants del cicle de 4,8 s):

```
fable triangles 4236 W/H/D [ 1.51, 3.96241, 4.82171 ] W/H 0.38108
foam width/H; panel width/H, height/H, centre/H [ 0.32304, 0.06057, 0.06314, 0.29357 ]
mesh components; wholly buried source box indices [{"mesh":"rings","components":1,"buried":[]},{"mesh":"shell","components":1,"buried":[]},{"mesh":"skirt","components":1,"buried":[]},{"mesh":"tail0","components":1,"buried":[]},{"mesh":"tail1","components":1,"buried":[]},{"mesh":"tail2","components":1,"buried":[]},{"mesh":"neck","components":1,"buried":[]},{"mesh":"head","components":1,"buried":[]},{"mesh":"jaw","components":1,"buried":[]},{"mesh":"tongue","components":1,"buried":[]},{"mesh":"ears0","components":1,"buried":[]},{"mesh":"ears1","components":1,"buried":[]},{"mesh":"pupils0","components":1,"buried":[]},{"mesh":"pupils1","components":1,"buried":[]},{"mesh":"feet0","components":1,"buried":[]},{"mesh":"feet1","components":1,"buried":[]},{"mesh":"feet2","components":1,"buried":[]},{"mesh":"feet3","components":1,"buried":[]}]
same-normal face pairs <=3mm (rest pose) {"counts":{"same":314,"different":45,"exposedDifferent":0,"exposedExact":0,"orbitVisible":0,"orbitExact":0},"examples":[]}
other poses [s, exposed different-colour pairs] [[1.2,0],[2.4,0],[3.6,0]]
pose samples 577 seconds 4.8 minimum Y 0 below floor []
joints [parts, disconnected poses, worst gap lower bound in m, time in s] [["rings/neck",0,0,0],["rings/shell",0,0,0],["rings/skirt",0,0,0],["neck/head",0,0,0],["head/jaw",0,0,0],["jaw/tongue",0,0,0],["head/ears0",0,0,0],["head/ears1",0,0,0],["head/pupils0",0,0,0],["head/pupils1",0,0,0],["skirt/feet0",0,0,0],["skirt/feet1",0,0,0],["skirt/feet2",0,0,0],["skirt/feet3",0,0,0],["shell/tail0",0,0,0],["tail0/tail1",0,0,0],["tail1/tail2",0,0,0]]
```

- 4.236 triangles en 18 malles (la ronda 1 en tenia 3.852; el màxim era 6.000).
- 0 illes (cada malla és un sol component), 0 capses enterrades, 0 parells de cares de colors diferents al mateix pla
  (a menys de 3 mm), 0 unions obertes de les 17, res per sota de terra.
- La mateixa sonda amb `amp: 0` (repòs del tot, on totes les peces queden alineades) i amb `amp: 1.5, hop: 0.25` dona
  també 0 parells, 0 unions obertes i res sota terra. Són dues còpies temporals de la sonda; no són al repositori.
- **A ull**, amb GPU real: les 19 captures de `captures/final/`, les tres comparacions amb les fotos al mateix angle
  (`compara-foto1.jpg` porta també la ronda 1), la unió del coll i les tres de la cua de prop amb el moviment exagerat
  (`amp=1.5`) a quatre instants, el cap de davant, de costat i de sota, i la pàgina de comparació a 1600×1000 i 393×852.
- **No s'ha fet**: tests i `npm run check` (venen després del vistiplau), cap mòbil real, cost de bloqueig al Galaxy S10,
  el model dins del joc (ombres, càmeres). Els llums del joc s'han copiat al visor (`?joc`); no és el joc.

## Límits coneguts

- **El darrere és inferit** d'una edició anterior: llargada, alçada del llom i cua poden no ser les del 2019.
- **El cap gros estira les proporcions**: amb el cap a 1,18 i el coll visible, la figura fa 3,96 m (la real, uns 3,4). El con
  acaba al 62 % de l'alçada i no al 66 % mesurat, i al costat de `photo1` el cap es veu més gros respecte al con.
- El con és un octàgon de graons: de tres quarts es veu més piramidal que el rusc de debò, que és rodó.
- El blanc d'ulls i dents surt dels valors normals de color (més d'1): funciona amb el material del joc (`MAT`, Lambert,
  sense mapa de tons). Si mai s'hi posa un mapa de tons o un efecte de resplendor, cal tornar-lo a mirar.
- La faldilla és rígida amb el cos i els peus no caminen (decisió de l'amo).
- La cua és de blocs grossos (de 20 a 60 cm): la corba es llegeix de costat i de tres quarts, però és una escala.
- Els colors de `Vox` tenen un petit atzar per capsa: dues construccions no donen exactament els mateixos tons.

## Al joc (integració, 27-11-2026)

Figura jugable només al servidor de dev: `UNRELEASED_IDS` (`src/figures/index.js`) la deixa fora de qualsevol build. Mòduls
del joc a `src/figures/tombairot/` (`tomba-dance.js`, `tomba-stage.js`, `tomba-play.js`, `tomba-scene.js`,
`tomba-objects.js`, `tomba-colla.js`, `tomba-portrait.js`). Captures: `captures/joc/`.

### Ball al joc: ADAPTACIÓ

Al vídeo de referència no balla: a la cercavila camina i es gronxa. El ball del joc és una adaptació, feta per frases de la
cançó (8 temps, les mateixes que les del chart):

| Secció | Frases, per ordre |
| --- | --- |
| A | camina endavant i torna enrere · reverència del coll · quart de volta a la dreta i torna · gran gronxada amb dos salts · camina · mitja volta i torna · quart de volta a l'esquerra i torna · reverència |
| B | quart de volta a l'esquerra · mitja volta · quart de volta a la dreta · reverència · gronxada · camina |
| Final | dues frases de salts a cada temps fent una volta sencera; després, una reverència llarga i quieta |

- Cada frase comença i acaba al seu lloc i mirant endavant: la pose a l'instant t només depèn de t (el mateix instant, la
  mateixa pose, salti on salti la cançó).
- Gira sobre el mig del cos (1,4 m darrere el con), no sobre el con: la cua no escombra la colla.
- Capa còmica a cada temps: els genolls cedeixen, la mandíbula fa un clac, el cap fa no-no un compàs cap a cada banda, les
  orelles es disparen, i a l'últim temps de cada frase fa els ulls guerxos.
- La cua té pes: un gir la treu enfora amb retard (la direcció d'un quart de segon abans).
- Peus: dos portadors (el del darrere, inferit). Cada peu queda plantat a terra i fa un pas per temps, mig temps desfasat
  del seu parell, cap a on serà el cos al mig del pas següent. Com a molt queden a 0,53 m de la seva posició sota el cos.
- La resposta a TOMBA! (els dos botons): obre molt la boca.
- Joc lliure: Espai salta, E fa la reverència, Q remena la cua, R mitja volta (la de totes les figures).

### Colla i festa

- Colla (adaptació): quatre a 5,3 m al voltant del ball, picant de mans: dos nens i dos mestres amb la samarreta taronja de
  l'escola (`photo1`, la fulla de fotogrames). Un cinquè nen, amb samarreta blanca com el de `photo1`, porta el cartell
  «Candela» en un pal, a 5,6 m a l'altra banda de la plaça respecte a la càmera, perquè es vegi per sobre del llom.
- El cartell és una aproximació: blanc amb vora vermella, franges blaves, anella daurada i la C vermella; el text no es pot
  llegir a aquesta mida.
- Sense foc (és una figura d'escola). La festa és la de totes les figures: confeti als encerts i al final; la colla aixeca
  els braços durant les frases del final.
- Música: grallers (la mateixa formació que el Bou). Per confirmar.
- Element del redoble: el GLOBUS de la Mulassa.
