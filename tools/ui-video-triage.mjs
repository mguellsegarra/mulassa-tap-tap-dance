// Eina de desenvolupament: aplica les regles de docs/i18n-ui-inventory/video/triatge.json a una troballa de vídeo.
// i18n-ok: eina de dev — els textos són motius del triatge, no text del joc.
// Una regla: { kind?, selector?, text?, capture? (regex en text) , group: 'A'|'B'|'C', status, why }. La primera que coincideix guanya; sense regla = B «per revisar».
export function groupOf(notes, f) {
  for (const r of notes.rules ?? []) {
    const ok = (k, v) => !r[k] || new RegExp(r[k]).test(v ?? '');
    if (r.kind && r.kind !== f.kind) continue;
    if (ok('selector', f.selector) && ok('text', f.text) && ok('measure', f.measure) && ok('capture', f.capture)) return { group: r.group, status: r.status, why: r.why, triage: r.id ?? r.why.slice(0, 20) };
  }
  return { group: 'B', status: 'per revisar', why: 'sense regla de triatge', triage: 'cap' };
}
