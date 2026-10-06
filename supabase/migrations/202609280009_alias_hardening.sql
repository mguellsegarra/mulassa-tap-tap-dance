-- Nickname hardening (applied 2026-09-28).
--
-- What it does (mirrors src/alias-rules.js checkAlias with extras on; tests/alias-rules.mjs checks the parity on PGlite):
--   * normalized_alias(): same signature, used by submit_result and update_alias. NFC; invisible/control characters
--     (zero-width, bidi overrides, soft hyphen, BOM, variation selectors, tags) removed; any Unicode whitespace → one
--     space; ŀ → l·, "l.l" → "l·l"; phone dashes → "-"; ‘ ʼ ´ ` → ’; separator runs collapsed ("a - b" → "a-b");
--     no separator at either end. Allowed: Latin letters (A-Z, Latin-1 accents, ç, ñ, Œœ), digits 0-9, space, "-",
--     "_", apostrophes ' ’ and the middle dot only inside l·l. 3–16 characters, at least one letter, no character
--     4+ times in a row. Latin only on purpose: no Cyrillic/Greek homoglyphs, no emoji, no combining marks.
--   * Blocklist (insults/slurs ca/es/en + reserved brand/staff words) in two private tables, matched on a folded
--     "skeleton" (lowercase, no accents, leetspeak 0 1 3 4 5 7 8, separators removed, repeated letters tolerated) with a
--     Scunthorpe allowlist. Moderators can add rows without a new function.
--   * Errors: shape → 'leaderboard_invalid_alias' (as today); blocklist → 'leaderboard_invalid_alias_blocked'. Both
--     contain 'leaderboard_invalid', so the current client already shows its «Revisa el sobrenom…» message.
--
-- Deliberately NOT done:
--   * No CHECK constraint on profiles.alias, not even NOT VALID: Postgres re-checks NOT VALID constraints on every
--     UPDATE of a row, and get_leaderboard/submit_result update profiles.last_active_at; any existing profile with an
--     old-rule alias (2 or 17–20 characters, non-Latin letters) would then make its owner's reads and writes fail.
--     The RPCs are the only write path (no client grants), so validating there is sufficient.
--   * Existing aliases are not rewritten. Run the audit query at the end and moderate by hand.
--
-- After applying: set SERVER_ACCEPTS_EXTRAS = true in src/alias-rules.js (allows "_" and l·l in the client) and
-- update normalizeAlias in src/leaderboard-rules.js to delegate to checkAlias (backend-owned file), then rebuild.
begin;

create table leaderboard_private.alias_terms (
  term text primary key check (term ~ '^[a-z]+$'),
  mode text not null check (mode in ('sub', 'word')),   -- sub: anywhere (allowlist spares real words); word: whole word only
  reason text not null check (reason in ('blocked', 'reserved'))
);
create table leaderboard_private.alias_allow (
  word text primary key check (word ~ '^[a-z]+$')
);
alter table leaderboard_private.alias_terms enable row level security;
alter table leaderboard_private.alias_allow enable row level security;
revoke all on leaderboard_private.alias_terms, leaderboard_private.alias_allow from public, anon, authenticated;

-- Keep in sync with src/alias-rules.js (tests/alias-rules.mjs compares both lists).
insert into leaderboard_private.alias_terms(term, mode, reason) values
  ('puta','sub','blocked'), ('puto','sub','blocked'), ('merda','sub','blocked'), ('mierda','sub','blocked'), ('cabron','sub','blocked'), ('malpari','sub','blocked'),
  ('collon','sub','blocked'), ('capullo','sub','blocked'), ('gilipo','sub','blocked'), ('imbecil','sub','blocked'), ('idiota','sub','blocked'), ('subnormal','sub','blocked'),
  ('retrasad','sub','blocked'), ('retarded','sub','blocked'), ('mongolo','sub','blocked'), ('mongolic','sub','blocked'), ('marica','sub','blocked'), ('maricon','sub','blocked'), ('bujarra','sub','blocked'),
  ('bollera','sub','blocked'), ('tortillera','sub','blocked'), ('travelo','sub','blocked'), ('negrata','sub','blocked'), ('sudaca','sub','blocked'), ('panchito','sub','blocked'),
  ('xarnego','sub','blocked'), ('charnego','sub','blocked'), ('cataluf','sub','blocked'), ('hitler','sub','blocked'), ('follar','sub','blocked'), ('joder','sub','blocked'),
  ('cojon','sub','blocked'), ('polla','sub','blocked'), ('pendejo','sub','blocked'), ('pedofil','sub','blocked'), ('pederast','sub','blocked'), ('fuck','sub','blocked'),
  ('bitch','sub','blocked'), ('cunt','sub','blocked'), ('shit','sub','blocked'), ('whore','sub','blocked'), ('slut','sub','blocked'), ('nigger','sub','blocked'),
  ('nigga','sub','blocked'), ('faggot','sub','blocked'), ('porn','sub','blocked'), ('cul','word','blocked'), ('culo','word','blocked'), ('cony','word','blocked'),
  ('caca','word','blocked'), ('pedo','word','blocked'), ('verga','word','blocked'), ('pene','word','blocked'), ('penis','word','blocked'), ('zorra','word','blocked'),
  ('guarra','word','blocked'), ('mamon','word','blocked'), ('hdp','word','blocked'), ('fdp','word','blocked'), ('nazi','word','blocked'), ('nazis','word','blocked'),
  ('heil','word','blocked'), ('kkk','word','blocked'), ('dick','word','blocked'), ('cock','word','blocked'), ('fag','word','blocked'), ('fck','word','blocked'),
  ('fuk','word','blocked'), ('cabro','word','blocked'), ('cabrons','word','blocked'), ('mulassa','sub','reserved'), ('mulasa','sub','reserved'), ('admin','sub','reserved'),
  ('moderador','sub','reserved'), ('moderator','sub','reserved'), ('ajuntament','sub','reserved'), ('ayuntamiento','sub','reserved'), ('oficial','sub','reserved'), ('official','sub','reserved'),
  ('supabase','sub','reserved'), ('organitzador','sub','reserved'), ('staff','word','reserved'), ('suport','word','reserved'), ('support','word','reserved'), ('soporte','word','reserved'),
  ('sistema','word','reserved'), ('system','word','reserved'), ('root','word','reserved'), ('null','word','reserved'), ('undefined','word','reserved');
insert into leaderboard_private.alias_allow(word) values
  ('marc'), ('marta'), ('anna'), ('pere'), ('gemma'), ('montse'), ('gloria'), ('sergi'),
  ('bernat'), ('cugat'), ('cunit'), ('badminton'), ('pollastre'), ('pollancre'), ('pollenca'), ('disputa'),
  ('diputa'), ('computa'), ('reputa'), ('imputa'), ('amputa'), ('maricarmen'), ('maricruz'), ('yoshit'),
  ('hoshit'), ('scunthorpe');

-- Lowercase without accents; the explicit map does not depend on the database locale (lower() only sees ASCII).
create function leaderboard_private.alias_fold(p text) returns text
language sql immutable strict set search_path = '' as $$
  select pg_catalog.lower(pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
    pg_catalog.replace(pg_catalog.replace(pg_catalog.translate(p,
      'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝàáâãäåçèéêëìíîïðñòóôõöøùúûüýÿ·',
      'aaaaaaceeeeiiiidnoooooouuuuyaaaaaaceeeeiiiidnoooooouuuuyy'),
    'Æ', 'ae'), 'æ', 'ae'), 'Œ', 'oe'), 'œ', 'oe'), 'ß', 'ss'), 'Þ', 'th'), 'þ', 'th'))
$$;

-- "polla" → 'p{1,}o{1,}l{2,}a{1,}': a term's doubled letters are minimums, extra repeats still match.
create function leaderboard_private.alias_term_pattern(p_term text) returns text
language plpgsql immutable strict set search_path = '' as $$
declare v_out text := ''; v_prev text; v_ch text; v_run integer := 0;
begin
  for i in 1..pg_catalog.length(p_term) loop
    v_ch := pg_catalog.substr(p_term, i, 1);
    if v_ch = v_prev then v_run := v_run + 1;
    else
      if v_prev is not null then v_out := v_out || v_prev || '{' || v_run || ',}'; end if;
      v_prev := v_ch; v_run := 1;
    end if;
  end loop;
  return v_out || v_prev || '{' || v_run || ',}';
end;
$$;

-- Leftmost-greedy matches of p_pattern in p_text, every start position (like the JS spans()).
create function leaderboard_private.alias_spans(p_text text, p_pattern text)
returns table(s integer, e integer)
language plpgsql immutable strict set search_path = '' as $$
declare v_from integer := 1; v_pos integer;
begin
  loop
    exit when v_from > pg_catalog.length(p_text);
    v_pos := pg_catalog.regexp_instr(p_text, p_pattern, v_from);
    exit when v_pos = 0;
    s := v_pos; e := v_pos + pg_catalog.length(pg_catalog.regexp_substr(p_text, p_pattern, v_from));
    return next;
    v_from := v_pos + 1;
  end loop;
end;
$$;

-- null, 'blocked' or 'reserved' for an alias already shaped by normalized_alias.
create function leaderboard_private.alias_rejection(p_alias text) returns text
language plpgsql stable strict set search_path = '' as $$
declare
  v_split text; v_t text; v_one text; v_tokens text[]; v_compact text; v_spelled text[]; v_run text; r record;
begin
  -- camelCase: GrallerDeValls → Graller De Valls
  v_split := pg_catalog.regexp_replace(p_alias, '([a-zß-öø-ÿœ])([A-ZÀ-ÖØ-ÞŒ])', '\1 \2', 'g');
  foreach v_one in array array['i', 'l'] loop -- a "1" reads as i and as l
    v_t := pg_catalog.translate(leaderboard_private.alias_fold(v_split), '0134578@$', 'o' || v_one || 'easatbas');
    v_t := pg_catalog.regexp_replace(v_t, '[0-9]', '', 'g'); -- other digits only pad a word out
    select coalesce(pg_catalog.array_agg(x order by n), '{}') into v_tokens
      from pg_catalog.regexp_split_to_table(v_t, '[ _''’-]+') with ordinality as t(x, n) where x <> '';
    v_compact := pg_catalog.array_to_string(v_tokens, '');
    v_spelled := '{}'; v_run := ''; -- runs of single letters: "p u t a" → "puta"
    for i in 1..coalesce(pg_catalog.array_length(v_tokens, 1), 0) + 1 loop
      if i <= pg_catalog.array_length(v_tokens, 1) and pg_catalog.length(v_tokens[i]) = 1 then v_run := v_run || v_tokens[i];
      else
        if pg_catalog.length(v_run) > 1 then v_spelled := v_spelled || v_run; end if;
        v_run := '';
      end if;
    end loop;
    for r in select t.reason, t.mode, leaderboard_private.alias_term_pattern(t.term) as pattern
        from leaderboard_private.alias_terms t order by t.reason loop
      if r.mode = 'word' then
        if exists (select 1 from pg_catalog.unnest(v_tokens || v_compact || v_spelled) w
                   where w ~ ('^' || r.pattern || '$')) then return r.reason; end if;
      elsif exists (
        select 1 from leaderboard_private.alias_spans(v_compact, r.pattern) m
        where not exists (
          select 1 from leaderboard_private.alias_allow a,
            lateral leaderboard_private.alias_spans(v_compact, leaderboard_private.alias_term_pattern(a.word)) c
          where c.s <= m.s and m.e <= c.e)) then
        return r.reason;
      end if;
    end loop;
  end loop;
  return null;
end;
$$;

create or replace function leaderboard_private.normalized_alias(p_alias text) returns text
language plpgsql stable set search_path = '' as $$
declare v_alias text;
begin
  v_alias := normalize(p_alias, NFC); -- SQL-standard syntax: cannot be schema-qualified
  v_alias := pg_catalog.regexp_replace(v_alias, '[\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+', ' ', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias,
    '[\u0001-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\U000E0000-\U000E007F\U000E0100-\U000E01EF]',
    '', 'g');
  v_alias := pg_catalog.replace(pg_catalog.replace(v_alias, 'ŀ', 'l·'), 'Ŀ', 'L·');
  v_alias := pg_catalog.regexp_replace(v_alias, '[\u2010-\u2015\u2212]', '-', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '[\u2018\u02BC\u00B4`]', '’', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '(?<=[lL])[.\u2022\u2027\u22C5·]+(?=[lL])', '·', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, ' *([_''’-])[ _''’-]*', '\1', 'g'); -- a run keeps its first non-space
  v_alias := pg_catalog.regexp_replace(v_alias, ' +', ' ', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '^[ _''’·-]+|[ _''’·-]+$', '', 'g');
  if v_alias is null
    or v_alias !~ '^[A-Za-zÀ-ÖØ-öø-ÿŒœ0-9 _''’·-]*$'
    or pg_catalog.regexp_replace(v_alias, '(?<=[lL])·(?=[lL])', '', 'g') ~ '·'
    or pg_catalog.char_length(v_alias) not between 3 and 16
    or v_alias !~ '[A-Za-zÀ-ÖØ-öø-ÿŒœ]'
    or leaderboard_private.alias_fold(v_alias) ~ '(.)\1\1\1' then
    raise exception 'leaderboard_invalid_alias' using errcode = '22023';
  end if;
  if leaderboard_private.alias_rejection(v_alias) is not null then
    raise exception 'leaderboard_invalid_alias_blocked' using errcode = '22023';
  end if;
  return v_alias;
end;
$$;

revoke all on function leaderboard_private.alias_fold(text), leaderboard_private.alias_term_pattern(text),
  leaderboard_private.alias_spans(text, text), leaderboard_private.alias_rejection(text),
  leaderboard_private.normalized_alias(text) from public, anon, authenticated;
commit;

-- Audit (read-only, run separately after applying): existing profiles the new rules would refuse. Moderate by hand.
-- select p.user_id, p.alias, p.last_active_at from leaderboard_private.profiles p
--   where p.alias !~ '^[A-Za-zÀ-ÖØ-öø-ÿŒœ0-9 _''’·-]{3,16}$' or leaderboard_private.alias_rejection(p.alias) is not null;
