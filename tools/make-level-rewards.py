#!/usr/bin/env python3
"""Level-reward art (v251): cut from the owner's sheet
docs/avatar-art/src/level-rewards-sheet.webp (1536x1024: earn-only avatars on
the top row, card backs on the bottom). Each piece is cropped, upscaled with
Lanczos and lightly sharpened, and saved as WebP:

  art/avatars/lvl-<id>.webp   512x512 square (the game's rounded tile clips it)
  art/backs/lvl-<id>.webp     2x the crop, card-shaped

Deterministic: the same files every run. Usage: python3 tools/make-level-rewards.py
Needs pillow. A changed file needs ART_V bumped in index.html (art caches a day).
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'docs/avatar-art/src/level-rewards-sheet.webp')

AVATARS = {  # (left, top, right, bottom) on the sheet
    'rookie-rogue': (8, 100, 290, 382),
    'card-shark': (282, 100, 564, 382),
    'burn-king': (556, 80, 840, 364),
    'chaos-jester': (832, 100, 1114, 382),
    'the-shithead': (1130, 0, 1510, 380),
}
BACKS = {
    'first-burn': (62, 563, 290, 900),
    'sharks-mark': (350, 563, 580, 900),
    'inferno': (640, 563, 870, 900),
    'chaos-crown': (936, 563, 1167, 900),
    'master-pile': (1220, 532, 1474, 912),
}


def sharpen(im):
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))


def main():
    sheet = Image.open(SHEET).convert('RGB')
    for name, box in AVATARS.items():
        out = sharpen(sheet.crop(box).resize((512, 512), Image.LANCZOS))
        path = os.path.join(ROOT, 'art/avatars', f'lvl-{name}.webp')
        out.save(path, 'WEBP', quality=90, method=6)
        print(path, out.size)
    for name, box in BACKS.items():
        c = sheet.crop(box)
        out = sharpen(c.resize((c.width * 2, c.height * 2), Image.LANCZOS))
        path = os.path.join(ROOT, 'art/backs', f'lvl-{name}.webp')
        out.save(path, 'WEBP', quality=90, method=6)
        print(path, out.size)


if __name__ == '__main__':
    main()
