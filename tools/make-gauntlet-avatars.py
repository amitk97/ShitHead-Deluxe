#!/usr/bin/env python3
"""Gauntlet avatars (v254): the owner's three pictures (docs/avatar-art/src/
gauntlet-{easy,hard,boss}.webp, 1254px) cropped to the inside of their gold
frame (the game draws its own gold rim round the rounded tile), upscaled
with Lanczos, lightly sharpened and saved as art/avatars/gauntlet-<mode>.webp
(512x512). Prints GAUNTLET_AVATAR_LAYOUT for index.html: where the animated
parts sit in the tile's 1000-unit space (sword blades for the shine, gems
for the glints, the heart's glow).

Deterministic. Usage: python3 tools/make-gauntlet-avatars.py  (needs pillow)
A changed file needs GAUNTLET_ART_V bumped in index.html (art caches a day).
"""
import json, os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Per picture, in source pixels: the square crop, each blade (tip, base,
# half-width), the gems and the heart (centre, radius).
ART = {
    'easy': {'crop': (105, 90, 1150), 'blades': [((210, 186), (420, 425), 36), ((1064, 186), (838, 425), 36)],
             'gems': [(627, 245), (627, 420), (318, 935), (928, 935)], 'heart': ((627, 630), 120)},
    'hard': {'crop': (95, 80, 1160), 'blades': [((194, 145), (430, 392), 44), ((1066, 145), (826, 392), 44)],
             'gems': [(622, 180), (625, 365), (625, 800), (283, 930), (968, 930)], 'heart': ((627, 592), 125)},
    'boss': {'crop': (95, 80, 1160), 'blades': [((194, 147), (428, 392), 44), ((1064, 147), (826, 392), 44)],
             'gems': [(625, 185), (627, 382), (627, 815), (625, 955), (285, 930), (968, 930)], 'heart': ((627, 612), 118)},
}


def main():
    layout = {}
    for mode, a in ART.items():
        x0, y0, x1 = a['crop']
        side = x1 - x0
        u = lambda p: [round((p[0] - x0) / side * 1000), round((p[1] - y0) / side * 1000)]
        src = Image.open(os.path.join(ROOT, f'docs/avatar-art/src/gauntlet-{mode}.webp')).convert('RGB')
        out = src.crop((x0, y0, x1, y0 + side)).resize((512, 512), Image.LANCZOS)
        out = out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
        path = os.path.join(ROOT, f'art/avatars/gauntlet-{mode}.webp')
        out.save(path, 'WEBP', quality=90, method=6)
        print(path, out.size)
        (hc, hr) = a['heart']
        layout[mode] = {
            'blades': [[u(tip), u(base), round(w / side * 1000)] for tip, base, w in a['blades']],
            'gems': [u(g) for g in a['gems']],
            'heart': [*u(hc), round(hr / side * 1000)],
        }
    print('GAUNTLET_AVATAR_LAYOUT = ' + json.dumps(layout, separators=(',', ':')))


if __name__ == '__main__':
    main()
