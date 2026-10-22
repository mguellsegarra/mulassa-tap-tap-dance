# Public pages per language

One `<code>.json` per language (`ca` is the base, `x-default` and the only one with `home`). `tools/seo-pages.mjs` emits
`/<code>/projecte/index.{html,md}` for every file here (Catalan lives at `/projecte/`), with reciprocal `hreflang`,
and lists them in `sitemap.xml` / `llms.txt`. A new language = a new file with the same keys and structure as `ca.json`:

- `lang` (`<html lang>`, JSON-LD `inLanguage`), `ogLocale` (e.g. `es_ES`).
- `ui`: page chrome (`play`, `videos`, `download` / `downloadMd` with `{size}` / `{title}`, `footer*`, `ogImageAlt`, `videoDescription`, `genre`, `os`).
- `projecte`: `title`, `lead`, `captures` / `videos` (same number and order; tuples, only texts translated), `sections` (same count and order,
  `[heading, [paragraphs]]`). Markers `**bold**`, `[text](url)`, `{cor}`, `{campanar}`, `{uaf}` stay as in `ca.json`.
- `home` is read from `ca` only.

Never translate GUA, PA, GUAPA!, CRE/MA/CREMA or proper names.
