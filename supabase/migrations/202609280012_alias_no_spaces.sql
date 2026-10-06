-- Nicknames without spaces (Marc, 2026-09-28: "que no puguin tenir espais"). Mirrors src/alias-rules.js checkAlias
-- (tests/alias-rules.mjs runs 0009-0012 on PGlite and compares both answers).
--   * normalized_alias(): as in 0009, except that whitespace is no longer collapsed into one space: after the same
--     clean-up (NFC, invisible characters removed, l-middle-dot (U+0140), dashes, apostrophes, l.l) the ends are trimmed of spaces and
--     separators, and ANY whitespace left inside raises 'leaderboard_invalid_alias_spaces' (22023). Inner spaces are
--     never removed silently. Space is no longer in the allowed character set. Separator runs still collapse ("a__b").
--   * check_alias_free(): also refuses any whitespace (defence in depth; its callers already normalise first).
--   * Existing profiles whose alias has whitespace are renamed by joining the words, keeping each word as written
--     ("Colla Vella" -> "CollaVella"). alias_key() already ignores spaces, so the joined alias keeps its own key and
--     cannot collide. If the joined alias breaks a rule (e.g. two words glued into a blocked one), the words are joined
--     with "-" (same key), and failing that the player becomes "Jugador"; a taken candidate gets digits appended
--     ("Jugador2", ...), cut to fit 16 characters. Every new alias passes normalized_alias(). Deterministic order.
-- Idempotent: running it again replaces the functions with the same ones and finds nothing to rename.
-- ASCII only: non-ASCII characters are regex escapes (\uXXXX) or U&'' literals.
begin;

create or replace function leaderboard_private.normalized_alias(p_alias text) returns text
language plpgsql stable set search_path = '' as $$
declare v_alias text;
begin
  v_alias := normalize(p_alias, NFC); -- SQL-standard syntax: cannot be schema-qualified
  v_alias := pg_catalog.regexp_replace(v_alias, '[\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+', ' ', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias,
    '[\u0001-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFE00-\uFE0F\uFEFF\U000E0000-\U000E007F\U000E0100-\U000E01EF]',
    '', 'g');
  v_alias := pg_catalog.replace(pg_catalog.replace(v_alias, U&'\0140', U&'l\00B7'), U&'\013F', U&'L\00B7');
  v_alias := pg_catalog.regexp_replace(v_alias, '[\u2010-\u2015\u2212]', '-', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '[\u2018\u02BC\u00B4`]', U&'\2019', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '(?<=[lL])[.\u2022\u2027\u22C5\u00B7]+(?=[lL])', U&'\00B7', 'g');
  v_alias := pg_catalog.regexp_replace(v_alias, '^[ _''\u2019\u00B7-]+|[ _''\u2019\u00B7-]+$', '', 'g'); -- the ends
  if v_alias !~ '^[ 0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0152\u0153_''\u2019\u00B7-]*$' then
    raise exception 'leaderboard_invalid_alias' using errcode = '22023'; -- symbols first, then the spaces
  end if;
  if v_alias ~ ' ' then -- "Drac De Valls", "a - b": the player joins the words, not us
    raise exception 'leaderboard_invalid_alias_spaces' using errcode = '22023';
  end if;
  v_alias := pg_catalog.regexp_replace(v_alias, '([_''\u2019-])[_''\u2019-]*', '\1', 'g'); -- "a__b" -> "a_b"
  if v_alias is null
    or pg_catalog.regexp_replace(v_alias, '(?<=[lL])\u00B7(?=[lL])', '', 'g') ~ '\u00B7'
    or pg_catalog.char_length(v_alias) not between 3 and 16
    or v_alias !~ '[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF\u0152\u0153]'
    or leaderboard_private.alias_fold(v_alias) ~ '(.)\1\1\1' then
    raise exception 'leaderboard_invalid_alias' using errcode = '22023';
  end if;
  if leaderboard_private.alias_rejection(v_alias) is not null then
    raise exception 'leaderboard_invalid_alias_blocked' using errcode = '22023';
  end if;
  return v_alias;
end;
$$;
revoke all on function leaderboard_private.normalized_alias(text) from public, anon, authenticated;

create or replace function leaderboard_private.check_alias_free(p_alias text, p_uid uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if p_alias ~ '[\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]' then
    raise exception 'leaderboard_invalid_alias_spaces' using errcode = '22023';
  end if;
  if exists (select 1 from leaderboard_private.profiles
      where leaderboard_private.alias_key(alias) = leaderboard_private.alias_key(p_alias) and user_id <> p_uid) then
    raise exception 'leaderboard_alias_taken' using errcode = '23505';
  end if;
end;
$$;
revoke all on function leaderboard_private.check_alias_free(text, uuid) from public, anon, authenticated;

-- Rename the existing aliases that contain whitespace (oldest profile first).
do $$
declare
  v_ws constant text := '[\t\n\v\f\r \u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+';
  r record; v_base text; v_cand text; v_ok text; v_new text; i integer;
begin
  for r in select p.user_id, p.alias from leaderboard_private.profiles p
      where p.alias ~ v_ws order by p.created_at, p.user_id loop
    v_new := null;
    foreach v_base in array array[
        pg_catalog.regexp_replace(pg_catalog.btrim(pg_catalog.regexp_replace(r.alias, v_ws, ' ', 'g')), ' ', '', 'g'),
        pg_catalog.regexp_replace(pg_catalog.btrim(pg_catalog.regexp_replace(r.alias, v_ws, ' ', 'g')), ' ', '-', 'g'),
        'Jugador'] loop
      for i in 1..999 loop
        v_cand := case when i = 1 then v_base
          else pg_catalog.left(v_base, 16 - pg_catalog.length(i::text)) || i::text end;
        begin
          v_ok := leaderboard_private.normalized_alias(v_cand);
        exception when sqlstate '22023' then
          v_ok := null;
        end;
        if v_ok is not null and not exists (select 1 from leaderboard_private.profiles
            where leaderboard_private.alias_key(alias) = leaderboard_private.alias_key(v_ok) and user_id <> r.user_id) then
          v_new := v_ok;
          exit;
        end if;
      end loop;
      exit when v_new is not null;
    end loop;
    if v_new is null then raise exception 'no free alias for %', r.user_id; end if;
    update leaderboard_private.profiles set alias = v_new where user_id = r.user_id;
    raise notice 'alias renamed: % -> %', r.alias, v_new;
  end loop;
end $$;

commit;
