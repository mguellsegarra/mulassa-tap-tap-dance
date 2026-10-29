# Una figura nova: què cal i on va

Guia per a qui vulgui portar una figura nova al joc, sigui obrint una PR o fent-ho des del repo. Diu què has d'aportar, quines peces s'han de crear, on va cadascuna i com es valida. La Mulassa, el Drac i el Bou ja hi són i serveixen d'exemple: si dubtes de com ha de quedar una peça, mira com la té el Bou, que és la figura més completa.

Els agents tenen la mateixa feina partida en skills: [`mulassacat-nova-figura`](../../.agents/skills/mulassacat-nova-figura/SKILL.md) ordena les fases i [`mulassacat-integracio-figura`](../../.agents/skills/mulassacat-integracio-figura/SKILL.md) és la llista d'integració. L'encàrrec original, amb tots els matisos, és a [`research/bestiari/pla-nova-figura.md`](../../research/bestiari/pla-nova-figura.md).

## Abans de començar: què has de portar

Sense això no hi ha figura. És la fase 0 i decideix si val la pena seguir.

- **La figura exacta**: nom, població, edició i colla que la porta. No s'ha de confondre amb una altra del mateix nom (el Bou Tradicional de la UAF no és el Bou de la Turba).
- **Música i ball propis.** Algunes figures només tenen un toc de tabal o desfilen. Si no hi ha ball, s'ha de dir i no inventar-lo.
- **La partitura**, si existeix: de la colla, d'escoles de música o de grups de grallers.
- **Almenys dos vídeos sencers i continus** amb la música audible. Per a cada un: URL, autor, acte, data, durada i què s'hi veu.
- **Fotos de la colla**: la roba, els ajudants i els seus papers.

## Les fases

Cada fase acaba amb una cosa que es pot obrir i mirar (una pàgina, un enllaç al mòbil) i amb el vistiplau del propietari abans de passar a la següent.

| # | Fase | Què hi poses | Què en surt | On queda |
| --- | --- | --- | --- | --- |
| 0 | Viabilitat | Les fonts de dalt | Què hi ha, què falta i l'ordre proposat | `research/bestiari/<figura>/` |
| 1 | Ball de referència | Els vídeos | El ball explicat per frases, amb vídeo, 3D i mapa zenital alhora | `research/bestiari/<figura>/` |
| 2 | Música | Partitura i gravacions | La versió festiva, de 90 a 120 s, amb l'entrada comuna | `music/<figura>/`, `public/music/` |
| 3 | Mapa de notes i paraules | La música aprovada | Tres nivells jugables, les paraules dels botons, el redoblament i el càntic final | `src/song-<clau>.json`, `src/i18n/` |
| 4 | Model vòxel | Fotos i vídeos | El model, fidel i llegible, sense forats ni peces flotant | `src/figures/<carpeta>/<clau>.js` |
| 5 | Ball sobre el model | El ball de referència | El ball amb la capa còmica, els peus ben plantats i les tecles del joc lliure | `src/figures/<carpeta>/` |
| 6 | Colla, públic i festa | Fotos de la colla | Els ajudants, el públic que fa lloc i la festa pròpia | `src/figures/<carpeta>/` |
| 7 | Miniatures | Fotos de la figura | Retrat vectorial, retrat de píxels i silueta | vegeu "Imatges" |
| 8 | Càmeres | El ball acabat | Showreel del selector i càmera de joc sense marejar | `src/game/showreel.js`, la fitxa |
| 9 | Integració | Tot l'anterior | La figura es pot triar, jugar, practicar, fer anar en joc lliure i compartir | vegeu la plantilla |
| 10 | Validació | La figura integrada | Captures i vídeos a totes les mides, ja revisats | la PR |

## On va cada peça

Totes les figures segueixen el mateix patró. La carpeta és `src/figures/<carpeta>/` (`mulassa`, `drac`, `bou`) i la clau curta és el prefix dels fitxers (`mula`, `drac`, `bou`).

### Codi de la figura

