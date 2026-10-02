"""Ghost Flames burn art: cuts the owner's approved tile
(docs/avatar-art/src/burn-ghost-flames.webp) into two transparent layers for
art/burns/level-3d/burns3d.js: the wraith (left half of layers.webp) and the
spectral fire bank (right half). The painted cards are removed and their gap
filled with smoke, because the game burns the real pile cards in front.
Also writes the Shop/Custom tile. Needs numpy, pillow, opencv-python-headless.
Run: python3 tools/make-ghost-flames.py"""
from PIL import Image
import numpy as np, cv2

src = np.asarray(Image.open('docs/avatar-art/src/burn-ghost-flames.webp').convert('RGB'))
Image.fromarray(src).resize((384, 282), Image.LANCZOS).save('art/burns/ghost-flames/tile.webp', quality=90)
src = src[4:-4, 4:-4]  # drop the gold frame
H, W, _ = src.shape
im = src.astype(np.float32) / 255
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(2), im.min(2)
sat = (mx - mn) / (mx + 1e-5)
ss = lambda e0, e1, x: (lambda t: t * t * (3 - 2 * t))(np.clip((x - e0) / (e1 - e0), 0, 1))
yy = np.repeat((np.arange(H) / H)[:, None], W, 1)
xx = np.repeat((np.arange(W) / W)[None, :], H, 0)
zone = (xx > .33) & (xx < .84) & (yy > .40)  # where the painted cards sit
cards = (((mn > .5) & (sat < .35)) | ((r > g * 1.2) & (r > b * 1.15) & (mx > .25))) & zone
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
mask = cv2.dilate(cv2.morphologyEx(cards.astype(np.uint8) * 255, cv2.MORPH_CLOSE, k, iterations=2), k)
f = cv2.inpaint(src, mask, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255
alpha = ss(.07, .40, f.max(2))
hole = cv2.GaussianBlur(mask.astype(np.float32) / 255, (31, 31), 0)

def layer(a):
    col = np.clip(f / np.maximum(a[..., None], .3), 0, 1)  # un-premultiply off the dark ground
    return Image.fromarray((np.dstack([col, a]) * 255).astype(np.uint8), 'RGBA').resize((W * 2, H * 2), Image.LANCZOS)

# Soft edges all round: in the game the smoke must fade out, never stop at a picture edge.
edge = ss(0, .14, xx) * ss(0, .14, 1 - xx) * ss(0, .1, yy) * ss(0, .12, 1 - yy)
ghost = layer(alpha * edge * (1 - ss(.5, .82, yy)))
fire = layer(alpha * edge * ss(.42, .72, yy) * (1 - hole))
atlas = Image.new('RGBA', (W * 4, H * 2))
atlas.paste(ghost, (0, 0)); atlas.paste(fire, (W * 2, 0))
atlas.save('art/burns/ghost-flames/layers.webp', quality=92)
print('layers.webp', atlas.size)
