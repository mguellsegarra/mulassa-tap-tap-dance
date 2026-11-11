# Public pages, SEO and agents

- `/projecte/` (and the Markdown twins `/projecte/index.md`, `/index.md`) are written into `dist/` by `tools/deploy/seo-pages.mjs` from the per-language JSON files in
  `tools/deploy/seo-content/`: edit those files, never the generated output. `npm run build:pages` runs it after `vite build`.
  Plain files in `public/`: `robots.txt`, `sitemap.xml`, `llms.txt` (list a new public page in the sitemap and llms.txt), `captures/`
  (screenshots), `videos/` (1080p promo MP4s, each < 25 MB: the Pages file limit; the originals are not in the repo).
- `tools/deploy/prepare-pages.mjs` allowlists every public file; a new kind of file needs a line there. `public/_headers` sets the `charset` of the `.md`/`llms.txt`.
- The game's own page carries only an `sr-only` H1/summary, JSON-LD and `rel="alternate"` for crawlers: no visible SEO text in the game. Catalan is the source language, with translated pages per released language.
  Always use "Marc Güell Segarra" (both surnames), and no jargon (no engine or genre names). `tests/build/seo.mjs` checks the output.
- Link previews (og:image, 1200×630 JPEG under 300 KB, absolute `https://mulassa.cat/…` URLs: the beta deploy rewrites og:url, og:image and
  twitter:image to beta by `sed`). `public/og.jpg` (the main game) is a one-off capture. The mini-games' pages share one template made in HTML,
  `tools/social/og/build.py` → `public/og-jocs.jpg` (/jocs/) and `public/og-pop.jpg` (/pop/): the games menu's own stills
  (`public/jocs/menu/`) full bleed, the pages' MULASSA lettering big on top with GAMES or POP under it, and the gold «mulassa.cat» pill (the
  «Juga» gradient) at the foot; no other text, the page's og:title/og:description carry the words (Codex writes them). Chosen by the owner on
  11 Nov 2026 from eight proposals (four by Claude, four by Codex). A new game's page: one more entry in the script's `PAGES`, its file in
  `prepare-pages.mjs`'s list, and the tags in its page's head, copied from `index.html`'s block. Render with
  `python3 tools/social/og/build.py` (headless Chrome, `--html` for the HTML only, in `output/og/`) and look at the result before committing.
