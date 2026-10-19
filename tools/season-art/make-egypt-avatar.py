#!/usr/bin/env python3
"""Season Pass 2026-11 (Ancient Egypt): avatar "Golden Pharaoh" (400x400, drawn
edge to edge; the game adds its own rounded tile and rim)."""
import math, sys, random
o = []; A = o.append
G = 'url(#gold)'; GD = '#7a4a06'; LAP = '#1c3cb4'

A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">')
A('''<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c0"/><stop offset=".3" stop-color="#f7c948"/><stop offset=".65" stop-color="#c98f1b"/><stop offset="1" stop-color="#8a5a0a"/></linearGradient>
<radialGradient id="face" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#fff3b4"/><stop offset=".35" stop-color="#f9d35a"/><stop offset=".75" stop-color="#d9981f"/><stop offset="1" stop-color="#9a6410"/></radialGradient>
<radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#1b4a8a"/><stop offset=".5" stop-color="#0d2552"/><stop offset="1" stop-color="#050b1f"/></radialGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#ffb43a"/><stop offset=".75" stop-color="#e2561a" stop-opacity=".85"/><stop offset="1" stop-color="#e2561a" stop-opacity="0"/></radialGradient>
<linearGradient id="lap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8cff"/><stop offset=".5" stop-color="#2646c8"/><stop offset="1" stop-color="#14257f"/></linearGradient>
<linearGradient id="tq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9af6e6"/><stop offset=".5" stop-color="#22c3b0"/><stop offset="1" stop-color="#0c6b66"/></linearGradient>
<linearGradient id="cn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a7a"/><stop offset="1" stop-color="#b3141b"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="nemes"><path id="nemesPath" d="M200 26C268 26 322 66 330 136L350 336L268 336L262 252L138 252L132 336L50 336L70 136C78 66 132 26 200 26Z"/></clipPath>
<clipPath id="lapL"><path d="M70 136L50 336L132 336L138 252L120 200Z"/></clipPath>
<clipPath id="lapR"><path d="M330 136L350 336L268 336L262 252L280 200Z"/></clipPath>
<clipPath id="beard"><path d="M187 256H213L216 326Q220 352 204 354Q188 354 184 326Z"/></clipPath>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
</defs>''')

# --- background
A('<rect width="400" height="400" fill="url(#bg)"/>')
A('<circle cx="200" cy="170" r="168" fill="url(#sun)" opacity=".9"/>')
rays = []
for i in range(40):
    a = i * 9 * math.pi / 180; a2 = (i * 9 + 3.6) * math.pi / 180
    rays.append(f'M200 170L{200+330*math.cos(a):.1f} {170+330*math.sin(a):.1f}L{200+330*math.cos(a2):.1f} {170+330*math.sin(a2):.1f}Z')
A(f'<path d="{"".join(rays)}" fill="#ffd36a" opacity=".13"/>')
rnd = random.Random(3)
A(''.join(f'<circle cx="{rnd.uniform(10,390):.0f}" cy="{rnd.uniform(10,390):.0f}" r="{rnd.uniform(.6,1.6):.1f}" fill="#ffe9a8" opacity="{rnd.uniform(.3,.8):.2f}"/>' for _ in range(40)))

# --- broad collar (behind lappets' inner edge, in front of the headdress back)
def band(rx, ry, w, stroke, dash=None, cap="butt", op=1):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<path d="M{200-rx} 262A{rx} {ry} 0 0 0 {200+rx} 262" fill="none" stroke="{stroke}" stroke-width="{w}"{d} stroke-linecap="{cap}" opacity="{op}"/>')

# headdress
A('<path d="M200 26C268 26 322 66 330 136L350 336L268 336L262 252L138 252L132 336L50 336L70 136C78 66 132 26 200 26Z" fill="#14257f"/>')
A('<g clip-path="url(#nemes)">')
wedges = []
cx, cy = 200, 190
for i in range(0, 60):
    a = (180 + i * 6) * math.pi / 180
    a2 = (180 + i * 6 + 6) * math.pi / 180
    pts = f'M{cx} {cy}L{cx+400*math.cos(a):.1f} {cy+400*math.sin(a):.1f}L{cx+400*math.cos(a2):.1f} {cy+400*math.sin(a2):.1f}Z'
    wedges.append((i, pts))
A('<g>' + ''.join(f'<path d="{p}" fill="{"url(#gold)" if i%2==0 else "url(#lap)"}"/>' for i, p in wedges) + '</g>')
# lappet bands (horizontal pleats)
for side in ('lapL', 'lapR'):
    A(f'<g clip-path="url(#{side})"><rect x="40" y="196" width="320" height="150" fill="#14257f"/>' +
      ''.join(f'<rect x="40" y="{196+k*12}" width="320" height="6" fill="url(#gold)"/>' for k in range(13)) + '</g>')
