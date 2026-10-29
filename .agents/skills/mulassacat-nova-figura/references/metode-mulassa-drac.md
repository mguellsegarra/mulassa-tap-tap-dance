# Mètode après amb la Mulassa i el Drac

Aquest document trasllada aprenentatges dels treballs anteriors. Es va escriure per als dossiers de figures noves; la Mulassa i el Drac no s'han de tornar a implementar.

## 1. Identitat abans de modelar

La figura és un objecte portat per persones. Cal documentar silueta, proporcions, materials, cara, ornaments, faldilles, obertures i cames visibles. Fer una matriu de referències frontal, posterior, laterals i tres quarts. Una sola fotografia no justifica inventar la part del darrere. Registrar autor, URL, data i instant de cada evidència.

Separar peces rígides, articulacions observables i deformacions afegides per estil. El Drac és bicèfal: modelar-lo com un drac genèric no serveix. Els caps i apèndixs han de quedar connectats al cos també durant els girs. Es van detectar peces flotants, colls desconnectats, ales massa grans, cames massa primes, cares coplanàries i parpelleig de transparències. Revisar geometria real, pivots i contacte amb terra; una caixa o esfera aproximada no basta.

Validar vistes frontal/lateral/posterior, volta completa i captures mòbils abans de donar el model per bo. Les proves automàtiques no substitueixen la comparació visual amb la figura real.

## 2. Música: original primer, arranjament després

Buscar la partitura abans de transcriure d'oïda. "No localitzada" no vol dir "no existeix": al Drac es va trobar després una partitura pública que la primera recerca havia passat per alt. Comprovar títol, poble, compositor, edició, veus, instrument transpositor i correspondència amb la gravació.

La reducció de la Mulassa no contenia tota l'orquestració original. La transcripció del Drac tenia una sola veu i compassos dubtosos. Una reducció, una transcripció parcial i una partitura completa són documents diferents. Marcar compassos incerts, repeticions i alternatives; conservar el PDF original separat del material generat.

Crear primer una melodia MIDI de referència, sense ornamentació. Comparar notes, octaves, durades, silencis, anacrusi, repeticions i forma amb dues actuacions. Determinar el tempo per frases i compassos; conservar un mapa de tempo si varia. Les explosions del Drac confonien la detecció de pulsació: intensitat creixent no demostra acceleració. No afegir silencis artificials quan la melodia continua sota els petards.

A la Mulassa es van rebutjar timbres estridents, acords que no encaixaven i acompanyaments que canviaven la sensació rítmica. Conservar versions bones i comparar A/B. L'arranjament nou pot ser càlid i festiu, però s'ha d'etiquetar com a adaptació. No atribuir l'acompanyament generat al compositor original. Una comprovació numèrica de freqüències no equival a una escolta validada.

Lliurar font editable de notes, MusicXML o format equivalent, MIDI, àudio de melodia sola i mescla, script reproduïble i notes de dubtes. No copiar l'estructura de notes especials del joc de la Mulassa a una altra peça: primer la música, després el chart si es demana.

## 3. Ball: observació separada d'adaptació

Mirar almenys dues actuacions completes. Registrar entrada, salutacions, desplaçaments, girs, sentit, eix, inclinacions, balanceig, salts, baixades, repeticions i final. En grups: rols, parelles, formacions i trajectòries individuals. Els fotogrames de contacte només serveixen d'índex; no demostren una seqüència completa.

Crear una taula amb vídeo, temps inicial/final, observació, compàs/beat corresponent i confiança. Separar moviments estables de variants d'actuació. A la Mulassa es va observar una seqüència general, però el nombre exacte de voltes, els beats i les amplituds de la versió del joc eren adaptacions artístiques.

El Drac mostrava posicions baixes mantingudes durant segons; alternar-les molt ràpidament produïa una animació inventada. Evitar oscil·ladors independents en cada peça. Una única línia temporal musical ha de determinar postura i moviment. Mateix temps = mateixa pose, encara que es reprengui o salti la reproducció. Fer servir segons i beats, no comptadors de frames ni aleatorietat.

Revisar contacte de peus, centre de gir, connexions del model, acceleracions, continuïtat i retorn al repòs durant tota la peça. Validar diverses taxes de refresc, moviment reduït i càmeres. No donar per acabat un ball només perquè passen els tests.

## Evidència i lliurables

Cada afirmació específica ha de portar font i, quan correspon, minutatge. Etiquetes: observat, inferit, adaptat, pendent. Conservar els originals. Guardar derivats amb nom i procedència. El paquet aporta recursos per treballar, no una transcripció musicològica ni una coreografia ja certificades. La disponibilitat pública d'un recurs no certifica una llicència de redistribució comercial.
