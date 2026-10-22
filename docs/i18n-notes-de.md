# Notes de traducció alemanya (`de`)

Tractament informal amb `du`. Noms de figures, pobles, colles, cançons i àlies conservats. Les citacions alemanyes fan servir „…“. `home` del contingut SEO es conserva en català, tal com demana el brief.

## Llargada de `hud.*` i `game.*`

Recompte de caràcters Unicode, inclosos espais, puntuació i marcadors literals. He comprovat totes les cadenes i cada forma plural amb el llindar estricte d'1,3×. Cap text que tenia 24 caràcters o menys supera els 24 en alemany. Excepcions:

| Clau | Català | Alemany | Caràcters ca → de | Factor | Motiu |
| --- | --- | --- | --- | --- | --- |
| `hud.results.good` | BÉ | GUT | 2 → 3 | 1.50× | `GUT` és la forma alemanya natural més curta; no faig servir una abreviatura opaca. |
| `game.judge.good` | BÉ | GUT | 2 → 3 | 1.50× | `GUT` és la forma alemanya natural més curta; no faig servir una abreviatura opaca. |

Formes curtes triades: `SERIE` per RATXA, `HALTEN` per MANTÉN, `TREFFER` per ENCERTS, `ZUM KNALL` per PER PETAR i `WIR SIND AM ENDE!!` per NO PODEM MÉS!!. `GUT` és coherent als judicis i als resultats.

## Excepcions de `ui.*` al llindar d'1,5×

- `ui.photo.key.space`: "Espai" → "Leertaste" (5 → 9; 1.80×). Conservo el terme complet per claredat.
- `ui.share.copy`: "Copia" → "Kopieren" (5 → 8; 1.60×). Conservo el terme complet per claredat.
- `ui.stats.balloons.own` (`one`): "Has rebentat {n} globus" → "Du hast {n} Ballon zum Platzen gebracht" (23 → 39; 1.70×). Conservo el terme complet per claredat.
- `ui.stats.balloons.own` (`other`): "Has rebentat {n} globus" → "Du hast {n} Ballons zum Platzen gebracht" (23 → 40; 1.74×). Conservo el terme complet per claredat.
- `ui.stats.daysPlayed` (`one`): "Has jugat {n} dia" → "Du hast an {n} Tag gespielt" (17 → 27; 1.59×). Conservo el terme complet per claredat.
- `ui.stats.daysPlayed` (`other`): "Has jugat {n} dies" → "Du hast an {n} Tagen gespielt" (18 → 29; 1.61×). Conservo el terme complet per claredat.

## Context i decisions

- `ui.board.withArticle.fem` i `ui.board.withArticle.masc`: `{name}` sense article, perquè s'insereix darrere de `mit` i el gènere de les figures no sempre es pot inferir del català. No he canviat el contracte ni els noms.
- `ui.seasons.ofElided` i `ui.stats.sinceElided`: mateixa construcció que les variants sense elisió; l'alemany no necessita l'elisió catalana. Els mesos es combinen com `Seit {day}. {month} {year}`.
- `figures.pending.*`: distingeixo singular i plural de la font amb `Diese Figur` / `Diese Figuren`, sense endevinar el gènere dels noms.
- `figures.chant.*.drac`: `DER / PLATZ / SOLL BRENNEN!` manté la crida del Drac amb ordre alemany; convé escoltar-ne l'encaix als tres temps quan s'integri l'idioma.
- `figures.practice.balloon.word.drac` i `html.legend.carretillesName`: conservo `CARRETILLES` com a terme cultural; la primera explicació d'ajuda el glossa com a `Sprühfeuer`.
- `figures.invite.text`: glossa breu de `colla`, `gegants` i `bestiari`. A la pàgina del projecte, glosses de `bestiari`, `seguici`, `Fira de Santa Úrsula` i `festa major`; les bromes i bombolles conserven les referències locals sense carregar-les d'explicacions.
- `hud.share.fontSample`: mostra de glifs alemanys `äöüßÄÖÜẞ„“’`; és una cadena tècnica per escalfar la font, no text visible.

## Validació

- Validació específica de `de`: 869 claus, mateix ordre i tipus que `ca`, marcadors amb les mateixes quantitats, plurals `one`/`other` i etiquetes HTML amb atributs i enllaços idèntics.
- SEO alemany: estructura, nombre de seccions/paràgrafs/captures/vídeos, marcadors, negretes, URL i `home` intactes; generació temporal HTML/Markdown correcta, amb `lang=de`, `ogLocale=de_DE`, canonical, hreflang i JSON-LD alemanys.
- `node tests/i18n.mjs`: l'execució general s'ha aturat perquè falta `src/i18n/locales/eu/html.json`, aliè a aquesta traducció.
- `node tests/seo.mjs`: s'ha aturat a l'asserció `a single language adds no hreflang`, que assumeix només català tot i els nous fitxers d'idioma. No he modificat el test ni els altres idiomes.
- No he fet proves visuals ni he activat l'idioma al registre: la integració queda fora d'aquest encàrrec. La comprovació de llargada és textual, no de l'amplada real dels glifs.