A('<path d="M70 136C78 66 132 26 200 26C268 26 322 66 330 136" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" filter="url(#blur2)"/>')
A('<path d="M60 160L48 340M340 160L352 340" stroke="#000" stroke-opacity=".25" stroke-width="10" filter="url(#blur6)"/>')
A('</g>')
A(f'<path d="M200 26C268 26 322 66 330 136L350 336L268 336L262 252L138 252L132 336L50 336L70 136C78 66 132 26 200 26Z" fill="none" stroke="{G}" stroke-width="4" stroke-linejoin="round"/>')
A(f'<path d="M200 26C268 26 322 66 330 136L350 336L268 336L262 252L138 252L132 336L50 336L70 136C78 66 132 26 200 26Z" fill="none" stroke="{GD}" stroke-width=".8"/>')

# collar over the chest
A('<ellipse cx="200" cy="262" rx="66" ry="46" fill="url(#face)"/><ellipse cx="200" cy="262" rx="66" ry="46" fill="#5a3704" opacity=".45"/>')
A('<path d="M56 258A144 112 0 0 0 344 258L276 258A76 46 0 0 1 124 258Z" fill="#0d1a55" stroke="#c98f1b" stroke-width="1.4"/>')
A('<g>')
A('<path d="M60 300A140 100 0 0 0 340 300L330 340A135 90 0 0 1 70 340Z" fill="#0b1646" opacity="0"/>')
cb = []
rxs = [140, 126, 112, 98, 84, 70]
for i, rx in enumerate(rxs):
    ry = 84 - i * 9
    base = 258 + 0
    stroke = ['url(#gold)', '#e65a4a', 'url(#lap)', 'url(#tq)', 'url(#gold)', '#e65a4a'][i]
    cb.append(f'<path d="M{200-rx} {base}A{rx} {ry} 0 0 0 {200+rx} {base}" fill="none" stroke="{stroke}" stroke-width="11" stroke-dasharray="{"7 2.2" if i%2 else "10 2.4"}" />')
    cb.append(f'<path d="M{200-rx} {base}A{rx} {ry} 0 0 0 {200+rx} {base}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2" transform="translate(0 -3)"/>')
A('<g clip-path="inset(0 0 0 0)">' + ''.join(cb) + '</g>')
# pendants on outer rim
for k in range(17):
    t = math.pi * (k + .5) / 17
    x = 200 - 146 * math.cos(t); y = 258 + 90 * math.sin(t)
    fill = 'url(#tq)' if k % 2 else 'url(#cn)'
    rot = math.degrees(t) - 90
    A(f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot:.0f})"><path d="M-4.6 0Q0 14 4.6 0Z" fill="{fill}" stroke="{GD}" stroke-width=".8"/></g>')
A('</g>')

# --- beard
A('<path d="M187 256H213L216 326Q220 352 204 354Q188 354 184 326Z" fill="#14257f"/>')
A('<g clip-path="url(#beard)">' + ''.join(f'<rect x="170" y="{256+k*10}" width="60" height="5" fill="{"url(#gold)" if k%2==0 else "url(#lap)"}"/>' for k in range(11)) +
  '<rect x="170" y="256" width="22" height="110" fill="#fff" opacity=".18"/></g>')
A(f'<path d="M187 256H213L216 326Q220 352 204 354Q188 354 184 326Z" fill="none" stroke="{G}" stroke-width="2.4"/>')

