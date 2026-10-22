# Pla per estudiar i animar una nova figura del bestiari

## Encàrrec per a l'agent

Vull aplicar a **[FIGURA I POBLACIÓ]** el mètode treballat amb el Drac i la Mulassa. Treballa a **[REPO / WORKTREE / BRANCH]**. El model de partida és **[MODEL EXISTENT, SI N'HI HA]** i les referències inicials són **[ENLLAÇOS, SI N'HI HA]**.

L'objectiu inicial és una reconstrucció revisable del ball, amb vídeo real, model 3D i vista zenital sincronitzats. Després de validar-la, adapta-la al joc, la música i el visor lliure dins de l'abast autoritzat. No donis per aprovada una fase que encara no he revisat.

Si he demanat Opus, fes servir Opus. Si no està disponible, explica-ho abans de substituir-lo. Si delegues, reparteix tasques concretes i conserva la responsabilitat de comparar i validar el resultat final.

## 1. Recupera la feina i protegeix el que ja funciona

- Llegeix les instruccions del repo i la skill `.agents/skills/bestiari-reference-analysis/SKILL.md`, si hi són. Revisa els dossiers de `research/bestiari/` abans de repetir investigacions.
- Comprova el worktree, la branch, els canvis locals i els servidors existents. No trepitgis feina d'altres agents. Copiar només HEAD no conserva canvis sense commit.
- Reutilitza el comparador, les eines de vídeo, el sistema de música i els ajudants existents quan serveixin.
- Conserva una versió accessible del model i el ball actuals per comparar. No facis commits, publicacions ni integracions entre branches sense l'autorització exigida pel repo.
- Del Drac i la Mulassa, reaprofita el mètode. No copiïs els seus passos, uniformes, nombre de portadors, direccions o tempos com si fossin universals.

## 2. Troba referències que permetin veure el ball

- Busca una actuació completa i contínua, amb silueta, cap, faldilla, peus, terra i elements fixos de la plaça visibles, i àudio aprofitable.
- Confirma figura, població i variant. No confonguis la figura principal amb una versió petita, antiga o d'una altra població.
- Contrasta amb una segona actuació o angle. Explica què es repeteix i què canvia; no barregis dues coreografies sense dir-ho. Si no trobes una segona font útil, documenta el límit.
- Guarda vídeo i àudio per analitzar-los quan sigui possible i estigui permès. Anota URL, autor, acte, data si es coneix, durada, fps, resolució, fitxer i hash. Conserva el temps original del vídeo.
- Desa documentació, dades i codi al repo. Mantén els vídeos grans fora de la publicació del joc, amb un registre que permeti recuperar-los.
- Marca cada conclusió com a observada, inferida, adaptació artística o pendent. Els peus tapats no permeten comptar passes exactes.

## 3. Explica primer el ball en paraules planeres

Mira TOT el vídeo. Prepara una seqüència per intervals que expliqui on és la figura, cap on mira i què fa.

Exemple de format, no de coreografia real:

> 0–10 s: comença al centre mirant cap a S. Fa quatre passes endavant i torna. Després gira cap a W i es balanceja abans de començar el tram següent.

Només escriu "quatre passes" si les has pogut comptar. Si no, indica "avança amb passes curtes; recompte incert".

Per a cada fase, registra:

- Temps inicial i final, acció i grau de certesa.
- Cap on mira i cap on es desplaça: poden ser direccions diferents.
- Avanç, retrocés, passes laterals, diagonals, retorn al centre i velocitat aproximada.
- Girs: quant gira, en quin sentit i quan canvia al sentit contrari.
- Balanceig, pujades, baixades, inclinacions, moviment del cap i pauses.
- Relació amb la frase musical i diferències entre repeticions.

No declaris una fase quieta perquè no gira. Pot avançar, canviar el pes o moure el cap. Si al vídeo recorre espai ràpidament, el model també ho ha de mostrar.

## 4. Defineix la plaça i les direccions

- Proposa quatre marques fixes N, W, S i E com a guió del ball. Explica quina orientació inicial les defineix i si són convencionals o geogràfiques.
- La càmera té una marca separada. No pressuposis que és al S ni que avançar és anar cap a la càmera.
- Dedueix la trajectòria amb punts estables del terra i del fons. Separa moviment real, panoràmica, zoom i seguiment de càmera.
- Quan la figura gira, una peça de roba visible pot passar a ser una altra cara. No converteixis aquest canvi de referència en un salt de posició.
- Prioritza accions comprensibles: avançar cap a W, tornar, mitja volta, balanceig. Evita recorreguts erràtics produïts per seguir soroll de la imatge.
- Indica les distàncies aproximades. El moviment en píxels no demostra metres recorreguts.

