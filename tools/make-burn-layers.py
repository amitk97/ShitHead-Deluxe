"""Painted-art burn layers: cuts the owner's approved burn tiles (sources in
docs/avatar-art/src/) into transparent layers for art/burns/level-3d/burns3d.js.
layers.webp = two slots side by side (slot 0 left, slot 1 right). The painted
cards are removed and their gap filled with the surrounding art, because the
game burns the real pile card in front; every edge fades softly. Also writes
the Shop/Custom tile. Needs numpy, pillow, opencv-python-headless.
Run: python3 tools/make-burn-layers.py [ghost-flames|smoke-burst|royal-incineration|hellfire-spiral|shitstorm]"""
import sys
from PIL import Image
import numpy as np, cv2

ss = lambda e0, e1, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - e0) / (e1 - e0), 0, 1))

def cut(src, mask, alpha_lo, alpha_hi, slots, out, scale=2, patch=None):
    """slots: two functions (yy, xx, hole) -> alpha multiplier. patch: an image
    to fill the card gaps with (real texture, not a blur)."""
    H, W, _ = src.shape
    yy = np.repeat((np.arange(H) / H)[:, None], W, 1)
    xx = np.repeat((np.arange(W) / W)[None, :], H, 0)
    f = cv2.inpaint(src, mask, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
    if patch is not None:
        m = cv2.GaussianBlur(mask.astype(np.float32) / 255, (41, 41), 0)[..., None]
        f = f * (1 - m) + (patch.astype(np.float32) / 255) * m
        mask = np.zeros_like(mask)
    alpha = ss(alpha_lo, alpha_hi, f.max(2))
    hole = cv2.GaussianBlur(mask.astype(np.float32) / 255, (31, 31), 0)
    atlas = Image.new('RGBA', (W * scale * 2, H * scale))
    for i, fn in enumerate(slots):
        a = alpha * fn(yy, xx, hole)
        col = np.clip(f / np.maximum(a[..., None], .3), 0, 1)  # un-premultiply off the dark ground
        atlas.paste(Image.fromarray((np.dstack([col, a]) * 255).astype(np.uint8), 'RGBA').resize((W * scale, H * scale), Image.LANCZOS), (i * W * scale, 0))
    atlas.save(out, quality=92)
    print(out, atlas.size)

def ghost_flames():
    src = np.asarray(Image.open('docs/avatar-art/src/burn-ghost-flames.webp').convert('RGB'))
    Image.fromarray(src).resize((384, 282), Image.LANCZOS).save('art/burns/ghost-flames/tile.webp', quality=90)
    src = src[4:-4, 4:-4]  # drop the gold frame
    im = src.astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mx, mn = im.max(2), im.min(2)
    sat = (mx - mn) / (mx + 1e-5)
    H, W = mx.shape
    yy, xx = np.mgrid[0:H, 0:W] / [[[H]], [[W]]]
    zone = (xx > .33) & (xx < .84) & (yy > .40)  # where the painted cards sit
    cards = (((mn > .5) & (sat < .35)) | ((r > g * 1.2) & (r > b * 1.15) & (mx > .25))) & zone
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    mask = cv2.dilate(cv2.morphologyEx(cards.astype(np.uint8) * 255, cv2.MORPH_CLOSE, k, iterations=2), k)
    # Soft edges all round: in the game the smoke must fade out, never stop at a picture edge.
    edge = lambda yy, xx: ss(0, .14, xx) * ss(0, .14, 1 - xx) * ss(0, .1, yy) * ss(0, .12, 1 - yy)
    cut(src, mask, .07, .40, [lambda yy, xx, h: edge(yy, xx) * (1 - ss(.5, .82, yy)),            # the wraith
                              lambda yy, xx, h: edge(yy, xx) * ss(.42, .72, yy) * (1 - h)],     # the fire bank
        'art/burns/ghost-flames/layers.webp')

def smoke_burst():
    full = Image.open('docs/avatar-art/src/burn-smoke-burst.webp').convert('RGB')
    full.crop((16, 16, 471, 422)).resize((384, 343), Image.LANCZOS).save('art/burns/smoke-burst/tile.webp', quality=90)
    src = np.asarray(full)[18:422, 30:469]  # inside the gold frame
    H, W, _ = src.shape
    # The painted Aces (hand-traced, source pixels inside the frame), each with the
    # offset of a clean patch of smoke beside it that fills its gap; small fragments stay.
    cards = [([(108, 126), (204, 102), (241, 203), (226, 233), (136, 238)], (150, 0)),
             ([(89, 158), (121, 146), (136, 226), (104, 228)], (250, 0)),
             ([(48, 191), (91, 180), (104, 230), (61, 238)], (310, 0)),
             ([(316, 253), (401, 288), (406, 318), (376, 338), (311, 298)], (-140, 0)),
             ([(36, 303), (83, 298), (81, 343), (41, 358)], (100, 0))]
    mask = np.zeros((H, W), np.uint8)
    patch = src.copy()
    for p, (dx, dy) in cards:
        one = np.zeros((H, W), np.uint8)
        cv2.fillPoly(one, [np.array(p, np.int32)], 255)
        wide = cv2.dilate(one, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))
        patch[wide > 0] = np.roll(src, (-dy, -dx), (0, 1))[wide > 0]
        mask |= cv2.dilate(one, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    # A whole, contained cloud: an ellipse fade instead of the picture's square edge.
    # The edge is lumpy like a real cloud (low-frequency noise on the radius), not a vignette.
    lump = cv2.resize(np.random.default_rng(7).random((5, 5)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    oval = lambda yy, xx: 1 - ss(.72, .98, np.hypot((xx - .5) / .5, (yy - .5) / .5) * (1.28 - .24 * lump))
    cut(src, mask, .2, .55, [lambda yy, xx, h: oval(yy, xx),                                      # the cloud
                             lambda yy, xx, h: oval(yy, xx) * ss(.58, .8, yy)],                   # front puffs
        'art/burns/smoke-burst/layers.webp', patch=patch)

def save_atlas(layers, out, scale=2):
    """layers: two (rgb 0..1, alpha 0..1) pairs, written side by side."""
    H, W, _ = layers[0][0].shape
    atlas = Image.new('RGBA', (W * scale * 2, H * scale))
    for i, (col, a) in enumerate(layers):
        atlas.paste(Image.fromarray((np.dstack([np.clip(col, 0, 1), np.clip(a, 0, 1)]) * 255).astype(np.uint8), 'RGBA').resize((W * scale, H * scale), Image.LANCZOS), (i * W * scale, 0))
    atlas.save(out, quality=92)
    print(out, atlas.size)

def royal_incineration():
    full = Image.open('docs/avatar-art/src/burn-royal-incineration.webp').convert('RGB')
    full.crop((32, 18, 476, 466)).resize((384, 387), Image.LANCZOS).save('art/burns/royal-incineration/tile.webp', quality=90)
    X0, Y0 = 38, 24
    src = np.asarray(full)[Y0:460, X0:470]  # inside the gold frame
    H, W, _ = src.shape
    yy, xx = np.mgrid[0:H, 0:W] / [[[H]], [[W]]]
    poly = lambda pts: np.array([(x - X0, y - Y0) for x, y in pts], np.int32)
    # The crown, traced by hand (source pixels): a solid layer of its own, whole.
    crown = np.zeros((H, W), np.uint8)
    cv2.fillPoly(crown, [poly([(85, 96), (105, 95), (118, 62), (128, 60), (140, 72), (150, 78), (168, 90), (185, 84), (195, 88), (215, 80),
                               (225, 58), (240, 45), (250, 31), (260, 45), (275, 58), (285, 80), (305, 88), (315, 84), (332, 90), (350, 78),
                               (362, 72), (374, 60), (384, 62), (395, 90), (426, 97), (419, 130), (411, 165), (398, 192), (392, 225),
                               (350, 237), (250, 242), (150, 237), (113, 226), (105, 198), (94, 170), (83, 135), (78, 100)])], 255)
    # The painted Aces: filled with the charred debris and burning fragments from the bottom of the
    # same painting (mirrored and tiled), so their place reads as more of the burning wreckage.
    cards = [[(180, 240), (235, 240), (280, 300), (272, 330), (240, 357), (210, 355), (195, 310)],
             [(147, 267), (185, 250), (197, 310), (165, 340), (150, 325)],
             [(107, 292), (145, 285), (160, 335), (125, 345)],
             [(60, 285), (75, 265), (112, 282), (100, 317), (65, 302)],
             [(340, 307), (400, 302), (405, 317), (385, 355), (345, 345)],
             [(410, 257), (435, 245), (452, 260), (430, 285), (412, 275)],
             [(65, 340), (120, 345), (125, 375), (70, 372)],
             [(390, 385), (445, 365), (452, 375), (410, 397)],
             [(410, 327), (437, 322), (440, 337), (415, 342)]]
    band = src[375 - Y0:452 - Y0, 45 - X0:385 - X0]
    f = src.astype(np.float32) / 255
    rng = np.random.default_rng(5)
    for c in cards:
        one = np.zeros((H, W), np.uint8)
        cv2.fillPoly(one, [poly(c)], 255)
        one = cv2.dilate(one, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        ys, xs = np.nonzero(one)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        k = max(1, (y1 - y0) / (band.shape[0] - 4))  # big gaps take a closer (larger) look at the wreckage
        bw, bh = int((x1 - x0) / k) + 1, int((y1 - y0) / k) + 1
        bx = rng.integers(0, band.shape[1] - bw)
        piece = cv2.resize(band[:bh, bx:bx + bw], (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255
        m = cv2.GaussianBlur(one.astype(np.float32) / 255, (17, 17), 0)[y0:y1, x0:x1, None]
        f[y0:y1, x0:x1] = f[y0:y1, x0:x1] * (1 - m) + piece * m
    # Under the crown: its own glow (inpainted), so the fire behind it never shows a hole.
    cm = cv2.dilate(crown, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    behind = cv2.inpaint((f * 255).astype(np.uint8), cm, 15, cv2.INPAINT_TELEA).astype(np.float32) / 255
    soft = cv2.GaussianBlur(crown.astype(np.float32) / 255, (7, 7), 0)
    # The burst: alpha from brightness (the dark sky goes clear), inside a lumpy outline.
    noise = lambda n, seed: cv2.resize(np.random.default_rng(seed).random((n, n)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    lump = .65 * noise(5, 11) + .35 * noise(13, 12)
    r = np.hypot((xx - .5) / .52, (yy - .52) / .5) * (1.25 - .32 * lump)
    burst = (1 - ss(.5, 1.0, r)) * ss(0, .06, yy) * (1 - ss(.86, 1, yy))
    halo = cv2.GaussianBlur(cm.astype(np.float32) / 255, (31, 31), 0)
    bright = ss(.1, .5, behind.max(2))
    fire_a = bright * burst * (1 - .45 * halo)
    fire = np.clip(behind / np.maximum(bright[..., None], .3), 0, 1)  # un-premultiply by the brightness only
    crown_a = soft
    save_atlas([(f, crown_a), (fire, fire_a)], 'art/burns/royal-incineration/layers.webp')

def patch_match(f, mask, polys, reach=90, step=6):
    """Fills each polygon with the shifted patch of the same picture whose border best
    matches the polygon's surroundings (and holds none of the other polygons)."""
    H, W, _ = f.shape
    out = f.copy()
    for p in polys:
        one = np.zeros((H, W), np.uint8)
        cv2.fillPoly(one, [p], 255)
        one = cv2.dilate(one, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
        ring = (cv2.dilate(one, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))) > 0) & (one == 0)
        ys, xs = np.nonzero(one)
        best, r = None, reach
        while best is None:  # nothing clean in reach (a big card near an edge): look twice as far
            for dy in range(-r, r + 1, step):
                for dx in range(-r, r + 1, step):
                    if abs(dx) + abs(dy) < 20: continue
                    sy, sx = ys + dy, xs + dx
                    if sy.min() < 0 or sx.min() < 0 or sy.max() >= H or sx.max() >= W or mask[sy, sx].any(): continue
                    ry, rx = np.nonzero(ring); qy, qx = np.clip(ry + dy, 0, H - 1), np.clip(rx + dx, 0, W - 1)
                    cost = np.abs(f[qy, qx] - f[ry, rx]).mean()
                    if best is None or cost < best[0]: best = (cost, dy, dx)
            r *= 2
        _, dy, dx = best
        m = cv2.GaussianBlur(one.astype(np.float32) / 255, (15, 15), 0)[..., None]
        out = out * (1 - m) + np.roll(f, (-dy, -dx), (0, 1)) * m
    return out

def hellfire_spiral():
    full = Image.open('docs/avatar-art/src/burn-hellfire-spiral.webp').convert('RGB')
    full.crop((10, 6, 456, 462)).resize((384, 393), Image.LANCZOS).save('art/burns/hellfire-spiral/tile.webp', quality=90)
    src = np.asarray(full)[12:456, 16:450]  # inside the gold frame
    H, W, _ = src.shape
    yy, xx = np.mgrid[0:H, 0:W] / [[[H]], [[W]]]
    # The painted cards caught in the vortex (hand-traced, pixels inside the frame), each filled
    # with the best-matching nearby patch of the same tornado.
    cards = [np.array(c, np.int32) for c in [[(107, 67), (145, 44), (181, 97), (169, 126), (142, 126)],
             [(85, 162), (114, 141), (134, 196), (121, 224), (99, 212)],
             [(126, 205), (153, 191), (179, 210), (176, 265), (155, 265), (146, 252)],
             [(276, 154), (301, 145), (316, 165), (303, 179), (281, 174)],
             [(389, 192), (416, 202), (422, 226), (406, 254), (385, 241)],
             [(48, 174), (66, 176), (70, 196), (54, 198)],
             [(33, 310), (55, 278), (76, 304), (71, 351), (46, 351)],
             [(64, 303), (81, 298), (136, 318), (145, 397), (119, 400), (80, 374)],
             [(303, 280), (361, 250), (367, 280), (347, 322), (318, 322)],
             [(343, 320), (396, 288), (406, 320), (376, 352)],
             [(328, 350), (376, 333), (382, 361), (345, 382)],
             [(374, 354), (421, 348), (424, 376), (379, 379)],
             [(338, 119), (361, 120), (361, 141), (341, 142)]]]
    mask = np.zeros((H, W), np.uint8)
    for c in cards: cv2.fillPoly(mask, [c], 255)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    f = patch_match(src.astype(np.float32) / 255, mask, cards)
    # A whole funnel: wide, ragged top that fades out inside the picture, narrowing to the base;
    # the dark smoke round it stays faintly, every edge soft.
    noise = lambda n, seed: cv2.resize(np.random.default_rng(seed).random((n, n)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    lump = .6 * noise(5, 21) + .4 * noise(11, 22)
    half = .48 - .16 * yy + .14 * (lump - .5)  # funnel half-width by height
    top = .02 + .16 * ((xx - .5) / .5) ** 2 + .08 * lump  # a rounded, ragged crown to the funnel
    funnel = (1 - ss(.6, 1.05, np.abs(xx - .5) / half)) * ss(top, top + .16, yy) * (1 - ss(.9, 1, yy))
    bright = ss(.02, .24, f.max(2))  # the dark magma bands stay solid
    col = np.clip(f / np.maximum(bright[..., None], .3), 0, 1)
    front = funnel * ss(.84, .92, yy) * (1 - ss(.97, 1, yy))  # the rubble at the base, in front of the card
    save_atlas([(col, bright * funnel), (col, bright * front)], 'art/burns/hellfire-spiral/layers.webp')

def shitstorm():
    full = Image.open('docs/avatar-art/src/burn-shitstorm.webp').convert('RGB')
    full.crop((16, 12, 462, 466)).resize((384, 391), Image.LANCZOS).save('art/burns/shitstorm/tile.webp', quality=90)
    X0, Y0 = 22, 18
    src = np.asarray(full)[Y0:460, X0:456]  # inside the gold frame
    H, W, _ = src.shape
    yy, xx = np.mgrid[0:H, 0:W] / [[[H]], [[W]]]
    poly = lambda pts: np.array([(x - X0, y - Y0) for x, y in pts], np.int32)
    # The painted cards in the storm (hand-traced, source pixels), filled by the best nearby patch.
    cards = [poly(c) for c in [[(66, 38), (96, 22), (118, 55), (92, 76)],
             [(113, 85), (165, 74), (177, 130), (125, 142)],
             [(37, 151), (61, 147), (66, 177), (42, 181)],
             [(300, 40), (345, 24), (367, 96), (320, 107)],
             [(348, 113), (432, 123), (427, 217), (358, 207)],
             [(74, 169), (113, 171), (119, 211), (79, 212)],
             [(39, 219), (69, 219), (70, 251), (41, 251)],
             [(68, 262), (110, 243), (147, 300), (126, 347), (79, 311)],
             [(30, 305), (60, 286), (127, 317), (111, 347), (38, 332)],
             [(214, 314), (241, 313), (242, 344), (215, 345)],
             [(365, 265), (427, 248), (434, 262), (390, 297)],
             [(358, 330), (411, 308), (420, 330), (381, 377), (360, 366)],
             [(62, 410), (150, 378), (163, 395), (104, 428), (64, 425)],
             [(149, 419), (206, 417), (206, 443), (150, 443)]]]
    mask = np.zeros((H, W), np.uint8)
    for c in cards: cv2.fillPoly(mask, [c], 255)
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    # The face, exactly as painted, on its own solid layer (the body swirls under it, the face never warps).
    face = np.zeros((H, W), np.uint8)
    cv2.fillPoly(face, [poly([(200, 138), (240, 126), (300, 133), (347, 148), (348, 190), (332, 232), (300, 257), (250, 264), (208, 247), (196, 200)])], 255)
    f = patch_match(src.astype(np.float32) / 255, mask | cv2.dilate(face, np.ones((25, 25), np.uint8)), cards)  # never clone the face
    face = cv2.GaussianBlur(face.astype(np.float32) / 255, (15, 15), 0)
    noise = lambda n, seed: cv2.resize(np.random.default_rng(seed).random((n, n)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
    lump = .6 * noise(5, 31) + .4 * noise(11, 32)
    half = .5 - .12 * yy + .14 * (lump - .5)
    top = .03 + .14 * ((xx - .5) / .5) ** 2 + .07 * lump
    storm = (1 - ss(.6, 1.05, np.abs(xx - .5) / half)) * ss(top, top + .15, yy) * (1 - ss(.9, 1, yy))
    bright = ss(.06, .3, f.max(2))
    col = np.clip(f / np.maximum(bright[..., None], .3), 0, 1)
    save_atlas([(col, bright * storm), (src.astype(np.float32) / 255, face)], 'art/burns/shitstorm/layers.webp')

{'ghost-flames': ghost_flames, 'smoke-burst': smoke_burst, 'royal-incineration': royal_incineration, 'hellfire-spiral': hellfire_spiral, 'shitstorm': shitstorm}[sys.argv[1] if len(sys.argv) > 1 else 'smoke-burst']()
