// PROVISIONAL: every player-facing string lives here until Codex writes the final copy.
export const COPY = {
  games: { alquimia: { name: 'Mulassa Craft' } },
  alquimia: {
    tagline: 'Combina i descobreix la festa', // i18n-ok: provisional, until Codex writes the final copy
    play: 'Juga',
    continue: 'Continua',
    collectionsButton: 'Col·leccions',
    collections: 'Les col·leccions', // i18n-ok: provisional, until Codex writes the final copy
    collectionsHelp: 'El que descobreixes compta a totes les col·leccions.', // i18n-ok: provisional, until Codex writes the final copy
    collectionNames: { catalana: 'Cultura popular catalana', valls: 'Cultura popular catalana + elements de Valls' },
    menu: 'Menú', // i18n-ok: provisional, until Codex writes the final copy
    book: 'Llibre de descobertes',
    clear: 'Buida',
    how: 'Toca dues coses per combinar-les', // i18n-ok: provisional, until Codex writes the final copy
    count: (a, b) => `${a} de ${b}`,
    nothing: 'Res de nou. Prova una altra parella!',
    known: 'Aquesta ja la tens!', // i18n-ok: provisional, until Codex writes the final copy
    fresh: 'Has descobert una cosa nova!', // i18n-ok: provisional, until Codex writes the final copy
    chapterNames: ['Natura', 'Gent', 'Bèsties', 'Festa'], // i18n-ok: provisional, until Codex writes the final copy
    laterChapter: n => `Encara no: és del capítol ${n}`, // i18n-ok: provisional, until Codex writes the final copy
    chapterOpen: n => `Nou capítol: ${n}!`, // i18n-ok: provisional, until Codex writes the final copy
    chapterEmpty: 'Encara és buit. Combina el que tens als altres capítols!', // i18n-ok: provisional, until Codex writes the final copy
    go: 'Continua',
    base: 'Element de sortida',
    missing: n => (n === 1 ? 'Només et falta una cosa per descobrir.' : `Encara et falten ${n} coses per descobrir.`), // i18n-ok: provisional, until Codex writes the final copy
    allFound: 'Ho has descobert tot!', // i18n-ok: provisional, until Codex writes the final copy
    reset: 'Torna a començar', // i18n-ok: provisional, until Codex writes the final copy
    resetSure: 'Segur? S\'esborrarà tot', // i18n-ok: provisional, until Codex writes the final copy
    items: {
      foc: { name: 'Foc' }, terra: { name: 'Terra' }, aigua: { name: 'Aigua' }, vent: { name: 'Vent' },
      carbo: { name: 'Carbó' }, vapor: { name: 'Vapor' }, fum: { name: 'Fum' }, fang: { name: 'Fang' }, pols: { name: 'Pols' }, // i18n-ok: provisional, until Codex writes the final copy
      nuvol: { name: 'Núvol' }, brasa: { name: 'Brasa' }, pedra: { name: 'Pedra' }, mar: { name: 'Mar' }, ventada: { name: 'Ventada' }, // i18n-ok: provisional, until Codex writes the final copy
      muntanya: { name: 'Muntanya' }, pluja: { name: 'Pluja' }, planta: { name: 'Planta' }, arbre: { name: 'Arbre' }, canya: { name: 'Canya' }, fusta: { name: 'Fusta' },
      ceba: { name: 'Ceba' }, vida: { name: 'Vida' }, animal: { name: 'Animal' }, ocell: { name: 'Ocell' },
      calcot: { name: 'Calçot', fact: 'Es diu així perquè es calça: se li tira terra al voltant perquè quedi blanc.' }, // i18n-ok: provisional, until Codex writes the final copy
      calcotada: { name: 'Calçotada', fact: 'Diuen que la va inventar en Xat de Benaiges, però segurament és una llegenda.' }, // i18n-ok: provisional, until Codex writes the final copy
      casa: { name: 'Casa' }, coto: { name: 'Cotó' }, persona: { name: 'Persona' }, colla: { name: 'Colla' }, roba: { name: 'Roba' }, // i18n-ok: provisional, until Codex writes the final copy
      pinya: { name: 'Pinya', fact: 'És la base del castell. Si algú cau, fa de coixí.' }, // i18n-ok: provisional, until Codex writes the final copy
      castell: { name: 'Castell', fact: 'La tradició dels castells va néixer a Valls a principis del segle XIX.' }, // i18n-ok: provisional, until Codex writes the final copy
      enxaneta: { name: 'Enxaneta', fact: 'Puja per un costat, fa l\'aleta i baixa per l\'altre. L\'aleta vol dir que el castell ja és carregat.' }, // i18n-ok: provisional, until Codex writes the final copy
      faixa: { name: 'Faixa', fact: 'S\'enrotlla a la cintura per protegir l\'esquena.' }, // i18n-ok: provisional, until Codex writes the final copy
      gralla: { name: 'Gralla', fact: 'La gralla i el timbal acompanyen la construcció dels castells.' }, // i18n-ok: provisional, until Codex writes the final copy
      timbal: { name: 'Timbal', fact: 'La música dels castells marca els moments clau quan es carreguen i es descarreguen.' }, // i18n-ok: provisional, until Codex writes the final copy
      musica: { name: 'Música' }, ball: { name: 'Ball' }, polvora: { name: 'Pólvora' }, // i18n-ok: provisional, until Codex writes the final copy
      carretilla: { name: 'Carretilla', fact: 'És un coet que corre escopint espurnes i acaba amb un petit pet.' }, // i18n-ok: provisional, until Codex writes the final copy
      tronada: { name: 'Tronada' }, mullat: { name: 'Petard mullat' },
      diables: { name: 'Diables', fact: 'Van de vermell amb dues banyetes. La Diablessa reparteix el foc.' }, // i18n-ok: provisional, until Codex writes the final copy
      correfoc: { name: 'Correfoc', fact: 'El Drac tanca la Festa Major de Sant Joan amb el correfoc.' }, // i18n-ok: provisional, until Codex writes the final copy
      bestia: { name: 'Bèstia' }, // i18n-ok: provisional, until Codex writes the final copy
      drac: { name: 'Drac', fact: 'El Drac de Valls té dos caps i disset punts de foc.' }, // i18n-ok: provisional, until Codex writes the final copy
      mulassa: { name: 'Mulassa', fact: 'La Mulassa de Valls fa 4,60 metres de llarg i la porten quatre persones.' }, // i18n-ok: provisional, until Codex writes the final copy
      aliga: { name: 'Àliga', fact: 'L\'Àliga de Valls porta un colom viu a la boca.' }, // i18n-ok: provisional, until Codex writes the final copy
      bou: { name: 'Bou Tradicional', fact: 'El Bou Tradicional de Valls porta foc als correfocs.' }, // i18n-ok: provisional, until Codex writes the final copy
      cavall: { name: 'Cavall' },
      cavallets: { name: 'Cavallets', fact: 'Hi ballen deu persones, cinc a cada bàndol.' }, // i18n-ok: provisional, until Codex writes the final copy
      gegants: { name: 'Gegants', fact: 'Valls en té quatre: el Gegant de la Porra, la Geganta, el Lladrefaves i la Gegantona.' }, // i18n-ok: provisional, until Codex writes the final copy
      nans: { name: 'Nans', fact: 'No tenen nom: es diuen segons el que fan, com l\'Alcalde o el Sabater.' }, // i18n-ok: provisional, until Codex writes the final copy
      seguici: { name: 'Seguici', fact: 'A la Festa Major de Sant Joan de Valls, el Drac encapçala les sortides del Seguici.' }, // i18n-ok: provisional, until Codex writes the final copy
      espelma: { name: 'Espelma' },
      maredeu: { name: 'Mare de Déu de la Candela', fact: 'Valls celebra les Festes Decennals en el seu honor.' }, // i18n-ok: provisional, until Codex writes the final copy
      sol: { name: 'Sol' },
      arc: { name: 'Arc de Sant Martí' }, // i18n-ok: provisional, until Codex writes the final copy
      sorra: { name: 'Sorra' },
      riu: { name: 'Riu' },
      cova: { name: 'Cova' },
      flor: { name: 'Flor' },
      abella: { name: 'Abella' },
      fruita: { name: 'Fruita' },
      tomaquet: { name: 'Tomàquet' }, // i18n-ok: provisional, until Codex writes the final copy
      escalivada: { name: 'Escalivada' },
      raim: { name: 'Raïm' },
      cercolets: { name: 'Ball de Cercolets', fact: 'Va néixer a les festes de la verema.' }, // i18n-ok: provisional, until Codex writes the final copy
      ferro: { name: 'Ferro' },
      campana: { name: 'Campana' },
      os: { name: 'Ós', fact: 'A la Festa Major, els nens li donen els xumets.' }, // i18n-ok: provisional, until Codex writes the final copy
      ou: { name: 'Ou' },
      serp: { name: 'Serp' },
      basilisc: { name: 'Basilisc', fact: 'Segons una llegenda, neix d\'un ou de gall amb l\'ajuda d\'una serp i un gripau.' }, // i18n-ok: provisional, until Codex writes the final copy
      aligons: { name: 'Aligons', fact: 'Són tres infants que ballen al voltant de l\'Àliga.' }, // i18n-ok: provisional, until Codex writes the final copy
      bastons: { name: 'Ball de Bastons', fact: 'A Valls ja surt el 1712, en una processó.' }, // i18n-ok: provisional, until Codex writes the final copy
      pastor: { name: 'Pastor' },
      pastorets: { name: 'Ball de Pastorets', fact: 'És un ball on també es diuen versos.' }, // i18n-ok: provisional, until Codex writes the final copy
      vaixell: { name: 'Vaixell' },
      galeres: { name: 'Ball de Galeres', fact: 'És un ball amb petits vaixells que recorda una batalla antiga.' }, // i18n-ok: provisional, until Codex writes the final copy
      moixiganga: { name: 'Moixiganga', fact: 'Representa escenes de la història de Jesús.' }, // i18n-ok: provisional, until Codex writes the final copy
      folre: { name: 'Folre', fact: 'És una segona pinya, a sobre de la primera.' }, // i18n-ok: provisional, until Codex writes the final copy
      manilles: { name: 'Manilles', fact: 'Són una tercera pinya, a sobre del folre.' }, // i18n-ok: provisional, until Codex writes the final copy
      camisa: { name: 'Camisa castellera' },
      vella: { name: 'Colla Vella', fact: 'És la colla de Valls de la camisa rosada.' }, // i18n-ok: provisional, until Codex writes the final copy
      joves: { name: 'Colla Joves', fact: 'És la colla de Valls de la camisa vermella.' }, // i18n-ok: provisional, until Codex writes the final copy
      aleta: { name: 'Aleta', fact: 'L\'enxaneta aixeca la mà quan arriba a dalt.' }, // i18n-ok: provisional, until Codex writes the final copy
      carregat: { name: 'Castell carregat', fact: 'Quan l\'enxaneta fa l\'aleta, el castell ja està carregat. Encara falta baixar!' }, // i18n-ok: provisional, until Codex writes the final copy
      descarregat: { name: 'Castell descarregat', fact: 'Vol dir que tothom ha baixat sense caure.' }, // i18n-ok: provisional, until Codex writes the final copy
      poble: { name: 'Poble' },
      esglesia: { name: 'Església' }, // i18n-ok: provisional, until Codex writes the final copy
      campanar: { name: 'Campanar', fact: 'El de Sant Joan de Valls fa 74 metres.' }, // i18n-ok: provisional, until Codex writes the final copy
      placa: { name: 'Plaça' }, // i18n-ok: provisional, until Codex writes the final copy
      diada: { name: 'Diada castellera' },
      valls: { name: 'Valls' },
      festamajor: { name: 'Festa Major', fact: 'L\'Àliga l\'obre des del balcó de la Casa de la Vila.' }, // i18n-ok: provisional, until Codex writes the final copy
      llum: { name: 'Llum' },
      lluminaries: { name: 'Lluminàries', fact: 'Les Decennals també es coneixen com les Festes de la Llum.' }, // i18n-ok: provisional, until Codex writes the final copy
      blat: { name: 'Blat' },
      pa: { name: 'Pa' },
      patomaquet: { name: 'Pa amb tomàquet', fact: 'Es fa sucant una llesca de pa amb mig tomàquet madur, amb oli d\'oliva i sal.' }, // i18n-ok: provisional, until Codex writes the final copy
      salsa: { name: 'Salsa de calçots' }, // i18n-ok: provisional, until Codex writes the final copy
      castanya: { name: 'Castanya' },
      castanyada: { name: 'Castanyada', fact: 'Es menjen castanyes, panellets i moniatos.' },
      montserrat: { name: 'Montserrat', fact: 'És una muntanya de Catalunya plena de roques punxegudes, amb un monestir.' }, // i18n-ok: provisional, until Codex writes the final copy
      santjordi: { name: 'Sant Jordi', fact: 'Diu la llegenda que el cavaller va vèncer el drac. La festa és el 23 d\'abril.' }, // i18n-ok: provisional, until Codex writes the final copy
      rosa: { name: 'Rosa', fact: 'Per Sant Jordi és costum regalar una rosa vermella.' }, // i18n-ok: provisional, until Codex writes the final copy
      paper: { name: 'Paper' },
      llibre: { name: 'Llibre', fact: 'Per Sant Jordi és costum regalar un llibre.' }, // i18n-ok: provisional, until Codex writes the final copy
      sagrada: { name: 'Sagrada Família', fact: 'És a Barcelona. Gaudí hi va treballar fins al 1926, i encara s\'està construint.' }, // i18n-ok: provisional, until Codex writes the final copy
      cobla: { name: 'Cobla', fact: 'És la formació que toca les sardanes: 12 instruments tocats per 11 músics.' }, // i18n-ok: provisional, until Codex writes the final copy
      sardana: { name: 'Sardana', fact: 'Es balla agafats de les mans, formant una rotllana.' }, // i18n-ok: provisional, until Codex writes the final copy
      tio: { name: 'Tió', fact: 'Se\'l tapa amb una manta i se l\'alimenta cada dia fins que caga regals.' }, // i18n-ok: provisional, until Codex writes the final copy
      caganer: { name: 'Caganer', fact: 'És una figureta del pessebre, sovint amagada en un racó.' }, // i18n-ok: provisional, until Codex writes the final copy
      celula: { name: 'Cèl·lula' }, // i18n-ok: provisional, until Codex writes the final copy
      peix: { name: 'Peix' },
      gos: { name: 'Gos' },
      caca: { name: 'Caca de gos' },
      panerola: { name: 'Panerola' },
      fabrica: { name: 'Fàbrica' }, // i18n-ok: provisional, until Codex writes the final copy
      refineria: { name: 'Complex petroquímic' }, // i18n-ok: provisional, until Codex writes the final copy
      sequera: { name: 'Sequera' },
      mosquit: { name: 'Mosquit tigre' },
      llenya: { name: 'Llenya' },
      concurs: { name: 'Concurs de castells', fact: 'Se celebra cada dos anys a Tarragona.' },
      santaursula: { name: 'Santa Úrsula', fact: 'És la copatrona de Valls. La seva fira és a l\'octubre, amb una gran diada castellera.' }, // i18n-ok: provisional, until Codex writes the final copy
      santjoan: { name: 'Sant Joan', fact: 'La Festa Major de Valls és la de Sant Joan.' }, // i18n-ok: provisional, until Codex writes the final copy
      roser: { name: 'Capella del Roser', fact: 'Té rajoles que mostren la batalla de Lepant.' }, // i18n-ok: provisional, until Codex writes the final copy
      lleo: { name: 'Lleó', fact: 'Es va incorporar al Seguici per a les Decennals del 2011.' }, // i18n-ok: provisional, until Codex writes the final copy
      gitanes: { name: 'Ball de Gitanes', fact: 'Es va recuperar el 1985.' }, // i18n-ok: provisional, until Codex writes the final copy
      primera: { name: 'Ball de la Primera', fact: 'És l\'única dansa exclusiva de Valls.' }, // i18n-ok: provisional, until Codex writes the final copy
      bouvalls: { name: 'Bou de Valls', fact: 'No porta foc. El van recuperar el 2012 el Calçot i La Turba.' }, // i18n-ok: provisional, until Codex writes the final copy
      perles: { name: 'Perles' },
      alcaldessa: { name: 'Alcaldessa' },
      botifarra: { name: 'Botifarra' },
      crema: { name: 'Crema catalana' },
      coca: { name: 'Coca de recapte' },
      xato: { name: 'Xató' }, // i18n-ok: provisional, until Codex writes the final copy
      barretina: { name: 'Barretina' },
      espardenyes: { name: 'Espardenyes' },
      mocador: { name: 'Mocador' },
      flabiol: { name: 'Flabiol' },
      sacgemecs: { name: 'Sac de gemecs' },
      fiscorn: { name: 'Fiscorn' },
      bengala: { name: 'Bengala' },
      torxa: { name: 'Torxa' },
      traca: { name: 'Traca' },
      auca: { name: 'Auca' },
      rondalla: { name: 'Rondalla' },
      ceramica: { name: 'Ceràmica' }, // i18n-ok: provisional, until Codex writes the final copy
      forjat: { name: 'Ferro forjat' },
      vidre: { name: 'Vidre' },
      porro: { name: 'Porró' }, // i18n-ok: provisional, until Codex writes the final copy
      margarida: { name: 'Margarida' },
      decennals: { name: 'Decennals', fact: 'Valls les celebra cada deu anys des del 1791, en honor de la Mare de Déu de la Candela.' }, // i18n-ok: provisional, until Codex writes the final copy
    },
  },
};
