# Ball de la Mulassa de Valls: música del joc

Composició: Francesc Bofarull i Figuerola (1987).

`score.json` és la transcripció manual de la veu superior de la reducció per a banda publicada per l'ESMUC (durades en negres; R = silenci; compassos 0 i 33: anacrusi de dues negres):
https://www.esmuc.cat/wp-content/uploads/2026/04/AB-Analisi-Partitura-ARRE-2025JU-Partitura_compressed.pdf

És l'única entrada de `tools/build_taiko.py`, que genera tota la música, el mapa de notes del joc (`src/song.json`) i `taiko-arrangement.json`. Les versions anteriors (gralla chiptune, C64, arcade, banda de vent...) i les seves eines es poden recuperar de l'historial de git.

## Arranjament Taiko

`mulassa-taiko.mp3`, `.wav` i `.mid`, a 152 BPM fixos. És un arranjament nou, en to de festa major, que només aprofita la melodia de `score.json`. A la part A cada negra de la partitura ocupa dos temps, però la banda toca a tempo sencer: primer caixa al segon i quart temps i baix de pasdoble (fonamental i quinta), després bombo a negres, baix sincopat i glockenspiel doblant la melodia. Els acords de do menor s'il·luminen amb mi bemoll, si bemoll i la bemoll majors. B i la coda fan servir un temps per negra, amb metalls suaus a contratemps, baix a octaves, campanes, i petits redobles cada quatre compassos de la melodia. Abans de cada B (temps 140–143 i 240–243) i al final (308–312) hi ha redoblaments en crescendo. L'última frase de la coda (temps 292–308) dobla la subdivisió i és el clímax: és el FINAL ESBOJARRAT del joc. Sense gralla ni sons de pols: tots els timbres són additius i suaus.

`mulassa-taiko-ambient.mp3` és l'ambient del menú: percussió de festa major amb taiko arrodonit, picaments de mans, shaker suau, baix i guitarra de niló. Comença amb quatre compassos d'entrada gradual (uns 6,3 s): primer percussió, després harmonia, baix i acords. La guitarra insinua els colors do/mi/sol de B amb un petit arc melòdic i una resposta descendent, en registre mitjà, amb atac tou i sense salts d'octava. Sense campanes ni cascavells.

Una sola idea de vuit compassos (`C C F F G G C C`) es toca dues vegades. El ritme de la melodia es reconeix en cada parella de compassos; les respostes sostenen la nota d'arribada i deixen un temps per respirar. Els acords duren almenys dos compassos i el final queda en do, com l'inici. Les veus interiors es mouen com a màxim tres semitons, mantenen les notes comunes i tenen cues curtes.

El baix i el timbal caminen junts al primer i tercer temps; la guitarra i les mans responen al segon i quart. Els accents varien lleument al llarg de vuit compassos, les respostes melòdiques es toquen més fluixes i relaxades, i els acords es rasquen amb una petita separació entre cordes. Els desplaçaments expressius són fixos (4–14 ms per instrument, més el rascat), no s'acumulen ni alteren el tempo. Només hi ha una resposta curta de vora al final de cada vuit compassos.

Després de l'entrada es repeteixen 16 compassos (64 temps) al mateix tempo del joc. `ambientLoop` a `src/song.json` indica els punts de bucle exactes: el reproductor comença al segon zero però les voltes següents salten la introducció. La reverberació es plega només dins del tram repetible, i l'arxiu porta un segon de continuació després del punt de bucle. Així l'MP3 ja comença suau per si sol i el ritme no s'apaga a cada volta.

El mateix generador escriu `src/song.json` (`[temps, don|ka, nivell, gran, final_de_mantén]`). Cada nota del joc és una nota de la melodia; la primera és la G4 d'entrada (temps 12). Les excepcions són el cop final i, només a DIFÍCIL, els cops de caixa del segon i quart temps de la part A allà on la melodia descansa (PA). A la part A, els taikos de l'àudio toquen les notes de la melodia.

### Regles del joc

- **GUA** (taronja, esquerra; `don`): primer temps i meitat del compàs de la melodia. **PA** (turquesa, dreta; `ka`): temps del mig. Les notes intermèdies segueixen la melodia: si puja, PA; si baixa, GUA.
- **GUAPA!** (meitat taronja, meitat turquesa): 16 accents per cançó (plats, inicis de frase, últim do i cop final). A tots els nivells cal prémer els dos botons alhora (80 ms; a FÀCIL, 150 ms), i puntua el doble. Amb un sol botó és error («ELS DOS ALHORA!»).
- **MANTÉN** (NORMAL i DIFÍCIL): les 7 notes llargues de la part A (3 temps o més), alternant GUA i PA. Es jutgen dues vegades: l'inici, com un toc, i la cua, segons quanta estona s'ha mantingut premut.
- **GLOBUS**: redobles als temps 140–143, 240–243 i 308–312. Compten tots els tocs de qualsevol costat; esclata cada cert nombre de tocs (5/8/12 segons la dificultat, més al final) i en surt un altre. Compta fins a 60 ms abans del final.
- **FINAL ESBOJARRAT**: l'última frase de la coda (compàs 66, temps 292) fins a l'últim cop, amb punts dobles.
- **Nivells** (notes cada 7 s, inici → final): FÀCIL 6–7 constant; NORMAL 8 → 12; DIFÍCIL 13–15 → 20–25, i totes les corxeres només al frenesí (~30). `nivell` 3 = nota de la melodia que no surt a cap nivell.

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/build_taiko.py
```
