// Review annotations are local to this artifact; nothing writes to the game.
const storageKey = 'alchemy-curiositats-2026-11-03-v1';
const byId = new Map(entries.map(entry => [entry.id, entry]));
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let answers = {};
let page = 0;
let exportData = null;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    for (const [id, value] of Object.entries(saved)) {
      if (byId.has(id) && value && typeof value === 'object') {
        answers[id] = {
          status: ['pendent', 'ok', 'canvia'].includes(value.status) ? value.status : 'pendent',
          note: typeof value.note === 'string' ? value.note : '',
          text: typeof value.text === 'string' ? value.text : byId.get(id).proposed
        };
      }
    }
  }
  $('storage').textContent = 'Les anotacions es desen en aquest navegador. Exporta-les per compartir-les.';
} catch {
  $('storage').textContent = 'Aquí no es poden desar anotacions entre visites. Exporta-les abans de tancar.';
}
function answer(entry) {
  return answers[entry.id] || { status: 'ok', note: '', text: entry.proposed };
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(answers)); }
  catch { $('storage').textContent = 'No s’han pogut desar les anotacions. Exporta-les abans de tancar.'; }
}
function filtered() {
  const query = normalize($('query').value.trim());
  return entries.filter(entry => (!$('topic').value || entry.topic === $('topic').value)
    && (!$('kind').value || entry.kind === $('kind').value)
    && (!$('status').value || answer(entry).status === $('status').value)
    && (!query || normalize(`${entry.code} ${entry.id} ${entry.name} ${entry.proposed}`).includes(query)));
}
const kinds = { nova: 'Nova', revisada: 'Antiga revisada', aprovada: 'Ja aprovada' };
function card(entry) {
  const a = answer(entry);
  const h = escapeHTML;
  const sources = entry.sources.map((url, index) => `<a href="${h(url)}" target="_blank" rel="noopener noreferrer">Font ${index + 1} · ${h(new URL(url).hostname.replace(/^www\./, ''))} ↗</a>`).join('');
  return `<article class="card" data-id="${entry.id}" data-state="${a.status}">
    <header><div class="meta">${entry.code} · ${h(entry.topic)} · ${kinds[entry.kind]}</div><h2>${h(entry.name)}</h2></header>
    <p class="fact">${h(a.text)}</p>
    <p class="meta word-count">${a.text.trim().split(/\s+/).length} paraules</p>
    <div class="sources">${sources}</div>
    <details><summary>Text actual i criteri de revisió</summary><p><strong>Al joc:</strong> ${h(entry.current || 'Encara no té curiositat.')}</p><p>${h(entry.note)}</p>
      ${entry.source ? `<p><a href="${h(entry.source)}" target="_blank" rel="noopener noreferrer">Font actual del joc ↗</a></p>` : ''}
      <label class="edit">La teva proposta de text<textarea data-field="text" rows="4">${h(a.text)}</textarea></label>
    </details>
    <div class="decision"><label>Revisió de ${h(entry.name)}<select data-field="status">
      <option value="pendent" ${a.status === 'pendent' ? 'selected' : ''}>Per revisar</option>
      <option value="ok" ${a.status === 'ok' ? 'selected' : ''}>Em va bé</option>
      <option value="canvia" ${a.status === 'canvia' ? 'selected' : ''}>Vull canvis</option>
    </select></label><label>Comentari<textarea data-field="note" rows="2" placeholder="Què canviaries?">${h(a.note)}</textarea></label></div>
  </article>`;
}
function progress() {
  const pending = entries.filter(entry => answer(entry).status === 'pendent').length;
  const changes = entries.filter(entry => answer(entry).status === 'canvia').length;
  $('progress').textContent = `${pending} per revisar · ${changes} amb canvis demanats · ${178 - pending - changes} amb OK`;
}
function render() {
  const rows = filtered();
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  page = Math.min(page, pages - 1);
  $('cards').innerHTML = rows.length ? rows.slice(page * 12, page * 12 + 12).map(card).join('') : '<p>No hi ha cap element amb aquests filtres.</p>';
  $('page').textContent = `${rows.length} elements · Tanda ${page + 1}/${pages}`;
  $('prev').disabled = page === 0;
  $('next').disabled = page >= pages - 1;
  progress();
}
for (const id of ['query', 'topic', 'kind', 'status']) {
  $(id).addEventListener(id === 'query' ? 'input' : 'change', () => { page = 0; render(); });
}
$('prev').onclick = () => { page--; render(); $('page').scrollIntoView({ block: 'start' }); };
$('next').onclick = () => { page++; render(); $('page').scrollIntoView({ block: 'start' }); };
$('cards').addEventListener('input', event => {
  const field = event.target.dataset.field;
  const article = event.target.closest('[data-id]');
  if (!field || !article) return;
  const entry = byId.get(article.dataset.id);
  const a = { ...answer(entry), [field]: event.target.value };
  if (field === 'text' && a.text !== entry.proposed) {
    a.status = 'canvia';
    article.querySelector('[data-field="status"]').value = 'canvia';
  }
  answers[entry.id] = a;
  article.dataset.state = a.status;
  if (field === 'text') {
    article.querySelector('.fact').textContent = a.text;
    article.querySelector('.word-count').textContent = `${a.text.trim() ? a.text.trim().split(/\s+/).length : 0} paraules`;
  }
  persist(); progress();
});
$('export').onclick = () => {
  exportData = { version: storageKey, date: new Date().toISOString(), entries: entries.map(entry => ({
    code: entry.code, id: entry.id, name: entry.name, kind: entry.kind,
    ...answer(entry), proposed: entry.proposed, sources: entry.sources
  })) };
  const touched = exportData.entries.filter(entry => entry.kind !== 'aprovada' || answers[entry.id]);
  $('export-text').value = 'Revisió de curiositats · Mulassa Alchemy\n\n' + touched.map(entry =>
    `${entry.code} · ${entry.name} · ${entry.status === 'ok' ? 'OK' : entry.status === 'canvia' ? 'CANVIS' : 'PENDENT'}${entry.note ? `\nComentari: ${entry.note}` : ''}${entry.text !== entry.proposed ? `\nText proposat: ${entry.text}` : ''}`
  ).join('\n\n');
  $('export-panel').hidden = false;
  $('export-panel').scrollIntoView({ block: 'start' });
  $('export-text').focus();
};
$('download').onclick = () => {
  if (!exportData) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'revisio-curiositats-marc.json';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('close-export').onclick = () => { $('export-panel').hidden = true; $('export').focus(); };
$('print').onclick = () => { $('cards').innerHTML = entries.map(card).join(''); window.print(); render(); };
window.addEventListener('afterprint', render);
render();
