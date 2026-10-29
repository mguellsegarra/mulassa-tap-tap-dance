# Prompt per a Opus: integrar el Drac al joc real

Actua amb Claude Opus com a responsable de la implementació i de la validació. Vull aprofitar la recerca i la comparativa que ja he revisat amb Codex per incorporar al joc real la música del Drac, el model actualitzat, la coreografia, les cames naturals i els ajudants. Implementa-ho i deixa'm una versió local jugable per revisar. No et quedis en un pla.

Aquest document recull l'estat comprovat el 19 d'octubre de 2026. Verifica l'estat actual dels repositoris abans de treballar. No pressuposis que una proposta antiga és la versió acceptada. Parla'm en català planer.

## 1. Objectiu i abast

- Integrar la proposta dins del flux real del joc: selecció del Drac, càrrega, partida, pausa, represa, final, reintent i retorn al selector.
- Reutilitzar el model del Drac i les millores de moviment de la comparativa més recent. No redissenyar-ne la identitat ni tornar a començar la coreografia des de zero.
- Integrar la música acordada amb els canvis de velocitat per frases, i sincronitzar-hi coreografia, passes, flexió, ajudants i notes jugables.
- Substituir les quatre marques W/N/S/E per models dels ajudants de la colla, amb la indumentària real del Drac, inclòs el camuflatge observat a la referència.
- Afegir altres membres de la colla asseguts a la plaça. Són personatges diferents dels quatre ajudants que orienten el portador.
- Conservar una comparativa de validació amb vídeo, render del joc i vista zenital sincronitzats.
- Deixar-ho preparat per a la meva revisió local. Integrar al joc no vol dir publicar, desplegar o fusionar automàticament.

## 2. Repositoris i preservació del treball

Origen de la proposta actual, anomenat SOURCE en aquest document:

`~/.codex/worktrees/drac-reference-trial/mulassa-de-valls`

Destinació funcional a inspeccionar, anomenada TARGET:

`~/.t3/worktrees/mulassa-de-valls/t3-b0a52b07`

A l'última comprovació TARGET era la branca `t3/character-select-v1-2-0`, HEAD `fb3a8fb`, amb canvis locals. SOURCE era un worktree separat en detached HEAD `68f1433`, amb molts canvis i fitxers nous sense commit. El repositori principal és `~/development/mulassa-de-valls`; no assumeixis que la seva branca és la del selector.

1. Llegeix els AGENTS.md aplicables. Inspecciona branca, HEAD, worktrees, diff i fitxers nous dels dos arbres.
2. Prepara una integració local aïllada basada en l'estat vigent del selector, preservant els seus canvis locals. Un worktree nou des de HEAD no incorpora automàticament aquests canvis: resol-ho explícitament i comprova la base abans de portar el Drac.
3. Conserva SOURCE com a referència revisable. No copiïs tot el seu arbre damunt de TARGET: conté treball heretat de selector, serveis, base de dades i altres sistemes que no forma part d'aquesta integració.
4. Trasllada només el codi i les dependències necessàries. Compara les versions dels mòduls compartits abans de sobreescriure res.
5. No facis reset, clean, stash o altres operacions que ocultin o eliminin treball aliè. No toquis altres worktrees ni processos.
6. Cada commit, push, merge, rebase, cherry-pick o altra operació d'història requereix la meva confirmació concreta en xat segons AGENTS.md. El mateix per a escriptures a GitHub, desplegaments i producció. No afegeixis atribucions d'IA.

## 3. Ordre de les fonts: evita recuperar una versió antiga

La font principal del moviment actual és SOURCE + `/src/dev/drac-compare/`, amb la pàgina SOURCE + `/drac-compare.html`. La carpeta SOURCE + `/src/dev/drac-lab/` és una proposta anterior. Pot aportar eines musicals i el helper de rigidesa que encara usa la comparativa, però la seva coreografia no substitueix la de `drac-compare`.

Fitxers de la comparativa que has de llegir conjuntament:

