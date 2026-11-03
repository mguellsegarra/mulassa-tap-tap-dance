"""E/F: same alpha, board and colour pipeline as prepara.py; A–D untouched."""
from pathlib import Path
import sys
source=Path('tools/dev/crush-nans/prepara.py').read_text()
source=source.replace("root=Path('/Users/marc/.codex/generated_images/01a19d2c-dc6d-7680-8df9-eaf83e25b118')", "root=Path('/')")
start=source.index("files=[")
end=source.index("; alpha={}",start)
source=source[:start]+"files="+repr(sys.argv[1:3])+source[end:]
source=source.replace("zip('ABCD',files)","zip('EF',files)").replace("root/('exec-'+f+'.png')","Path(f)").replace("'ABCD'","'EF'")
source=source.replace("(out/'mesures.json').write_text(json.dumps({'metrics':metrics,'alpha':alpha},ensure_ascii=False,indent=2))", "existing=json.loads((out/'mesures.json').read_text());existing['metrics'].update(metrics);existing['alpha'].update(alpha);(out/'mesures.json').write_text(json.dumps(existing,ensure_ascii=False,indent=2))")
source=source.replace('metrics={}\n', "for k in 'EF':\n a=np.array(imgs[k]);a[:,:,:3]=np.uint8(np.round(transform(a[:,:,:3]/255,'grisos')*255));Image.fromarray(a).save(out/(k+'-gris.png'))\nmetrics={}\n")
exec(compile(source,'prepara.py reused','exec'))
