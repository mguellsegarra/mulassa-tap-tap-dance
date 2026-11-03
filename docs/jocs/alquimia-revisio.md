# Alquímia: revisió amb Marc

Actualitzat el 2026-11-03. Aquest document conserva decisions i propostes;
no implica que els textos pendents estiguin aprovats o integrats.

## Acords i estat

- Català planer, públic infantil i gent gran, 1–2 frases i unes 15–30 paraules.
- Codex redacta el text final. Marc revisa tandes de 12 abans d'aplicar-les.
- Cada curiositat ha de tenir una font específica a `sources.js`, invisible al jugador.
- Recompte del 2026-11-03: 213 receptes, 178 elements amb nom, 109 curiositats
  amb font i 69 elements sense curiositat. Recalcular si hi ha canvis concurrents.
- C01–C12 aprovades i aplicades: foc, terra, aigua, vent, vapor, fang, pols,
  núvol, pedra, mar, ventada i muntanya.
- R1 aprovada: brasa + aigua → vapor. R3 i R4 aprovades: prioritzar
  ceba + terra → calçot i calçot + foc → calçotada.
- R2 rebutjada: conservar perles + persona → alcaldessa, associació local volguda.
- Llibre: proposta D integrada; targetes de recepta amb radi de 8 px i amplada
  ajustada al contingut. Marc ha aprovat visualment l'últim retoc.
- Marc ha demanat explícitament NO executar tests encara. L'OK visual no revoca
  aquesta pausa. No fer commits ni contactar altres fils.
- Hi ha canvis concurrents al worktree: no revertir-los ni atribuir-se'ls.

## Pendent

1. C13–C24 aprovades explícitament per Marc i aplicades a `copy.js` i `sources.js`.
2. Prioritat actual de Marc: revisar les 73 curiositats preexistents, començant
   per les pròpies de Valls, en tandes de 12 abans d'aplicar canvis.
   V01–V12 aprovades per Marc («estan be») i aplicades.
   Les 61 altres preexistents estan revisades a la proposta HTML completa, pendent d’aprovació.
3. Les 69 curiositats que falten ja tenen proposta amb font a l’HTML complet.
   Encara no s’han integrat. C25–C36 aprovades i aplicades.
4. Acabar la revisió semàntica de TOTES les receptes: associacions arbitràries,
   coherència cultural, cadenes llargues i descobertes finals. Presentar correccions
   prioritzades; Marc decideix abans de modificar receptes. Incorporar les dues
   receptes afegides des del recompte inicial de 211.
5. Quan s'integrin textos, comprovar-los al descobriment i al llibre a 320 px.
6. Quan Marc aixequi la pausa: `node tests/run.mjs alquimia` i `npm run check`.
   Els checks d'una versió anterior no validen els últims retocs.

## C13–C24: aprovades i aplicades

Fonts consultades el 2026-11-03. Els textos següents són els textos aprovats
per al jugador; els codis i les fonts no es mostraran al joc.