| Fitxer | Què hi ha | Exemple |
| --- | --- | --- |
| `<clau>.js` | El model vòxel | `figures/bou/bou.js` |
| `<clau>-objects.js` | Construeix el model i la colla a la plaça | `figures/bou/bou-objects.js` |
| `<clau>-scene.js` | Els ganxos d'escena: mostrar, colla, moviment, pose de la foto | `figures/drac/drac-scene.js` |
| `<clau>-play.js` | El moviment a cada fotograma | `figures/mulassa/mula-play.js` |
| `<clau>-crowd.js` | El que fa al públic | el sutge del Drac, la conga del Bou, la culada de la Mulassa |
| `<clau>-dance.js`, `-feet.js`, `-rig.js` | El ball, els peus i l'esquelet | `figures/drac/` |
| `<clau>-colla.js`, `-suit.js` | La colla i la seva roba | `figures/bou/bou-colla.js` |
| `<clau>-portrait.js` | El retrat vectorial del selector | `figures/bou/bou-portrait.js` |

Cada figura nova s'afegeix amb una línia a cada registre, i res més a `src/scene/`:
- `src/figures/index.js`: la fitxa (`FIGURE_TRAITS`);
- `src/figures/objects.js`: els constructors i l'arrel;
- `src/scene/figure-scenes.js`: els ganxos d'escena;
- `src/scene/crowd-effects.js`: els efectes al públic.

`tests/figures/common/scenes.mjs` vigila que es compleixi.

### Imatges

| Peça | Per a què | On va |
| --- | --- | --- |
| Retrat vectorial | La targeta gran del selector | `src/figures/<carpeta>/<clau>-portrait.js`; l'SVG editable, a `.agents/skills/mulassacat-miniatures/assets/` |
| Retrat de píxels | HUD, ajuda, mode foto, ràdio, temporades | `src/game/figure-portraits.js` (una graella i la paleta). No cal mentre la figura és pendent, perquè encara no surt enlloc: es dibuixa quan la figura passa a ser disponible |
| Silueta | La figura mentre és pendent | dibuixada a mà a `src/ui/pending-silhouettes.js` (i `pending-silhouettes-more.js`, `pending-silhouettes-third.js`), des de les fotos de la mateixa figura; si no, se'n calcula una dels píxels |
| Icona de redoblament | La llegenda de "Com es juga" | `index.html` (`li.only-<clau>`) i `src/styles/base.css` |
| Imatge de compartir | La foto de la targeta de compartir | `cardFile` a la fitxa i el tema a `src/hud/share-card.js` |
| Icones del joc lliure | Les tecles Espai, Q, E i R | `src/ui/photo-icons.js` |

### Música i mapa de notes

