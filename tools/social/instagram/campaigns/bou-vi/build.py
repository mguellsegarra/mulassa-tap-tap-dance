"""Build a portable HTML with all visual layers and original percussion inline."""
import base64
import mimetypes
import re
from pathlib import Path

campaign = Path(__file__).resolve().parent
root = campaign.parents[4]
target = root / 'output' / 'instagram' / 'bou-vi'
target.mkdir(parents=True, exist_ok=True)
page = (campaign / 'stories.html').read_text()
page = page.replace('<link rel="stylesheet" href="story.css">', '<style>' + (campaign / 'story.css').read_text() + '</style>')
page = page.replace('<script src="timeline.js"></script>', '<script>' + (campaign / 'timeline.js').read_text() + '</script>')
def embed(match):
    asset = campaign / match[1]
    mime = mimetypes.guess_type(asset)[0] or 'application/octet-stream'
    return 'src="data:' + mime + ';base64,' + base64.b64encode(asset.read_bytes()).decode() + '"'
page = re.sub(r'src="(assets/[^"]+)"', embed, page)
(target / 'stories.html').write_text(page)
print(target / 'stories.html')
