# Balladeta de l'Àliga de Valls

Transcripció editable de l'escaneig publicat a [Tinet](https://usuaris.tinet.cat/rclibru/sonsimusiques/balladetadelaliga.htm). Recreació **provisional** per a l'Àliga de 1991 d'Anton Gurí. La comparació numèrica amb la plaça de 2023, contrastada amb 2017, sosté la hipòtesi introducció + (A A B B) × 3. La coda encara no està verificada: s'ha adaptat la del paper de fa a do (+7 semitons).

`balladeta.json` és la font: 43 fragments escrits, notes i durades en negres, veus alternatives, caselles, segno/coda i dubtes. El MusicXML és una reducció monofònica; el desplegament està definit al JSON. Compàs 2/4. Paper: do i secció en fa, negra = 92. Recreació: do, frases inicials aproximadament 75–77 BPM i acceleració per frases a 89, 94, 106 i 110 BPM. Introducció a 76 i coda a 110 per adaptació. No s'ha fet validació auditiva; l'anàlisi espectral no la substitueix.

La melodia sola es genera abans de l'arranjament. La mescla utilitza síntesi additiva suau, baix, acords polsats i percussió de poca intensitat. L'harmonia i l'acompanyament són d'aquesta adaptació; no s'atribueixen a Marçal Caselles. Caselles consta com a arranjador de la gravació original dels Ministrers de la Vila Nova, no d'aquesta recreació.

Per regenerar, amb `uv` i `ffmpeg` disponibles, des de l'arrel del checkout:

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido tools/aliga/build_music.py --output-dir '/Users/marc/Desktop/Bestiari de Valls - I+D/05-aliga-1991/08-resultats/musica' --recordings-dir '/Users/marc/Desktop/Bestiari de Valls - I+D/05-aliga-1991/04-audio'
```

El generador escriu MIDI de lectura i de plaça, WAV de melodia i mescla, MP3, MusicXML, comparacions A/B, metadades i validació. A `public/music/aliga/` només hi deixa l'MP3. Comprova els hashes dels dos àudios existents abans i després. No modifica la música ni el chart de la Mulassa.

`src/game/aliga-song.json` inclou URL amb hash, durada, tempos, pulsacions, compassos i seccions. Els índexs de compàs comencen a 0: 0 és l'anacrusi inicial de mitja negra, A1 comença al 3. `beatCount` és la durada en negres, no la longitud de `beatTimes`; les pulsacions regulars comencen després de l'anacrusi. `subBeatTimes` explicita les coordenades de mitja negra. La durada musical és 146.587 s i el WAV incorpora 0.8 s de cua. El fitxer de metadades es lliura per a una futura integració; no s'ha connectat al joc.

Els informes, retalls i àudios per revisar són a `05-aliga-1991/08-resultats/musica/` del dossier: `transcripcio.md`, `dubtes-per-compas.md`, `peces-i-tempos.md`, `tempos-enregistraments.json`, `fonts-musicals.md` i `ab/`. La lectura de les veus petites de 33–35, el recompte final de Tinet i la coda de plaça continuen pendents. Cal resoldre'ls abans de presentar la recreació com a fidel o definitiva.
