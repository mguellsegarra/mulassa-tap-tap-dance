// PROVISIONAL where marked: player-facing strings live here, Catalan only (this game has no translations yet).
export const COPY = {
  games: { alquimia: { name: 'Mulassa Alchemy', blurb: 'Barreja i mira què surt' } }, // i18n-ok: Catalan-only game
  alquimia: {
    play: 'Juga', // i18n-ok: Catalan-only game
    menu: 'Menú', // i18n-ok: Catalan-only game
    allGames: 'Torna als jocs', // the start menu's way back to the games sheet (Codex) // i18n-ok: Catalan-only game
    book: 'Llibre de descobertes', // i18n-ok: Catalan-only game
    clear: 'Buida', // i18n-ok: Catalan-only game
    how: 'Toca dues coses per combinar-les', // i18n-ok: Catalan-only game
    count: (a, b) => `${a} de ${b}`, // i18n-ok: Catalan-only game
    nothing: 'Res de nou. Prova una altra parella!', // i18n-ok: Catalan-only game
    known: 'Aquesta ja la tens!', // i18n-ok: Catalan-only game
    fresh: 'Has descobert una cosa nova!', // i18n-ok: Catalan-only game
    hintFree: 'Demana una pista. Ara són il·limitades.', // i18n-ok: Catalan-only game
    hintLeft: n => (n === 1 ? 'Demana una pista. Te\'n queda 1.' : `Demana una pista. Te\'n queden ${n}.`), // i18n-ok: Catalan-only game
    hintTry: (a, b) => `Prova ${a} amb ${b}`, // i18n-ok: Catalan-only game
    hintWait: (h, m) => [h && `${h} h`, m && `${m} min`].filter(Boolean).join(' '), // i18n-ok: Catalan-only game
    hintEmpty: wait => `Propera pista en ${wait}`, // one line on a 320 px phone // i18n-ok: Catalan-only game
    // The card that explains how hints come back.
    hintWaitLeft: wait => `No et queden pistes. En tindràs una d'aquí a ${wait}.`, // i18n-ok: Catalan-only game
    hintsTitle: 'Pistes', // i18n-ok: Catalan-only game
    hintsHow: (max, min) => `Pots tenir fins a ${max} pistes. Cada ${min} minuts en recuperes una.`, // i18n-ok: Catalan-only game
    hintsEnd: "S'han acabat les pistes il·limitades.", // i18n-ok: Catalan-only game
    hintsOk: 'Entesos', // i18n-ok: Catalan-only game
    hintNone: 'Ja ho has descobert tot!', // i18n-ok: Catalan-only game
    // The first game's guided mix.
    lesson: [n => `Toca ${n}`, n => `Ara toca ${n}`], // i18n-ok: Catalan-only game
    lessonHint: 'Toca la bombeta i demana una pista', // i18n-ok: Catalan-only game
    lessonBook: 'Toca el llibre', // i18n-ok: Catalan-only game
    lessonDone: 'Ara prova altres parelles!', // i18n-ok: Catalan-only game
    // The tutorial bubbles, next to the hand. What each thing is, for kids and grandparents.
    tip: [n => `Toca ${n} per posar-ho a l'olla.`, n => `Afegeix ${n} i mira què surt de l'olla.`], // i18n-ok: Catalan-only game
    tipHint: 'La bombeta et diu quines dues coses pots barrejar.', // i18n-ok: Catalan-only game
    tipFollow: 'Toca les dues coses que brillen per barrejar-les.', // i18n-ok: Catalan-only game
    tipBook: 'Al llibre hi ha tot el que has descobert.', // i18n-ok: Catalan-only game
    hintTip: 'Vols una pista? Toca la bombeta', // i18n-ok: Catalan-only game
    go: 'Continua', // i18n-ok: Catalan-only game
    base: 'Element de sortida', // i18n-ok: Catalan-only game
    missing: n => (n === 1 ? 'Només et falta una cosa per descobrir.' : `Encara et falten ${n} coses per descobrir.`), // i18n-ok: Catalan-only game
    allFound: 'Ho has descobert tot!', // i18n-ok: Catalan-only game
    // The Valls elements, counted apart from the rest. Say "element de Valls", never "cosa".
    vallsSeal: 'Element de Valls', // i18n-ok: Catalan-only game
    vallsCount: (a, b) => `Has descobert ${a} de ${b} elements de Valls`, // the chip's spoken label // i18n-ok: Catalan-only game
    firstValls: n => `El teu primer element de Valls! N'hi ha ${n} en total.`, // i18n-ok: Catalan-only game
    allValls: 'Has descobert tots els elements de Valls!', // i18n-ok: Catalan-only game
    missingValls: n => (n === 1 ? 'Només et falta un element de Valls.' : `Encara et falten ${n} elements de Valls.`), // i18n-ok: Catalan-only game
    reset: 'Torna a començar', // i18n-ok: Catalan-only game
    resetSure: 'Vols esborrar les descobertes?', // i18n-ok: Catalan-only game
    resetYes: 'Esborra', // i18n-ok: Catalan-only game
    resetNo: 'Cancel·la', // i18n-ok: Catalan-only game
    items: {
      foc: { name: 'Foc', fact: 'Perquè la llenya cremi calen calor i oxigen de l\'aire. Si falta una d\'aquestes coses, el foc s\'apaga.' }, terra: { name: 'Terra', fact: 'Sota els peus hi ha un món viu: a la terra hi viuen cucs, fongs i organismes tan petits que no els veiem.' }, aigua: { name: 'Aigua', fact: 'Quan es congela, l\'aigua ocupa més espai. Per això el gel sura damunt de l\'aigua líquida.' }, vent: { name: 'Vent', fact: 'El vent és aire que es mou. Les diferències de pressió entre uns llocs i uns altres el posen en moviment.' }, // i18n-ok: Catalan-only game
      carbo: { name: 'Carbó', fact: 'El carbó vegetal s\'obté escalfant fusta amb molt poc aire. Així la fusta es transforma sense cremar-se del tot fins a fer-se cendra.' }, vapor: { name: 'Vapor', fact: 'El vapor d\'aigua és invisible. El núvol blanc que veus damunt d\'una olla són gotetes d\'aigua.' }, fum: { name: 'Fum' }, fang: { name: 'Fang', fact: 'De vegades plou fang: les gotes de pluja arrosseguen pols de l\'aire i deixen una capa de brutícia quan s\'assequen.' }, pols: { name: 'Pols', fact: 'La pols pot viatjar molt lluny amb el vent. La del desert del Sàhara arriba a travessar l\'oceà Atlàntic.' }, // i18n-ok: Catalan-only game
      nuvol: { name: 'Núvol', fact: 'Els núvols estan formats per gotetes d\'aigua o cristallets de gel que queden suspesos a l\'aire.' }, brasa: { name: 'Brasa', fact: 'Les brases poden continuar molt calentes encara que ja no hi hagi flames. Cobrir-les de terra pot conservar-ne l\'escalfor.' }, pedra: { name: 'Pedra', fact: 'L\'aigua i el vent desgasten les roques. Amb el temps, en poden sortir fragments tan petits com grans de sorra.' }, mar: { name: 'Mar', fact: 'Una part de la sal del mar ve de les roques de terra ferma. Els rius la transporten fins al mar.' }, ventada: { name: 'Ventada', fact: 'La velocitat del vent es mesura amb un aparell anomenat anemòmetre. Alguns tenen unes cassoletes que giren quan bufa.' }, // i18n-ok: Catalan-only game
      muntanya: { name: 'Muntanya', fact: 'Algunes muntanyes neixen quan dues grans plaques de la Terra xoquen i aixequen el terreny. Així es va formar l\'Himàlaia.' }, pluja: { name: 'Pluja', fact: 'Les gotes petites de pluja són gairebé rodones. Les més grosses s\'aplanen per sota mentre cauen.' }, planta: { name: 'Planta', fact: 'Les plantes fan servir la llum del sol per fabricar sucres a partir d\'aigua i diòxid de carboni de l\'aire.' }, arbre: { name: 'Arbre', fact: 'En molts arbres, cada anell del tronc correspon a un any de creixement. Els anells també donen pistes sobre el clima del passat.' }, canya: { name: 'Canya', fact: 'La gralla sona gràcies a dues làmines fines de canya que vibren quan hi bufes. Aquesta peça s\'anomena inxa.' }, fusta: { name: 'Fusta', fact: 'De la fusta se\'n poden separar fibres per fabricar paper. Aquestes fibres contenen cel·lulosa, un material que forma part de les plantes.' }, // i18n-ok: Catalan-only game
      ceba: { name: 'Ceba', fact: 'Quan talles una ceba, s\'allibera una substància que arriba als ulls i els irrita. Per això et surten llàgrimes.' }, vida: { name: 'Vida', fact: 'Tots els éssers vius estan formats per cèl·lules. N\'hi ha que només en tenen una, i d\'altres que en tenen moltíssimes.' }, animal: { name: 'Animal', fact: 'Els insectes són animals i formen més de la meitat de les espècies animals conegudes. Encara en queden moltes per descobrir.' }, ocell: { name: 'Ocell', fact: 'Les plomes retenen aire i ajuden els ocells a conservar l\'escalfor del cos. També els serveixen per a moltes altres coses, com volar.' }, // i18n-ok: Catalan-only game
      calcot: { name: 'Calçot', fact: 'Es diu així perquè es calça: se li tira terra al voltant perquè quedi blanc.' }, // i18n-ok: Catalan-only game
      calcotada: { name: 'Calçotada', fact: 'Diuen que la va inventar en Xat de Benaiges, però segurament és una llegenda.' }, // i18n-ok: Catalan-only game
      casa: { name: 'Casa', fact: 'Hi ha cases fetes amb maons de terra, aigua i palla assecats al sol. Aquesta manera de construir té milers d\'anys.' }, coto: { name: 'Cotó', fact: 'Les fibres de cotó creixen al voltant de les llavors del cotoner. A la natura, ajuden les llavors a escampar-se amb el vent.' }, persona: { name: 'Persona', fact: 'Totes les persones que viuen avui pertanyen a la mateixa espècie, Homo sapiens, sigui quin sigui el seu lloc de naixement.' }, colla: { name: 'Colla', fact: 'Les colles castelleres es poden reconèixer pel color de la camisa. La faixa ajuda a protegir l\'esquena i a enfilar-se.' }, roba: { name: 'Roba', fact: 'Molts teixits es fan entrecreuant dos grups de fils: l\'ordit i la trama. És la feina que fa un teler.' }, // i18n-ok: Catalan-only game
      pinya: { name: 'Pinya', fact: 'És la base del castell. Si algú cau, fa de coixí.' }, // i18n-ok: Catalan-only game
      castell: { name: 'Castell', fact: 'La tradició dels castells va néixer a Valls a principis del segle XIX.' }, // i18n-ok: Catalan-only game
      enxaneta: { name: 'Enxaneta', fact: 'Puja per un costat, fa l\'aleta i baixa per l\'altre. L\'aleta vol dir que el castell ja és carregat.' }, // i18n-ok: Catalan-only game
      faixa: { name: 'Faixa', fact: 'S\'enrotlla a la cintura per protegir l\'esquena.' }, // i18n-ok: Catalan-only game
      gralla: { name: 'Gralla', fact: 'La gralla i el timbal acompanyen la construcció dels castells.' }, // i18n-ok: Catalan-only game
      timbal: { name: 'Timbal', fact: 'La música dels castells marca els moments clau quan es carreguen i es descarreguen.' }, // i18n-ok: Catalan-only game
      musica: { name: 'Música', fact: 'El toc de castells explica amb música com avança la construcció. Així, qui no pot mirar amunt també sap en quin moment es troba.' }, ball: { name: 'Ball', fact: 'Alguns balls de festa també expliquen històries amb paraules. A Valls, els Diables representen el seu ball parlat per Santa Úrsula.' }, polvora: { name: 'Pólvora', fact: 'La pólvora es va descobrir a la Xina. Els alquimistes que la van descobrir buscaven un elixir per allargar la vida.' }, // i18n-ok: Catalan-only game
      carretilla: { name: 'Carretilla', fact: 'És un coet que corre escopint espurnes i acaba amb un petit pet.' }, // i18n-ok: Catalan-only game
      tronada: { name: 'Tronada', fact: 'A Valls, la Tronada inaugural de Sant Joan es fa al Pati. Després, les colles tornen a la plaça del Blat i alcen pilars.' }, mullat: { name: 'Petard mullat', fact: 'Un petard que no ha esclatat encara pot ser perillós. No l\'agafis ni intentis tornar-lo a encendre.' }, // i18n-ok: Catalan-only game
      diables: { name: 'Diables', fact: 'Van de vermell amb dues banyetes. La Diablessa reparteix el foc.' }, // i18n-ok: Catalan-only game
      correfoc: { name: 'Correfoc', fact: 'El Drac tanca la Festa Major de Sant Joan amb el correfoc.' }, // i18n-ok: Catalan-only game
      bestia: { name: 'Bèstia', fact: 'El bestiari festiu inclou figures d\'animals reals i imaginaris. Formen part de la festa i poden tenir funcions de joc o de cerimònia.' }, // i18n-ok: Catalan-only game
      drac: { name: 'Drac', fact: 'El Drac de Valls té dos caps i disset punts de foc, repartits entre les boques, les ales i la cua.' }, // i18n-ok: Catalan-only game
      mulassa: { name: 'Mulassa', fact: 'Per fer ballar la Mulassa de Valls calen quatre persones: dues al davant i dues al darrere.' }, // i18n-ok: Catalan-only game
      aliga: { name: 'Àliga', fact: 'La nit de Completes, l\'Àliga de Valls balla dins de l\'església de Sant Joan, davant la relíquia del patró.' }, // i18n-ok: Catalan-only game
      bou: { name: 'Bou Tradicional', fact: 'El Bou Tradicional de Valls es va recuperar el 2012. Participa en el seguici i porta foc als correfocs.' }, // i18n-ok: Catalan-only game
      cavall: { name: 'Cavall', fact: 'Els cavalls poden dormir drets, però també necessiten estirar-se. Algunes fases del son només les poden fer ajaguts.' }, // i18n-ok: Catalan-only game
      cavallets: { name: 'Cavallets', fact: 'Al Ball de Cavallets de Valls hi participen deu balladors, dividits en dos bàndols. Amb la dansa representen un enfrontament.' }, // i18n-ok: Catalan-only game
      gegants: { name: 'Gegants', fact: 'Els quatre gegants municipals de Valls són el Gegant de la Porra, la Geganta, el Lladrefaves i la Gegantona.' }, // i18n-ok: Catalan-only game
      nans: { name: 'Nans', fact: 'Els Nans de Valls es coneixen pels personatges que representen. Entre ells hi ha l\'Alcalde, el Sabater i l\'Arlequí.' }, // i18n-ok: Catalan-only game
      seguici: { name: 'Seguici', fact: 'A la Festa Major de Sant Joan de Valls, el Drac encapçala les sortides del Seguici.' }, // i18n-ok: Catalan-only game
      espelma: { name: 'Espelma' }, // i18n-ok: Catalan-only game
      maredeu: { name: 'Mare de Déu de la Candela', fact: 'Valls celebra les Festes Decennals en el seu honor.' }, // i18n-ok: Catalan-only game
      sol: { name: 'Sol' }, // i18n-ok: Catalan-only game
      arc: { name: 'Arc de Sant Martí' }, // i18n-ok: Catalan-only game
      sorra: { name: 'Sorra' }, // i18n-ok: Catalan-only game
      riu: { name: 'Riu' }, // i18n-ok: Catalan-only game
      cova: { name: 'Cova' }, // i18n-ok: Catalan-only game
      flor: { name: 'Flor' }, // i18n-ok: Catalan-only game
      abella: { name: 'Abella' }, // i18n-ok: Catalan-only game
      fruita: { name: 'Fruita' }, // i18n-ok: Catalan-only game
      tomaquet: { name: 'Tomàquet' }, // i18n-ok: Catalan-only game
      escalivada: { name: 'Escalivada' }, // i18n-ok: Catalan-only game
      raim: { name: 'Raïm' }, // i18n-ok: Catalan-only game
      cercolets: { name: 'Ball de Cercolets', fact: 'Va néixer a les festes de la verema.' }, // i18n-ok: Catalan-only game
      ferro: { name: 'Ferro' }, // i18n-ok: Catalan-only game
      campana: { name: 'Campana' }, // i18n-ok: Catalan-only game
      os: { name: 'Ós', fact: 'El primer dia de la Festa Major de Sant Joan, els xiquets de Valls poden donar els seus xumets a l\'Ós.' }, // i18n-ok: Catalan-only game
      ou: { name: 'Ou' }, // i18n-ok: Catalan-only game
      serp: { name: 'Serp' }, // i18n-ok: Catalan-only game
      basilisc: { name: 'Basilisc', fact: 'Segons una llegenda, neix d\'un ou de gall amb l\'ajuda d\'una serp i un gripau.' }, // i18n-ok: Catalan-only game
      aligons: { name: 'Aligons', fact: 'Els aligons són tres infants que acompanyen l\'Àliga de Valls i ballen al seu voltant. Es van recuperar el 1991.' }, // i18n-ok: Catalan-only game
      bastons: { name: 'Ball de Bastons', fact: 'A Valls ja surt el 1712, en una processó.' }, // i18n-ok: Catalan-only game
      pastor: { name: 'Pastor' }, // i18n-ok: Catalan-only game
      pastorets: { name: 'Ball de Pastorets', fact: 'És un ball on també es diuen versos.' }, // i18n-ok: Catalan-only game
      vaixell: { name: 'Vaixell' }, // i18n-ok: Catalan-only game
      galeres: { name: 'Ball de Galeres', fact: 'És un ball amb petits vaixells que recorda una batalla antiga.' }, // i18n-ok: Catalan-only game
      moixiganga: { name: 'Moixiganga', fact: 'Representa escenes de la història de Jesús.' }, // i18n-ok: Catalan-only game
      folre: { name: 'Folre', fact: 'És una segona pinya, a sobre de la primera.' }, // i18n-ok: Catalan-only game
      manilles: { name: 'Manilles', fact: 'Són una tercera pinya, a sobre del folre.' }, // i18n-ok: Catalan-only game
      camisa: { name: 'Camisa castellera' }, // i18n-ok: Catalan-only game
      vella: { name: 'Colla Vella', fact: 'És la colla de Valls de la camisa rosada.' }, // i18n-ok: Catalan-only game
      joves: { name: 'Colla Joves', fact: 'És la colla de Valls de la camisa vermella.' }, // i18n-ok: Catalan-only game
      aleta: { name: 'Aleta', fact: 'L\'enxaneta aixeca la mà quan arriba a dalt.' }, // i18n-ok: Catalan-only game
      carregat: { name: 'Castell carregat', fact: 'Quan l\'enxaneta fa l\'aleta, el castell ja està carregat. Encara falta baixar!' }, // i18n-ok: Catalan-only game
      descarregat: { name: 'Castell descarregat', fact: 'Vol dir que tothom ha baixat sense caure.' }, // i18n-ok: Catalan-only game
      poble: { name: 'Poble' }, // i18n-ok: Catalan-only game
      esglesia: { name: 'Església' }, // i18n-ok: Catalan-only game
      campanar: { name: 'Campanar', fact: 'El de Sant Joan de Valls fa 74 metres.' }, // i18n-ok: Catalan-only game
      placa: { name: 'Plaça' }, // i18n-ok: Catalan-only game
      diada: { name: 'Diada castellera' }, // i18n-ok: Catalan-only game
      valls: { name: 'Valls' }, // i18n-ok: Catalan-only game
      festamajor: { name: 'Festa Major', fact: 'L\'Àliga l\'obre des del balcó de la Casa de la Vila.' }, // i18n-ok: Catalan-only game
      llum: { name: 'Llum' }, // i18n-ok: Catalan-only game
      lluminaries: { name: 'Lluminàries', fact: 'Les Decennals també es coneixen com les Festes de la Llum.' }, // i18n-ok: Catalan-only game
      blat: { name: 'Blat' }, // i18n-ok: Catalan-only game
      pa: { name: 'Pa' }, // i18n-ok: Catalan-only game
      patomaquet: { name: 'Pa amb tomàquet', fact: 'Es fa sucant una llesca de pa amb mig tomàquet madur, amb oli d\'oliva i sal.' }, // i18n-ok: Catalan-only game
      salsa: { name: 'Salsa de calçots' }, // i18n-ok: Catalan-only game
      castanya: { name: 'Castanya' }, // i18n-ok: Catalan-only game
      castanyada: { name: 'Castanyada', fact: 'Es menjen castanyes, panellets i moniatos.' }, // i18n-ok: Catalan-only game
      montserrat: { name: 'Montserrat', fact: 'És una muntanya de Catalunya plena de roques punxegudes, amb un monestir.' }, // i18n-ok: Catalan-only game
      santjordi: { name: 'Sant Jordi', fact: 'Diu la llegenda que el cavaller va vèncer el drac. La festa és el 23 d\'abril.' }, // i18n-ok: Catalan-only game
      rosa: { name: 'Rosa', fact: 'Per Sant Jordi és costum regalar una rosa vermella.' }, // i18n-ok: Catalan-only game
      paper: { name: 'Paper' }, // i18n-ok: Catalan-only game
      llibre: { name: 'Llibre', fact: 'Per Sant Jordi és costum regalar un llibre.' }, // i18n-ok: Catalan-only game
      sagrada: { name: 'Sagrada Família', fact: 'És a Barcelona. Gaudí hi va treballar fins al 1926, i encara s\'està construint.' }, // i18n-ok: Catalan-only game
      cobla: { name: 'Cobla', fact: 'És la formació que toca les sardanes: 12 instruments tocats per 11 músics.' }, // i18n-ok: Catalan-only game
      sardana: { name: 'Sardana', fact: 'Es balla agafats de les mans, formant una rotllana.' }, // i18n-ok: Catalan-only game
      tio: { name: 'Tió', fact: 'Se\'l tapa amb una manta i se l\'alimenta cada dia fins que caga regals.' }, // i18n-ok: Catalan-only game
      caganer: { name: 'Caganer', fact: 'És una figureta del pessebre, sovint amagada en un racó.' }, // i18n-ok: Catalan-only game
      celula: { name: 'Cèl·lula' }, // i18n-ok: Catalan-only game
      peix: { name: 'Peix', fact: 'Els peixos també necessiten oxigen. Les brànquies els permeten agafar el que hi ha dissolt a l\'aigua.' }, // i18n-ok: Catalan-only game
      gos: { name: 'Gos' }, // i18n-ok: Catalan-only game
      caca: { name: 'Caca de gos' }, // i18n-ok: Catalan-only game
      panerola: { name: 'Panerola' }, // i18n-ok: Catalan-only game
      fabrica: { name: 'Fàbrica' }, // i18n-ok: Catalan-only game
      refineria: { name: 'Complex petroquímic' }, // i18n-ok: Catalan-only game
      sequera: { name: 'Sequera' }, // i18n-ok: Catalan-only game
      mosquit: { name: 'Mosquit tigre' }, // i18n-ok: Catalan-only game
      llenya: { name: 'Llenya' }, // i18n-ok: Catalan-only game
      concurs: { name: 'Concurs de castells', fact: 'Se celebra cada dos anys a Tarragona.' }, // i18n-ok: Catalan-only game
      santaursula: { name: 'Santa Úrsula', fact: 'És la copatrona de Valls. La seva fira és a l\'octubre, amb una gran diada castellera.' }, // i18n-ok: Catalan-only game
      santjoan: { name: 'Sant Joan', fact: 'La Festa Major de Valls és la de Sant Joan.' }, // i18n-ok: Catalan-only game
      roser: { name: 'Capella del Roser', fact: 'Té rajoles que mostren la batalla de Lepant.' }, // i18n-ok: Catalan-only game
      lleo: { name: 'Lleó', fact: 'El Lleó de Valls es va estrenar per les Decennals del 2011. És de llautó i el porten dues persones.' }, // i18n-ok: Catalan-only game
      gitanes: { name: 'Ball de Gitanes', fact: 'Al Ball de Gitanes de Valls, les balladores trenen cintes al voltant d\'un pal. Les cintes tenen els colors de la bandera de Valls.' }, // i18n-ok: Catalan-only game
      primera: { name: 'Ball de la Primera', fact: 'El Ball de la Primera de Valls és una dansa per a xiquets. A les cercaviles hi participen dotze balladors, acompanyats de gralles i timbal.' }, // i18n-ok: Catalan-only game
      bouvalls: { name: 'Bou de Valls', fact: 'No porta foc. El van recuperar el 2012 el Calçot i La Turba.' }, // i18n-ok: Catalan-only game
      perles: { name: 'Perles' }, // i18n-ok: Catalan-only game
      alcaldessa: { name: 'Alcaldessa' }, // i18n-ok: Catalan-only game
      botifarra: { name: 'Botifarra' }, // i18n-ok: Catalan-only game
      crema: { name: 'Crema catalana' }, // i18n-ok: Catalan-only game
      coca: { name: 'Coca de recapte' }, // i18n-ok: Catalan-only game
      xato: { name: 'Xató' }, // i18n-ok: Catalan-only game
      barretina: { name: 'Barretina' }, // i18n-ok: Catalan-only game
      espardenyes: { name: 'Espardenyes' }, // i18n-ok: Catalan-only game
      mocador: { name: 'Mocador' }, // i18n-ok: Catalan-only game
      flabiol: { name: 'Flabiol' }, // i18n-ok: Catalan-only game
      sacgemecs: { name: 'Sac de gemecs' }, // i18n-ok: Catalan-only game
      fiscorn: { name: 'Fiscorn' }, // i18n-ok: Catalan-only game
      bengala: { name: 'Bengala' }, // i18n-ok: Catalan-only game
      torxa: { name: 'Torxa' }, // i18n-ok: Catalan-only game
      traca: { name: 'Traca' }, // i18n-ok: Catalan-only game
      auca: { name: 'Auca' }, // i18n-ok: Catalan-only game
      rondalla: { name: 'Rondalla' }, // i18n-ok: Catalan-only game
      ceramica: { name: 'Ceràmica' }, // i18n-ok: Catalan-only game
      forjat: { name: 'Ferro forjat' }, // i18n-ok: Catalan-only game
      vidre: { name: 'Vidre' }, // i18n-ok: Catalan-only game
      porro: { name: 'Porró' }, // i18n-ok: Catalan-only game
      margarida: { name: 'Margarida' }, // i18n-ok: Catalan-only game
      carro: { name: 'Carro' }, // i18n-ok: Catalan-only game
      sucre: { name: 'Sucre' }, // i18n-ok: Catalan-only game
      carnaval: { name: 'Carnaval' }, // i18n-ok: Catalan-only game
      pintura: { name: 'Pintura' }, // i18n-ok: Catalan-only game
      vinya: { name: 'Vinya' }, // i18n-ok: Catalan-only game
      vi: { name: 'Vi' }, // i18n-ok: Catalan-only game
      torrent: { name: 'Torrent' }, // i18n-ok: Catalan-only game
      trestombs: { name: 'Tres Tombs', fact: 'Al gener, els carros de feina recorren el barri antic de Valls. És Festa Tradicional d\'Interès Nacional.' }, // i18n-ok: Catalan-only game
      caramel: { name: 'Caramel vermell', fact: 'El caramel vermell de Dijous Gras només es troba a Valls.' }, // i18n-ok: Catalan-only game
      firagost: { name: 'Firagost', fact: 'A l\'agost, uns tendals cobreixen la plaça del Blat per la Firagost.' }, // i18n-ok: Catalan-only game
      placablat: { name: 'Plaça del Blat', fact: 'Al terra de la plaça del Blat hi ha la placa del quilòmetre zero dels castells.' }, // i18n-ok: Catalan-only game
      francoli: { name: 'Francolí', fact: 'El riu Francolí passa pel municipi de Valls.' }, // i18n-ok: Catalan-only game
      muralla: { name: 'Muralla', fact: 'Les muralles de Valls són del segle XIV.' }, // i18n-ok: Catalan-only game
      lledo: { name: 'Mare de Déu del Lledó', fact: 'La imatge es va trobar el 1366.' }, // i18n-ok: Catalan-only game
      aiguardent: { name: 'Aiguardent', fact: 'Fer aiguardent era una feina tradicional de Valls.' }, // i18n-ok: Catalan-only game
      pell: { name: 'Pell', fact: 'Adobar pells era una feina tradicional de Valls.' }, // i18n-ok: Catalan-only game
      museucasteller: { name: 'Museu Casteller', fact: 'És a Valls i explica la història dels castells.' }, // i18n-ok: Catalan-only game
      teatre: { name: 'Teatre Principal', fact: 'El Teatre Principal de Valls es va inaugurar el 1850.' }, // i18n-ok: Catalan-only game
      oller: { name: 'Narcís Oller', fact: 'Va néixer a Valls. En algunes novel·les, la ciutat es diu Vilaniu.' }, // i18n-ok: Catalan-only game
      huguet: { name: 'Jaume Huguet', fact: 'Era pintor i va néixer a Valls.' }, // i18n-ok: Catalan-only game
      figaflawas: { name: 'Figa Flawas', fact: 'Figa Flawas són dos músics de Valls. Un dels seus discos es diu La Calçotada.' }, // i18n-ok: Catalan-only game
      calcofest: { name: 'Calçofest', fact: 'Va néixer a Valls per encetar la temporada de calçotades amb música.' }, // i18n-ok: Catalan-only game
      decennals: { name: 'Decennals', fact: 'Valls les celebra cada deu anys des del 1791, en honor de la Mare de Déu de la Candela.' }, // i18n-ok: Catalan-only game
    },
  },
};