| Codi | Element | Text proposat | Font |
| --- | --- | --- | --- |
| C13 | pluja | Les gotes petites de pluja són gairebé rodones. Les més grosses s'aplanen per sota mentre cauen. | https://www.usgs.gov/water-science-school/science/are-raindrops-shaped-teardrops |
| C14 | planta | Les plantes fan servir la llum del sol per fabricar sucres a partir d'aigua i diòxid de carboni de l'aire. | https://endeavour.kew.org/sites/endeavour/files/documents/2022-06/Kew-KS3-Time-to-grow-Photosynthesis-infographic.pdf |
| C15 | arbre | En molts arbres, cada anell del tronc correspon a un any de creixement. Els anells també donen pistes sobre el clima del passat. | https://www.nist.gov/how-do-you-measure-it/how-do-you-measure-age-tree |
| C16 | canya | La gralla sona gràcies a dues làmines fines de canya que vibren quan hi bufes. Aquesta peça s'anomena inxa. | https://www.enciclopedia.cat/tradicionari/els-instruments |
| C17 | fusta | De la fusta se'n poden separar fibres per fabricar paper. Aquestes fibres contenen cel·lulosa, un material que forma part de les plantes. | https://extension.okstate.edu/fact-sheets/basics-of-paper-manufacturing |
| C18 | carbo | El carbó vegetal s'obté escalfant fusta amb molt poc aire. Així la fusta es transforma sense cremar-se del tot fins a fer-se cendra. | https://www.fao.org/4/X5328e/x5328e02.htm |
| C19 | brasa | Les brases poden continuar molt calentes encara que ja no hi hagi flames. Cobrir-les de terra pot conservar-ne l'escalfor. | https://www.nps.gov/articles/campfires.htm |
| C20 | vida | Tots els éssers vius estan formats per cèl·lules. N'hi ha que només en tenen una, i d'altres que en tenen moltíssimes. | https://science.nasa.gov/astrobiology/learning-resources/alp/characteristics-of-life/ |
| C21 | peix | Els peixos també necessiten oxigen. Les brànquies els permeten agafar el que hi ha dissolt a l'aigua. | https://www.fisheries.noaa.gov/national/outreach-and-education/fun-facts-about-fascinating-fish |
| C22 | animal | Els insectes són animals i formen més de la meitat de les espècies animals conegudes. Encara en queden moltes per descobrir. | https://australian.museum/learn/animals/insects/ |
| C23 | ocell | Les plomes retenen aire i ajuden els ocells a conservar l'escalfor del cos. També els serveixen per a moltes altres coses, com volar. | https://animals.sandiegozoo.org/animals/birds |
| C24 | ceba | Quan talles una ceba, s'allibera una substància que arriba als ulls i els irrita. Per això et surten llàgrimes. | https://food.unl.edu/article/cooking-onions-without-crying/ |

## C25–C36: aprovades i aplicades

Fonts consultades el 2026-11-03. Els 12 textos han estat aprovats i integrats.
Per a `mullat`, es proposa un consell pràctic: no s'ha trobat una font
lexicogràfica prou clara per a l'expressió que s'havia considerat inicialment.

| Codi | Element | Text proposat | Font |
| --- | --- | --- | --- |
| C25 | casa | Hi ha cases fetes amb maons de terra, aigua i palla assecats al sol. Aquesta manera de construir té milers d'anys. | https://home.nps.gov/tuma/learn/historyculture/adobe-bricks.htm |
| C26 | persona | Totes les persones que viuen avui pertanyen a la mateixa espècie, Homo sapiens, sigui quin sigui el seu lloc de naixement. | https://humanorigins.si.edu/evidence/genetics/one-species-living-worldwide |
| C27 | colla | Les colles castelleres es poden reconèixer pel color de la camisa. La faixa ajuda a protegir l'esquena i a enfilar-se. | https://ich.unesco.org/en/RL/human-towers-castells-00364 |
| C28 | coto | Les fibres de cotó creixen al voltant de les llavors del cotoner. A la natura, ajuden les llavors a escampar-se amb el vent. | https://www.kew.org/plants/cotton |
| C29 | roba | Molts teixits es fan entrecreuant dos grups de fils: l'ordit i la trama. És la feina que fa un teler. | https://www.vam.ac.uk/articles/a-z-opus-anglicanum |
| C30 | musica | El toc de castells explica amb música com avança la construcció. Així, qui no pot mirar amunt també sap en quin moment es troba. | https://castellscat.cat/es/descargar/activitats/130 |
| C31 | ball | Alguns balls de festa també expliquen històries amb paraules. A Valls, els Diables representen el seu ball parlat per Santa Úrsula. | https://uaf.cat/seguici-ceremonial/ball-de-diables/ |
| C32 | polvora | La pólvora es va descobrir a la Xina. Els alquimistes que la van descobrir buscaven un elixir per allargar la vida. | https://airandspace.si.edu/stories/editorial/first-fireworks-origins-rocket |
| C33 | tronada | A Valls, la Tronada inaugural de Sant Joan es fa al Pati. Després, les colles tornen a la plaça del Blat i alcen pilars. | https://www.valls.cat/festa-major-sant-joan |
| C34 | mullat | Un petard que no ha esclatat encara pot ser perillós. No l'agafis ni intentis tornar-lo a encendre. | https://www.cpsc.gov/Newsroom/News-Releases/2024/CPSC-Urges-Caution-while-Celebrating-as-Fireworks-Related-Injuries-Trend-Upward |
| C35 | bestia | El bestiari festiu inclou figures d'animals reals i imaginaris. Formen part de la festa i poden tenir funcions de joc o de cerimònia. | https://www.enciclopedia.cat/gran-enciclopedia-catalana/bestiari-festiu |
| C36 | cavall | Els cavalls poden dormir drets, però també necessiten estirar-se. Algunes fases del son només les poden fer ajaguts. | https://pmc.ncbi.nlm.nih.gov/articles/PMC8614510/ |

