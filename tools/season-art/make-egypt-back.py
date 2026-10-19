#!/usr/bin/env python3
"""Season Pass 2026-11 (Ancient Egypt): card back "Scarab of Ra". Writes
art/backs/ss2611-scarab.svg (250x350, drawn to fill the whole card)."""
import math, sys
W, H = 250, 350
out = []
A = out.append

def feather(x, y, ang, ln, wd, fill, stroke, sw=1.1):
    # a tapered feather pointing along `ang` degrees from (x,y)
    p = (f"M0 0C{ln*.28:.1f} {-wd:.1f} {ln*.78:.1f} {-wd*.85:.1f} {ln:.1f} 0"
         f"C{ln*.78:.1f} {wd*.85:.1f} {ln*.28:.1f} {wd:.1f} 0 0Z")
    s = f'<g transform="translate({x} {y}) rotate({ang})"><path d="{p}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    s += f'<path d="M{ln*.08:.1f} 0H{ln*.9:.1f}" stroke="{stroke}" stroke-width=".8" opacity=".7"/>'
    s += f'<path d="M{ln*.2:.1f} {-wd*.45:.1f}Q{ln*.55:.1f} {-wd*.75:.1f} {ln*.88:.1f} {-wd*.18:.1f}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.3" stroke-linecap="round"/></g>'
    return s

def wing(sign):
    """sign=+1 right wing, -1 left (mirrored by transform)."""
    g = []
    ox, oy = 139, 190
    rows = [
        # (angles, length, width, fill, stroke)
        ([-66, -55, -44, -33, -22, -11, 0, 11], 71, 11.5, "url(#gold)", "#7a4a06"),
        ([-58, -47, -36, -25, -14, -3, 8], 52, 10, "url(#turq)", "#0b4f4a"),
        ([-52, -41, -30, -19, -8, 3, 14], 33, 8.6, "url(#lapisF)", "#c98f1b"),
    ]
    for angs, ln, wd, fill, st in rows:
        for a in angs:
            g.append(feather(ox, oy, a, ln, wd, fill, st))
    inner = "".join(g)
    return f'<g transform="translate({125} 0) scale({sign} 1) translate({-125} 0)">{inner}</g>'

def cobra(x, y, flip):
    s = -1 if flip else 1
    return (f'<g transform="translate({x} {y}) scale({s} 1)">'
            '<path d="M0 22C-9 20 -9 8 0 6C8 4 8 -4 0 -9" fill="none" stroke="url(#gold)" stroke-width="5.2" stroke-linecap="round"/>'
            '<path d="M0 22C-9 20 -9 8 0 6C8 4 8 -4 0 -9" fill="none" stroke="#7a4a06" stroke-width=".7"/>'
            '<path d="M-4.5 -9C-7 -17 -1 -23 4 -17C7 -13 5.5 -9 4.5 -9C2 -7 -2 -7 -4.5 -9Z" fill="url(#carn)" stroke="#7a1010" stroke-width=".8"/>'
            '<path d="M-3 -10Q0 -12.5 3 -10" fill="none" stroke="#fde68a" stroke-width=".9"/>'
            '<circle cx="1.2" cy="-15.5" r="1.1" fill="#fff6c8"/></g>')

def glyph(kind, x, y):
    c = "#f1c24a"
    if kind == 0:   # ankh
        b = f'<circle cx="0" cy="-3.4" r="2.6" fill="none" stroke="{c}" stroke-width="1.4"/><path d="M0 -.8V6.2M-3.3 1.6H3.3" stroke="{c}" stroke-width="1.5" stroke-linecap="round"/>'
    elif kind == 1: # eye
        b = (f'<path d="M-5.2 0Q0 -4.6 5.2 0Q0 4 -5.2 0Z" fill="none" stroke="{c}" stroke-width="1.2"/><circle r="1.5" fill="{c}"/>'
             f'<path d="M-5 -3.2Q0 -7 5 -3.2M-1 3.6L-2.4 6.6M1.4 3.8Q3.6 5.6 2.6 7.6" fill="none" stroke="{c}" stroke-width="1.1" stroke-linecap="round"/>')
    elif kind == 2: # water
        b = "".join(f'<path d="M-5 {y0}l2.5 -2.1 2.5 2.1 2.5 -2.1 2.5 2.1" fill="none" stroke="{c}" stroke-width="1.2" stroke-linejoin="round"/>' for y0 in (-3, 0.6, 4.2))
    elif kind == 3: # sun disc
        b = f'<circle r="4.2" fill="none" stroke="{c}" stroke-width="1.3"/><circle r="1.4" fill="{c}"/>'
    elif kind == 4: # reed
        b = (f'<path d="M0 6V-4.6" stroke="{c}" stroke-width="1.3" stroke-linecap="round"/>'
             f'<path d="M0 -4.6Q-3.8 -2 -1.4 1.6M0 -4.6Q3.8 -2 1.4 1.6" fill="none" stroke="{c}" stroke-width="1.1" stroke-linecap="round"/>')
    else:           # tiny scarab
        b = (f'<ellipse cy="0.6" rx="3" ry="4" fill="none" stroke="{c}" stroke-width="1.2"/><path d="M0 -3.4V4.6M-3 -1.4L-5 -3M3 -1.4L5 -3M-3 2.2L-5 4M3 2.2L5 4" stroke="{c}" stroke-width="1" stroke-linecap="round"/>')
    return f'<g transform="translate({x:.1f} {y:.1f})">{b}</g>'

