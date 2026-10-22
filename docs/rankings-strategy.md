# Rànquings, temporades, migració i perfil: document final de decisió

Estat: decidit amb Marc el 2026-10-20. És un document de disseny: no implementa res, i cap pas que toqui producció
s'ha fet. Els passos marcats **[prod]** necessiten la confirmació explícita de Marc en el moment de fer-los.
Base: el codi i les migracions d'aquest repo, AGENTS.md i les skills
`mulassa-release-compatibility`, `mulassa-security-boundary-review` i `mulassa-backup-restore-verification`.
No s'ha llegit cap dada de producció.

Índex:

1. Resum
2. Punt de partida: com funciona avui
3. Totes les decisions
4. Model de rànquing i temporades
5. Versions, famílies i històric
6. Identitat: verificat i convidat
7. Perfil i estadístiques
8. Migració de la base de dades
9. Pla per fases
10. Alternatives descartades
11. Riscos oberts i punts a validar
12. Com s'hi ha arribat (preguntes i respostes)
13. Revisió d'Astra

## 1. Resum

- Cada figura (Mulassa i Drac) té una classificació pública per **temporada**. Una temporada dura un trimestre i es
  diu com l'estació: Hivern, Primavera, Estiu i Tardor, amb l'any ("Tardor 2026").
- Un **canvi de ball** obre una classificació nova d'aquella figura, perquè les puntuacions deixen de ser comparables.
  Mai es barregen puntuacions de balls diferents. El ball nou de la Mulassa (`mulassa-v3`) surt abans de mitjan
  novembre de 2026 i coincideix amb l'inici de la **Temporada 1, "Tardor 2026"**, que s'acaba el 31 de desembre
  de 2026. El Drac estrena la seva classificació a la mateixa temporada. Una figura o un ball que arribin més endavant
  entren a la temporada que estigui oberta.
- Tot el que hi ha ara a la base de dades passa a ser la **Temporada 0**. Es pot consultar, i un client antic que encara
  jugui el ball vell hi pot continuar publicant per sempre.
- Les temporades tancades formen el **Saló de la fama**: podi, nombre de participants i la teva posició. Quan s'acaba
  una temporada on has jugat, el joc t'ho diu un cop ("12 de 48"; si has fet podi, "Has fet podi!").
- Un perfil amb **correu confirmat** porta un tick a tot arreu on surt el sobrenom i té el nom net ("Timbaler").
  Un perfil sense correu és un **convidat**: el seu nom porta quatre xifres a l'estil Discord ("Timbaler#3821"), es veu
  més apagat i no té tick. **No caduca**: si esborra les dades del navegador, el perd. No perd posicions.
- Un botó **Perfil**, al lloc de l'ull a la fila de dalt a la dreta, obre el perfil i les **estadístiques**: partides
  per figura, temps a la plaça, encerts, errors per tipus, GUAPA, globus, millor ratxa, estrelles i dies seguits.
  Es guarden sempre al dispositiu i, si hi ha perfil, també al servidor, sumades entre dispositius. En tocar un
  sobrenom es veu la **fitxa pública** d'aquell jugador, sense dates ni horaris.
- La **migració** és additiva, en una transacció, i manté les signatures de les RPC que fan servir els clients antics.
  El workflow `Desplegament` ja aplica les migracions abans de publicar el client.
- Feina estimada: 13-18 dies, en sis fases.
- El document ja inclou les correccions de la revisió d'Astra (`gpt-6-astra`, 2026-10-20). Vegeu la secció 13.

## 2. Punt de partida: com funciona avui

Ho resumeixo perquè el disseny depèn d'aquests detalls.

**Producció és `master`**, que es desplega a cada push (`deploy-pages.yml`). Les migracions de `master` arriben fins a
`202610170001_record_by_score.sql`. Aquesta branca (`t3/rankings-strategy`) porta, a més, dues migracions que **mai
s'han desplegat**: `202610180001_temporary_profiles.sql` (perfils temporals de 7 dies, `p_notice`, `verified`,
`my_profile`) i `202610190001_temporary_record_by_score.sql`, amb `supabase/ops/temporary-profiles-cron.sql` i els
textos i el tick del client. Amb la decisió 32 no es despleguen: les substitueix la migració dels convidats.
El que segueix descriu producció (`master`), i diu quan una cosa només és a la branca.

**Taules** (esquema `leaderboard_private`, sense accés directe per a `anon` ni `authenticated`):

