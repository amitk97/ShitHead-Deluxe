#!/usr/bin/env python3
"""Season Pass 2026-11 banner (720x260): sunset over the pyramids, drawn edge to edge."""
import random, sys
W, H = 720, 260
o = []; A = o.append
A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice">')
A('''<defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#0f0a2a"/><stop offset=".30" stop-color="#3b1a52"/><stop offset=".52" stop-color="#b34a38"/><stop offset=".70" stop-color="#f2a04a"/><stop offset="1" stop-color="#ffcf7a"/></linearGradient>
<radialGradient id="glow"><stop stop-color="#fff0b8"/><stop offset=".3" stop-color="#ffc25a" stop-opacity=".8"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient>
<linearGradient id="pL" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6c077"/><stop offset="1" stop-color="#a5502c"/></linearGradient>
<linearGradient id="pR" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7a3326"/><stop offset="1" stop-color="#3a1522"/></linearGradient>
<linearGradient id="d1" x2="0" y2="1"><stop stop-color="#c6733a"/><stop offset="1" stop-color="#7a3a22"/></linearGradient>
<linearGradient id="d2" x2="0" y2="1"><stop stop-color="#7a3a22"/><stop offset="1" stop-color="#2a1210"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#8a5a0a"/><stop offset=".3" stop-color="#fbe08a"/><stop offset=".6" stop-color="#f7c948"/><stop offset="1" stop-color="#7a4a06"/></linearGradient>
<linearGradient id="shade" x2="1"><stop stop-color="#0a0620" stop-opacity=".88"/><stop offset=".55" stop-color="#0a0620" stop-opacity=".25"/><stop offset="1" stop-color="#0a0620" stop-opacity="0"/></linearGradient>
</defs>''')
A(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
rnd = random.Random(11)
A(''.join(f'<circle cx="{rnd.uniform(0,W):.0f}" cy="{rnd.uniform(0,120):.0f}" r="{rnd.uniform(.5,1.4):.1f}" fill="#fbe9b4" opacity="{rnd.uniform(.3,.85):.2f}"/>' for _ in range(60)))
A('<circle cx="540" cy="150" r="120" fill="url(#glow)"/><circle cx="540" cy="150" r="46" fill="#fff0c0"/><circle cx="540" cy="150" r="36" fill="#fff9de"/>')
def pyr(ax, ay, bl, br, by):
    return (f'<path d="M{ax} {ay}L{bl} {by}L{ax+4} {by}Z" fill="url(#pL)"/><path d="M{ax} {ay}L{ax+4} {by}L{br} {by}Z" fill="url(#pR)"/>'
            f'<path d="M{ax} {ay}L{bl} {by}" stroke="#ffe3a8" stroke-width="1.4" opacity=".75"/>')
A(pyr(430, 40, 290, 570, 190) + pyr(238, 96, 150, 330, 190) + pyr(640, 108, 560, 740, 190))
A(f'<path d="M0 190Q120 172 260 188T520 184T{W} 176V{H}H0Z" fill="url(#d1)"/>')
A(f'<path d="M0 222Q160 200 330 218T{W} 208V{H}H0Z" fill="url(#d2)"/>')
A('<path d="M0 190Q120 172 260 188T520 184T720 176" fill="none" stroke="#ffd98a" stroke-opacity=".5" stroke-width="1.4"/>')
# little palms on the right dune
def palm(x, y, s):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0Q4 -30 -2 -52L4 -53Q10 -28 7 0Z" fill="#6a3a22"/>' +
            ''.join(f'<path d="M1 -52Q{1+dx*.5} {-70+k*3} {1+dx} {-52+dy}Q{1+dx*.5} {-58} 1 -52Z" fill="#1d6b4a" stroke="#0d3a2a" stroke-width=".6"/>' for k,(dx,dy) in enumerate([(-30,10),(-24,0),(-14,-6),(14,-6),(24,0),(30,10)])) + '</g>')
A(palm(655, 228, 1.0) + palm(690, 236, .8))
A(f'<rect width="{W}" height="{H}" fill="url(#shade)"/>')
A(f'<rect x="0" y="0" width="{W}" height="6" fill="url(#gold)"/><rect x="0" y="{H-6}" width="{W}" height="6" fill="url(#gold)"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/season-pass/ss2611/banner.svg", "w").write("".join(o))
print("ok")
