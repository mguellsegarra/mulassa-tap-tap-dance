-- Severe nickname terms match anywhere, even glued to digits or other words (Marc, 2026-09-28). Mirrors
-- src/alias-rules.js SEVERE (tests/alias-rules.mjs runs 0009-0013 on PGlite and compares both answers and both lists).
--   * alias_terms gets a "severe" flag: hate symbols, the worst slurs, sexual violence. Severe terms are always 'sub'
--     (anywhere in the skeleton: "Nazi88", "xHitlerx", "SiegHeil", "h1tl3r"). nazi/heil/kkk move from 'word' to severe
--     'sub'; "nazis" is dropped (nazi covers it). Ordinary terms keep matching as before.
--   * alias_rejection(): as in 0009, plus a third skeleton that keeps the digits (lowercase, no accents, separators
--     removed, no leetspeak), checked against the severe terms only, so "1488" can be a term ("Pau1488", "14-88x").
--     "88" right after a severe term needs no term: the severe term already blocks. Severe terms are tried first.
--   * The allowlist gets the real words and names that contain a severe term (Nazim, Nazira, Ignazio, Ashkenazi,
--     Sheila, Heilbronn, therapist, terapista, Trappist). "mulassa" stays allowed (0010).
--   * Existing profiles are NOT renamed. The block at the end only reports (NOTICE) any existing alias now refused.
-- Idempotent: columns/constraints are re-created only if needed, rows are upserted, functions replaced.
-- ASCII only: non-ASCII characters are regex escapes (\uXXXX).
begin;

alter table leaderboard_private.alias_terms add column if not exists severe boolean not null default false;
alter table leaderboard_private.alias_terms drop constraint if exists alias_terms_term_check;
alter table leaderboard_private.alias_terms add constraint alias_terms_term_check
  check (term ~ '^[a-z]+$' or (severe and term ~ '^[a-z0-9]+$')); -- digits only in severe terms ("1488")
alter table leaderboard_private.alias_terms drop constraint if exists alias_terms_severe_sub;
alter table leaderboard_private.alias_terms add constraint alias_terms_severe_sub
  check (not severe or (mode = 'sub' and reason = 'blocked'));

delete from leaderboard_private.alias_terms where term = 'nazis';
insert into leaderboard_private.alias_terms(term, mode, reason, severe)
select t, 'sub', 'blocked', true from pg_catalog.unnest(array[
  'nazi', 'hitler', 'heil', 'kkk', 'fuhrer', 'fuehrer', 'waffenss', 'gestapo', 'auschwitz', 'holocaust', 'whitepower',
  'whitepride', '1488',
  'nigger', 'nigga', 'negrata', 'faggot', 'maricon', 'marica', 'bujarra', 'tortillera', 'travelo', 'sudaca', 'xarnego',
  'charnego',
  'pedofil', 'pedophil', 'paedophil', 'pederast', 'violador', 'violacio', 'rapist', 'incest', 'zoofil', 'zoophil']) t
on conflict (term) do update set mode = excluded.mode, reason = excluded.reason, severe = excluded.severe;

insert into leaderboard_private.alias_allow(word)
select w from pg_catalog.unnest(array['nazim', 'nazir', 'ignazi', 'ashkenazi', 'sheila', 'heilbronn', 'therapist',
  'terapist', 'trappist']) w
on conflict (word) do nothing;

-- null, 'blocked' or 'reserved' for an alias already shaped by normalized_alias.
create or replace function leaderboard_private.alias_rejection(p_alias text) returns text
language plpgsql stable strict set search_path = '' as $$
declare
  v_split text; v_t text; v_one text; v_tokens text[]; v_compact text; v_spelled text[]; v_run text; r record;
begin
  -- camelCase: GrallerDeValls -> Graller De Valls
  v_split := pg_catalog.regexp_replace(p_alias,
    '([a-zß-öø-ÿœ])([A-ZÀ-ÖØ-ÞŒ])', '\1 \2', 'g');
  -- a "1" reads as i and as l; '' keeps the digits and is only checked against the severe terms
  foreach v_one in array array['i', 'l', ''] loop
    if v_one = '' then
      v_t := leaderboard_private.alias_fold(v_split);
    else
      v_t := pg_catalog.translate(leaderboard_private.alias_fold(v_split), '0134578@$', 'o' || v_one || 'easatbas');
      v_t := pg_catalog.regexp_replace(v_t, '[0-9]', '', 'g'); -- other digits only pad a word out
    end if;
    select coalesce(pg_catalog.array_agg(x order by n), '{}') into v_tokens
      from pg_catalog.regexp_split_to_table(v_t, '[ _''’-]+') with ordinality as t(x, n) where x <> '';
    v_compact := pg_catalog.array_to_string(v_tokens, '');
    v_spelled := '{}'; v_run := ''; -- runs of single letters: "p u t a" -> "puta"
    for i in 1..coalesce(pg_catalog.array_length(v_tokens, 1), 0) + 1 loop
      if i <= pg_catalog.array_length(v_tokens, 1) and pg_catalog.length(v_tokens[i]) = 1 then v_run := v_run || v_tokens[i];
      else
        if pg_catalog.length(v_run) > 1 then v_spelled := v_spelled || v_run; end if;
        v_run := '';
      end if;
    end loop;
    for r in select t.reason, t.mode, leaderboard_private.alias_term_pattern(t.term) as pattern
        from leaderboard_private.alias_terms t
        where v_one <> '' or t.severe
        order by t.severe desc, t.reason loop
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
revoke all on function leaderboard_private.alias_rejection(text) from public, anon, authenticated;

-- Report only: existing aliases the rules now refuse. They are left as they are (moderate by hand).
do $$
declare r record;
begin
  for r in select p.alias from leaderboard_private.profiles p
      where leaderboard_private.alias_rejection(p.alias) is not null order by p.created_at, p.user_id loop
    raise notice 'existing alias now refused (not renamed): %', r.alias;
  end loop;
end $$;

commit;
