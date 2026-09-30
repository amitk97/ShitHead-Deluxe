#!/usr/bin/env python3
"""Owner's Halloween / victory art (v257), cut into the files the game animates.

Sources (the owner's pictures, docs/avatar-art/src/):
  back-halloween-cobweb.webp    -> art/backs/halloween-cobweb.webp   (Cobweb card back)
  avatar-halloween-pumpkin.webp -> art/avatars/halloween-pumpkin.webp (Jack-o'-Lantern, 512)
  joker-halloween.webp          -> art/effects/pumpkin-{bg,pumpkin,ghost,boo}.webp
  victory-lion.webp             -> art/effects/lion-{bg,head}.webp
  victory-fireworks.webp        -> art/effects/fireworks-{gold,red,blue,purple,green}.webp

The effect pictures are glows on a near-black sky, so every layer gets real
transparency: glow is "keyed" (alpha from brightness, colour un-darkened), and
solid things (the lion's head, the ghost, BOO!, the pumpkin) are cut out by a
hand-drawn outline, with their dark insides (eyes, outlines) kept opaque.
Parts are cropped to their box; the printed OWNER_FX_LAYOUT (boxes in the
source's 1000-unit square) goes into index.html (§ Owner effects).

Deterministic. Usage: python3 tools/make-owner-effects.py  (needs numpy + pillow)
A changed file needs OWNER_FX_V bumped in index.html (art caches a day).
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs/avatar-art/src')
FX = os.path.join(ROOT, 'art/effects')


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGB')


def poly_mask(size, pts, feather=0):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in pts], fill=255)
    if feather:
        m = m.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(m, dtype=np.float32) / 255


def circle_mask(size, cx, cy, r, feather):
    yy, xx = np.mgrid[0:size[1], 0:size[0]].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    return np.clip((r - d) / feather + 0.5, 0, 1)


def keyed(rgb, black=30, full=150):
    """Alpha from brightness; colours un-darkened so they read the same over any backdrop."""
    a = np.clip((rgb.max(axis=2) - black) / (full - black), 0, 1)
    a = np.where(a < 0.06, 0, a) ** 1.15  # the night sky itself is fully clear (no tinted box)
    col = np.clip(rgb / np.maximum(a, 1e-3)[..., None], 0, 255)
    return col, a


def solid(rgb, region, thresh=48, close=9, max_hole=0):
    """The object inside `region`: bright pixels closed up and every hole filled."""
    m = ((rgb.max(axis=2) > thresh) & (region > 0.5)).astype(np.uint8) * 255
    img = Image.fromarray(m).filter(ImageFilter.MaxFilter(close)).filter(ImageFilter.MinFilter(close))
    # fill holes: flood the outside from a corner, everything not reached is inside
    pad = Image.new('L', (img.width + 2, img.height + 2), 0)
    pad.paste(img, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    inside = np.asarray(pad, dtype=np.uint8)[1:-1, 1:-1] != 128
    if max_hole:
        # keep only small holes (outlines, gaps); big dark patches stay see-through
        base = np.asarray(img, dtype=np.uint8) > 127
        holes = Image.fromarray((inside & ~base).astype(np.uint8) * 255)
        big = np.asarray(holes.filter(ImageFilter.MinFilter(max_hole)).filter(ImageFilter.MaxFilter(max_hole + 4)), dtype=np.uint8) > 127
        inside = inside & ~big
    out = Image.fromarray(inside.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(out, dtype=np.float32) / 255


def save_part(rgb, alpha, name, scale, layout, key, side):
    """Crop to the part's box, scale, save RGBA webp; record its box (1000 units)."""
    ys, xs = np.where(alpha > 0.02)
    x0, x1, y0, y1 = max(0, xs.min() - 2), min(alpha.shape[1], xs.max() + 3), max(0, ys.min() - 2), min(alpha.shape[0], ys.max() + 3)
    rgba = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1, None] * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    path = os.path.join(FX, name)
    im.save(path, 'WEBP', quality=84, method=6)
    layout[key] = [round(x0 / side * 1000, 1), round(y0 / side * 1000, 1), round((x1 - x0) / side * 1000, 1), round((y1 - y0) / side * 1000, 1)]
    print(f'{path} {im.size} {os.path.getsize(path) // 1024}KB')


def cobweb_back():
    src = load('back-halloween-cobweb.webp')
    out = src.crop((143, 185, 881, 1290))  # the card, edge to edge of its orange frame
    path = os.path.join(ROOT, 'art/backs/halloween-cobweb.webp')
    out.save(path, 'WEBP', quality=88, method=6)
    print(path, out.size)


