#!/usr/bin/env python3
"""Season Pass 2027-01 (Ice Age): avatar "Woolly Mammoth" (400x400, drawn edge
to edge; the game adds its own rounded tile and rim). Writes art/avatars/ss2701-mammoth.svg."""
import math, random, sys
rnd = random.Random(5)
o = []; A = o.append
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">')
A('''<defs>
<radialGradient id="bg" cx=".5" cy=".36" r=".85"><stop offset="0" stop-color="#6fb7dc"/><stop offset=".35" stop-color="#2a6b99"/><stop offset=".75" stop-color="#0e2a4a"/><stop offset="1" stop-color="#050f22"/></radialGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7e0"/><stop offset=".3" stop-color="#ffe0a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffd08a" stop-opacity="0"/></radialGradient>
<linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3c1c"/><stop offset=".5" stop-color="#4e2412"/><stop offset="1" stop-color="#1f0e08"/></linearGradient>
<radialGradient id="furF" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#c8703a"/><stop offset=".5" stop-color="#8a4420"/><stop offset="1" stop-color="#3a1a0e"/></radialGradient>
<linearGradient id="ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#efe6cf"/><stop offset=".8" stop-color="#b9b49f"/><stop offset="1" stop-color="#8a9bab"/></linearGradient>
<linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a3128"/><stop offset=".5" stop-color="#7a5645"/><stop offset="1" stop-color="#3c2720"/></linearGradient>
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4feff"/><stop offset=".5" stop-color="#9ad8f2"/><stop offset="1" stop-color="#3f8ec4"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>''')
A('<rect width="400" height="400" fill="url(#bg)"/>')
# low pale sun + distant glacier ridge
A('<circle cx="200" cy="96" r="150" fill="url(#sun)" opacity=".75"/>')
A('<path d="M0 215L48 150L82 186L128 118L176 190L222 132L268 188L316 126L360 176L400 140V400H0Z" fill="#cfe9f6" opacity=".22"/>')
A('<path d="M0 235L60 190L110 220L170 170L230 218L290 176L350 214L400 186V400H0Z" fill="#a6d2e8" opacity=".2"/>')
# snow
for _ in range(80):
    A(f'<circle cx="{rnd.uniform(0,400):.1f}" cy="{rnd.uniform(0,400):.1f}" r="{rnd.uniform(.6,2.1):.2f}" fill="#fff" opacity="{rnd.uniform(.25,.8):.2f}"/>')

def strand(x, y, ang, ln, w, col, op=1):
    dx, dy = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    nx, ny = -dy, dx
    sway = rnd.uniform(-.28, .28) * ln
    ex, ey = x + dx * ln + nx * sway, y + dy * ln + ny * sway
    cx, cy = x + dx * ln * .5 + nx * sway * 1.5, y + dy * ln * .5 + ny * sway * 1.5
    return (f'<path d="M{x-nx*w:.1f} {y-ny*w:.1f}Q{cx-nx*w*.7:.1f} {cy-ny*w*.7:.1f} {ex:.1f} {ey:.1f}Q{cx+nx*w*.7:.1f} {cy+ny*w*.7:.1f} {x+nx*w:.1f} {y+ny*w:.1f}Z" fill="{col}" opacity="{op}"/>')

# body mass of fur (shoulders + lower shag)
A('<path d="M200 70C290 66 352 128 360 214C366 290 388 350 400 400H0C12 350 34 290 40 214C48 128 110 66 200 70Z" fill="url(#fur)"/>')
# long hanging fur layers
for layer, (cols, ln0, w0) in enumerate([(("#3a1a0e", "#4c2412", "#5e2e18"), 150, 11), (("#6e3318", "#80401e", "#93502a"), 120, 9), (("#a8552a", "#bb663a", "#c9784a"), 88, 7)]):
    for i in range(46 if layer < 2 else 40):
        t = i / (45 if layer < 2 else 39)
        x = 28 + t * 344
        y = 168 + 40 * math.sin(t * math.pi) * -1 + 20 * layer
        y = 205 - 70 * math.sin(t * math.pi) + 25 * layer
        ang = 90 + (t - .5) * 36 + rnd.uniform(-9, 9)
        A(strand(x, y, ang, ln0 + rnd.uniform(-20, 30) + (60 if layer == 0 else 0), w0 + rnd.uniform(-2, 2.5), rnd.choice(cols)))
# trunk
A('<path d="M170 200C168 250 172 300 186 350C192 372 208 372 214 350C228 300 232 250 230 200C222 214 178 214 170 200Z" fill="url(#skin)"/>')
for i in range(15):
    y = 232 + i * 8
    wv = 3 + i * .1
    A(f'<path d="M{172+i*.4:.1f} {y}Q200 {y+wv+4:.1f} {228-i*.4:.1f} {y}" fill="none" stroke="#24120d" stroke-width="1.4" opacity=".6"/>')
    A(f'<path d="M{176+i*.4:.1f} {y-2}Q200 {y+wv+1:.1f} {224-i*.4:.1f} {y-2}" fill="none" stroke="#a37a63" stroke-width=".8" opacity=".5"/>')
