# Teaser del Drac · Castanyada

Story de 1080 × 1920 (9:16), 12 segons i fons negre. Importa el model i el ball originals del joc: no hi ha cap còpia del Drac ni cap canvi a la versió pública.

Amb Vite en marxa, obre `/tools/instagram/drac-teaser/index.html?mute`. Tria A1 (cua), A2 (ala) o A3 (mig cos), ajusta la càmera si cal i comprova tot el loop. Els enquadraments inicials deixen el cap fora del pla. El text es pot afegir a Instagram.

`?record&mute&preset=tail` amaga els controls i les guies. `?capture&mute&preset=tail` pausa el temps per exportar fotogrames. Els altres presets són `wing` i `half`.

API d'exportació:

- `window.teaserReady === true`: primer fotograma disponible.
- `window.setPreset('tail' | 'wing' | 'half')`: aplica un enquadrament.
- `window.renderAt(seconds)`: pausa i dibuixa exactament aquest instant, independentment de l'historial.
- `window.teaser.duration`: 12 segons.
- `window.teaser.stage.settings`: gir, altura, amplitud i desplaçament de la càmera.

L'animació recorre el ball original sempre endavant, entre els segons de referència 42 i 54. Una fosa a negre de mig segon a cada extrem amaga el salt del loop. Les vores superior i inferior del detall s'esvaeixen en una ombra de 160 px perquè no hi hagi un tall horitzontal visible. El ball es col·loca una sola vegada al començament; es conserven el gir i el desplaçament del rig perquè els peus plantats no llisquin. No incorpora àudio.

## Exportar els tres vídeos

Executa `node tools/instagram/drac-teaser/export.mjs URL_EDITOR CARPETA_SORTIDA` amb Vite en marxa. Cal Playwright i ffmpeg; si Playwright no és una dependència local, indica el seu `index.mjs` amb la variable `PLAYWRIGHT_MODULE`. Exporta MP4 H.264 a 1080 × 1920, 60 fps i 12 segons, més fotogrames de comprovació.

El botó de vista de gravació conserva els ajustos de càmera. Prem Escape per tornar als controls. Les propostes de text són a `TEXTOS.txt`.

Prova de plaça nocturna: afegeix `&night` a l'URL (per exemple `?night&mute&preset=half`). Reutilitza la plaça sense públic ni músics, amb llum càlida lateral i ambient fred. És una proposta d'enquadrament; els MP4 anteriors continuen sent la versió negra. La cua conserva el rig rígid del joc (`poseCarrier`), sense afegir-hi balanceig independent.