# --- face
facep = 'M139 148C139 92 261 92 261 148C266 205 248 258 200 264C152 258 134 205 139 148Z'
A(f'<path d="{facep}" fill="url(#face)" stroke="{GD}" stroke-width="1.6"/>')
A('<path d="M139 148C139 92 200 92 200 92C200 92 140 110 150 200C152 220 170 248 200 262C160 248 135 200 139 148Z" fill="#fff" opacity=".1"/>')
A('<path d="M261 148C266 205 248 258 200 264C240 246 252 210 250 160Z" fill="#7a4a06" opacity=".22"/>')
# forehead band
A(f'<path d="M142 120C170 108 230 108 258 120L258 134C230 124 170 124 142 134Z" fill="url(#gold)" stroke="{GD}" stroke-width="1.4"/>')
A(f'<path d="M142 127C170 116 230 116 258 127" fill="none" stroke="{LAP}" stroke-width="3"/>')
A('<path d="M150 118C175 108 225 108 250 118" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>')
# brows + eyes
for s in (-1, 1):
    A(f'<g transform="translate(200 0) scale({s} 1) translate(-200 0)">')
    A(f'<path d="M152 152Q172 138 194 150" fill="none" stroke="{LAP}" stroke-width="7" stroke-linecap="round"/>')
    A(f'<path d="M152 152Q172 138 194 150" fill="none" stroke="#6f95ff" stroke-width="1.4" stroke-linecap="round" transform="translate(0 -1.6)"/>')
    A('<path d="M150 170Q172 154 196 170Q172 184 150 170Z" fill="#f4efe0"/>')
    A('<circle cx="174" cy="170" r="7.2" fill="#2a1a08"/><circle cx="174" cy="170" r="3.4" fill="#0a0704"/><circle cx="171.6" cy="167.6" r="2" fill="#fff"/>')
    A('<path d="M150 170Q172 154 196 170Q172 184 150 170Z" fill="none" stroke="#0b0b14" stroke-width="3.2" stroke-linejoin="round"/>')
    A('<path d="M150 170L124 180" stroke="#0b0b14" stroke-width="4.6" stroke-linecap="round"/>')
    A(f'<path d="M153 176Q138 188 123 190" fill="none" stroke="{LAP}" stroke-width="3.4" stroke-linecap="round"/>')
    A('<path d="M192 172Q200 176 198 184" fill="none" stroke="#7a4a06" stroke-opacity=".5" stroke-width="2"/>')
    A('</g>')
# nose
A('<path d="M200 156L200 206" stroke="#fff" stroke-opacity=".38" stroke-width="5" stroke-linecap="round" filter="url(#blur2)"/>')
A('<path d="M189 172Q184 198 187 211M211 172Q216 198 213 211" fill="none" stroke="#7a4a06" stroke-opacity=".22" stroke-width="3" stroke-linecap="round"/>')
A('<path d="M184 213Q200 226 216 213" fill="none" stroke="#8a5a0a" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>')
A('<ellipse cx="190" cy="215" rx="3.6" ry="2" fill="#5a3704" opacity=".75"/><ellipse cx="210" cy="215" rx="3.6" ry="2" fill="#5a3704" opacity=".75"/>')
# lips
A('<path d="M181 234Q190 226 200 229Q210 226 219 234Q200 241 181 234Z" fill="#d98a1c" stroke="#7a4a06" stroke-width="1.2"/>')
A('<path d="M183 236Q200 252 217 236Q200 243 183 236Z" fill="#eeab2c" stroke="#7a4a06" stroke-width="1.1"/>')
A('<path d="M183 236Q200 240 217 236" fill="none" stroke="#5a3704" stroke-width="1.6"/>')
A('<ellipse cx="172" cy="206" rx="14" ry="9" fill="#fff" opacity=".2" filter="url(#blur2)"/><ellipse cx="228" cy="206" rx="14" ry="9" fill="#fff" opacity=".1" filter="url(#blur2)"/>')

# --- uraeus (cobra) over the forehead band
A(f'''<g transform="translate(200 120)">
<path d="M0 6C-9 4 -9 -8 0 -12" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"/>
<path d="M-17 -14C-21 -34 -7 -46 7 -46C21 -46 23 -30 17 -14C10 -9 -10 -9 -17 -14Z" fill="url(#gold)" stroke="#7a4a06" stroke-width="1.4"/>
<path d="M-11 -17C-14 -30 -5 -38 5 -38C15 -38 16 -28 12 -17Z" fill="url(#lap)" stroke="#fde68a" stroke-width="1"/>
<path d="M-8 -22Q0 -26 8 -22M-7 -29Q0 -33 7 -29" fill="none" stroke="#fde68a" stroke-width="1.2"/>
<path d="M-6 -46C-9 -56 -2 -62 5 -58C9 -55 8 -48 6 -46C3 -44 -3 -44 -6 -46Z" fill="url(#cn)" stroke="#7a1010" stroke-width="1.1"/>
<circle cx="3" cy="-54" r="1.5" fill="#fff6c8"/></g>''')

# --- sparkle + lighting + vignette
for (x, y, s) in [(60, 70, 1.3), (345, 92, 1.0), (92, 335, .9), (322, 300, 1.2)]:
    A(f'<path d="M{x} {y-9*s}L{x+2*s} {y-2*s}L{x+9*s} {y}L{x+2*s} {y+2*s}L{x} {y+9*s}L{x-2*s} {y+2*s}L{x-9*s} {y}L{x-2*s} {y-2*s}Z" fill="#fff6c8" opacity=".9"/>')
A('<path d="M70 136C78 66 132 26 200 26C240 26 280 40 305 70L200 130Z" fill="url(#gloss)" opacity=".5"/>')
A('<rect width="400" height="400" fill="url(#vig)"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/avatars/ss2611-pharaoh.svg", "w").write("".join(o))
print("ok")