A('<ellipse cx="190" cy="350" rx="4.2" ry="7" fill="#1c0e0a"/><ellipse cx="206" cy="350" rx="4.2" ry="7" fill="#1c0e0a"/>')
# fur around trunk base
for i in range(22):
    t = i / 21
    A(strand(168 + t * 64, 214 + 10 * math.sin(t * math.pi), 90 + (t - .5) * 60, 40, 4.2, rnd.choice(("#8a4420", "#a65a2c", "#6e3318"))))
# head dome (fur)
A('<path d="M118 190C108 112 150 52 200 52C250 52 292 112 282 190C276 238 248 262 200 262C152 262 124 238 118 190Z" fill="url(#furF)"/>')
# topknot tuft
for i in range(16):
    t = i / 15
    x = 150 + t * 100
    A(strand(x, 84 + 16 * abs(t - .5) * 2, 270 + (t - .5) * 60 + rnd.uniform(-6, 6), 38 + 30 * (1 - abs(t - .5) * 2), 7, rnd.choice(("#b8602f", "#cf7a42", "#8f4624"))))
# forehead strands
for i in range(30):
    t = i / 29
    x = 128 + t * 144
    y = 112 + 24 * math.sin(t * math.pi) - 24
    A(strand(x, y + 30, 90 + (t - .5) * 70 + rnd.uniform(-8, 8), 70 + rnd.uniform(-10, 24), 5.2, rnd.choice(("#c26d38", "#a65a2c", "#d98b52", "#8a4420")), .95))
# ears (small, hairy)
for sx in (-1, 1):
    ex = 200 + sx * 98
    A(f'<ellipse cx="{ex}" cy="196" rx="30" ry="40" fill="url(#skin)" transform="rotate({sx*8} {ex} 196)"/>')
    for i in range(14):
        A(strand(ex + sx * rnd.uniform(-10, 18), 168 + i * 5, 90 + sx * rnd.uniform(-20, 30), 36, 3.2, rnd.choice(("#8a4420", "#a65a2c", "#5e2e18"))))
# brow + eyes
A('<path d="M146 186Q168 168 190 184M254 186Q232 168 210 184" fill="none" stroke="#2a140c" stroke-width="9" stroke-linecap="round"/>')
for sx in (-1, 1):
    ex = 200 + sx * 36
    A(f'<ellipse cx="{ex}" cy="196" rx="11" ry="9" fill="#1a0e0a"/>')
    A(f'<ellipse cx="{ex}" cy="196" rx="7" ry="6" fill="#6a3a14"/>')
    A(f'<circle cx="{ex+sx*(-2)}" cy="194" r="2.6" fill="#fff4d0"/><circle cx="{ex+sx*3}" cy="199" r="1.2" fill="#ffd27a"/>')
# tusks (big sweeping curves, crossing tips)
def tusk(sx):
    def X(x): return 200 + sx * (x - 200)
    d = (f'M{X(168)} 262C{X(116)} 308 {X(54)} 330 {X(44)} 278C{X(38)} 244 {X(60)} 214 {X(100)} 204'
         f'C{X(70)} 230 {X(66)} 254 {X(78)} 272C{X(92)} 296 {X(140)} 282 {X(192)} 238Z')
    return d
for sx in (-1, 1):
    d = tusk(sx)
    A(f'<path d="{d}" fill="url(#ivory)" stroke="#6f7e8c" stroke-width="1.6" stroke-linejoin="round"/>')
    X = lambda x: 200 + sx * (x - 200)
    A(f'<path d="M{X(164)} 268C{X(118)} 308 {X(66)} 322 {X(54)} 284" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>')
    A(f'<path d="M{X(150)} 266C{X(116)} 276 {X(92)} 288 {X(98)} 284" fill="none" stroke="#9fb0c2" stroke-width="1.2" opacity=".6"/>')
# frost on fur
for _ in range(120):
    x, y = rnd.uniform(60, 340), rnd.uniform(50, 330)
    A(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rnd.uniform(.6,1.8):.2f}" fill="#eaf8ff" opacity="{rnd.uniform(.3,.85):.2f}"/>')
for _ in range(34):
    x, y = rnd.uniform(70, 330), rnd.uniform(50, 200)
    A(f'<path d="M{x:.1f} {y:.1f}l{rnd.uniform(-5,5):.1f} {rnd.uniform(4,12):.1f}" stroke="#f4feff" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>')
# icicles along the bottom + top corners
for i in range(18):
    x = 8 + i * 22.5 + rnd.uniform(-4, 4); ln = rnd.uniform(16, 42)
    A(f'<path d="M{x-4.5:.1f} 400L{x:.1f} {400-ln:.1f}L{x+4.5:.1f} 400Z" fill="url(#ice)" opacity=".8"/>')
for (cx, cy, rot) in [(0, 0, 0), (400, 0, 90)]:
    for k in range(6):
        ln = 30 + k * 10
        A(f'<g transform="translate({cx} {cy}) rotate({rot + k*14 + 4})"><path d="M0 0L5 {ln*.35:.1f}L0 {ln}L-5 {ln*.35:.1f}Z" fill="url(#ice)" opacity=".75"/></g>')
A('<rect width="400" height="400" fill="url(#vig)"/>')
A('<path d="M0 0H400L0 400Z" fill="url(#gloss)" opacity=".22"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/avatars/ss2701-mammoth.svg", "w").write("".join(o))
print("ok")
