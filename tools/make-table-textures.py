# Builds the free table surfaces art/tables/wood.jpg and art/tables/felt.jpg:
# procedural, photo-like textures (plank grain with knots; woven felt fibres).
#   pip install numpy pillow && python3 tools/make-table-textures.py
import os
import numpy as np
from PIL import Image, ImageFilter

W, H = 900, 1600  # portrait, drawn center/cover on the table
OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'tables')
rng = np.random.default_rng(7)


def noise(h, w, gy, gx):
    """Smooth value noise: a gy x gx random grid scaled up bicubically."""
    grid = rng.random((gy, gx)).astype(np.float32)
    img = Image.fromarray((grid * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def fractal(h, w, gy, gx, octaves=4, gain=0.5):
    total, amp, norm = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(octaves):
        total += amp * noise(h, w, gy * 2 ** o, gx * 2 ** o)
        norm += amp
        amp *= gain
    return total / norm


def save(rgb, name, quality):
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(OUT, name), quality=quality, optimize=True, progressive=True)


def vignette(h, w, strength):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2)
    return 1 - strength * np.clip(d - 0.35, 0, None) ** 1.6


def wood():
    planks = 5
    pw = W // planks
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    out = np.zeros((H, W, 3), np.float32)
    # Warm, natural oak/walnut tones, each plank a little different.
    tones = [(150, 96, 55), (136, 85, 47), (160, 104, 60), (128, 79, 43), (145, 92, 52)]
    for p in range(planks):
        x0, x1 = p * pw, (p + 1) * pw if p < planks - 1 else W
        xs = x[:, x0:x1] - x0
        yy = y[:, x0:x1]
        h, w = xs.shape
        # Gentle drift along the board, tiny wobble: straight-cut grain.
        warp = (fractal(h, w, 4, 2, 3) - 0.5) * 70 + (fractal(h, w, 24, 3, 2) - 0.5) * 7
        g = (xs + warp) * rng.uniform(0.07, 0.11) + fractal(h, w, 2, 2, 2) * 6
        # Growth rings: wide light early-wood, a thin dark late-wood line.
        ring = g - np.floor(g)
        late = np.clip((ring - 0.72) / 0.28, 0, 1) ** 1.5
        # Some rings are stronger than others.
        strength = 0.55 + 0.45 * noise(h, w, 3, 14)
        rings = late * strength
        # Knots: rings flow round a few centres.
        for _ in range(int(rng.integers(0, 2))):
            kx, ky = rng.uniform(0.3, 0.7) * w, rng.uniform(0.1, 0.9) * h
            r = np.sqrt((xs - kx) ** 2 + ((yy - ky) * 0.5) ** 2)
            k = np.exp(-r / 22)
            kr = (r * 0.22) % 1
            rings = rings * (1 - k) + (np.clip((kr - 0.6) / 0.4, 0, 1) ** 1.5) * k
            rings += 0.6 * np.exp(-r / 6)
        # Pores and fine streaks along the length.
        streaks = noise(h, w, 6, w // 2) * 0.55 + noise(h, w, 20, w) * 0.45
        pores = (rng.random((h, w)) < 0.02) * rng.random((h, w))
        tone = np.array(tones[p], np.float32) * rng.uniform(0.95, 1.05)
        shade = (0.80 + 0.16 * (fractal(h, w, 4, 2, 3) - 0.5)
                 - 0.30 * rings + 0.20 * (streaks - 0.5) - 0.12 * pores)
        col = tone[None, None, :] * shade[..., None]
        col[..., 2] -= rings * 10  # late wood is warmer/darker
        out[:, x0:x1] = col
    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    out = np.asarray(img, np.float32).copy()
    # Plank seams: dark groove with a lit edge.
    for p in range(1, planks):
        sx = p * pw
        out[:, sx - 2:sx] *= 0.35
        out[:, sx:sx + 1] *= 0.55
        out[:, sx + 1:sx + 3] *= 1.10
    # Butt joints staggered along each plank.
    for p in range(planks):
        x0, x1 = p * pw, (p + 1) * pw if p < planks - 1 else W
        for jy in {int(rng.uniform(0.15, 0.85) * H)}:
            out[jy - 1:jy + 1, x0:x1] *= 0.4
            out[jy + 1:jy + 2, x0:x1] *= 1.1
    # Varnish: a soft, wide highlight and a gentle vignette.
    sheen = np.exp(-(((x - W * 0.4) / (W * 0.6)) ** 2 + ((y - H * 0.38) / (H * 0.55)) ** 2))
    out = out * (0.86 + 0.26 * sheen[..., None]) * vignette(H, W, 0.5)[..., None]
    save(out, 'wood.jpg', 80)


def felt():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    # Classic card-table baize: deep, natural green.
    base = np.array([38, 104, 64], np.float32)
    mottle = fractal(H, W, 5, 3, 3)                          # uneven dye
    # Felt pile: dense, fine fibre fuzz at a couple of pixel scales.
    raw = rng.random((H, W)).astype(np.float32)
    fine = np.asarray(Image.fromarray((raw * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), np.float32) / 255
    fuzz = noise(H, W, H // 4, W // 4)
    # Short loose fibres lying in random directions.
    fib = Image.new('L', (W, H), 0)
    from PIL import ImageDraw
    d = ImageDraw.Draw(fib)
    for _ in range(26000):
        fx, fy = rng.uniform(0, W), rng.uniform(0, H)
        a = rng.uniform(0, np.pi)
        L = rng.uniform(3, 9)
        d.line([(fx, fy), (fx + np.cos(a) * L, fy + np.sin(a) * L)], fill=int(rng.uniform(60, 200)), width=1)
    fib = np.asarray(fib.filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255
    shade = (0.80 + 0.10 * (mottle - 0.5) + 0.34 * (fine - 0.5)
             + 0.16 * (fuzz - 0.5) + 0.22 * fib)
    specks = rng.random((H, W))
    shade = np.where(specks < 0.002, shade - 0.3, shade)
    col = base[None, None, :] * shade[..., None]
    col[..., 1] += (mottle - 0.5) * 8
    # Overhead lamp: a pool of light in the middle, falling off to the rail.
    lamp = np.exp(-(((x - W / 2) / (W * 0.7)) ** 2 + ((y - H * 0.47) / (H * 0.55)) ** 2))
    col = col * (0.72 + 0.4 * lamp[..., None]) * vignette(H, W, 0.45)[..., None]
    save(col, 'felt.jpg', 82)


wood()
felt()
for n in ('wood.jpg', 'felt.jpg'):
    print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, 'KB')
