# Alquímia: revisió amb Marc

Actualitzat el 2026-11-03. Aquest document conserva decisions i propostes;
no implica que els textos pendents estiguin aprovats o integrats.

## Acords i estat

- Català planer, públic infantil i gent gran, 1–2 frases i unes 15–30 paraules.
- Codex redacta el text final. Marc revisa tandes de 12 abans d'aplicar-les.
- Cada curiositat ha de tenir una font específica a `sources.js`, invisible al jugador.
- Recompte del 2026-11-03: 213 receptes, 178 elements amb nom, 97 curiositats
  amb font i 81 elements sense curiositat. Recalcular si hi ha canvis concurrents.
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
2. Completar les 81 curiositats que falten (sis tandes de 12 i una de 9).
   La tanda següent serà C25–C36; presentar-la abans d'aplicar-la.
3. Verificar i revisar les 73 curiositats preexistents, especialment dades locals.
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
