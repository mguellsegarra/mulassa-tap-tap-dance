# Handoff: eina de stories d'Instagram de Mulassa

Data: 2026-11-03. Llegiu aquest document i [README.md](README.md) per reprendre la feina sense el xat.

## Objectiu i estat

Conservar i reutilitzar el muntatge de tres stories de les novetats d'insígnies i cors. L'eina es prepara a **`release/1.3.0`**, tota dins de `tools/social/instagram/`; el test és `tools/social/instagram/tests/build.mjs`. Per comprovar l'estat de commit i push, consultar Git: aquest document no substitueix l'estat actual de la branca. No s'ha publicat res a Instagram.

Ubicació en aquesta màquina (`mac-studio`):

- Checkout de destí: `/Volumes/development/worktrees/mulassa-tap-tap-dance/release-1.3.0`.
- Treball original i exports finals: `/Volumes/development/artifacts/mulassa-instagram-2026-11-03/`.
- Sortida regenerada des de l'eina: `output/instagram/1.3.0/`, dins el checkout de destí, ignorada per Git.

El checkout principal `/Volumes/development/projects/mulassa-tap-tap-dance` estava a `release/1.2.7`. **No és el destí on s'ha guardat l'eina.** Les rutes absolutes d'aquest apartat són context de la sessió; el generador desat no en depèn.

Hi havia molts altres canvis en curs al worktree 1.3.0, incloent Pop, jocs, menú i documentació. No s'han incorporat a aquesta feina. Cal revisar el diff i l'índex abans de qualsevol commit. Seguiu `AGENTS.md` per a confirmacions de commit, push i publicació; no s'han autoritzat en aquest xat.

## Fitxers que cal conservar

| Fitxer o carpeta | Responsabilitat |
| --- | --- |
| `tools/social/instagram/README.md` | Instruccions operatives, dependències, comandes i reutilització. |
| `tools/social/instagram/build.py` | Llegeix campanya i recursos; genera un HTML autònom amb tots els recursos incrustats. Python 3, sense paquets externs. |
| `tools/social/instagram/export-hq.mjs` | Exportació final preferida: PNG deterministes a 30 fps i FFmpeg H.264 CRF 16, sense WebM intermedi. |
| `tools/social/instagram/export.mjs` | Captura les stories amb Chrome headless i codifica MP4 H.264. Valida durada i dimensions; desa mètriques. |
| `tools/social/instagram/motion.js` | Timeline determinista, play/pause/seek, partícules, canvi d'insígnia i estat del botó de cors. |
| `tools/social/instagram/campaigns/1.3.0/template.html` | Composició, textos, CSS i marcadors de la campanya actual. |
| `tools/social/instagram/campaigns/1.3.0/ranking.json` | Exemple històric del rànquing: Jesss, 148.227 punts. No consulta en directe. |
| `tools/social/instagram/assets/` | Còpies dels SVG reals, fons, font i cor que fan reproduïble aquesta campanya. |
| `tools/social/instagram/tests/build.mjs` | Portabilitat de la generació, rutes amb espais, nom escapat, puntuació i error davant de marcadors no resolts. |

Els recursos són una instantània editorial, no una segona implementació del joc en producció. No hi ha imports d'aquesta eina des del runtime ni passos de publicació afegits.

## Resultat que s'ha de preservar

Tres stories **1080×1920, 15 segons, sense àudio**, identificades com D1, D2 i D3. Marc pot referir-s'hi amb noms antics C1–C3.

- **D1, resum:** "Ei, que hi ha novetats!"; "Trieu insígnia." amb "I lluïu-la al costat del nom al rànquing."; "Feu-vos sentir." amb "Un cor per les figures que voleu a la plaça."; tancament "La plaça és vostra." i "Entreu i proveu les novetats!".
- **D2, insígnies:** "El vostre nom, amb insígnia!"; explicació de lluir-la al rànquing i fardar de colla o poble; exemple fora de cap pill amb posició 1, Jesss, insígnia canviant i 148.227; galeria de tres files amb desplaçament suau; tancament "Quina us representa?" i "Trieu-la al vostre perfil.".
- **D3, cors:** "Qui voleu a la plaça?"; "Un cor per les figures que voleu veure al joc."; selector de figures amb scroll; botó que passa de "Tens el meu cor!" a "El meu cor és teu!"; "A qui doneu el vostre cor?" i "Feu-vos sentir a mulassa.cat!", amb **mulassa.cat en negreta**.