## V01–V12: revisió de preexistents de Valls, aprovades i aplicades

Fonts específiques de la UAF consultades el 2026-11-03. Marc ha aprovat aquests
textos («estan be»); ja són a copy.js i sources.js. V indica revisió, no noves curiositats.
Matisos principals: especificar gegants municipals; no presentar la Primera
com a exclusiva sense matisos (la font cita Bràfim); donar exemples dels Nans
sense afirmar que tots representen oficis. La dada del colom de l'Àliga figura
a la font, però es proposa el ball de Completes com a curiositat alternativa.
Substituir les fonts genèriques de Lleó, Gitanes i Primera per aquestes fitxes.

| Codi | Element | Text proposat | Font |
| --- | --- | --- | --- |
| V01 | mulassa | Per fer ballar la Mulassa de Valls calen quatre persones: dues al davant i dues al darrere. | https://uaf.cat/seguici-ceremonial/mulassa/ |
| V02 | drac | El Drac de Valls té dos caps i disset punts de foc, repartits entre les boques, les ales i la cua. | https://uaf.cat/seguici-ceremonial/drac/ |
| V03 | aliga | La nit de Completes, l'Àliga de Valls balla dins de l'església de Sant Joan, davant la relíquia del patró. | https://uaf.cat/seguici-ceremonial/aliga-de-la-ciutat/ |
| V04 | bou | El Bou Tradicional de Valls es va recuperar el 2012. Participa en el seguici i porta foc als correfocs. | https://uaf.cat/seguici-ceremonial/bou-tradicional/ |
| V05 | cavallets | Al Ball de Cavallets de Valls hi participen deu balladors, dividits en dos bàndols. Amb la dansa representen un enfrontament. | https://uaf.cat/seguici-ceremonial/ball-de-cavallets/ |
| V06 | gegants | Els quatre gegants municipals de Valls són el Gegant de la Porra, la Geganta, el Lladrefaves i la Gegantona. | https://uaf.cat/seguici-ceremonial/gegants-de-la-ciutat/ |
| V07 | nans | Els Nans de Valls es coneixen pels personatges que representen. Entre ells hi ha l'Alcalde, el Sabater i l'Arlequí. | https://uaf.cat/seguici-ceremonial/nans-de-la-ciutat/ |
| V08 | os | El primer dia de la Festa Major de Sant Joan, els xiquets de Valls poden donar els seus xumets a l'Ós. | https://uaf.cat/seguici-ceremonial/os-i-trabucaires/ |
| V09 | aligons | Els aligons són tres infants que acompanyen l'Àliga de Valls i ballen al seu voltant. Es van recuperar el 1991. | https://uaf.cat/seguici-ceremonial/aliga-de-la-ciutat/ |
| V10 | lleo | El Lleó de Valls es va estrenar per les Decennals del 2011. És de llautó i el porten dues persones. | https://uaf.cat/seguici-ceremonial/lleo/ |
| V11 | gitanes | Al Ball de Gitanes de Valls, les balladores trenen cintes al voltant d'un pal. Les cintes tenen els colors de la bandera de Valls. | https://uaf.cat/seguici-ceremonial/ball-de-gitanes/ |
| V12 | primera | El Ball de la Primera de Valls és una dansa per a xiquets. A les cercaviles hi participen dotze balladors, acompanyats de gralles i timbal. | https://uaf.cat/seguici-ceremonial/ball-de-la-primera/ |


## Revisió completa de curiositats · 2026-11-03

