# Bou Tradicional de Valls — música del joc

La versió 13 es va aprovar per incorporar-la més endavant al joc. És el Bou Tradicional de la UAF, no el Bou de la Turba. Composició original: Francesc Bofarull, juny de 2012.

**Àudio aprovat:** [bou-tradicional-v13.mp3](bou-tradicional-v13.mp3), 2:34,335. Copiat sense recodificar. Final ascendent sol–si–do; el do utilitza el mateix instrument que la resta i només té un fade de volum. Bombo a partir del 0:55,238; inici sense bombo i tram final techno. Aquesta és la versió que cal preservar.

## Contingut

- `approval.json`: aprovació, identitat i hash de l'àudio.
- `bou-tradicional-v13.mid`: notes i percussió amb els canvis de tempo. Els instruments General MIDI són orientatius; el MIDI no reprodueix el timbre sintetitzat de l'MP3.
- `Bou-Tradicional.pdf` i `score.json`: partitura original i transcripció canònica.
- `arrangement.json`: manifest exacte de la versió aprovada. Les rutes d'àudio internes són les de la previsualització d'origen; per reproduir la mescla actual, utilitzar `playback.json`.
- `timing.json`: graella completa de temps, subdivisions de 1/12 de pulsació, tempos, compassos i notes amb veu, altura escrita i altura interpretada. L'entrada melòdica és als 6 s de la v13 (als 4 s de la mescla actual, vegeu la revisió 17). El tempo és variable: no calcular els temps amb un BPM fix.
- `validation.json`: comprovacions tècniques de la versió 13. `listeningVerified: false` fa referència a l'agent; l'acceptació auditiva queda registrada a `approval.json`.
- `source-v13.zip`: còpia congelada del generador i de totes les seves entrades, amb les versions de les dependències. No depèn del worktree de recerca per tornar a generar l'àudio.
- `SHA256SUMS`: integritat dels fitxers del paquet.

## Mescla actual per al mòbil (v14)

S'ha demanat substituir al joc el bombo que no sentia als altaveus del mòbil.
`playback.json` identifica `public/music/bou-tradicional-v14-mobile.mp3` i el seu hash; el MP3 només és allà.
`approval.json` conserva l'aprovació històrica de v13; no implica que s'hagi
escoltat i aprovat aquesta nova mescla.

La revisió 20 corregeix una errata de la partitura: al compàs 12,
temps 3, la Gralla I fa si natural, no el si bemoll imprès. Al PDF hi falta el becaire: el baix fa sol (la dominant),
la Gralla II hi fa si naturals una tercera per sota i en directe se sent si natural. `score.json` porta la correcció
(i una nota a `notationNotes`); `tools/music/build_bou_mobile.py` genera el trio des d'aquest `score.json` i comprova que
només canvien les notes corregides, i actualitza `timing.json`. Al joc, el compàs 12 sona una sola vegada (26 s).
La v13 aprovada i el seu ZIP no canvien. Escolta pendent.

La revisió 19 treu el bombo techno de l'arrencada:
al joc, el segon tram de discoteca passa al final (compassos 84-91, el tram més ràpid), on el
bombo de club ja sona. És la mescla de la revisió 17: el generador comprova que, després de la
introducció, el PCM és el de la revisió 15 mostra a mostra. Escolta pendent.

La revisió 18 torna a posar el bombo techno a
l'arrencada, als compassos 64-71, on la música s'accelera cap a la festa: un cop a cada temps,
que puja de fluix (velocitat 0,30) a ple (0,92, el de la festa és 0,88), i corxeres a l'últim
compàs. Porta a l'aixecada del Bou a la primera part del compàs 72, i al joc el terra de
discoteca també s'hi encén. Afegit només a la pista de percussió: els cops de la partitura no
canvien. El generador comprova que, abans de codificar a MP3, fora del tram 64-71 (i 2,5 s de
reverberació) el PCM és el de la revisió 17 mostra a mostra. Escolta pendent.

La revisió 17 treu el primer compàs de la
introducció, el més fluix: queden 8 temps i la primera nota arriba als 4 s del BALLA!, en lloc de 6
(la Mulassa als 4,7 s i el Drac als 5,6 s). Tota la cançó s'avança 2 s. `playback.json`
(`cutBeats: 4`) ho indica, i `tools/music/build_bou_chart.mjs` avança igual el mapa de temps de
`timing.json`, que es manté el de la v13. Des de la melodia més la reverberació del redoble (7 s ara, 9 s abans), el PCM és el de la revisió 15 avançat 2 s.