| Peça | On va |
| --- | --- |
| Partitura, forma i arranjament | `music/<figura>/` (amb `SHA256SUMS` i l'aprovació) |
| MP3 que sona al joc | `public/music/` |
| Mapa de notes generat | `src/song-<clau>.json` (no s'edita a mà: el genera l'script de `tools/music/`) |
| Versió de puntuació | `src/game/score-scale.js` i les regles a `src/services/leaderboard-rules.js` |
| Classificació al servidor | una migració a `supabase/pending/` fins que s'aprovi |

## La plantilla de la figura

Copia aquesta llista a la PR i omple-la. Cada línia diu què cal decidir, l'exemple de les tres figures que ja hi són i on va.

### Identitat
- [ ] **Nom, nom complet, població i entitat.** Exemple: Bou / Bou Tradicional de Valls / Valls / UAF. Va a `src/game/figure-catalog.json` i `src/i18n/locales/*/figures.json`.
- [ ] **Clau curta i identificador.** `bou` i `bou-tradicional-valls`. Va a la fitxa (`key`).
- [ ] **Gènere de l'article.** "la Mulassa", "el Drac". Va a la fitxa (`article`).
- [ ] **Mida relativa** al selector. Va a `STAND` a `src/game/figures.js`.
- [ ] **Text de figura pendent**, mentre no es pot jugar. Cap clau per figura: surt de `figures.pending.default` (singular) o `figures.pending.plural`, segons el camp `plural: true` de `figure-catalog.json`.

### Paraules del joc
- [ ] **Paraules dels botons**: esquerre, dret i tots dos. Mulassa GUA | PA | GUAPA!, Drac CRE | MA | CREMA!, Bou BRA | MA | BRAMA!. Van a `figures.input.*`, `figures.hit.*` i `figures.practice.*.<clau>`.
- [ ] **Textos per figura (`figures.practice.*`, `figures.chatter.*`)**: una clau `.all` serveix a totes les figures; afegeix `.mulassa|.drac|.bou|<variant>` només si la nova figura ha de dir una altra cosa (el de la variant guanya).
- [ ] **Colors dels botons**: clar | fosc, distingibles per a qualsevol daltonisme i en gris. Van a `src/game/figure-theme.js`.
- [ ] **Càntic final**, en tres temps. Bou: "BOU!" / "QUE TOT…" / "HO MOU!". Va a `figures.chant.first|second|last.<clau>`.
- [ ] **Frases del públic.** "MIRA, EL BOU!", "QUINA FESTA!"… Van a `figures.chatter.*.<clau>`.
- [ ] **Quan perds**: títol i subtítol. "EL BOU S'HA AMANSIT!" / "Ara només vol pasturar". Van a `figures.results.collapse*` i `figures.collapse.*`.
- [ ] **Ajuda de l'energia.** "Cada error desanima la plaça: si es buida, el Bou s'amansa!". Va a `figures.help.energy.<clau>`.
- [ ] **Frases quan esclata.** "PAM!", "HA PETAT!", "VISCA!". Van a `figures.pop.*.<clau>`.

### Redoblament (l'element especial)
- [ ] **Quin element**: el globus de la Mulassa, les carretilles del Drac, l'esquellot del Bou. Va a la fitxa (`drumroll`); el dibuix, a `src/hud/balloon.js` (i `src/hud/esquellot.js` per a l'esquellot).
- [ ] **El seu nom i la seva ajuda** a "Com es juga". "ESQUELLOT: Pica molts cops: fes sonar l'esquellot fins al final!". Va a `html.legend.<element>Name|Text` i a `figures.practice.balloon.*.<clau>`.
- [ ] **La seva icona** a la llegenda. Va a `index.html` (`li.only-<clau>`).

### Festa, efectes i el toc surrealista
- [ ] **La festa pròpia**: el foc i el sutge del Drac, la discoteca techno i les carretilles del Bou, el confeti de la Mulassa. Va a `src/figures/<carpeta>/` (`-show.js`, `-fx.js`, `-correfoc.js`).
- [ ] **El toc surrealista**: el Bou que brama amb la llengua fora i acaba amb una pluja de bitllets, la Mulassa del loader que esquiva les caques de gos. Va al ball o a la festa de la figura.
- [ ] **Què fa al públic**: el sutge que deixa la gent negra, la conga, la culada. Va a `<clau>-crowd.js`.
- [ ] **Resposta al toc dels dos botons**: les flames del Drac (CREMA), el bram del Bou. Va al ganxo `onBoth` del seu `<clau>-scene.js`.
- [ ] **Pla final** (opcional): el Bou baixa la càmera als bitllets. Va al ganxo `endShot` (`figures/bou/bou-end-shot.js`).

### Model, ball i colla
- [ ] **Model vòxel** fidel a les fotos, amb els portadors o el que el porti. Skill `mulassacat-voxel`.
- [ ] **Ball** sobre la graella de la cançó, amb la capa còmica i els peus ben plantats. Skills `bestiari-reference-analysis` i `mulassacat-voxel`.
- [ ] **Escala i abast** a la plaça. `figureScale` i `figureReach` a `src/game/figure-song.js`.
- [ ] **Colla**: ajudants als punts cardinals, capatàs, membres asseguts i la seva roba. Skill `mulassacat-colla-festa`.

