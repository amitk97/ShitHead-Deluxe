"""Painted-art burn layers: cuts the owner's approved burn tiles (sources in
docs/avatar-art/src/) into transparent layers for art/burns/level-3d/burns3d.js.
layers.webp = two slots side by side (slot 0 left, slot 1 right). The painted
cards are removed and their gap filled with the surrounding art, because the
game burns the real pile card in front; every edge fades softly. Also writes
the Shop/Custom tile. Needs numpy, pillow, opencv-python-headless.
Run: python3 tools/make-burn-layers.py [ghost-flames|smoke-burst]"""
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

{'ghost-flames': ghost_flames, 'smoke-burst': smoke_burst}[sys.argv[1] if len(sys.argv) > 1 else 'smoke-burst']()
