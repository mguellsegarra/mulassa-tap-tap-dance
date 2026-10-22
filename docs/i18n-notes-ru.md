# Russian translation notes

- Translated independently from the Catalan source, without consulting the Ukrainian edition; informal singular address, with GUA/PA/GUAPA!/CRE/MA/CREMA preserved in Latin script.
- Integration: `meta.json.ru.plurals` currently lists `one/few/many` only. All 13 Russian plural messages also include `other`, as explicitly requested; the shared metadata needs that category when integrated.
- Space: `game.detail.late` uses the natural Russian `ПОЗДНО` (6 characters against Catalan `TARD`, 4). It is below the 24-character ceiling but slightly exceeds the approximate expansion ratio. `hud.share.fontSample` contains the Russian alphabet in both cases for font loading, not visible HUD copy.
- Cultural vocabulary: `CARRETILLES` stays Catalan, with a short Russian explanation in the help text. Figure names and cultural references remain untranslated; the invitation explains colla, gegants and bestiari.
- Validation: the Russian-only checks passed for 869 keys in source order, placeholders, inline tags and attributes, Latin cries, all four plural forms and 130 runtime plural renderings, plus SEO structure, links, bold markers and generated HTML/Markdown. The Catalan `home` object is unchanged.
- Shared checks at validation time: `node tests/i18n.mjs` stopped on missing `src/i18n/locales/eu/html.json`; `node tests/seo.mjs` failed its single-language/no-hreflang assertion after multiple language files were added. Neither shared test was edited.
- Activation and visual Cyrillic font/layout QA remain with integration; no shared registry, loader, boot generator, fonts or runtime files were changed.