# ------------------------------------------------------------------ defs
A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="none">')
A('''<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".3" stop-color="#f7c948"/><stop offset=".65" stop-color="#c98f1b"/><stop offset="1" stop-color="#8a5a0a"/></linearGradient>
<linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a0a"/><stop offset=".25" stop-color="#fbe08a"/><stop offset=".5" stop-color="#f7c948"/><stop offset=".78" stop-color="#c98f1b"/><stop offset="1" stop-color="#7a4a06"/></linearGradient>
<linearGradient id="turq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9af6e6"/><stop offset=".45" stop-color="#22c3b0"/><stop offset="1" stop-color="#0c6b66"/></linearGradient>
<linearGradient id="lapisF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8cff"/><stop offset=".5" stop-color="#2646c8"/><stop offset="1" stop-color="#14257f"/></linearGradient>
<linearGradient id="carn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset="1" stop-color="#b3141b"/></linearGradient>
<radialGradient id="bg" cx=".5" cy=".5" r=".78"><stop offset="0" stop-color="#3a64e0"/><stop offset=".4" stop-color="#1b36a0"/><stop offset=".82" stop-color="#0c1659"/><stop offset="1" stop-color="#060b33"/></radialGradient>
<radialGradient id="sunGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd978" stop-opacity=".95"/><stop offset=".3" stop-color="#ff9f3d" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="disc" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".28" stop-color="#ffd25a"/><stop offset=".7" stop-color="#f0731a"/><stop offset="1" stop-color="#a81e12"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="panel"><rect x="27" y="27" width="196" height="296" rx="6"/></clipPath>
</defs>''')

# ------------------------------------------------------------------ base + lattice
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#bg)"/>')
# ------------------------------------------------------------------ frame
A('<rect x="3.5" y="3.5" width="243" height="343" rx="13" fill="none" stroke="url(#gold)" stroke-width="7"/>')
A('<rect x="7" y="7" width="236" height="336" rx="10" fill="none" stroke="#fff3b0" stroke-opacity=".55" stroke-width=".8"/>')
A('<rect x="10" y="10" width="230" height="330" rx="8" fill="#08113f"/>')
A('<rect x="10" y="10" width="230" height="330" rx="8" fill="none" stroke="#c98f1b" stroke-width="1"/>')
# glyph band
kinds = [0, 1, 2, 3, 4, 5]
n = 0
for i, x in enumerate([34 + k * 15.4 for k in range(13)]):
    A(glyph(kinds[(i) % 6], x, 18.5)); A(glyph(kinds[(i + 3) % 6], x, 331.5))
for i, y in enumerate([40 + k * 15.4 for k in range(18)]):
    A(glyph(kinds[(i + 1) % 6], 18.5, y)); A(glyph(kinds[(i + 4) % 6], 231.5, y))
A('<rect x="26" y="26" width="198" height="298" rx="6" fill="url(#bg)"/>')
lat = []
for i in range(-14, 24):
    x = i * 18
    lat.append(f'M{x} 0L{x+350} 350M{x+350} 0L{x} 350')
A(f'<g clip-path="url(#panel)"><path d="{"".join(lat)}" stroke="#f1c24a" stroke-width=".6" opacity=".12" fill="none"/>')
# sun rays
rays = []
for i in range(36):
    a = i * 10 * math.pi / 180
    a2 = (i * 10 + 4) * math.pi / 180
    rays.append(f'M125 178L{125+260*math.cos(a):.1f} {178+260*math.sin(a):.1f}L{125+260*math.cos(a2):.1f} {178+260*math.sin(a2):.1f}Z')
A(f'<path d="{"".join(rays)}" fill="#ffcf6a" opacity=".16"/>')
import random
rnd=random.Random(7)
dust=''.join(f'<circle cx="{rnd.uniform(32,218):.1f}" cy="{rnd.uniform(32,318):.1f}" r="{rnd.uniform(.5,1.3):.2f}" fill="#ffe08a" opacity="{rnd.uniform(.25,.7):.2f}"/>' for _ in range(70))
A(dust)
A('<circle cx="125" cy="178" r="122" fill="url(#sunGlow)" opacity=".85"/></g>')

