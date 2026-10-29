# Rànquings: pla de desplegament a producció

Estat: preparat el 2026-10-21. No s'ha fet cap pas a producció. Cada pas marcat **[prod]** necessita la confirmació
explícita del propietari al xat en el moment de fer-lo, i cada confirmació val només per a aquell pas. Ni l'agent que prepara
el desplegament ni cap altre llegeix secrets, es connecta a la base de dades remota o executa res contra producció.

Decisions i disseny: [`docs/rankings/strategy.md`](strategy.md) (secció 8, migració). Còpies:
[`docs/ops/db-backup.md`](../ops/db-backup.md).

Què es desplega: les set migracions noves i el client que les fa servir. Beta ja té les sis primeres; només hi
falta `202610280002`.

| Fitxer | Què fa |
| --- | --- |
| `202610200001_guests.sql` | `tag` als convidats, `verified`, `my_profile`. Conserva l'índex de nom únic (`profiles_alias_key`) fins a `202610280002`. |
| `202610200002_seasons.sql` | `seasons` (0 "Estrena 2026", 1 "Tardor 2026"), `season_id` a `entries`, `mulassa-v3` i `drac-v1`, RPC per temporada. |
| `202610200003_player_stats.sql` | `player_devices`, `player_stats`, `player_days`, `merge_stats`, `my_stats`. |
| `202610200004_history_retention.sql` | `get_seasons`, `get_player_card`. |
| `202610210001_level_podium.sql` | `get_level_podium`: els tres millors d'un sol nivell (el podi del pas 2 del selector). |
| `202610280001_estrena_start.sql` | "Estrena 2026" comença el 15 d'octubre. |
| `202610280002_reusable_guest_names.sql` | Fora el `tag`: un nom per perfil actiu. Un convidat 30 dies inactiu perd el nom si algú el demana (`released_at`), sense perdre res més. Fitxa per `public_id`. Fora la neteja d'inactius. A beta, els noms repetits es queden amb un sol titular. |

## 0. Assaig local (fet, es pot repetir)

`node supabase/tests/rehearsal.mjs` aixeca un Postgres d'un sol ús amb la imatge de Supabase
(`public.ecr.aws/supabase/postgres:17.11.0.004`, la mateixa versió major que producció) i hi passa les migracions de
GoTrue perquè `auth` sigui la real. Aplica les migracions de `main` com a `postgres` (el rol de `supabase db push`),
hi posa dades sintètiques semblants a les de producció i després aplica les noves, una per una. Només parla amb
el contenidor que crea (`mulassa-rehearsal-<data>`) i l'esborra en acabar (`--keep` el deixa per inspeccionar-lo).
No necessita cap credencial.

Resultat del 2026-10-28 (39 de 39 comprovacions):

- Dades: 529 usuaris d'Auth, 467 perfils (16 seeds), 1.045 resultats de `mulassa-v1` i `mulassa-v2-short`.
  Abans i després, els mateixos recomptes i les mateixes sumes MD5 de `entries` i `profiles`.
- Totes les files existents van a la temporada 0. La v1 i la v2 queden retirades cap a la 0. La v3 i el Drac, actius.
- Cap perfil alliberat i un `public_id` per perfil (467). Cap nom porta `#`.
- El client antic: `get_leaderboard_all` amb 4 paràmetres per nom torna exactament la mateixa classificació,
  `submit_result` de 8 paràmetres publica a la 0 i, amb un nom desat vell, no reanomena res. `my_alias` torna el
  nom. També funciona després de cada migració per separat (vegeu el pas 4).
- Concurrència amb connexions separades: vuit `submit_result` alhora del mateix perfil (en passa una, set
  `leaderboard_rate_limit`), 24 perfils publicant alhora al mateix tauler, vuit convidats nous amb el mateix nom (un el té),
  sis jugadors demanant el nom d'un convidat inactiu (un el té; l'antic titular conserva els resultats), A demanant
  el nom de B mentre B demana el d'A (cap bloqueig mutu), el titular inactiu publicant mentre algú li demana el nom
  (només un dels dos el té), tres verificats demanant el mateix nom net (un el té), `merge_stats` paral·leles del mateix perfil i
  dispositiu (una per ronda, sense pèrdues ni valors que baixin), el límit de 8 dispositius, `merge_stats` contra
  l'esborrat del compte en tots dos ordres, i dotze `ensure_season` al límit del 31/12 al 1/1 (una sola "Hivern 2027").
  Cap bloqueig mutu.
