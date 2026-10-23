# Revisió del ball per frases

Obre `/tools/dev/bou-review.html` al servidor local del worktree. El visor existent del ball també hi enllaça.

- Música: `src/song-bou.json.audio`, exactament el mateix asset que el joc (actualment v14 mobile, temporització v13).
- Model: el mateix `createBouStage` i `createBouMotion` del visor existent; no canvia el ball.
- Vídeo: Ardit Produccions, Sant Joan 2023, `2xG98OA1QqI`. Original AV1 1080p60 verificat amb el SHA-256 del dossier. El visor usa `bou-review-video`, una còpia H.264 720p30 sense so, amb fotogrames clau cada 0,5 s i el mateix origen temporal; 272,667 s. Original intacte. La còpia és a `output/bou-review/reference-720p.mp4`, fora de `public/`, configurada a `.bestiari-media.json`.
- 23 trams sobre els compassos conservats. Els talls de la cançó també tallen el vídeo.
- La cançó governa el rellotge. El vídeo, silenciat, adapta la velocitat dins de cada tram. Pausa, salts, bucle i velocitat comparteixen aquest rellotge.
- N/E/S/W són una convenció del guió: W = +Z (cap inicial), N = −X, E = −Z, S = +X. El mapa projecta el model, no una mesura del vídeo.

## Correspondència provisional

`review-map.json` conserva segons de cançó, segons de vídeo i notes de l'estudi anterior. No és una correspondència validada per audició.

S'ha alineat la forma **completa** de `score.json` contra el cromagrama del vídeo entre 26 i 238 s. DTW amb passos (1,1), (1,2), (2,1), perfil de les tres veus amb pesos 1 / 0,3 / 0,2, quatre mostres per pulsació, STFT 4096 / hop 1103 a 11025 Hz. S'han comparat les dotze transposicions; la candidata de menor cost és −1 semitò (classe 11), cost mitjà 0,439. Això és una hipòtesi d'alineació, no prova d'afinació ni de compàs exacte.

Després s'han seleccionat els compassos de la versió curta, amb la primera aparició de les repeticions. El retorn omès entre 47 i 60 queda com un salt de vídeo, no una compressió artificial. L'entrada 20–26 s és manual. Els intervals es poden corregir des dels camps d'inici/final. No es garanteix coincidència nota per nota dins de cada tram: s'interpola compàs a compàs, i els ajustos manuals dels extrems reescalen aquests ancoratges.

Les notes del vídeo provenen de `choreography.json` del dossier del worktree `bou-tradicional-study`; són observacions per mostreig, amb límits aproximats. El resum del model deriva de mostres de la posició i els girs del codi; aproxima les voltes a mitges voltes i indica els canvis de sentit. El mapa mostra el recorregut complet.

## Notes de Marc

Cada tram té un text del vídeo editable i un camp per a la correcció desitjada. Es desen a localStorage, lligats a aquesta durada musical i a l'identificador de compàs. Canviar l'URL d'origen/port o navegador no trasllada les notes. `Copia tots els trams` exporta un guió de text amb els temps; `Desa una còpia` descarrega el mateix guió. Si el porta-retalls falla, se selecciona el text per copiar-lo manualment. Escriure-hi no modifica la coreografia.

## Comprovacions

`node tests/bou-review.mjs` forma part de `npm run check`: cobertura temporal, salts de compassos eliminats, correspondència als extrems, validació d'intervals i exportació de notes. Les proves de navegador inclouen vídeo/audio reals, salts dels 23 trams, pausa, bucle, velocitat, persistència, porta-retalls i amplades 320–1920. Les captures i el registre complet són a `output/bou-review/` (local, no publicat).

Còpia de treball creada amb ffmpeg: `-vf scale=1280:-2,fps=30 -c:v h264_videotoolbox -b:v 3M -g 15 -an -movflags +faststart`. A altres sistemes es pot usar libx264. Cal configurar el recurs local i tornar a iniciar el servidor propi perquè el registre es llegeix a l'inici.

Passada final 2026-10-23: `npm run check` complet, prova específica `bou-review`, graf de mòduls i build correctes. Proves de navegador amb vídeo H.264: tots els trams, persistència, còpia, límits invàlids, pausa, bucle i nou amplades. Mostra de deriva durant reproducció: 34 ms (no és una cota de tota la peça). Columnes d'escriptori iguals, 612 px, amb 24 px entre elles; vídeos de 320 px i camps de text alineats. Àudio públic verificat bit a bit respecte del començament. No s'ha validat l'encaix musical per audició ni en un telèfon físic.

La previsualització de revisió es deixa activa al port 5188. Els navegadors automatitzats propis s'han tancat. El servidor 5191 i altres recursos concurrents no pertanyen a aquesta tasca i no s'han aturat.
