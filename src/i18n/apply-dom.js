// Static DOM: index.html keeps its Catalan inline (pre-bundle paint, crawlers, no JS) and marks each string `data-i18n="key"`
// (text), `data-i18n-attr="attr:key;attr2:key2"` or `data-i18n-rich="key"` (text with inline markup). Applied once after the language
// is resolved; a test keeps the markup equal to ca.
// An element with child elements (an icon, a .sub line) has its first non-blank text node replaced, so the siblings stay.
// Rich messages are a closed micro-language (RICH below), parsed by our own scanner into nodes: the catalogue never reaches innerHTML,
// anything else (other tags, unknown attributes, bad links) is dropped or shown as plain text.
import { tr } from './messages.js';

const blank = n => n.nodeType === 3 && !n.nodeValue.trim();

// tag -> attribute -> allowed value (a regex, or null for a bare flag)
const RICH = {
  b: { 'data-fig': null }, i: {}, br: {},
  a: { href: /^(?:mailto:|https:|#)[^\s"<>]*$/, target: /^_blank$/, rel: /^noopener(?: noreferrer)?$/, 'data-privacy-open': null },
};
const TAG = /<(\/?)([a-z]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*>/g;
const ATTR = /\s+([a-z-]+)(?:="([^"]*)")?/g;

// text + tags -> { kids: [string | { name, attrs, kids }] }
export function parseRich(src) {
  const root = { kids: [] }, stack = [root];
  let at = 0;
  for (const m of src.matchAll(TAG)) {
    const [all, close, name, rest] = m, spec = Object.hasOwn(RICH, name) ? RICH[name] : undefined, top = stack.at(-1);
    if (!spec || (close && top.name !== name)) continue; // not ours: stays text
    if (m.index > at) top.kids.push(src.slice(at, m.index));
    at = m.index + all.length;
    if (close) { stack.pop(); continue; }
    const attrs = {};
    for (const [, k, v = ''] of rest.matchAll(ATTR)) if (Object.hasOwn(spec, k) && (spec[k] ? spec[k].test(v) : v === '')) attrs[k] = v;
    const node = { name, attrs, kids: [] };
    top.kids.push(node);
    if (name !== 'br') stack.push(node);
  }
  if (at < src.length) stack.at(-1).kids.push(src.slice(at));
  return root;
}

const open = n => `<${n.name}${Object.entries(n.attrs).map(([k, v]) => (RICH[n.name][k] ? ` ${k}="${v}"` : ` ${k}`)).join('')}>`;
const walk = (kids, out) => kids.forEach(k => {
  if (typeof k === 'string') return out.push(k);
  out.push(open(k));
  if (k.name !== 'br') { walk(k.kids, out); out.push(`</${k.name}>`); }
});
// the canonical markup of a message: equal to the source only when nothing was dropped
export const richHtml = src => { const out = []; walk(parseRich(src).kids, out); return out.join(''); };
// the tags a message uses, sorted: every language must use the same ones (hrefs included) for a key
export const richTags = src => richHtml(src).match(/<[^>]+>/g)?.sort() ?? [];

// strings and elements, for replaceChildren
export function renderRich(doc, src) {
  const build = kids => kids.map(k => {
    if (typeof k === 'string') return k;
    const el = doc.createElement(k.name);
    for (const [a, v] of Object.entries(k.attrs)) el.setAttribute(a, v);
    if (k.name !== 'br') el.append(...build(k.kids));
    return el;
  });
  return build(parseRich(src).kids);
}

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const text = tr(el.getAttribute('data-i18n'));
    if (!el.children.length) { if (el.textContent !== text) el.textContent = text; continue; }
    const node = [...el.childNodes].find(n => n.nodeType === 3 && !blank(n));
    if (node) node.nodeValue = node.nodeValue.replace(/\S(?:[\s\S]*\S)?/, () => text);
  }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
      const at = pair.indexOf(':'), value = tr(pair.slice(at + 1));
      if (el.getAttribute(pair.slice(0, at)) !== value) el.setAttribute(pair.slice(0, at), value);
    }
  }
  for (const el of root.querySelectorAll('[data-i18n-rich]')) el.replaceChildren(...renderRich(el.ownerDocument, tr(el.getAttribute('data-i18n-rich'))));
  for (const t of root.querySelectorAll('template')) applyI18n(t.content); // Privadesa lives in one until it is opened
}
