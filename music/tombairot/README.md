# El Tombairot — música del joc: «Aligot»

**Drets: pendent de permís, no publicar.** És una peça d'un compositor viu. Fins que hi hagi permís, la cançó només es
fa servir en local i a les proves; no ha d'arribar a beta ni a producció.

## La partitura

- **Títol:** Aligot. **Gènere:** pasdoble (subtítol de la partitura).
- **Compositor:** Manel Sederra i Puigferrer (ho diu la capçalera del PDF i el `creator` del MusicXML).
- **Adaptació:** Els Vernets, per a tres gralles (ho diu el PDF: «Adapt. Els Vernets»).
- **Edició:** arxiu de Josep Sanz (gralla.josepsanz.net), exportat amb MuseScore Studio 4.6.5 el 25/04/2026.
  Còpia d'origen: `/Volumes/development/projects/gralla/files/josep_sanz_musescore-aligot/` (només lectura).
- **Veus:** Gralla 1 (la melodia), Gralla 2 i Gralla baixa.
- **Compàs i tonalitat:** 2/4; la menor (A, introducció i B), el trio en do major (la mateixa armadura, sense alteracions).
- **Tempo escrit:** no n'hi ha cap d'imprès; el MusicXML porta 120 (negra) i el MIDI de l'arxiu també.
- **Transposició:** la Gralla 1 i la Gralla 2 sonen com estan escrites (com al Bou; el Drac, en canvi, es toca en sol).
  La Gralla baixa sona una octava per sota de l'escrit (`<transpose><octave-change>-1` al MusicXML; el MIDI de l'arxiu
  ho confirma).

Fitxers copiats aquí:

| Fitxer | Què és | SHA-256 |
| --- | --- | --- |
| `aligot.pdf` | La partitura (5 pàgines: general i particel·les). Mana quan l'export no hi coincideix. | `84ebe409…6fc3` |
| `aligot.mxl` | L'export MusicXML de les tres veus. És el que llegeix el generador. | `c091c038…671d` |

## Correccions i dubtes

- **Compàs 45, Gralla 1:** el PDF fa *fa fa fa* (corxera amb silenci, dues semicorxeres i corxera), igual que els compassos 40-41;
  el MusicXML i el MIDI diuen *mi*. Mana el PDF. A sota hi ha *re* (Gralla 2) i *la* (Gralla baixa), un acord de re menor, i un
  *mi* hi faria una segona. `CORRECTIONS` al generador.
- **Compassos 53-54 i 61-62:** l'arc que uneix el *mi* (i el *fa*) llarg amb la nota igual del compàs següent és, al MusicXML,
  una lligadura d'expressió i no una de prolongació. Al joc es toca dues vegades (i és un toc més al xart). No ho he
  pogut comprovar amb cap enregistrament.
- Fora d'això, la forma desplegada coincideix nota per nota (alçada i inici) amb el MIDI de l'arxiu a les tres veus:
  319, 370 i 352 notes.

## Forma i mapa de frases

Totes les repeticions de la partitura: 133 compassos, 2:13 a 120 sense la intro. Massa llarg (cal 90-120 s).

| Frase | Compassos | Grup (frases iguals) |
| --- | --- | --- |
| I · Introducció | 1-8 | Introducció |
| A1 · A, 1a volta | 9-21, 22-24 (1a casella) | A |
| A2 · A, 2a volta | 9-21, 25-27 (2a casella) | A |
| I2 · Introducció, represa | 28-35 | Introducció |
| B1 · B, 1a volta | 36-41, 42-43 (1a casella) | B |
| B2 · B, 2a volta | 36-41, 44-50 (2a casella; el 47 és un compàs de silenci a la melodia) | B |
| T1 · Trio, 1a volta | 51-80, 81-82 (1a casella) | Trio |
| T2 · Trio, 2a volta | 51-80, 83-84 (2a casella, el final) | Trio |

Versions (`VERSIONS` al generador, i per escoltar-les `tools/dev/tombairot-music.html`):

| Versió | Frases | Última nota | Durada del fitxer |
| --- | --- | --- | --- |
| **v1 (per defecte, provisional)** | I A1 A2 I2 B1 B2 T2: totes les repeticions menys la del trio | 1:43 | 1:46 |
| v2 | I A1 A2 I2 B2 T2: i la B una sola vegada | 1:35 | 1:38 |
| v3 | I A2 I2 B1 B2 T2: la A una sola vegada, amb la 2a casella | 1:27 | 1:30 |
| completa | totes les repeticions | 2:14 | 2:17 |