## 5. Analitza també la música

- Escolta l'àudio i identifica melodia, entrada, frases, repeticions, silencis, notes sostingudes i final. Si no pots escoltar-lo, declara aquesta part pendent: una forma d'ona no substitueix l'escolta.
- Comprova si realment accelera cada certes frases. Més volum, percussió o notes no significa necessàriament més tempo.
- Compara amb la música actual del joc. Explica què no coincideix i on.
- Mantén una correspondència explícita entre segons del vídeo, segons de la música del joc i pulsacions. Ball, notes del joc i final han de compartir el rellotge musical.
- Primer conserva una reconstrucció amb el temps de la referència. Després prepara, si està demanat, una versió més festiva i accelerada per frases.
- Respecta l'estil sonor aprovat del projecte. En aquest joc, càlid, festiu i sense timbres estridents. No substitueixis el caràcter musical per un arranjament genèric.
- Regenera música, dades i pistes amb les eines existents; no editis manualment fitxers generats. Si escurces la peça, tria frases i documenta els moviments conservats. No comprimeixis tot el vídeo uniformement per fer-lo cabre.
- Deixa àudios comparables abans/després. Les proves automàtiques del navegador han d'anar silenciades; l'escolta és una validació separada.

## 6. Conserva la identitat del model

- Si ja hi ha un model aprovat, conserva silueta, proporcions, cap, coll, cos, roba i colors, excepte canvis expressament demanats.
- No deformis el model per ocultar problemes d'animació. Determina si l'error és de geometria, articulacions, moviment o càmera.
- Si cal crear-lo, parteix de diverses vistes de la figura real i valida primer les proporcions.
- Analitza el balanceig del cap i del cos. Si el cap real es mou amb tota l'estructura, no inventis un coll articulat d'animal.
- Mantén la base fidel i afegeix una mica d'exageració festiva quan es demani: pes, flexió, rebot i balanceig. Evita sacsejades o moviment aleatori que desfiguri el ball.

## 7. Cames i peus simples, suaus i naturals

- Investiga quants portadors hi ha i què es veu sota la roba. No heretis automàticament el nombre de la Mulassa o del Drac.
- Representa persones portant una estructura. Evita l'efecte d'aranya, genolls exagerats i cames inclinades totes alhora.
- Quan la referència ho permeti, amaga cuixes i genolls i mostra sobretot camals curts i sabates. És preferible una solució simple que una anatomia complexa que queda rara.
- Els peus recolzats han de quedar estables al terra mentre el cos es mou. La sabata no s'ha d'estirar, travessar el terra ni lliscar contínuament.
- Fes passes baixes amb canvi de pes, aixecament, avanç i contacte suaus. Als girs, recol·loca els peus; no retorcis una sabata enganxada al terra.
- Revisa totes les parelles de peus, també entre portadors, i que les cames no sobresurtin del cos o de la faldilla.
- Mira-ho de davant, darrere, costat i amb càmera baixa, en moviment. Comprova els instants entre fotogrames i els canvis de suport.
- Torna a revisar-ho després d'accelerar el ball o augmentar el balanceig. Al visor lliure, les passes han de respondre al desplaçament real.

## 8. Construeix el comparador

Mostra junts i sincronitzats:

1. Vídeo de referència.
2. Model real del joc amb la reconstrucció.
3. Vista zenital simple amb figura, recorregut, direccions fixes i càmera separada.

Afegeix reproducció, pausa, seek, fotograma anterior/següent, velocitat lenta, salt per fases i control de so. Mostra el temps i una descripció breu de la fase. Mantén accessible el ball anterior.

Ajusta aproximadament angle, altura, perspectiva i enquadrament al vídeo. Conserva una vista fixa independent per comprovar que el seguiment de càmera no amaga una trajectòria massa curta. No canviïs l'escala del model per fingir apropament.

La vista zenital representa la reconstrucció, no una mesura independent de la realitat. Si el ball està accelerat, compara els instants equivalents amb el mapa temporal, no amb el mateix segon de reproducció.

## 9. Investiga els ajudants i la colla