- `path.js`: desplaçament, orientació contínua i girs, en segons del vídeo.
- `phrases.js`: 33 intervals auditats, descripcions, recomptes i graus de certesa.
- `steps.js`: contactes, trajectòries dels peus i canvis de suport.
- `pose.js`: moviment del cos i capa d'expressivitat amb flexió de genolls.
- `pulse.js`: pols estimat del vídeo; NO és la graella musical definitiva del joc.
- `rig.js`: pelvis del portador separada de la torsió de la carcassa.
- `carrier-legs.js`: genolls i pantalons continus, amb la correcció dels plecs del turmell.
- `helpers.js`: posicions i orientacions corregides dels quatre ajudants.
- `overhead.js`: representació zenital del recorregut actual del model.
- `stage.js`, `camera.js`, `main.js`, `clock.js`: render, càmera aproximada i controls de la comparativa.

Model base real que instancia la comparativa: SOURCE + `/src/scene/models/drac.js`. La millora actual no és un nou fitxer GLB: combina aquest model amb el rig, les cames i les poses anteriors. Copiar només `models/drac.js` perdria part essencial del resultat.

Referència local:

- SOURCE + `/public/drac-reference/pm-lEViiPK0.mp4`.
- SOURCE + `/public/drac-reference/choreography-audit/steps-v2/phrases-reviewed.json`.
- SOURCE + `/public/drac-reference/choreography-audit/steps-v2/step-events.json`.
- SOURCE + `/public/drac-reference/choreography-audit/steps-v2/first-steps.md` i `phrases-middle.md`.
- Dossier: `~/Desktop/Bestiari de Valls - I+D/Drac/revisio-2026-10-18/`.
- Vídeo original: https://www.youtube.com/watch?v=pm-lEViiPK0, Ball del Drac de Valls, El Camp Difusió, Sant Joan 2018.

Els assets de referència són locals i poden estar ignorats per Git. Comprova que existeixen abans d'interpretar una pàgina buida com una regressió. No els empaquetis com a dependència del joc publicable.

## 4. Coreografia i qualitat del moviment que cal conservar

El primer avanç segueix S; després recula cap a N sense fer mitja volta, retorna cap a la zona central, avança cap a W, recula cap a E passant pel centre i torna a preparar el gir. No converteixis això en una seqüència genèrica de quatre passes iguals en totes les direccions.

Fites de la reconstrucció actual, en segons del vídeo:

- 0–16,7: anades, reculades, retorns i preparació del gir.
- 16,7–19,8: una volta antihorària.
- 19,8–28,8: torsions de la carcassa amb els suports gairebé fixos, canvis de pes i preparació de sortida.
- 28,8–44,3: gambades, recorregut en arc, passada propera a càmera, retorn i assentament.
- 44,3–59: segona seqüència de desplaçaments; 59–60 prepara el gir.
- 60–63,4: una altra volta antihorària.
- 63,4–72,8: torsions, canvis de pes i preparació.
- 72,8–86,4: segona sortida en arc i retorn.
- 86,4–93,8: tres voltes antihoràries cada vegada més ràpides.
- 93,8–94,8: frenada i preparació del canvi de sentit.
- 94,8–104: sis voltes horàries segons l'auditoria actual.
- 104–104,8: assentament final.

Els detalls exactes són als fitxers auditats. A l'última prova hi havia 188 col·locacions planificades: 40 observades, 4 probables, 4 accions de suport i 140 adaptacions. No presentis les 188 com a passos comprovats al vídeo. Les distàncies i molts angles són aproximats; la vista zenital mostra el model, no una mesura independent de la realitat.

Mantén:

- La sensació d'una persona portant una bèstia rígida. Caps, colls, ales, boques i cua acompanyen la carcassa; evita animar-los com un animal viu si no ho hem demanat.
- La flexió al ritme i el balanceig una mica còmic que vaig demanar per donar vida als trams més quiets. Conserva'n la base i la intensitat actual com a punt de partida.
- La separació entre torsió de la carcassa, orientació de pelvis i recolzament dels peus.
- Peus plantats estables; passa que s'aixeca, avança i recolza amb suavitat. Evita patinatge, salts de posició, cames creuades, articulacions invertides, pantalons oberts o peus separats dels baixos.
- Trajectòries contínues i el sentit dels girs. No normalitzis cada angle a ±180° si això elimina voltes completes.