Marc demana revisar-ho tot en un HTML, incloent els 69 elements sense curiositat.
La proposta completa és a [l’HTML de revisió](../../tools/dev/alchemy-copy-review/index.html),
servit a http://192.168.1.232:5181/tools/dev/alchemy-copy-review/index.html.

- 178 elements: 69 textos nous, 61 textos preexistents revisats, 48 aprovats conservats.
- 63 entrades amb contingut de Valls primer; després castells, cultura, aliments, materials i natura.
- Codis estables E001–E178, identificador del joc, text actual i proposat, fonts i criteri editorial.
- Filtres, tandes de 12, anotacions per entrada, edició del text i exportació de text/JSON.
- Les 130 propostes pendents tenen entre 15 i 30 paraules. No s’han aplicat al joc.
- Fonts consultades en aquesta sessió: institucions locals, UAF, museus, universitats, organismes científics i obres de referència. Les fonts del jugador continuaran ocultes al joc.
- Correccions destacades: tradició de la troballa del Lledó; convocatòria de les Decennals i ajornament del 2021; carretilles; diferència entre els dos bous; exclusivitat no demostrada del caramel; fonts genèriques substituïdes.

Fitxers de treball: `current.json` conserva la fotografia del contingut actual;
`drafts.tsv` conté les 130 propostes; `proposals.json` reuneix les 178 fitxes.
`build.py` genera l’HTML autònom a partir de les dades, `template.html`, `review.css`
i `review.js`. No escriu cap fitxer del joc.

Comprovacions de l’artefacte: captures amb html_preview a 320, 375 i 1280 px;
sense desbordament horitzontal; filtres 69/61/48, cerca sense accents, anotació
i exportació completa de 178 entrades comprovades. Targetes amb marge interior
16 px als quatre costats, separació interna 16 px i separació entre targetes 16 px.
Una columna al mòbil, dues en escriptori. No valida encara aquests textos dins
del descobriment i el llibre del joc. No s’han executat tests ni npm run check.

Pendents: Marc revisa/exporta decisions; integrar només els textos aprovats amb
les fonts corresponents i marcadors i18n; comprovació visual dins del joc; acabar
la revisió semàntica de receptes; reprendre els tests només quan Marc ho demani.


## Aprovació i integració completa · 2026-11-03

Marc: «revisades, tots estan be». Queden aprovades les 130 propostes de l’HTML.
S’han integrat amb canvis puntuals a `copy.js` i `sources.js`, preservant els
48 textos anteriors, tots els noms, els marcadors i18n i els canvis aliens.
Les fonts addicionals de bengala, cèl·lula, llibre i vi consten en comentaris
a sources.js per mantenir el contracte existent d’una URL principal per element.

Estat actual: **178 noms, 178 curiositats, 178 fonts principals; cap element
sense curiositat**. Comparació amb les 178 propostes: cap diferència de text
ni de font principal. Les seccions anteriors són l’historial de la revisió.

Comprovació visual integrada: llibre amb 178 entrades a 320×568, 375×667 i
1280×800, sense desbordaments horitzontals; descobriment de Riu a 375×667 i
de Mare de Déu del Lledó a 320×568, amb curiositat i botó visibles sencers.
S’ha usat un perfil de navegador incògnit separat i s’ha tancat la pestanya.
Els tests continuen aturats per petició explícita de Marc. Cap commit.

Pendents reals: revisió semàntica de les 213 receptes (sense canvis sense OK);
OK visual dels textos integrats; quan Marc aixequi la pausa, tests d’Alquímia
i npm run check. Les curiositats ja no estan pendents d’aprovació ni d’integració.

## Permanent recipe and art review tool

The original illustrated review tool is now maintained at
[`tools/dev/alchemy-recipes-review/`](../../tools/dev/alchemy-recipes-review/README.md).
It imports current game data and replaces the temporary text-only inventory.
Recipe and art annotations are separate; saving annotations never edits recipes.
The semantic review of all recipes remains pending. Game tests remain paused by
the owner. Commit and push have not been authorized for this tool.

## Revisió semàntica completa de receptes · 2026-11-03

