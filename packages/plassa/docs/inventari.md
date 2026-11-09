# Plassa: inventari de funcionalitats

Plassa (entre Mulassa i plaça) és el marc comú dels jocs de mulassa.cat, i en el futur una llibreria a part. Neix a `packages/plassa/src/` i s'hi
afegeixen peces a mesura que els minijocs les necessiten. mulassa.cat hi passarà quan hi hagi uns quants jocs.

## Com serà

- **La pàgina principal és el selector de jocs.** mulassa.cat (el joc de ritme) és un joc més, amb la seva pàgina,
  igual que Pop, Memory i la resta.
- **Un sol codi.** El selector i tots els jocs fan servir les mateixes peces: aspecte, teclat, so, arrencada, compte i
  part social. Cap joc copia una peça. Si n'hi falta una, s'afegeix a Plassa.
- **Un sol compte.** El perfil de mulassa.cat (nom, correu confirmat, insígnia) és el mateix al selector i a tots els
  jocs. Des de qualsevol joc es pot obrir el perfil i fa el mateix que al selector.
- **Dues capes de configuració.** La general, comuna a tot arreu (compte, idioma, música, privadesa, versió), i la de
  cada joc (per exemple, la sincronia de mulassa.cat). Cada joc obre la general amb el mateix botó i hi afegeix les seves
  opcions.
- **Música i silenci a tot arreu.** El selector i tots els jocs tenen el mateix botó, i la preferència és única.

Llegenda de l'estat:
- **Plassa**: ja és a `packages/plassa/src/`.
- **mulassa.cat**: existeix al joc principal i s'ha de portar.
- **Pop**: existeix a Mulassa Pop i s'ha de portar.
- **Nou**: no existeix enlloc.

## 1. El selector (pàgina principal)

| Funcionalitat | Avui | Estat |
| --- | --- | --- |
| Llista de jocs amb portada, vídeo i «Juga» | full «Jocs» dins mulassa.cat (`ui/games-menu.js`, `games-carousel.js`, `games-hero-video.js`) | mulassa.cat |
| Cada joc és una pàgina: navegació completa, i en sortir el joc no queda congelat en memòria | `games-menu.js` (`location.replace`) | mulassa.cat |
| Tornar al selector des d'un joc | `a.exit` de Pop (`game.css`) | Plassa |
| Barra comuna: perfil, configuració, música, ajuda | cada pàgina la fa a la seva manera | Nou |
| Novetats: un joc nou s'anuncia un sol cop a qui ja jugava abans | `ui/news-sheet.js` | mulassa.cat |
| Cua d'avisos d'un sol cop: final de temporada, estadístiques, insígnies, novetats, consells del dispositiu | `ui/greeting.js`, `services/seen-notices.js` | mulassa.cat |
| Rànquings i podis de tots els jocs en un sol lloc | Classificació, només de mulassa.cat | Nou |

## 2. Compte (comú a tots)

| Funcionalitat | Avui | Estat |
| --- | --- | --- |
| Sessió única al navegador, compartida entre pàgines | `services/supabase-client.js` (Pop ja la fa servir) | mulassa.cat |
| Perfil convidat o perfil verificat amb correu | `ui/profile-ui.js`, `services/leaderboard-identity.js` | mulassa.cat |
| Nom públic triat un sol cop, amb les seves regles | `services/alias-rules.js`, `ui/publish-ui.js` | mulassa.cat |
| Confirmar el correu amb un codi; recuperar el perfil en un altre dispositiu | `services/leaderboard-code.js` | mulassa.cat |
| Perfils anteriors del dispositiu | full Perfil (`account-ui.js`) | mulassa.cat |
| Insígnies: triar-ne una, veure-la al costat del nom, l'avís quan n'hi ha de noves | `ui/player-badges.js`, `badge-picker.js`, `badge-svg.js`, `badge-tip.js`, `badge-news.js` | mulassa.cat (Pop les dibuixa) |
| Fitxa pública d'un jugador (tocant-ne el nom) | `ui/player-card.js` (Pop en té una pròpia) | mulassa.cat, Pop |
| Estadístiques del jugador, al dispositiu i al servidor | `services/stats-sync.js`, `ui/stats-view.js` | mulassa.cat (només del seu joc) |
| Funcions que demanen el correu confirmat (els cors i la Bústia) | `ui/confirm-gate.js` | mulassa.cat |
| Captcha només quan cal (perfil nou, missatge) | `services/captcha.js` (Turnstile) | mulassa.cat |
| Esborrar el compte | `supabase/functions/delete-player` | mulassa.cat |
| Privadesa: què es guarda i on | full de privadesa | mulassa.cat |