- Seguretat: totes les funcions tenen `search_path=''` i les RPC públiques són `security definer`. `anon` només pot
  executar `get_leaderboard_all`, `get_level_podium`, `get_seasons` i `get_player_card`. `authenticated` hi afegeix les seves pròpies RPC,
  i cap funció privada. Ningú no llegeix les taules privades. Un jugador no pot enviar estadístiques a un altre perfil
  (`leaderboard_owner_mismatch`). La fitxa pública i el Saló de la fama no porten ids, dies ni adreces.
- Ja no hi ha neteja de convidats inactius: ni `purge_inactive_guests` ni `leaderboard_expired_players`, i els
  comptes de fa 13 mesos hi continuen.

Defecte trobat i corregit a l'assaig: `ensure_season` agafava un bloqueig global a cada crida, i el bloqueig dura
tota la transacció. Una lectura oberta de la classificació (també d'`anon`) feia esperar totes les publicacions i
lectures de la v3 i del Drac (1,16 s en l'assaig). Ara llegeix sense bloqueig si la temporada ja existeix i només el
pren per crear-ne una (`tests/db/seasons-db.mjs` ho comprova).

El que l'assaig no prova: el client al navegador contra aquesta base (només les RPC), PostgREST i la recàrrega del
seu esquema, el pooler de Supabase i els permisos reals del rol `postgres` a producció (els comprova el pas 2).

## 1. [prod] Còpia manual

Just abans del merge, el mateix dia.

1. El propietari confirma el dispatch. L'ordre: `gh workflow run db-backup.yml --ref main`.
2. Cal que la variable `BACKUP_ENABLED` sigui `true`; si no, el workflow diu `BACKUP_DISABLED` i no fa res.
   L'entorn `db-backup-production` demana l'aprovació d'un revisor a cada execució.
3. Seguiment: `gh run watch <id>` (lectura). Ha d'acabar amb `BACKUP_OK`. El coordinador ja torna a llegir l'objecte i
   compara la mida i el SHA-256. `BACKUP_FAIL <CODI>` o `BACKUP_OK_MONITOR_FAIL` aturen el desplegament.
4. Apunta l'hora UTC de la còpia. És el punt de restauració dels passos següents.

Una còpia verificada no demostra que es pugui restaurar. La restauració provada és la del 2026-10-17
(`docs/ops/db-backup.md`). Si se'n vol una de nova abans de migrar, és una operació a part amb la seva pròpia
confirmació.

## 2. [prod] Recomptes en lectura, abans

El propietari ho executa al SQL Editor de Supabase. És només lectura: recomptes i sumes, cap sobrenom, adreça ni id.
Guarda el resultat i l'hora (`T0`).

```sql
begin read only;
select 'checked_at' as k, now()::text as v
union all select 'server_version', current_setting('server_version')
union all select 'last_migration', max(version) from supabase_migrations.schema_migrations
union all select 'postgres_can_delete_auth_users', has_table_privilege('postgres', 'auth.users', 'DELETE')::text
union all select 'postgres_can_update_auth_users', has_table_privilege('postgres', 'auth.users', 'UPDATE')::text
union all select 'entries_unique_constraint', string_agg(conname, ',')
  from pg_constraint where conrelid = 'leaderboard_private.entries'::regclass and contype = 'u'
union all select 'auth_users', count(*)::text from auth.users
union all select 'auth_anonymous', count(*)::text from auth.users where is_anonymous
union all select 'auth_confirmed', count(*)::text from auth.users where email_confirmed_at is not null
union all select 'profiles', count(*)::text from leaderboard_private.profiles
union all select 'profiles_seed', count(*)::text from leaderboard_private.profiles where is_seed
union all select 'entries', count(*)::text from leaderboard_private.entries
union all (select 'entries/' || version || '/' || difficulty, count(*)::text
  from leaderboard_private.entries group by version, difficulty order by 1)
union all select 'entries_md5', md5(string_agg(concat_ws('|', id, user_id, version, difficulty, perfect, good, miss,
  score, max_combo, quality_units, achieved_at), ',' order by id)) from leaderboard_private.entries
union all select 'profiles_md5', md5(string_agg(concat_ws('|', user_id, alias, created_at, is_seed), ','
  order by user_id)) from leaderboard_private.profiles;
rollback;
```

Què ha de sortir per continuar:

- `server_version` 17.x i `last_migration` = `202610170001`.
- `postgres_can_delete_auth_users` i `postgres_can_update_auth_users` = `true`. Si no, la migració `0004` s'atura a
  propòsit (vegeu el pas 4) i cal decidir-ho abans.
- `entries_unique_constraint` = `entries_user_id_version_difficulty_key`. La migració `0002` l'esborra amb
  `if exists`: amb un altre nom quedarien dues claus úniques i un jugador no podria tenir una fila per temporada.
- Cap fila de `entries` d'una versió que no sigui `mulassa-v1` o `mulassa-v2-short`.

## 3. Comprovacions al repositori abans del merge

Sense producció, a la branca que es fusionarà:

- `npm run check` en verd, i `node supabase/tests/rehearsal.mjs` en verd. L'assaig també executa els dos blocs SQL
  d'aquest document (passos 2 i 5) tal com són, abans i després de les migracions.
- `git diff main -- supabase/migrations/` només hi afegeix els set fitxers nous. Les migracions dels 7 dies
  (`202610180001`, `202610190001`) no hi són (decisió 32).
- `shasum public/music/*` igual que a `main`, si el canvi no és de música.
- Una prova manual del client nou i del de `main` contra un Supabase local, amb `?mute` (la secció 8, pas 2, de
  l'estratègia). No l'he feta.

## 4. [prod] Merge a `main`: migracions i després el client

El propietari confirma el merge (i el push, si n'hi ha) com a operacions separades. El merge a `main` publica la beta; mulassa.cat arriba amb l'etiqueta de versió, una altra operació confirmada a part. El workflow `Desplegament` fa
`migrate` (`supabase db push`) i, només si acaba bé, `deploy` (Pages). L'ordre és el que cal: el client nou
necessita les RPC noves, i el client antic funciona amb la base nova.

`db push` aplica els fitxers un per un, cadascun en la seva transacció. Si un falla, els anteriors es queden i el
client no es publica. L'assaig ha comprovat que el client antic funciona en cadascun d'aquests estats intermedis.
El més probable és que s'aturi a `0004` per manca de permisos a `auth.users`. Llavors producció queda amb convidats,
temporades i estadístiques però sense Saló de la fama ni fitxa pública, i el client antic continua igual.

La Temporada 1 comença quan s'aplica `0002`, uns minuts abans que es publiqui el client nou. Un resultat del client
antic en aquest interval va a la Temporada 0, com ha de ser.

Verificació, llegint el registre del workflow (sense secrets):

- `Show history` llista les cinc migracions noves com a pendents i `Apply pending migrations` les aplica totes.
- `deploy` acaba bé i la versió publicada és la del commit fusionat.

## 5. [prod] Recomptes en lectura, després

La mateixa consulta del pas 2 i aquesta, també només de lectura:

```sql
begin read only;
select 'seasons' as k, string_agg(id || ':' || name || ':' || starts_at::text || ':' || coalesce(ends_at::text, '-'),
  ' | ' order by id) as v from leaderboard_private.seasons
union all select 'entries_by_season', string_agg(season_id || '=' || n, ',' order by season_id)
  from (select season_id, count(*) n from leaderboard_private.entries group by 1) t
union all (select 'versions/' || version, string_agg(difficulty || ':' || figure_id || ':' || active || ':' ||
  coalesce(retired_season_id::text, 'open'), ',' order by difficulty) from leaderboard_private.versions group by version order by 1)
union all select 'active_name_duplicates', count(*)::text from (select leaderboard_private.alias_key(alias)
  from leaderboard_private.profiles where released_at is null group by 1 having count(*) > 1) d
union all select 'profiles_released', count(*)::text from leaderboard_private.profiles where released_at is not null
union all select 'profiles_tag_column', count(*)::text from information_schema.columns
  where table_schema = 'leaderboard_private' and table_name = 'profiles' and column_name = 'tag'
union all select 'entries_after_T0', count(*)::text from leaderboard_private.entries where achieved_at > '<T0>'
union all select 'entries_unique_constraint', string_agg(conname, ',')
  from pg_constraint where conrelid = 'leaderboard_private.entries'::regclass and contype = 'u'
union all select 'functions_without_search_path', count(*)::text from pg_proc p
  where p.pronamespace in ('public'::regnamespace, 'leaderboard_private'::regnamespace)
  and not coalesce('search_path=""' = any(p.proconfig), false)
union all select 'anon_functions', string_agg(distinct p.proname, ',' order by p.proname) from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute');
rollback;
```

Què ha de sortir:

- `seasons`: `0:Estrena 2026:2026-10-14 22:00:00+00:-` i `1:Tardor 2026:<hora de la migració>:2026-12-31 23:00:00+00`
  (el SQL Editor escriu en UTC: són les 00:00 del 15 d'octubre i de l'1 de gener a Catalunya).
- `entries_by_season`: tot a la `0`, amb el mateix nombre que `entries` al pas 2 més les publicacions noves.
- `versions/mulassa-v1` i `versions/mulassa-v2-short` retirades cap a la `0`; `mulassa-v3` i `drac-v1` `open`.
- `active_name_duplicates` = 0, `profiles_released` = 0 (cap convidat ha perdut el nom encara) i `profiles_tag_column` = 0.
- `entries_unique_constraint` = `entries_user_season_version_difficulty_key`, sola.
- `functions_without_search_path` = 0. `anon_functions` = `get_leaderboard_all,get_level_podium,get_player_card,get_seasons`.
- Els recomptes d'`auth_users`, `profiles` i `profiles_seed` com al pas 2, o més. Si `entries_after_T0` és 0, també
  la mateixa `entries_md5`. Si és més de 0, la suma canvia per les publicacions noves i no és cap error.

Verificació al joc (sense escriure): la classificació de la Mulassa i la del Drac s'obren buides a "Tardor 2026", el
Saló de la fama mostra "Estrena 2026" amb el podi d'abans, i cap nom porta `#`.

**[prod] Opcional**: una publicació amb un perfil sintètic per comprovar la v3 i el Drac, esborrat després amb
"Esborra el perfil". És una escriptura a producció i necessita la confirmació del propietari.

## 6. Què mirar a Sentry

Les primeres 48 hores, i un altre cop al cap d'una setmana pels clients antics (pestanyes obertes i apps a la pantalla
d'inici d'iOS). Lectura amb el CLI i el token de només lectura, com diu AGENTS.md:
`issues list --query 'lastSeen:-24h'`, comparat amb una consulta feta just abans del merge.

- Tipus nous o que creixen: `leaderboard-list-failed`, `leaderboard-publish-failed`, `leaderboard-delete-failed`,
  i `boot-failed`.
- L'etiqueta `server` diu el codi del servidor. `rpc:42883` (funció que no existeix) o `PGRST202` vol dir que un
  client crida una signatura que ja no hi és; `PGRST203`, dues signatures; `42501`, permisos; `22023` en massa,
  validació massa estricta per a un client de veritat.
- Separa les dues versions del client per `release`: un error només a la versió antiga apunta a la compatibilitat
  de la base; només a la nova, al client nou.
- Els rebutjos normals (`rate_limit`, `taken`, `busy`...) no s'envien a Sentry. Que no n'hi hagi no vol dir res.

## 7. Rollback de cada pas

| Pas | Si va malament |
| --- | --- |
| 1. Còpia | No canvia res. Si no surt `BACKUP_OK`, no es continua. |
| 2 i 5. Lectures | Són transaccions de només lectura. No hi ha res a desfer. |
| 4. Migració que falla | El client no es publica. Les migracions aplicades es queden; el client antic hi funciona. Es corregeix amb una migració nova, que torna a passar per l'assaig. **[prod]** |
| 4. Client nou amb errors | Tornar a publicar el commit anterior (un revert a `main` o el rollback de Pages). El client antic funciona contra la base nova i publica a la Temporada 0. **[prod]** |
| Base de dades | Una migració de correcció. Per anul·lar la Temporada 1, un script manual a `supabase/ops/` que torni a obrir la v2 i tanqui la 1. No està escrit: s'escriu i s'assaja si cal. Les columnes noves es queden. **[prod]** |
| Últim recurs | Restaurar la còpia del pas 1 en un projecte nou (`docs/ops/db-backup.md`). Es perden les publicacions i els perfils posteriors a la còpia. **[prod]** |

## 8. El que queda manual

- **Convidats inactius**: res. No s'esborra cap perfil per inactivitat. Un convidat que passa 30 dies sense jugar
  conserva el compte i els resultats; només perd el nom si algú altre el demana (`write_alias`, en el moment). No hi
  ha cap tasca programada.
- **Cada trimestre**: res. `ensure_season` crea la temporada amb la primera publicació o lectura del trimestre.
- **Un ball nou a mig trimestre**: una migració nova que retiri la versió vella (`retired_at`, `retired_season_id`),
  amb el seu propi assaig.
