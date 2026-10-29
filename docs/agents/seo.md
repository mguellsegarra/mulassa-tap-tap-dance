# Public pages, SEO and agents

- `/projecte/` (and the Markdown twins `/projecte/index.md`, `/index.md`) are written into `dist/` by `tools/deploy/seo-pages.mjs` from the per-language JSON files in
  `tools/deploy/seo-content/`: edit those files, never the generated output. `npm run build:pages` runs it after `vite build`.
  Plain files in `public/`: `robots.txt`, `sitemap.xml`, `llms.txt` (list a new public page in the sitemap and llms.txt), `captures/`
  (screenshots), `videos/` (1080p promo MP4s, each < 25 MB: the Pages file limit; the originals are not in the repo).
- `tools/deploy/prepare-pages.mjs` allowlists every public file; a new kind of file needs a line there. `public/_headers` sets the `charset` of the `.md`/`llms.txt`.
- The game's own page carries only an `sr-only` H1/summary, JSON-LD and `rel="alternate"` for crawlers: no visible SEO text in the game. Catalan is the source language, with translated pages per released language.
  Always use "Marc Güell Segarra" (both surnames), and no jargon (no engine or genre names). `tests/build/seo.mjs` checks the output.
