"""G: reuse prepara.py without rewriting earlier alternatives."""
from pathlib import Path
import sys
s=Path('tools/dev/crush-nans/prepara-ef.py').read_text().replace("sys.argv[1:3]", "sys.argv[1:2]").replace("'EF'", "'G'")
exec(compile(s,'prepara-ef reused','exec'))
from PIL import Image, ImageDraw
out=Path('tools/dev/crush-nans')
comparison=Image.new('RGB',(480,240),'#fff2dc'); d=ImageDraw.Draw(comparison)
ref=Image.open(out/'G-referencia-front.png'); ref.thumbnail((160,180)); comparison.paste(ref,(40,36))
piece=Image.open(out/'G.png').convert('RGBA').resize((45,45),Image.Resampling.LANCZOS); comparison.paste(piece,(300,100),piece)
d.text((40,12),'Foto real · Barret Verd',fill='#332211');d.text((270,164),'G · 45 px',fill='#332211')
comparison.save(out/'G-comparacio.png')
