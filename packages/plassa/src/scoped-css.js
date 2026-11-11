// Another page's stylesheet, confined to some of this page's elements: every rule only reaches what sits inside `scope`. A
// game borrows mulassa.cat's sheets (its <dialog>s and their CSS); that CSS also names the game's own #music or #board-menu,
// which it must never touch. Specificity stays as written (:where), so inside the scope it still beats the base as at home.
// A selector that cannot be confined is dropped, never left loose. Plain text in, a <style> at the end of <head> out.
const within = scope => `:where(${scope}, ${scope} *)`;

// a selector list's top-level parts («a, :is(b, c)» is two)
function parts(list) {
  const out = [];
  let depth = 0, from = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(list.slice(from, i).trim()); from = i + 1; }
  }
  return [...out, list.slice(from).trim()];
}
// the subject inside the scope: before its pseudo-element (always last), else at the end; :root rules (custom properties) stay
export const confine = (selector, scope) => parts(selector).map(s => {
  if (/^:root\b/.test(s)) return s;
  const pe = s.indexOf('::');
  return pe < 0 ? s + within(scope) : s.slice(0, pe) + within(scope) + s.slice(pe);
}).join(', ');

export function adoptWithin(cssText, scope, doc = document) {
  const style = doc.createElement('style');
  style.media = 'not all'; // parsed, not applied, until every rule is confined
  style.textContent = cssText;
  doc.head.append(style);
  const walk = rules => {
    for (let i = rules.length - 1; i >= 0; i--) {
      const r = rules[i];
      if (r.selectorText != null) {
        const before = r.selectorText, want = confine(before, scope);
        if (want === before) continue; // :root only
        r.selectorText = want;
        if (r.selectorText === before) (r.parentRule ?? r.parentStyleSheet).deleteRule(i); // the browser refused it: dropped
      } else if (r.cssRules && !(r instanceof CSSKeyframesRule)) walk(r.cssRules); // @media, @supports
    }
  };
  walk(style.sheet.cssRules);
  style.removeAttribute('media');
  return style;
}
