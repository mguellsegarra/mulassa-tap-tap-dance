# Stories d'Instagram de Mulassa

Generador local reutilitzable. La campanya `1.3.0` conserva les tres stories acordades el 3 de novembre de 2026: resum, insígnies i cors. El codi i els recursos queden al repositori; els HTML, captures i vídeos generats van a `output/` i no es versionen.

## Generar l'HTML

Des de l'arrel del checkout, amb Python 3 (sense dependències):

```sh
python3 tools/social/instagram/build.py --campaign 1.3.0
```

Obre `output/instagram/1.3.0/stories.html`. És autònom: inclou font, SVG, CSS i JavaScript i funciona sense servidor ni connexió. Té controls de reproducció, pausa, temps i zones segures. Les tres animacions duren 15 segons; després s'aturen. El botó de reproducció torna a començar.

Per triar una altra carpeta:

```sh
python3 tools/social/instagram/build.py --campaign 1.3.0 --out /tmp/mulassa-stories
```

## Exportar MP4 finals en alta qualitat

Camí preferit per als vídeos finals: captura determinista de 450 PNG sense pèrdua per story i codificació directa a H.264, 1080×1920, 30 fps constants, CRF 16, yuv420p, BT.709, faststart, 15 s i sense àudio. No passa per una gravació WebM. Cal Playwright, Chrome i FFmpeg amb libx264.

```sh
node tools/social/instagram/export-hq.mjs --input output/instagram/1.3.0 --ffmpeg /ruta/a/ffmpeg --pw /tmp/ui-inv-pw
```

Accepta `--slide 1|2|3`. Desa `D1.mp4`–`D3.mp4`, un poster per story a `posters/` i `export-hq-report.json`. La velocitat de captura no canvia el ritme del vídeo: cada PNG correspon exactament a `frame/30` segons. No alterar la màquina ni instal·lar paquets globals per obtenir FFmpeg; durant aquesta sessió es va usar el binari de `imageio-ffmpeg` en una dependència temporal d'uv:

```sh
uv run --with imageio-ffmpeg python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'
```

Passa la ruta retornada a `--ffmpeg`; la ruta de la memòria cau pot canviar. Revisa també el vídeo codificat, no només els PNG.

## Exportar MP4 amb gravació de navegador (alternativa)

Cal Node i una instal·lació de Playwright amb Chrome disponible. Es pot usar la mateixa instal·lació externa que les eines de QA del projecte, sense afegir dependències al joc:

```sh
node tools/social/instagram/export.mjs --input output/instagram/1.3.0 --pw /tmp/ui-inv-pw
```

També accepta `PLAYWRIGHT_MODULE` amb el mòdul de Playwright; sense cap opció intenta importar `playwright`. El navegador s'executa en mode headless i es tanca al final.

Genera `D1.mp4`, `D2.mp4` i `D3.mp4` (H.264, 1080×1920, aproximadament 15 s, sense àudio), les fonts WebM a `video-sources/` i les mesures de captura a `export-report.json`. L'exportació grava i codifica en temps real. Per regenerar només una story:

```sh
node tools/social/instagram/export.mjs --input output/instagram/1.3.0 --slide 1 --pw /tmp/ui-inv-pw
```

Torna a escriure els fitxers de les stories seleccionades dins la carpeta de sortida. Revisa visualment el vídeo exportat abans de publicar-lo. La captura i la codificació depenen del ritme del navegador; les mètriques del report ajuden a detectar salts. No publica res ni canvia dades del joc.

## Preparar una altra campanya

1. Copia `campaigns/1.3.0/` a `campaigns/<nom>/`.
2. Edita els textos i els colors a `template.html`; mantén els marcadors `{{...}}` i els hooks de les animacions. El format actual està pensat per a tres stories de 15 s; un altre nombre o durada requereix ajustar també `motion.js` i l'exportador.
3. Actualitza `ranking.json` si vols mostrar un altre exemple. El nom i la puntuació s'escapen al generar l'HTML. **Jesss és una captura històrica del rànquing del 3 de novembre de 2026**, no una consulta en directe.
4. Genera amb `--campaign <nom>` (o amb la ruta de la carpeta). Revisa, exporta i comprova el resultat.

`assets/` conté una còpia dels recursos reals utilitzats: insígnies, selector, fons del loader, font i cor. Això permet reproduir aquesta campanya encara que el joc canviï. No s'actualitzen automàticament: si es vol renovar un dibuix, cal extreure'l del joc i revisar la composició. `motion.js` és compartit entre campanyes: qualsevol canvi s'ha de revisar també sobre la `1.3.0`.

## Criteris de disseny conservats

- Fons animat de Mulassa i calçot; text recte i sense marcs de mòbil.
- Groc `#f5c518`, vermell `#c0283c`, verd maragda del titular D1 `#55d68b`; metadades en gris càlid.
- Contingut principal dins x=80–960, y=270–1536 a 1080×1920. Les partícules poden travessar aquesta zona; el text queda dins.
- Cors de la D1 en una capa de tota la story, darrere del text, sense retall del bloc.
- Insígnia petita al costat del nom; canvi suau i galeria contínua. La Pessigolla usa `--jester` clar.
- URL del peu D3 en negreta.

Per a captures automatitzades, `?slide=1&still&t=3` mostra una story a 1080 px, pausada al segon 3. `?still&t=3` mostra les tres. `?guides` activa les guies. `window.storyTimeline` exposa `ready`, `duration`, `seek(seconds)`, `play()` i `pause()`; no depèn del runtime del joc.

## Context i represa

Vegeu [HANDOFF.md](HANDOFF.md) per a les decisions de Marc, procedència dels recursos, eines de captura, comprovacions datades, intents descartats i estat de la branca.

## Comprovar el generador

```sh
node tools/social/instagram/tests/build.mjs
```

El test viu dins de l'eina i es pot executar des de qualsevol directori. No el descobreix automàticament el runner del joc; executar-lo a més de les comprovacions generals abans de publicar canvis de l'eina.