Errors ja rebutjats: drac gairebé immòbil, moviment genèric deslligat del vídeo, cames rígides o de goma, genolls tallats, pelvis obligada a girar amb la carcassa sobre peus fixos, girs tots en el mateix sentit i passos que només semblen correctes des d'una càmera.

## 5. Marques i nous ajudants

La convenció corregida i validada per mi és aquesta:

- S segueix el vector del primer avanç, de `SPOTS.S0` a `SPOTS.A`.
- N és l'oposat; W i E formen l'eix perpendicular.
- El centre dels ajudants és `SPOTS.S0` passat a metres. El radi actual és 4,5 m, provisional.
- La càmera és una referència independent. S NO és la càmera. W/N/S/E tampoc no són els eixos de pantalla ni el nord geogràfic verificat.

Reutilitza `helpers.js` com a font comuna. Si trasllades o gires l'escena del ball dins la plaça, aplica la mateixa transformació al recorregut, als peus, als ajudants i als elements de depuració. No dupliquis coordenades a mà. Les posicions del ball són unitats de model; les dels ajudants ja són metres. Respecta `DRAC_SCALE` i evita aplicar-lo dues vegades.

Substitueix els placeholders per quatre persones recognoscibles de la colla:

1. Extreu i mira fotogrames on es vegi bé la roba. Reprodueix colors, patró de camuflatge, mocadors, peces verdes i altres detalls que efectivament es vegin. No assumeixis un uniforme militar genèric ni inventis equipament.
2. Estil voxel coherent amb el joc, proporcions humanes i detalls llegibles al mòbil.
3. Orientats cap al drac, piquen de mans al pols musical real de la partida. Els braços han de fer un gest llegible, suau i sense travessar el cos.
4. Són referències estables del portador. No han de derivar amb la multitud, seguir el drac ni girar amb ell. Qualsevol separació necessària per evitar col·lisions ha de preservar la seva funció i el retorn a lloc.
5. Comprova tot el recorregut, incloses les ales i la cua, abans de donar per bones les distàncies. Si cal ajustar el radi provisional per encabir el model, explica-ho i mostra-ho.
6. Mantén les lletres com a capa de depuració activable; el joc normal ha de mostrar els ajudants, sense lletres flotants.

Afegir també membres de la colla asseguts al voltant de la plaça: col·locació coherent amb bancs, voreres o seients disponibles; malucs recolzats, genolls flexionats i peus ben situats. Roba coherent amb la referència, petites variants de postura i algun gest contingut al ritme. Mantén lliures l'espai del ball i la càmera. No substitueixis tot el públic pel mateix personatge de camuflatge. Adapta quantitat i detall als nivells de qualitat.

## 6. Música: reaprofitar la recerca sense donar per resolt el que encara no ho està

Llegeix SOURCE + `/docs/drac-reference-trial.md`, distingint que descriu el laboratori anterior. Consulta també:

- SOURCE + `/music/drac-score.json`, `/music/drac-form.json`, `/music/drac-trial-form.json` i `/music/drac-arrangement.json`.
- SOURCE + `/tools/build_drac.py`, `/tools/build_drac_trial.py` i `/src/music-form/`.
- SOURCE + `/public/music/drac-trial-v1-austera.mp3`, `/public/music/drac-trial-v1-festiu.mp3` i `/public/music/drac-trial-v1.json`.
- El dossier de recerca, especialment `audio-diagnostics.json` i els ancoratges de comparació amb el vídeo.

Vull la música que hem acordat, amb acceleració perceptible als trams corresponents. No confonguis que "el so funciona" amb haver aprovat el timbre, l'arranjament o la sincronització.

En la documentació llegida per preparar aquest handoff encara hi ha dues variants, Austera i Festiva, sense una selecció final explícita verificable. Recupera qualsevol decisió posterior disponible. Si no pots determinar quina vaig triar, fes-me una sola pregunta concreta amb aquestes opcions mentre avances en la integració independent d'aquesta tria. No inventis que una és l'aprovada.

