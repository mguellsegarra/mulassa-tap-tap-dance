# Ball de la Mulassa de Valls: música del joc

Composició: Francesc Bofarull i Figuerola (1987).

`score.json` és la transcripció manual de la veu superior de la reducció per a banda publicada per l'ESMUC (durades en negres; R = silenci; compassos 0 i 33: anacrusi de dues negres):
https://www.esmuc.cat/wp-content/uploads/2026/04/AB-Analisi-Partitura-ARRE-2025JU-Partitura_compressed.pdf

És l'única entrada de `tools/build_taiko.py`, que genera tota la música, el mapa de notes del joc (`src/song.json`) i `taiko-arrangement.json`. Les versions anteriors (gralla chiptune, C64, arcade, banda de vent...) i les seves eines es poden recuperar de l'historial de git.

## Versió curta

La versió curta conserva tota la introducció original i elimina només el tram [174,258) de la versió completa. Es va publicar a 152 BPM fixos: últim cop al temps 228 (90,1 s), amb 93,6 s incloent la cua. Des del 19 d'octubre de 2026 accelera per frases (vegeu «Tempo per frases»): últim cop a 88,2 s. S'ometen el final original de B, el pont i la represa A′ B′; es conserva el compàs 49 d'entrada a C. No s'ha audicionat aquesta prova.

La versió curta publica com a `mulassa-v2-short`, amb els recomptes i límits propis; `mulassa-v1` continua activa per als clients anteriors. La migració `202610160001_short_song_rankings.sql` conserva tots els registres originals i uneix les dues versions a la mateixa classificació. En fusionar a `master`, el workflow de desplegament aplica primer les migracions pendents i només publica el client si acaben correctament. Aprovar la PR no executa aquests passos: cal fusionar-la. El workflow de migracions també es pot executar manualment; l'opció `baseline` només marca l'historial i no aplica SQL.

Els punts es guarden i es validen sense transformar. La classificació i els resultats els mostren a l'escala original: una partida de referència amb tots els encerts perfectes, mantinguts complets i globus a 12 tocs/s equival a la mateixa partida de referència llarga, per nivell. Les referències són `[96572,113940,196572]` i `[69350,83540,149972]` (`tools/reference-score.mjs`). La proporció no reprodueix els errors o combos de les frases eliminades: és una calibració comuna, no una equivalència exacta per a qualsevol manera de jugar. Els límits de seguretat continuen calculant-se separadament amb `tools/score-ceiling.mjs`.

La qualitat i la ratxa conserven els valors reals de cada partida. Els desempats mantenen l'escala de judicis original de cada nivell. Un jugador amb les dues versions ocupa una sola posició i substitueix una sola mostra per nivell. De cada nivell es conserva la partida amb més punts comparables, al dispositiu (`beatsRecord`) i al servidor (`202610170001_record_by_score.sql`), igual que ordena la classificació; el percentatge només desempata. Els rècords locals nous es desen en una clau de punts (`record-points-mulassa-*`); les claus anteriors es tornen a llegir a cada partida i no se sobreescriuen. Les proves conserven una còpia íntegra del mapa original de `96312f5` a `tests/fixtures/`.

El generador no regenera l'ambient del menú per defecte; `AMBIENT=1` ho activa explícitament.

La gravació curta es publica com a `mulassa-taiko-short.mp3`. Es conserva la gravació llarga original a `mulassa-taiko.mp3`, amb el seu hash, perquè una pestanya antiga pugui repetir una descàrrega fallida després del desplegament. El generador només escriu l'MP3 curt; `legacyAudio` fa que el paquet de Pages també exigeixi i inclogui l'original.

## Tempo per frases

La melodia, l'harmonia, els instruments i la forma no canvien (els mateixos 228 temps, les mateixes notes i els mateixos judicis per nivell). El tempo de `mulassa-form.json` puja frase a frase amb rampes suaus de dos temps: introducció i A1 a 152 (com l'ambient del menú), A2 a 154, un retorn breu a 152 sobre la nota llarga i el redoble abans de B, B a 158, C a 161 i el FINAL ESBOJARRAT a 164 (Marc, 19/10/2026: més suau que la primera proposta, que arribava a 170); s'eixampla fins a 152 en els últims temps de la melodia, el redoble final i el cop. La percussió puja un 5, 10 i 15 % a B, C i la coda. Els dos redobles mantenen la durada d'abans: els globus en depenen, i així les puntuacions de referència i els límits del servidor de `mulassa-v2-short` queden iguals (sense canvis a la base de dades).

El bloc `reference` de la forma lliga frases de la cançó amb moments del ball de Santa Úrsula 2017 (`song.ref`, `src/game/mula-time.js`). És una adaptació per al ball, no una alineació amb la música dels grallers del vídeo. Detalls i límits: `research/bestiari/mulassa/game-integration.md`. No s'ha escoltat: les xifres surten de l'anàlisi dels fitxers generats.

## Arranjament Taiko

`mulassa-taiko-short.mp3`, `mulassa-taiko.wav` i `mulassa-taiko.mid` (amb el mapa de tempo a la pista «Tempo»). És un arranjament nou, en to de festa major, que només aprofita la melodia de `score.json`. A la part A cada negra de la partitura ocupa dos temps, però la banda toca a tempo sencer: primer caixa al segon i quart temps i baix de pasdoble (fonamental i quinta), després bombo a negres, baix sincopat i glockenspiel doblant la melodia. Els acords de do menor s'il·luminen amb mi bemoll, si bemoll i la bemoll majors. B i la coda fan servir un temps per negra, amb metalls suaus a contratemps, baix a octaves, campanes, i petits redobles cada quatre compassos de la melodia. Abans de B (temps 140–143) i al final (224–228) hi ha redoblaments en crescendo. L'última frase de la coda (temps 208–224) dobla la subdivisió i és el clímax: és el FINAL ESBOJARRAT del joc. Sense gralla ni sons de pols: tots els timbres són additius i suaus.

