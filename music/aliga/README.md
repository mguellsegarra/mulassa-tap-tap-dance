# Àliga de Valls de 1991

Previsualització de la figura d'Anton Gurí, el portador i tres aligons.
No és un nivell jugable: el flag evita substituir la Mulassa.

```sh
npm ci
npx vite --port 5183 --host --strictPort
```

Obre `http://localhost:5183/?aliga` i toca per iniciar música i ball.
En automatització, sempre `?aliga&mute`.
`aligat=60` fixa el segon 60; `view=front|side|back|top` canvia la vista.
El final es manté; un nou toc reinicia.

## Música

`balladeta.json` és la transcripció editable de la
[partitura publicada a Tinet](https://usuaris.tinet.cat/rclibru/sonsimusiques/balladetadelaliga.htm).
Forma adaptada: introducció + (A A B B) × 3 + coda, 598 notes.
La coda, les veus petites dels compassos 33–35 i el recompte final
continuen provisionals. No es presenta com una recreació definitiva.

La banda comparteix síntesi i mescla amb el Drac. Introducció a 76 BPM,
cos a 104–116 BPM i coda a 112; són tempos adaptats per al joc.
Final musical a 112,137 s, més 3,5 s de cua.

Per regenerar, amb `uv` i `ffmpeg` disponibles:

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/aliga/build_music.py
```

El generador guarda WAV, MIDI, MusicXML i diagnòstics a `output/aliga/`
(ignorat per Git). Actualitza només l'MP3 propi i `src/game/aliga-song.json`;
comprova la integritat dels àudios originals.

## Ball i comprovacions

`src/game/aliga-dance.json` identifica moviments observats, inferits i adaptats.
El ball segueix el rellotge de l'àudio i el mapa de compassos generat.
L'anell dels aligons i els recorreguts són una adaptació; el suavitzat
anticipa alguns girs respecte de les inclinacions. L'encaix amb els accents
i l'acceptació artística i auditiva continuen pendents.

`npm run check` inclou proves de geometria, contacte dels peus, abast,
col·lisions, continuïtat, rellotge i enquadrament. No substitueixen
la revisió visual o l'escolta.
