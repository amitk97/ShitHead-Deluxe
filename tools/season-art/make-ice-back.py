#!/usr/bin/env python3
"""Season Pass 2027-01 (Ice Age): card back "Cave Paintings". Writes
art/backs/ss2701-cave.svg (250x350, drawn to fill the whole card)."""
import sys, math, random
from ice_shapes import mammoth, hand
W, H = 250, 350
o = []; A = o.append
rnd = random.Random(11)

def crystal(x, y, ang, ln, wd=3.2, op=.9):
    return (f'<g transform="translate({x} {y}) rotate({ang})" opacity="{op}">'
            f'<path d="M0 0L{wd:.1f} {-ln*.35:.1f}L0 {-ln:.1f}L{-wd:.1f} {-ln*.35:.1f}Z" fill="url(#ice)" stroke="#e8fbff" stroke-width=".6"/>'
            f'<path d="M0 0L0 {-ln:.1f}" stroke="#fff" stroke-opacity=".6" stroke-width=".5"/></g>')

def flake(x, y, r, op=.9):
    s = ''.join(f'<path d="M0 0L{r*math.cos(math.radians(a)):.2f} {r*math.sin(math.radians(a)):.2f}" />' for a in range(0, 360, 60))
    b = ''.join(f'<path d="M{r*.55*math.cos(math.radians(a)):.2f} {r*.55*math.sin(math.radians(a)):.2f}l{r*.28*math.cos(math.radians(a+50)):.2f} {r*.28*math.sin(math.radians(a+50)):.2f}M{r*.55*math.cos(math.radians(a)):.2f} {r*.55*math.sin(math.radians(a)):.2f}l{r*.28*math.cos(math.radians(a-50)):.2f} {r*.28*math.sin(math.radians(a-50)):.2f}"/>' for a in range(0, 360, 60))
    return f'<g transform="translate({x} {y})" stroke="#eaf9ff" stroke-width=".7" stroke-linecap="round" fill="none" opacity="{op}">{s}{b}</g>'

A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="none">')
A('''<defs>
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4feff"/><stop offset=".4" stop-color="#a8e0f5"/><stop offset=".8" stop-color="#4f9ccb"/><stop offset="1" stop-color="#2a6aa0"/></linearGradient>
<linearGradient id="iceH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a6aa0"/><stop offset=".25" stop-color="#d7f4ff"/><stop offset=".5" stop-color="#8fd0ee"/><stop offset=".78" stop-color="#4f9ccb"/><stop offset="1" stop-color="#235a8c"/></linearGradient>
<radialGradient id="wall" cx=".5" cy=".46" r=".8"><stop offset="0" stop-color="#5a7791"/><stop offset=".5" stop-color="#34495f"/><stop offset="1" stop-color="#16212f"/></radialGradient>
<radialGradient id="glowC" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c9ecff" stop-opacity=".5"/><stop offset="1" stop-color="#c9ecff" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="rock" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="3" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .8  0 0 0 0 .9  0 0 0 0 1  0 0 0 .55 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="paint" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="9" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3.2"/></filter>
<filter id="paintGrain" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="2" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.0 1.32" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="panel"><rect x="27" y="27" width="196" height="296" rx="6"/></clipPath>
</defs>''')
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#wall)"/>')
# ice frame
A('<rect x="3.5" y="3.5" width="243" height="343" rx="13" fill="none" stroke="url(#ice)" stroke-width="7"/>')
A('<rect x="7" y="7" width="236" height="336" rx="10" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>')
A('<rect x="10" y="10" width="230" height="330" rx="8" fill="#0d1826"/>')
A('<rect x="10" y="10" width="230" height="330" rx="8" fill="none" stroke="#7fc4e6" stroke-width="1"/>')
# painted band: ochre hand prints and dots round the frame
for i in range(11):
    x = 34 + i * 18.2
    A(hand(x, 19.5, .17, rnd.uniform(-8, 8), "#d9772c" if i % 2 else "#e7e1d3", .85))
    A(hand(x, 330.5, .17, 180 + rnd.uniform(-8, 8), "#e7e1d3" if i % 2 else "#d9772c", .85))
for i in range(15):
    y = 42 + i * 17.8
    A(f'<g fill="{"#d9772c" if i % 2 else "#e7e1d3"}" opacity=".85"><circle cx="18.5" cy="{y}" r="2.3"/><circle cx="18.5" cy="{y+5}" r="1.3"/><circle cx="231.5" cy="{y}" r="2.3"/><circle cx="231.5" cy="{y+5}" r="1.3"/></g>')