A('<rect x="26" y="26" width="198" height="298" rx="6" fill="none" stroke="url(#gold)" stroke-width="2.4"/>')
A('<rect x="29.5" y="29.5" width="191" height="291" rx="4" fill="none" stroke="#fff3b0" stroke-opacity=".4" stroke-width=".7"/>')
for (cx, cy) in [(26, 26), (224, 26), (26, 324), (224, 324)]:
    A(f'<g transform="translate({cx} {cy}) rotate(45)"><rect x="-6" y="-6" width="12" height="12" rx="1.5" fill="url(#gold)" stroke="#7a4a06" stroke-width=".8"/><rect x="-2.6" y="-2.6" width="5.2" height="5.2" fill="url(#turq)"/></g>')

# ------------------------------------------------------------------ emblem
A('<g clip-path="url(#panel)">')
A('<ellipse cx="125" cy="188" rx="92" ry="60" fill="#ffb347" opacity=".18" filter="url(#soft)"/>')
A(wing(1)); A(wing(-1))
# scarab
A('''<g transform="translate(125 196)">
<g stroke="url(#gold)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
<path d="M-21 -16L-37 -29L-47 -21M-26 2L-45 0L-52 12M-22 20L-39 33L-44 47"/>
<path d="M21 -16L37 -29L47 -21M26 2L45 0L52 12M22 20L39 33L44 47"/></g>
<g stroke="#5a3704" stroke-width=".7" fill="none"><path d="M-21 -16L-37 -29L-47 -21M-26 2L-45 0L-52 12M-22 20L-39 33L-44 47M21 -16L37 -29L47 -21M26 2L45 0L52 12M22 20L39 33L44 47"/></g>
<path d="M0 -24C29 -24 36 8 25 34C17 47 7 50 0 50C-7 50 -17 47 -25 34C-36 8 -29 -24 0 -24Z" fill="url(#turq)" stroke="url(#gold)" stroke-width="2.4"/>
<path d="M0 -24V50" stroke="#e9b93a" stroke-width="1.6"/>
<path d="M-24 -4Q-12 2 -2 -2M-27 10Q-14 17 -2 12M-24 24Q-12 31 -2 26M24 -4Q12 2 2 -2M27 10Q14 17 2 12M24 24Q12 31 2 26" fill="none" stroke="#f7c948" stroke-width="1.5" stroke-linecap="round"/>
<ellipse cx="-12" cy="-6" rx="7" ry="17" fill="#fff" opacity=".24" transform="rotate(14 -12 -6)"/>
<path d="M-23 -24C-20 -37 20 -37 23 -24C15 -19 -15 -19 -23 -24Z" fill="url(#gold)" stroke="#7a4a06" stroke-width="1"/>
<path d="M-15 -34C-13 -48 13 -48 15 -34Z" fill="url(#gold)" stroke="#7a4a06" stroke-width="1"/>
<path d="M-14 -44.5L-17 -50L-8 -46M-3 -48L0 -54L3 -48M8 -46L17 -50L14 -44.5" fill="url(#gold)" stroke="#7a4a06" stroke-width=".9" stroke-linejoin="round"/>
<path d="M-7 -29Q0 -26 7 -29" stroke="#fff6c8" stroke-opacity=".7" stroke-width="1.2" fill="none" stroke-linecap="round"/>
</g>''')
# sun disc + cobras
A('<circle cx="125" cy="112" r="40" fill="url(#sunGlow)"/>')
A(cobra(98, 128, True)); A(cobra(152, 128, False))
A('<circle cx="125" cy="112" r="22" fill="url(#disc)" stroke="url(#gold)" stroke-width="3"/>')
A('<circle cx="125" cy="112" r="14.5" fill="none" stroke="#fff6c8" stroke-opacity=".55" stroke-width="1"/>')
A('<ellipse cx="118" cy="104" rx="7" ry="4.5" fill="#fff" opacity=".45" transform="rotate(-30 118 104)"/>')
# lower ornament
A('<g transform="translate(125 282)">')
A('<path d="M-46 0H46" stroke="url(#gold)" stroke-width="1.6"/>')
A('<g transform="rotate(45)"><rect x="-7" y="-7" width="14" height="14" rx="1.5" fill="url(#lapisF)" stroke="url(#gold)" stroke-width="1.8"/></g>')
for sx in (-1, 1):
    A(f'<g transform="translate({sx*26} 0)"><circle cy="-4.6" r="3.4" fill="none" stroke="url(#gold)" stroke-width="1.8"/><path d="M0 -1.2V10M-4.6 3H4.6" stroke="url(#gold)" stroke-width="2" stroke-linecap="round"/></g>')
    A(f'<g transform="translate({sx*41} 0)"><circle r="2.2" fill="url(#turq)" stroke="#c98f1b" stroke-width=".8"/></g>')
A('</g>')
A('<g transform="translate(125 64)"><path d="M-46 0H46" stroke="url(#gold)" stroke-width="1.6"/><g transform="rotate(45)"><rect x="-5" y="-5" width="10" height="10" rx="1.2" fill="url(#turq)" stroke="url(#gold)" stroke-width="1.6"/></g></g>')
A('</g>')
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#vig)"/>')
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#shine)" opacity=".5" transform="skewX(-14) translate(40 0)"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/backs/ss2611-scarab.svg", "w").write("".join(out))
print("ok")
