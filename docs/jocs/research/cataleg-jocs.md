# Catàleg d'idees

Noms provisionals. El cost és una estimació meva, sense prototip: **S** = un joc jugable amb poca feina i pocs actius nous, **M** = cal tuning o art nou, **L** = el contingut o la sensació de joc són el gros de la feina. "Referent" és el joc d'on surt la mecànica.

## La llista curta

| Joc | Referent | Per a qui | Cost | Per què |
| --- | --- | --- | --- | --- |
| Fes el castell | Stack, Tower Bloxx | Tothom, 2 jugadors | S | Valls és castells, i el duel Vella contra Joves ja existeix a la vida real |
| Endreça el Seguici | Sort puzzle | Tothom | S | És el subgènere que més creix, i l'ordre del Seguici és real |
| Pinta per números | Pixel art per números | 3-7 anys | S | Els retrats ja són graelles; números sense que semblin deures |
| Duel GUA-PA | Mode 2J de Taiko, Fruit Ninja | 2 jugadors | M | Reaprofita cançons, charts i judici del joc principal |

## Solitari i casual

**Fes el castell.** Toca quan el casteller passa pel centre per apilar-lo. El que sobresurt es perd, com a Stack. Si arribes a dalt, puja l'enxaneta i fa l'aleta. Els pisos segueixen estructures reals (3 de 6, 4 de 7, 3 de 8...) i els noms fan de progressió. Cost S.

**Endreça el Seguici.** Sort puzzle: cada columna és un carrer, i les figures barrejades s'han de deixar agrupades per carrer. Al final de cada nivell surt la cercavila en l'ordre real. Es poden generar nivells sempre resolubles fent la barreja a l'inrevés des de l'estat resolt. Cost S.

**Seguici Crush.** Match-3 de figures sobre la plaça. Tres en ratlla neteja, quatre dona una carretilla i cinc una tronada. Un toc propi: l'objectiu de cada nivell és completar el Seguici en ordre. Costa L perquè un match-3 sense cascades ben animades, peces especials ni 50 nivells afinats es nota de seguida. Per negoci està saturat (vegeu la recerca), tot i que l'objectiu aquí no són els ingressos. El faria després d'Endreça, que prova el mateix públic per molt menys.

**Del Nan al Gegant.** Com Suika: deixes caure figures, dues d'iguals es fusionen en la següent, de petita a gran (nan, cavallet, mulassa, bou, drac, àliga, gegant). L'escala és graciosa i es juga a qualsevol edat. Cal física de cercles i retrats arrodonits. Cost M.

**Plaça plena.** Block puzzle tipus Block Blast: col·loques peces a la plaça i les files plenes esclaten en coets. Infinit, sense nivells que dissenyar. La temàtica hi és només de vestit. Cost S.

**Talla calçots.** Fruit Ninja amb calçots, sense tallar els petards. El gest és immediat, Valls és terra de calçots i els dos a la mateixa pantalla és un mode conegut. Cost S.

**Travessa la cercavila.** Crossy Road amb voxels: creua carrers enmig de bèsties i foc. L'estètica voxel ja existeix al joc, però requereix món procedural i col·lisions. Cost L.

**Davant del Bou.** Runner: corres pel carrer amb el Bou al darrere, com Jetpack Joyride. Cost L, i el faria només si Travessa no surt.

## Dos jugadors, un sol mòbil

La pantalla es parteix i la meitat de dalt va girada 180°. Els jocs curts funcionen bé en paquet, com fa 2 Player Games: the Challenge. Una sola carcassa (marcador, millor de 3, revenja) i minijocs de 20 segons.

- **Duel GUA-PA.** Cada jugador té el seu pad i es juga la mateixa cançó. El judici és pur (`judge-core.js`), així que es pot compartir. Cost M, i s'ha de fer dins del joc principal o extreure'n part. Cal decidir-ho.
- **Castell Vella contra Joves.** Fes el castell a pantalla partida: qui en fa més net i més alt. Gairebé gratis si ja existeix el d'un jugador.
- **Estira la corda.** Qui toca més de pressa arrossega el contrari. Cost S.
- **Sumo de bèsties.** Mulassa contra Bou en una plaça rodona, empenyent fins a fer caure l'altre, com Spinner War. Cost S.
- **Hoquei de carretilla.** Air hockey amb una carretilla encesa. Cost S.
- **Pica de mans.** Red Hands: un ataca, l'altre aparta la mà. Cost S.
- **Tronada.** Reacció: qui toca primer en sentir el petard, i qui s'avança perd. Cost S.
- **Endevina la figura.** Heads Up!: el mòbil al front i els altres fan mímica. Molt barat, per a colles i famílies, però l'iPhone demana permís per als sensors de moviment. Es pot fer amb tocs si no. Cost S.

## Puzzles per als més petits

Sense perdre ni temps límit: si t'equivoques, la peça torna al lloc amb una animació simpàtica. Botons grans, sense text.

