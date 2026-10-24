# Revisió del ball per frases

Obre `/tools/dev/bou-review.html` al servidor local del worktree. El visor existent del ball també hi enllaça.

- Música: `src/song-bou.json.audio`, exactament el mateix asset que el joc (actualment v14 mobile, temporització v13).
- Model: el mateix `createBouStage` i `createBouMotion` del visor existent; no canvia el ball.
- Vídeo: Ardit Produccions, Sant Joan 2023, `2xG98OA1QqI`. Original AV1 1080p60 verificat amb el SHA-256 del dossier. El visor usa `bou-review-video`, una còpia H.264 720p30 sense so, amb fotogrames clau cada 0,5 s i el mateix origen temporal; 272,667 s. Original intacte. La còpia és a `output/bou-review/reference-720p.mp4`, fora de `public/`, configurada a `.bestiari-media.json`.
- 23 trams sobre els compassos conservats. Els talls de la cançó també tallen el vídeo.
- La cançó governa el rellotge. El vídeo, silenciat, adapta la velocitat dins de cada tram. Pausa, salts, bucle i velocitat comparteixen aquest rellotge.
- N/E/S/W són una convenció del guió: W = +Z (cap inicial), N = −X, E = −Z, S = +X. El mapa projecta el model, no una mesura del vídeo.

## Correspondència amb la partitura (revisió 2)

La partitura és `music/bou-tradicional/Bou-Tradicional.pdf`; `score.json` en conté la transcripció i `timing.json` identifica cada compàs conservat, les notes i el rellotge de la versió curta. S'han contrastat 78 ocurrències i 1.229 notes de les tres veus: altura escrita, posició i durada en pulsacions coincideixen exactament amb els compassos transcrits. Això comprova la relació transcripció → arranjament, no la fidelitat de la transcripció ni l'encaix amb la interpretació del vídeo.

El primer mapa era un DTW de cromagrama STFT, amb extrems provisionals 26–238 s. La revisió afegeix CQT (22.050 Hz, hop 1.024, cinc octaves des de C3), sis subdivisions per pulsació i les tres veus amb pesos 1 / 0,4 / 0,25. Entre les dotze transposicions, torna a sortir −1 semitò com a candidata. És una hipòtesi analítica, no una mesura d'afinació validada.

- Abans del compàs 60: nou CQT, contrastat amb el primer mapa i una detecció de notes independent de l'estudi anterior.
- Compassos 60–71: la pàgina 2 té una fermata al 63 i indica començar molt lent i accelerar al 64. L'encaix lliure es desviava gairebé 3 s; s'ha restringit amb els patrons de notes detectats al reinici del 64 (193,18 s) i del 68 (202,39 s). Falta contrast auditiu local.
- Del 72 al final: es conserva el mapa anterior, provisional. La partitura inclou una variant amb repeticions per al foc i l'anàlisi del vídeo no resol encara aquesta correspondència.
- Entrada 0–6 s de la cançó: afegida, sense frase musical equivalent; mostra la preparació del vídeo.

Els compassos eliminats són salts del vídeo. Els ancoratges nous són per pulsació i es projecten amb `subdivisionTimes`, sense suposar un BPM constant. Els ajustos manuals d'inici/final reescalen el tram. Cada tram mostra i exporta el seu grau de comprovació; el desplegable mostra les notes de la primera veu. No s'ha validat tota la peça per audició.

Les 23 observacions s'han reescrit mirant fotogrames temporitzats, generalment cada 2 s. Les propostes són una interpretació editable: les direccions hereten la reconstrucció provisional anterior; fum, ajudants i retalls de càmera impedeixen certificar alguns girs. La vista zenital reutilitza la convenció del comparador de la Mulassa i mostra exclusivament el model actual, amb orientació, desplaçament i recorregut. Els textos no modifiquen el ball.

Evidències locals a `output/bou-review-v2/`: partitura renderitzada, fulls de fotogrames, mapes CQT i refinat, contrast de notes i comprovació dels 1.229 esdeveniments. També es conserva el mapa inicial i l'intent d'alineació descartat.

## Notes de Marc

Cada tram té una observació del vídeo i una proposta ja escrites, totes dues editables. La migració actualitza només els valors antics per defecte i conserva les correccions pròpies, inclòs deixar un camp buit després d’aquesta revisió. Es desen a localStorage, lligats a aquesta durada musical i a l'identificador de compàs. Canviar l'URL d'origen/port o navegador no trasllada les notes. `Copia tots els trams` exporta un guió de text amb els temps; `Desa una còpia` descarrega el mateix guió. Si el porta-retalls falla, se selecciona el text per copiar-lo manualment. Escriure-hi no modifica la coreografia.

## Comprovacions

`node tests/bou-review.mjs` forma part de `npm run check`: cobertura temporal, salts de compassos eliminats, correspondència als extrems, validació d'intervals i exportació de notes. Les proves de navegador inclouen vídeo/audio reals, salts dels 23 trams, pausa, bucle, velocitat, persistència, porta-retalls i amplades 320–1920. Les captures i el registre complet són a `output/bou-review/` (local, no publicat).

Còpia de treball creada amb ffmpeg: `-vf scale=1280:-2,fps=30 -c:v h264_videotoolbox -b:v 3M -g 15 -an -movflags +faststart`. A altres sistemes es pot usar libx264. Cal configurar el recurs local i tornar a iniciar el servidor propi perquè el registre es llegeix a l'inici.

Primera passada, anterior a la revisió 2 (2026-10-23): `npm run check` complet, prova específica `bou-review`, graf de mòduls i build correctes. Proves de navegador amb vídeo H.264: tots els trams, persistència, còpia, límits invàlids, pausa, bucle i nou amplades. Mostra de deriva durant reproducció: 34 ms (no és una cota de tota la peça). Columnes d'escriptori iguals, 612 px, amb 24 px entre elles; vídeos de 320 px i camps de text alineats. Àudio públic verificat bit a bit respecte del començament. No s'ha validat l'encaix musical per audició ni en un telèfon físic.

La previsualització de revisió es deixa activa al port 5188. Els navegadors automatitzats propis s'han tancat. El servidor 5191 i altres recursos concurrents no pertanyen a aquesta tasca i no s'han aturat.

Revisió 2 validada: `npm run check` complet (exit 0), build, prova específica i graf de mòduls correctes. Navegador: tres panells, textos dels 23 trams, migració de notes, conservació de camps buidats intencionadament, còpia, reproducció i nou amplades. Els camps d'observació i proposta queden alineats a escriptori. L'enllaç a l'original segueix els extrems editats. Hashes de l'àudio públic intactes. Captures `output/bou-review-v2/Despres-1280.png`, `Despres-desktop.png` i `Despres-mobil.png`. Navegadors de prova tancats; servidor 5188 conservat. Pendent: contrast auditiu de l'encaix, sobretot acceleració i final amb foc; telèfon físic no provat.
