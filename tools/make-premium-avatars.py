#!/usr/bin/env python3
"""Builds the 5000-Diamond premium pictures (Sapphire Sovereign, Crimson
Inferno, Scarlet Guardian) from the owner's artwork in docs/avatar-art/src/.

  python3 tools/make-premium-avatars.py      (needs opencv-python, numpy, pillow)

For each picture it:
  1. cleans the source (the lion loses its sceptre, the bird its branch; the
     devil is used as drawn) by patching from a "clean plate" of the dark
     background, and keeps that cleaned full-size copy in docs/avatar-art/;
  2. crops to the art's own gold frame and rounds the corners to match it;
  3. writes the runtime files to art/avatars/:
       <id>.webp        512px base, with the moving parts patched out
       <id>-<part>.webp each moving part, cut out with a soft edge
       <id>-sheen.webp  greyscale mask for the light sweep (256px)
       <id>-sm.webp     160px flat picture for small slots (under 64px)
  4. prints the layout (part boxes, pivots, glow points) in the 1000-unit
     space the game draws them in (PREMIUM_PHOTO_AVATARS in index.html).

The sources are 1254px, so there is no true 4K master: upscaling would only
invent pixels. The cleaned full-size PNG in docs/avatar-art/ is the master.
"""
import json
import os
import cv2
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'docs', 'avatar-art', 'src')
DOCS = os.path.join(ROOT, 'docs', 'avatar-art')
OUT = os.path.join(ROOT, 'art', 'avatars')
BASE_PX = 512
SMALL_PX = 160
SHEEN_PX = 256
CORNER = 0.125          # the frame's corner radius, as a share of the width
U = 1000                # the game draws each picture in a 1000-unit square


def hsv(im):
    h = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    return h[..., 1].astype(int), h[..., 2].astype(int)


