# Bou VI · anunci per a Instagram

Campanya independent del joc i de la campanya 1.3.0. Quatre slides verticals de
1080 × 1920: data (0–4 s), expectativa (4–8 s), dècada (8–12 s) i revelació
(12–20 s). L'anunci es prepara per publicar el 17 de novembre, amb el reclam
"Dijous 19 de novembre". No publica res automàticament.

## Edició i reproducció

`stories.html` obre la vista de les quatre slides; el botó de reproducció activa
la seqüència i el so. Les capes són cel amb núvols, llum ambiental CSS, campanar PNG transparent,
ombra CSS i cada línia de retolació SVG. La revelació diu "el / bou / tradicional"
en blanc i "VALLS" a sota, amb degradat i doble contorn inspirats en el VI. `story.css` en
controla la composició. `timeline.js` és l'únic propietari del temps; durant la
reproducció el rellotge és l'àudio. La pausa, el cursor i `storyTimeline.seek(t)`
permeten revisar qualsevol fotograma sense esperar ni gravar en temps real.

`?slide=1&t=2` mostra només S1 al seu segon 2 (igual per 2–4).
`?export&t=13` mostra la seqüència a mida de viewport i al segon global 13.
`?guides` marca x=80–1000, y=270–1536, reservant espai per a Instagram.
La composició és fixa 9:16, també quan es revisa en altres mides de finestra.

Generar l'HTML autònom, sense dependències:

```sh
python3 tools/social/instagram/campaigns/bou-vi/build.py
```

Resultat a `output/instagram/bou-vi/stories.html`, amb imatges, retolació, CSS,
JavaScript i WAV incrustats. Funciona sense xarxa. Instagram requereix vídeo;
aquest HTML és la font del muntatge i la previsualització, no un fitxer pujable.
L'exportador antic de tres slides de 15 s no serveix per a aquesta seqüència.

## Fonts i procedència

- Retolació: **Pricedown Black**, Raymond Larabie / Typodermic, versió 5.200.
  Font real emprada per crear vectors, no lletres generades amb IA. Descàrrega
  de l'autor a https://www.dafont.com/pricedown.font (2026-11-16).
  Història de l'autor: https://typodermicfonts.com/between-the-lines/stories/pricedown/.
  La llicència desktop permet gràfics acabats; no s'incrusta ni es redistribueix
  el fitxer OTF. Per canviar els textos, descarregar-lo i executar
  `uv run --with fonttools python lettering.py /ruta/Pricedown.otf`.
  Les paraules es defineixen a `lettering.py`, cada línia és un SVG independent.
- Campanar: il·lustració generada amb referència fotogràfica de **Santi Gomà**,
  https://commons.wikimedia.org/wiki/File:Campanar_Sant_Joan_(Valls).JPG,
  **CC BY-SA 3.0**, https://creativecommons.org/licenses/by-sa/3.0/.
  Adaptació il·lustrada amb llum coral i ombres violetes; capa `campanar.png`
  distribuïda amb la mateixa llicència. La foto original no s'inclou al repo.
- "VALLS": dibuix geomètric propi a `lettering.py`, sense serifes, amb degradat
  blau–violeta–rosa–coral i doble contorn ivori/negre. No és una font oficial.
  Referència visual directa: els PNG `logo_vi.02gnpy7k4ozcz.png` i
  `logo_gta.0-hc15s02t_zg.png` de https://www.rockstargames.com/VI
  (consultats el 16-11-2026). El VI oficial és artwork, no Times New Roman.
  La versió Times de la primera proposta s'ha descartat completament.
  Les tres línies Pricedown del títol es normalitzen a unitats del disseny abans
  de dibuixar el contorn: negre de 12 px per costat a 1080 px, independent de
  la mida de la paraula. VALLS manté aquest gruix negre més el filet interior clar.
  "Tradicional" conserva els glifs Pricedown i es condensa per guanyar alçada.
- Cel i núvols: il·lustració generada independent del campanar; llum ambiental CSS.
- Bombo: composició i síntesi originals a **120 BPM**, 20 s, mono 44,1 kHz,
  PCM 16 bits. `python3 score.py` regenera `assets/bombo.wav` amb la biblioteca
  estàndard, amb cops greus, harmònics de membrana i redoble abans del segon 12.
  El guany deixa marge abans de 0 dBFS.
- Final melòdic: `reveal-score.py` llegeix les quatre primeres notes de Gralla I
  de `music/bou-tradicional/score.json`, obra de Francesc Bofarull: do5–sol5–do5–sol5.
  Entren als segons 12, 13, 14 i 15, amb les durades i silencis de la partitura.
  Reutilitza `tools/music/synth.py` amb els paràmetres de la veu del Bou; no copia
  l'MP3 del joc. La reverb estèreo té predelay de 35 ms, reflexions diferents per
  canal, filtratge a 3,6 kHz i cua T60 de 3,2 s. Els primers 12 s mantenen exactament
  les mostres de bombo acceptades. Genera `assets/bombo-final.wav`, estèreo, 20 s;
  és la pista que reprodueix l'HTML. El bombo original es conserva per comparar.
  Regenerar amb `uv run --with numpy --with scipy python reveal-score.py` i
  després executar `build.py`. Informe a `output/instagram/bou-vi/reveal-audio.json`.

## Estat de revisió

Marc ha aprovat el ritme; ha demanat afegir les quatre notes amb reverb al final.
La nova mescla queda pendent d'escolta de Marc; l'agent no ha verificat l'escolta.
Sense exportació MP4 ni publicació.
Les captures de revisió i els resultats generats es desen a `output/`, fora de Git.
No modifica el runtime, els fitxers musicals ni els assets públics del joc.
