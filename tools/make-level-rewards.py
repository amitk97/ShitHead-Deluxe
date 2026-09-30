#!/usr/bin/env python3
"""Level-reward art (v248): the free cosmetics that unlock with levels.

  art/backs/rising-star.svg   Rising Star card back (Lvl 15)
  art/tables/summit.svg       Summit table (Lvl 50)

Pure vector (sharp on 4K). Deterministic: the same file every run.
Usage: python3 tools/make-level-rewards.py
"""
import math
import os
import random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def f(n):
    return f"{n:.1f}".rstrip('0').rstrip('.')


def star_points(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for i in range(n * 2):
        a = math.radians(rot + i * 180 / n)
        rad = R if i % 2 == 0 else r
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts


def sparkle(x, y, s, fill, opacity=1):
    return (f'<path d="M{f(x)} {f(y - 4 * s)}Q{f(x + .6 * s)} {f(y - .6 * s)} {f(x + 4 * s)} {f(y)}'
            f'Q{f(x + .6 * s)} {f(y + .6 * s)} {f(x)} {f(y + 4 * s)}Q{f(x - .6 * s)} {f(y + .6 * s)} {f(x - 4 * s)} {f(y)}'
            f'Q{f(x - .6 * s)} {f(y - .6 * s)} {f(x)} {f(y - 4 * s)}Z" fill="{fill}" opacity="{opacity}"/>')


def rising_star():
    rnd = random.Random(15)
    W, H, cx, cy = 100, 140, 50, 62
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">',
           '<defs>',
           '<radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#312e81"/>'
           '<stop offset=".45" stop-color="#1e1b4b"/><stop offset="1" stop-color="#05030f"/></radialGradient>',
           '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7d6" stop-opacity=".95"/>'
           '<stop offset=".3" stop-color="#fbbf24" stop-opacity=".45"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>',
           '<radialGradient id="rayfade" cx=".5" cy=".44" r=".55"><stop offset="0" stop-color="#fff" stop-opacity="1"/>'
           '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>',
           '<mask id="raymask"><rect width="100" height="140" fill="url(#rayfade)"/></mask>',
           '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef3c7"/>'
           '<stop offset=".35" stop-color="#fbbf24"/><stop offset=".7" stop-color="#d97706"/><stop offset="1" stop-color="#fde68a"/></linearGradient>',
           '<linearGradient id="lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbeb"/>'
           '<stop offset="1" stop-color="#fbbf24"/></linearGradient>',
           '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b"/>'
           '<stop offset="1" stop-color="#92400e"/></linearGradient>',
           '<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fde68a"/>'
           '<stop offset=".5" stop-color="#f59e0b"/><stop offset="1" stop-color="#78350f"/></linearGradient>',
           '<linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed"/>'
           '<stop offset="1" stop-color="#3b0764"/></linearGradient>',
           '<filter id="bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/>'
           '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
           '</defs>',
           f'<rect width="{W}" height="{H}" fill="url(#bg)"/>']
    # Sunburst rays, fading out from the star.
    rays = []
    for i in range(36):
        a0 = math.radians(i * 10)
        a1 = math.radians(i * 10 + 4.2)
        L = 120
        rays.append(f'M{cx} {cy}L{f(cx + L * math.cos(a0))} {f(cy + L * math.sin(a0))}L{f(cx + L * math.cos(a1))} {f(cy + L * math.sin(a1))}Z')
    out.append(f'<path d="{"".join(rays)}" fill="#fbbf24" opacity=".16" mask="url(#raymask)"/>')
    # Star dust.
    for _ in range(46):
        x, y = rnd.uniform(6, 94), rnd.uniform(6, 134)
        if math.hypot(x - cx, y - cy) < 30:
            continue
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rnd.uniform(.25, .7))}" fill="#e0e7ff" opacity="{f(rnd.uniform(.35, .9))}"/>')
    # Ornamental border with corner gems.
    out.append('<rect x="4.5" y="4.5" width="91" height="131" rx="6" fill="none" stroke="url(#gold)" stroke-width="1.4"/>')
    out.append('<rect x="7.5" y="7.5" width="85" height="125" rx="4" fill="none" stroke="#fbbf24" stroke-opacity=".45" stroke-width=".5"/>')
    for (x, y) in [(4.5, 4.5), (95.5, 4.5), (4.5, 135.5), (95.5, 135.5)]:
        out.append(f'<path d="M{x} {y - 3.2}L{x + 3.2} {y}L{x} {y + 3.2}L{x - 3.2} {y}Z" fill="url(#gold)" stroke="#78350f" stroke-width=".4"/>')
        out.append(f'<circle cx="{x}" cy="{y}" r="1" fill="#a78bfa"/>')
    for (x, y) in [(50, 4.5), (50, 135.5)]:
        out.append(f'<path d="M{x - 5} {y}L{x} {y - 2}L{x + 5} {y}L{x} {y + 2}Z" fill="url(#gold)"/>')
    # Glow behind the star.
    out.append(f'<circle cx="{cx}" cy="{cy}" r="34" fill="url(#glow)"/>')
    # Laurel wreath: leaves along two arcs.
    wr = 27
    for side in (-1, 1):
        stem = []
        for k in range(10):
            t = k / 9
            ang = math.radians(90 + side * (28 + t * 120))
            x, y = cx + wr * math.cos(ang), cy + 4 + wr * math.sin(ang)
            stem.append((x, y))
            tangent = math.degrees(ang) + (90 if side > 0 else -90)
            size = 4.6 - t * 1.6
            for off in (-38, 38):
                rot = tangent + off * side
                ox = x + math.cos(math.radians(rot)) * size * .9
                oy = y + math.sin(math.radians(rot)) * size * .9
                out.append(f'<ellipse cx="{f(ox)}" cy="{f(oy)}" rx="{f(size)}" ry="{f(size * .42)}" transform="rotate({f(rot)} {f(ox)} {f(oy)})" fill="url(#leaf)" stroke="#78350f" stroke-width=".35"/>')
                out.append(f'<path d="M{f(x)} {f(y)}L{f(x + math.cos(math.radians(rot)) * size * 1.7)} {f(y + math.sin(math.radians(rot)) * size * 1.7)}" stroke="#fef3c7" stroke-opacity=".55" stroke-width=".3"/>')
        out.append('<path d="M' + 'L'.join(f'{f(x)} {f(y)}' for x, y in stem) + '" fill="none" stroke="#b45309" stroke-width=".9" stroke-linecap="round"/>')
    # The star: ten facets, lit from the top left.
    pts = star_points(cx, cy, 19.5, 8)
    star = ['<g filter="url(#bloom)">']
    for i in range(10):
        a, b = pts[i], pts[(i + 1) % 10]
        lit = (i % 2 == 0) == (a[0] < cx + 4)
        star.append(f'<path d="M{cx} {cy}L{f(a[0])} {f(a[1])}L{f(b[0])} {f(b[1])}Z" fill="url(#{"lit" if lit else "shade"})"/>')
    star.append('<path d="M' + 'L'.join(f'{f(x)} {f(y)}' for x, y in pts) + 'Z" fill="none" stroke="#fffbeb" stroke-width=".6" stroke-linejoin="round"/>')
    star.append(f'<circle cx="{cx}" cy="{cy}" r="2.2" fill="#fff" opacity=".9"/>')
    star.append('</g>')
    out += star
    # Ribbon banner with the level.
    by = 104
    out.append(f'<path d="M22 {by}L30 {by - 1}L30 {by + 9}L22 {by + 10}L25 {by + 5}Z" fill="#4c1d95"/>')
    out.append(f'<path d="M78 {by}L70 {by - 1}L70 {by + 9}L78 {by + 10}L75 {by + 5}Z" fill="#4c1d95"/>')
    out.append(f'<path d="M29 {by - 2}Q50 {by - 5} 71 {by - 2}L71 {by + 8}Q50 {by + 5} 29 {by + 8}Z" fill="url(#ribbon)" stroke="url(#gold)" stroke-width=".8"/>')
    out.append(f'<text x="50" y="{by + 5.6}" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="7" letter-spacing=".6" fill="#fde68a">LVL 15</text>')
    for (x, y, s) in [(20, 30, .9), (82, 24, 1.1), (16, 88, .7), (86, 92, .8), (70, 124, .6), (30, 122, .7)]:
        out.append(sparkle(x, y, s, '#fef3c7', .9))
    out.append('</svg>')
    return ''.join(o for o in out if o)