Marc va confirmar explícitament el text "Feu-vos sentir. — Un cor per les figures que voleu a la plaça.". No tornar a demanar aquesta decisió.

### Disseny acordat

- Fons fosc real del loader amb Mulassa, calçot i estrelles en moviment. Aparença desenfadada; l'estil inicial sobri es va descartar.
- Text blanc/crema. Groc Mulassa `#f5c518`, vermell dels cors `#c0283c`; no groc llima ni rosa.
- **Només "novetats!" de D1 va en verd maragda viu `#55d68b`**, últim canvi demanat.
- Capçalera "mulassa.cat", "Nova actualització" i numeracions en gris càlid `#9b8b77`, menys protagonista.
- Text recte: no rotacions. Sense marcs de telèfon ni captura d'un mòbil dins d'un altre mòbil.
- Il·lustracions i insígnies natives, ampliades i integrades al fons. No tornar a posar els botons de registre "Confirma el correu" o "Ara no".
- Zones de reserva escollides per aquesta composició: contingut principal dins x=80–960, y=270–1536 a 1080×1920. Les guies no constitueixen una garantia de totes les interfícies d'Instagram: revisar el resultat final dins de l'app abans de publicar.
- `.safe` és més conservador: top 27 cqw, bottom 37 cqw, left 10 cqw, right 12 cqw. No moure el text cap als controls superior/inferior/dret de la story.

### Detalls d'animació i correccions importants

- Timeline de 15 s, iniciada quan fonts i imatges estan carregades. Al segon 15 es pausa intencionadament: no és un bloqueig. "Reprodueix 15 s" torna a començar; el slider permet inspeccionar un instant.
- Fons amb tile de 33,333 cqw i drift continu de 9 s.
- D1: el cor gran és `assets/hero-heart.svg`, amb volum, ombra curta i reflex. El viewBox té marge; no retallar-lo.
- Els cors petits de D1 **han de sortir del cor gran i viatjar per tota la story**. La capa `.story-fx` és filla directa de `.intro`, ocupa tot el frame, passa darrere del text i té overflow visible. No tornar-la a posar dins de `.heart-origin` amb overflow hidden: era el motiu dels cors tallats. Ràfegues a 1,3 / 5,3 / 9,3 / 13,3 s, de 3,6 s cadascuna, amb destinacions repartides i llavor determinista.
- D2: slot d'insígnia de 6×6 cqw al costat del nom, gap 1,4 cqw i compensació òptica top 0,18 cqw. L'espai és estable en canviar d'insígnia; no es mouen nom ni puntuació. Es va mesurar una diferència de centre visual d'aproximadament 1,5 px a 1080.
- Exemple amb senyera, UAF, escut i La Pessigolla; no campanar a l'exemple del nom. Pot aparèixer a la galeria.
- No tornar a posar "exemple d'insígnies": el rètol és només "Al rànquing". Marc va descartar el nom inventat Laia de Valls.
- Galeria amb dues còpies de cada fila, animació lineal de 38 s i fila central inversa; no reiniciar-la durant els 15 s.
- La Pessigolla: el SVG central fa servir `--jester`, **no `--jester-ink`**. El valor és crema `#fff3d6`; amb la variable equivocada quedava fosc i no es llegia.
- D3: selector amb moviment lineal al llarg de la story, recorregut limitat a dues targetes. Les targetes parcials dels extrems tenen màscara suau intencionada. Inclou Mulassa i Drac, després figures pendents amb silueta.
- Els cors D3 continuen amb la ràfega local del botó; la correcció de capa completa és específica de D1.
- Respecta `prefers-reduced-motion`: sense drift, scroll ni partícules.

## Eines i procedència dels recursos

No s'ha fet servir ImageGen per al disseny final. La composició és HTML/CSS, SVG i animacions natives; no cal generar altres imatges per recuperar-la.

