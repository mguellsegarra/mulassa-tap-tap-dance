# Teaser del Bou · vídeo per a Instagram

Vídeo vertical de 1080 × 1920 a 60 fps (22,9 s) que anuncia el Bou Tradicional de Valls: detalls del Bou i de la
seva colla al ritme d'un bombo esmorteït, els ulls sols a les fosques, el Bou sencer sota el focus sobre les primeres
notes de la melodia i el rètol final. Es filma amb el joc mateix, fotograma a fotograma; no publica res.

El codi i la retolació són aquí; la música, els fotogrames i l'MP4 es generen a `output/instagram/bou-teaser/`
(fora de Git). Res d'això toca el joc ni `public/music`.

## Fer-lo

Des de l'arrel del checkout, amb `npm run dev` servint-lo, Chrome, FFmpeg amb libx264 i Playwright a `/tmp/ui-inv-pw`:

```sh
uv run --python 3.11 --with numpy --with scipy --with soundfile tools/social/instagram/campaigns/bou-teaser/build-audio.py
python3 tools/social/instagram/campaigns/bou-teaser/make-cut.py
node tools/social/instagram/campaigns/bou-teaser/film.mjs --fps=60
sh tools/social/instagram/campaigns/bou-teaser/export.sh 60
```

Resultat: `output/instagram/bou-teaser/bou-teaser.mp4`.

- `build-audio.py`: la música. El bombo del Bou sota l'aigua (un filtre que s'obre tres cops), el compàs d'entrada i els
  dos primers compassos de la melodia tal com sonen al joc, i quatre bombos per al rètol. Llegeix el tempo de
  `src/song-bou.json`; escriu `musica-a.wav` i `timeline-a.json`. `b` i `c` com a argument fan les altres dues
  versions que es van descartar (una sola pujada; curta).
- `make-cut.py`: el muntatge, `cut.json`, a partir d'aquell temps: quin pla hi ha a cada segon (`shots.json` en té les
  càmeres, amb el format de `src/figures/common/clip-camera.js`), amb quina llum i com es fon.
- `film.mjs` + `film-page.js`: obre el joc sense finestra, hi posa el rellotge i les càmeres del muntatge i desa un
  JPG per fotograma. El rellotge de la pàgina avança un fotograma cada cop, o el públic es mou massa de pressa.
  `--stills=1.9,13.2` desa només aquells segons, per provar un enquadrament; `--raw` treu els fosos i el rètol.
- `export.sh`: l'MP4, amb un segon de negre i silenci al davant.

## Per canviar-lo

- Un pla: `shots.json` (càmera) i l'ordre a `make-cut.py`. La colla (`who`) i els ulls (`eyes`) tenen càmera pròpia a
  `film-page.js`.
- La llum: `grade` a `make-cut.py` (1, 1.5 o 2) i les taules de `film-page.js`.
- La retolació: «el», «bou» i «tradicional» són les de l'anunci (`campaigns/bou-vi`); «de» i «valls» surten de
  `lettering.py` amb Pricedown Black (Typodermic), que no es desa al repositori.

## Límits

- Fa servir el Bou tal com és al joc: si canvien el ball, la colla o el públic, un pla pot quedar tapat o descentrat.
  Cal mirar els fotogrames abans d'exportar.
- La nit, el focus i el flaix són els del primer tram techno del joc, allargats a tot el vídeo des de la pàgina de
  captura. `film-page.js` importa mòduls de `src/` pel seu camí.