La prova antiga utilitza aproximadament 121–151 BPM i documenta una discrepància tardana: la coda arriba uns 2,5 s abans de l'ancoratge comparat. El retorn llarg D.S. també es descriu com a hipòtesi. Revisa i resol la correspondència escoltant i comparant frases; no copiïs la taula de tempo com si fos una transcripció definitiva. Els tests estructurals no acrediten que la música soni bé.

Requisits d'integració:

- Una sola graella temporal per a música, notes, moviments i palmades. Respecta els canvis de tempo; no fixis un BPM constant.
- Defineix una correspondència explícita i monotònica entre segons del vídeo, frases musicals i temps/polsos de la partida. Inclou entrada, anacrusi, pauses i final. No facis un simple escalat global de durada per amagar desajustos.
- Atenció: a la comparativa `pose.beat` conté segons del vídeo, encara que es digui beat. El joc real espera índexs de pulsació en altres mòduls. No connectis aquestes funcions directament sense adaptar-ne el contracte.
- Conserva la correspondència del pla de peus amb el recorregut en convertir el temps. Recalcula o valida contactes i velocitats amb el tempo final.
- Substitueix el pols estimat de `pulse.js` pel pols de la música definitiva per a la capa còmica i els ajudants.
- Genera música, metadades, hashes de memòria cau i notes pel generador corresponent. No editis JSON generat a mà ni mantinguis dues fonts d'arranjament divergents.
- Mantén les regles del joc: colors GUA/PA, GUAPA, holds, globus, dificultats, energia, final i rellotge d'àudio únic.
- No alteris l'àudio de la Mulassa o d'altres figures. Compara'n els hashes abans i després.
- Revisa la càrrega i els canvis de selecció: cap pista antiga ha de tornar a sonar després d'un canvi, una pausa o una càrrega que ha quedat obsoleta.

## 7. Arquitectura i connexió amb el joc

Inspecciona a TARGET els equivalents actuals de `src/figures/drac/dance-drac.js`, `src/figures/drac/drac-feet.js`, `src/figures/drac/drac-motion.js`, `src/figures/drac/drac-show.js`, `src/figures/drac/drac.js`, `src/game/figure-song.js`, `src/game/figures.js`, `src/scene/stage.js`, `src/platform/audio.js` i `src/song-drac.json`.

Extreu el codi necessari de la comparativa cap a mòduls de producció cohesius. La partida no ha d'importar controls DOM de dev, el vídeo de referència, el rellotge del reproductor o tot el laboratori. La comparativa ha de poder consumir el mateix motor de moviment que la partida, per evitar que el prototip es vegi bé mentre el joc encara usa la versió antiga.

Mantén separats: dades de coreografia, transformació de temps, poses, rig, models dels ajudants i gestió d'escena. Respecta límits de mòduls i absència de cicles. Reutilitza vectors, buffers, geometries i materials; no afegeixis assignacions per fotograma o una geometria nova a cada pas.

Comprova les transicions del Drac a les altres figures: eliminació dels ajudants quan toca, absència de models duplicats, càmera i àudio correctes, materials alliberats quan correspon i cap contaminació dels altres balls. També revisa pràctica, resultats i mode foto si comparteixen aquests mòduls.

La càmera de comparació reprodueix aproximadament la gravació; la de partida ha de respectar HUD, pad, plaça i enquadrament del joc. No enganxis una a l'altra ni redueixis el moviment per ocultar problemes de càmera. Valida el ball amb una càmera fixa i amb vista zenital, a més de la càmera de joc.

## 8. Organització de la feina amb Opus

Fes una lectura inicial i presenta una proposta breu de divisió del treball. Pots delegar peces ben delimitades: sincronització musical, adaptació del moviment i rig, models dels ajudants i públic assegut, i revisió visual independent. Si uses agents, defineix fitxers no solapats i explica'ls els mateixos límits de permisos. Mantén Opus com a responsable de les decisions i de la integració; no canviïs silenciosament de model si arriba al límit.