### Càmeres
- [ ] **Càmera de joc**: la de la Mulassa o la del Drac, que és més ampla. Va a la fitxa (`playCam`) i a `src/scene/play-camera.js`.
- [ ] **Showreel del selector**: els plans sobre les frases del ball. Va a `src/game/showreel.js`.

### Joc lliure (mode foto)
- [ ] **Què fa l'Espai**: saltar o envestir, en el cas del Bou. Va a la fitxa (`photoSpace`) i a `ui.photo.act.<clau>.space`.
- [ ] **Tecles Q, E i R** i el seu text curt: el Bou "alça el cap", "estira la cama" i "mitja volta". Van a `ui.photo.act.<clau>.q|e|r`, a les icones de `src/ui/photo-icons.js` i a l'acció del moviment, a `<clau>-play.js`.
- [ ] **Acció especial de la E**: les espurnes del Drac. Va a la fitxa (`photoE`).
- [ ] **"Mou el Bou" i "Ara mous el Bou"**: van a `ui.photo.move<Clau>` i `ui.photo.now<Clau>`, i a la barra de figures de `src/ui/photo-avatars.js`.
- [ ] **Espai que necessita**: el Drac en vol més. Va a la fitxa (`wideClearance`).
- [ ] **Estat del moviment manual**: va a `PHOTO.<cos>` a `src/game/photo-control.js`, i la fitxa diu quin cos fa servir (`photoBody`) i la sacsejada en aterrar d'un salt (`landing`).
- [ ] **Pantalla inicial**: si la figura balla a la pantalla d'inici al costat de la Mulassa. Va a la fitxa (`splashHost`, `splashPartner`).

### Compartir, repte i classificació
- [ ] **Frases de compartir** per a repte superat, rècord, superat i fallat, amb el seu emoji. Van a la fitxa (`shareLines`, `shareEmoji`) i a `services.share.<clau>.*`.
- [ ] **Repte** (`?repte=94-2-<clau>`). Va a la fitxa (`challenge`).
- [ ] **Targeta de compartir**: nom, subtítol i colors. Va a `src/hud/share-card.js` i a `hud.card.<clau>Sub` / `hud.card.alt<Clau>`.
- [ ] **Estadístiques**: nom curt. Va a `src/ui/stats-view.js`.
- [ ] **Ràdio del joc lliure**: la cançó i el color del punt. Van a `src/ui/free-music.js` i a `src/styles/feedback.css`.
- [ ] **Classificació**: la versió publicable i la migració. Van a `src/services/leaderboard-rules.js` i `supabase/pending/`.

### Textos en tots els idiomes
- [ ] Totes les claus de dalt, en els 16 idiomes de `src/i18n/locales/`. El català és l'original. Les notes de cada idioma són a `docs/i18n/notes/`.

## Com obrir la PR

1. **Branca pròpia** sortint de la versió en curs, per exemple `feat/<figura>`.
2. **Mentre no estigui aprovada, la figura és pendent.** Afegeix-la a `UNRELEASED_IDS` a `src/figures/index.js`: surt en silueta i no es pot jugar. Perquè la build de producció tampoc en publiqui la música ni les textures, afegeix-la a `tools/deploy/prepare-pages.mjs` com el Bou. Per provar-la, buida el conjunt només a la teva branca. Així és com la 1.2.0 porta el codi del Bou sense publicar-lo.
3. **Què ha de portar la PR**:
   - la plantilla de dalt, omplerta;
   - les fonts de la fase 0;
   - els fitxers de música amb el seu `SHA256SUMS`;
   - els tests nous a `tests/figures/<carpeta>/`.
4. **Validació**:
   - `npm run check` en verd, tant amb la figura pendent com jugable;
   - l'àudio de les altres figures, idèntic (`shasum public/music/*`);
   - captures reals a 375×667, 320×568 i escriptori (skill `mulassacat-validacio-visual`);
   - un enllaç `npm run dev` per provar-la al mòbil.
5. **Res no pot donar per fet que la figura és la Mulassa.** Textos, estadístiques, ajuda, HUD, efectes i paraules són de la figura que es juga.