- **Python 3:** generació de l'HTML, JSON, incrustació Base64 de font i preparació dels recursos.
- **Node + Playwright + Chrome headless:** captures, inspecció del DOM/estils/animacions, mesures i gravacions. Instal·lació disponible durant la sessió: `/tmp/ui-inv-pw/node_modules/playwright/index.mjs` (temporal; comprovar-la abans d'usar-la en un altre moment).
- **Chrome amb `--use-angle=metal`:** captura amb GPU real, sense obrir finestres ni prendre el focus de Marc.
- **Canvas + MediaRecorder de Chrome:** codificació a `video/mp4;codecs=avc1.42001E`, canvas 1080×1920, 25 fps, 10 Mbps. Captura font WebM i codificació posterior en temps real.
- **Eines T3 `html_preview` i `html_render`:** inspecció i mostra del document HTML complet dins del xat. Passar l'HTML real, no reconstruir-lo a mà. Van mostrar 524 px d'alt a 728 px d'ample per al grid de tres stories i controls.
- **Eina de lectura d'imatges:** inspecció de captures PNG i fotogrames reals dels MP4; una comprovació del DOM sola no demostra que el cor o els glifs es vegin bé.
- **Skills aplicats:** `uipolish`, `unslop`, `resum`, validació visual de Mulassa, simplificació de codi, `task-cleanup`, instruccions T3 i, per aquest document, `handoff`. No s'han delegat agents.

Origen del material congelat a `assets/`:

- `background.txt`: data URL SVG del fons de `#loader.page::before, #rotate::before` a `index.html` del joc.
- `baloo-2-latin.woff2`: font real de `public/fonts/`; llicència OFL adjunta.
- `badges.json` i `badge-shelf.json`: SVG de la UI real del selector d'insígnies. Per renovar-los, mirar `src/ui/badge-art.js`, `badge-picker.js` i `player-badges.js` i contrastar amb la UI real.
- `selector-cards.json`: art SVG de les targetes reals, amb nom i entitat. Per renovar-les, mirar `src/ui/selector-portraits.js`, `src/game/figure-portraits.js` i els retrats de `src/figures/`; el Drac es va obtenir de `src/figures/drac/drac-portrait.js`.
- Efecte de cors basat en el comportament de `src/ui/figure-hearts.js`; l'adaptació editorial viu a `motion.js`, sense executar accions del joc.
- `hero-heart.svg`: cor vectorial fet per aquest muntatge, sense raster ni imatge externa.
- `ranking.json`: consulta de lectura de `https://mulassa.cat/` a la sessió. Jesss, 148.227 punts, 95%, Tardor 2026; no usar-ho com a prova del líder actual. No s'han escrit perfils ni vots reals.

Es van consultar referències dels generadors antics (`referencia-generadors.md` als artefactes), que parlaven de `tools/instagram/`, `npm run dev:instagram` i `build:instagram`. **No són les comandes d'aquesta eina** i no s'ha comprovat que estiguin disponibles a la branca actual. El generador de stories nou funciona sense Vite ni servidor.

## Reprendre o crear una campanya

Des de l'arrel del checkout 1.3.0:

```sh
python3 tools/social/instagram/build.py --campaign 1.3.0
node tools/social/instagram/tests/build.mjs
node tools/social/instagram/export.mjs --input output/instagram/1.3.0 --pw /tmp/ui-inv-pw
```

Per exportar només una story, afegir `--slide 1` (o 2 o 3). `--out <carpeta>` al generador tria una altra sortida. `--campaign` també accepta una ruta de carpeta, incloent espais.

Si no existeix la instal·lació temporal de Playwright, usar una instal·lació disponible amb `--pw <directori que conté node_modules/playwright>` o `PLAYWRIGHT_MODULE=<mòdul>`. No fer dependre el codi d'una ruta personal ni afegir Playwright al runtime del joc. L'exportador requereix Chrome i H.264 MediaRecorder; falla si aquest codec no està disponible.

Per a una campanya nova, copiar `campaigns/1.3.0/` a una carpeta nova i editar-ne plantilla i ranking. No modificar la 1.3.0 per publicar un altre anunci. `assets/` i `motion.js` són compartits: qualsevol canvi s'ha de provar sobre les campanyes existents. Canviar nombre de stories o durada exigeix actualitzar explícitament timeline, controls, CSS i exportador; avui no és un editor genèric de qualsevol nombre de pàgines.

### Captures i verificació manual

Obrir l'HTML generat amb:

- `?slide=1&still&t=3`: D1 a mida d'exportació, pausada al segon 3.
- `?slide=2&still&t=5`: exemple de canvi d'insígnia.
- `?slide=3&still&t=2.4`: botó i ràfega de cors D3.
- `?still&t=3`: vista conjunta.
- `?guides`: guies de zones de reserva.

En Playwright: esperar `window.storyTimeline?.ready`; usar `storyTimeline.seek(t)` i esperar un frame abans de capturar. Per validar a amplades petites amb `?slide=...`, sobreescriure `body.export .story{width:375px}` o `320px`; el mode export fixa 1080 px per defecte. Revisar també 393 i 430 px. No confondre les dimensions del viewport amb les de la story exportada.

Mirar com a mínim inici, ràfegues, canvi d'insígnia i final. Comprovar que el text no desborda, que es llegeix La Pessigolla, que les partícules no es tallen dins del bloc i que el vídeo no s'ha congelat abans del final. La pausa al segon 15 és esperada.

El muntatge actual reserva espai per a controls d'Instagram; una pantalla física o la publicació real no es van provar. No s'han publicat les stories.

## Què es va comprovar

- En arxivar l'eina, l'HTML regenerat es va comparar amb `cmp` contra el muntatge final dels artefactes: **idèntic byte a byte**.
- `node tools/social/instagram/tests/build.mjs`: passa. Comprova generació fora de la carpeta de campanya, rutes amb espais, escaping del nom, puntuació formatada, tres stories, font incrustada, absència de rutes personals i error davant d'un marcador desconegut.
- `node --check` de `motion.js` i `export.mjs`: passa.
- L'exportador reutilitzable desat es va executar per a **D1**: MP4 1080×1920, 14,999 s; 900 frames mesurats a la font, p99 16,8 ms. Fotograma al segon 3 revisat a `output/instagram/1.3.0/D1-export.png`.
- Els MP4 finals D1–D3 dels artefactes originals es van verificar a 1080×1920 i aproximadament 15 s, amb diversos fotogrames de cadascun. No confondre aquesta comprovació històrica amb una exportació completa de D2/D3 des de l'eina arxivada: aquesta última encara no s'ha repetit.
- La composició original es va mesurar a 1080, 430, 393, 375 i 320 px i diversos instants. Els gaps principals D1 van quedar 139/139/137 px a 1080; cap error de les mesures de zones de reserva en aquella passada. Els detalls són als artefactes, `qa-D/measurements.json` i `validation.md`.
- `npm run check` al worktree de destí: **124/129**, no verd. Log de la passada guardat a `output/instagram/1.3.0/checks-2026-11-03.log`. No s'han arreglat aquests cinc errors aliens a l'eina ni s'ha afirmat que tota la branca estigui validada:

| Prova | Error observat en aquella passada |
| --- | --- |
| `tests/build/modules.mjs` | `jocs/games/pop/board.js` té 351 línies, màxim 300. |
| `tests/render/render-quality.mjs` | `location.hash` no definit al harness, crida a `.match`. |
| `tests/figures/common/scenes.mjs` | Crida a `.match` sobre un valor no definit. |
| `tests/ui/games-menu.mjs` | `opening focuses the sheet`. |
| `tests/ui/i18n.mjs` | Dos literals fora del catàleg a `jocs/games/pop/ranking-mock.js`. |

Són resultats datats, no una garantia de l'estat d'una futura sessió. El test de l'eina no substitueix la comprovació global necessària abans d'un commit.

## Intents descartats i paranys

- El primer verd del titular, #83b96b, es va descartar per massa apagat; es va substituir per #55d68b, més viu.
- Versions A/B/C amb aspecte sobri, text girat o marcs de mòbil: rebutjades. La família final és D.
- Captures estàtiques i cors plans/retallats: substituïts per SVG i animacions natives. No recuperar els muntatges antics com a base.
- Llegir l'HTML complet amb límit de sortida petit pot truncar-lo i trencar el preview. Llegir-lo com a cadena completa i passar-la directament a T3, sense imprimir Base64 al xat.
- `verify-play.mjs` dels artefactes espera vídeos incrustats d'una versió antiga: **no serveix per a la família D**, que anima CSS/SVG.
- `avconvert` no va admetre la font WebM; no repetir aquest camí com si estigués verificat. L'exportador desat usa Chrome per codificar H.264.
- No retallar l'inici amb `durada_font - 15`: la font WebM tenia uns 16 s i això es menjava gairebé un segon de l'animació. S'usa un offset de 0,08 s. És una mesura de la sessió: revisar inici i final si canvia la versió del navegador o la càrrega de la màquina.
- Carregar un `file://...mp4` des d'una pàgina `about:blank` creada amb `setContent` va fallar per accés al recurs. Per inspeccionar el vídeo en aquest context, usar un `data:video/mp4;base64,...` o navegar primer a un origen adequat.
- `export-report.json` descriu les stories de l'última execució; una passada amb `--slide` no conserva les entrades de les altres stories.
- Les captures/exports pesats no s'han de posar a Git: són regenerables. Tampoc cal copiar tots els scripts exploratoris dels artefactes al repositori.

## Evidència i scripts històrics fora de Git

A `/Volumes/development/artifacts/mulassa-instagram-2026-11-03/`:

- `stories.html` i `stories-D.html`: últim muntatge interactiu; `D1.mp4`, `D2.mp4`, `D3.mp4`: exports finals; `D1.png`–`D3.png`: posters.
- `qa-D.mjs`, `check-details.mjs`, `check-heart-spread.mjs`, `verify-exports.mjs`: scripts de mesura i evidència de la sessió. Encara tenen rutes locals; per reutilitzar-los cal adaptar les entrades, no afegir-los com a dependència de l'eina.
- `qa-D/`, `video-review/`, `details-check.json`, `heart-spread-check.json`: mesures, fotogrames i contact sheets.
- `referencia-generadors.md`: notes dels editors antics, només referència històrica.

Els navegadors propis es van tancar i els temporals de la tasca es van netejar. No es va iniciar cap servidor nou per a aquesta eina. No aturar processos aliens ni netejar altres worktrees.

## Per continuar

1. Confirmar màquina i checkout segons `AGENTS.md`; revisar els canvis locals abans d'editar.
2. Llegir el README i reproduir la campanya 1.3.0 amb el generador.
3. Si es prepara un anunci nou, duplicar la campanya i treballar-hi, preservant aquesta referència.
4. Revisar captures i vídeo real abans de donar-los per bons. Seguir el procés del projecte per a canvis visuals nous.
5. Si Marc demana commit, resoldre o aclarir les fallades globals i mostrar els fitxers, la validació i la comanda exacta per a la confirmació. No barrejar els altres canvis del worktree.

**Per reprendre-ho:** proporcionar `tools/social/instagram/HANDOFF.md` a la conversa nova. No cal recuperar les converses anteriors.

## Actualització: exportació final d'alta qualitat

A petició de Marc, s'ha afegit `export-hq.mjs` per lliurar els tres vídeos finals sense tornar a comprimir una gravació WebM. Captura 450 PNG a instants exactes (`frame/30`), i els envia per pipe a FFmpeg: H.264 libx264, CRF 16, preset medium, yuv420p, BT.709 i faststart. El temps que triga a capturar no altera els 15 s del vídeo. Vegeu el README per a les comandes i l'obtenció temporal del binari FFmpeg amb uv/imageio-ffmpeg; no hi ha dependència nova al joc ni instal·lació global.

La sortida final d'aquesta passada és `/Volumes/development/artifacts/mulassa-instagram-2026-11-03/finals/`. Aquest camí substitueix l'exportador de gravació del navegador com a opció preferida per als lliuraments finals; el camí antic queda com a alternativa.

Exportació HQ completada i verificada per a les tres stories: 1080×1920, 30 fps, 450 fotogrames, 15 s, H.264 i descodificació íntegra sense errors. Fotogrames dels segons 0, 3, 7 i 14,9 extrets per a revisió; revisats visualment D1 al segon 3, D2 al 7 i D3 al 3. Lliuraments: `finals/01-novetats.mp4`, `02-insignies.mp4`, `03-cors.mp4` i `mulassa-stories-instagram.zip`. Informe `finals/verified.json`. Les còpies D1–D3 del directori d’artefactes pare també s’han actualitzat a HQ.

## Organització final

Tot el codi, els recursos, les campanyes, el test i aquest handoff viuen a `tools/social/instagram/`. El test s'ha mogut a `tests/build.mjs` dins d'aquesta carpeta i resol l'arrel de l'eina des de la seva URL, sense dependre del directori de treball. No queda cap fitxer d'aquesta tasca a `tests/` ni cap handoff a l'arrel del repositori. Els resultats generats continuen fora de Git.

Validació prèvia al commit: el worktree compartit va donar 127/128 (fallada del menú de jocs aliena a aquesta carpeta). Una còpia temporal de HEAD `7e0e749`, amb només aquesta eina afegida i metadades Git locals per a les proves de gitignore, va passar `npm run check`: **132/132**. El test propi passa també amb directori de treball extern. Tot el codi funcional i recursos coincideixen amb la còpia validada; només documentació i espais de la llicència s’han ajustat després. L’índex conté altres canvis: el commit de l’eina s’ha de limitar explícitament a `tools/social/instagram/`.