# rock wall
A('<rect x="26" y="26" width="198" height="298" rx="6" fill="url(#wall)"/>')
A('<g clip-path="url(#panel)">')
A('<rect x="26" y="26" width="198" height="298" filter="url(#rock)" opacity=".7"/>')
A('<ellipse cx="125" cy="178" rx="110" ry="120" fill="url(#glowC)"/>')
# cracks
for (x, y, ang) in [(60, 30, 80), (190, 320, -100), (30, 250, 10), (222, 80, 170)]:
    d = f'M{x} {y}'; px, py = x, y
    for k in range(6):
        px += math.cos(math.radians(ang + rnd.uniform(-40, 40))) * rnd.uniform(10, 22)
        py += math.sin(math.radians(ang + rnd.uniform(-40, 40))) * rnd.uniform(10, 22)
        d += f'L{px:.1f} {py:.1f}'
    A(f'<path d="{d}" fill="none" stroke="#0b141f" stroke-width="1" opacity=".7"/><path d="{d}" fill="none" stroke="#cfeeff" stroke-width=".4" opacity=".55" transform="translate(.8 .8)"/>')
# charcoal herd far behind (calf and adult)
A('<g filter="url(#paint)" opacity=".85">')
A(mammoth(34, 108, .62, False, "#1b222c", "#c9c2b0"))
A(mammoth(150, 96, .5, True, "#1b222c", "#c9c2b0"))
A('</g>')
# the big ochre mammoth
A('<g filter="url(#paint)"><g filter="url(#paintGrain)">')
A(mammoth(38, 138, 1.58, False, "#c4501f", "#f1ead7"))
A('</g></g>')
A('<g filter="url(#paint)">')
A(f'<path d="M100 164C106 190 116 206 130 214M132 154C140 182 152 198 168 204M160 160C168 182 178 196 192 198" fill="none" stroke="#7a2a0c" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>')
A('<circle cx="83.5" cy="185" r="1.9" fill="#f1ead7"/>')
A('</g>')
# spears and tally marks
A('<g filter="url(#paint)" stroke="#e7e1d3" stroke-width="2.2" stroke-linecap="round" opacity=".9">')
for x in (62, 72, 82, 92, 102):
    A(f'<path d="M{x} 284L{x+1} 300"/>')
A('<path d="M62 286L102 286" stroke-width="1.6"/>')
A('<path d="M150 292L196 270M150 276L190 284" stroke="#d9772c" stroke-width="2.4"/>')
A('</g>')
# hand stencils
A(hand(60, 66, .62, -10, "#d9772c", .95)); A(hand(125, 54, .7, 0, "#e7e1d3", .95)); A(hand(190, 66, .62, 10, "#d9772c", .95))
A('<g fill="#e7e1d3" opacity=".9">' + ''.join(f'<circle cx="{x}" cy="96" r="1.6"/>' for x in (80, 88, 96, 154, 162, 170)) + '</g>')
# snow + sparkle
for _ in range(46):
    A(f'<circle cx="{rnd.uniform(30,220):.1f}" cy="{rnd.uniform(30,320):.1f}" r="{rnd.uniform(.5,1.3):.2f}" fill="#fff" opacity="{rnd.uniform(.3,.8):.2f}"/>')
A('</g>')
A('<rect x="26" y="26" width="198" height="298" rx="6" fill="none" stroke="url(#ice)" stroke-width="2.4"/>')
A('<rect x="29.5" y="29.5" width="191" height="291" rx="4" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".7"/>')
# frost crystals on corners
for (cx, cy, base) in [(26, 26, 45), (224, 26, 135), (26, 324, -45), (224, 324, -135)]:
    A(f'<g transform="translate({cx} {cy})">' + crystal(0, 0, base, 26, 4) + crystal(0, 0, base - 28, 17, 2.8) + crystal(0, 0, base + 28, 17, 2.8) + crystal(0, 0, base + 60, 10, 2) + crystal(0, 0, base - 60, 10, 2) + '</g>')
A(flake(125, 14, 5)); A(flake(125, 336, 5)); A(flake(14, 175, 4)); A(flake(236, 175, 4))
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#vig)"/>')
A(f'<rect width="{W}" height="{H}" rx="16" fill="url(#shine)" opacity=".5" transform="skewX(-14) translate(40 0)"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/backs/ss2701-cave.svg", "w").write("".join(o))
print("ok")
