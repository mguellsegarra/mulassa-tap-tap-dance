from pathlib import Path
import argparse
import base64
import html
import json
p=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description="Build self-contained Mulassa Instagram stories")
parser.add_argument('--campaign', default='1.3.0', help='Campaign name or directory')
parser.add_argument('--out', type=Path, help='Output directory (default: output/instagram/<campaign>)')
args=parser.parse_args()
campaign=Path(args.campaign)
if not campaign.is_dir(): campaign=p/'campaigns'/args.campaign
if not campaign.is_dir(): parser.error(f'Campaign not found: {args.campaign}')
assets=p/'assets'
out_dir=args.out or p.parents[2]/'output'/'instagram'/campaign.name
def uri(path,mime):return 'data:'+mime+';base64,'+base64.b64encode(Path(path).read_bytes()).decode()
pattern=(assets/'background.txt').read_text()
badges=json.loads((assets/'badges.json').read_text())
by_id={b['id']:b['svg'] for b in badges}
shelf=json.loads((assets/'badge-shelf.json').read_text())
cards=json.loads((assets/'selector-cards.json').read_text())
rank=json.loads((campaign/'ranking.json').read_text())
rows=[]
for row in shelf:
 half='<div class="badge-half">'+''.join('<span class="badge-chip">'+svg+'</span>' for svg in row)+'</div>'
 rows.append('<div class="badge-row"><div class="badge-track">'+half+half+'</div></div>')
card_html=''.join('<div class="game-card"><div class="portrait"><img src="'+html.escape(c['src'],quote=True)+'" alt="'+html.escape(c['name'])+'"></div><div class="card-caption"><strong>'+html.escape(c['name'])+'</strong><span>'+html.escape(c['entity'])+'</span></div></div>' for c in cards)
heart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.2 12.9a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8z"/></svg>'
example=[by_id['senyera'],by_id['uaf'],shelf[0][0],by_id['pessigolla']]
values={'FONT':uri(assets/'baloo-2-latin.woff2','font/woff2'),'PATTERN':pattern,'FEATURE_BADGES':''.join('<span>'+by_id[i]+'</span>' for i in ['uaf','pessigolla','colla-vella','colla-joves']),'HEART_SVG':heart,'HERO_HEART':(assets/'hero-heart.svg').read_text(),'BADGE_ROWS':''.join(rows),'RANK_NAME':html.escape(rank['alias']),'RANK_SCORE':f"{rank['score']:,}".replace(',','.'),'EXAMPLE_BADGES':''.join('<span class="wear-badge">'+svg+'</span>' for svg in example),'CARDS':card_html,'SCRIPT':(p/'motion.js').read_text()}
out=(campaign/'template.html').read_text()
for key,val in values.items():out=out.replace('{{'+key+'}}',val)
if '{{' in out:raise RuntimeError('Unreplaced template token')
out_dir.mkdir(parents=True,exist_ok=True)
(out_dir/'stories.html').write_text(out)
print('Built 3 stories; 15 seconds each; leader:',rank['alias'])
print(out_dir/'stories.html')
