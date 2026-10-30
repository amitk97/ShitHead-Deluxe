# Packs the native captures (capture.cjs with SH_SIZE=640 and SH_FRAMES=0,2..24,25..41, or the 512 frames zip) into
# mascot-atlas-v3.webp (cell size = the frame size): intro frames 0..24 every other one, then loop frames 25..41 (the only ones the
# burn draws). mascot-burn.js maps a game frame to an atlas slot through meta.index.
# Usage: python3 pack512.py <frames dir> ; reads/writes art/burns/shitstorm/ (bounds, tip, radius kept).
import json, sys
from pathlib import Path
from PIL import Image
frames = Path(sys.argv[1]); out = Path(__file__).resolve().parents[2] / 'art/burns/shitstorm'
m = json.loads((out / 'mascot-atlas-v2.json').read_text()); C = Image.open(frames / '000.png').size[0]; G, cols = 2, 6
src = list(range(0, 25, 2)) + list(range(25, 42)); rows = -(-len(src) // cols)
at = Image.new('RGBA', (cols * (C + G), rows * (C + G)), (0, 0, 0, 0))
for k, f in enumerate(src):
    at.alpha_composite(Image.open(frames / f'{f:03d}.png').convert('RGBA'), ((k % cols) * (C + G), (k // cols) * (C + G)))
at.save(out / 'mascot-atlas-v3.webp', quality=94, method=6, alpha_quality=100)
m.update(cell=C, columns=cols, gutter=G, source=src, version=3,
         index=[min(range(len(src)), key=lambda k: abs(src[k] - f)) for f in range(60)])
(out / 'mascot-atlas-v3.json').write_text(json.dumps(m, separators=(',', ':')))
