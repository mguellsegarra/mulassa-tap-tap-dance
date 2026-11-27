# El Tombairot · proposta Gemini Neon

Proposta independent del model voxel d'El Tombairot (bestiari escolar de l'Escola Mare de Déu de la Candela, Valls), feta seguint l'estil de la Mulassa, el Drac i el Bou (passes voxel netes, paleta consolidada, geometries fusionades amb `Vox`/`MAT` i juntes segellades amb ròtules).

## Decisions de disseny i què el fa simpàtic

- **Cara expressiva i llegible des de lluny:** el morro de peluix verd s'eixampla a la punta i baixa lleugerament al pont del nas perquè els dos ulls grossos, amb anella groga i pupil·les negres rodolants (en la línia del cap "Bonàs" del Bou), quedin completament descoberts de cara i de tres quarts. Les celles vermelles arquejades amb un petit espai al mig, els dos ullals blancs exteriors i la llengua bífida vermella penjant li donen un somriure amable i còmic.
- **Tres verds separats com a les fotos:** verd herba càlid per al cap i les orelles caigudes (amb cara interior pruna fosca), verd bosc fosc per al serrell de fulles que emmarca el pit i l'espiell, i una closca en verd maragda i verd marí més fred amb 6 fileres imbricades d'escates de feltre.
- **Con groc en forma de campana i faldilla plisada:** en lloc d'un con recte, el perfil del pit és convex a la panxa i s'estreny suaument fins al llaç vermell (`cos^1.15`), construït amb 16 anelles grogues esglaonades de 3 talls no solapats al cos i 8 al coll corbat. La faldilla de setí daurat té 28 plecs distribuïts per longitud d'arc sobre un oval esglaonat perquè llueixi uniforme de davant, costat i darrere.
- **Animació determinista suau (`poseTombairotNeon`):** gronxat festiu i bot suau llegits directament del temps en segons (sense estat ni assignacions per fotograma). El coll fa un petit retard elàstic darrere del cos, les orelles reboten desfasades, les pupil·les passegen suaument dins del blanc i el portador interior fa passos curts amb cames recalculades maluc-turmell.

## Observat vs. adaptat al voxel

| Element | Observat a les referències (2018-2025) | Adaptació al model Neon |
| --- | --- | --- |
| Alçada i proporcions | ~2 alçades adultes (`fidelity.md`), faldilla ~23 % inferior, llaç al ~66 %, amplada base ~0,35 H | Escala de joc **3,05 m** fins a la cresta (en línia amb Drac 2,95 m i Mulassa ~3,2 m); faldilla 0,055–0,68 m (~22 %), llaç a 1,87 m (~61–65 % del cos), amplada 1,27 m |
| Anelles grogues | ~21–23 anelles sota el llaç i ~9–11 al coll (pas ~0,02 H) | Consolidat a **16 anelles al cos + 8 al coll** (~7,6 cm i ~6,6 cm de pas) perquè llegeixin netes a distància de joc sense soroll subpíxel |
| Espiell frontal | Finestra fosca centrada a ~0,31 H emmarcada per serrell verd | Obertura realment enfonsada tallant les anelles 2–4, fons fosc retirat i marc irregular de fulles verdes |
| Closca i pompons | Closca llarga gairebé horitzontal, escates verdes en dos tons, 4 bonys vermells al llom (photo5) i cresta al clatell (photo4/5) | Nucli sòlid esglaonat amb 6 fileres d'escates calculades sobre la superfície real (`neonShellWidthAt`), 4 pompons vermells arrodonits al llom i 3 crestes al darrere del coll |
| Edició | photo1, photo2 i photo4 sense margarides; photo3 i photo5 amb margarides i medalló | Model basat en la versió base del vídeo de 2019 (sense margarides ni medalló) |
| Portador i fons | Un portador a dins; la faldilla gairebé toca a terra | Un portador centrat amb sabates a `y = 0` i cames dinàmiques; fons fosc tancat dins la faldilla perquè els plans baixos no deixin veure cel ni buit |

## Mesures tècniques i estat

- **Cost mòbil:** 13 malles (13 draw calls), 6.876 triangles (573 caixes fusionades amb `Vox`, `jitter = 0` determinista, zero assignacions dins `poseTombairotNeon`).
- **Sonda geomètrica (t = 0..8 s, pas 0,1 s):**
  - Peces flotants: **0**
  - Cares coplanàries exposades de colors diferents: **0**
  - Obertura màxima de totes les juntes en moviment (`neck`, `head`, `jaw`, `tongue`, `ears`, `pupils`): **0,000 m**
  - Mínim de faldilla sobre el terra: **0,030 m**; sabates: **0,000 m**

## Defectes coneguts i límits

- **Part posterior exacta (vista de darrere):** cap foto de referència mostra el darrere frontalment a 180°. La cloenda posterior de la closca d'escates i la caiguda contínua de la faldilla daurada són inferències coherents amb photo1, photo4 i photo5.
- **Visibilitat del portador:** com que la faldilla arriba gairebé fins a terra (com a la figura real), les sabates del portador només es deixen intuir de reüll en plans molt baixos o quan el cos bota; si al ball del joc es volen marcar més les passes, només cal apujar `TOMBAIROT_NEON_DIM.skirtBot` uns 3–4 cm.
- **Tests:** no s'han creat tests a `tests/` ni s'ha executat `npm run check`, seguint el procés de validació visual prèvia.