## 3. Social

| Funcionalitat | Avui | Estat |
| --- | --- | --- |
| Rànquing per joc, amb el teu lloc encara que no hi surtis | Classificació (`ui/board-list.js`); Pop (`ranking-ui.js`), amb les files i el nom de Plassa (`board.js`) | mulassa.cat, Pop |
| Temporades, podis, Saló de la fama, avís de final de temporada | `ui/seasons-ui.js`, `season-end-ui.js`, `select-podium.js` | mulassa.cat |
| Publicar un resultat; si encara no tens nom, es guarda fins que en tinguis | `ui/publish-ui.js`, `publish-land.js`; Pop (`pop-pending`) | mulassa.cat, Pop |
| El servidor valida el resultat: contra la partitura a mulassa.cat, tornant a jugar la partida a Pop | taules i funcions per joc (`pop-score`) | per joc, amb una porta d'entrada comuna |
| Compartir un resultat: enllaç de repte i imatge | `services/share.js`, `ui/share-ui.js` | mulassa.cat |
| Cors a les figures | `ui/figure-hearts.js` | mulassa.cat (propi del seu joc) |
| Bústia de la plaça (missatges a l'equip) | `ui/feedback-ui.js`, worker `feedback` | mulassa.cat |

## 4. Configuració

| Funcionalitat | Avui | Estat |
| --- | --- | --- |
| Botó i full de configuració general, igual a tot arreu | ⚙ de mulassa.cat | Nou |
| Idioma: un sol idioma desat per a tot Plassa | `ui/lang-ui.js`; els jocs el llegeixen (`locale.js`) | mulassa.cat (selector) / Plassa (llegir-lo) |
| Música i silenci, una sola preferència | `music-pref.js`, amb la clau de mulassa.cat (`menu-music`); Pop ja la fa servir | Plassa (falta el botó comú) |
| Instal·lar l'app (PWA) | `ui/install-app.js`, `manifest.webmanifest` | mulassa.cat |
| Versió, crèdits, privadesa, Bústia | full de configuració | mulassa.cat |
| Opcions pròpies de cada joc, a sota de les generals | sincronia de mulassa.cat (`sync-sheet.js`) | Nou (punt d'extensió) |

## 5. Interfície comuna

| Funcionalitat | Estat |
| --- | --- |
| Aspecte: tokens de color per joc, botons, fulls, interruptors, pastilla «?», «Juga», anell de focus (`base.css`) | Plassa |
| Carcassa de les pàgines: fonts amb ciríl·lic i CJK, cobertes, 3-2-1, xifres de final de partida, rànquing i fitxa, girar el mòbil (`game.css`) | Plassa |
| Teclat: fletxes, Enter i Espai, focus recuperat dins el full obert (`sheet-keys.js`, `focus.js`) | Plassa |
| So de la interfície a cada botó i a cada moviment de teclat (`ui-sound.js`) | Plassa |
| Tocar fora del full fa el mateix que Escape (`backdrop.js`) | Plassa |
| Llistes que s'esvaeixen on n'hi ha més (`scroll-hint.js`) | Plassa |
| La barra gruixuda del full que fa scroll (`ui/sheet-fade.js`) | mulassa.cat |
| El teclat en pantalla no tapa el camp de text (`ui/keyboard-room.js`) | mulassa.cat (cal per al nom i la Bústia) |
| Textos per joc i catàleg comú, amb 16 idiomes (`words.js`; `i18n/` de mulassa.cat) | Plassa (per joc) / mulassa.cat (comú) |
| Vibració (`haptics.js`), cap zoom amb doble toc (`double-tap.js`) | Plassa |

## 6. Vida de la pàgina i àudio

| Funcionalitat | Estat |
| --- | --- |
| Pausar la partida quan la pàgina s'amaga, perd el focus o es descarrega (`page-leave.js`) | Plassa |
| Esvair el so abans d'aturar-lo, recuperar-lo en tornar i comprovar que torna; avisar Sentry si no torna (`page-audio.js`) | Plassa |
| Sessió d'àudio d'iOS: no atura Spotify si no sona res (`page-audio.js`) | Plassa |
| Rellotge d'àudio aturat (AirPods): la partida es pausa i el següent toc el reactiva (`page-audio.js`) | Plassa |
| Desbloquejar l'àudio al primer gest (`gesture.js`); l'inici espera el toc que la música necessita (`tap-start.js`) | Plassa |

## 7. Arrencada i robustesa

| Funcionalitat | Estat |
| --- | --- |
| Pantalla de càrrega: la Mulassa corrent i frases que no has llegit (`mula-load.html`, `boot-lines.js`) | Plassa |
| Vigilant de l'arrencada: si el codi no carrega, targeta d'error amb «Torna-ho a provar» (`boot-watchdog.js`) | Plassa |
| Errors a Sentry, sense dades privades (`errors.js`, `sentry-load.js`) | Plassa |
| Versió nova: es recarrega en un moment tranquil (`update-watch.js`) | Plassa |
| Pèrdua del context WebGL: pausa, i targeta si no torna (`gpu-guard.js`) | Plassa |
| Qualitat segons el dispositiu (`quality.js`, `render-quality.js`); escalfament dels shaders (`boot.js`) | Plassa |
| Mòbil vertical, tauleta horitzontal (`orientation.js`) | Plassa |
| Funcionar sense connexió | Nou (avui no hi ha service worker) |

## 8. Peces de joc (cada joc les fa servir si li calen)

| Funcionalitat | Estat |
| --- | --- |
| Millor marca al dispositiu (`best.js`) | Plassa |
| Compte enrere 3-2-1 (`countdown.js`) | Plassa |
| Pausa i final de partida: el full, la Mulassa plorant, els botons | Plassa (CSS) / Pop (la lògica) |
| Ajuda del joc («?») i esglaó de nivell | Pop (feina sense commit a `release-1.3.0`) |
| Rànquing del joc: la fila i el nom amb la insígnia | Plassa (`board.js`, `badge-tip.js`); mulassa.cat hi passarà després de la 1.3.0 |
| Rànquing del joc: publicar, la teva posició, fitxa | Pop (`ranking-ui.js`) |
| Demostració («Mira com es juga») | mulassa.cat (`watch-ui.js`, del seu joc) |

## 9. Què s'ha de fer configurable perquè Plassa pugui sortir a part

Avui Plassa té coses de Mulassa escrites dins el codi. Per publicar-la com a llibreria, cada lloc les ha de poder passar:

- La marca: colors, la figura de la càrrega i les frases.
- Les claus de desament (`mulassa-lang`, `pica-best`, `loader-jokes-seen`).
- El projecte de Supabase i l'esquema del compte, del rànquing i de les insígnies.
- El DSN de Sentry i l'adreça de `version.json`.
- El catàleg de jocs del selector.
- Els textos comuns i els idiomes que s'ofereixen.

## Decisions (Marc, 5 de novembre de 2026)

1. **Plassa ho inclou tot**: interfície, vida de la pàgina, compte i part social. El servidor és un connector: cada lloc
   hi posa el seu projecte de Supabase i el seu esquema.
2. **Rànquings per sempre, i temporades si el joc les vol.** Plassa admet les dues coses i cada joc tria. Pop és per
   sempre.
3. **Estadístiques de cada joc per separat.** Cada joc mostra les seves. El perfil comú no les ajunta.
4. **Un sol interruptor de música** per a tot Plassa: el mateix botó a tot arreu i una sola preferència desada. Qui
   silencia al selector entra a Pop en silenci.

## Decisions obertes

1. Quan el selector passa a ser la pàgina principal (`/`) i mulassa.cat va a la seva pàgina. Cal decidir la nova
   adreça, les redireccions i el `start_url` de l'app instal·lada.
