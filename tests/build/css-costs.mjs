// CSS patterns measured to block phones (docs/agents/graphics.md, «DOM blocking costs»): a new one must be measured on the
// reference Android before it lands (AGENTS.md, Process), and the numbers below change only with that measurement.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const sheets = readdirSync(new URL('src/styles/', root)).filter(f => f.endsWith('.css')).map(f => read(`src/styles/${f}`));
const inline = read('index.html').match(/<style[^>]*>[^]*?<\/style>/g) ?? [];
const css = [...sheets, ...inline].join('\n').replace(/\/\*[^]*?\*\//g, '');

// Container queries only on single elements: one container per card or row (50-84 of them) made every sheet opening
// ~300-500 ms on a Galaxy S10. A list's sizes come from a ResizeObserver (select-layout.js).
const CONTAINERS = new Set(['#stats-notice-menu .notice-ribbon', '.sel-pending', '.sel-info', '.sel-standings', 'div.mula-load']);
for (const [, selector, type] of css.matchAll(/([^{}]+)\{[^}]*container-type\s*:\s*([a-z-]+)/g)) {
  if (type === 'normal') continue;
  assert(CONTAINERS.has(selector.trim()), `container-type: ${type} on «${selector.trim()}»: a query container is laid out on its own on every restyle; never on a list's items (measure it, docs/agents/graphics.md)`);
}
assert(!/\dcq[hwib]\b/.test(read('src/styles/select-cards.css').replace(/\/\*[^]*?\*\//g, '')), 'the cards size from --por-w/--por-h, not container units');

// :has() re-runs on DOM changes it may depend on ([hidden], classes), even with its subject shut: 18 of them cost ~55 ms
// a figure change. A ratchet: lower it when one goes; raising it needs the new rule's cost measured on the device.
const HAS = 63; // 63: #install-steps-menu:has(> .ios-bubble…) (1.2.11), a direct child of one sheet: no cost on the S10 (2026-11-03)
const has = (css.match(/:has\(/g) ?? []).length;
assert(has <= HAS, `${has} :has() selectors (was ${HAS}): measure the new one's cost on the device first (docs/agents/graphics.md), or set the owner's own attribute instead`);
assert(!/:has\([^)]*:not\(\[hidden\]\)\)[^{]*\{/.test(read('src/styles/feedback.css').replace(/\/\*[^]*?\*\//g, '')), 'the feedback sheet reads its own flags, not :has() over [hidden]');

// The selector's town arms are drawn once to bitmaps (escutBitmaps): 33 inline vectors cost ~300 ms of first GPU raster.
assert.match(read('src/ui/select-ui.js'), /escutBitmaps\(towns, win\)/, 'the pills\' arms become bitmaps before the selector first shows');
console.log(`css costs: query containers on single elements only, ${has} :has() (ratchet ${HAS}), arms as bitmaps ok`);
