# i18n Fase 0: static-copy inventory (worker C)

Counts are approximate (words split on whitespace). "Extracted" means in `src/i18n/locales/ca/{html,boot}.json` and marked in `index.html`.

## Extracted in Phase 0

| Owner | Keys | Words | How |
| --- | --- | --- | --- |
| `index.html` static DOM (`data-i18n` ×134 text, `data-i18n-attr` ×24 attribute lists) | 150 `html.*` | ~568 | catalogue equals the inline Catalan (`tests/ui/i18n.mjs` §e); `applyI18n` (`src/i18n/apply-dom.js`) runs from `src/ui/handles.js` |
| Boot: 19 loading jokes + failure card (title, text, retry) | 22 `boot.*` | ~115 | one source (`boot.json` + `JOKE_IDS`), written into `index.html` by `tools/deploy/gen-boot.mjs`, read by `src/ui/loader.js`; `tests/ui/loader.mjs` fails on drift |

Shared keys: `html.common.{privacy,cancel,retry,statsGames,statsPublic,statsDays}` (texts that repeat verbatim). Everything else is keyed by the element's id or its ancestor's id plus role.

## Left in `index.html` (pending, with reason)

| Item | Approx. | Why / Phase 1 plan |
| --- | --- | --- |
| Privadesa body (`#privacy-content`, `#privacy-contact`): 19 paragraphs with inline `<b>`/`<a>`/examples | ~1,190 words | Sentences broken by markup; fragments would be untranslatable. Phase 1: one key per paragraph with `{0}…{n}` slots for links/bold rendered by a tiny safe-markup renderer, or a template per section. Needs the legal check (Decision 6). |
| Mixed sentences elsewhere: `settings-about` (4), `publish-about`, `profile-note`, `gpu-hint-text`, `ios-hint-text`, `feedback-form` (2), `captcha-menu`, `select-pending` (e-mail link), `sync-menu` (2) | 13 paragraphs, ~200 words | Same reason; same renderer. |
| Themed/figure texts (`data-fig`, `data-fig-aria`, `data-w`): pad words, legend GUA/PA/GUAPA, the ÀNIM line | ~12 | Figure-owned (`figure-theme`); GUA/PA/GUAPA! stay literal by rule. |
| `.sr-only` summary, JSON-LD, `<title>`, `<meta>` description/og/twitter, `og:image:alt` | ~110 words | Inventory only (task scope); SEO/crawler copy, handled with the per-language pages (§4). |
| Markup pinned by other tests: the 17 round `Tanca` buttons (`aria-label="Tanca"><svg`), `D’acord` ×3 hint/notice buttons, the statistics notice (title + 3 lines), the share sheet's format/labels/Privadesa link, `publish-recover`, season-end buttons, `select-pos`, `select-free-label` and ~10 bold run-ins | ~50 elements, ~120 words | `tests/ui/account-ui.mjs`, `share.mjs`, `figures.mjs` assert the exact tag text (`…">D’acord`, `<span>…</span>`), which an added attribute breaks. Not mine to edit; Phase 1 relaxes those assertions (read through the catalogue) and marks them. `tr('…')` in the JS that fills them can already cover most. |
| Static copy owned by the boot watchdog's DOM (`#loader`) | 1 | Now generated (see above). |
| Names/literals never extracted: Mulassa, Unió Anelles de la Flama, GUA/PA/GUAPA!, kbd D/K, WhatsApp, X, e-mail, `Timbaler#3821`, `?repte=94-2` | n/a | Proper names, keys, examples. |

## Inventory only (not touched)

| File | Strings | Words | Kind | Phase 1 plan |
| --- | --- | --- | --- | --- |
| `tools/deploy/seo-pages.mjs` `PAGES.home` | 8 (title, lead, 2 sections + paragraphs) | ~150 | Markdown-ish prose with `**bold**` and `[links](url)` inside strings | Move `PAGES` to per-language content objects (`PAGES[lang]`), emit `/<lang>/` + `.md` twins, `hreflang`, sitemap and `llms.txt` entries; the `lang` attribute in `toHtml`. Catalan stays the root. |
| `tools/deploy/seo-pages.mjs` `PAGES.projecte` | 29 (title, lead, 5 sections, 3 captures' alt, 2 videos' labels) | ~540 | Same, plus image `alt` and video captions | Same; alt/caption go with the page. |
| `tools/deploy/seo-pages.mjs` template (`toHtml`/`toMd`): labels, footer, `og:locale`, `<html lang="ca">` | ~10 | ~40 | Page chrome | Parametrise by language. |
| `public/llms.txt` | 1 title, 1 summary, 5 link lines | ~140 | Plain text | Per-language file or one per `/<lang>/`; list new pages. |
| `public/404.html` | title, H1 + span, 1 sentence, 2 buttons | ~25 visible (574 words with CSS) | Static page, `lang="ca"` | One 404 per language is not possible on Pages; keep Catalan plus a short neutral line, or a tiny script picking the language from the path. |
| `public/manifest.webmanifest` | `name`, `short_name` | 4 | Proper names | Unchanged (names are not translated). |
| `public/robots.txt`, `sitemap.xml`, `_headers` | 0 | 0 | Machine files | sitemap gains alternates per language. |
| `public/captures/*.jpg` (3), `og.jpg`, `videos/*` | 3 + 1 + 2 images/videos | n/a | Screenshots and promo media show Catalan UI | Re-shoot per language only for tier 1; `og:image:alt` and capture `alt` are text in `seo-pages.mjs` / `index.html`. |

## Real counts for the files of this worker

- `src/i18n/locales/ca/html.json`: 150 keys, ~568 words. `boot.json`: 22 keys, ~115 words. Total 172 keys, ~683 words.
- `index.html` marked elements: 134 text + 24 attribute lists (158 elements).