def pumpkin_avatar():
    src = load('avatar-halloween-pumpkin.webp')
    out = src.crop((236, 212, 1016, 992)).resize((512, 512), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=45, threshold=2))
    path = os.path.join(ROOT, 'art/avatars/halloween-pumpkin.webp')
    out.save(path, 'WEBP', quality=90, method=6)
    print(path, out.size)
    # Tile (1000 units) positions of the glowing eyes and mouth, for the candle flicker.
    u = lambda x, y: [round((x - 236) / 780 * 1000), round((y - 212) / 780 * 1000)]
    return {'eyes': [u(520, 610), u(745, 640)], 'mouth': u(620, 770), 'embers': [u(370, 372), u(887, 432), u(310, 462), u(946, 522), u(942, 876)]}


def pumpkin_joker(layout):
    src = load('joker-halloween.webp')
    rgb = np.asarray(src, dtype=np.float32)
    size, side = src.size, src.size[0]
    col, key = keyed(rgb)
    regions = {
        'ghost': [(700, 250), (730, 175), (790, 128), (900, 128), (990, 190), (1055, 310), (1085, 390), (1080, 470), (1045, 560), (970, 560), (880, 520), (800, 480), (720, 420), (668, 370), (664, 320)],
        'boo': [(128, 330), (140, 250), (205, 140), (440, 130), (660, 150), (670, 330), (645, 395), (560, 420), (470, 440), (380, 500), (330, 545), (200, 545), (140, 460)],
        'pumpkin': [(300, 615), (330, 570), (420, 555), (500, 540), (560, 470), (575, 420), (640, 415), (700, 500), (760, 560), (850, 580), (960, 590), (1000, 640), (990, 690), (930, 700), (900, 760), (925, 850), (900, 950), (840, 1030), (740, 1070), (560, 1075), (430, 1040), (360, 960), (335, 860), (350, 760), (360, 700), (320, 665)],
    }
    solids = {}
    for name, pts in regions.items():
        reg = poly_mask(size, pts)
        s = solid(rgb, reg, thresh=40 if name != 'boo' else 60, max_hole=21 if name == 'pumpkin' else 0)
        soft = poly_mask(size, pts, feather=6)
        alpha = np.maximum(s, key * soft) * soft
        # opaque where solid: original colours; glow edge: keyed colours
        c = rgb * s[..., None] + col * (1 - s[..., None])
        solids[name] = alpha
        save_part(c, alpha, f'pumpkin-{name}.webp', 0.72, layout, name, side)
    # Cut generously (the parts' glow rims too), so no outline is left behind when they move.
    cut = np.maximum.reduce([np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(27)).filter(ImageFilter.GaussianBlur(6)), dtype=np.float32) / 255 for a in solids.values()])
    save_part(col, key * (1 - cut), 'pumpkin-bg.webp', 0.6, layout, 'bg', side)


def lion(layout):
    src = load('victory-lion.webp')
    rgb = np.asarray(src, dtype=np.float32)
    size, side = src.size, src.size[0]
    col, key = keyed(rgb, black=34, full=175)
    head = [(300, 440), (340, 380), (400, 330), (430, 300), (470, 262), (540, 232), (610, 226), (690, 232), (760, 262),
            (820, 300), (880, 330), (935, 400), (975, 460), (985, 560), (965, 680), (950, 790), (900, 870), (820, 930),
            (700, 975), (625, 1005), (560, 985), (450, 940), (360, 880), (320, 820), (295, 720), (285, 600)]
    hm = poly_mask(size, head, feather=5)
    save_part(rgb, hm, 'lion-head.webp', 0.8, layout, 'head', side)
    inner = poly_mask(size, head, feather=14)
    save_part(col, key * (1 - inner), 'lion-bg.webp', 0.62, layout, 'bg', side)


def fireworks(layout):
    src = load('victory-fireworks.webp')
    rgb = np.asarray(src, dtype=np.float32)
    size, side = src.size, src.size[0]
    col, key = keyed(rgb, black=34, full=160)
    bursts = {'red': (315, 345, 235), 'blue': (940, 360, 225), 'purple': (280, 800, 225), 'green': (1005, 830, 225)}
    masks = {k: circle_mask(size, x, y, r, 60) for k, (x, y, r) in bursts.items()}
    for k, m in masks.items():
        save_part(col, key * m, f'fireworks-{k}.webp', 0.62, layout, k, side)
    rest = 1 - np.maximum.reduce(list(masks.values()))
    save_part(col, key * rest, 'fireworks-gold.webp', 0.62, layout, 'gold', side)
    return {k: [round(x / side * 1000), round(y / side * 1000)] for k, (x, y, r) in {**bursts, 'gold': (628, 628, 0)}.items()}


def main():
    os.makedirs(FX, exist_ok=True)
    cobweb_back()
    layout = {'pumpkinAvatar': pumpkin_avatar()}
    layout['pumpkin'] = {}
    pumpkin_joker(layout['pumpkin'])
    layout['lion'] = {}
    lion(layout['lion'])
    layout['fireworks'] = {}
    layout['fireworks']['centres'] = fireworks(layout['fireworks'])
    print('OWNER_FX_LAYOUT = ' + json.dumps(layout, separators=(',', ':')))


if __name__ == '__main__':
    main()