No cal preguntar-me cada decisió reversible. Avança amb criteri, i pregunta només pels acords que realment falten o les operacions que AGENTS.md sotmet a confirmació. Completa una versió revisable abans de demanar aprovació per incorporar-la definitivament.

## 9. Validació obligatòria

Proves existents a SOURCE que cal llegir i adaptar quan canviïn ubicacions o contractes, conservant-ne el sentit:

- `tests/figures/drac/drac-compare.mjs`.
- `tests/figures/drac/drac-compare-comic.mjs`.
- `tests/figures/drac/drac-natural-steps.mjs`.
- `tests/figures/drac/drac-cloth-probes.mjs`.
- `tests/drac-trial.mjs`, `tests/drac-trial-audio.py` i els tests musicals del joc.

No afluixis toleràncies per fer passar una regressió. Una prova específica d'una hipòtesi antiga sí que s'ha d'actualitzar quan la nova forma musical la substitueixi, documentant la raó.

Comprova:

1. Tota la seqüència, especialment unions de frases, torsions, trajectes llargs, frenada i inversió final. Mostreig a 30/60/120 fps; absència de discontinuïtats, penetracions i peus que llisquen mentre estan plantats.
2. Mateixa pose per al mateix instant després d'un salt temporal, pausa, represa o reinici. Mateix ball en totes les dificultats; els accents de joc han de ser limitats i no acumular rumb.
3. Música i moviment alineats al principi, en diverses frases intermèdies, en l'acceleració i al final. Anota discrepàncies amb temps concret.
4. Comparació visual al mateix instant: vídeo original, render amb el codi compartit de producció i vista zenital. No n'hi ha prou amb l'afirmació que el servidor arrenca.
5. Ajudants en les quatre direccions correctes, orientats al portador, palmades creïbles i cap intersecció amb el Drac. Asseguts amb contacte correcte amb el seient i peus, sense bloquejar el ball.
6. Mòbil 375×667 i 393×852, mòbil horitzontal, tauleta i escriptori. Prova selecció, partida completa, pausa, reintent i canvi de figura. Revisa rendiment i nivells de qualitat sense augmentar DPR o ombres gratuïtament.
7. La validació automatitzada de navegador es fa sempre amb `?mute`. Per validar la música, utilitza escolta explícita dels fitxers locals o un flux d'àudio autoritzat; no afirmis haver-la escoltat si només n'has analitzat les dades.
8. `npm run check` verd i comprovació del build de producció. L'allowlist de Pages rebutja actualment alguns assets de trial: integra només els finals necessaris i mantén fora vídeos, WAVs de recerca i material de depuració. No desactivis l'allowlist globalment.

L'últim `npm run check` de SOURCE va passar després de corregir els punts cardinals; això no valida la futura integració a TARGET. Torna a executar els controls sobre el resultat final. Tampoc no donis per provat l'iPhone físic amb un emulador: diferencia les comprovacions fetes de les pendents.

## 10. Entrega que espero

- Versió jugable real del Drac amb música, moviment i personatges integrats localment.
- Comparativa conservada i enllaçada per revisar discrepàncies.
- URL del Mac i URL LAN del mòbil comprovades, amb el servidor lligat a la xarxa. L'última comparativa era a `http://localhost:5186/drac-compare.html?mute`; verifica port i IP actuals, no reutilitzis una IP antiga sense provar-la.
- Captures o clips dels primers passos S/N, W/E, una torsió, una passada llarga i el canvi de sentit final; inclou també ajudants i asseguts.
- Explicació breu en català: què has reutilitzat, què has corregit, quina música has integrat, què has verificat i què queda aproximat o pendent de la meva revisió.
- Llista precisa dels fitxers modificats i dels resultats de proves. Actualitza el handoff amb les decisions noves.

L'èxit és que el Drac del joc executi el treball revisat, amb la música adequada i les persones de la colla, sense perdre les millores de la comparativa ni introduir regressions. No declaris acabada la fidelitat artística només perquè les proves passen. Deixa'm el resultat local per afinar-lo junts abans de fusionar o publicar.
