# Traducció aranesa (`oc`)

He traduït les 869 claus (882 cadenes comptant les formes plurals) i la pàgina del projecte. He conservat els noms propis, els àlies, els marcadors i les etiquetes; `home` no s'inclou perquè només es llegeix del català. `lang` és `oc`, `ogLocale` és `oc_ES` i els plurals són `one/other`, tal com indica el brief. No he modificat el registre ni la càrrega dels idiomes.

## Dubtes lingüístics per revisar

- `hud.lane.balloon`, `game.practice.balloon.word`, `figures.practice.balloon.word.mulassa`, estadístiques i ajuda: he triat `balon`; cal confirmar si és la denominació preferent del globus inflable de festa, i no només de la pilota esportiva.
- `hud.*streak`, `ui.*streak*`, `ui.stats.bestStreak` i privadesa: `seria` expressa la successió d'encerts; cal confirmar si hi ha un terme de joc més natural per a una ratxa.
- `hud.lane.hold`, `game.practice.hold.word` i instruccions relacionades: he mantingut `MANTEN` com a ordre curta; cal revisar l'imperatiu de `mantier` i la naturalitat de `manten sarrat` en instruccions de teclat.
- `hud.results.miss`: he triat `ERROR` per respectar l'espai; es perd el matís humorístic de `XURRO`.
- `hud.praise.c20`, `hud.praise.c50`, `hud.praise.c60`: `BEROISSIMA!`, `VALLS O BARBARIA!` i `ACUMULANT AURA!` són adaptacions; convé revisar-ne el registre còmic amb un parlant aranès.
- `boot.joke.paneroles`: he triat `cucaraches`; queda pendent confirmar la forma normativa preferent per a l'insecte.
- `ui.photo.act.mula.e`, `ui.photo.act.mula.r`: `patada` i `culada` descriuen l'acció; cal revisar si hi ha noms aranesos més precisos per a la guitza i el cop amb el darrere.
- `ui.photo.free.touch2`, `ui.photo.freeHelpTouch`: `pessiga` descriu el gest de zoom amb dos dits; queda pendent confirmar el verb habitual en interfícies araneses.
- `ui.board.withArticle.*`, `ui.seasons.ofElided`, `ui.stats.sinceElided`: he traduït els fragments sense canviar els marcadors; les contraccions davant noms dinàmics i dates mereixen una revisió en pantalla.
- `html.rich.iosHint`: he traduït els noms de les accions d'iOS; el dispositiu pot mostrar-los en una altra llengua si no ofereix interfície aranesa.
- `html.rich.privacy.*`: he conservat el contingut i les condicions del català; convé revisar la terminologia informàtica específica (`pòrta-retalhs`, `galetes`, `blocador`) amb un corrector aranès.
- `tools/deploy/seo-content/oc.json`: he mantingut `en catalan` al resum perquè és un fet afirmat per la font, tot i que aquesta pàgina està traduïda; qualsevol actualització del fet s'hauria de fer també al català.

## Criteris i fonts consultades

