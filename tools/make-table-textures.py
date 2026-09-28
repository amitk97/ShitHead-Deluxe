# Builds the free table surfaces art/tables/wood-tile.jpg and
# art/tables/felt-tile.jpg: procedural, photo-like, SEAMLESS tiles (plank
# grain with knots; woven felt fibres). Every noise layer wraps at the
# edges, so the game repeats a tile across the table at a fixed CSS size
# (TABLE_TILE_PX, 3x the pixels for sharp phones / PCs / 4K screens) instead
# of stretching one picture. Lighting (lamp, vignette) is CSS on top.
#   pip install numpy pillow && python3 tools/make-table-textures.py
import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

T = 1920  # tile side in pixels; drawn at 640 CSS px (3x)
OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'tables')
rng = np.random.default_rng(7)


def noise(h, w, gy, gx):
    """Smooth, seamless value noise: a gy x gx random grid, tiled 3x3,
    scaled up bicubically, middle cut out (so it wraps at every edge)."""
    grid = rng.random((gy, gx)).astype(np.float32)
    big = np.tile(grid, (3, 3))
    img = Image.fromarray((big * 255).astype(np.uint8)).resize((w * 3, h * 3), Image.BICUBIC)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return arr[h:2 * h, w:2 * w]


def fractal(h, w, gy, gx, octaves=4, gain=0.5):
    total, amp, norm = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(octaves):
        total += amp * noise(h, w, gy * 2 ** o, gx * 2 ** o)
        norm += amp
        amp *= gain
    return total / norm


def wrap_blur(arr, radius):
    """Gaussian blur that wraps round the edges (keeps the tile seamless)."""
    h, w = arr.shape[:2]
    pad = int(radius * 4) + 2
    padded = np.pad(arr, ((pad, pad), (pad, pad)) + ((0, 0),) * (arr.ndim - 2), mode='wrap')
    img = Image.fromarray(np.clip(padded, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(img, np.float32)[pad:pad + h, pad:pad + w].copy()


def save(rgb, name, quality):
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(OUT, name), quality=quality, optimize=True, progressive=True)


def wood():
    W = H = T
    planks = 5
    pw = W // planks
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    out = np.zeros((H, W, 3), np.float32)
    tones = [(150, 96, 55), (136, 85, 47), (160, 104, 60), (128, 79, 43), (145, 92, 52)]
    for p in range(planks):
        x0, x1 = p * pw, (p + 1) * pw if p < planks - 1 else W
        xs = x[:, x0:x1] - x0
        yy = y[:, x0:x1]
        h, w = xs.shape
        warp = (fractal(h, w, 4, 2, 3) - 0.5) * 150 + (fractal(h, w, 24, 3, 2) - 0.5) * 15
        g = (xs + warp) * rng.uniform(0.033, 0.05) + fractal(h, w, 2, 2, 2) * 6
        ring = g - np.floor(g)
        late = np.clip((ring - 0.72) / 0.28, 0, 1) ** 1.5
        strength = 0.55 + 0.45 * noise(h, w, 3, 14)
        rings = late * strength
        # A knot now and then, kept clear of the tile's top/bottom edges.
        for _ in range(int(rng.integers(0, 2))):
            kx, ky = rng.uniform(0.3, 0.7) * w, rng.uniform(0.2, 0.8) * h
            r = np.sqrt((xs - kx) ** 2 + ((yy - ky) * 0.5) ** 2)
            k = np.exp(-r / 47)
            kr = (r * 0.1) % 1
            rings = rings * (1 - k) + (np.clip((kr - 0.6) / 0.4, 0, 1) ** 1.5) * k
            rings += 0.6 * np.exp(-r / 13)
        streaks = noise(h, w, 6, w // 4) * 0.55 + noise(h, w, 20, w // 2) * 0.45
        pores = (rng.random((h, w)) < 0.02) * rng.random((h, w))
        tone = np.array(tones[p], np.float32) * rng.uniform(0.95, 1.05)
        shade = (0.86 + 0.16 * (fractal(h, w, 4, 2, 3) - 0.5)
                 - 0.30 * rings + 0.20 * (streaks - 0.5) - 0.12 * pores)
        col = tone[None, None, :] * shade[..., None]
        col[..., 2] -= rings * 10
        out[:, x0:x1] = col
    out = wrap_blur(out, 1.1)
    # Plank seams (a tile edge is also a seam, so the repeat reads as boards).
    for p in range(planks):
        sx = p * pw
        out[:, (sx - 4) % W:(sx - 4) % W + 4] *= 0.35
        out[:, sx:sx + 2] *= 0.55
        out[:, sx + 2:sx + 5] *= 1.10
    for p in range(planks):
        x0, x1 = p * pw, (p + 1) * pw if p < planks - 1 else W
        jy = int(rng.uniform(0.15, 0.85) * H)
        out[jy - 2:jy + 2, x0:x1] *= 0.4
        out[jy + 2:jy + 4, x0:x1] *= 1.1
    save(out, 'wood-tile.jpg', 82)


def felt():
    W = H = T
    base = np.array([38, 104, 64], np.float32)
    mottle = fractal(H, W, 5, 5, 3)
    raw = rng.random((H, W)).astype(np.float32) * 255
    fine = wrap_blur(raw, 1.2) / 255
    fuzz = noise(H, W, H // 6, W // 6)
    # Short loose fibres in random directions, drawn wrapped round the edges.
    fib = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(fib)
    for _ in range(95000):
        fx, fy = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, np.pi)
        L = rng.uniform(5, 14)
        c = int(rng.uniform(60, 200))
        ex, ey = np.cos(a) * L, np.sin(a) * L
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                if (0 <= fx + ox <= W or 0 <= fx + ox + ex <= W) and (0 <= fy + oy <= H or 0 <= fy + oy + ey <= H):
                    d.line([(fx + ox, fy + oy), (fx + ox + ex, fy + oy + ey)], fill=c, width=1)
    fib = wrap_blur(np.asarray(fib, np.float32), 0.7) / 255
    shade = (0.92 + 0.10 * (mottle - 0.5) + 0.34 * (fine - 0.5)
             + 0.16 * (fuzz - 0.5) + 0.22 * fib)
    specks = rng.random((H, W))
    shade = np.where(specks < 0.002, shade - 0.3, shade)
    col = base[None, None, :] * shade[..., None]
    col[..., 1] += (mottle - 0.5) * 8
    save(col, 'felt-tile.jpg', 80)


wood()
felt()
for n in ('wood-tile.jpg', 'felt-tile.jpg'):
    print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, 'KB')