- Busca imatges clares de la vestimenta pròpia d'aquesta figura: camisa, pantalons, faixa, mocador, sabates, colors i distintius.
- Separa portadors, ajudants que orienten, relleus, músics i públic. No dedueixis el paper d'algú només pel color de la camisa.
- Guarda retalls amb font i instant. No inventis logotips il·legibles ni copiïs el camuflatge del Drac a una altra colla.
- Prepara un encàrrec de modelatge per als quatre guies N/W/S/E i membres asseguts en rotllana, si aquest és el muntatge demanat. Si no està documentat a la realitat, identifica'l com a adaptació del joc.
- Els guies s'orienten cap a la figura i ajuden a llegir els girs. Situa'ls fora de tot el recorregut del cos i la cua, amb espai respecte a públic i càmera.
- Reutilitza el sistema d'ajudants existent. Dona varietat a postures i aparença, amb aplaudiments discrets; evita una rotllana sincronitzada mecànicament.

## 10. Revisa tota l'actuació i corregeix els salts

- Mira el vídeo i el model junts durant tota l'actuació, no només l'inici o captures escollides. Revisa també les repeticions i el final.
- Comprova direcció, velocitat, amplitud, sentit dels girs, cap, balanceig, suports i música. Conserva discrepàncies amb temps concret i evidència.
- Davant una captura amb un salt, examina diversos segons abans i després. El problema pot arribar més tard del fotograma indicat.
- Separa salt de càmera i salt del model. Revisa canvis de fase, orientació, pesos de transició, objectiu de càmera, altura i profunditat.
- Evita reiniciar girs o oscil·lacions entre frases. Un mateix instant ha de donar la mateixa postura encara que hi arribis fent seek.
- Valida entrades i sortides de transicions a diferents fps i instants intermedis. Mantén una prova que detecti el defecte real; no abaixis el criteri perquè passi.
- Guarda abans/després amb la mateixa vista i temps verificat, i revisa també la reproducció contínua. Les captures i els tests numèrics no acrediten per si sols la fidelitat del ball.
- Després de corregir un tram, revisa'l de nou amb els trams veïns. Si canvies el moviment global, repeteix la revisió completa.

## 11. Adapta i integra quan la base estigui validada

- Presenta la versió fidel i la proposta festiva amb diferències clares. L'acceleració i el balanceig extra han de conservar la coreografia i les transicions suaus.
- Aplica el mateix model i sistema de moviment acceptats al joc, al visor lliure i a les altres vistes que el reutilitzen. Evita versions divergents.
- Mantén els accents de joc existents, com encerts i errors, dins de límits que no trenquin el ball ni els contactes.
- Revisa sincronització, notes sostingudes, dificultats, acceleracions i final musical després de qualsevol canvi de temps.
- Conserva la càmera adequada per jugar; la càmera del vídeo és una eina d'estudi.
- Respecta rendiment i nivells de qualitat, especialment al mòbil. Passa les comprovacions exigides pel repo abans de lliurar canvis de codi.

## 12. Lliurament i manera de treballar

Desa un dossier `research/bestiari/[figura]/` amb fonts, seqüència en llenguatge planer, dades de coreografia, orientació i càmera, mapa musical, vestimenta, decisions, validacions i discrepàncies pendents. Enllaça codi, mitjans i captures perquè un altre agent pugui continuar sense reconstruir la conversa.

- Comprova mòbil vertical, horitzontal i escriptori. Distingeix simulació de viewport i prova en un dispositiu real.
- Abans de donar un enllaç, comprova servidor, worktree, port, pàgina i vídeos. Per al mòbil, dona l'adreça LAN correcta, no localhost, i indica si cal compartir xarxa. Deixa la previsualització disponible.
- Informa breument en català: què has canviat, quin problema resol, proves fetes, captures útils i què falta. Diferencia revisió visual, tests, escolta, validació meva, integració i publicació.
- Fes servir l'eina de preguntes per decisions reals que jo hagi de prendre. No tornis a preguntar allò que ja he decidit ni aturis feina independent mentre esperes una resposta.
- Si una font o una eina no permet verificar alguna cosa, explica el límit. No presentis una aproximació com a còpia exacta.

## Criteri per considerar-ho preparat per revisar

Puc entendre el ball llegint-ne les fases; puc veure vídeo, 3D i mapa al mateix instant; el model recorre l'espai i gira com la referència; cap i cos tenen vida; els peus no distreuen; música i moviment coincideixen; els ajudants tenen vestimenta documentada; i queda clar què és fidel, què és adaptat i què falta confirmar.

No ho donis per bo només perquè compila o perquè visualment queda bonic. Revisa-ho, corregeix-ho i ensenya'm el resultat amb evidència.