def background_plate(im, fg_thresh=75, grow=7, scale=3):
    """The picture with everything bright (subject, frame, glows) filled in
    from the dark background around it: a clean plate to patch from."""
    V = hsv(im)[1]
    fg = cv2.dilate(((V > fg_thresh) * 255).astype(np.uint8), np.ones((grow, grow), np.uint8))
    h, w = fg.shape
    small = cv2.resize(im, (w // scale, h // scale), interpolation=cv2.INTER_AREA)
    ms = (cv2.resize(fg, (w // scale, h // scale), interpolation=cv2.INTER_AREA) > 8).astype(np.uint8) * 255
    fs = cv2.inpaint(small, ms, 8, cv2.INPAINT_TELEA)
    fs = cv2.GaussianBlur(fs, (0, 0), 2)
    return cv2.GaussianBlur(cv2.resize(fs, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 3)


def cool(plate, hue=112):
    """Warm leftovers (old gold glow) -> the navy background's hue."""
    h = cv2.cvtColor(plate, cv2.COLOR_BGR2HSV)
    warm = (h[..., 0] < 60) & (h[..., 1] > 30)
    h[..., 0][warm] = hue
    h[..., 1][warm] = (h[..., 1][warm] * 0.8).astype(np.uint8)
    return cv2.cvtColor(h, cv2.COLOR_HSV2BGR)


def patch(im, plate, mask, feather=3, grain=1.2, seed=1):
    m = (mask > 0).astype(np.float32)
    a = np.clip(np.maximum(cv2.GaussianBlur(m, (0, 0), feather), m), 0, 1)[..., None]
    p = plate.astype(np.float32) + np.random.default_rng(seed).normal(0, grain, im.shape).astype(np.float32)
    return np.clip(im.astype(np.float32) * (1 - a) + p * a, 0, 255).astype(np.uint8)


def boxes_mask(shape, boxes):
    core = np.zeros(shape, np.uint8)
    for (x0, y0, x1, y1, cond) in boxes:
        core[y0:y1, x0:x1][cond[y0:y1, x0:x1]] = 255
    return core


def clean_lion(im):
    """Remove the sceptre (head + glow, shaft between and under the paws,
    ferrule) without touching the paws that held it."""
    S, V = hsv(im)
    allp = V >= 0
    core = boxes_mask(V.shape, [(165, 58, 390, 323, V > 40), (238, 436, 296, 546, allp),
                                (226, 640, 286, 692, allp), (190, 688, 305, 865, V > 40)])
    mask = cv2.dilate(core, np.ones((9, 9), np.uint8), iterations=2)
    yy = np.mgrid[0:V.shape[0], 0:V.shape[1]][0]
    paw = (S > 110) & (V > 55) & (yy > 300) & ~(core > 0)
    mask[cv2.dilate(paw.astype(np.uint8) * 255, np.ones((3, 3), np.uint8)) > 0] = 0
    return patch(im, cool(background_plate(im)), mask, feather=7)


def clean_bird(im):
    """Remove the branch below and left of the beak; the beak stays."""
    V = hsv(im)[1]
    core = boxes_mask(V.shape, [(150, 241, 345, 448, V > 40), (150, 214, 281, 241, V > 40)])
    mask = cv2.dilate(core, np.ones((7, 7), np.uint8), iterations=2)
    yy, xx = np.mgrid[0:V.shape[0], 0:V.shape[1]]
    mask[(xx >= 282) & (yy < 239)] = 0
    return patch(im, cool(background_plate(im)), mask, feather=6)


# Source-pixel geometry. crop = the art's frame (x0, y0, x1, y1).
# parts: a polygon around a moving piece, its pivot, and a root radius that
# stays in the base (so no gap opens where the piece joins the body).
PICTURES = {
    'sapphire-sovereign': {
        'src': 'sapphire-sovereign.png', 'clean': clean_lion, 'crop': (0, 0, 1254, 1222),
        'parts': {
            'tail': {'poly': [(885, 175), (1185, 175), (1185, 500), (1120, 560), (1120, 835),
                              (870, 835), (862, 760), (895, 600), (885, 400)],
                     'pivot': (880, 792), 'root': 60},
        },
        'glows': [(606, 104, 34), (691, 92, 34), (795, 142, 30)],        # crown sapphires
        'sheen': [(430, 50), (840, 50), (905, 400), (865, 625), (560, 645), (425, 300)],
    },
    'crimson-inferno': {
        'src': 'crimson-inferno.png', 'clean': None, 'crop': (12, 0, 1254, 1235),
        'parts': {
            'tail': {'poly': [(125, 550), (360, 550), (360, 662), (334, 694), (296, 762),
                              (272, 905), (178, 905), (136, 762), (125, 738)],
                     'pivot': (228, 905), 'root': 45},
        },
        'glows': [(578, 420, 58), (705, 425, 58)],                       # eyes
        'ember': [(925, 880), (955, 640), (976, 460), (993, 398)],       # up the shaft
        'prongs': [[(993, 398), (888, 330), (903, 215), (912, 110)],
                   [(993, 398), (1008, 250), (1020, 62)],
                   [(993, 398), (1108, 330), (1113, 225), (1118, 140)]],
        'sheen': None,
    },
    'scarlet-guardian': {
        'src': 'scarlet-guardian.png', 'clean': clean_bird, 'crop': (0, 0, 1254, 1241),
        'parts': {
            'wing': {'poly': [(598, 380), (760, 135), (850, 35), (1105, 55), (1105, 565),
                              (905, 655), (800, 725), (700, 645), (618, 560)],
                     'pivot': (590, 560), 'root': 220},
        },
        'glows': [],
        'sheen': [(290, 70), (1100, 40), (1110, 900), (1050, 1110), (300, 1000), (285, 400)],
    },
}


def to_u(pt, crop):
    x0, y0, x1, y1 = crop
    return (round((pt[0] - x0) * U / (x1 - x0), 1), round((pt[1] - y0) * U / (y1 - y0), 1))


def rounded_alpha(n):
    a = np.zeros((n * 4, n * 4), np.uint8)
    r = int(CORNER * n * 4)
    cv2.rectangle(a, (r, 0), (n * 4 - 1 - r, n * 4 - 1), 255, -1)
    cv2.rectangle(a, (0, r), (n * 4 - 1, n * 4 - 1 - r), 255, -1)
    for cx, cy in ((r, r), (n * 4 - 1 - r, r), (r, n * 4 - 1 - r), (n * 4 - 1 - r, n * 4 - 1 - r)):
        cv2.circle(a, (cx, cy), r, 255, -1, lineType=cv2.LINE_AA)
    return cv2.resize(a, (n, n), interpolation=cv2.INTER_AREA)


def save_webp(path, bgra_or_gray, quality=84):
    ok, buf = cv2.imencode('.webp', bgra_or_gray, [cv2.IMWRITE_WEBP_QUALITY, quality])
    assert ok, path
    with open(path, 'wb') as f:
        f.write(buf.tobytes())
    return len(buf)


def resize_crop(im, crop, n):
    x0, y0, x1, y1 = crop
    return cv2.resize(im[y0:y1, x0:x1], (n, n), interpolation=cv2.INTER_AREA)


def build(pid, spec):
    im = cv2.imread(os.path.join(SRC, spec['src']))
    if spec['clean']:
        im = spec['clean'](im)
    cv2.imwrite(os.path.join(DOCS, f'{pid}-master.png'), im)
    crop = spec['crop']
    x0, y0, x1, y1 = crop
    V = hsv(im)[1]
    # a plate from the true background only (every glow left out too), so
    # the space a moving part leaves is plain dark background
    plate = background_plate(im, fg_thresh=26, grow=35, scale=4)
    if spec['clean'] is not None:
        plate = cool(plate)
    base = im.copy()
    layout = {'parts': {}, 'glows': [], 'files': {}}
    sizes = {}
    yy, xx = np.mgrid[0:V.shape[0], 0:V.shape[1]]
    for name, part in spec['parts'].items():
        poly = np.zeros(V.shape, np.uint8)
        cv2.fillPoly(poly, [np.array(part['poly'], np.int32)], 255)
        subject = cv2.dilate(((V > 32) * 255).astype(np.uint8), np.ones((13, 13), np.uint8))
        sel = cv2.bitwise_and(poly, subject)
        alpha = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), 3.5)
        alpha = np.clip(alpha, 0, 255).astype(np.uint8)
        # the moving piece leaves the base, except its root near the pivot
        px, py = part['pivot']
        far = ((xx - px) ** 2 + (yy - py) ** 2) > part['root'] ** 2
        hole = cv2.dilate(sel, np.ones((9, 9), np.uint8))
        hole[~far] = 0
        base = patch(base, plate, hole, feather=4, seed=7)
        ys, xs = np.where(alpha > 2)
        bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        k = BASE_PX / (x1 - x0)
        pw, ph = max(1, round((bx1 - bx0) * k)), max(1, round((by1 - by0) * k))
        rgba = np.dstack([im[by0:by1, bx0:bx1], alpha[by0:by1, bx0:bx1]])
        rgba = cv2.resize(rgba, (pw, ph), interpolation=cv2.INTER_AREA)
        fn = f'{pid}-{name}.webp'
        sizes[fn] = (pw, ph, save_webp(os.path.join(OUT, fn), rgba, 88))
        ux0, uy0 = to_u((bx0, by0), crop)
        ux1, uy1 = to_u((bx1, by1), crop)
        pu = to_u(part['pivot'], crop)
        layout['parts'][name] = {'x': ux0, 'y': uy0, 'w': round(ux1 - ux0, 1), 'h': round(uy1 - uy0, 1),
                                 'ox': round((pu[0] - ux0) / (ux1 - ux0) * 100, 1),
                                 'oy': round((pu[1] - uy0) / (uy1 - uy0) * 100, 1)}
    ra = rounded_alpha(BASE_PX)
    b = np.dstack([resize_crop(base, crop, BASE_PX), ra])
    sizes[f'{pid}.webp'] = (BASE_PX, BASE_PX, save_webp(os.path.join(OUT, f'{pid}.webp'), b, 84))
    sm = np.dstack([resize_crop(im, crop, SMALL_PX), rounded_alpha(SMALL_PX)])
    sizes[f'{pid}-sm.webp'] = (SMALL_PX, SMALL_PX, save_webp(os.path.join(OUT, f'{pid}-sm.webp'), sm, 86))
    if spec['sheen']:
        poly = np.zeros(V.shape, np.uint8)
        cv2.fillPoly(poly, [np.array(spec['sheen'], np.int32)], 255)
        m = np.clip((V - 55) / 90.0, 0, 1) * (poly > 0)
        m = cv2.GaussianBlur((m * 255).astype(np.float32), (0, 0), 1.2).astype(np.uint8)
        g = resize_crop(m, crop, SHEEN_PX)
        sizes[f'{pid}-sheen.webp'] = (SHEEN_PX, SHEEN_PX, save_webp(os.path.join(OUT, f'{pid}-sheen.webp'),
                                                                     cv2.cvtColor(g, cv2.COLOR_GRAY2BGR), 80))
        layout['sheen'] = True
    for (gx, gy, gr) in spec['glows']:
        u = to_u((gx, gy), crop)
        layout['glows'].append([u[0], u[1], round(gr * U / (x1 - x0), 1)])
    if spec.get('ember'):
        layout['ember'] = [to_u(p, crop) for p in spec['ember']]
        layout['prongs'] = [[to_u(p, crop) for p in path] for path in spec['prongs']]
    return layout, sizes


def main():
    os.makedirs(OUT, exist_ok=True)
    all_layout, all_sizes = {}, {}
    for pid, spec in PICTURES.items():
        all_layout[pid], sizes = build(pid, spec)
        all_sizes.update(sizes)
    for fn, (w, h, n) in sorted(all_sizes.items()):
        print(f'  art/avatars/{fn:34s} {w}x{h}  {n / 1024:.1f} KB')
    print(json.dumps(all_layout))


if __name__ == '__main__':
    main()