- **Pinta per números.** Tries un color i omples les caselles amb el seu número fins que apareix la figura, i llavors balla. Els retrats ja són graelles. Cost S.
- **Ombres.** Arrossega cada figura a la seva silueta. Reutilitza les siluetes del selector. Cost S.
- **Trencaclosques.** De 4 a 12 peces, amb imant, sobre retrats o escenes. Cost S.
- **Fes la teva bèstia.** Cap, cos i cua intercanviables per crear un monstre del Seguici, i després balla. Sense objectiu, a l'estil Toca Boca. Requereix art nou que encaixi. Cost M.
- **Vesteix el gegant.** Tria roba i corona. Mateix cost i mateixa lògica. Cost M.

## Lletres

Va en català i prou, de manera que no passa pel sistema de 16 idiomes del joc. La lletra de pal va primer, i cal tractar `ll`, `ny`, `ç` i `l·l`, que els jocs genèrics ignoren. Això ja el diferencia.

- **Lletres del Seguici.** Com Endless Alphabet: apareix MULASSA en blanc, arrossegues cada lletra i, en posar-la, sona. En acabar, la figura balla. El cost real és l'àudio: lletres i paraules gravades per una persona. Cost M.
- **Traça la lletra.** Resseguir amb el dit. Cal una traça per a cada lletra. Cost M.
- **Sopa de lletres i Penjat.** Per a 7 anys o més, amb vocabulari festiu (enxaneta, gralla, tabal, capgròs...). Cost S.

No faria un mot del dia: el Paraulògic ja cobreix aquest espai en català.

## Números i sumes

- **Compta el Seguici.** Passa una cercavila i has de dir quants nans has vist. Per a 3-5 anys. Cost S.
- **Suma de bèsties.** 2 mulasses + 3 dracs: les figures entren, es compten amb el dit i tries el resultat. Si encertes, ballen. Cada figura és una unitat visible, cosa que ajuda. Cost S.
- **Compta a cop de tabal.** La Mulassa fa N cops de tabal i has de marcar el número. Barreja oïda i nombres, i lliga amb el ritme. Cost S.
- **Mates de castell.** Per a 7-10 anys: 3 de 8 vol dir 3 per pis i 8 pisos, per tant multiplicació de veritat. Els pisos de dalt no segueixen la regla (dosos, acotxador, enxaneta), així que s'ha de simplificar i explicar-ho. Es pot afegir com a nivell de Fes el castell. Cost S.

## Preguntes

**Trivial del Seguici.** 10 preguntes per partida, amb quatre respostes i un temps de resposta. Categories: figures, música, castells, història i Decennals. Tres nivells: petits (imatges i siluetes, sense llegir gaire), família i experts. Duel al mateix mòbil: cada jugador té les seves respostes, girades, i qui encerta primer guanya el punt. El codi és S; el cost de veritat és el contingut, M o més, perquè cada pregunta ha de tenir la resposta contrastada amb una font. No he trobat cap trivial sobre el tema (`jocs-fisics.md`).

Formats que no depenen de llegir: quina figura és aquesta silueta, quina figura sona amb aquesta música, quin pis falta, qui va abans al Seguici.

## Noves idees (demanades per en Marc, 2026-11-01)

**Vila del Seguici** (referent: SubaraCity). Tauler de blocs: toques un grup de blocs del mateix color i es fusionen; els edificis connectats pugen de categoria. Traducció directa a Valls: de casa a masia, Pati, campanar. Partida curta sense reflexos. Encaixa amb el públic familiar. Cost S-M.

**Merge.** N'hi ha tres famílies, i cal triar-ne una:
- Caiguda amb física (Suika): és Del Nan al Gegant, ja al catàleg. Cost M.
- Taulell numèric (2048, Threes): de nan a gegant lliscant. Cost S.
- Merge amb encàrrecs (Merge Mansion, Travel Town, Merge Dragons): fusionar per reconstruir la Festa. Són els que fan els ingressos del gènere, però requereixen molt contingut i economia. Cost L, i no el faria.

**Alquímia del Seguici** (referent: Doodle God, Little Alchemy). Comences amb foc, terra, aigua i vent, i en combines dos per descobrir coses: foc + pólvora = carretilla, carretilla + bèstia = Drac, ceba + foc = calçot. Sense perdre, amb un llibre de descobertes. Es pot jugar a partir de 6 anys i ensenya vocabulari i festa. El codi és S; la feina és escriure unes 100-150 combinacions que tinguin gràcia, i les icones. Cost M.

**Corre i suma colla** (referent: Count Masters, Crowd Run, Join Clash). Corres per un carrer i passes per portes +5, x2, -10 que fan créixer la colla. Al final, la colla fa un castell tan alt com gent tinguis, o bé xoca amb la colla rival. Portes numèriques: serveix també per practicar sumes i multiplicacions. És el més fàcil de lligar amb Valls d'aquest gènere. Cost M, amb three.js i els voxels o en 2D amb perspectiva.

## Descartades

- Rol, gestió o ciutats tipus Stardew o Plague Inc.: no són minijocs.
- Multijugador en línia: el motiu d'aquesta tanda és justament offline i al mateix dispositiu.
- Escacs, dames i Dots and Boxes: la temàtica només hi fa de pell i ja n'hi ha de millors.
