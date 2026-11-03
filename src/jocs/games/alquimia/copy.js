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
      carbo: { name: 'Carbó', fact: 'El carbó vegetal s\'obté escalfant fusta amb molt poc aire. Així la fusta es transforma sense cremar-se del tot fins a fer-se cendra.' }, vapor: { name: 'Vapor', fact: 'El vapor d\'aigua és invisible. El núvol blanc que veus damunt d\'una olla són gotetes d\'aigua.' }, fum: { name: 'Fum', fact: 'El fum conté gasos i partícules molt petites que es formen durant la combustió. No és el mateix que el vapor d\'aigua.' }, fang: { name: 'Fang', fact: 'De vegades plou fang: les gotes de pluja arrosseguen pols de l\'aire i deixen una capa de brutícia quan s\'assequen.' }, pols: { name: 'Pols', fact: 'La pols pot viatjar molt lluny amb el vent. La del desert del Sàhara arriba a travessar l\'oceà Atlàntic.' }, // i18n-ok: Catalan-only game
      nuvol: { name: 'Núvol', fact: 'Els núvols estan formats per gotetes d\'aigua o cristallets de gel que queden suspesos a l\'aire.' }, brasa: { name: 'Brasa', fact: 'Les brases poden continuar molt calentes encara que ja no hi hagi flames. Cobrir-les de terra pot conservar-ne l\'escalfor.' }, pedra: { name: 'Pedra', fact: 'L\'aigua i el vent desgasten les roques. Amb el temps, en poden sortir fragments tan petits com grans de sorra.' }, mar: { name: 'Mar', fact: 'Una part de la sal del mar ve de les roques de terra ferma. Els rius la transporten fins al mar.' }, ventada: { name: 'Ventada', fact: 'La velocitat del vent es mesura amb un aparell anomenat anemòmetre. Alguns tenen unes cassoletes que giren quan bufa.' }, // i18n-ok: Catalan-only game
      muntanya: { name: 'Muntanya', fact: 'Algunes muntanyes neixen quan dues grans plaques de la Terra xoquen i aixequen el terreny. Així es va formar l\'Himàlaia.' }, pluja: { name: 'Pluja', fact: 'Les gotes petites de pluja són gairebé rodones. Les més grosses s\'aplanen per sota mentre cauen.' }, planta: { name: 'Planta', fact: 'Les plantes fan servir la llum del sol per fabricar sucres a partir d\'aigua i diòxid de carboni de l\'aire.' }, arbre: { name: 'Arbre', fact: 'En molts arbres, cada anell del tronc correspon a un any de creixement. Els anells també donen pistes sobre el clima del passat.' }, canya: { name: 'Canya', fact: 'La gralla sona gràcies a dues làmines fines de canya que vibren quan hi bufes. Aquesta peça s\'anomena inxa.' }, fusta: { name: 'Fusta', fact: 'De la fusta se\'n poden separar fibres per fabricar paper. Aquestes fibres contenen cel·lulosa, un material que forma part de les plantes.' }, // i18n-ok: Catalan-only game
      ceba: { name: 'Ceba', fact: 'Quan talles una ceba, s\'allibera una substància que arriba als ulls i els irrita. Per això et surten llàgrimes.' }, vida: { name: 'Vida', fact: 'Tots els éssers vius estan formats per cèl·lules. N\'hi ha que només en tenen una, i d\'altres que en tenen moltíssimes.' }, animal: { name: 'Animal', fact: 'Els insectes són animals i formen més de la meitat de les espècies animals conegudes. Encara en queden moltes per descobrir.' }, ocell: { name: 'Ocell', fact: 'Les plomes retenen aire i ajuden els ocells a conservar l\'escalfor del cos. També els serveixen per a moltes altres coses, com volar.' }, // i18n-ok: Catalan-only game
      calcot: { name: 'Calçot', fact: 'El calçot es va cobrint de terra mentre creix. Aquest gest, anomenat calçar, fa que una part quedi blanca i tendra.' }, // i18n-ok: Catalan-only game
      calcotada: { name: 'Calçotada', fact: 'A la calçotada, els calçots es couen a la flama. Se\'n retira la capa cremada i se suca la part tendra a la salsa.' }, // i18n-ok: Catalan-only game
      casa: { name: 'Casa', fact: 'Hi ha cases fetes amb maons de terra, aigua i palla assecats al sol. Aquesta manera de construir té milers d\'anys.' }, coto: { name: 'Cotó', fact: 'Les fibres de cotó creixen al voltant de les llavors del cotoner. A la natura, ajuden les llavors a escampar-se amb el vent.' }, persona: { name: 'Persona', fact: 'Totes les persones que viuen avui pertanyen a la mateixa espècie, Homo sapiens, sigui quin sigui el seu lloc de naixement.' }, colla: { name: 'Colla', fact: 'Les colles castelleres es poden reconèixer pel color de la camisa. La faixa ajuda a protegir l\'esquena i a enfilar-se.' }, roba: { name: 'Roba', fact: 'Molts teixits es fan entrecreuant dos grups de fils: l\'ordit i la trama. És la feina que fa un teler.' }, // i18n-ok: Catalan-only game
      pinya: { name: 'Pinya', fact: 'La pinya aguanta la base del castell i ajuda a esmorteir una possible caiguda. Cada persona hi té una posició i una feina.' }, // i18n-ok: Catalan-only game
      castell: { name: 'Castell', fact: 'Valls és el bressol dels castells. Al començament del segle XIX ja s\'hi feien construccions humanes que van donar lloc a la tradició castellera.' }, // i18n-ok: Catalan-only game
      enxaneta: { name: 'Enxaneta', fact: 'L\'enxaneta corona el castell i fa l\'aleta aixecant una mà. Després encara cal que tota la construcció es desmunti bé.' }, // i18n-ok: Catalan-only game
      faixa: { name: 'Faixa', fact: 'La faixa castellera protegeix la zona de la cintura i serveix de punt de suport als peus de qui s\'enfila.' }, // i18n-ok: Catalan-only game
      gralla: { name: 'Gralla', fact: 'La gralla és un instrument de vent. La seva inxa té dues làmines de canya que vibren quan el músic hi bufa.' }, // i18n-ok: Catalan-only game
      timbal: { name: 'Timbal', fact: 'El timbal acompanya les gralles en els castells. Junts toquen una música que canvia segons el moment de la construcció.' }, // i18n-ok: Catalan-only game
      musica: { name: 'Música', fact: 'El toc de castells explica amb música com avança la construcció. Així, qui no pot mirar amunt també sap en quin moment es troba.' }, ball: { name: 'Ball', fact: 'Alguns balls de festa també expliquen històries amb paraules. A Valls, els Diables representen el seu ball parlat per Santa Úrsula.' }, polvora: { name: 'Pólvora', fact: 'La pólvora es va descobrir a la Xina. Els alquimistes que la van descobrir buscaven un elixir per allargar la vida.' }, // i18n-ok: Catalan-only game
      carretilla: { name: 'Carretilla', fact: 'Les carretilles dels correfocs llancen espurnes. Segons com se subjecten, poden girar formant una mena de paraigua de foc.' }, // i18n-ok: Catalan-only game
      tronada: { name: 'Tronada', fact: 'A Valls, la Tronada inaugural de Sant Joan es fa al Pati. Després, les colles tornen a la plaça del Blat i alcen pilars.' }, mullat: { name: 'Petard mullat', fact: 'Un petard que no ha esclatat encara pot ser perillós. No l\'agafis ni intentis tornar-lo a encendre.' }, // i18n-ok: Catalan-only game
      diables: { name: 'Diables', fact: 'Al Ball de Diables de Valls, la Diablessa reparteix el foc. Llucifer es distingeix pel vestit negre i el barret de copa.' }, // i18n-ok: Catalan-only game
      correfoc: { name: 'Correfoc', fact: 'A Valls, el Drac participa en el correfoc que tanca la Festa Major de Sant Joan, amb foc i percussió.' }, // i18n-ok: Catalan-only game
      bestia: { name: 'Bèstia', fact: 'El bestiari festiu inclou figures d\'animals reals i imaginaris. Formen part de la festa i poden tenir funcions de joc o de cerimònia.' }, // i18n-ok: Catalan-only game
      drac: { name: 'Drac', fact: 'El Drac de Valls té dos caps i disset punts de foc, repartits entre les boques, les ales i la cua.' }, // i18n-ok: Catalan-only game
      mulassa: { name: 'Mulassa', fact: 'Per fer ballar la Mulassa de Valls calen quatre persones: dues al davant i dues al darrere.' }, // i18n-ok: Catalan-only game
      aliga: { name: 'Àliga', fact: 'La nit de Completes, l\'Àliga de Valls balla dins de l\'església de Sant Joan, davant la relíquia del patró.' }, // i18n-ok: Catalan-only game
      bou: { name: 'Bou Tradicional', fact: 'El Bou Tradicional de Valls es va recuperar el 2012. Participa en el seguici i porta foc als correfocs.' }, // i18n-ok: Catalan-only game
      cavall: { name: 'Cavall', fact: 'Els cavalls poden dormir drets, però també necessiten estirar-se. Algunes fases del son només les poden fer ajaguts.' }, // i18n-ok: Catalan-only game
      cavallets: { name: 'Cavallets', fact: 'Al Ball de Cavallets de Valls hi participen deu balladors, dividits en dos bàndols. Amb la dansa representen un enfrontament.' }, // i18n-ok: Catalan-only game
      gegants: { name: 'Gegants', fact: 'Els quatre gegants municipals de Valls són el Gegant de la Porra, la Geganta, el Lladrefaves i la Gegantona.' }, // i18n-ok: Catalan-only game
      nans: { name: 'Nans', fact: 'Els Nans de Valls es coneixen pels personatges que representen. Entre ells hi ha l\'Alcalde, el Sabater i l\'Arlequí.' }, // i18n-ok: Catalan-only game
      seguici: { name: 'Seguici', fact: 'A Valls, el Drac encapçala les sortides del seguici per Sant Joan. Darrere seu hi desfilen altres figures, balls i músics.' }, // i18n-ok: Catalan-only game
      espelma: { name: 'Espelma', fact: 'Quan una espelma crema, la cera reacciona amb l\'oxigen de l\'aire. Aquesta reacció produeix la llum i l\'escalfor de la flama.' }, // i18n-ok: Catalan-only game
      maredeu: { name: 'Mare de Déu de la Candela', fact: 'La festa de la Mare de Déu de la Candela és el 2 de febrer. A Valls, també li dediquen les Festes Decennals.' }, // i18n-ok: Catalan-only game
      sol: { name: 'Sol', fact: 'La llum del Sol triga uns vuit minuts a arribar a la Terra. Quan el veiem, el veiem tal com era fa una estona.' }, // i18n-ok: Catalan-only game
      arc: { name: 'Arc de Sant Martí', fact: 'L\'arc de Sant Martí apareix quan la llum del sol travessa gotes d\'aigua. Les gotes separen la llum en colors.' }, // i18n-ok: Catalan-only game
      sorra: { name: 'Sorra', fact: 'La sorra pot venir de roques que s\'han anat trencant. En algunes platges també conté petits fragments de petxines.' }, // i18n-ok: Catalan-only game
      riu: { name: 'Riu', fact: 'L\'aigua d\'un riu ve de la pluja, de la neu que es fon i d\'aigües subterrànies. Tot aquest camí forma part del cicle de l\'aigua.' }, // i18n-ok: Catalan-only game
      cova: { name: 'Cova', fact: 'Moltes coves es formen quan l\'aigua dissol lentament la roca calcària. Amb molt de temps, petites esquerdes es poden convertir en grans galeries.' }, // i18n-ok: Catalan-only game
      flor: { name: 'Flor', fact: 'Les flors participen en la reproducció de moltes plantes. Després de la pol·linització i la fecundació, es poden formar llavors.' }, // i18n-ok: Catalan-only game
      abella: { name: 'Abella', fact: 'Quan una abella visita flors, pot transportar pol·len d\'una a una altra. Així ajuda moltes plantes a formar fruits i llavors.' }, // i18n-ok: Catalan-only game
      fruita: { name: 'Fruita', fact: 'Molts fruits tenen llavors a dins. Els animals que se\'ls mengen poden escampar aquestes llavors lluny de la planta mare.' }, // i18n-ok: Catalan-only game
      tomaquet: { name: 'Tomàquet', fact: 'El tomàquet és un fruit: es forma a partir d\'una flor i té llavors a dins. A la cuina el tractem com una hortalissa.' }, // i18n-ok: Catalan-only game
      escalivada: { name: 'Escalivada', fact: 'Escalivar vol dir coure al caliu. L\'escalivada es fa amb hortalisses com pebrots i albergínies, que després es pelen i s\'amaneixen.' }, // i18n-ok: Catalan-only game
      raim: { name: 'Raïm', fact: 'Les panses són grans de raïm assecats. En perdre bona part de l\'aigua, es fan més petits i arrugats.' }, // i18n-ok: Catalan-only game
      cercolets: { name: 'Ball de Cercolets', fact: 'Els Cercolets de Valls fan figures amb cèrcols guarnits. Una de les danses recorda com els boters muntaven i desmuntaven una bóta.' }, // i18n-ok: Catalan-only game
      ferro: { name: 'Ferro', fact: 'El ferro es rovella quan reacciona amb l\'oxigen en presència d\'aigua. El rovell és un material diferent del ferro original.' }, // i18n-ok: Catalan-only game
      campana: { name: 'Campana', fact: 'Els tocs de campana servien per comunicar missatges a tot el poble. Diferents ritmes podien anunciar celebracions, avisos o moments de pregària.' }, // i18n-ok: Catalan-only game
      os: { name: 'Ós', fact: 'El primer dia de la Festa Major de Sant Joan, els xiquets de Valls poden donar els seus xumets a l\'Ós.' }, // i18n-ok: Catalan-only game
      ou: { name: 'Ou', fact: 'La closca d\'un ou de gallina té porus molt petits. A través d\'aquests foradets poden passar gasos i vapor d\'aigua.' }, // i18n-ok: Catalan-only game
      serp: { name: 'Serp', fact: 'Les serps treuen la llengua per recollir partícules de l\'entorn. Dins de la boca tenen un òrgan que les ajuda a detectar olors.' }, // i18n-ok: Catalan-only game
      basilisc: { name: 'Basilisc', fact: 'El Basilisc de Valls és una bèstia imaginària: combina cap de gall, cos de gripau, cua de serp i ales de ratpenat.' }, // i18n-ok: Catalan-only game
      aligons: { name: 'Aligons', fact: 'Els aligons són tres infants que acompanyen l\'Àliga de Valls i ballen al seu voltant. Es van recuperar el 1991.' }, // i18n-ok: Catalan-only game
      bastons: { name: 'Ball de Bastons', fact: 'A Valls hi ha documents del Ball de Bastons des del 1712. Els balladors fan picar els bastons seguint el ritme de la música.' }, // i18n-ok: Catalan-only game
      pastor: { name: 'Pastor', fact: 'La transhumància és el desplaçament estacional dels ramats. Els pastors els porten a altres pastures segons l\'època de l\'any.' }, // i18n-ok: Catalan-only game
      pastorets: { name: 'Ball de Pastorets', fact: 'Els Pastorets de Valls ballen amb bastons llargs que piquen a terra. També diuen versos: és un ball parlat.' }, // i18n-ok: Catalan-only game
      vaixell: { name: 'Vaixell', fact: 'Un vaixell sura perquè l\'aigua l\'empeny cap amunt. La forma del buc li permet desplaçar prou aigua per sostenir-ne el pes.' }, // i18n-ok: Catalan-only game
      galeres: { name: 'Ball de Galeres', fact: 'El Ball de Galeres de Valls recorda la batalla de Lepant del 1571. Hi ballen vuit petits vaixells, repartits en dos bàndols.' }, // i18n-ok: Catalan-only game
      moixiganga: { name: 'Moixiganga', fact: 'La Moixiganga de Valls representa escenes de la passió de Jesús amb figures humanes. És una dansa de caràcter religiós.' }, // i18n-ok: Catalan-only game
      folre: { name: 'Folre', fact: 'Alguns castells tenen folre: un grup de castellers damunt de la pinya que reforça la construcció i ajuda a sostenir els pisos de sobre.' }, // i18n-ok: Catalan-only game
      manilles: { name: 'Manilles', fact: 'Les manilles són un reforç de persones situat damunt del folre. S\'utilitzen en alguns dels castells més alts i difícils.' }, // i18n-ok: Catalan-only game
      camisa: { name: 'Camisa castellera', fact: 'La camisa ajuda a reconèixer una colla castellera. A Valls, la Vella la porta rosada i la Joves, vermella.' }, // i18n-ok: Catalan-only game
      vella: { name: 'Colla Vella', fact: 'La Colla Vella dels Xiquets de Valls porta camisa rosada. És una de les dues colles castelleres de la ciutat.' }, // i18n-ok: Catalan-only game
      joves: { name: 'Colla Joves', fact: 'La Colla Joves Xiquets de Valls porta camisa vermella. És una de les dues colles castelleres de la ciutat.' }, // i18n-ok: Catalan-only game
      aleta: { name: 'Aleta', fact: 'Fer l\'aleta és el gest d\'aixecar una mà que fa l\'enxaneta al capdamunt del castell. Assenyala que l\'ha coronat.' }, // i18n-ok: Catalan-only game
      carregat: { name: 'Castell carregat', fact: 'Un castell queda carregat quan l\'enxaneta el corona. Si cau durant la baixada, queda carregat però no descarregat.' }, // i18n-ok: Catalan-only game
      descarregat: { name: 'Castell descarregat', fact: 'Un castell descarregat s\'ha aixecat i desmuntat sense caure. La feina de la colla continua després de l\'aleta de l\'enxaneta.' }, // i18n-ok: Catalan-only game
      poble: { name: 'Poble', fact: 'Picamoixons és un poble que forma part del municipi de Valls. És a tocar del riu Francolí, prop de la Riba.' }, // i18n-ok: Catalan-only game
      esglesia: { name: 'Església', fact: 'L\'església de Sant Joan de Valls conserva la imatge de la Mare de Déu de la Candela, protagonista de les Festes Decennals.' }, // i18n-ok: Catalan-only game
      campanar: { name: 'Campanar', fact: 'El campanar de Sant Joan de Valls fa 74 metres d\'alçada. És el més alt de les esglésies parroquials de Catalunya.' }, // i18n-ok: Catalan-only game
      placa: { name: 'Plaça', fact: 'La plaça del Blat és un dels grans escenaris de festa de Valls. S\'hi fan castells davant de la Casa de la Vila.' }, // i18n-ok: Catalan-only game
      diada: { name: 'Diada castellera', fact: 'A la diada de Santa Úrsula, la Colla Vella i la Colla Joves actuen a la plaça del Blat de Valls.' }, // i18n-ok: Catalan-only game
      valls: { name: 'Valls', fact: 'Valls és la capital de l\'Alt Camp. La ciutat és coneguda pels castells i per la tradició de les calçotades.' }, // i18n-ok: Catalan-only game
      festamajor: { name: 'Festa Major', fact: 'A Valls, l\'Àliga surt al balcó de la Casa de la Vila per anunciar la Festa Major de Sant Joan.' }, // i18n-ok: Catalan-only game
      llum: { name: 'Llum', fact: 'La llum blanca del sol conté molts colors. Un arc de Sant Martí ens els deixa veure separats per les gotes d\'aigua.' }, // i18n-ok: Catalan-only game
      lluminaries: { name: 'Lluminàries', fact: 'Durant les Decennals, les lluminàries guarneixen carrers i places de Valls. Per això també es coneixen com les Festes de la Llum.' }, // i18n-ok: Catalan-only game
      blat: { name: 'Blat', fact: 'La farina de blat s\'obté molent els grans. La farina integral conserva també el segó i el germen del gra.' }, // i18n-ok: Catalan-only game
      pa: { name: 'Pa', fact: 'El llevat produeix petites bombolles de gas dins de la massa del pa. Aquestes bombolles fan que la massa creixi.' }, // i18n-ok: Catalan-only game
      patomaquet: { name: 'Pa amb tomàquet', fact: 'El pa amb tomàquet es prepara fregant tomàquet madur sobre el pa i amanint-lo amb oli d\'oliva i sal.' }, // i18n-ok: Catalan-only game
      salsa: { name: 'Salsa de calçots', fact: 'La salsa de calçots porta fruits secs, com ametlles i avellanes. A Valls també es coneix amb el nom de salvitxada.' }, // i18n-ok: Catalan-only game
      castanya: { name: 'Castanya', fact: 'Les castanyes creixen dins d\'un embolcall ple de punxes, anomenat pelló. Quan maduren, el pelló s\'obre i deixa sortir els fruits.' }, // i18n-ok: Catalan-only game
      castanyada: { name: 'Castanyada', fact: 'Per la Castanyada és costum menjar castanyes torrades, moniatos i panellets. Aquesta celebració està vinculada a la festa de Tots Sants.' }, // i18n-ok: Catalan-only game
      montserrat: { name: 'Montserrat', fact: 'Les roques de Montserrat contenen còdols units per un ciment natural. L\'aigua i el vent han anat modelant les seves formes.' }, // i18n-ok: Catalan-only game
      santjordi: { name: 'Sant Jordi', fact: 'Sant Jordi se celebra el 23 d\'abril. La història del cavaller que venç el drac és una llegenda.' }, // i18n-ok: Catalan-only game
      rosa: { name: 'Rosa', fact: 'A Catalunya és costum regalar roses per Sant Jordi. Segons la llegenda, un roser va néixer de la sang del drac.' }, // i18n-ok: Catalan-only game
      paper: { name: 'Paper', fact: 'Les fibres del paper es poden recuperar per fabricar-ne de nou. Amb cada reciclatge, però, es fan més curtes i es deterioren.' }, // i18n-ok: Catalan-only game
      llibre: { name: 'Llibre', fact: 'El 23 d\'abril també és el Dia Mundial del Llibre. A Catalunya, els llibres comparteixen protagonisme amb les roses de Sant Jordi.' }, // i18n-ok: Catalan-only game
      sagrada: { name: 'Sagrada Família', fact: 'Gaudí es va fer càrrec de la Sagrada Família el 1883. Va dedicar els últims dotze anys de la seva vida exclusivament a aquest projecte.' }, // i18n-ok: Catalan-only game
      cobla: { name: 'Cobla', fact: 'La cobla que toca sardanes té onze músics i dotze instruments. Una mateixa persona toca el flabiol i el tamborí.' }, // i18n-ok: Catalan-only game
      sardana: { name: 'Sardana', fact: 'La sardana es balla en rotllana, amb les mans agafades. Els balladors alternen passos curts i llargs seguint la música.' }, // i18n-ok: Catalan-only game
      tio: { name: 'Tió', fact: 'Fer cagar el tió és una tradició de Nadal. Els infants canten i piquen el tronc, i després descobreixen els regals amagats sota la manta.' }, // i18n-ok: Catalan-only game
      caganer: { name: 'Caganer', fact: 'El caganer és una figura del pessebre català que fa caca. Sovint queda amagat en un racó i cal buscar-lo.' }, // i18n-ok: Catalan-only game
      celula: { name: 'Cèl·lula', fact: 'El 1665, Robert Hooke va publicar dibuixos de suro observat amb microscopi. Hi va mostrar petits compartiments que va anomenar cèl·lules.' }, // i18n-ok: Catalan-only game
      peix: { name: 'Peix', fact: 'Els peixos també necessiten oxigen. Les brànquies els permeten agafar el que hi ha dissolt a l\'aigua.' }, // i18n-ok: Catalan-only game
      gos: { name: 'Gos', fact: 'Hi ha gossos entrenats per trobar floridura o plagues amb l\'olfacte. El seu nas pot detectar quantitats molt petites d\'una olor.' }, // i18n-ok: Catalan-only game
      caca: { name: 'Caca de gos', fact: 'La caca de gos pot portar microbis i contaminar l\'aigua quan plou. Recollir-la ajuda a mantenir nets els carrers i els rius.' }, // i18n-ok: Catalan-only game
      panerola: { name: 'Panerola', fact: 'Algunes paneroles viuen als boscos i mengen fusta en descomposició. Ajuden a desfer les restes vegetals i formen part de la cadena alimentària.' }, // i18n-ok: Catalan-only game
      fabrica: { name: 'Fàbrica', fact: 'Al segle XIX, Valls tenia fàbriques de teixits, paper i aiguardent. La indústria donava feina a moltes famílies de la ciutat.' }, // i18n-ok: Catalan-only game
      refineria: { name: 'Complex petroquímic', fact: 'El complex petroquímic de Tarragona agrupa diverses empreses. S\'hi fabriquen productes químics que serveixen de matèria primera per a altres indústries.' }, // i18n-ok: Catalan-only game
      sequera: { name: 'Sequera', fact: 'Una sequera meteorològica és un període llarg en què plou menys del que és habitual. No és només un dia de molta calor.' }, // i18n-ok: Catalan-only game
      mosquit: { name: 'Mosquit tigre', fact: 'En el mosquit tigre, les femelles són les que piquen. Les larves creixen a l\'aigua acumulada en recipients petits.' }, // i18n-ok: Catalan-only game
      llenya: { name: 'Llenya', fact: 'La llenya acabada de tallar conté molta aigua. Quan s\'asseca bé, crema millor i fa menys fum.' }, // i18n-ok: Catalan-only game
      concurs: { name: 'Concurs de castells', fact: 'Al Concurs de Castells, cada construcció té una puntuació. En la taula del concurs, descarregar un castell dona més punts que deixar-lo carregat.' }, // i18n-ok: Catalan-only game
      santaursula: { name: 'Santa Úrsula', fact: 'La Fira de Santa Úrsula omple Valls de festa a l\'octubre. La diada castellera reuneix les dues colles de la ciutat.' }, // i18n-ok: Catalan-only game
      santjoan: { name: 'Sant Joan', fact: 'Sant Joan és la Festa Major de Valls. El 24 de juny és el dia del patró, amb seguici i castells.' }, // i18n-ok: Catalan-only game
      roser: { name: 'Capella del Roser', fact: 'Les rajoles de la capella del Roser de Valls representen la batalla de Lepant, que va tenir lloc l\'any 1571.' }, // i18n-ok: Catalan-only game
      lleo: { name: 'Lleó', fact: 'El Lleó de Valls es va estrenar per les Decennals del 2011. És de llautó i el porten dues persones.' }, // i18n-ok: Catalan-only game
      gitanes: { name: 'Ball de Gitanes', fact: 'Al Ball de Gitanes de Valls, les balladores trenen cintes al voltant d\'un pal. Les cintes tenen els colors de la bandera de Valls.' }, // i18n-ok: Catalan-only game
      primera: { name: 'Ball de la Primera', fact: 'El Ball de la Primera de Valls és una dansa per a xiquets. A les cercaviles hi participen dotze balladors, acompanyats de gralles i timbal.' }, // i18n-ok: Catalan-only game
      bouvalls: { name: 'Bou de Valls', fact: 'El Bou de Valls es va recuperar el 2012 amb el Calçot i La Turba. Aquesta figura del seguici no porta foc.' }, // i18n-ok: Catalan-only game
      perles: { name: 'Perles', fact: 'Les perles es formen dins d\'alguns mol·luscs. L\'animal va dipositant capes de material al voltant d\'un petit cos estrany.' }, // i18n-ok: Catalan-only game
      alcaldessa: { name: 'Alcaldessa', fact: 'Dolors Batalla va ser la primera dona alcaldessa de Valls. Va començar a exercir el càrrec l\'any 2003.' }, // i18n-ok: Catalan-only game
      botifarra: { name: 'Botifarra', fact: 'Hi ha botifarres blanques, negres i d\'ou. La botifarra negra porta sang, que li dona el color fosc.' }, // i18n-ok: Catalan-only game
      crema: { name: 'Crema catalana', fact: 'La crema catalana es fa amb llet, rovells d\'ou i sucre, entre altres ingredients. La capa de sucre cremat de sobre queda cruixent.' }, // i18n-ok: Catalan-only game
      coca: { name: 'Coca de recapte', fact: 'La coca de recapte és una massa de pa amb hortalisses al damunt. Segons la recepta, també pot portar arengada o botifarra.' }, // i18n-ok: Catalan-only game
      escarola: { name: 'Escarola', fact: 'Quan les fulles de l’escarola creixen sense llum, es tornen més clares i tendres. També perden part del gust amarg.' }, // i18n-ok: Catalan-only game
      xato: { name: 'Xató', fact: 'El xató combina escarola, peix salat i una salsa de fruits secs i nyora. Diverses poblacions del Penedès i el Garraf en tenen versions pròpies.' }, // i18n-ok: Catalan-only game
      barretina: { name: 'Barretina', fact: 'La barretina és una gorra de llana de la indumentària tradicional. Se n\'han fet de diversos colors, com el vermell i el morat.' }, // i18n-ok: Catalan-only game
      espardenyes: { name: 'Espardenyes', fact: 'Una mena d\'espardenya s\'anomena de Valls o de set vetes. El nom fa referència a les cintes que la subjecten al peu.' }, // i18n-ok: Catalan-only game
      mocador: { name: 'Mocador', fact: 'El mocador casteller tradicional és vermell amb punts blancs. Es pot portar al cap, al coll o en altres llocs del cos.' }, // i18n-ok: Catalan-only game
      flabiol: { name: 'Flabiol', fact: 'El flabiol es pot tocar amb una sola mà. Això permet al mateix músic tocar el tamborí amb l\'altra.' }, // i18n-ok: Catalan-only game
      sacgemecs: { name: 'Sac de gemecs', fact: 'El sac de gemecs guarda aire dins d\'una bossa. El músic la prem amb el braç per fer sonar els tubs.' }, // i18n-ok: Catalan-only game
      fiscorn: { name: 'Fiscorn', fact: 'El fiscorn és un instrument de vent de metall que forma part de la cobla. Hi aporta sons greus i ajuda a marcar el ritme.' }, // i18n-ok: Catalan-only game
      bengala: { name: 'Bengala', fact: 'Les espurnes d\'una bengala venen de petites partícules que cremen molt calentes. Encara que sigui petita, una bengala pot causar cremades.' }, // i18n-ok: Catalan-only game
      torxa: { name: 'Torxa', fact: 'Per Sant Joan, la Flama del Canigó es reparteix entre moltes poblacions. Amb aquest foc s\'encenen fogueres de la revetlla.' }, // i18n-ok: Catalan-only game
      traca: { name: 'Traca', fact: 'Una traca té diversos petards units per una metxa. Quan s\'encén, els petards esclaten l\'un darrere l\'altre.' }, // i18n-ok: Catalan-only game
      auca: { name: 'Auca', fact: 'Una auca explica una història amb dibuixos ordenats. Sovint, cada vinyeta va acompanyada d\'un rodolí: dos versos que rimen.' }, // i18n-ok: Catalan-only game
      rondalla: { name: 'Rondalla', fact: 'Les rondalles són contes populars que s\'han transmès de boca en boca. Per això una mateixa història pot tenir versions diferents.' }, // i18n-ok: Catalan-only game
      ceramica: { name: 'Ceràmica', fact: 'Per fer ceràmica es modela argila i es cou en un forn. La cocció transforma el fang en un material dur.' }, // i18n-ok: Catalan-only game
      forjat: { name: 'Ferro forjat', fact: 'El ferrer escalfa el metall per poder donar-li forma amb cops de martell. Així es poden fer reixes, eines i altres peces.' }, // i18n-ok: Catalan-only game
      vidre: { name: 'Vidre', fact: 'El vidre es pot fabricar escalfant una barreja de sorra i altres ingredients a molta temperatura. Els humans en fan des de fa milers d\'anys.' }, // i18n-ok: Catalan-only game
      porro: { name: 'Porró', fact: 'El porró té una boca ampla per omplir-lo i un broc estret per beure a galet, sense tocar-lo amb els llavis.' }, // i18n-ok: Catalan-only game
      margarida: { name: 'Margarida', fact: 'El centre d\'una margarida conté moltes flors diminutes agrupades. El que sembla una sola flor és, en realitat, tot un conjunt.' }, // i18n-ok: Catalan-only game
      carro: { name: 'Carro', fact: 'Abans dels camions, els carros transportaven moltes mercaderies. Als Tres Tombs de Valls encara es poden veure carros de feina amb cavalleries.' }, // i18n-ok: Catalan-only game
      canyasucre: { name: 'Canya de sucre', fact: 'La canya de sucre guarda sucre dins la tija. D’un tros de tija amb un brot en pot néixer una planta nova.' }, // i18n-ok: Catalan-only game
      sucre: { name: 'Sucre', fact: 'El sucre de taula es pot obtenir de la canya de sucre o de la remolatxa sucrera. Són dues plantes molt diferents.' }, // i18n-ok: Catalan-only game
      carnaval: { name: 'Carnaval', fact: 'El Carnaval precedeix la Quaresma. És una festa de disfresses i disbauxa, i a Catalunya sovint comença amb el Dijous Gras.' }, // i18n-ok: Catalan-only game
      pintura: { name: 'Pintura', fact: 'Els pigments donen color a la pintura. Es barregen amb un material que els manté units, com l\'oli en la pintura a l\'oli.' }, // i18n-ok: Catalan-only game
      vinya: { name: 'Vinya', fact: 'La vinya té circells, uns filaments que s\'enrosquen als suports. Li serveixen per agafar-se i enfilar-se mentre creix.' }, // i18n-ok: Catalan-only game
      vi: { name: 'Vi', fact: 'El vi s\'obté quan els llevats transformen els sucres del suc de raïm en alcohol i gas. Aquest procés s\'anomena fermentació.' }, // i18n-ok: Catalan-only game
      torrent: { name: 'Torrent', fact: 'Els torrents del Catllar, la Xamora i el Sant Pou travessen o envolten Valls. Les seves aigües acaben arribant al Francolí.' }, // i18n-ok: Catalan-only game
      trestombs: { name: 'Tres Tombs', fact: 'Als Tres Tombs de Valls, carros de feina i cavalleries recorren el barri antic. La festa recorda els antics transports amb animals.' }, // i18n-ok: Catalan-only game
      caramel: { name: 'Caramel vermell', fact: 'A Valls és tradició menjar caramel vermell per Dijous Gras. És una de les menges que anuncien l\'arribada del Carnaval.' }, // i18n-ok: Catalan-only game
      firagost: { name: 'Firagost', fact: 'La Firagost de Valls és una fira del camp que se celebra a l\'agost. Va començar el 1950.' }, // i18n-ok: Catalan-only game
      placablat: { name: 'Plaça del Blat', fact: 'La plaça del Blat de Valls és coneguda com el quilòmetre zero del món casteller. Hi actuen les dues colles de la ciutat.' }, // i18n-ok: Catalan-only game
      francoli: { name: 'Francolí', fact: 'Els torrents de Valls s\'uneixen al sud de la ciutat i acaben desembocant al Francolí. L\'aigua connecta aquests espais naturals.' }, // i18n-ok: Catalan-only game
      muralla: { name: 'Muralla', fact: 'A Valls es conserven restes de muralles medievals. Algunes havien quedat amagades dins de cases construïdes al seu voltant.' }, // i18n-ok: Catalan-only game
      lledo: { name: 'Mare de Déu del Lledó', fact: 'Segons la tradició, la Mare de Déu del Lledó es va trobar el 1366 dins d\'un lledoner. La imatge és d\'alabastre.' }, // i18n-ok: Catalan-only game
      aiguardent: { name: 'Aiguardent', fact: 'Al segle XIX, Valls tenia fàbriques d\'aiguardent. Elaborar aquesta beguda formava part de l\'activitat industrial de la ciutat.' }, // i18n-ok: Catalan-only game
      pell: { name: 'Pell', fact: 'A Valls hi havia adoberies, tallers on es preparaven les pells per fer-ne cuir. Van ser una part important de la indústria local.' }, // i18n-ok: Catalan-only game
      museucasteller: { name: 'Museu Casteller', fact: 'El Museu Casteller de Catalunya és a Valls. Explica els castells i la feina col·lectiva de les persones que els fan possibles.' }, // i18n-ok: Catalan-only game
      teatre: { name: 'Teatre Principal', fact: 'El Teatre Principal de Valls es va construir al segle XIX. L\'arquitecte Ignasi Jordà en va dirigir la construcció.' }, // i18n-ok: Catalan-only game
      oller: { name: 'Narcís Oller', fact: 'Narcís Oller va néixer a Valls. A la novel·la Vilaniu, va transformar records de la seva ciutat en un poble de ficció.' }, // i18n-ok: Catalan-only game
      huguet: { name: 'Jaume Huguet', fact: 'Jaume Huguet va néixer a Valls i va ser un pintor del segle XV. Va pintar escenes religioses per a retaules d\'esglésies.' }, // i18n-ok: Catalan-only game
      figaflawas: { name: 'Figa Flawas', fact: 'Figa Flawas és un duet nascut a Valls. El seu disc La Calçotada porta el nom d\'un dels àpats més coneguts de la ciutat.' }, // i18n-ok: Catalan-only game
      calcofest: { name: 'Calçofest', fact: 'El Calçofest va néixer a Valls per celebrar l\'inici de la temporada de calçotades. Combina música i gastronomia local.' }, // i18n-ok: Catalan-only game
      decennals: { name: 'Decennals', fact: 'Les Decennals de Valls tenen l\'origen en un vot del 1791 a la Mare de Déu de la Candela. Es convoquen cada deu anys.' }, // i18n-ok: Catalan-only game
    },
  },
};