Les 213 combinacions tenen una observació i proposta individual a
[`assessment.json`](../../tools/dev/alchemy-recipes-review/assessment.json),
visibles a l'[eina de receptes i art](http://192.168.1.232:5181/tools/dev/alchemy-recipes-review/index.html).
Són valoracions de Codex; no marquen cap decisió de Marc com a aprovada.

- 158 conservables (algunes amb una proposta de priorització o pista),
  45 associacions a valorar i 10 correccions prioritàries.
- Cap parella repetida o amb dos resultats; 178 elements accessibles.
- 178 noms, curiositats i fonts: la mancança inicial de noms ja no existeix.
- Tots els elements generals són accessibles sense resultats exclusius de Valls.
- 78 descobertes finals. No són errors per si mateixes: moltes són la recompensa
  cultural d'una branca. La cadena Decennals (11), Candela (12), Lledó (13) és la
  més profunda. Nivell 13 significa dependències, no només 13 barreges.

Correccions prioritàries per decidir:

| Codi | Problema | Proposta, encara no aplicada |
| --- | --- | --- |
| R024 | Casa + foc dona Persona | Retirar-la; conservar Fang + Vida. |
| R052 | Fusta encesa no dona una espelma | Abella + Foc, com a llicència de cera d'abella. |
| R135 | Ou + Foc no identifica crema catalana | Ou + Sucre, assumint que encara omet la llet. |
| R137 | Escalivada + Peix confon el xató | Acordar un nou element escarola o amanida; no canviar per salsa de calçots. |
| R155 | Confusió de canya de riera i canya de sucre | Acordar canya de sucre o remolatxa amb art propi. |
| R159 | Raïm + Aigua no explica el vi | Raïm + Cèl·lula, amb pista que representa el llevat. |
| R167 | Lledó: pedra i cadena massa profunda | Arbre + Església, pel santuari i la tradició del lledoner. |
| R170 | El Bou Tradicional festiu no es transforma en pell | Retirar-la; conservar Animal + Roba. |
| R196 | Calçots amb brasa en lloc de flama | Retirar-la; conservar Foc i la via Calçot + Calçot. |
| R205 | Brasa + Pols no produeix pólvora | Retirar-la; conservar R036 només com a llicència. |

Simulació en memòria de les vuit propostes que no afegeixen elements (exclou
R137 i R155): 209 receptes, 178 elements accessibles i cap parella duplicada.
És una comprovació de l'inventari hipotètic, no proves del joc ni aprovació dels canvis.
R1, R3, R4 i Perles + Persona → Alcaldessa es conserven tal com Marc va decidir.

El worktree s'ha mogut a release-1.8.0 durant aquesta revisió. El servidor
del port 5181 ja respon amb el backend de notes carregat; aquest fil no l'ha
reiniciat. Pendents: decisions de Marc, validació de les correccions que aprovi
i tests només quan aixequi la pausa. No s'ha modificat recipes.js.

Comprovació visual de l'eina: 213 observacions carregades; filtres 10/45/158/213;
camps de decisió actius i notes carregades del backend. Captures a 320×568,
375×667 i 1280×800, sense desbordament horitzontal ni imatges trencades.
Targetes: 16 px de marge interior i de separació entre blocs; observacions
amb separació interna de 12 px. No s'han enviat anotacions fictícies al servidor
ni s'han executat tests. Pestanya de revisió tancada després de les captures.

## Correccions de receptes aplicades · 2026-11-03

Marc aprova les 10 correccions prioritàries de Codex i després valida de nou les
receptes resultants. Retirades: casa + foc → persona (queda fang + vida), bou +
aigua → pell, calçot + brasa → calçotada i brasa + pols → pólvora. Noves: abella
+ foc → espelma, ou + sucre → crema, planta + ceba → escarola, escarola + peix →
xató, canya + sol → canya de sucre, canya de sucre + foc → sucre, raïm + cèl·lula
→ vi i arbre + església → Lledó. Escarola i canya de sucre són elements nous, amb
art d'imagegen i text de Codex. Ara són 211 receptes i 180 elements, sense
parelles repetides ni elements inaccessibles; la cadena més llarga fa 12 nivells.
`npm run check` en verd (137/137).
