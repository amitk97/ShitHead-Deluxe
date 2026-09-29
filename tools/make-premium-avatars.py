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
        # the lion stands in a blue glow: keep that glow in the plate
        'plate_thresh': 105, 'plate_grow': 21,
        # drawn in this order: head (mane + crown, tilts back to roar), jaw
        # (opens wider on its hinge), tail
        'parts': {
            'head': {'poly': [(425, 40), (845, 40), (878, 250), (878, 420), (850, 640),
                              (560, 650), (470, 560), (425, 300)],
                     'minus': ['jaw'], 'pivot': (690, 640), 'root': 190, 'solid': True,
                     'thresh': 125, 'grow': 27, 'soft': 7},
            'jaw': {'poly': [(462, 318), (505, 322), (528, 309), (548, 298), (562, 332),
                             (545, 368), (515, 392), (478, 388), (462, 356)],
                    'pivot': (552, 312), 'root': 0, 'soft': 1.6},
            'tail': {'poly': [(885, 175), (1185, 175), (1185, 500), (1120, 560), (1120, 835),
                              (870, 835), (862, 760), (895, 600), (885, 400)],
                     'pivot': (880, 792), 'root': 60},
        },
        'glows': [(606, 104, 34), (691, 92, 34), (795, 142, 30), (547, 218, 26)],
        'sheen': [(430, 50), (840, 50), (905, 400), (865, 625), (560, 645), (425, 300)],
    },
    'crimson-inferno': {
        'src': 'crimson-inferno.png', 'clean': None, 'crop': (12, 0, 1254, 1235),
        # the whole devil (heaves with the chuckle, from the feet), then the
        # tail tip on top
        'parts': {
            # the top edge dips only where a horn or the trident reaches up, so
            # the frame's inner line stays out of the moving layer
            'body': {'poly': [(190, 80), (440, 80), (470, 41), (530, 41), (560, 80), (680, 80),
                              (700, 44), (760, 44), (780, 80), (880, 80), (900, 46),
                              (1085, 46), (1160, 120), (1170, 250), (1170, 1070), (1080, 1196),
                              (190, 1196), (70, 1070), (70, 150)],
                     'minus': ['tail'], 'pivot': (640, 1170), 'root': 0, 'solid': True},
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
                     'pivot': (596, 556), 'root': 120},
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
    plate = background_plate(im, fg_thresh=spec.get('plate_thresh', 26), grow=spec.get('plate_grow', 35), scale=4)
    if spec['clean'] is not None:
        plate = cool(plate)
    base = im.copy()
    layout = {'parts': {}, 'glows': [], 'files': {}}
    sizes = {}
    yy, xx = np.mgrid[0:V.shape[0], 0:V.shape[1]]
    def poly_mask(pts):
        m = np.zeros(V.shape, np.uint8)
        cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
        return m
    for name, part in spec['parts'].items():
        poly = poly_mask(part['poly'])
        # a part drawn on top of this one is cut out of it, minus a few px so
        # this layer still covers under the top part's soft edge (no seam)
        for other in part.get('minus', []):
            cut = cv2.erode(poly_mask(spec['parts'][other]['poly']), np.ones((9, 9), np.uint8))
            poly[cut > 0] = 0
        if part.get('solid'):
            # a whole figure: its bright parts, closed and hole-filled, so dark
            # detail inside it (a face, a shaft's shadow) moves with it while
            # the frame's faint inner glow stays behind
            m = cv2.morphologyEx(((V > part.get('thresh', 70)) * 255).astype(np.uint8), cv2.MORPH_CLOSE,
                                 cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
            m = cv2.bitwise_and(m, poly)
            # fill small enclosed holes (a dark face, a shadow), never the big
            # gaps between limbs, tail and trident
            n, lab, stats, _ = cv2.connectedComponentsWithStats(cv2.bitwise_not(m), connectivity=4)
            for i in range(1, n):
                if stats[i, cv2.CC_STAT_AREA] < part.get('hole', 12000):
                    m[lab == i] = 255
            g = part.get('grow', 11)
            subject = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (g, g)))
        else:
            subject = cv2.dilate(((V > 32) * 255).astype(np.uint8), np.ones((13, 13), np.uint8))
        sel = cv2.bitwise_and(poly, subject)
        alpha = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), part.get('soft', 3.5))
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
                                 'px': pu[0], 'py': pu[1],
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


