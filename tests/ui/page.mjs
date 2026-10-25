// index.html as the browser ends up with it: the linked stylesheets (src/styles/*.css) put back inline, so the tests that
// look for CSS rules or markup in "the page" read one text.
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
export const readPage = () => readFileSync(new URL('index.html', root), 'utf8')
  .replace(/<link rel="stylesheet" href="\/(src\/styles\/[a-z-]+\.css)">/g, (_, path) => `<style>\n${readFileSync(new URL(path, root), 'utf8')}</style>`);
// the selector's stylesheets (select.css, select-cards.css...) as one text, in the order index.html links them
export const selectCss = () => [...readFileSync(new URL('index.html', root), 'utf8').matchAll(/href="\/(src\/styles\/select[a-z-]*\.css)"/g)]
  .map(([, path]) => readFileSync(new URL(path, root), 'utf8')).join('\n');