He triat la v1 perquè només es salta una repetició sencera (la primera volta del trio), i el salt de la 2a casella de la
B (compàs 50) al trio és el mateix que fa la partitura. Ho ha de decidir el propietari.

## Adaptació per al joc (no és del compositor)

L'arranjament festiu és generat (`tools/music/build_tombairot.py`) i no s'ha d'atribuir a Manel Sederra ni a Els Vernets.

- **Entrada:** el compte compartit del joc (3 2 1 BALLA!) i, darrere, 8 temps de percussió pròpia (shaker, timbal, taiko,
  hihat, pandereta, un redoble i el baix que fa *mi*, la nota del baix del compàs 1). La primera nota cau als 4,0 s, com al
  Bou (Mulassa 4,8 s, Drac 5,7 s).
- **Melodia:** la Gralla 1 amb el mateix instrument que la Mulassa i el Drac (`synth.additive`, tres capes). La Gralla 2
  sona més fosca i molt per sota; la Gralla baixa fa de baix, a l'altura on sona. No s'hi ha afegit cap harmonia inventada.
- **Percussió que creix:** introducció lleugera (timbal); A amb el *pa* del pasdoble (caixa a contratemps); a la represa
  entra el bombo al primer temps; a la B, palmes i hihat; al trio, bombo a cada temps (amb el cos de 205 Hz del Bou, que
  se sent als altaveus del mòbil) i, a l'última frase del trio, picarol i hihat a semicorxeres. El taiko dobla les notes
  de FÀCIL i NORMAL (el que se sent és el que s'ha de tocar).
- **Tempo:** 120 fins a la represa, i d'allà puja a poc a poc: 121, 122 a la B, 124 al trio, 126 a l'última nota.
  Lineal entre punts, sense salts (`TEMPO`). El joc llegeix la graella (`song.beats`); `bpm` només és el tempo d'inici.
- **Final:** compassos 83-84 (la 2a casella) amb un redoble de festa (el GLOBUS) i, al silenci del 84, *sol-si* que
  pugen a un *do* llarg amb el mateix instrument i un fade simple. No ressona res després (1,5 s com a màxim).
- **Volum:** −14,7 LUFS integrat, pic −4,4 dBFS (Drac −14,9, Mulassa −14,4, Bou −16,3). Intro −19,9 dB contra −16,7
  de la melodia.

## Xart

Cada toc és una nota de la Gralla 1 (sobre la graella d'1/12 de temps). FÀCIL: una nota per compàs, la primera que cau
en un temps. NORMAL: les que cauen en un temps (o totes les corxeres si cap no hi cau). DIFÍCIL: totes les de la graella
de corxeres, menys els *mi* repetits a contratemps de la primera introducció (així comença més fluix i creix a la
represa). Les semicorxeres només sonen. MANTÉN a NORMAL i DIFÍCIL per a les notes de dos temps o més, fins a un temps
abans del toc següent. GUAPA a l'inici de cada frase, als compassos 59, 67 i 75 de l'últim trio, i a l'últim *do*.
El GLOBUS va dels compassos 83-84 fins a l'últim *do*, que és el GUAPA del cant final. `finale` (FINAL ESBOJARRAT):
el compàs 75 de l'últim trio. El text del cant és cosa de la integració.

## Fitxers

- `aligot.pdf`, `aligot.mxl`: les fonts.
- `timing.json`: generat. La versió triada, les frases amb compassos, temps i segons, els punts de tempo i la melodia
  (`[temps, durada en temps, altura MIDI, compàs, inici s, final s]`; compàs 0 = el tancament de l'arranjament).
- Generat també: `src/song-tombairot.json` (el contracte del joc, amb les mateixes claus que el del Bou),
  `public/music/tombairot-aligot.mp3` i, per escoltar-les (no van a Git), `output/tombairot-music/`.

Per tornar-ho a generar:
`uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/music/build_tombairot.py`
(`--json-only` no torna a fer l'àudio). Prova: `node tests/figures/tombairot/tombairot-chart.mjs`.

**Escolta:** cap. L'agent no ho ha pogut escoltar; l'han de sentir el propietari i el mòbil.
