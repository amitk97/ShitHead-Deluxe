# Packs the native 512px captures (Shitstorm-Native-512-Frames.zip, frames/000..059.png) into
# mascot-atlas-v2.webp: intro frames 0..24 every other one, then loop frames 25..41 (the only ones the
# burn draws). mascot-burn.js maps a game frame to an atlas slot through meta.index.
# Usage: python3 pack512.py <frames dir> ; reads/writes art/burns/shitstorm/ (bounds, tip, radius kept).
import json, sys
from pathlib import Path
from PIL import Image
frames = Path(sys.argv[1]); out = Path(__file__).resolve().parents[2] / 'art/burns/shitstorm'
m = json.loads((out / 'mascot-atlas-v2.json').read_text()); C, G, cols = 512, 2, 6
src = list(range(0, 25, 2)) + list(range(25, 42)); rows = -(-len(src) // cols)
at = Image.new('RGBA', (cols * (C + G), rows * (C + G)), (0, 0, 0, 0))
for k, f in enumerate(src):
    at.alpha_composite(Image.open(frames / f'{f:03d}.png').convert('RGBA'), ((k % cols) * (C + G), (k // cols) * (C + G)))
at.save(out / 'mascot-atlas-v2.webp', quality=88, method=6)
m.update(cell=C, columns=cols, gutter=G, source=src, version=2,
         index=[min(range(len(src)), key=lambda k: abs(src[k] - f)) for f in range(60)])
(out / 'mascot-atlas-v2.json').write_text(json.dumps(m, separators=(',', ':')))
