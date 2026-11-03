import { BASE, RECIPES } from '../../../src/jocs/games/alquimia/recipes.js';
import { COPY } from '../../../src/jocs/games/alquimia/copy.js';
import { SOURCES } from '../../../src/jocs/games/alquimia/sources.js';
import { iconHtml } from '../../../src/jocs/games/alquimia/icons.js';
import assessment from './assessment.json';

// Dev-only Catalan copy. Recipe identity includes both ingredients and the result.
const items = COPY.alquimia.items;
const assessments = new Map(assessment.rows.map(row => [row.key, row]));
const verdictNames = { keep: 'Conservable', discuss: 'Associació a valorar', change: 'Correcció prioritària' };
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const name = id => items[id]?.name ?? id;
const element = id => `<div class="e"><span class="o">${iconHtml(id)}</span><b>${esc(name(id))}</b></div>`;
const recipeKey = ([a, b, result]) => `recipe.${[a, b].sort().join('.')}.${result}`;
function assessmentHtml(key) {
  const row = assessments.get(key);
  if (!row) return '<aside class=assessment>Recepta nova: encara sense revisió de Codex.</aside>';
  return `<aside class=assessment><h3>Codex · ${verdictNames[row.verdict]}</h3><p>${esc(row.reason)}</p><p><strong>Proposta:</strong> ${esc(row.proposal)}</p>${row.sources.length ? `<p>${row.sources.map((url, i) => `<a href="${esc(url)}" target="_blank" rel="noopener">Font ${i + 1}</a>`).join(' · ')}</p>` : ''}</aside>`;
}
const field = (key, label) => `<label>${esc(label)}<textarea data-key="${key}" rows="2" maxlength="5000" disabled></textarea></label>`;
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const $ = id => document.getElementById(id);
$('summary').textContent = `${RECIPES.length} receptes · ${new Set([...BASE, ...RECIPES.flat()]).size} elements. Dades actuals del joc.`;
$('base').innerHTML = BASE.map(id => `<article class="r">${element(id)}${field(`art.${id}`, `Art de ${name(id)}`)}</article>`).join('');
$('recipes').innerHTML = RECIPES.map((recipe, i) => {
  const [a, b, result] = recipe, key = recipeKey(recipe), code = `R${String(i + 1).padStart(3, '0')}`;
  const fact = items[result]?.fact, source = SOURCES[result];
  return `<article class="r" data-recipe="${key}" data-search="${esc(normalize([code, ...recipe.map(name)].join(' ')))}">
    <p class="code">${code}</p><div class="q">${element(a)}<span class="op">+</span>${element(b)}<span class="op">=</span><div class="res">${element(result)}</div></div>
    ${fact ? `<p class="f">${esc(fact)} ${source ? `<a href="${esc(source)}" target="_blank" rel="noopener">Font</a>` : ''}</p>` : ''}
    ${assessmentHtml(key)}
    <label>La teva decisió<select data-key="${key}.status" disabled><option value="">Pendent</option><option value="ok">Bé</option><option value="change">Cal canviar-la</option></select></label>
    <div class="n">${field(`${key}.note`, 'Combinació')}${field(`art.${result}`, `Art de ${name(result)}`)}</div></article>`;
}).join('');
const currentReview = RECIPES.length === assessment.rows.length && RECIPES.every((recipe, i) => recipeKey(recipe) === assessment.rows[i].key);
$('audit').textContent = currentReview
  ? `${assessment.date}: 213 receptes revisades. ${assessment.counts.change} correccions prioritàries, ${assessment.counts.discuss} associacions a valorar i ${assessment.counts.keep} conservables. Cap parella duplicada ni element inaccessible; 178 noms, curiositats i fonts. ${assessment.audit.terminal.length} descobertes finals. Profunditat màxima: 13 nivells, fins al Lledó; no són 13 barreges totals. Són propostes de Codex, encara no decisions teves.`
  : 'Les receptes han canviat des de la revisió. Les observacions segueixen vinculades als ingredients i resultat, però cal actualitzar el recompte i els codis abans d’aplicar propostes.';
const fields = [...document.querySelectorAll('[data-key]')];
const cards = [...document.querySelectorAll('[data-recipe]')];
const endpoint = '/__alchemy-review/notes', draftKey = 'alchemy-review-drafts-v1';
let data = {}, saved = {}, pending = {}, timer, saving = false, ready = false;
const status = text => { $('save-state').textContent = text; };
function remember() {
  try { localStorage.setItem(draftKey, JSON.stringify(pending)); }
  catch { status("No es pot guardar la còpia al navegador. Exporta les notes abans de sortir."); }
}
function filter() {
  const query = normalize($('search').value), selected = $('filter').value;
  let shown = 0;
  for (const card of cards) {
    const review = data[card.dataset.recipe + '.status'] || 'pending';
    const verdict = assessments.get(card.dataset.recipe)?.verdict;
    const matches = selected === 'all' || (selected === 'new' && !verdict) || (selected.startsWith('codex-') ? verdict === selected.slice(6) : selected === review);
    card.hidden = !card.dataset.search.includes(query) || !matches;
    if (!card.hidden) shown++;
  }
  $('count').textContent = `${shown} de ${RECIPES.length} receptes`;
  $('empty').hidden = shown !== 0;
}
async function flush() {
  if (!ready || saving) return;
  saving = true;
  try {
    while (Object.keys(pending).length) {
      const key = Object.keys(pending)[0];
      const draft = pending[key];
      status('Desant...');
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, ...draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No s'ha pogut desar.");
      saved[key] = draft.value;
      if (pending[key] === draft) delete pending[key];
      else pending[key].previous = draft.value;
      remember();
    }
    status('Notes desades al worktree.');
  } catch (error) { status(`${error.message} Les notes pendents es conserven al navegador; també les pots exportar.`); }
  finally { saving = false; }
}
for (const input of fields) {
  input.addEventListener('input', () => {
    const key = input.dataset.key;
    data[key] = input.value;
    pending[key] = { value: input.value, previous: pending[key]?.previous ?? saved[key] ?? '' };
    for (const other of fields.filter(f => f.dataset.key === key)) {
      other.value = input.value; other.classList.toggle('has', !!input.value);
    }
    status('Canvis pendents de desar...'); remember();
    clearTimeout(timer); timer = setTimeout(flush, 500);
  });
  input.addEventListener('blur', flush);
}
$('search').addEventListener('input', filter);
$('filter').addEventListener('change', filter);
$('retry').addEventListener('click', flush);
$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, notes: data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'alchemy-revisio.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('beforeunload', event => {
  if (Object.keys(pending).length) { event.preventDefault(); event.returnValue = ''; }
});
try {
  const response = await fetch(endpoint);
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('El desament no està disponible. Cal iniciar Vite amb el connector de revisió.');
  }
  saved = await response.json(); data = { ...saved };
  const drafts = JSON.parse(localStorage.getItem(draftKey) || '{}');
  for (const [key, draft] of Object.entries(drafts)) {
    if (fields.some(f => f.dataset.key === key) && typeof draft?.value === 'string' && typeof draft.previous === 'string') {
      pending[key] = draft; data[key] = draft.value;
    }
  }
  for (const input of fields) { input.value = data[input.dataset.key] ?? ''; input.disabled = false; input.classList.toggle('has', !!input.value); }
  ready = true;
  status(Object.keys(pending).length ? 'Hi ha notes pendents al navegador. Prem Torna a desar.' : 'Notes carregades. Els canvis es desen automàticament.');
} catch (error) { status(`${error.message} Recarrega la pàgina quan el servidor estigui disponible.`); $('export').disabled = true; }
filter();
