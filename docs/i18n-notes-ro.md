# Romanian translation notes

- `ui.board.withArticle.fem` and `.masc` both use `{name}`: Romanian needs no Catalan-style article before these preserved figure names.
- Compact HUD words `BINE`, `DEVREME` and `TÂRZIU` exceed the approximate Catalan length ratio, but remain 4–7 characters; kept natural rather than using unclear abbreviations. `LA DANS!` is 8 characters versus 6 for `BALLA!`.
- Short UI labels `Creează` and `Podiumuri` slightly exceed the approximate length ratio; kept as complete Romanian words.
- `CARRETILLES` stays as the cultural term, glossed as `artificii` in the help text.
- Validation: 869 message keys, 13 plural messages with `one/few/other`; ordered keys, placeholders per variant, inline tags/attributes and SEO structure/links/markers checked directly. Romanian HTML/Markdown generation passed.
- Shared `tests/i18n.mjs` stopped because `eu/html.json` was absent; its current aggregate placeholder comparison also assumes two plural variants. Shared `tests/seo.mjs` stopped at its single-language/no-hreflang assertion. No shared tests or integration files were changed.