def build_turtley():
    """Turtley is a 3D render (tools/turtley/scene.html + render.js wrote
    full/body/head/jaw PNGs to docs/avatar-art/src/turtley/). Frame it like
    the others: the gold frame ring from the Crimson Inferno artwork, a deep
    navy background with an emerald glow, a soft contact shadow and a light
    bloom; the head and jaw become the moving layers."""
    d = os.path.join(SRC, 'turtley')
    N = 1254
    rd = lambda f: cv2.imread(os.path.join(d, f), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
    full, body, head, jaw = rd('full.png'), rd('body.png'), rd('head.png'), rd('jaw.png')
    pts = json.load(open(os.path.join(d, 'points.json')))
    # the frame: the devil picture's outer band, inside a rounded-rect mask
    devil = cv2.imread(os.path.join(SRC, 'crimson-inferno.png'))
    x0, y0, x1, y1 = PICTURES['crimson-inferno']['crop']
    frame = cv2.resize(devil[y0:y1, x0:x1], (N, N), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    inner = np.zeros((N, N), np.uint8)
    ins, rad = 40, 132
    cv2.rectangle(inner, (ins + rad, ins), (N - ins - rad, N - ins), 255, -1)
    cv2.rectangle(inner, (ins, ins + rad), (N - ins, N - ins - rad), 255, -1)
    for cx, cy in ((ins + rad, ins + rad), (N - ins - rad, ins + rad), (ins + rad, N - ins - rad), (N - ins - rad, N - ins - rad)):
        cv2.circle(inner, (cx, cy), rad, 255, -1, lineType=cv2.LINE_AA)
    inner = cv2.GaussianBlur(inner.astype(np.float32) / 255, (0, 0), 3)[..., None]
    # background: deep navy, lighter in the middle, an emerald glow behind the turtle
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    r = np.sqrt((xx - N * 0.5) ** 2 + (yy - N * 0.47) ** 2) / N
    bg = np.dstack([np.full((N, N), c, np.float32) for c in (0.09, 0.05, 0.03)])        # BGR navy
    bg = bg * (1.25 - 0.9 * np.clip(r, 0, 0.75))[..., None]
    glow = np.exp(-(((xx - N * 0.5) / (N * 0.33)) ** 2 + ((yy - N * 0.52) / (N * 0.24)) ** 2))
    bg += glow[..., None] * np.array([0.30, 0.42, 0.06], np.float32) * 0.55
    rng = np.random.default_rng(3)
    for _ in range(26):                                                               # a few drifting gold motes
        px_, py_ = rng.uniform(140, N - 140), rng.uniform(140, N - 140)
        cv2.circle(bg, (int(px_), int(py_)), int(rng.uniform(2, 5)), (0.35, 0.75, 1.0), -1, lineType=cv2.LINE_AA)
    bg = cv2.GaussianBlur(bg, (0, 0), 1.2)
    # place the render: the turtle fills ~84% of the inside, a touch low
    a = full[..., 3]
    ys, xs = np.where(a > 0.02)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    sc = min((N - 2 * ins) * 0.86 / (bx1 - bx0), (N - 2 * ins) * 0.8 / (by1 - by0))
    ox = N / 2 - (bx0 + bx1) / 2 * sc
    oy = N * 0.53 - (by0 + by1) / 2 * sc
    M = np.float32([[sc, 0, ox], [0, sc, oy]])
    place = lambda im: cv2.warpAffine(im, M, (N, N), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
    full_p, body_p, head_p, jaw_p = map(place, (full, body, head, jaw))
    to = lambda pt: (pt[0] * sc + ox, pt[1] * sc + oy)
    # contact shadow under the body
    sh = np.zeros((N, N), np.float32)
    cv2.ellipse(sh, (int(N / 2 + 40), int(oy + by1 * sc - 30)), (int((bx1 - bx0) * sc * 0.42), 46), 0, 0, 360, 1, -1)
    sh = cv2.GaussianBlur(sh, (0, 0), 28) * 0.75
    scene = bg * (1 - sh[..., None])
    # an emerald halo round the silhouette, like the glow behind the others
    halo = cv2.GaussianBlur(full_p[..., 3], (0, 0), 22)
    scene = scene + halo[..., None] * np.array([0.35, 0.55, 0.08], np.float32) * 0.55
    # the thin inner line just inside the gold frame
    li, lr = ins + 7, rad - 7
    line = np.zeros((N, N), np.uint8)
    path = []
    for (cx, cy, a0) in ((N - li - lr, N - li - lr, 0), (li + lr, N - li - lr, 90), (li + lr, li + lr, 180), (N - li - lr, li + lr, 270)):
        path += [(int(cx + lr * np.cos(np.radians(a))), int(cy + lr * np.sin(np.radians(a)))) for a in range(a0, a0 + 91, 5)]
    cv2.polylines(line, [np.array(path, np.int32)], True, 255, 3, lineType=cv2.LINE_AA)
    line = cv2.GaussianBlur(line.astype(np.float32) / 255, (0, 0), 1.2)[..., None]
    scene = scene * (1 - line * 0.7) + np.array([0.55, 0.32, 0.18], np.float32) * line * 0.7
    def over(dst, src):
        al = src[..., 3:4]
        return dst * (1 - al) + src[..., :3] * al
    def bloom(src):
        lum = src[..., :3].max(axis=2) * src[..., 3]
        b = cv2.GaussianBlur(np.clip(lum - 0.72, 0, 1)[..., None] * src[..., :3], (0, 0), 14)
        return b * 0.9
    def framed(img):
        return np.clip(img * inner + frame * (1 - inner), 0, 1)
    whole = framed(over(scene, full_p) + bloom(full_p))
    base = framed(over(scene, body_p) + bloom(body_p))
    master = (whole * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(DOCS, 'turtley-master.png'), master)
    sizes, layout = {}, {'parts': {}}
    ra = rounded_alpha(BASE_PX)
    sizes['turtley.webp'] = (BASE_PX, BASE_PX, save_webp(os.path.join(OUT, 'turtley.webp'),
        np.dstack([cv2.resize((base * 255).astype(np.uint8), (BASE_PX, BASE_PX), interpolation=cv2.INTER_AREA), ra]), 86))
    sizes['turtley-sm.webp'] = (SMALL_PX, SMALL_PX, save_webp(os.path.join(OUT, 'turtley-sm.webp'),
        np.dstack([cv2.resize(master, (SMALL_PX, SMALL_PX), interpolation=cv2.INTER_AREA), rounded_alpha(SMALL_PX)]), 86))
    crop = (0, 0, N, N)
    for name, lay, pivot in (('head', head_p, to(pts['neck'])), ('jaw', jaw_p, to(pts['hinge']))):
        lay = lay.copy()
        lay[..., :3] = np.clip(lay[..., :3] + bloom(lay) * 0.6, 0, 1)
        al = lay[..., 3]
        ys, xs = np.where(al > 0.01)
        qx0, qy0, qx1, qy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        k = BASE_PX / N
        pw, ph = round((qx1 - qx0) * k), round((qy1 - qy0) * k)
        rgba = (lay[qy0:qy1, qx0:qx1] * 255).astype(np.uint8)
        rgba = cv2.resize(rgba, (pw, ph), interpolation=cv2.INTER_AREA)
        fn = f'turtley-{name}.webp'
        sizes[fn] = (pw, ph, save_webp(os.path.join(OUT, fn), rgba, 90))
        u0, u1, pu = to_u((qx0, qy0), crop), to_u((qx1, qy1), crop), to_u(pivot, crop)
        layout['parts'][name] = {'x': u0[0], 'y': u0[1], 'w': round(u1[0] - u0[0], 1), 'h': round(u1[1] - u0[1], 1),
                                 'px': pu[0], 'py': pu[1]}
    layout['beak'] = to_u(to(pts['beak']), crop)
    return layout, sizes


def main():
    os.makedirs(OUT, exist_ok=True)
    all_layout, all_sizes = {}, {}
    for pid, spec in PICTURES.items():
        all_layout[pid], sizes = build(pid, spec)
        all_sizes.update(sizes)
    all_layout['turtley'], sizes = build_turtley()
    all_sizes.update(sizes)
    for fn, (w, h, n) in sorted(all_sizes.items()):
        print(f'  art/avatars/{fn:34s} {w}x{h}  {n / 1024:.1f} KB')
    print(json.dumps(all_layout))


if __name__ == '__main__':
    main()