def summit():
    rnd = random.Random(50)
    S = 800
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" preserveAspectRatio="xMidYMid slice">',
           '<defs>',
           '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
           '<stop offset="0" stop-color="#070a24"/><stop offset=".28" stop-color="#1e1b4b"/>'
           '<stop offset=".48" stop-color="#5b2169"/><stop offset=".6" stop-color="#b4412a"/>'
           '<stop offset=".68" stop-color="#f59e0b"/><stop offset=".74" stop-color="#fde68a"/></linearGradient>',
           '<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbeb"/>'
           '<stop offset=".35" stop-color="#fde68a"/><stop offset=".6" stop-color="#fbbf24" stop-opacity=".55"/>'
           '<stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient>',
           '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fbbf24" stop-opacity=".45"/>'
           '<stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>',
           '<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9d5c8a"/><stop offset="1" stop-color="#4a2552"/></linearGradient>',
           '<linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2352"/><stop offset="1" stop-color="#231236"/></linearGradient>',
           '<linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c0f2e"/><stop offset="1" stop-color="#07040f"/></linearGradient>',
           '<linearGradient id="peakL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b1030"/><stop offset="1" stop-color="#3a1f4d"/></linearGradient>',
           '<linearGradient id="peakR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3f55"/><stop offset="1" stop-color="#3a1f4d"/></linearGradient>',
           '<linearGradient id="snowL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7d2fe"/><stop offset="1" stop-color="#6366f1" stop-opacity=".6"/></linearGradient>',
           '<linearGradient id="snowR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbeb"/><stop offset="1" stop-color="#fdba74"/></linearGradient>',
           '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef3c7"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#b45309"/></linearGradient>',
           '<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>',
           '<linearGradient id="facefade" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#fff"/><stop offset=".72" stop-color="#fff" stop-opacity="0"/></linearGradient>',
           '<mask id="faces" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="800"><rect x="0" y="0" width="800" height="800" fill="url(#facefade)"/></mask>',
           '<filter id="mist" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>',
           '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>',
           '</defs>',
           f'<rect width="{S}" height="{S}" fill="url(#sky)"/>']
    # Stars, thinning towards the dawn.
    for _ in range(170):
        x, y = rnd.uniform(0, S), rnd.uniform(0, 380) ** 1.0
        op = max(0.0, 1 - y / 380) * rnd.uniform(.4, 1)
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(rnd.uniform(.5, 1.6))}" fill="#e0e7ff" opacity="{f(op)}"/>')
    for (x, y, s) in [(140, 90, 2.2), (660, 70, 2.6), (560, 180, 1.6), (230, 210, 1.4)]:
        out.append(sparkle(x, y, s, '#eef2ff', .9))
    # The sun rising behind the summit, with long soft rays.
    SX, SY = 492, 452
    out.append(f'<circle cx="{SX}" cy="{SY}" r="330" fill="url(#halo)"/>')
    rays = []
    for i in range(24):
        a = math.radians(180 + i * 7.5 + 3)
        b = a + math.radians(2.2)
        rays.append(f'M{SX} {SY}L{f(SX + 800 * math.cos(a))} {f(SY + 800 * math.sin(a))}L{f(SX + 800 * math.cos(b))} {f(SY + 800 * math.sin(b))}Z')
    out.append(f'<path d="{"".join(rays)}" fill="#fde68a" opacity=".07"/>')
    out.append(f'<circle cx="{SX}" cy="{SY}" r="110" fill="url(#sun)"/>')
    out.append(f'<circle cx="{SX}" cy="{SY}" r="30" fill="#fffbeb"/>')

    def ridge(base, peaks, rough, seed):
        r = random.Random(seed)
        pts = [(-20, base)]
        for (x, y) in peaks:
            pts.append((x, y))
        pts.append((S + 20, base))
        # Jag the lines between the peaks.
        jag = []
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            steps = max(2, int(abs(x1 - x0) / 22))
            for k in range(steps):
                t = k / steps
                jag.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (r.uniform(-rough, rough) if k else 0)))
        jag.append(pts[-1])
        return 'M' + 'L'.join(f'{f(x)} {f(y)}' for x, y in jag) + f'L{S + 20} {S}L-20 {S}Z'

    out.append(f'<path d="{ridge(520, [(60, 470), (170, 430), (260, 480), (330, 452), (470, 460), (560, 420), (660, 470), (750, 440)], 6, 1)}" fill="url(#far)" opacity=".85"/>')
    out.append('<g filter="url(#mist)"><ellipse cx="400" cy="540" rx="460" ry="34" fill="#fde68a" opacity=".22"/></g>')
    # The summit: a tall central peak lit from the sun on its right face.
    out.append(f'<path d="{ridge(600, [(40, 560), (150, 500), (250, 540), (300, 470), (340, 380), (400, 250), (460, 370), (520, 460), (600, 520), (700, 480), (790, 540)], 5, 2)}" fill="url(#mid)"/>')
    # Shadow face left of the arete, sunlit face right of it, rock ribs.
    out.append('<g mask="url(#faces)">')
    out.append('<path d="M400 250L340 380L300 470L240 560L250 700L392 700L392 520L386 440L380 360Z" fill="url(#peakL)"/>')
    out.append('<path d="M400 250L380 360L386 440L392 520L392 700L640 700L620 540L520 460L460 370Z" fill="url(#peakR)"/>')
    out.append('<path d="M400 250L380 360L386 440L392 520" fill="none" stroke="#fdba74" stroke-opacity=".55" stroke-width="2"/>')
    for (x0, y0, x1, y1) in [(412, 300, 440, 420), (424, 320, 470, 440), (406, 340, 420, 470), (438, 360, 500, 470), (396, 380, 405, 500)]:
        out.append(f'<path d="M{x0} {y0}Q{(x0 + x1) / 2 + 6} {(y0 + y1) / 2} {x1} {y1}" fill="none" stroke="#fed7aa" stroke-opacity=".22" stroke-width="3" stroke-linecap="round"/>')
    for (x0, y0, x1, y1) in [(390, 300, 360, 400), (384, 340, 330, 450), (376, 400, 350, 470)]:
        out.append(f'<path d="M{x0} {y0}Q{(x0 + x1) / 2 - 6} {(y0 + y1) / 2} {x1} {y1}" fill="none" stroke="#a5b4fc" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>')
    out.append('</g>')
    # Snow caps: cool shadow side, warm lit side.
    out.append('<path d="M400 250L372 306L382 300L390 318L398 302L404 314L408 300Z" fill="url(#snowL)"/>')
    out.append('<path d="M400 250L408 300L416 312L424 298L434 318L441 332L446 316L428 283Z" fill="url(#snowR)"/>')
    out.append('<path d="M400 250L396 262" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>')
    # A gold flag planted on the top.
    out.append('<path d="M400 252V196" stroke="#e5e7eb" stroke-width="2.4" stroke-linecap="round"/>')
    out.append('<path d="M401 198Q420 193 436 202Q421 208 401 214Z" fill="url(#gold)" stroke="#78350f" stroke-width=".8"/>')
    out.append('<g filter="url(#soft)"><path d="M401 198Q420 193 436 202Q421 208 401 214Z" fill="#fbbf24" opacity=".6"/></g>')
    out.append('<circle cx="400" cy="195" r="2.6" fill="#fef3c7"/>')
    out.append('<g filter="url(#mist)"><ellipse cx="260" cy="610" rx="300" ry="30" fill="#f5d0fe" opacity=".16"/>'
               '<ellipse cx="580" cy="600" rx="280" ry="26" fill="#fde68a" opacity=".14"/></g>')
    out.append(f'<path d="{ridge(700, [(80, 650), (200, 600), (300, 640), (380, 620), (480, 660), (580, 610), (700, 640), (780, 600)], 7, 3)}" fill="url(#near)"/>')
    # Rim light along the nearest ridge.
    out.append('<path d="M-20 700L80 650L200 600L300 640L380 620L480 660L580 610L700 640L780 600L820 620" fill="none" stroke="#fbbf24" stroke-opacity=".28" stroke-width="2"/>')
    out.append(f'<rect width="{S}" height="{S}" fill="url(#vig)"/>')
    out.append('</svg>')
    return ''.join(out)


def write(rel, text):
    path = os.path.join(ROOT, rel)
    with open(path, 'w') as fh:
        fh.write(text)
    print(f'{rel}: {len(text)} bytes')


if __name__ == '__main__':
    write('art/backs/rising-star.svg', rising_star())
    write('art/tables/summit.svg', summit())
