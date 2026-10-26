# Catàleg de figures

Les dades editables són a `src/game/figure-catalog.json`. `figures.js` només activa les dues cançons integrades: Mulassa i Drac de Valls. Les altres fitxes mostren informació dins el selector, sense modal.

Selecció editorial, sense un rànquing objectiu de popularitat ni de seguidors. Les entitats indiquen qui gestiona o porta les figures; no impliquen necessàriament propietat jurídica, i quan la font distingeix propietari i gestor (Valls, Mataró, Vinaròs, Vilanova) el catàleg ho conserva als camps `owner` i `manager`. Les rèpliques petites i alguns conjunts comparteixen fitxa; les parelles (Much i Muca, Tio Gori i Tia Caballera, Mustafà i Elisenda, Lo Mangüel i la Pilara, els Gegants d'Olot) són una sola targeta amb dos subjectes.

Estat actual: 41 entrades de catàleg, 35 visibles al selector i 23 poblacions; només Mulassa i Drac són jugables. Les poblacions es guarden amb tres camps separats: `comarca`, `island` (només Mallorca, per ara) i `territory` (Catalunya, Illes Balears, País Valencià, Catalunya Nord, Franja). El panell pendent mostra una línia discreta "Població · Comarca" (a Catalunya) o "Població · Illa/Territori" (Sineu: Mallorca; Vinaròs i Castelló: País Valencià; Baó: Catalunya Nord; Fraga: Franja).

Les figures pendents només porten la silueta dibuixada a mà (`pending-silhouettes.js` i `pending-silhouettes-more.js`), traçada de les fotos de la mateixa figura. El retrat de píxels no cal fins que la figura sigui disponible, perquè no surt enlloc; els dos retrats originals de la Mulassa i el Drac en SVG es conserven. Les fotografies són referències d'estudi locals i no s'inclouen al joc; la recerca documenta fonts i no concedeix permisos d'imatge ni de música.

Solsona distingeix les figures del Corpus i la Festa Major de les del Carnaval. Al selector només es veuen el Drac i els Gegants Bojos (selecció editorial, `selectorVisible: false` a les altres quatre: Gegants, Mulassa i Antonio Ricu, Àliga i Aligons, i la Draca, que és una figura real amb ball propi). Les fitxes ocultes conserven fonts, identificadors, traduccions i recursos. El Bou de Solsona no hi és: no té ball propi.

Valls té 10 entrades, 8 de visibles. La majoria són de la Unió Anelles de la Flama (UAF). L'Àliga, els Gegants i els Nans són propietat de l'Ajuntament de Valls i els gestiona la UAF; el Basilisc és de l'Agrupació Cultural La Pessigolla. L'Àliga de Valls representa la figura grisa i platejada de 1991, d'Anton Gurí.

## Ordre, colors i escuts

L'ordre és Valls primer i la resta de poblacions per ordre alfabètic català (`localeCompare` `ca`), tant a les pestanyes com als grups del carrusel; dins de cada població es conserva l'ordre del catàleg i les jugables van davant del plegat. El botó "Pròximament" mostra com a molt tres escuts i "+N" amb les poblacions que no hi caben.

Cada població té un accent editorial (`--town`, `select-cards.css`) per a l'estendard, la targeta i l'avatar de foto. No són colors oficials municipals ni la camisa d'una colla. Es repassen perquè dues poblacions veïnes no es confonguin: la distància OKLab entre accents queda per sobre de ~0,06 (Valls es manté vermell i cap altra població n'hi comparteix). Alguns van néixer d'una referència de l'àrea (Marrecs de Salt per a Girona, la Fil·loxera groga a Sant Sadurní, el faldó de l'Haca a Castelló, les faldetes de la Pilara a Fraga), però el criteri és la distinció visual, no la procedència; el motiu original de cada color és al dossier de recerca (`towns[].colorReason`).

Els escuts (`src/ui/escuts.js`) són versions simplificades dels de Wikimedia Commons, que conserven les seves llicències. Molins de Rei porta la versió oficialitzada el 2025, amb la mola blanca i la nadilla negra.

## Segona tanda

Onze fitxes noves, totes "Aviat", amb les variants exactes que van quedar triades (no es barregen amb les petites):

| Figura | Població | Entitat | Variant | Font |
|---|---|---|---|---|
| Beatusaure de Girona | Girona | Fal·lera Gironina | set caps, 2004 | [Font](https://fal-leragironina.cat/cat/cercavila/bestiari/beatusaurus/gal.html) |
| Camell de Molins de Rei | Molins de Rei | Amics del Camell | Camell gran, recuperat el 1981 (no el Petit Camell) | [Font](https://www.bestiari.cat/figura/el-camell/) |
| Fil·loxera de Sant Sadurní d'Anoia | Sant Sadurní d'Anoia | Associació Festa de la Fil·loxera | Fil·loxera gran de 1990, groga i alada | [Font](https://www.bestiari.cat/figura/fil%C2%B7loxera/) |
| Momerota de Mataró | Mataró | Colla de la Momerota | Momerota grossa (no la Momeroteta ni la Família Robafaves) | [Font](https://www.lessantes.cat/la-momerota-i-la-momeroteta) |
| Cucafera gran de Tortosa | Tortosa | Ajuntament de Tortosa | Cucafera gran de 2017 (no les altres dues) | [Font](https://tortosacultura.cat/cucaferes-tortosa/) |
| Gegants del Pi de Barcelona | Barcelona | Associació Amics dels Gegants del Pi | Mustafà i Elisenda, còpies de 1986/1987 | [Font](https://www.lacasadelsentremesos.cat/gegants-del-pi) |
| Much i Muca de Sineu | Sineu | Muchal Foundation | Much i Muca, personatges emmascarats (sense ball propi) | [Font](https://www.instagram.com/muchdereig/) |
| Tio Gori i Tia Caballera de Vinaròs | Vinaròs | Associació Cultural Colla de Nanos i Gegants de Vinaròs | Tio Gori i Tia Caballera, parella de 2000 reformada el 2008 | [Font](https://www.nanosigegants.com/els-nanos-i-gegants/) |
| Haca Traca Almalafa de Castelló | Castelló de la Plana | Botafocs Ball de Diables de Castelló | Haca Traca Almalafa de Botafocs (2009) | [Font](https://www.bestiari.cat/figura/haca-traca-almalafa/) |
| Hamlet de Baó | Baó | Aire Nou de Bao | Hamlet, el drac verd (no el Berrugues) | [Font](https://www.bestiari.cat/figura/hamlet/) |
| Lo Mangüel i la Pilara de Fraga | Fraga | Gigants de Fraga | Lo Mangüel i la Pilara, parella de 1998 | [Font](https://www.fraga.org/contexto/area-tematica/fiestas/gigants-de-fraga/) |

La cobertura territorial investigada i no afegida encara (Andorra, Menorca i Eivissa) queda documentada al dossier de recerca per a una ampliació posterior; per a l'Alguer i Formentera no hi ha una figura local prou confirmada. Les dues correccions de provisionals: el Drac Baluk Astharot usa la rèplica de 2014 de Jordi Grau (font [bestiari.cat](https://www.bestiari.cat/figura/drac-baluk-astharot-2/)), i el Drac de Montblanc és el drac verd gros, no el Drac Petit ni l'articulat de la Setmana Medieval.

| Figura | Població | Entitat | Font |
|---|---|---|---|
| Mulassa de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/mulassa/) |
| Drac de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/drac/) |
| Àliga de la Ciutat de Valls | Valls | Ajuntament de Valls (propietat) / UAF (gestió) | [Font](https://uaf.cat/seguici-ceremonial/aliga-de-la-ciutat/) |
| Bou Tradicional de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/bou-tradicional/) |
| Ós i Trabucaires de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/os-i-trabucaires/) |
| Nans de la Ciutat de Valls | Valls | Ajuntament de Valls (propietat) / UAF (gestió) | [Font](https://uaf.cat/seguici-ceremonial/nans-de-la-ciutat/) |
| Gegants i Gegantons de la Ciutat de Valls | Valls | Ajuntament de Valls (propietat) / UAF (gestió) | [Font](https://uaf.cat/seguici-ceremonial/gegants-de-la-ciutat/) |
| Ball de Cavallets de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/ball-de-cavallets/) |
| Ball de Diables de Valls | Valls | Unió Anelles de la Flama | [Font](https://uaf.cat/seguici-ceremonial/ball-de-diables/) |
| Basilisc de Valls | Valls | Agrupació Cultural La Pessigolla | [Font](https://uaf.cat/) |
| Àliga de Tarragona | Tarragona | Ball de Diables de Tarragona | [Font](https://www.tarragona.cat/cultura/festes-i-cultura-popular/santa-tecla/descobreix-la-festa/seguici-popular/aliga) |
| Cucafera de Tarragona | Tarragona | Associació Cucafera de Tarragona | [Font](https://www.tarragona.cat/cultura/festes-i-cultura-popular/santa-tecla/descobreix-la-festa/seguici-popular/cucafera) |
| Mulassa de Reus | Reus | Colla Gegantera de Reus | [Font](https://webs.gegants.cat/reus/la-mulassa/) |
| Gegants de Solsona | Solsona | Agrupació de Geganters de Solsona | [Font](https://solsonalafesta.net/elements-folklorics/) |
| Drac de Solsona | Solsona | Agrupació de Geganters de Solsona | [Font](https://patrimonifestiu.cultura.gencat.cat/Festes-i-elements-festius-catalogats-o-declarats/Festes-Majors/La-Festa-Major-de-Solsona/El-drac) |
| Mulassa i Antonio Ricu | Solsona | Agrupació de Geganters de Solsona | [Font](https://patrimonifestiu.cultura.gencat.cat/Festes-i-elements-festius-catalogats-o-declarats/Festes-Majors/La-Festa-Major-de-Solsona/La-mulassa) |
| Àliga i Aligons de Solsona | Solsona | Agrupació de Geganters de Solsona | [Font](https://patrimonifestiu.cultura.gencat.cat/Festes-i-elements-festius-catalogats-o-declarats/Festes-Majors/La-Festa-Major-de-Solsona/L-aliga) |
| Gegants Bojos de Solsona | Solsona | Associació de Festes del Carnaval de Solsona | [Font](https://carnavalsolsona.com/la-festa/gegants/) |
| Draca del Carnaval de Solsona | Solsona | Associació de Festes del Carnaval de Solsona | [Font](https://carnavalsolsona.com/la-festa/gegants/) |
| Mulassa La Boja de Vilanova i la Geltrú | Vilanova i la Geltrú | Agrupació de Balls Populars de Vilanova i la Geltrú | [Font](https://ballspopularsvilanova.cat/mulassa/) |
| Drac de Vilanova i la Geltrú (1991) | Vilanova i la Geltrú | Ajuntament (propietari) / La Unió Vilanovina (gestió i portants) | [Font](https://www.bestiari.cat/figura/drac-de-vilanova-i-la-geltru/) |
| Àliga de la Ciutat de Barcelona | Barcelona | Associació de Festes de la Plaça Nova | [Font](https://plnova.cat/qui-som/) |
| Guites de la Patum | Berga | Ajuntament de Berga | [Font](https://lapatum.cat/comparses/) |
| Àliga de la Patum | Berga | Ajuntament de Berga | [Font](https://patrimonicultural.diba.cat/print/pdf/node/43268) |
| Gegants d’Olot | Olot | Ajuntament d’Olot | [Font](https://www.olotcultura.cat/projecte/farandula/) |
| Drac de Vilafranca del Penedès | Vilafranca del Penedès | Amics del Drac de Vilafranca del Penedès | [Font](https://www.dracdevilafranca.com/el-drac.html) |
| Lo Marraco de Lleida | Lleida | Colla Gegantera dels Gegants de la Paeria | [Font](https://www.bestiari.cat/figura/lo-marraco/) |
| Drac Baluk Astharot de Terrassa | Terrassa | Associació Juvenil Drac Baluk Astharot i Diables de Ca n'Aurell | [Font](https://www.bestiari.cat/figura/drac-baluk-astharot-2/) |
| Víbria de Manresa | Manresa | Xàldiga, Taller de Festes | [Font](https://www.bestiari.cat/figura/vibria-de-manresa/) |
| Drac de Montblanc | Montblanc | Associació Colla Drac i L'Àliga de Montblanc | [Font](https://www.bestiari.cat/figura/drac-de-montblanc/) |

## Vilanova: la Boja i el Drac

Revisió de fonts del 19 d'octubre de 2026. Les dues fitxes substitueixen l'antiga entrada conjunta `mulasses-vilanova` ("Mulasses / ABP Vilanova"). Comparteixen poble, comarca (Garraf), escut, pill i un sol estendard; l'ordre és La Boja i Drac de Vilanova. Continuen com a pròximes: cap cançó, model 3D, dificultat ni rècord nou. Els recomptes del selector es deriven del registre. No s'esborra ni es migra cap dada persistent. L'esborrany de col·laboració compartit continua sent "Sobre Vilanova i la Geltrú: ". No s'ha enviat cap missatge.

**La Boja** és el nom curt de la mulassa grossa, no el conjunt de tres mulasses ni la Presumida (mitjana, 1955) ni la Cabreta (petita, 1984). Al títol s'usa "Mulassa La Boja de Vilanova i la Geltrú". L'[ABP](https://ballspopularsvilanova.cat/mulassa/) documenta la recuperació per la Festa Major de 1947 i la integració de la colla a l'ABP el 1992. La mateixa pàgina també diu "de 1946" en un altre paràgraf; per això no es fixa un any de fabricació. L'[Ajuntament](https://www.vilanova.cat/noticies/detall?id=99996656) celebra els 75 anys de la Mulassa La Boja el 2022, i l'[Agrupació del Bestiari](https://www.bestiari.cat/2021/03/coneix-quatre-figures-de-bestiari-que-tenen-la-dona-com-a-referent/) confirma la distinció de les tres figures i la recuperació de 1947. La colla/gestió s'atribueix a l'ABP; no es dedueix propietat jurídica d'aquesta atribució. No s'ha confirmat documentalment aquí qui n'és el propietari ni les mides.

Referències visuals de la Boja, publicades per l'ABP: [vista lateral de les tres mulasses](https://ballspopularsvilanova.cat/wp-content/uploads/2023/07/mulasses-de-vilanova.jpg), on la grossa és al darrere a l'esquerra, i [vista posterior comparativa](https://ballspopularsvilanova.cat/wp-content/uploads/2023/07/mulasses-de-vilanova-geltru.jpg), on és la més alta, a la dreta. El retrat representa només la grossa: cap negre amb orelles llargues, xarxa granat, gualdrapa vermella amb vora daurada i escut blau. No porta corona al cap. L'escut es simplifica a la graella, sense pretendre reproduir-ne tots els detalls.

**Drac de Vilanova** és el nom curt del "Drac de Vilanova i la Geltrú", representat en la versió actual de **1991**, del Taller L'Estaquirot (Albert Albà segons la [fitxa oficial del Bestiari](https://www.bestiari.cat/figura/drac-de-vilanova-i-la-geltru/)), inspirada en el disseny de 1948 d'E. C. Ricart. La [colla](https://dracvilanova.wordpress.com/72-2/) confirma propietat de l'Ajuntament i cessió en gestió a La Unió Vilanovina. La fitxa del Bestiari confirma la vinculació dels portants amb aquesta entitat. No s'atribueix el Drac a l'ABP.

La [descripció de la figura actual de la colla](https://dracvilanova.wordpress.com/2020/04/14/figura-actual/) dona **2 m de llargada i 1,90 m d'alçada**, sense amplada. Hi ha discrepància de pes: aquesta pàgina diu 60 kg, mentre que la presentació de la colla i la fitxa del Bestiari diuen 45 kg; no es desa cap pes al catàleg. No s'ha calculat una escala mètrica entre pobles a partir d'aquestes dades parcials: `STAND` continua sent la mida de presentació aproximada del selector, com documenta `figures.js`, i no una mesura física.

No es confon amb el Drac vell de 1948, ni amb el del Nona de 1982, recuperat el 2022 ([font del Bestiari](https://www.bestiari.cat/2022/07/el-drac-del-nona-tornara-a-ballar-pels-carrers-de-vilanova-en-la-1a-trobada-de-bestiari-per-perdre-el-cap/), [programa municipal de 2022](https://www.vilanova.cat/doc/doc_29618862.pdf)), ni amb el Drac de la Geltrú/Tigre o el Barrina. La miniatura segueix les fotografies identificades com a 1991 al Bestiari: [vista lateral](https://www.bestiari.cat/wp-content/uploads/2016/07/DracVilanova-1991-1.jpg), [encesa](https://www.bestiari.cat/wp-content/uploads/2016/07/DracVilanova-1991-2.jpg), [tercera vista](https://www.bestiari.cat/wp-content/uploads/2016/07/DracVilanova-1991-3.jpg). Un sol cap, boca vermella amb dents clares, coll llarg, escates verdes, ala de ratpenat i cua cargolada. No deriva del retrat bicèfal del Drac de Valls.

Les fotografies són referències, no assets del joc. Els dos retrats nous mantenen `pixelSvg`, amb graelles de 18 × 14 cel·les. La consulta de fonts i la representació local no acrediten permís de les entitats: **no hi ha cap autorització confirmada en aquesta petició**. Els possibles permisos s'hauran de tractar separadament abans d'afirmar una col·laboració oficial.

## Campanar i grup de Gegants i Gegantons

El programa municipal de Sant Joan 2026 (pàgina impresa 12) atribueix explícitament el Gegant del Campanar a la Unió Anelles de la Flama. També es pot consultar la [versió de premsa al Patronat de Turisme de la Diputació de Tarragona](https://costadaurada.info/file/9322/download?token=Ru315H-c). La fitxa queda pendent de cançó, com la resta de figures sense joc integrat.

La referència fotogràfica del Campanar és l'[àlbum públic de la visita de l'Escola La Candela a l'exposició dels 300 anys dels gegants](https://photos.app.goo.gl/9v4mbG9rPUTesjnH8), enllaçat des de la [crònica del centre del 29 d'octubre de 2025](https://agora.xtec.cat/ceipmdcandela-valls/infantil/exposicio-dels-300-anys-dels-gegants-i3-i-i5/). Les fotografies mostren el penell i el campanar al cap, la cara, el rellotge al tors i la faldilla beix. Només s'han consultat com a referència; no s'incorporen al joc.

El retrat de Gegants i Gegantons representa les quatre figures separades: el Gegant de la Porra i la Geganta, més alts, i el Lladrefaves i la Gegantona, més petits. Segueix els vestits de la restauració de 2025 (Santa Úrsula 2025): el Lladrefaves amb tricorni, perruca blanca, casaca blava i les cames visibles, i la Gegantona amb cosset salmó i faldilla verda. A cap fotografia el Lladrefaves no porta turbant. La paleta compartida té nou colors i la graella ocupa 18 × 14 cel·les.
