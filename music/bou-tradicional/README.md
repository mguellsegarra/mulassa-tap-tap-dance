# Bou Tradicional de Valls — música del joc

Marc ha aprovat la versió 13 el 23 d'octubre de 2026 per incorporar-la més endavant al joc. És el Bou Tradicional de la UAF, no el Bou de la Turba. Composició original: Francesc Bofarull, juny de 2012.

**Àudio aprovat:** [bou-tradicional-v13.mp3](bou-tradicional-v13.mp3), 2:34,335. Copiat sense recodificar. Final ascendent sol–si–do; el do utilitza el mateix instrument que la resta i només té un fade de volum. Bombo a partir del 0:55,238; inici sense bombo i tram final techno. Aquesta és la versió que cal preservar.

## Contingut

- `approval.json`: aprovació de Marc, identitat i hash de l'àudio.
- `bou-tradicional-v13.mid`: notes i percussió amb els canvis de tempo. Els instruments General MIDI són orientatius; el MIDI no reprodueix el timbre sintetitzat de l'MP3.
- `Bou-Tradicional.pdf` i `score.json`: partitura original i transcripció canònica.
- `arrangement.json`: manifest exacte de la versió aprovada. Les rutes d'àudio internes són les de la previsualització d'origen; per reproduir la mescla actual, utilitzar `playback.json`.
- `timing.json`: graella completa de temps, subdivisions de 1/12 de pulsació, tempos, compassos i notes amb veu, altura escrita i altura interpretada. L'entrada melòdica és als 6 s. El tempo és variable: no calcular els temps amb un BPM fix.
- `validation.json`: comprovacions tècniques de la versió 13. `listeningVerified: false` fa referència a l'agent; l'acceptació auditiva de Marc queda registrada a `approval.json`.
- `source-v13.zip`: còpia congelada del generador i de totes les seves entrades, amb les versions de les dependències. No depèn del worktree de recerca per tornar a generar l'àudio.
- `SHA256SUMS`: integritat dels fitxers del paquet.

## Mescla actual per al mòbil (v14)

Marc ha demanat substituir al joc el bombo que no sentia als altaveus del mòbil.
`playback.json` identifica `bou-tradicional-v14-mobile.mp3` i el seu hash.
`approval.json` conserva l'aprovació històrica de v13; no implica que Marc hagi
escoltat i aprovat aquesta nova mescla.

La v14 afegeix cos i harmònics curts al bombo techno. Conserva la melodia,
les segones veus, els cops, el tempo, la durada i el guany del màster de v13.
L'entrada fins al primer bombo és idèntica dins la precisió PCM de 24 bits.
La simulació mono de 200–5000 Hz mesura +10,52 dB RMS al bombo aïllat;
no representa tots els mòbils ni substitueix una escolta física. Pic MP3: 0,796.
L'escolta de l'agent i la prova amb mòbil físic no estan verificades.

Regeneració des de l'arrel del worktree:

```sh
uv run --python 3.11 --with numpy==2.4.6 --with scipy==1.17.1 --with soundfile==0.14.0 --with mido==1.3.3 tools/build_bou_mobile.py
node tools/build_bou_chart.mjs
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

1. Promoure l'MP3 aprovat a `public/music/` conservant-ne els bytes i el hash de `approval.json`; adaptar la llista de fitxers publicables de `tools/prepare-pages.mjs` quan la cançó s'afegeixi al registre.
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
