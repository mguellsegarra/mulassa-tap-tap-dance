# i18n progress (orchestrator state, untracked)
Branch t3/i18n-phase0, nothing committed. Music shasum baseline: /tmp/i18n-music.sha (5 mp3).
## Fase 0: DONE (check green, music same, 818 ca keys: ui356 html150 figures129 hud62 services55 game44 boot22). Residue scan: 37 literals (report only).
Known gaps carried to Fase 1: privacy + marked-up paragraphs in index.html (~1390 words) not extracted; ~50 index.html elements without data-i18n (tests pin exact labels); 37 residue literals; SEO/public/404 inventory in docs/i18n-phase0-inventory.md.
## Fase 1 plan
a) research Turnstile/Intl oc/fonts -> section below
b) W2 lang-ui, W3 share+format+meta.json, W4 seo pages (tools/seo-content/<code>.json) in parallel; W1 resolver/boot/index.html (+captcha) ; then W5 rich-text html extraction (after W1), W6 residues
c) es,en translations (astra) ; d) review
## Log
- Fase1 (a) research DONE (docs/i18n-research.md). Launched W1 resolver/boot/captcha, W2 lang-ui, W3 share+format+meta.json, W4 seo pages. Next: W5 rich html (after W1), W6 residues, then es/en (astra), review.
- W1,W2,W4 done; ca Turnstile kept 'ca' (my fix). W3,W5 running.
- W3 files done (summary pending), W5 (rich html) and W6 (residues, fail mode) running. After: es/en astra translators (catalogs ca ns: hud game ui services html boot figures + tools/seo-content), meta.json endonym es=Español (strategy says Castellano: minor).
- tr es/en (astra) + W7 fonts/canvas (sonnet) running. Next: launch Fase2 (fr it ro pt-BR eu gl oc de) then Fase3 (zh-Hans ja uk ru ko) translators w/ /tmp/i18n-translate.md; then integrate: LOADERS, gen-boot, endonym es Castellano, length test, build:pages, review.
- All 15 translators + W7 launched (es en fr it ro pt-BR eu gl oc de zh-Hans ja ko uk ru). Integration pending: LOADERS+released flags+gen-boot (script after index.js exist), length test, endonym es.
- Integrated: LOADERS+released(15)+es Castellano; fixed tests i18n/seo (16 langs), seo codes regex for pt-BR/zh-Hans. Next: full check, W7 status, length test, review, build:pages.
- Marc 2026-10-21: language picker replaces the Classificacions button in settings (removed #settings-board, key html.settingsBoardSub, listener, css, tests, AGENTS.md).
- Final stage: check green, build:pages ok, music same. main chunk 1375780 B (phase0 1351740). Remaining: independent review (sonnet) + report.
- Review found: boot watchdog killed non-ca langs (fixed: __mulassaLocaleReady in preload + index.html), lang-ui pending cancel, apply-dom hasOwn fixed; oc leakage fix by astra running; then browser verification + final check.
- FINAL: check 0, pages 0, music same, browser verify ok (ca es ja uk de oc). Nothing committed.
- 21:10 Marc: scheduled task 00:00 (id scheduled-task:0431cc5a-...) to integrate into t3-b0a52b07 (branch t3/character-select-v1-2-0) via git merge-file 3-way, backup first, no commits. UI polish in progress: H1 harness+findings (docs/i18n-ui-inventory/), then fix workers, then PDF. Risk-fixes worker (chunk notice + share card wrap) running. Marc said: NO commit yet.
- 21:15 scheduled prompt extended: after integration+PDF, launch NEW T3 chat (video inventory + CLS + uipolish + before/after PDF) in t3-b0a52b07 (Marc authorized).
- 23:33 H1 done (648 shots, 588 findings: 383 high mostly <44px targets). risk-fixes done (chunk notice, share-card wrap). pseudo boot watchdog fixed (__mulassaLocalePending in boot-lang script).
- UI POLISH NOT STABLE YET: F1 (Opus medium) triaging A/B/C and fixing group A; output docs/i18n-ui-inventory/fixes.md. After F1: rerun check, build PDF (docs/i18n-ui-inventory/inventari.pdf: scenes/codes/viewports/langs + findings + fixes), then declare STABLE here. Midnight job integrates only when STABLE.
- 00:10 midnight timer fired + deleted (step 0 done). Integration steps 1-7 executed manually by orchestrator once F1 (UI fixes) and P1 (PDF tool) are done and check is green.
- 01:20 STABLE: F1 done (high 383->71, rest preexisting B), check green, music same, PDF regenerated (14.9MB). Next: integrate into t3-b0a52b07.
- 01:25 integration worker (Sonnet) running on t3-b0a52b07; backups /tmp/cs-backup-20261022*. Then: translate newkeys (astra x15), recheck at target, regen PDF there, launch video-inventory thread.
- Marc 2026-10-22: no `&lang=` on prod URLs: challenge link and the Play button of /<code>/projecte/ drop it (share.js, seo-pages.mjs, tests/share.mjs, tests/seo.mjs, strategy/README/AGENTS updated); resolver still accepts a manual ?lang=.