`mulassa-taiko-ambient.mp3` és l'ambient del menú: percussió de festa major amb taiko arrodonit, picaments de mans, shaker suau, baix i guitarra de niló. Comença amb quatre compassos d'entrada gradual (uns 6,3 s): primer percussió, després harmonia, baix i acords. La guitarra insinua els colors do/mi/sol de B amb un petit arc melòdic i una resposta descendent, en registre mitjà, amb atac tou i sense salts d'octava. Sense campanes ni cascavells.

Una sola idea de vuit compassos (`C C F F G G C C`) es toca dues vegades. El ritme de la melodia es reconeix en cada parella de compassos; les respostes sostenen la nota d'arribada i deixen un temps per respirar. Els acords duren almenys dos compassos i el final queda en do, com l'inici. Les veus interiors es mouen com a màxim tres semitons, mantenen les notes comunes i tenen cues curtes.

El baix i el timbal caminen junts al primer i tercer temps; la guitarra i les mans responen al segon i quart. Els accents varien lleument al llarg de vuit compassos, les respostes melòdiques es toquen més fluixes i relaxades, i els acords es rasquen amb una petita separació entre cordes. Els desplaçaments expressius són fixos (4–14 ms per instrument, més el rascat), no s'acumulen ni alteren el tempo. Només hi ha una resposta curta de vora al final de cada vuit compassos.

Després de l'entrada es repeteixen 16 compassos (64 temps) al mateix tempo del joc. `ambientLoop` a `src/song.json` indica els punts de bucle exactes: el reproductor comença al segon zero però les voltes següents salten la introducció. La reverberació es plega només dins del tram repetible, i l'arxiu porta un segon de continuació després del punt de bucle. Així l'MP3 ja comença suau per si sol i el ritme no s'apaga a cada volta.

El mateix generador escriu `src/song.json` (`[temps, don|ka, nivell, gran, final_de_mantén]`). Cada nota del joc és una nota de la melodia; la primera és la G4 d'entrada (temps 12). Les excepcions són el cop final i, només a DIFÍCIL, els cops de caixa del segon i quart temps de la part A allà on la melodia descansa (PA). A la part A, els taikos de l'àudio toquen les notes de la melodia.

### Regles del joc

- **GUA** (taronja, esquerra; `don`): primer temps i meitat del compàs de la melodia. **PA** (turquesa, dreta; `ka`): temps del mig. Les notes intermèdies segueixen la melodia: si puja, PA; si baixa, GUA.
- **GUAPA!** (meitat taronja, meitat turquesa): 11 accents per cançó (plats, inicis de frase, últim do i cop final). A tots els nivells cal prémer els dos botons alhora (80 ms; a FÀCIL, 150 ms), i puntua el doble. Amb un sol botó és error («ELS DOS ALHORA!»).
- **MANTÉN** (NORMAL i DIFÍCIL): les 5 notes llargues de la part A (3 temps o més), alternant GUA i PA. Es jutgen dues vegades: l'inici, com un toc, i la cua, segons quanta estona s'ha mantingut premut.
- **GLOBUS**: redobles als temps 140–143 i 224–228. Compten tots els tocs de qualsevol costat; esclata cada cert nombre de tocs (5/8/12 segons la dificultat, més al final) i en surt un altre. Compta fins a 60 ms abans del final.
- **FINAL ESBOJARRAT**: l'última frase de la coda (compàs 66 de la partitura, temps 208) fins a l'últim cop, amb punts dobles.
- **Nivells** (notes cada 7 s, inici → final): FÀCIL 6–7 constant; NORMAL 8 → 12; DIFÍCIL 13–15 → 20–25, i totes les corxeres només al frenesí (~30). `nivell` 3 = nota de la melodia que no surt a cap nivell.

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/build_taiko.py
```

## Ball del Drac

`drac-score.json` (veu de gralla 1, F. Bofarull, 1985) i `drac-form.json` alimenten `tools/build_drac.py`, que genera `public/music/drac-taiko.{mp3,mid}`, l'ambient del menú, `drac-arrangement.json` i `src/song-drac.json`. La forma i el tempo segueixen la gravació de Sant Joan 2018 de la qual surt el ball (pm-lEViiPK0): D.S. fins al compàs 51 i la coda, sense repetir cap frase; l'última nota s'allarga sobre el redoble final fins que el drac s'atura. De 117 BPM a 128, salt a 151,5 sota els girs finals i rit. a 117 sota l'última nota. A DIFÍCIL, a partir del D.S., cada frase que comença amb GUAPA en té una altra a la corxera que baixa del punt més alt. El bloc `reference` de la forma lliga els segons de la cançó amb els del vídeo (`ref`, `refEnd`, `src/game/drac-time.js`). Tot ve d'anàlisi de l'àudio, no s'ha escoltat: les proves, les xifres i el que falta confirmar d'oïda són a `docs/drac-music.md`.

Hi ha dos arranjaments, festiu i auster, i els tria la constant `VARIANT` del generador. Encara no s'ha decidit quin; de moment és el festiu. L'altre només es genera a `tmp/audio/`.

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac.py
```