- He usat `sarra` per a prémer una tecla, a partir de l'entrada `prémer → sarrar` del [Diccionari català-aranès de l'IEA](https://www.institutestudisaranesi.cat/wp-content/uploads/2024/12/Diccionari-CAT-AR.pdf).
- He contrastat les grafies [ànim](https://www.diccionari.cat/aranes/anim) i [seria](https://www.diccionari.cat/aranes/seria) amb el Diccionari der aranés de l'IEA.
- `Privadança` coincideix amb l'ús de la [pàgina aranesa d'avís legal de la Generalitat](https://tramits.gencat.cat/oc/ajuda/avis_legal/).
- `BEN` té tres caràcters davant els dos de `BÉ`: he prioritzat la forma aranesa; totes les etiquetes HUD/joc que en català tenen com a màxim 24 caràcters continuen dins de 24.
- He mantingut `CARRETILLES` com a terme cultural i hi he afegit la glossa `Petards` a l'ajuda. `colla`, `bestiari` i `seguici` també tenen glossa en els textos explicatius on apareixen.

## Validació de la traducció inicial (històrica)

- Comprovació ESM específica d'`oc`: correctes l'ordre i la paritat de claus, els marcadors per forma plural, `one/other`, les etiquetes i atributs HTML, els tokens de joc protegits i el límit de 24 caràcters de les etiquetes curtes HUD/joc.
- SEO específic d'`oc`: correctes l'estructura, les captures i els vídeos, els paràgrafs, els enllaços, les negretes i els marcadors; generació temporal HTML/Markdown comprovada amb `lang="oc"`, `oc_ES`, canonical, hreflang i enllaç de joc `?lang=oc`.
- `node tests/ui/i18n.mjs`: s'atura a `ja.game.detail.taps: placeholders differ`, perquè compara el total de marcadors de la forma japonesa única amb les dues formes catalanes. No he modificat el japonès ni el test.
- `node tests/build/seo.mjs`: s'atura a `a single language adds no hreflang`, una expectativa de llengua única que ja no es compleix quan hi ha altres fitxers SEO. No he modificat el test.

## Revisió de coincidències amb el català (2026-10-21)

Comparació exacta dels set JSON, incloent els objectes plurals: 140 claus idèntiques inicials; 22 corregides i 118 conservades. He canviat també dues etiquetes que ja eren diferents per complir el límit estricte de llargada: 24 claus modificades en total.

Font principal: [Diccionari català-aranès de l'IEA, 2024](https://www.institutestudisaranesi.cat/wp-content/uploads/2024/12/Diccionari-CAT-AR.pdf), consultat directament per entrades. Les coincidències no són per si soles una prova de manca de traducció: el diccionari dona també `tardor`, `estiu`, `ara`, `sense`, `personatge`, `anterior`, `següent`, `moviment`, `tard`, `quin`, `ritme` i `calor`. Els plurals femenins aranesos en `-es` justifiquen `figures` i `partitures`.

He comprovat també [ànim al diccionari de l'IEA](https://www.diccionari.cat/aranes/anim) i [l'ús de Seguim en una publicació de l'IEA](https://www.institutestudisaranesi.cat/wp-content/uploads/2026/03/Mots-1.pdf). `Torna a començar` és una construcció compartida, amb imperatiu de tu; no cal alterar-la perquè coincideixi amb el català.

### Canvis i decisions de traducció

- `game.pop.patapam`: `PATAPAM!` → `PATAPOM!`.
- `game.celebrate.bravo`: `BRAVO!` → `ÒSCA!`.
- `game.celebrate.visca`: `VISCA!` → `VISQUE!`.
- `ui.pause.restart`: `Reinicia` → `Torna a començar`.
- `ui.photo.act.mula.r`: `culada` → `còp de cu`.
- `ui.photo.key.space`: `Espai` → `Espaci`.
- `ui.select.soonQ`: `Pròximament?` → `Lèu?`.
- `ui.sync.none`: `sense ajust` → `sense ajustament`.
- `hud.praise.c30`: `IMPARABLE!` → `NON T'ARTURES`.
- `hud.praise.c100`: `+1000 AURA` → `+1000 ENCANT`.
- `figures.practice.balloon.word.drac`: `CARRETILLES` → `PETARDS`.
- `figures.pop.visca.mulassa`: `VISCA!` → `VISQUE!`.
- `figures.pop.visca.drac`: `VISCA!` → `VISQUE!`.
- `figures.chatter.valls.mulassa`: `VISCA VALLS!` → `VISQUE VALLS!`.
- `figures.chatter.valls.drac`: `VISCA VALLS!` → `VISQUE VALLS!`.
- `html.settingsAbout.credits`: `Crèdits` → `Credits`.
- `html.privacyLb`: `Classificacions · Supabase` → `Classaments · Supabase`.
- `html.resultsBoard`: `Classificacions` → `Classaments`.
- `html.legend.carretillesName`: `CARRETILLES` → `PETARDS`.
- `html.syncValue`: `Ara: sense ajust` → `Ara: sense ajustament`.
- `html.restartLabel`: `Reinicia` → `Torna a començar`.
- `game.judge.good`: `BEN` → `ÒC`.
- `hud.results.good`: `BEN` → `ÒC`.

Dubtes resolts amb una traducció explícita: `culada` passa a `còp de cu`; `reinicia`, a `Torna a començar`; `imparable`, a `NON T'ARTURES`. `CARRETILLES` és un nom comú de pirotècnia, no un nom propi: he triat `PETARDS`, coherent amb la glossa existent. `aura`, en sentit de mem d'internet, passa a `encant`; és una adaptació del reclam humorístic. `BEN` ocupava 3 caràcters davant els 2 de `BÉ`: `ÒC` expressa aprovació i respecta el límit estricte, tot i que no és una traducció literal de l'adverbi. Aquestes decisions substitueixen les notes anteriors sobre `culada`, `CARRETILLES` i l'excepció de llargada de `BEN`.

### Inventari complet de coincidències conservades

Cada fila és una clau; els objectes plurals es compten una sola vegada.

| Clau | Valor | Motiu |
| --- | --- | --- |
| `game.judge.miss` | `ERROR` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `game.detail.move` | `MOVIMENT` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `game.detail.late` | `TARD` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `game.pop.pam` | `PAM!` | Onomatopeia pam admesa per l'IEA; marcador intacte. |
| `game.pop.many` | `PAM! x{pops}!` | Onomatopeia pam admesa per l'IEA; marcador intacte. |
| `game.flow.next` | `SEGUIM!` | Forma seguim documentada en publicacions de l'IEA. |
| `game.celebrate.crac` | `QUIN CRAC!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `game.celebrate.impressive` | `IMPRESSIONANT!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.account.previousLine` | `{level}: {score} punts · {pct}%` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.board.alias.1` | `Timbaler` | Àlies protegit, no es tradueix. |
| `ui.board.alias.2` | `Portador` | Àlies protegit, no es tradueix. |
| `ui.board.alias.3` | `Gegant` | Àlies protegit, no es tradueix. |
| `ui.board.alias.4` | `Capgròs` | Àlies protegit, no es tradueix. |
| `ui.board.alias.5` | `Drac` | Àlies protegit, no es tradueix. |
| `ui.board.alias.6` | `Castellera` | Àlies protegit, no es tradueix. |
| `ui.board.alias.7` | `Balladora` | Àlies protegit, no es tradueix. |
| `ui.board.alias.8` | `Mulasser` | Àlies protegit, no es tradueix. |
| `ui.board.aliasPlaceholder` | `p. ex. {example}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.board.me` | `TU` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.board.publish` | `Publica` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.board.published` | `Publicat!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.board.publishing` | `Publicant…` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.card.points` | `{score} punts` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.feedback.send` | `Envia` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.feedback.sending` | `Enviant…` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.pause.restartWatch` | `Torna a començar` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.photo.actions` | `Accions` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.profile.btn.create` | `Crea` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.profile.btn.working` | `Un moment…` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.profile.done.created` | `Perfil creat!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.profile.done.recovered` | `Perfil recuperat!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.profile.guest` | `Convidat` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.backTo` | `Torna a {name}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.colFigure` | `Figura` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.indexYou` | `Tu` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.line` | `{name} · {rest}` | Només marcadors dinàmics i puntuació. |
| `ui.seasons.me` | `TU` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.name.2` | `Estiu` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.name.3` | `Tardor` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.now` | `Ara: {name}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.of` | `de {name}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.ofElided` | `d’{name}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.ofTotal` | `de {n}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.players` | `{"one": "{n} participant", "other": "{n} participants"}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.seasons.points` | `{n} punts` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.select.card` | `{name}, {entity}, {town}` | Només marcadors dinàmics i puntuació. |
| `ui.share.shared` | `Compartit!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.error.late` | `Tard` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.error.move` | `Moviment` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.guapa` | `{n} GUAPA de {total}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.month.3` | `de març` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.month.8` | `d’agost` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `ui.stats.time.hm` | `{h} h {m} min` | Marcadors i símbols d'unitat h/min. |
| `ui.stats.time.m` | `{m} min` | Marcadors i símbols d'unitat h/min. |
| `ui.sync.now` | `Ara: {value}` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.lane.mash1` | `PICA` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.praise.c10` | `QUIN ESTIL!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.praise.c40` | `ESPECTACULAR!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.top.double` | `x2 PUNTS` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.card.deValls` | `D E  V A L L S` | Nom propi Valls i preposició de compartida. |
| `hud.card.points` | `P U N T S` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.share.fontSample` | `àèéíïòóúüçÀÈÉÍÏÒÓÚÜÇ·l’` | Mostra tècnica de glifs, no és text de la interfície. |
| `hud.results.points` | `PUNTS` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `hud.results.bestPoints` | `{score} PUNTS` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.pop.pam.mulassa` | `PAM!` | Onomatopeia pam admesa per l'IEA; marcador intacte. |
| `figures.pop.pam.drac` | `PAM!` | Onomatopeia pam admesa per l'IEA; marcador intacte. |
| `figures.chatter.heat.mulassa` | `QUINA CALOR!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.chatter.heat.drac` | `QUINA CALOR!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.chatter.rhythm.mulassa` | `QUIN RITME!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.chatter.rhythm.drac` | `QUIN RITME!` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.input.left.mulassa` | `GUA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.left.drac` | `CRE` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.right.mulassa` | `PA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.right.drac` | `MA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.both.mulassa` | `GUAPA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.both.drac` | `CREMA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.hit.both.mulassa` | `GUAPA!` | Token de joc protegit; es conserva també la puntuació. |
| `figures.hit.both.drac` | `CREMA!` | Token de joc protegit; es conserva també la puntuació. |
| `figures.input.rightAria.mulassa` | `PA, dreta` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.input.rightAria.drac` | `MA, dreta` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `figures.practice.gua.word.mulassa` | `GUA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.practice.gua.word.drac` | `CRE` | Token de joc protegit; es conserva també la puntuació. |
| `figures.practice.pa.word.mulassa` | `PA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.practice.pa.word.drac` | `MA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.practice.guapa.word.mulassa` | `GUAPA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.practice.guapa.word.drac` | `CREMA` | Token de joc protegit; es conserva també la puntuació. |
| `figures.chant.first.mulassa` | `GUAPA,` | Token de joc protegit; es conserva també la puntuació. |
| `figures.chant.second.mulassa` | `GUAPA…` | Token de joc protegit; es conserva també la puntuació. |
| `figures.chant.*` | català original | Els crits finals de les tres figures es queden en català a tots els idiomes. |
| `html.profile.aria` | `Perfil` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.settingsOffset` | `Ara: 0 ms` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.settingsPrompt` | `Activa` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.privacyShare` | `Compartir un resultat` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.boardFigures.aria` | `Figura` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.boardCols.points` | `Punts` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.boardColsAll.points` | `Punts` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.publishSend` | `Publica` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.accountTitle` | `Perfil` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.profileKind` | `Convidat` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.seasonsFigures.aria` | `Figura` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.cardKind` | `Convidat` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.feedbackSend` | `Envia` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.selectPrev.aria` | `Personatge anterior` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.selectStrip.aria` | `Figures` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.selectForward.aria` | `Personatge següent` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.legend.animName` | `ÀNIM` | Ànim és una entrada del diccionari aranès de l'IEA. |
| `html.syncStart` | `Comença` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.syncMeasuredKicker` | `RETARD MESURAT` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.pause.aria` | `Pausa` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.pause.title` | `Pausa (Esc)` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.pauseTitle` | `Pausa` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |
| `html.rich.sync.touch` | `Toca <b data-fig>GUA</b> o <b data-fig>PA</b>` | Lèxic i flexió compartits amb l'aranès; marcadors i noms propis intactes. |

### Validació d'aquesta revisió

- `node tests/ui/i18n.mjs`: correcte (`i18n ok`); només avís experimental de Node sobre `localStorage`. Les incidències de japonès anotades a la validació inicial ja no bloquegen aquest test.
- Comprovació addicional de tots els JSON aranesos: ordre i paritat de claus, marcadors per forma, categories de plural i etiquetes riques intactes. Límit estricte d'1,3× comprovat en totes les formes de `hud.*` i `game.*`, sense aplicar la tolerància de sis columnes del test general.
- Aquesta revisió només modifica els JSON d'`oc` i aquest document; no revalida les pàgines SEO ni la resta de la traducció inicial.
