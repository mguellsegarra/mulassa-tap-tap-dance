# UI conventions

- **Selector** (the main menu: cards and town pills, the two steps, the info column and standings card, the showreel and its camera, the idle screen, the corner row, the logo): the full rules are in `docs/ui/selector.md`. Read it before changing `ui/select-*.js`, `game/showreel.js`, the menu framing in `scene/cameras.js` or `styles/select*.css`.
- Hide disabled action buttons instead of showing a dimmed unavailable action. Preserve their layout space when removing it would shift nearby controls. Exception: the paired carousel arrows remain visible but dimmed and natively disabled at either end; hide the whole capsule only when navigation is unnecessary.
- **Balanced layout (every card, sheet and screen).** Mandatory for every UI change: `.agents/skills/uipolish/SKILL.md` (the rules, the measurement loop and the viewport matrix).

- All copy in Catalan, no English ("Practice", "OK", "Settings"…). Watch false friends and apostrophes (’).
- Tap verbs: «Toca» for the touch screen, «Prem» for keys, «Pica» only for GLOBUS mashing; split by device (`.touch`/`.keys`,
  `COARSE`) or use a neutral verb («Marca»). Links in running text (mailtos): cream `#fff3d6`, underlined (never GUA orange).
- **Colour roles** (one job each): solid gold `#f5c518` = the one primary action of a view; gold outline = every other button,
  round icon buttons and the sheets' frame; solid cream `#fff3d6` with dark text = what is selected (town pills, level and
  view segments; a cream ring on the selected card), unselected choices get a neutral `#e8d8b880` edge; information chips on a card (a pending figure's entity) are dark with cream text, never a cream fill; the one exception is the entity chip (pending card and the playable info block share the same pastel holo pill with dark text, `.sel-entity` in select-pending.css); gold as text only for
  brand and celebration (titles, GUAPA); GUA orange / PA turquoise only for the two drums and what literally means left/right;
  errors `#ff8a7a`. Round icon buttons: 44 or 56 px, 2 px gold edge, dark fill, cream glyph (`.sheet-x` too); #pause stays
  bigger on purpose (a game control), and free play's touch moves are arcade buttons on purpose, one colour per move
  (red Q, green E, blue R, gold jump; `#photo-touch .ps-btn`). Every target is >= 44 px (`.btn-link` gets an invisible slop).
- The difficulty buttons carry one colour per level, a deliberate exception to the colour roles: a warm glow from their bottom edge (gold, orange, red) and, on the chosen one, a turning ring over its own edge (green and lime FÀCIL, gold and amber NORMAL, red and lilac DIFÍCIL). Selected stays cream.
- The level words carry the same per-level colour, another approved exception: wherever FÀCIL / NORMAL / DIFÍCIL is written as text on a dark ground (the desktop medals' labels, step 2's level row, the publish prompt's run line, the Saló de la fama's levels) the word is painted `--lvl0/1/2` (`.lvt0/1/2`, base.css; the board pills' fill `.lvl0/1/2` uses the same properties; the share image repeats the hexes). Never on cream (selected keeps dark text); the difficulty buttons keep their own glow design.
- **Online sheets** (the publish prompt, Classificació, Turnstile, names and profiles, Perfil, seasons and the Saló de la fama): `docs/rankings/ui.md`; the decisions behind them are in `docs/rankings/strategy.md`.
- **Buttons: use the `.btn` component** (in `index.html`), never one-off button styles:
  `.btn` + `.btn-primary` (filled gold, one per sheet) / `.btn-secondary` (outlined) / `.btn-link` (plain underlined
  text, minor actions; `.btn-small` for tiny ones). Optional `<svg>` icon goes first: fixed 22 px slot on the left,
  vertically centred. **Icon left, text centred**: padding reserves the slot on both sides. Optional subtitle:
  `<span class="sub">`. Stack them in `.sheet-actions`. Min height 48 px (44 on landscape phones).
  `.btn-compact` (with `.btn-link`): a quiet icon + label text link, no outline, clearly lesser than the sheet's buttons
  but still a 44 px target (padding) (the share sheet's WhatsApp · X · Altres); never for a sheet's main action.
- Language in addresses: the choice lives in `localStorage` (`ui-language-v1`); switching never puts `?lang=` in the address, the challenge link (`challengeUrl`) and the Play button of `/<codi>/projecte/` (`/`) never carry it. `stripChallenge()` keeps a `lang` already in a visitor's URL, and the resolver still accepts a manual `?lang=xx` for that visit (tests, `?lang=pseudo` on dev hosts).
- Share sheet: the primary shares **the image alone** (`navigator.share({ files })`, no title/text/url: with them iOS
  hides «Desa la imatge» and targets swap or mangle it) or saves it; the caption + challenge link go only through the
  quiet «O envia el missatge:» row (WhatsApp · X · Altres/Copia).
- Exception: the language suggestion/notice (`#lang-tip`, `#lang-notice`, `ui/lang-ui.js`) is a rounded modal-style card (sheet frame: 2 px gold, 18 px radius, `#2a1a10`, Baloo 2), not a flat strip: it asks a question with buttons.
- Only real buttons look like buttons (outline + rounded). Tips, notes and labels are **flat with a coloured strip**
  on the left, no outline (`tipChip()` on canvas, `.sync-how`, practice instruction).
- Canvas buttons (`drawButton`, results button) follow the same look: dark fill, gold outline, centred text.
- Focus rings only for keyboard (`:focus-visible`; sheets focus themselves when opened by touch/mouse).
- One headline word at a time (`headline()` priority system).
- Crowd bubbles appear only in musical rests (`src/game/bubble-rules.js`): previous event/tail ended ≥ 0.4 s ago,
  next note ≥ 2.2 s away, no active hold/balloon/GUAPA pair. Every difficulty permits one bubble / 8 s, lasting
  2 s; clear it with < 0.2 s until the next note. Hushed while struggling, practising, paused or before the first note.
  Misses react through the mulassa's animation (the crowd only settles); energy warning thresholds pulse the meter. Collapse has its own delayed caption.
  `placeBubble()` keeps speech inside the safe stage shared with the camera (`playStage()`).
- During the song, judgements use compact fixed PERFECTE / BÉ / ERROR text. Only actionable details remain.
  Practice transition praise shares the compact judge slot, with instructions above the pad; never reserve
  a large headline region for its camera. Large headlines belong to the post-song celebration (and the practice's combo praise and «A BALLAR!»); combo/miss/special
  events keep their sound and visual effects without extra headlines. Normal play reserves only compact feedback space.
- Layout: HUD at the top, note lane right under it, the mulassa big in the middle, pad = full-width GUA | PA halves
  at the bottom. Nothing overlaps the lane or the HUD.
- Respect safe areas (notch, home indicator: `env(safe-area-inset-*)`, `SAFE`), iOS standalone full height (`--app-h`).
  The home-screen app has an opaque status bar (`apple-mobile-web-app-status-bar-style` = `black`): the translucent one gets iOS's own blur over the top ~85 pt
  of the page (no CSS turns it off), so the page starts below the bar (no top inset, `innerHeight` is the visible height; `appHeight()` only overrides it for an old translucent icon). Nothing paints over the safe areas.
- No emoji-dependent icons: draw them (SVG / canvas). `color-scheme: light only`.
- **Loading = the animated Mulassa (running portadors, scrolling ground)** (`src/ui/loader.js`, CSS next to `#loader` in index.html). `#loader.page` is plain
  HTML/CSS that paints before the bundle ("Avisant la brigada…"), released after readiness (`loader.ready()`) and the complete loading lines below,
  with a 20 s safety timeout (visible time: slow phones in Low Power Mode needed more than 12); later waits use `loader.wait(text)` → `loader.done(handle)`: a flat card (gold strip),
  shown only past 300 ms, `role="status"`, `pointer-events: none`. For a sheet's own "Carregant…" line use
  `mulaSpinner()` (a `<span class="mula-spinner">`, 1em); pass `{ mini: true }` as its second argument for the head at small sizes. Reduced motion holds the rest pose. The full SVG
  lives twice, identical (`MULASSA_SVG` and index.html; tests/ui/loader.mjs checks): swap both together. The error card reuses the same artwork and size with a slow breath, a small head movement and falling tears; reduced motion keeps a static sad pose.
  Show at least three complete loading jokes (1.6 s each). Once the game is ready and the minimum is met, finish the current line before lifting the cover. The 20 s safety timeout remains a hard bound. Copy is short
  Catalan with "…". Audio (suspended context) downloads/decodes while the shaders compile, before the first frame, never on the tap;
  the cover lifts only once the queued `warmups` are painted (one a frame under it, at most `COVER_WARM` 1.5 s more).
- **Free play** (one figure driven, its keys, the touch stick and look, the radio): `docs/ui/free-play.md`.
- On/off settings: `.switch-row` (index.html), a native checkbox with `role="switch"` in a flat labelled row, never a
  fake toggle button.
- Two-way views (Història (9:16) · Publicació (4:5) on the share sheet): a segmented group (`.share-seg` / `.board-seg`, same rules) of
  `.btn.btn-secondary` with `aria-pressed`; the pressed one is cream.
- Privadesa (`#privacy-menu`): one sheet, one `<section data-privacy="…">` per service; open it from any button with
  `data-privacy-open`. Never add a Cloudflare analytics snippet (Pages injects it). Fonts are local (`public/fonts/`, OFL kept).
- Crash reports (Sentry, errors only): `src/services/errors.js` (gating, scrubbing, early buffer; `errors.report(kind, tags)` for
  failures shown in the UI, never aliases or free text) + lazy `src/services/sentry-load.js`. Needs `VITE_SENTRY_DSN`; off in tests,
  webdriver, `?autoplay`/`?from`/`?view` and on dev hosts. `?sentry-test` (localhost only) turns it on as 'development'
  and adds `window.__sentryTest()`. No replay/tracing/sessions; privacy text in `data-privacy="errors"`.

- Fullscreen: page fullscreen only in free play, on Android touch devices and on desktop, inside a real tap or key (`photoOrient`, `src/ui/fullscreen.js`): in on entering it (on Android the next tap goes back in if the player leaves it; on desktop an Escape leaves it windowed, since a click orbits), out on leaving it; free play's way in and out runs under a short dark curtain (`src/ui/curtain.js`) that lifts once frames run smooth, as the switch and the fullscreen change stall a few frames; the menus and the game never ask; never on iPhone/iPad (iPad Safari element fullscreen swallowed touches) — an upright iPhone asks to turn before entering free play (`#free-hint-menu`, `free-gate.js`), and in Safari (not the home-screen app) that sheet adds the «Juga a pantalla completa» tip.
- Device tips (`src/ui/device-hint.js`): small modal sheets (icon, title, text, «D’acord», round `.sheet-x`), once ever: closing either way stores `gpu-hint` = `off`. Only «Acceleració per maquinari», when WebGL runs on a software renderer (`softwareGl`). Told only by the greeting's queue at an idle selector, after the end-of-season sheet and the statistics notice (offline too: they need no network).
- Battery-saving hint (`src/ui/lowpower-hint.js`): before starting from the difficulty picker, asks «La Mulassa va a mig gas» when `pace.lowPower` suggests a 30 Hz cap. «Continua» starts the original song flow; «Enrere», × and Escape keep the selected difficulty. No opt-out is stored: the cadence is checked at each start.
