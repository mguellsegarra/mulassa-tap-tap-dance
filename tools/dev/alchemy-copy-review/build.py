"""Build the self-contained review artifact; never writes game data."""
import json
from collections import Counter
from pathlib import Path

root = Path(__file__).parent
current = json.loads((root / 'current.json').read_text())
drafts = {}
for line in (root / 'drafts.tsv').read_text().splitlines():
    if line and not line.startswith('#'):
        key, fact, source, note = line.split('|')
        if key in drafts:
            raise ValueError(f'Duplicate draft: {key}')
        drafts[key] = dict(proposed=fact, sources=[source], note=note)
extra = {
    'bengala': ['https://www.acs.org/middleschoolchemistry/simulations/periodic-table.html'],
    'celula': ['https://www.royalsociety.org/-/media/about-us/governance/trustees-report-2015-2016.pdf'],
    'vi': ['https://teachersinstitute.yale.edu/curriculum/units/files/09.03.04.pdf'],
    'llibre': ['https://xac.gencat.cat/ca/Sant_Jordi/index.html'],
}
castells = set('colla pinya castell enxaneta faixa gralla timbal musica folre manilles camisa aleta carregat descarregat mocador concurs'.split())
culture = set('ball bestia canya carretilla polvora mullat montserrat santjordi rosa llibre sagrada cobla sardana tio caganer flabiol sacgemecs fiscorn bengala torxa traca auca rondalla carnaval'.split())
food = set('calcot calcotada ceba tomaquet escalivada raim blat pa patomaquet salsa castanya castanyada botifarra crema coca xato porro sucre vinya vi'.split())
craft = set('casa coto roba ferro campana paper llenya perles barretina ceramica forjat vidre pintura vaixell'.split())
rows = []
for index, item in enumerate(current, 1):
    draft = drafts.get(item['id'])
    row = {**item, 'code': f'E{index:03}', 'current': item.get('fact', ''),
           'proposed': item.get('fact', ''), 'sources': [item['source']] if item['source'] else [],
           'note': 'Text ja aprovat en aquesta conversa; es manté sense canvis.',
           'kind': 'revisada' if draft and item.get('fact') else 'nova' if draft else 'aprovada'}
    if draft:
        row.update(draft)
    row['sources'] += extra.get(item['id'], [])
    text = row['proposed'].lower()
    row['topic'] = ('Valls' if item['local'] or 'valls' in text or 'vallenc' in text else
                    'Castells' if item['id'] in castells else
                    'Festa i cultura' if item['id'] in culture else
                    'Aliments i conreu' if item['id'] in food else
                    'Materials i oficis' if item['id'] in craft else 'Natura i ciència')
    row['words'] = len(row['proposed'].split())
    row.pop('fact', None)
    rows.append(row)
assert len(rows) == 178 and len(drafts) == 130
assert all(r['proposed'] and r['sources'] for r in rows)
assert Counter(r['kind'] for r in rows) == {'nova': 69, 'revisada': 61, 'aprovada': 48}
order = ['Valls', 'Castells', 'Festa i cultura', 'Aliments i conreu', 'Materials i oficis', 'Natura i ciència']
rows.sort(key=lambda r: (order.index(r['topic']), r['kind'] == 'aprovada', r['name'].casefold()))
(root / 'proposals.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
data = json.dumps(rows, ensure_ascii=False).replace('</', '<\\/')
html = (root / 'template.html').read_text().replace('/* REVIEW_CSS */', (root / 'review.css').read_text())
html = html.replace('/* REVIEW_DATA */', 'const entries = ' + data + ';')
html = html.replace('/* REVIEW_JS */', (root / 'review.js').read_text())
(root / 'index.html').write_text(html)
print(json.dumps({'elements': len(rows), 'kinds': dict(Counter(r['kind'] for r in rows)),
                  'topics': dict(Counter(r['topic'] for r in rows)),
                  'max_new_words': max(r['words'] for r in rows if r['kind'] != 'aprovada')}, ensure_ascii=False))
