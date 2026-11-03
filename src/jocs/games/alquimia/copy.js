// PROVISIONAL where marked: player-facing strings live here, Catalan only (this game has no translations yet).
export const COPY = {
  games: { alquimia: { name: 'Mulassa Alchemy', blurb: 'Barreja i mira què surt' } }, // i18n-ok: Catalan-only game
  alquimia: {
    tagline: 'Barreja dues coses i a veure què surt', // i18n-ok: Catalan-only game
    play: 'Juga', // i18n-ok: Catalan-only game
    continue: 'Continua', // i18n-ok: Catalan-only game
    menu: 'Menú', // i18n-ok: Catalan-only game
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
    hintNone: 'Ja ho has descobert tot!', // i18n-ok: Catalan-only game
    go: 'Continua', // i18n-ok: Catalan-only game
    base: 'Element de sortida', // i18n-ok: Catalan-only game
    missing: n => (n === 1 ? 'Només et falta una cosa per descobrir.' : `Encara et falten ${n} coses per descobrir.`), // i18n-ok: Catalan-only game
    allFound: 'Ho has descobert tot!', // i18n-ok: Catalan-only game
    reset: 'Torna a començar', // i18n-ok: Catalan-only game
    resetSure: 'Vols esborrar les descobertes?', // i18n-ok: Catalan-only game
    items: {
      foc: { name: 'Foc' }, terra: { name: 'Terra' }, aigua: { name: 'Aigua' }, vent: { name: 'Vent' }, // i18n-ok: Catalan-only game
      carbo: { name: 'Carbó' }, vapor: { name: 'Vapor' }, fum: { name: 'Fum' }, fang: { name: 'Fang' }, pols: { name: 'Pols' }, // i18n-ok: Catalan-only game
      nuvol: { name: 'Núvol' }, brasa: { name: 'Brasa' }, pedra: { name: 'Pedra' }, mar: { name: 'Mar' }, ventada: { name: 'Ventada' }, // i18n-ok: Catalan-only game
      muntanya: { name: 'Muntanya' }, pluja: { name: 'Pluja' }, planta: { name: 'Planta' }, arbre: { name: 'Arbre' }, canya: { name: 'Canya' }, fusta: { name: 'Fusta' }, // i18n-ok: Catalan-only game
      ceba: { name: 'Ceba' }, vida: { name: 'Vida' }, animal: { name: 'Animal' }, ocell: { name: 'Ocell' }, // i18n-ok: Catalan-only game
      calcot: { name: 'Calçot', fact: 'Es diu així perquè es calça: se li tira terra al voltant perquè quedi blanc.' }, // i18n-ok: Catalan-only game
      calcotada: { name: 'Calçotada', fact: 'Diuen que la va inventar en Xat de Benaiges, però segurament és una llegenda.' }, // i18n-ok: Catalan-only game
      casa: { name: 'Casa' }, coto: { name: 'Cotó' }, persona: { name: 'Persona' }, colla: { name: 'Colla' }, roba: { name: 'Roba' }, // i18n-ok: Catalan-only game
      pinya: { name: 'Pinya', fact: 'És la base del castell. Si algú cau, fa de coixí.' }, // i18n-ok: Catalan-only game
      castell: { name: 'Castell', fact: 'La tradició dels castells va néixer a Valls a principis del segle XIX.' }, // i18n-ok: Catalan-only game
      enxaneta: { name: 'Enxaneta', fact: 'Puja per un costat, fa l\'aleta i baixa per l\'altre. L\'aleta vol dir que el castell ja és carregat.' }, // i18n-ok: Catalan-only game
      faixa: { name: 'Faixa', fact: 'S\'enrotlla a la cintura per protegir l\'esquena.' }, // i18n-ok: Catalan-only game
      gralla: { name: 'Gralla', fact: 'La gralla i el timbal acompanyen la construcció dels castells.' }, // i18n-ok: Catalan-only game
      timbal: { name: 'Timbal', fact: 'La música dels castells marca els moments clau quan es carreguen i es descarreguen.' }, // i18n-ok: Catalan-only game
      musica: { name: 'Música' }, ball: { name: 'Ball' }, polvora: { name: 'Pólvora' }, // i18n-ok: Catalan-only game
      carretilla: { name: 'Carretilla', fact: 'És un coet que corre escopint espurnes i acaba amb un petit pet.' }, // i18n-ok: Catalan-only game
      tronada: { name: 'Tronada' }, mullat: { name: 'Petard mullat' }, // i18n-ok: Catalan-only game
      diables: { name: 'Diables', fact: 'Van de vermell amb dues banyetes. La Diablessa reparteix el foc.' }, // i18n-ok: Catalan-only game
      correfoc: { name: 'Correfoc', fact: 'El Drac tanca la Festa Major de Sant Joan amb el correfoc.' }, // i18n-ok: Catalan-only game
      bestia: { name: 'Bèstia' }, // i18n-ok: Catalan-only game
      drac: { name: 'Drac', fact: 'El Drac de Valls té dos caps i disset punts de foc.' }, // i18n-ok: Catalan-only game
      mulassa: { name: 'Mulassa', fact: 'La Mulassa de Valls fa 4,60 metres de llarg i la porten quatre persones.' }, // i18n-ok: Catalan-only game
      aliga: { name: 'Àliga', fact: 'L\'Àliga de Valls porta un colom viu a la boca.' }, // i18n-ok: Catalan-only game
      bou: { name: 'Bou Tradicional', fact: 'El Bou Tradicional de Valls porta foc als correfocs.' }, // i18n-ok: Catalan-only game
      cavall: { name: 'Cavall' }, // i18n-ok: Catalan-only game
      cavallets: { name: 'Cavallets', fact: 'Hi ballen deu persones, cinc a cada bàndol.' }, // i18n-ok: Catalan-only game
      gegants: { name: 'Gegants', fact: 'Valls en té quatre: el Gegant de la Porra, la Geganta, el Lladrefaves i la Gegantona.' }, // i18n-ok: Catalan-only game
      nans: { name: 'Nans', fact: 'No tenen nom: es diuen segons el que fan, com l\'Alcalde o el Sabater.' }, // i18n-ok: Catalan-only game
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
      os: { name: 'Ós', fact: 'A la Festa Major, els nens li donen els xumets.' }, // i18n-ok: Catalan-only game
      ou: { name: 'Ou' }, // i18n-ok: Catalan-only game
      serp: { name: 'Serp' }, // i18n-ok: Catalan-only game
      basilisc: { name: 'Basilisc', fact: 'Segons una llegenda, neix d\'un ou de gall amb l\'ajuda d\'una serp i un gripau.' }, // i18n-ok: Catalan-only game
      aligons: { name: 'Aligons', fact: 'Són tres infants que ballen al voltant de l\'Àliga.' }, // i18n-ok: Catalan-only game
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
      peix: { name: 'Peix' }, // i18n-ok: Catalan-only game
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
      lleo: { name: 'Lleó', fact: 'Es va incorporar al Seguici per a les Decennals del 2011.' }, // i18n-ok: Catalan-only game
      gitanes: { name: 'Ball de Gitanes', fact: 'Es va recuperar el 1985.' }, // i18n-ok: Catalan-only game
      primera: { name: 'Ball de la Primera', fact: 'És l\'única dansa exclusiva de Valls.' }, // i18n-ok: Catalan-only game
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
