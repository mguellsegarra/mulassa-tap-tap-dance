// When the woken app may reload for a new deploy (services/update.js). Pure: tests/update.mjs.
export const quietMoment = (state, doc) => ['splash', 'title', 'select'].includes(state) && !doc.querySelector('dialog[open], input:focus, textarea:focus');
// A different build, and not one a reload was already tried for (a CDN still serving the old page must not loop).
export const shouldReload = (deployed, own, tried) => Boolean(deployed) && deployed !== own && deployed !== tried;
