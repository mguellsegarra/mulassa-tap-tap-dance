-- "mulassa" is no longer a reserved nickname word (Marc, 2026-09-28): players may use it ("Mulassa", "mulassafan",
-- "LaMulassa"). Mirrors src/alias-rules.js RESERVED_SUB; tests/alias-rules.mjs applies 0009 then this file on PGlite and
-- checks that the SQL blocklist equals the JS one. The other reserved words stay.
-- Idempotent: running it again deletes nothing. ASCII only.
delete from leaderboard_private.alias_terms where term in ('mulassa', 'mulasa');
