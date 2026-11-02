"""H–J: reuse the existing alpha, colour and board pipeline; preserve A–G."""
from pathlib import Path
import sys
s=Path('tools/dev/crush-nans/prepara-ef.py').read_text().replace('sys.argv[1:3]','sys.argv[1:4]').replace("'EF'","'HIJ'")
exec(compile(s,'prepara-ef reused','exec'))