- `versions(version, difficulty, judgments, max_score, extras_max, active)`: les regles de cada versió de gràfic i nivell.
  Hi ha `mulassa-v1` (la cançó llarga) i `mulassa-v2-short` (la curta, l'actual).
- `profiles(user_id, alias, created_at, last_active_at, last_write_at, is_seed, expires_at, notice_at)`.
  El sobrenom és únic. `user_id` apunta a `auth.users` amb `on delete cascade`.
- `entries(id, user_id, version, difficulty, perfect, good, miss, score, max_combo, quality_units, achieved_at)`, amb
  `unique (user_id, version, difficulty)`: el millor resultat de cada jugador per versió i nivell.

**Puntuació**:

- `score_family()` agrupa `mulassa-v1` i `mulassa-v2-short` en una família, i `comparable_score()` passa els punts de
  la cançó curta a l'escala de la llarga (`src/game/score-scale.js` fa el mateix al client).
- `submit_result(p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo, p_alias)`, 8 paràmetres,
  torna `(improved, quality, score)` i guarda un resultat si té més punts comparables que l'anterior (`202610170001`).
- `get_leaderboard_all(p_version, p_period, p_offset, p_limit)` torna una sola classificació per figura: el millor
  resultat de cada jugador sobre els tres nivells, ordenat per punts. `p_period` només accepta `'all'` des que es va
  treure la setmanal (`202609280004`). Torna `(position, alias, difficulty, quality, score, max_combo, is_self, total)`
  (`202609300004`). La columna `verified` només és a la branca.
- Validació al servidor: el total de judicis ha de quadrar amb el nivell, hi ha un sostre de punts i una coherència
  entre punts i encerts (`202609280015`, `202609300003`), i 10 s entre escriptures per perfil.

**Perfils** (producció):

- La publicació crea un compte anònim de Supabase (amb Turnstile) i un perfil amb sobrenom (`require_player`,
  `update_alias`, `my_alias`; "Crea" fa el perfil abans del primer resultat, `202609300002`).
- Un perfil pot afegir un correu i recuperar-se amb un codi de 6 xifres (`202609300001_email_players.sql`).
- **No hi ha caducitat**: els perfils es queden fins que el jugador els esborra. Els 7 dies només són a la branca.
- Hi ha una funció per llistar els anònims inactius 12 mesos (`leaderboard_expired_players`), però només la fa servir
  una eina manual (`tools/cleanup-leaderboard.mjs`) que no està programada.
- El sobrenom és únic per `alias_key(alias)` (minúscules i sense accents, `202609280011`).
- A la branca, i no a producció: `verified` (`auth.users.email_confirmed_at`) a la classificació, el tick
  (`checkBadge()`, `src/ui/profile-notes.js`), `lock_profile` i `my_profile`. La migració dels convidats en recupera
  el que serveix (el tick, `verified`, el bloqueig) sense els 7 dies.

**Seeds**: jugadors de mostra (`is_seed`) perquè la classificació no surti buida. Cada jugador real n'amaga un
(`202609280014`).

**Client**:

- Rècord local per nivell a `record-points-mulassa-<nivell>` (`src/game/records.js`), amb les claus antigues només de
  lectura. El Drac en té de propis: `record-drac-valls-<nivell>`.
- `src/services/leaderboard-rules.js` només deixa publicar la Mulassa (`validResult`, `snapshotResult`). El Drac
  (`drac-v1`) amaga les fitxes de rànquing del selector.

**Desplegament**: `.github/workflows/deploy-pages.yml` fa `migrate` (`supabase db push`) i després `deploy` (Pages).
L'HTML és `no-cache` i no hi ha service worker. Els clients antics que poden durar dies són les pestanyes obertes i,
sobretot, les apps afegides a la pantalla d'inici d'iOS.

**Proves de base de dades**: PGlite en memòria (`tests/short-ranking-db.mjs`, `tests/seasons-db.mjs`, `tests/player-stats-db.mjs`...),
dins `npm run check`.

**Còpies**: `docs/db-backup.md`. Les còpies manuals i una restauració local s'han provat. El programador automàtic no
s'ha verificat, així que abans d'una migració cal una còpia manual.

## 3. Totes les decisions

| # | Tema | Decisió |
| --- | --- | --- |
| 1 | Model | Temporades de 3 mesos per figura. Un canvi de ball obre una classificació nova (vegeu la 21). |
| 2 | Temporada 1 | "Tardor 2026", del llançament del ball nou fins al 31 de desembre de 2026. |
| 3 | Clients antics | Els clients de producció sempre poden publicar. Els resultats del ball vell van a la Temporada 0. |
| 4 | Seeds | Cap a la Temporada 1. Estat buit amb missatge. |
| 5 | Saló de la fama i esborrats | Consulta en viu, sense còpies. Si un perfil s'esborra, el podi es recalcula. |
| 6 | Botó Perfil | Al lloc de l'ull, a la fila de dalt a la dreta. Un altre agent mou l'ull a una altra part de l'app. |
| 7 | On viuen les estadístiques | Al servidor des del principi, amb una còpia sempre al dispositiu. |
| 8 | Nom | El perfil sense correu confirmat es diu "Convidat". |
| 9 | Drac | Classificació pròpia a la mateixa actualització. Mulassa i Drac no es barregen mai. |
| 10 | Tick | El perfil amb correu confirmat porta el tick a tot arreu on surt el sobrenom. |
| 11 | Convidats | Es veuen menys (nom#1234, apagat, sense tick) però conserven la posició. |
| 12 | Llançament | Abans de mitjan novembre de 2026. |
| 13 | Nivells | Una sola classificació per figura que barreja els tres nivells per punts, com ara. |
| 14 | Sense perfil | Estadístiques només locals. Quan crea un perfil o publica, el dispositiu hi envia els totals acumulats. Cap compte automàtic. |
| 15 | Saló de la fama | Una temporada cada cop (la més recent; "Tria temporada" les llista per any): l'estendard de la figura, el podi, nombre de participants i la teva posició (amb punts i nivell). La classificació sencera es pot obrir (Marc, 21/10/2026). |
| 16 | Noms | Hivern (gener-març), Primavera (abril-juny), Estiu (juliol-setembre), Tardor (octubre-desembre), amb l'any. La Temporada 0 es diu "Estrena 2026". |
| 17 | Final de temporada | Un full un sol cop, la primera obertura després: la teva posició i els participants de cada classificació on vas jugar, i la temporada que ara és oberta. Si vas fer podi en alguna, la figura dalt del teu esglaó i "Has fet podi!" (o "Primer lloc!"); si no, una garlanda i "Gràcies per fer plaça!". El podi sencer ja no hi és: és al Saló de la fama, que s'obre des del full (Marc, 21/10/2026). |
| 18 | Estadístiques públiques | Fitxa pública en tocar un sobrenom, també per als convidats. Inclou PERFECTE, BÉ, ERROR i caigudes (Marc, 21/10/2026); els dies, les ratxes de dies, els errors per tipus i les dates només al Perfil. |
| 19 | Temps a la fitxa | Només el total ("3 h 12 min"), sense dates ni horaris. |
| 20 | Partides i perfils | Cada partida compta per al perfil amb què es juga. El dispositiu porta un comptador per perfil (i els dies i la pràctica). Les partides sense perfil: vegeu la 30. |
| 21 | Figures noves i balls nous a mig trimestre | Entren a la temporada oberta. Un ball nou deixa dues classificacions d'aquella figura en aquella temporada (la del ball anterior i la nova). Les altres figures no es toquen. |
| 22 | Fi dels 7 dies | Els convidats ja no caduquen. Si esborren les dades del navegador, perden el perfil. |
| 23 | Nom dels convidats | Estil Discord: el nom que trien i 4 xifres a l'atzar ("Timbaler#3821"). El nom net queda per als verificats (vegeu la 33). |
| 24 | Convidats que ja existeixen | Se'ls afegeix el #. A producció no tenen cap data de caducitat. Si confirmen el correu, trien un nom nou. |
| 25 | Dies jugats | Al servidor, amb les dates (només el dia), privats: només al Perfil propi. |
| 26 | Retenció | Els convidats inactius 12 mesos (sense jugar ni publicar) s'esborren automàticament. Els verificats, mai. |
| 27 | Temps importat | El primer enviament importa tal qual el temps jugat sense perfil, amb la regla de coherència (temps ≤ partides × durada de la cançó). Sense límit d'hores. |
| 28 | Convidats a les llistes | Només `nom#1234`, apagat i sense tick. La paraula "convidat" surt al Perfil, a la fitxa i en tocar el nom. |
| 29 | Ball anterior | La classificació del ball vell dins una temporada es diu "Mulassa (ball anterior)". |
| 30 | Partides sense perfil | Sempre van al proper perfil que es creï o s'obri en aquell dispositiu, no només al primer. |
| 31 | Perfil esborrat | Les seves estadístiques s'esborren també del dispositiu. Un perfil nou comença de zero. |
| 32 | Migracions de la branca | `202610180001`, `202610190001` i `temporary-profiles-cron.sql` no es despleguen mai: les substitueix la migració dels convidats. Treure-les de la branca necessita la confirmació de Marc. |
| 33 | Nom en verificar | Just després de posar el codi del correu surt "Tria el teu nom", buit: un nom net i lliure. És el mateix perfil, amb els seus resultats. Si es tanca sense triar, continua amb el `#` i el Perfil ho torna a demanar. No hi ha "Treu el #". |
| 34 | Noms de les temporades | Hivern, Primavera, Estiu i Tardor, amb l'any. Substitueix la 16 anterior. |
| 35 | Temporada 0 | Es diu "Estrena 2026" a la interfície. És el que hi ha avui a producció: només la Mulassa, amb el ball d'ara. |

## 4. Model de rànquing i temporades

### Què veu el jugador

```
CLASSIFICACIÓ
[🐴 Mulassa ⌄]                      ← botó: obre «Tria figura» dins el mateix full
Tardor 2026 · queden 23 dies
┃ Posició 48 de 119          ↑ Al capdamunt
┃ El millor resultat de cada participant, ordenat per punts.
 46. DracDeValls_2026#1110   NORMAL    70.486
 47. Baldufa#1103            NORMAL    69.886
 48. Retall ✓  TU            DIFÍCIL   69.286
 ...
[ Temporades anteriors ]  [ Privadesa ]
```

- Una classificació per figura i temporada: el millor resultat de cada jugador sobre els tres nivells, per punts.
  Cada fila diu el nivell. Una sola llista, en pàgines de 50, que s'obre a la fila del jugador. No hi ha pestanyes
  "Tots" i "On soc" (Marc, 21/10/2026): un enllaç porta al capdamunt i torna a la posició, segons on sigui la llista: «Al capdamunt» o «A la meva fila», amb una fletxa dibuixada cap on va.
  Si la fila del jugador queda més avall de la primera pàgina, es veu després d'un buit que s'omple amb «Carrega'n més».
- La figura es tria amb un botó (retrat, nom i fletxa) que obre «Tria figura» dins el mateix full; Escape o × hi tornen.
- Temporada buida: «Encara no hi ha resultats», el retrat de la figura i què cal fer («Juga amb el Drac i publica el
  resultat per estrenar la classificació»), amb el podi de l'anterior a sota si n'hi ha. Sense cap temporada anterior,
  tampoc no hi ha «Temporades anteriors». Si falla la càrrega: «No s'ha pogut carregar la classificació» i «Torna-ho a provar».
- "Temporades anteriors" obre el Saló de la fama.

### Calendari

- Trimestres fixos, amb els límits a les 00:00 hora de Catalunya (`Europe/Madrid`): Hivern (gener-març),
  Primavera (abril-juny), Estiu (juliol-setembre) i Tardor (octubre-desembre).
- La Temporada 1 comença quan s'aplica la migració, el dia del llançament, i s'acaba el 31 de desembre de 2026.
  La 2 és "Hivern 2027". La 0, el que hi ha avui a producció, es diu "Estrena 2026".
- Les temporades són globals: Mulassa i Drac tenen les mateixes dates.
- Una figura nova que arriba a mig trimestre entra a la temporada oberta: la seva classificació comença buida i la
  primera temporada li dura menys (decisió 21).
- Un ball nou d'una figura a mig trimestre també entra a la temporada oberta. Aquella temporada té llavors dues
  classificacions d'aquella figura: la del ball anterior, que es queda tal com estava (i continua rebent els clients
  antics, decisió 3), i la del ball nou, que comença buida. Les altres figures no es toquen.

### Reptes i rècord personal

- El rècord personal no es reinicia per temporada. Es reinicia només amb un ball nou, perquè és una altra cançó.
- Els reptes per enllaç (`?repte`) no canvien.

## 5. Versions, famílies i històric

### Tres conceptes

- **Versió** (`versions.version`): el gràfic i la puntuació d'una figura. Format `<figura>-v<N>[-sufix]`: `mulassa-v1`,
  `mulassa-v2-short`, `mulassa-v3`, `drac-v1`. Una versió nova només quan les puntuacions deixen de ser comparables.
- **Família** (`score_family()`): versions que es poden comparar. `mulassa-v1` i `mulassa-v2-short` són una família.
  `mulassa-v3` i `drac-v1` són famílies pròpies.
- **Temporada** (`seasons.id`, nova): un període de temps.

Una classificació és sempre **(temporada, família)**. La figura surt de `versions.figure_id` (columna nova).
Per això un ball nou no necessita una temporada nova: n'hi ha prou amb una família nova dins la mateixa temporada.
Afegir una figura nova vol dir inserir les files de la seva versió a `versions` i deixar-la publicar al client.

### Què passa amb cada cosa en canviar el ball

| Element | Què passa |
| --- | --- |
| Files actuals de `entries` | `season_id = 0`. No es reescriu cap altra columna. |
| `mulassa-v1`, `mulassa-v2-short` | Es marquen `retired_at`. Continuen acceptant publicacions, sempre a la Temporada 0. |
| `mulassa-v3`, `drac-v1` | Files noves a `versions`, actives, a la temporada oberta. |
| Seeds | Es queden a la Temporada 0. Cap seed nova. |
| Rècord local de la Mulassa | Clau nova per versió. El vell es mostra al Perfil com a "rècord del ball anterior". |
| Rècord local del Drac | No canvia (`drac-v1` continua). |

Conseqüència de la decisió 3: la Temporada 0 no queda congelada del tot. Algú amb el ball vell encara hi pot entrar i
moure'n el podi. És coherent, perquè hi juga el mateix ball. Si algun dia es vol tancar, n'hi ha prou amb una migració
que faci que `season_for` torni null per a les versions retirades.

### Saló de la fama

- És una consulta sobre `entries`, no una còpia. Esborrar un perfil (o la neteja d'inactius, si es programa) l'esborra també del
  Saló de la fama, que és el que promet el text de Privadesa.
- Mostra una temporada tancada cada cop (la més recent primer; "Tria temporada" obre la llista per any dins el mateix full,
  amb el guanyador i la teva posició). Per a cada temporada: l'estendard de la figura, les dates, els participants i el podi
  (sobrenom, punts, nivell, tick o `#1234`); si dos balls la comparteixen, una línia discreta "Hi ha dos balls · Mira el
  ball anterior" (s'obre al ball on vas jugar). La figura es tria amb el mateix desplegable que la classificació. La teva
  posició ("12 de 48", sense ordinal amb gènere) va en una franja pròpia amb els punts i el nivell (`my_score`,
  `my_difficulty`), o "TU" al podi. La classificació sencera es pot obrir. Una figura sense cap temporada tancada mostra l'estendard buit i la temporada en joc.
- Els convidats hi surten amb el seu `#1234`, igual que a la classificació.

### Avís de final de temporada

- La primera vegada que el jugador obre el joc després que s'acabi una temporada on va publicar, surt un full un sol
  cop: "Tardor 2026 s'ha acabat", una fila per classificació amb la seva posició ("12 de 48") i la temporada oberta. Si va
  fer podi en alguna, a dalt la figura sobre el seu esglaó i "Has fet podi!"; si no, una garlanda i "Gràcies per fer
  plaça!". El podi de tothom no hi surt: "Saló de la fama" l'obre (decisió 17).
- És un sol full per temporada amb totes les classificacions on el perfil va publicar (Mulassa, Drac, ball anterior).
- Surt de `get_seasons` (que ja torna `my_position`). La clau local és per perfil i temporada
  (`season-seen-<user_id>-<season_id>`), perquè en un dispositiu compartit cada perfil vegi el seu.
- No surt per a la Temporada 0, perquè no s'acaba en una data.

## 6. Identitat: verificat i convidat

### Dos tipus de perfil

| | Verificat | Convidat |
| --- | --- | --- |
| Què és | Perfil amb el correu confirmat (`auth.users.email_confirmed_at`). | Perfil sense correu, només a aquest navegador. |
| Nom | Net i únic: "Timbaler". | El nom que tria i 4 xifres a l'atzar: "Timbaler#3821". Molts convidats poden tenir el mateix nom amb xifres diferents. |
| Com es veu | Crema `#fff3d6` i el tick (`checkBadge`), que en tocar-lo diu "Correu confirmat". | Crema apagat (`#e8d8b8`, contrast de 4.5:1 o més sobre el fons), el `#1234` una mica més apagat encara, sense tick. |
| Caducitat | Cap. Es recupera en un altre dispositiu amb un codi al correu. | Cap data fixa (decisió 22). S'esborra després de 12 mesos sense activitat (decisió 26). Si s'esborren les dades del navegador, es perd i cal fer-ne un altre. |
| Posició | La que toca pels punts. | La que toca pels punts. |

La branca proposava que els convidats caduquessin als 7 dies, per alliberar el sobrenom i no guardar comptes oblidats.
Amb el `#1234`, un convidat ja no ocupa cap nom net, així que el primer motiu desapareix. El segon queda pendent
i es resol amb la neteja d'inactius de 12 mesos (decisió 26, secció 11).

### Regles del nom

- Columna nova `profiles.tag smallint` (0-9999), només per als convidats. Es mostra sempre amb quatre xifres.
  `profiles.alias` continua guardant el nom **sense** `#`.
- Unicitat: el nom net (`alias_key(alias)`) és únic entre els perfils sense `tag`; entre els convidats, és únic el parell
  (`alias_key(alias)`, `tag`). Dos índexs únics parcials, que **substitueixen** l'índex global `profiles_alias_key`
  (`202609280011`) en la mateixa transacció.
- `check_alias_free(alias, uid, tag)` es reescriu. L'espai on es comprova el nom depèn del `tag` que tindrà el perfil
  després de l'operació, no de si té el correu confirmat: amb `tag`, només el parell (nom, `tag`); sense `tag`, el nom
  net contra els altres perfils sense `tag`. Confirmar el correu només dona permís per fer servir `choose_verified_alias`.
  Un verificat que encara porta `#1234` (ha tancat "Tria el teu nom" sense triar-ne) publica i canvia de nom com un
  convidat, fins que en tria un. Ja no esborra
  cap titular caducat (no n'hi ha).
- Tres camins escriuen el nom i tots tres apliquen les mateixes regles, amb el perfil bloquejat:
  - **Crear** (`update_alias` d'un perfil nou, `submit_result` del primer cop): un convidat rep un `tag` a l'atzar entre
    els lliures per a aquell nom. Si dos el trien alhora, el segon topa amb l'índex únic i el servidor en tria un altre
    (fins a 5 intents). Si no en queda cap (10.000 convidats amb el mateix nom), respon `leaderboard_alias_taken`.
  - **Canviar el nom** (`update_alias`, `submit_result` amb un nom diferent): un convidat conserva el seu `tag` si el
    parell nou està lliure; si no, en rep un altre. Un perfil sense `tag` necessita el nom net lliure.
  - **Triar el nom en verificar** (RPC nova `choose_verified_alias(p_alias)`, només amb el correu confirmat): posa el
    nom nou i `tag = null` si el nom net és lliure; si no, `leaderboard_alias_taken` i el jugador en prova un altre.
- `leaderboard_alias_taken` només vol dir "el nom que has demanat no és possible". Una col·lisió de `tag` mai arriba
  al client: es resol al servidor.
- El `#` no és un caràcter permès al sobrenom (`normalized_alias`), així que ningú no se'l pot escriure a mà.
- En confirmar el correu (`verifyCode`), el full Perfil passa al pas "Tria el teu nom", buit. El nom ha de ser net i
  lliure. Els resultats, les estadístiques i el `user_id` no canvien: és el mateix perfil amb un altre nom.
- **Nom guardat i nom mostrat són dues coses.** Al dispositiu, `leaderboard-alias` (`ALIAS_KEY`) continua guardant
  el nom **sense** `#`, que és el que un client antic llegeix, valida (`alias-rules.js`, que no accepta `#`) i torna a
  enviar. El `tag` va a una clau nova (`leaderboard-tag`). Cap camí del client nou, ni la recuperació per correu, no
  escriu mai `nom#1234` a `ALIAS_KEY`: si ho fes, una pestanya antica deixaria de poder publicar.
- Lectures: `get_leaderboard_all` torna a la columna `alias` el nom ja muntat ("Timbaler#3821"), perquè un client
  antic el mostri bé, i `tag` en una columna nova. `my_alias()` torna el nom sense `#`. `my_profile` torna `alias` i
  `tag` per separat.
- Qui és el jugador ho diu sempre `is_self` (el full ja no guarda cap preferència de vista: `ROW_KEY` ha desaparegut).
- Un client antic que publica envia el nom sense `#`. El servidor manté el `tag` que ja tenia el perfil.

### Convidats que ja existeixen (decisió 24)

La migració de convidats:

1. Dona un `tag` a l'atzar a cada perfil sense correu confirmat, també als que es van crear amb "Crea" sense publicar.
2. Deixa els que tenen el correu confirmat sense `tag`, amb el seu nom de sempre.

A producció no hi ha cap data de caducitat ni cap cron dels 7 dies (decisió 32), així que no cal treure res. Els
convidats d'ara veuran el seu nom amb `#1234` i, si confirmen el correu, triaran un nom nou (decisió 33).

### On es veu

| Lloc | Font |
| --- | --- |
| Classificacions de cada temporada i figura | `get_leaderboard_all`: `verified`, `alias` muntat i `tag` |
| Saló de la fama | `get_seasons`: cada fila de `podium` porta `verified` i `tag` |
| Fitxa pública | `get_player_card` |
| Capçalera del Perfil | `my_profile` (amb `tag`) |
| Full de publicar | `my_profile`: "Publicat com a Nom ✓" o "Publicat com a Nom#3821" |
| Fitxes de rànquing i líder del selector | les mateixes files del rànquing |
| Imatge de Comparteix (`hud/share-card.js`) | l'últim `my_profile` conegut, desat al dispositiu. El tick es dibuixa al canvas amb la mateixa forma que el SVG. |

Les dades sempre surten d'una resposta del servidor. Cap resposta porta l'adreça ni el `user_id`. A la imatge de
Comparteix el tick no demostra res: és una imatge, i repeteix el que el joc sabia en fer-la.

A les llistes, el `#1234` substitueix la paraula "convidat", per no allargar les files. La paraula surt al Perfil, a la
fitxa pública i en tocar el nom. A la teva pròpia fila, si ets convidat, hi ha a sota "Confirma el correu per no perdre
el perfil", amb l'enllaç al pas del correu del Perfil.

El text de la interfície passa a dir "Convidat" en lloc de les expressions de perfil temporal d'ara, i desapareixen els
textos dels 7 dies (`profile-notes.js`, `profile-ui.js`, `board-ui.js`, Privadesa).

## 7. Perfil i estadístiques

### El full Perfil

- Botó a la fila de dalt a la dreta, al lloc de l'ull (que un altre agent mou). Mateixa mida i estil que els altres
  botons rodons (44/56 px, vora daurada).
- A dalt: el bloc de perfil que ara és a ⚙ Configuració (nom, tick o "Convidat", correu, "Tria el teu nom" si cal, tancar la
  sessió, esborrar). ⚙ deixa de tenir-lo.
- A sota: les estadístiques, i les temporades on ha quedat al podi.
- Sense perfil: les estadístiques locals i "Crea un perfil per guardar-les i sortir a les classificacions".
- Convidat: "Ets convidat. Si esborres les dades del navegador, perdràs el perfil i les estadístiques. Confirma el
  correu per guardar-los i treure el #."

### Catàleg

Tot surt de l'estat que ja té una partida (`G.counts`, `G.errors`, `G.maxCombo`, `G.stars`, `G.reason`, i els
judicis de GUAPA, MANTÉN i GLOBUS a `judge.js`).

| Estadística | Com es combina entre dispositius | Fitxa pública | Per què |
| --- | --- | --- | --- |
| Partides començades, completades i caigudes per figura i nivell; figura preferida | suma | sí | La base. |
| Temps a la plaça (temps de cançó jugat; la pràctica a part) | suma | sí, només el total | La xifra que la gent ensenya. |
| PERFECTE, BÉ i ERROR; precisió global | suma | sí | |
| Errors per tipus (aviat, tard, sense toc, "els dos alhora", has deixat anar; `G.errors`) | suma | no | La més útil: "piques aviat" porta a "Ajusta la sincronia". És un consell, no un trofeu. |
| GUAPA encertades / totals | suma | sí | Marca del joc. |
| Globus rebentats, MANTÉN completats | suma | sí | |
| Cops que ha caigut la mulassa | suma | sí | Té gràcia. |
| Millor ratxa per figura i nivell | màxim | sí | |
| Estrelles: la millor per figura, nivell i versió; el total (p. ex. 11/18) | màxim per (figura, nivell, versió); el total es calcula després | sí | Objectiu clar. |
| Rècords per figura, nivell i versió | el millor resultat sencer (punts, %, ratxa d'aquella partida), mai camp a camp | sí | |
| Dies jugats i dies seguits | unió de dates (taula pròpia) | no | Dirien quan juga una persona. |
| Podis de temporada | ve del Saló de la fama | sí | |

Les sumes es guarden separades per (figura, versió, nivell). Així el servidor pot comprovar que `perfect + good + miss`
quadra amb els judicis de cada versió, i un ball nou no barreja comptadors.

Les estadístiques comencen a comptar amb la versió que les porta. El Perfil diu "Des del 5 de novembre de 2026"
(la data real del llançament).

### Quines partides compten

Una sola funció de tancament de partida, `endRun(kind)` a `src/game/stats.js`, que flow.js crida exactament un cop
per partida (marcada amb `G.activityEpoch`):

| Com acaba | On és avui | Què compta |
| --- | --- | --- |
| Acaba la cançó | `finish('end')` | començada, completada, temps, judicis, estrelles, ratxa |
| Cau la mulassa | `finish('collapse')` | començada, caiguda, temps, els judicis fins on va arribar, ratxa |
| Torna al menú des de la pausa o els resultats | `toTitle()` | si no havia acabat: començada i temps |
| Torna a començar | el reinici des de la pausa | si no havia acabat: començada i temps |
| Pràctica acabada o SALTA | `endPractice()` | partida de pràctica i temps de pràctica |

Una partida completada té tots els judicis del nivell. Una caiguda només té els de les notes a què va arribar: no
s'inventen errors per a les notes que no va tocar. Les partides abandonades no sumen judicis. Mateixes exclusions que el rècord: `AUTOPLAY`, `FROM`, `?stars`, `?final` i les eines de debug.

### Al dispositiu

Una clau, `localStorage['stats-v1']`, a través de `src/platform/storage.js`:

```js
{ since: '2026-11-05', deviceId: '<uuid aleatori>',
  // Tot va per propietari (decisio 20): el user_id de la sessio, que no canvia en canviar el nom.
  // 'none' = el que s'ha jugat sense perfil.
  owners: {
    none:        { counters, days: ['2026-11-05', ...], practice: { runs, seconds } },
    '<user_id>': { counters, days, practice, sent: '<hash de l'ultim enviament>', imported: true } } }
// counters: { '<figura>/<versio>/<nivell>': { runs, completed, collapsed, seconds, perfect, good, miss,
//   errors: { early, late, silent, both, hold, move }, guapa, guapaTotal, balloons, holds, bestCombo, bestStars, best } }
```

- Cada partida, cada dia jugat i cada pràctica sumen al propietari de la sessió en aquell moment, o a `none`.
- `none` passa sencer al **proper perfil que es creï o s'obri** en aquest dispositiu (decisió 30), i es buida.
  Passa un sol cop per cada tros: el que es juga sense perfil després torna a acumular-se a `none` i va al perfil
  següent.
- Si es torna a un perfil anterior (A → B → A), es continua des dels comptadors d'A: no es perd res.
- **Esborrar el perfil** ("Esborra el perfil", o quan el servidor diu que ja no existeix perquè la neteja de 12 mesos
  l'ha esborrat): s'esborra també la seva entrada `owners['<user_id>']` del dispositiu (decisió 31). No passa a `none`
  ni a cap altre perfil. `none` i els rècords del dispositiu es mantenen, com ara.
- **Tancar la sessió** no esborra res: l'entrada es queda per si s'hi torna.
- El Perfil mostra la suma del servidor si hi ha perfil (tots els dispositius), o la local si no n'hi ha.
- Dues pestanyes alhora: cada una llegeix i escriu la clau sencera en acabar una partida (no durant), i l'última guanya.
  Es pot perdre una partida si dues acaben en el mateix instant. Ho accepto: no val la pena un bloqueig.

### Al servidor

```sql
create table leaderboard_private.player_stats (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  device_id uuid not null,          -- aleatori, generat al dispositiu, mai public
  bucket text not null,             -- '<figura>/<versio>/<nivell>'
  counters jsonb not null,          -- nomes claus conegudes, enters >= 0
  first_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id, bucket)
);
create table leaderboard_private.player_days (
  user_id uuid not null references leaderboard_private.profiles(user_id) on delete cascade,
  day date not null,                -- data local del dispositiu, nomes el dia
  primary key (user_id, day)
);
-- merge_stats(p_device uuid, p_buckets jsonb, p_days date[], p_owner uuid): qualsevol perfil viu; p_owner ha de ser auth.uid()
--   (leaderboard_owner_mismatch si no: una altra pestanya pot haver canviat la sessio).
--   Bloqueja la fila del perfil (select ... for update, com lock_profile) i, amb el bloqueig:
--   1 crida per minut per perfil, com a molt 8 dispositius, claus i buckets en llista blanca.
--   Per a cada bucket: greatest() per als comptadors de suma i els maxims; "best" es substitueix sencer si es millor.
--   Valida l'estat resultant, no nomes el que arriba (vegeu sota). Dies: insert ... on conflict do nothing.
-- my_stats(): suma per bucket de tots els dispositius, dies jugats i dies seguits. Privat.
-- get_player_card(p_alias text, p_tag smallint default null): totals publics del perfil amb aquest nom (i tag),
--   si te resultats publicats. Lectura per a anon i authenticated. Mai user_id, device_id, dates ni dies.
```

Cada dispositiu envia els seus totals acumulats per a aquell perfil. El servidor guarda el màxim per dispositiu i
bucket, i el perfil suma tots els dispositius. Una repetició o un enviament fora d'ordre no compta dues vegades, i no
s'envia mai una partida concreta.

Quan s'envia: després de tancar cada partida, si hi ha sessió i perfil, mai durant el joc. També en crear el perfil o
publicar. Un error no es mostra al jugador i es torna a provar a la partida següent.

Validacions, sobre l'estat resultant de cada bucket:

- Els comptadors només pugen per dispositiu.
- `completed + collapsed ≤ runs`.
- `completed × judgments ≤ perfect + good + miss ≤ (completed + collapsed) × judgments`, amb els judicis de la versió
  i el nivell del bucket. Una caiguda pot tenir tots els judicis: el judici es compta abans que l'ànim faci caure la
  mulassa (`judge.js`), així que es pot caure a l'última nota.
- `guapa ≤ guapaTotal`, i `guapaTotal` no supera les GUAPA d'una partida sencera per `completed + collapsed`.
- `balloons` i `holds` no superen els GLOBUS i els MANTÉN del gràfic del nivell per `completed + collapsed`
  (`balloon_count`, `hold_count` a `versions`, comptats amb `makeDanceChart` sobre `song.json` i `song-drac.json`:
  2 GLOBUS a tots els nivells; MANTÉN 0/5/5 a la Mulassa i 0/1/1 al Drac). La suma dels `errors` no supera
  `good + miss`: `judge.js` posa cada nota no perfecta, llevat dels GLOBUS, en un sol motiu.
- `bestCombo` no supera els judicis del nivell. El `best` passa les mateixes regles que `submit_result`.
- Temps: `seconds` no supera `runs` per la durada de la cançó d'aquell bucket. A més, el que creixen `seconds` i
  `runs` en un enviament, sumat de tots els buckets (pràctica inclosa) i comptant cada partida com a mínim 1 s, no pot
  passar del temps real des de l'últim enviament d'aquell dispositiu. El mínim és d'1 s perquè una partida deixada
  durant el compte enrere arriba amb 0 s (`stats.js`), però ha calgut un toc per començar-la i un altre per sortir.
  Així `runs`, que surt a la fitxa pública, no pot créixer més de pressa que el rellotge. El **primer enviament** de
  cada dispositiu a cada perfil (el servidor el reconeix perquè encara no té la fila de `player_devices` d'aquest
  dispositiu i perfil; `imported` només és la marca local del dispositiu; val per a tots els buckets alhora) porta
  tal qual el temps de les partides anteriors (decisió 27), amb el mateix pressupost comptat des de les 00:00 (hora de
  Madrid) del primer dia de la Temporada 1: les estadístiques surten amb ella i abans no es podia jugar res que
  comptés. Passar-se'n és `leaderboard_stats_time_limit`, que el client torna a provar més tard (no és una dada
  dolenta); la resta de regles són `leaderboard_invalid_stats`.
- Dies: dates no futures (amb un dia de marge pels fusos) i no anteriors al primer dia de la Temporada 1 (`starts_at` de la temporada 1, hora de Madrid: el moment en què s'aplica la migració).

Això talla els valors impossibles (més partides que temps, més GLOBUS, MANTÉN, judicis o errors dels que té una
partida), però no demostra res: dins d'aquests límits les estadístiques es poden falsejar com els punts. La fitxa
pública no ho anota (Marc, 21/10/2026: la nota sobrava). No hi ha cap rànquing d'estadístiques.

### Privadesa

- `data-privacy="device"`: les estadístiques es desen al dispositiu.
- `data-privacy="leaderboards"`: si tens perfil, les estadístiques totals i els dies que has jugat (només la data)
  s'envien al servidor. Els totals són públics en tocar el teu nom. Els dies no: només els veus tu, al Perfil.
  Mai horaris ni el dispositiu. Tot s'esborra amb el perfil (`cascade`).
- Els textos dels 7 dies desapareixen i se substitueixen per la regla nova dels convidats (decisió 22) i la neteja
  dels convidats inactius 12 mesos (decisió 26).
- Abans del **primer enviament d'estadístiques** de cada perfil, el joc ho explica: en crear el perfil, i per als
  perfils que ja existeixen, un avís un sol cop abans de la primera sincronització.
  Fins que el jugador l'ha vist, no s'envia res. La primera publicació també ho explica.
- El `device_id` lligat a un perfil és un identificador pseudònim: no surt mai del servidor i s'esborra amb el perfil.

## 8. Migració de la base de dades

### Contractes que s'han de mantenir

Les crides d'un client antic:

- `submit_result(p_version, p_difficulty, p_perfect, p_good, p_miss, p_score, p_max_combo, p_alias)` amb
  `p_version = 'mulassa-v2-short'`, 8 paràmetres, que llegeix `(improved, quality, score)`.
- `get_leaderboard_all(p_version, p_period = 'all', p_offset, p_limit)`, que llegeix les 8 columnes de `202609300004`.
  Les columnes noves van al final i el client antic les ignora.
- `update_alias(p_alias)` i `my_alias()` continuen treballant amb el **nom sense `#`** (el que el client antic té a
  `leaderboard-alias` i valida amb `alias-rules.js`). La funció `delete-player` no canvia.

Un client antic entén només els errors d'ara (`leaderboard.js`, `translated`). Un codi nou li surt com "La
classificació ha fallat per un error nostre". Amb la decisió 3, el codi `leaderboard_season_closed` no li arriba mai.
Els clients de la branca (amb `p_notice`) no han sortit mai, així que no cal suportar-los.

### Esborrany de la migració (`2026xxxx0001_seasons.sql`, una transacció, ASCII)

```sql
begin;

create table leaderboard_private.seasons (
  id smallint primary key,
  name text not null,              -- "Estrena 2026", "Tardor 2026", "Hivern 2027"
  starts_at timestamptz not null,
  ends_at timestamptz,             -- null = sense data de fi (nomes la 0, de fet)
  check (ends_at is null or ends_at > starts_at),
  check (id = 0 or ends_at is not null),
  -- dues temporades normals no es poden encavalcar (la 0 no te data de fi i queda fora)
  exclude using gist (tstzrange(starts_at, ends_at) with &&) where (id > 0)
);
alter table leaderboard_private.seasons enable row level security;
revoke all on leaderboard_private.seasons from public, anon, authenticated;

-- 0: tot el que hi ha (comença a la primera migracio). 1: des d'ara fins al 31/12/2026.
-- Les seguents les crea ensure_season() quan cal: cap migracio anual.
insert into leaderboard_private.seasons values
  (0, 'Estrena 2026', '2026-09-27 00:00 Europe/Madrid', null),
  (1, 'Tardor 2026', now(), '2027-01-01 00:00 Europe/Madrid')
on conflict (id) do nothing;

-- La temporada del trimestre de p_at, creada si encara no existeix. Nom i limits surten del calendari
-- (Hivern, Primavera, Estiu, Tardor + l'any, a les 00:00 Europe/Madrid). Idempotent; dues crides
-- alhora: la segona topa amb l'exclusio o la clau i torna a llegir.
create function leaderboard_private.ensure_season(p_at timestamptz) returns smallint
language plpgsql volatile set search_path = '' as $$ ... $$;

alter table leaderboard_private.versions add column if not exists figure_id text not null default 'mulassa-valls';
alter table leaderboard_private.versions add column if not exists retired_at timestamptz;
-- On van els clients antics d'una versio retirada: es desa en retirar-la, mai es calcula despres.
alter table leaderboard_private.versions add column if not exists retired_season_id smallint
  references leaderboard_private.seasons(id);
update leaderboard_private.versions set retired_at = now(), retired_season_id = 0
  where version in ('mulassa-v1', 'mulassa-v2-short') and retired_at is null;
-- Una retirada futura (ball nou a mig trimestre) fa, en la mateixa transaccio:
--   retired_at = now(), retired_season_id = ensure_season(now() - interval '1 second')
-- es a dir, la temporada on la versio era activa just abans. Retirar-la a les 00:00 d'un trimestre nou deixa els
-- clients antics a la temporada anterior, i ensure_season garanteix que la fila existeix.
insert into leaderboard_private.versions(version, difficulty, judgments, max_score, extras_max, active, figure_id) values
  ('mulassa-v3', 0, <n>, <max>, <extras>, true, 'mulassa-valls'), ('mulassa-v3', 1, ...), ('mulassa-v3', 2, ...),
  ('drac-v1', 0, <n>, <max>, <extras>, true, 'drac-valls'), ('drac-v1', 1, ...), ('drac-v1', 2, ...)
on conflict (version, difficulty) do nothing;

-- Files existents = temporada 0. Un default constant no reescriu la taula (PostgreSQL >= 11);
-- es treu tot seguit perque cap insercio nova en depengui.
alter table leaderboard_private.entries add column season_id smallint not null default 0
  references leaderboard_private.seasons(id);
alter table leaderboard_private.entries alter column season_id drop default;

-- La clau unica inclou la temporada. El nom real s'ha de comprovar a l'assaig (\d leaderboard_private.entries).
alter table leaderboard_private.entries drop constraint entries_user_id_version_difficulty_key;
alter table leaderboard_private.entries add constraint entries_user_season_version_difficulty_key
  unique (user_id, season_id, version, difficulty);
drop index if exists leaderboard_private.entries_ranking;
create index entries_ranking on leaderboard_private.entries(season_id, version, difficulty, score desc);

-- La temporada d'una publicacio (decisions 3 i 21):
--   versio retirada -> retired_season_id (la 0 per a mulassa-v1/v2);
--   versio activa   -> la del trimestre d'ara, creada si cal (ensure_season(now())). Mai la 0.
-- Volatile a proposit: la criden submit_result i les lectures (vegeu get_leaderboard_all).
create function leaderboard_private.season_for(p_version text) returns smallint
language plpgsql volatile set search_path = '' as $$
declare v_retired smallint; v_is_retired boolean;
begin
  select distinct v.retired_at is not null, v.retired_season_id into v_is_retired, v_retired
    from leaderboard_private.versions v where v.version = p_version;
  if v_is_retired then return v_retired; end if;
  return leaderboard_private.ensure_season(now());
end $$;

-- score_family: 'mulassa-v3' i 'drac-v1' ja cauen a "else p_version" (families propies).
-- visible_entries(p_version, p_season): el filtre de familia d'ara + season_id = p_season.
--   Les seeds nomes amaguen files de la mateixa temporada.

-- Mateixa signatura i mateixes columnes que a produccio (202610170001): create or replace, sense drop.
create or replace function public.submit_result(p_version text, p_difficulty integer, p_perfect integer,
  p_good integer, p_miss integer, p_score integer, p_max_combo integer, p_alias text)
returns table(improved boolean, quality numeric, score integer)
-- El cos de 202610170001, igual, amb aquests canvis:
--   v_season := leaderboard_private.season_for(p_version);
--   if v_season is null then raise exception 'leaderboard_season_closed' using errcode = 'P0001'; end if;
--   insert ... (user_id, season_id, version, ...) values (v_uid, v_season, ...)
--   on conflict (user_id, season_id, version, difficulty) do update ... (la mateixa condicio de millora)
--   la consulta final (que avui filtra per user_id, version i difficulty) tambe per e.season_id = v_season:
--   si no, torna una fila per temporada i el client (data[0]) pot mostrar la d'una temporada anterior.
--   (La migracio de convidats, fase 2, hi afegeix el tag i el bloqueig del perfil.)
;

drop function if exists public.get_leaderboard_all(text, text, integer, integer);
create function public.get_leaderboard_all(p_version text, p_period text default 'all', p_offset integer default 0,
  p_limit integer default 50, p_season smallint default null)
returns table(... les mateixes columnes que ara, verified inclosa ..., season_id smallint)
-- p_season null: season_for(p_version), que pot crear la temporada del trimestre (la funcio ja era volatile:
--   actualitza last_active_at). Aixi una classificacio buida es pot obrir abans que ningu hi publiqui.
--   Un client antic (v2, sense p_season) veu la Temporada 0, on publica.
-- p_season explicit: qualsevol temporada que ja hagi començat, per a la familia de p_version.
;

create function public.get_seasons(p_figure text)
returns table(season_id smallint, name text, starts_at timestamptz, ends_at timestamptz, version text,
  previous_dance boolean, players bigint, podium jsonb, my_position bigint)
-- Una fila per (temporada, familia) amb resultats, la 0 inclosa. version = una versio de la familia, perque el
-- client pugui obrir la classificacio sencera amb get_leaderboard_all(version, p_season => season_id).
-- previous_dance = hi ha una familia mes nova d'aquesta figura a la mateixa temporada (decisio 21).
-- podium: [{position, alias, tag, score, difficulty, verified}]. Mai l'adreça.
;

-- grants: com ara (submit_result a authenticated; lectures a anon i authenticated).
commit;
```

Els convidats (`tag`, índexs, `check_alias_free`, `choose_verified_alias`, `verified`, `my_profile`, `lock_profile`)
van en una segona migració, a la
fase 2. Les estadístiques (`player_stats`, `player_days`, `merge_stats`, `my_stats`) en una tercera, a la fase 3, i el
Saló de la fama i la fitxa (`get_seasons`, `get_player_card`) a la fase 4. Totes amb el mateix patró: `security definer`, `search_path = ''`, grants explícits i ASCII.

No es fan sobrecàrregues: amb dues signatures compatibles PostgREST no pot triar (`PGRST203`). S'esborra i es torna a
crear, com ja feia `202609300004`. Supabase recarrega l'esquema de PostgREST amb els canvis de DDL.

### Pla pas a pas

El pla detallat de producció (còpia, recomptes en lectura, ordre, verificació, Sentry i rollback de cada pas) i el
resultat de l'assaig amb Postgres real són a [`docs/rankings-rollout.md`](rankings-rollout.md).

1. **Local**: escriure la migració i `tests/seasons-db.mjs` amb PGlite, seguint `tests/short-ranking-db.mjs`.
   Aplicar totes les migracions i comprovar els contractes de la llista de sota. `npm run check` en verd.
2. **Assaig amb Supabase local** (`supabase start`): totes les migracions, `tests/fixtures/seed-leaderboard-2026.sql`
   i `supabase/tests/leaderboards-smoke.sql` adaptat. El client de `master` d'avui i el nou, contra la mateixa base.
3. **[prod] Còpia manual just abans del merge**: dispatch de `db-backup.yml`, `BACKUP_OK` i la lectura de verificació.
4. **[prod] Comprovació en lectura** (SQL Editor): el nom real de la constraint única i el nombre de files de `entries`
   per versió. Només recomptes, cap sobrenom.
5. **[prod] Merge a `master`**: `Desplegament` aplica la migració i després publica el client. La Temporada 1 comença
   amb la migració, minuts abans del client nou. Una publicació d'un client antic en aquest interval va a la 0.
6. **[prod] Verificació**: la Temporada 1 és buida per a la Mulassa i el Drac, i la 0 té el mateix nombre de files que
   al pas 4. Si Marc ho autoritza, una publicació amb un perfil sintètic, esborrat després amb "Esborra el perfil".
7. **Cada trimestre**: no cal fer res. `ensure_season` crea la temporada amb la primera publicació del trimestre.

### Contractes que han de cobrir els tests

- Les files existents tenen `season_id = 0` i cap altra columna canvia.
- `submit_result` amb `mulassa-v2-short` va a la 0, també mesos després.
- `mulassa-v3` i `drac-v1` van a la temporada oberta. Un resultat pitjor no substitueix el millor.
- El mateix jugador té una fila per temporada, i una classificació no veu les altres temporades.
- La Mulassa i el Drac no es barregen mai.
- `get_leaderboard_all` cridada com ara (4 paràmetres) torna la 0 per a la v2.
- Al límit de la temporada (31/12 23:59:59 i 1/1 00:00 hora de Catalunya), el resultat va on toca.
- Les seeds només amaguen files de la mateixa temporada.
- Esborrar un perfil o la neteja d'inactius elimina les files de totes les temporades i les estadístiques.
- `verified` és a totes les respostes amb sobrenom, i cap porta l'adreça ni el `user_id`.
- `anon` no pot llegir `seasons` ni `player_stats` directament ni cridar `submit_result` o `merge_stats`.
- `merge_stats`: repetició idempotent, valors que baixen rebutjats, claus desconegudes rebutjades, límit de dispositius,
  estat resultant incoherent rebutjat (GLOBUS, MANTÉN o errors de més; partides sense temps real al darrere),
  primer enviament amb temps importat acceptat si és coherent; les partides reals més curtes (caiguda als pocs segons,
  sortida al compte enrere, pràctica) i les més llargues (DIFÍCIL sencer de cada cançó) passen.
- `submit_result` torna exactament una fila, la de la temporada on ha publicat, encara que el jugador en tingui d'altres.
- `season_for`: una versió activa no va mai a la 0; el primer dia d'un trimestre sense fila la crea, tant en publicar
  com en obrir la classificació buida; dues temporades normals no es poden encavalcar; una versió retirada a mig
  trimestre continua anant a aquella temporada, i una retirada a les 00:00 d'un trimestre va a l'anterior.
- Estadístiques: una caiguda amb judicis parcials passa la validació; A → B → A no barreja dies ni pràctica; després
  d'esborrar un perfil, el dispositiu no torna a enviar-ne res; `none` passa al proper perfil i només un cop.
- Noms: un verificat que encara porta `#1234` pot publicar i canviar de nom encara que un altre verificat tingui el
  nom net; una caiguda a l'última nota passa la validació d'estadístiques; una pestanya antica i una de nova amb el mateix `localStorage` poden publicar totes dues; la recuperació per
  correu d'un convidat amb `tag` no escriu `nom#1234` a `leaderboard-alias`.
- Un ball nou a mig trimestre deixa dues classificacions de la figura a la temporada, i `get_seasons` les marca.
- Convidats: dos convidats amb el mateix nom i `tag` diferent; un verificat amb el nom net; "Tria el teu nom" amb un
  nom lliure i amb un d'agafat; tancar-lo sense triar i publicar igualment; un client antic publicant sense `#` conserva el `tag`.
- **Concurrència, amb Postgres real** (`supabase start`, diverses connexions; PGlite només en té una): dues
  `merge_stats` alhora del mateix perfil (el límit de 8 dispositius i d'una crida per minut aguanten), `merge_stats`
  contra un esborrat de perfil, dues `ensure_season` alhora, i dos convidats demanant el mateix nom alhora.

### Rollback

- **Client**: tornar a desplegar el commit anterior. El client antic publica a la v2 (Temporada 0) i la llegeix.
- **Base de dades**: preferir una migració de correcció. Per anul·lar la Temporada 1, un script manual a
  `supabase/ops/` (no l'executa el workflow) que torni a obrir la v2 i tanqui la 1. Les columnes noves es queden.
- **Restaurar la còpia**: últim recurs, perd els resultats publicats des del pas 3.

### Riscos de la migració

| Risc | Mitigació |
| --- | --- |
| El canvi de la clau única trenca `submit_result` per a tothom. | Tot en una transacció. L'assaig del pas 2 crida l'RPC antiga i la nova. |
| PostgREST veu dues signatures. | `drop` + `create`. Test amb crida per nom del client antic. |
| Límits (`max_score`, `extras_max`) de la v3 o del Drac mal calculats. | `tools/score-ceiling.mjs` i `tests/score-ceiling.mjs` per a totes dues figures. |
| Abús: comptes nous per ocupar el podi. | Turnstile en crear compte, 10 s entre escriptures, sostre i coherència de punts. El podi no té cap premi real. |
| Estadístiques falses a la fitxa pública. | Límits a `merge_stats`, avís a la fitxa, cap rànquing d'estadístiques. |

## 9. Pla per fases

| Fase | Contingut | Fitxers principals | Tests clau | Estimació |
| --- | --- | --- | --- | --- |
| 0. Ball nou | `CURRENT_SCORE_VERSION = 'mulassa-v3'`, `VERSION_RULES`, `MAX_SCORES`; rècords locals per versió (les claus v2 només es llegeixen); `comparableScore` sense família amb la v2; límits del Drac. | `src/game/score-scale.js`, `records.js`, `figures.js`, `src/services/leaderboard-rules.js`, `tools/score-ceiling.mjs` | `tests/score-ceiling.mjs` per a totes dues figures; un client antic en una altra pestanya no sobreescriu el rècord v3, i el v2 es continua veient. | 0,5-1 d |
| 1. Temporades | Migració de la secció 8 (`seasons`, `ensure_season`, `season_for`, `season_id`, RPC); `leaderboard.js` passa `p_season` i tradueix `leaderboard_season_closed`; nom de temporada, dies que queden, estat buit. | migració, `src/services/leaderboard.js`, `src/ui/board-ui.js`, `index.html` | `tests/seasons-db.mjs` (PGlite) i els tests de concurrència amb Postgres real; `tests/leaderboard-all.mjs`; full amb temporada buida, plena i antiga (`mulassa-ui-state-regression`). | 2-3 d |
| 2. Convidats nom#1234 | Treure de la branca les migracions dels 7 dies (decisió 32); migració: `tag`, índexs únics parcials, `verified`, `my_profile`, "Tria el teu nom" (`choose_verified_alias`), neteja d'inactius de 12 mesos (activada a mà **[prod]**); "Convidat" i l'estil apagat; tick a publicar, Perfil, selector i Comparteix; textos dels 7 dies fora; Privadesa. | migració, `src/services/leaderboard.js`, `alias-rules.js`, `src/ui/profile-ui.js`, `profile-notes.js`, `board-ui.js`, `select-ui.js`, `hud/share-card.js`, `index.html` | db test de noms (secció 8); client antic amb nom sense `#`; `tests/alias-rules.mjs`; layout de files amb `#1234` al nom més llarg; `mulassa-security-boundary-review`. | 2-3 d |
| 3. Perfil i estadístiques | Botó al lloc de l'ull; full Perfil (bloc de ⚙ + estadístiques); `stats.js` amb `endRun`; `player_stats`, `player_days`, `merge_stats`, `my_stats`. | `src/game/stats.js` (nou), `src/game/flow.js`, `src/services/leaderboard.js`, `src/ui/profile-ui.js`, `sheets-setup.js`, `index.html`, `src/styles/*.css`, migració | `tests/stats.mjs` (cada manera d'acabar compta un cop, exclusions, dies a través de mitjanit i canvis d'hora, emmagatzematge bloquejat, A → B → A); db tests de `merge_stats` (PGlite i concurrència real); `tests/selector-controls.mjs`; layout a les mides d'AGENTS.md. | 4-5 d |
| 4. Saló de la fama i fitxa pública | `get_seasons`, `get_player_card`; "Temporades anteriors"; full de final de temporada; fitxa en tocar un nom. | migració, `board-ui.js`, `profile-ui.js`, un mòdul nou per a la fitxa | db test del podi amb un perfil esborrat i amb dos balls a la mateixa temporada; la fitxa no porta dates ni `device_id`; full de final un sol cop. | 2-3 d |
| 5. Drac | `drac-v1` a `versions`; treure la restricció de figura a `validResult` i `snapshotResult`; selector Mulassa/Drac a la classificació; fitxes de rànquing al selector. | `leaderboard-rules.js`, `leaderboard-result.js`, `board-ui.js`, `select-ui.js`, `share-ui.js` | Mulassa i Drac separats a totes les RPC i al client. | 1-2 d |

Les fases 0, 1 i 5 surten juntes amb el ball nou. La 2 pot sortir abans (és independent de les temporades) o alhora.
La 3 depèn de la 2, perquè les estadístiques es lliguen al perfil. La 4 pot sortir alhora (la Temporada 0 ja té podi)
o abans del 31 de desembre, perquè l'avís de final de la Temporada 1 hi sigui a temps. Cada fase amb servidor segueix
la secció 8: assaig local, còpia manual i merge confirmat. Les fases sumen 11,5-17 dies; hi afegeixo uns 1,5 dies
per als assajos amb Supabase local, els tests de concurrència i la integració entre fases. Total: 13-18 dies.

## 10. Alternatives descartades

**Model de rànquing**

- Setmanal: ja es va provar i es va treure (`202609280004`). Amb poca gent queda buida.
- Mensual: 12 reinicis l'any amb un top 10 de poques persones.
- Només reinici per versió: els balls nous són irregulars, i la classificació tornaria a quedar fixa.
- "De sempre" i períodes alhora: dues llistes vives confonen. El Saló de la fama fa el paper de "de sempre".
- Una classificació per nivell (es va treure a `202609280008`): tres llistes mig buides per figura (decisió 13).
- Premis, nivells de compte o passi de temporada: massa sistema i convida a fer trampes.
- Llistes d'amics: més relacions i dades personals. El repte per enllaç ja hi és.

**Versions i històric**

- La temporada dins la versió (`mulassa-v3-s1`): multiplica files i barreja temps amb regles de puntuació.
- Que el client enviï la temporada: un client antic no la coneix, i un client manipulat podria triar-la.
- Moure les files antigues a una taula d'arxiu: més SQL i més punts de fallada.
- Una taula `hall_of_fame` amb còpies: el sobrenom sobreviuria a l'esborrat del perfil.
- Seeds noves: jugadors falsos amb puntuacions del ball nou (decisió 4).
- Rebutjar els clients antics, o deixar-los 14 dies: Marc va triar acceptar-los sempre (decisió 3).
- Una temporada nova per a totes les figures a cada ball nou, o temporades per figura: Marc va triar que entrin a la
  temporada oberta (decisió 21).
- Una migració cada any per crear les temporades: si es descuida, els resultats nous fallen o van on no toca.
  `ensure_season` les crea soles.

**Identitat**

- Mantenir els 7 dies: un convidat que només enviés estadístiques no caducaria mai, i el sobrenom net quedava ocupat
  per perfils oblidats. Marc va triar treure'ls (decisió 22).
- "Convidat-nom": llarg (el límit és de 20 caràcters) i el nom continuava sent únic.
- Deixar el nom net als convidats que ja existeixen: hi hauria convidats antics que es veurien diferents (decisió 24).

- Amagar els convidats o posar-los en una llista a part: una temporada nova quedaria buida.
- Fer-los perdre posicions: barreja identitat amb puntuació.
- Una icona gris o d'avís: sembla un error.

**Estadístiques**

- Només locals: Marc les vol al servidor des del principi (decisió 7).
- Totes les partides del dispositiu a tots els perfils: en un mòbil compartit es barregen (decisió 20).
- Dies seguits calculats per dispositiu: no es poden sumar entre dispositius. Marc els vol al servidor (decisió 25).
- Crear un convidat automàtic a la primera partida: molts comptes, Turnstile a l'inici (AGENTS.md ho prohibeix) i
  més privadesa a explicar (decisió 14).
- Enviar cada partida: dades per partida i un registre que es pot falsejar igualment.
- Rànquings d'estadístiques ("més hores"): premien deixar el joc en marxa i no es poden validar.

## 11. Riscos oberts i punts a validar

- **Retenció dels convidats** (decisió 26). Una tasca de `pg_cron` esborra els convidats inactius 12 mesos. Cal:
  1. que l'enviament d'estadístiques i el Perfil actualitzin `last_active_at`, perquè jugar sense publicar compti com a
     activitat;
  2. reutilitzar la consulta de `leaderboard_expired_players` limitada als convidats, en una funció que esborri
     `auth.users` per lots (com `purge_expired_profiles`). Abans d'esborrar cada compte, l'ha de bloquejar
     (`lock_profile`) i tornar a comprovar que segueix inactiu i sense correu confirmat: si ha jugat o ha confirmat el
     correu mentrestant, no s'esborra;
  3. un fitxer a `supabase/ops/` per activar-la a mà **[prod]**, amb una prova en sec (recompte) abans, com
     l'antic `temporary-profiles-cron.sql`;
  4. dir-ho a Privadesa i al Perfil del convidat ("si no jugues en 12 mesos, s'esborra").
- **Convidats que perden el perfil.** Esborrar les dades del navegador, o el mode privat, fa perdre el perfil i els
  resultats publicats continuen a la classificació amb un `#1234` que ningú pot fer servir. És el que Marc ha acceptat.
  Si la retenció es programa, s'acaben esborrant.
- **Dues classificacions d'una figura a la mateixa temporada** (decisió 21). Al Saló de la fama i a la classificació
  s'ha de veure clar quina és la del ball anterior. El nom "ball anterior" s'ha de provar amb gent.
- **Calendari automàtic.** `ensure_season` ha de calcular bé els límits a `Europe/Madrid` els dies de canvi d'hora,
  i dues crides alhora el primer minut d'un trimestre no poden crear dues files. Té tests propis (secció 8).
- **Botó Perfil i l'ull.** Un altre agent està movent l'ull. Les dues feines toquen `index.html`, la fila de dalt i
  `tests/selector-controls.mjs`. Cal fer-les en ordre per no trepitjar-se.
- **Contrast del convidat.** `#e8d8b8` i el `#1234` més apagat s'han de mesurar sobre el fons de la classificació
  (4.5:1 o més).
- **Límits del Drac.** `drac-v1` no ha publicat mai. Cal calcular-ne `judgments`, `max_score` i `extras_max` amb la
  mateixa eina que la Mulassa.
- **Privadesa.** La fitxa pública fa públiques dades que avui no ho són, i el servidor guarda els dies que es juga.
  El text s'ha de canviar abans de les fases 3 i 4, i els perfils que ja existeixen ho han de veure.
- **Clients antics que mostren els 7 dies.** Fins que recarreguin, mostren un avís que ja no és cert. No fa mal, però
  convé que la fase 2 surti al mateix temps que el canvi de text.
- **Temporada 0 oberta per sempre.** Un client antic pot moure el podi de la 0. Si un dia es vol tancar, és una
  migració d'una línia.
- **Temps importat.** El primer enviament d'estadístiques porta temps que el servidor no pot comprovar. Les regles
  només fiten partides i temps pel temps real des de l'inici de la Temporada 1 (fins a 8 dispositius per perfil). És el mateix risc que els punts, i la fitxa pública ja ho avisa.

## 12. Com s'hi ha arribat (preguntes i respostes)

La tasca: decidir com rotar els rànquings quan el ball nou de la Mulassa faci incomparables les puntuacions, com
guardar l'històric, com migrar la base de dades de producció sense trencar els clients antics i què ha de tenir una
secció Perfil amb estadístiques. Primer vaig proposar un esborrany, i després Marc va decidir punt per punt:

1. Rotació: temporades de 3 mesos (la recomanació).
2. Final de la Temporada 1: el 31 de desembre de 2026. Jo proposava allargar-la fins al març.
3. Clients antics: acceptar-los sempre. Jo proposava 14 dies de gràcia.
4. Seeds: cap (la recomanació).
5. Saló de la fama: en viu, sense còpies (la recomanació).
6. Botó Perfil: al lloc de l'ull. Jo proposava un sisè botó. Un altre agent mou l'ull.
7. Estadístiques: al servidor des del principi. Jo proposava només locals al principi. Marc va afegir que cal fer que
   la gent sense correu sigui més conscient del que implica, i potser dir-los convidats.
8. Convidats: dades al servidor i còpia local (la recomanació), i el nom "Convidat".
9. Drac: classificació pròpia ja. Jo proposava fer-ho després.
10. Marc va demanar el tick de verificat a tot arreu, com el de Twitter.
11. Marc va demanar que els convidats es vegin "menys" que els altres.
12. Llançament: abans de mitjan novembre.
13. Nivells: una sola classificació, com ara (la recomanació).
14. Sense perfil: només locals fins que en creï (la recomanació).
15. Saló de la fama: podi i la meva posició (la recomanació).
16. Noms: primer va triar festes de Valls. Al repàs final els va canviar per les estacions (decisió 34).
17. Final de temporada: l'avís a la pròxima obertura (la recomanació).
18. Estadístiques públiques en tocar un sobrenom. Jo proposava que fossin privades. El 21/10/2026 va triar la "Fitxa breu"
    i va fer públics també PERFECTE, BÉ, ERROR i les caigudes, dins de "Més estadístiques".
19. Convidats amb fitxa pública i temps total a la fitxa (les recomanacions).

Després de la revisió d'Astra (secció 13):

20. Partides i perfils: cada partida compta per al perfil amb què es juga (la recomanació).
21. Ball nou a mig trimestre: Marc va dir que afegirà figures en qualsevol moment, i va preguntar què passa si una
    figura entra en una temporada ja oberta. La resposta va ser que entra a la temporada oberta, i un ball nou també
    (la recomanació). Jo proposava publicar els balls nous només a l'inici d'un trimestre.
22. 7 dies: Marc els vol treure. Els convidats perden el perfil si esborren les dades del navegador.
23. Nom dels convidats: la seva idea, "Convidat-text" o "nom#1234" a l'estil Discord. Va triar el #1234.
24. Convidats que ja existeixen: se'ls treu la data i se'ls afegeix el # (la recomanació).
25. Dies jugats: al servidor, amb les dates. Jo proposava calcular-los només al dispositiu.
26. Retenció: esborrar automàticament els convidats inactius 12 mesos (la recomanació).
27. Temps importat: jo proposava un límit de 200 hores. Marc va preguntar quin problema hi havia a importar-lo tal
    qual. La resposta: cap, més enllà dels valors absurds, que ja talla la regla de coherència. Es treu el límit.
28. Convidats a les llistes: només `nom#1234` (la recomanació).
29. Ball anterior: "ball anterior" (la recomanació).

Després de la segona revisió d'Astra:

30. Partides sense perfil després d'haver-ne tingut un: van al proper perfil que es creï o s'obri (la recomanació).
31. Perfil esborrat: les seves estadístiques s'esborren també del dispositiu (la recomanació).

Repàs final, punt per punt (12 punts; Marc va estar d'acord amb tots menys els que segueixen):

32. Al repàs vaig comprovar que les migracions dels 7 dies no són a `master`: mai han sortit. Marc va dir que a
    producció no hi ha caducitat i que els convidats no caduquen. Decisió: no desplegar-les i substituir-les.
33. Nom en verificar: Marc va proposar que, en confirmar el correu, el jugador triï un nom nou de zero, sense
    "Treu el #". Ho vaig concretar en el pas "Tria el teu nom" just després del codi.
34. Noms de les temporades: Marc no volia Sant Joan a l'abril ni "Estiu" sol entre noms de festes, i va triar les
    quatre estacions.
35. Temporada 0: "Estrena 2026" (la recomanació).

No queda cap decisió pendent.

## 13. Revisió d'Astra

### Primera ronda

`gpt-6-astra` (Codex, esforç mitjà) va revisar la versió anterior d'aquest document el 2026-10-20, en mode de només
lectura. Va trobar 10 problemes. La segona ronda (més avall) en va completar alguns:

| # | Problema | Com queda |
| --- | --- | --- |
| 1 | `submit_result` podia tornar el resultat d'una altra temporada. | Filtre `season_id` a la consulta final i test d'una sola fila (secció 8). |
| 2 | Tornar a un perfil anterior perdia partides. | Comptadors per perfil al dispositiu, per `user_id` (decisió 20, secció 7). |
| 3 | La validació del temps rebutjava el primer enviament. | El primer enviament importa el temps tal qual, amb la regla de coherència (decisió 27, secció 7). |
| 4 | Estrelles, millor ratxa i dies no es poden sumar. | Regla de combinació per a cada estadística i buckets per versió (secció 7). |
| 5 | Temporades globals amb balls nous a mig trimestre; el Saló de la fama no podia obrir classificacions antigues. | Classificació = (temporada, família); `get_seasons` torna la versió (decisió 21, secció 8). |
| 6 | Un convidat que només envia estadístiques no caducava. | Els convidats ja no caduquen (decisió 22). |
| 7 | Les partides abandonades i la pràctica no passaven per `finish()`. | `endRun()` per a totes les maneres d'acabar (secció 7). |
| 8 | "Els clients antics sempre poden publicar" era massa absolut. | Resolt diferent al repàs final: els clients de producció són els de `master` (8 paràmetres), i els de la branca no han sortit mai (secció 8). |
| 9 | Sense temporades creades, els resultats nous anaven a la 0. | `ensure_season`, la 0 exclosa per a versions actives, temporades sense encavalcar (secció 8). |
| 10 | Límits de concurrència sense provar; PGlite té una sola connexió. | Bloqueig del perfil a `merge_stats`, validació de l'estat resultant, tests amb Postgres real (secció 8). |

Astra també va confirmar: el nom de la constraint única (`entries_user_id_version_difficulty_key`), que la funció de
8 paràmetres ja no existeix, que la Temporada 0 rep els resultats antics des del primer moment, l'ordre de desplegament,
els esborrats en cascada i que cal calcular els límits del Drac.

### Segona ronda

`gpt-6-astra` (Codex, esforç mitjà) va revisar la versió corregida el mateix dia, també en mode de només lectura.
Va trobar 11 problemes nous o incomplets. He comprovat al codi el 1 i el 8. Tots estan resolts aquí:

| # | Problema | Com queda |
| --- | --- | --- |
| 1 | Una caiguda no té tots els judicis i trencava la validació. | `completed` i `collapsed` separats, i un interval per als judicis (secció 7). |
| 2 | L'índex únic global i `check_alias_free` impedien noms repetits entre convidats. | Es substitueix l'índex; tres camins d'escriptura amb les mateixes regles; reintent de `tag` al servidor (secció 6). |
| 3 | Guardar `nom#1234` a `leaderboard-alias` deixaria sense publicar una pestanya antiga. | Nom sense `#` a `ALIAS_KEY`, `tag` en una clau a part, `my_alias` sense `#` (secció 6). |
| 4 | Els dies i la pràctica eren del dispositiu, no del perfil. | Tot per propietari (secció 7). |
| 5 | La primera lectura d'un trimestre nou no tenia temporada. | Les lectures també criden `season_for`, que pot crear-la (secció 8). |
| 6 | Una retirada a l'inici d'un trimestre enviava els clients antics al trimestre nou. | `retired_season_id` desat en retirar (secció 8). |
| 7 | No estava definit què passa amb un perfil esborrat ni amb les partides sense perfil posteriors. | Decisions 30 i 31 (secció 7). |
| 8 | Era fals que les crides de 8 paràmetres fallessin. | Corregit; al repàs final, la signatura de producció (8 paràmetres) es manté igual (seccions 2 i 8). |
| 9 | L'avís de privadesa arribava després del primer enviament. | Avís abans de la primera sincronització de cada perfil (secció 7). |
| 10 | `season-seen-<id>` era massa ampli. | Un full per temporada, clau per perfil i temporada (secció 5). |
| 11 | Les fases de les migracions i la suma de dies no quadraven. | Alineades; marge d'1,5 dies explicat (seccions 8 i 9). |

Astra també va comprovar que la restricció d'exclusió funciona a PGlite sense `btree_gist`, que `delete-player` no
depèn del nom, que `?repte` no porta el nom i que l'ordre de desplegament és correcte. També va recordar que treure
la caducitat obliga a revisar `expired`, `drop_expired`, `purge_expired_profiles`, `check_alias_free` i el cron antic,
i que la neteja de 12 mesos ha de tornar a comprovar, amb el perfil bloquejat, que segueix inactiu i sense correu.

### Tercera ronda

`gpt-6-astra` (Codex, esforç mitjà, només lectura) va confirmar 9 de les 11 correccions de la segona ronda i en va
trobar dues d'incompletes, ara resoltes:

| # | Problema | Com queda |
| --- | --- | --- |
| 1 | Es pot caure a l'última nota amb tots els judicis comptats (ho va comprovar amb la funció d'ànim real: 232 PERFECTE i 8 ERROR a DIFÍCIL), i el límit `collapsed × (J - 1)` ho rebutjava. | Límit `(completed + collapsed) × J` i un test d'aquest cas (secció 7). |
| 2 | Un verificat que encara porta `#1234` no podia publicar si un altre verificat tenia el nom net. | L'espai del nom depèn del `tag`, no del correu; el correu només permet `choose_verified_alias` (secció 6). |

No va trobar cap altra contradicció. També va confirmar que l'ordre de les claus foranes de la migració és correcte i
que una lectura `security definer` i `volatile` pot crear la temporada encara que la faci un usuari anònim. Són
comprovacions del disseny: la migració i la concurrència encara no existeixen.