La revisió 16 omple la introducció de 12 temps
perquè soni com la de la Mulassa i el Drac: els mateixos cops, 3,2 vegades més forts, més
shaker a semicorxeres, charles als contratemps, pandereta al 2 i al 4 i un baix pinçat a cada
temps (do i sol, les notes del primer compàs). Uns 2 dB per sota de la melodia i sense silencis
entre cops. Al joc, després del 3·2·1, sonava com un segon compte enrere. A partir de 9 s
(6 s més la reverberació) el PCM és idèntic al de la revisió 15.

La revisió 15 treu el timbal que sonava amb
la primera nota de la melodia (6 s); el plat hi continua. Conserva el nom del fitxer;
el `?v=` de `src/song-bou.json` canvia amb el hash. Fora de 6,0–7,6 s (el cop i la seva
reverberació), el PCM és idèntic al de la v14.

La v14 afegeix cos i harmònics curts al bombo techno. Conserva la melodia,
les segones veus, els cops, el tempo, la durada i el guany del màster de v13.
L'entrada fins a la primera nota és idèntica dins la precisió PCM de 24 bits.
La simulació mono de 200–5000 Hz mesura +10,52 dB RMS al bombo aïllat;
no representa tots els mòbils ni substitueix una escolta física. Pic MP3: 0,796.
L'escolta de l'agent i la prova amb mòbil físic no estan verificades.

Regeneració des de l'arrel del worktree:

```sh
uv run --python 3.11 --with numpy==2.4.6 --with scipy==1.17.1 --with soundfile==0.14.0 --with mido==1.3.3 tools/music/build_bou_mobile.py
node tools/music/build_bou_chart.mjs
```

El primer generador reconstrueix v13 des del ZIP i exigeix el seu hash exacte
abans de fer la mescla nova. Verifica que els esdeveniments no canvien, l'entrada,
la durada, els pics després de descodificar MP3 i la presència del bombo filtrat.
Desa comparacions abans/ara de 1:56–2:12 a `output/bou-mobile/`.
El segon copia l'àudio actual a `public/music/` i actualitza el hash de
`src/song-bou.json`. Les notes jugables i els temps es mantenen.

La v13 continua arxivada i queda exclosa del paquet publicable. La resta de
cançons no canvien. La integració del Bou al joc ja existia abans d'aquesta mescla.

### Pla original

Aquest paquet queda fora de `public/` per no publicar ni carregar una cançó que encara no és jugable. No s'ha modificat el registre de figures, `figure-song.js`, les cançons actuals ni els rànquings.

Quan s'integri el Bou:

1. Promoure l'MP3 aprovat a `public/music/` conservant-ne els bytes i el hash de `approval.json`; adaptar la llista de fitxers publicables de `tools/deploy/prepare-pages.mjs` quan la cançó s'afegeixi al registre.
2. Generar el contracte del joc (`song-bou.json`) i els patrons per dificultat des de les notes i la graella de `timing.json`. Aquest paquet encara no conté patrons jugables. Respectar pauses, notes simultànies, densitat i inclusió entre dificultats.
3. Integrar la figura, el model i la coreografia amb aquest mateix rellotge. `finaleCandidate` és només un punt de partida per al final festiu, no un contracte de joc ja validat.
4. Definir una identitat/versionat propi dels rècords del Bou. Validar sincronització, animació, finals i escolta al mòbil abans de publicar.

## Reproduir la versió

Extreure `source-v13.zip` en una carpeta buida. Des d'aquesta carpeta, executar (cal ffmpeg):

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/bou/build_preferred.py
```

El resultat queda a `output/bou-music/preferred/`. Les versions utilitzades són a `python-packages.json`; per reproducció exacta, fixar-les. El generador original encara marca l'escolta de l'agent com a no verificada: no substitueix `approval.json`.

Validar els fitxers transferits des d'aquesta carpeta:

```sh
shasum -a 256 -c SHA256SUMS
```

Comprovació de lliurament: regeneració des del ZIP en una carpeta buida completada; MP3 i MIDI idèntics byte a byte i manifest idèntic als aprovats. Fitxers i graella de temps verificats. No s'ha canviat el comportament del joc.
