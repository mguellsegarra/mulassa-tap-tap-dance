# Internationalisation strategy for Mulassa Tap Tap Dance

Date: 21 October 2026. Status: consolidated recommendation, analysis only; no game file was changed.
Inputs: two independent analyses, `i18n-strategy-sol.md` (gpt-6.1-sol, "Sol") and `i18n-strategy-sonnet.md` (Sonnet 5.5, "Sonnet"). Where they diverge, this document picks one side and says why in one line. "Verified" means I re-opened the primary source on 21 October 2026.

## 1. Recommendation in short

1. **Catalan is the source and the default for everyone**, including browsers set to Spanish. The browser language never selects the language; it only triggers one dismissible suggestion (section 3).
2. **First release: `ca` + `es` + `en`.** Then further editions in the order of section 2, one or two per release. Translations are produced by an LLM (the owner names gpt 6 astra) from the Catalan source; there is **no native-reviewer gate** (the owner's decision, 21 October 2026). Automated checks and the owner's own read of `es`/`en` replace it (section 7).
3. **Architecture:** one JSON catalogue per language with stable dotted keys, a small pure `tr(key, params)` core, Catalan bundled, other languages lazy-loaded. Whole-message translation with explicit figure/device variants; the current `themed()` word substitution is removed, not translated.
4. **Language switch outside a run saves the choice and reloads.** No live re-render of every sheet and canvas cache in phase 1.
5. **Never mirror the mechanics.** GUA stays left/orange, PA right/turquoise, in every language and direction.
6. **Start with Phase 0** (section 9): extract a verbatim Catalan catalogue, no visible change.

## 2. Languages and tiers

### 2.1 Evidence (verified)

| Claim | Value | Source |
| --- | --- | --- |
| Foreign nationals in Catalonia, 1 Jan 2025 | 1,522,819 | [Idescat/INE](https://idescat.cat/poblacioestrangera/?b=12&geo=cat&lang=es&nac=a), verified |
| Top nationalities | Morocco 252,843; Colombia 107,178; Italy 91,925; Romania 84,842; China 67,739; Honduras 65,502; Pakistan 63,296; Peru 56,895; Venezuela 49,312; Ukraine 40,705 | same, verified |
| EULP 2023, residents 15+ (6,785.1 k): **initial language** | Catalan 29.0%; Spanish 49.2%; Catalan+Spanish 5.6%; Arabic 179.6 k (2.6%); Romanian 73.4 k (1.1%); Amazigh 45.6 k (0.7%) | [Idescat EULP](https://idescat.cat/pub/?id=eulp&lang=es&n=10364), verified |
| EULP 2023: **habitual language** | Catalan 32.6%; Spanish 46.5% | same, verified |
| Steam survey, September 2026 | English 34.20%; Simplified Chinese 31.39%; Russian 9.05%; Spanish-Spain 4.08%; pt-BR 3.70%; German 2.48%; Japanese 2.41%; French 2.08%; Korean 1.37% | [Valve](https://store.steampowered.com/hwsurvey/), verified |

**Reliability.** Sol's numbers all match the primary tables. Sonnet's habitual-language numbers (32.6/46.5) are also correct, but they measure a different thing from Sol's initial-language ones (29.0/49.2); they do not contradict each other. Sonnet's top-five nationalities are correct too. Sonnet could not open the initial-language table and left Amazigh/Arabic unverified; its claim that Moroccans are "two thirds Amazigh, one third Arabic" (a 2018 interview) is **not supported** by EULP 2023, where Arabic as initial language (179.6 k) is about four times Amazigh (45.6 k) among residents aged 15+. The EULP also excludes children under 15 and counts initial language, not literacy or what a person wants to read in a game.

**Not verified by me:** Sol's France 40,232 and Brazil/Portugal counts (outside the top ten I fetched); the Aran EULP figures (23.5% / 23.4%, n = 422); Sonnet's "~10,000 residents of the Val d'Aran", the Duolingo ranking, the VilaWeb and 3Cat snippets, the "600,000 residents with another first language" dossier line. I do not rely on any of them for a decision. No source measures how many Catalan speakers use a Spanish browser, or demand for this particular game.

### 2.2 Tiers

| Tier | Languages (queue order) | Why |
| --- | --- | --- |
| 0 | `ca` | Source and identity. |
| 1 | `es`, `en` | Co-official language and the international lingua franca; the owner can read both. |
| 2 | `fr`, `it`, `ro`, `pt-BR`, `eu`, `gl`, `oc` (Occitan, Aranese standard), `de` | Latin script, no font or direction work. Local evidence (Italy, Romania), cultural neighbours (Basque, Galician, Occitan/Aranese) and reach (Brazilian Portuguese, German; German is also the layout stress test). Ship each on its own release, not as a batch. |
| 3 | `zh-Hans` and `ja` (CJK pilots), then `uk`, `ru`, `ko` | New scripts, all left to right. `zh-Hans` and `ja` come first (the owner's request). `uk` and `ru` are separate editions; neither substitutes for the other. |
| 4 | Amazigh, Punjabi, `pt-PT`, `zh-Hant`, others | Only if a community or association asks and settles variety and script. |
| Out of scope | Right-to-left languages (Arabic, Darija, Urdu, Persian) | The owner\'s decision (21 October 2026): avoid them. This removes all RTL work from the plan; the Arabic and Urdu analysis in the two source documents is not pursued. Revisit only if the owner reopens it. |

**Divergences resolved.**
- *Arabic and Urdu (RTL):* Sol and Sonnet both put them in tier 3. **Dropped** at the owner's request: no RTL languages. This also removes Moroccan Arabic/Darija from the plan; the largest local community is served by Spanish, and Amazigh/French remain tier 4 / tier 2 options.
- *Chinese and Japanese:* the owner asked for both. They lead tier 3 as CJK pilots (Sol had Japanese in the same tier as outreach, Sonnet after Chinese). Occitan is promoted from a footnote to an explicit tier-2 edition, written in Aranese.
- *Steam-based picks (ja, ko, pt-BR, de):* they are outreach hypotheses (Sol said so; Sonnet asserted them from general knowledge). Treat them as unproven.
- *Valencian/Balearic variants (Sonnet):* out of scope; revisit if someone asks.

## 3. Language selection

Effective language, in order (Sol and Sonnet agree on this core):
1. A valid, released `?lang=` for this visit. Never stored.
2. An explicit saved choice (`store`, `src/platform/storage.js`, new versioned key such as `ui-language-v1`), written only when the player picks a language or accepts the suggestion.
3. `ca`.

`navigator.languages` is never used to choose. Validation is an allowlist with explicit aliases (`es-MX` to `es`, `en-GB` to `en`); no Ukrainian to Russian, no `ar` to Darija, no arbitrary string into an import path. An unsupported `?lang=` is ignored.

**Suggestion tip (Sonnet's idea, adopted; Sol had only a passive control).** A passive control is invisible to a Spanish-only visitor who does not read "Idioma". On the first visit with no stored choice and no `?lang=`, if the first browser language is a released language other than `ca`, show **one** flat tip (colour strip, no outline) on the splash, written in the suggested language: for `es-*`, "¿Prefieres jugar en castellano?" with [Sí] and [Continuar en català]. Skip it if `ca` appears anywhere in the list. Dismissing it stores a "seen" flag. This costs a Catalan speaker with a Spanish browser one tap, once, and nobody is switched silently. No IP, timezone or `Accept-Language` logic; `/` stays one static Catalan document.
Foreign browsers (French, Japanese...) get the same tip, never an automatic switch (Sonnet's decision A, which Sol's policy also implies).

**Picker.** A language control with a drawn icon and endonyms («Català», «Castellano», «English»...), no flags, `lang`/`dir` on each label. It appears in ⚙ Configuració first, and on the splash and selector corner row only if it fits at 360 px (the owner confirmed, 21 October 2026). Unreviewed editions are not in the list (no "provisional" chip in release builds; Sonnet's chip is useful only in a development build).

**Switching (divergence).** Sol: save and reload at a safe boundary. Sonnet: live switch. I choose **reload** for phase 1. Live switching needs every owner (sheets, HUD sprite caches, title measurement, module-level constants, `themed` bases) to refresh without leftovers; that is the main bug source and gains nothing a menu-time reload does not. Never switch during a run; defer while a feedback draft is open. The reload replaces only `lang` in the URL and keeps `repte` and other parameters. Blocked storage still works for the visit through the URL.

**Document language.** `<html lang>` and `dir` reflect the displayed language; retained Catalan phrases get `lang="ca"` where practical. A tested registry maps each edition to its `Intl` locale (do not assume `Intl` supports `oc-aranes` or `ary`); never inherit the machine's locale.

**Boot.** `index.html` paints Catalan before the bundle, with an inline joke list mirrored in `src/ui/loader.js` (the boot watchdog also lives there). Keep Catalan as the no-JS fallback. A tiny inline script resolves the language (steps 1-3) before first paint and picks the cover line from a small generated payload (loading, failure, retry, language control) built from each released catalogue's `boot` namespace (Sol; Sonnet's hand-written inline dictionary would drift). Generate the Catalan joke list for both places from one source. Keep three complete jokes (1.6 s each) and the readiness gates. The watchdog allows 120 s of visible time for cold entry/locale downloads, then 20 s without progress per initialization milestone. A module's `load` event does not prove completion of its top-level await graph, even after locale readiness. If a locale chunk fails, stay in Catalan with a visible explanation and the control; a failed optional locale or font never fails boot.

## 4. Sharing, SEO and public pages

- **Challenge link.** `?repte=94-2` keeps its grammar and Mulassa-only eligibility. Never append `lang` (this reverses the earlier «only when not `ca`»): the recipient's saved choice or default decides. `stripChallenge()` still keeps a `lang` already in the visitor's address (regression test).
- **Share card** (`src/hud/share-card.js`) renders in the active language after its fonts load; freeze the locale for an in-progress render. The primary native share stays files-only; captions and links stay in the quiet message row. Its `toLocaleString('ca-ES')` calls move to the shared formatter.
- **Public pages (divergence).** Sol: `/es/projecte/` and `/en/projecte/` plus Markdown twins; Sonnet also added `/es/` and `/en/` home pages. I choose **project pages only**: a translated home would imply a translated game entry, and the game page stays one Catalan static document. Each has its own canonical, reciprocal `hreflang` (including itself and Catalan), `x-default` to the Catalan project page, a Play link to `/` (no `?lang=`), generated by `tools/deploy/seo-pages.mjs` from per-language content (never edit `dist/`). Update `sitemap.xml`, `llms.txt`, the `tools/deploy/prepare-pages.mjs` allowlist, `_headers` and `tests/build/seo.mjs`. Keep `/` canonical and Catalan; do not advertise `/?lang=en` as an indexed edition; keep the social preview Catalan. Static `/en/` game entries are a later, separate decision.
- **Turnstile.** `src/services/captcha.js:56` hardcodes `language: 'ca'`. Pass the active code, or `'auto'`, after checking which values Turnstile accepts for each edition (not verified).
- **Feedback worker.** It already returns stable error codes; keep it unchanged. Adding a `lang` field to the payload is a Worker-contract change, not part of this work (left out of the decisions list on purpose; revisit with the owner if wanted). Mail to the owner stays Catalan; submitted text is untouched.
- `manifest.webmanifest` stays Catalan. `errors.report` sends no free text; Sentry is untouched. Aliases and feedback text are never translated.

## 5. Architecture

```
src/i18n/
  messages.js     pure: tr(key, params), plural/format helpers, injectable catalogue; no DOM, network or storage
  locale.js       owner of the effective language; pickLang (pure) + approved locale/dir/Intl metadata
  load-locale.js  allowlisted lazy imports + load/failure state (kept out of tr())
  locales/ca.json (bundled), es.json, en.json ... (lazy chunks)
  meta.json       per language: endonym, dir, Intl locale, plural categories, font pack, reviewer, date
src/ui/lang-ui.js picker, suggestion tip, safe reload boundary
```

- **Keys (both agree).** Stable semantic dotted keys (`select.level.record.none`), never Catalan-as-key. One flat map per language (Sonnet) rather than deeply nested namespaces (Sol): easier to diff and to validate. Context notes (screen, placeholders, max practical length, cultural note) live in a separate metadata file, not in runtime strings.
- **Name:** `tr`, not `t`. I re-checked: `tr(` has no calls in `src/` today, while `t` is a local (`(t)`, `t =>`, `let t`) in about 177 places.
- **Messages.** Whole sentences, `{name}` parameters, no HTML. Plural values are objects with category keys and a mandatory `other` (`Intl.PluralRules`); ordinals only if they come back. Escape at the rendering boundary, use `textContent`; user aliases never reach `innerHTML`.
- **Numbers and dates.** `num()` in `src/ui/sheet-kit.js:3`, `DateTimeFormat('ca')` in `profile-notes.js`, and the `toLocaleString('ca-ES')` calls in `results.js`, `share-card.js`, `share.js`, `feedback.js` move behind one shared formatter. Display convention per edition is reviewed; Catalan keeps the thousands dot (relaxing "dots everywhere" for other editions is Decision 5).
- **Static DOM.** `data-i18n` for text and `data-i18n-attr` for attributes, applied once after the language is resolved; `index.html` keeps the Catalan inline (pre-bundle paint, crawlers, no JS), and a test asserts it equals `ca.json`.
- **Figure variants.** Replace `themed(translatedString)` (`src/game/figure-theme.js`, `src/ui/figure-theme-dom.js`) with semantic keys plus explicit per-figure variants (collapse message per figure, etc.). Keep figure input tokens as data, including the Drac's CRE/MA/CREMA exception. `aviatText()` (`src/game/figures.js:53`) chooses `surti/surtin` by regex over Catalan names: replace with locale-owned complete messages and explicit per-figure overrides; never infer grammar from a name's final letters. `inviteText`, `aviatDraft(town)` and the touch/keys/mash verbs (`Toca`/`Prem`/`Pica`) become complete per-device messages (`practice.gua.touch`/`.keys`).
- **Cost control.** `tr()` is never called per frame: callers cache the resolved string; the HUD sprite cache keeps its keys. Language changes happen at reload, so nothing is cached across locales. No dependency; adopt a mature message formatter only if grammar needs outgrow this contract.
- **Pseudo-locale (Sonnet).** `?lang=pseudo` (bracketed, ~40% longer), dev hosts only, for the balanced-layout QA before any translator touches a string. The RTL variant is dropped with RTL.

### Module limits and the concatenating harness

- `tests/build/modules.mjs` counts only `.js` (main.js ≤ 400, others ≤ 300). Catalogues are `.json` and do not count; that is data, not permission to hide code in it. `main.js` (312 lines) stays composition only. `src/ui/board-ui.js` is at **599** and `src/ui/select-ui.js` at **558**: replacing literals must not grow them. Move a multi-line template to the catalogue in the same edit, or extract a cohesive responsibility first (`mulassacat-code-simplifier`).
- `tests/render/load-main.mjs` concatenates `main.js` and its static imports into one VM script. Put `i18n/load-locale.js` (dynamic `import()`, `import.meta`) in `PROVIDED` and give the context a deterministic `tr` backed by `ca.json`; keep imports on one line and top-level names unique in modules that stay concatenated. Test `messages.js` and `locale.js` directly as ESM against the real JSON. Add a built-browser smoke test for real chunks. Do not rewrite the harness.

## 6. Fonts, canvas, direction

- Current fonts: 4 WOFF2 files (Baloo 2 and Jersey 10, Latin and Latin Extended). Sol measured 69,560 bytes; I did not re-measure. Baloo 2 does not cover Cyrillic, Arabic, Han, kana or Hangul (not verified against the files; assume so until checked). `tests/ui/privacy-fonts.mjs` requires local files only.
- **Latin editions** need nothing new. **Cyrillic:** a self-hosted OFL face (Noto Sans or a rounded match), subset. **CJK (divergence):** Sonnet's system-font stack first (`ui-rounded`, Hiragino, PingFang, Apple SD Gothic Neo, Malgun Gothic, Noto CJK): zero bytes, and a closed corpus. Sol's per-language Noto packs cost 0.3-2 MiB. I choose system fonts first and a build-time subset of a rounded OFL face only if the look is poor on Android or Windows after real-device checks. Never ship a full CJK font, never a CDN.
- Load only the selected script's fonts, with a `unicode-range` per script and `font-display: swap`. Canvas needs explicit `document.fonts.load()` with representative translated characters before warming or exporting a card; the existing `fontsArrived` reset in `src/hud/sprites.js` already clears the sprite cache and title measurement. Include font and direction in cache keys, warm the active language before a song, and keep the `SPRITES_NEW` frame budget. A timeout keeps a readable fallback and never caches missing-glyph boxes.
- Measure translated width with the loaded font, not by character count. No uppercasing of non-Latin scripts, no letter-spacing to fake Arabic/CJK, draw whole shaped runs. Review the `q * 1.7` sprite height, the Baloo baseline adjustment and `fitBubble()` (omit or shorten an optional bubble instead of shrinking text unreadably). CJK needs per-character wrapping on canvas.
- **No right-to-left editions are planned**, so `dir` stays `ltr` everywhere. Keep the principle for any future reopening: **the pad GUA | PA, the lane direction, arrows, hit targets, camera and chart never reverse**, and Drac's themed pad keeps its physical mapping. Do not spend work on logical CSS or canvas direction now.
- Budgets to measure, not promises: ≤ 10 KiB gzip of incremental locale machinery in phase 1; ~10-30 KiB gzip per text catalogue; a Cyrillic font pack roughly 50-250 KiB. Latin editions add no font.

## 7. What is translated, and how

| Class | Rule |
| --- | --- |
| Proper names: Mulassa Tap Tap Dance, Mulassa, Drac, figure/colla/entity names, towns, song titles, credits, Valls references | Never translated. Short glosses once in the help text. `figure-catalog.json` names stay source data. |
| Mechanic vocabulary GUA, PA, GUAPA!, Drac's CRE/MA/CREMA | Stay in every language and are explained in the onboarding (both analyses agree). |
| Other game words (GLOBUS, MANTÉN, RATXA, ÀNIM, ENCERTS, A BALLAR!, judge words) | **Always translated** (21 October 2026): only GUA, PA, GUAPA! and CRE/MA/CREMA stay Catalan. No Catalan gloss on first use. Keep the compact fixed-width judge slot in mind (check German/Russian). |
| Cultural terms (seguici, bestiari, colla, fira, castells, calçots) | Keep the Catalan word with a short gloss; never replace with a foreign equivalent. |
| Loader jokes, crowd bubbles | Transcreation (not literal translation) with the Catalan context, per locale (own list; at least three complete jokes). Stable joke IDs; never persist translated text as identity. Valls names stay and are not explained in the HUD. |
| Privadesa | Translated in every shipped language; Catalan is the reference text; a legal check of the Spanish and English versions is Decision 6 (neither analysis can judge it). |
| Aliases, feedback text, music | Untouched. |

Translations are drafted by the LLM the owner chose (gpt 6 astra) from the Catalan source with a short English context gloss, not through an English relay. **The owner\'s decision (21 October 2026): no per-language native reviewer.** The pipeline compensates with what code can check: key, placeholder and plural parity, glossary tokens untouched, length limits and the pseudo-locale layout pass, and the owner reads `es` and `en`. Humour, loader jokes and crowd bubbles get their own prompt with the tone brief and a per-joke intent note. Residual risk, accepted by the owner: idiom and tone errors in languages nobody here reads (Occitan/Aranese, Basque, Japanese, Chinese above all) cannot be detected by tests. I could not verify the model's quality in those languages; if a native speaker ever reports problems, fixing the catalogue is a one-file PR. Tone brief for every run: informal, warm, a little silly, short sentences.

**Ownership.** Each edition's `meta.json` records the generating model, the date and the Catalan source revision, plus `reviewedBy` only if someone actually reviewed it. Contributions by native speakers are welcome as catalogue PRs but are not a release gate. No automated translation PR merges without `npm run check` green.

## 8. Tests and acceptance (for the implementation phases)

1. **Catalan parity:** captures and text inventory identical to HEAD for first paint, loader, failures, pending/playable figures, both selector steps, practice, play, collapse, results, free mode, every sheet and sharing. Storage keys, difficulty numbers, challenge parsing, scoring, timings and `shasum public/music/*` unchanged.
2. **`tests/ui/i18n.mjs`:** released locales have exactly the Catalan key set; placeholders match in every branch; required plural categories per `Intl.PluralRules`; `index.html` inline Catalan equals `ca.json`; glossary tokens intact; no key name or `undefined` on screen.
3. **No stray Catalan:** a scan of `src/**/*.js`, `index.html`, CSS `content` and generators for string/template literals and text nodes outside the catalogues, with a small reasoned allowlist (`i18n-ok`). Run it in report mode in Phase 0, then make it failing; prove it by adding an intentional stray string once and removing it.
4. **Preference matrix:** URL over saved, URL not persisting, invalid tags, blocked storage, Spanish-only and Catalan-secondary browsers, no match, challenge links, reload after selection, locale fetch failure, rapid choices.
5. **Layout and accessibility:** pseudo-locale (bracketed, longer) first; then the viewport set from AGENTS.md (320×568, 375×667, 393×852, 430×932, 1024×768, 1280×800, wide-short, large desktop; no landscape phones or portrait tablets, which show the rotate cover) with the longest strings; `?mute`; keyboard, pointer, touch and spoken language checked.
6. **Canvas, fonts, performance:** real glyph coverage on Safari/iOS and Chromium, CJK wrapping, share-card export after fonts, pad mapping unchanged in every locale, no catalogue lookup or fetch in the frame loop, `?perf` on the results screen per new script.
7. **Packaging and SEO:** `npm run check`, `npm run build:pages`, one chunk per locale and no eager download of all catalogues or fonts, `hreflang` reciprocity, real 404s.
8. **Human approval** recorded per edition.

## 9. Phases, effort and Fase 0

Estimates are focused person-days, not calendar time. I use Sol's higher estimates: Sonnet's 4-5 days of code for phase 1 leaves out boot, figure variants, share and SEO work that Sol itemised.

| Phase | Deliverable | Effort |
| --- | --- | --- |
| 0 | Verbatim Catalan catalogue and context map, unused. | 3-5 dev + 1-2 editorial |
| 1 | Wire `ca` + `es` + `en`, picker and tip, lazy loading, figure variants, fonts/caches, sharing, project pages. | 12-20 dev + 1-2 Catalan editorial days; LLM translation per added language is about 0.5-1 day |
| 2 | Tier 2, one or two languages per release. | 0.5-1.5 dev/QA + ~0.5-1 LLM translation day each; +2-4 shared dev days |
| 3 | `zh-Hans` and `ja` pilots 3-6 dev each; then 1-3 dev per Cyrillic/Korean edition. | plus ~1 LLM translation day each |
| 4 | Amazigh/Punjabi only if a community appears; decide variety and script first. | not estimated |

Phase 0 + 1 is about 15-25 developer days plus editorial work. No dates are promised.

### Fase 0: concrete steps (no visible change)

1. Re-read AGENTS.md "Implementation quality" and the `mulassacat-code-simplifier` skill; record a baseline before touching anything: `npm run check`, `shasum public/music/*`, captures of every surface at the nine viewports (`?mute`), and bundle size.
2. Inventory every owner of visible copy: `index.html` (text nodes, `aria-label`/`title`/`placeholder`/`alt`, JSON-LD, `sr-only` summary, inline loader jokes and failure text), `src/ui/*`, `src/hud/*`, `src/game/` (`practice.js` `STEPS`, `state.js` judge words, `bubble-rules.js`, `chart.js` `DIFFS`, `figures.js`, `figure-theme.js`), `src/services/*`, `tools/deploy/seo-pages.mjs`, `public/*`, `404.html`. Produce the real string and word counts (both analyses only estimated ~700-1000 strings).
3. Create `src/i18n/messages.js`, `locale.js` (resolver only, always returns `ca`), `locales/ca.json` and `meta.json`, with unit tests as ESM. Add `load-locale.js` to `PROVIDED` in `tests/render/load-main.mjs` with a `ca.json`-backed `tr` in the test context.
4. Extract strings **per owner, in batches**, replacing each literal with `tr('key')` and keeping the text byte-identical; run `npm run check` after each batch. Start with data-like owners (`LOADING_JOKES`, bubble lists, judge words, `STEPS`, `DIFFS`), then services, then `src/ui` and `src/hud`, then `index.html` with `data-i18n`. Keep `board-ui.js` (599) and `select-ui.js` (558) from growing: move strings out in the same edit and extract a responsibility first if needed.
5. Replace `themed()` and `aviatText()` regex logic with explicit keys and variants, keeping the rendered Catalan identical (add tests for Mulassa and Drac).
6. Route number and date formatting through one formatter locked to `ca` (`sheet-kit.js`, `profile-notes.js`, `results.js`, `share-card.js`, `share.js`, `feedback.js`).
7. Generate the Catalan joke list and boot strings for `index.html` and `loader.js` from one source.
8. Add `tests/ui/i18n.mjs`: key/placeholder checks, `index.html` equals `ca.json`, and the stray-Catalan scan in report mode.
9. Verify: `npm run check` green; captures identical to the baseline; `shasum public/music/*` unchanged; no module over 600 lines (main.js ≤ 400); bundle-size delta reported. Do not commit or publish without the owner's confirmation.

### Fase 1: ca + es + en (after Fase 0 is merged)

1. `locale.js` resolver: `?lang=` over saved choice over `ca`; allowlist and aliases; `store` key `ui-language-v1`; pure tests for the preference matrix.
2. `load-locale.js` with allowlisted lazy imports and a failure path that stays in Catalan; Vite chunk check in a built-browser smoke test.
3. Generate `es.json` and `en.json` with the LLM from `ca.json` + context notes; run `tests/ui/i18n.mjs` in failing mode; the owner reads both.
4. `lang-ui.js`: picker in ⚙ Configuració (endonyms, no flags), corner-row button only if it fits at 360 px, the one-time suggestion tip; safe reload that keeps `repte` and other parameters, deferred during a run or an open feedback draft.
5. Inline boot script and generated boot payload: `<html lang>`, the cover line and the first loader jokes in the chosen language, no flash of Catalan; Turnstile `language`.
6. Sharing: the challenge link never carries `lang`, `stripChallenge()` keeps a visitor's own, share card in the active language after fonts load.
7. Per-locale number/date formatter; per-figure variants for Mulassa and Drac in both languages.
8. `tools/deploy/seo-pages.mjs` emits `/es/projecte/` and `/en/projecte/` with Markdown twins, `hreflang`, sitemap, `llms.txt`, allowlist and `tests/build/seo.mjs`.
9. QA: Catalan parity, pseudo-locale and longest-string captures at the nine viewports, `?perf` baseline comparison, `npm run check`, `npm run build:pages`.

### Fase 2: tier 2 (one or two languages per release)

For each of `fr`, `it`, `ro`, `pt-BR`, `eu`, `gl`, `oc`, `de`: generate the catalogue and run the parity tests; capture the longest sheets and judge words (German first as the stress test); add the `Intl` locale mapping (check `oc` support and the Turnstile code); add the project pages; release the edition on its own. Contributor guide and glossary (`docs/translating.md`) are written here.

### Fase 3: CJK, then Cyrillic and Korean

`zh-Hans` and `ja` first: system-font stack, per-character canvas wrapping, glyph and baseline checks on iOS Safari and Android Chrome, share-card export, and `?perf` on the results screen. Then `uk`, `ru` (self-hosted Cyrillic face, subset, loaded only for those editions) and `ko`. Each language remains a separate release.

## 10. Decisions

1. **Policy (answered: approved).** Catalan first, never an automatic switch, one suggestion tip. The language can also be changed from ⚙ Configuració, and the picker shows endonyms only, no flags.
2. **First release (answered: approved).** `ca` + `es` + `en`, each reviewed by the owner (and a Catalan-context reader for `en`). Tier 2 includes Occitan; tier 3 starts with Chinese and Japanese; no right-to-left languages. Tier 2 starts only after phase 1 costs are known.
4. **Picker placement (answered).** ⚙ Configuració always, plus a button in the corner row only if it fits at 360 px.
4. **Picker placement (open).** ⚙ Configuració always; splash/selector corner row only if it fits at 360 px. *Default: ⚙ first.*
5. **Number format (answered).** Each edition uses its own convention (Catalan keeps the thousands dot); this relaxes the current "dots everywhere" rule for non-Catalan editions.
6. **Privadesa and reviewers (answered).** Privadesa is translated in every shipped language with Catalan as the reference text, with **no legal review** and no native-reviewer gate. Risk noted once: the privacy notice should be intelligible to the person receiving it, and an unreviewed machine translation of it is the weakest spot; revisit if the game gains users in a language you cannot read.

## 11. Risks and unchecked items

- Estimates are judgement; the string counts must come from Phase 0.
- Boot races, stale caches, harness coupling and clipped layouts are the main technical risks. With no native review, translation quality in the less common languages is unverified (section 7).
- Not verified: Turnstile language codes (including Occitan), font licences and glyph coverage, current Vite 7 chunk output for dynamic JSON imports, Cloudflare Pages behaviour for nested language folders, Aranese/Duolingo/Val d'Aran figures.
- I did not run the game, tests or a browser, and did not touch the other two worktrees.
