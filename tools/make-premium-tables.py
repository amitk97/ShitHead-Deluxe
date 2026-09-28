# Builds the premium vector tables art/tables/neon.svg (Neon City),
# aurora.svg (Northern Lights) and space.svg (Deep Space). Pure SVG, so they
# stay sharp at any size (4K included). Key features sit in the middle
# third because a tall phone crops the sides (the art is drawn "cover").
#   python3 tools/make-premium-tables.py
import os, random, math
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'tables') + os.sep
R=random.Random(11)
def f(x): return f"{x:.1f}".rstrip('0').rstrip('.')
HEAD='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">'

def stars(n, y0, y1, cols, rmax=1.6):
    s=[]
    for _ in range(n):
        x=R.uniform(0,800); y=R.uniform(y0,y1); r=R.uniform(.35,rmax)
        s.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{R.choice(cols)}" opacity="{f(R.uniform(.35,1))}"/>')
    return ''.join(s)

# ---------- Neon City ----------
def neon():
    d=['<defs>',
       '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07021a"/><stop offset=".45" stop-color="#1e0a3c"/><stop offset=".62" stop-color="#3b0a45"/><stop offset=".63" stop-color="#0a0418"/><stop offset="1" stop-color="#05010f"/></linearGradient>',
       '<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset=".45" stop-color="#fb7185"/><stop offset="1" stop-color="#c026d3"/></linearGradient>',
       '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f472b6" stop-opacity=".55"/><stop offset="1" stop-color="#f472b6" stop-opacity="0"/></radialGradient>',
       '<linearGradient id="grid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e879f9" stop-opacity=".95"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".5"/></linearGradient>',
       '<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity="0"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".25"/></linearGradient>',
       '<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>',
       '<clipPath id="sunclip"><rect x="0" y="0" width="800" height="505"/></clipPath>',
       '</defs>']
    d.append('<rect width="800" height="800" fill="url(#sky)"/>')
    d.append(stars(90, 0, 330, ['#fff','#f5d0fe','#a5f3fc'], 1.3))
    d.append('<circle cx="400" cy="390" r="230" fill="url(#glow)"/>')
    # synthwave sun with cuts
    cuts=''.join(f'<rect x="230" y="{f(400+i*17)}" width="340" height="{f(3+i*1.6)}" fill="#1e0a3c"/>' for i in range(6))
    d.append(f'<g clip-path="url(#sunclip)"><circle cx="400" cy="400" r="150" fill="url(#sun)"/>{cuts}</g>')
    # skyline
    bld=[]; x=0
    windows=[]
    while x<800:
        w=R.uniform(34,78); h=R.uniform(60,190) if abs(x+w/2-400)>150 else R.uniform(40,110)
        top=505-h
        bld.append(f'<rect x="{f(x)}" y="{f(top)}" width="{f(w+1)}" height="{f(h)}" fill="#0b0520"/>')
        bld.append(f'<rect x="{f(x)}" y="{f(top)}" width="{f(w+1)}" height="2" fill="{R.choice(["#22d3ee","#f472b6","#a78bfa"])}" opacity=".85"/>')
        for wy in range(int(top+10), 495, 14):
            for wx in range(int(x+6), int(x+w-6), 11):
                if R.random()<.28:
                    windows.append(f'<rect x="{wx}" y="{wy}" width="5" height="6" fill="{R.choice(["#22d3ee","#f0abfc","#fde68a","#67e8f9"])}" opacity="{f(R.uniform(.45,.95))}"/>')
        x+=w
    d.append(''.join(bld)); d.append(''.join(windows))
    # grid floor
    g=['<g stroke="url(#grid)" stroke-width="2" fill="none">']
    for i in range(-14,15):
        g.append(f'<line x1="{f(400+i*14)}" y1="505" x2="{f(400+i*120)}" y2="800"/>')
    y=505; step=6
    while y<800:
        g.append(f'<line x1="0" y1="{f(y)}" x2="800" y2="{f(y)}"/>')
        y+=step; step*=1.28
    g.append('</g>')
    d.append(f'<g filter="url(#blur)" opacity=".7">{"".join(g)}</g>'); d.append(''.join(g))
    d.append('<rect x="0" y="480" width="800" height="40" fill="url(#haze)"/>')
    d.append('<line x1="0" y1="505" x2="800" y2="505" stroke="#f0abfc" stroke-width="3"/>')
    return HEAD+''.join(d)+'</svg>'

# ---------- Northern Lights ----------
def aurora():
    d=['<defs>',
       '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset=".55" stop-color="#0b1b3a"/><stop offset="1" stop-color="#132a4a"/></linearGradient>',
       '<linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity="0"/><stop offset=".45" stop-color="#34d399" stop-opacity=".75"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient>',
       '<linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0abfc" stop-opacity="0"/><stop offset=".5" stop-color="#2dd4bf" stop-opacity=".6"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>',
       '<linearGradient id="nightsnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34557d"/><stop offset="1" stop-color="#0f1f38"/></linearGradient><linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient>',
       '<linearGradient id="rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#0b1629"/></linearGradient>',
       '<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>',
       '<filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>',
       '</defs>','<rect width="800" height="800" fill="url(#sky)"/>']
    d.append(stars(220, 0, 560, ['#fff','#e0f2fe','#fef9c3'], 1.5))
    def ribbon(y, amp, h, grad, ph):
        pts=[]; 
        for i in range(0,17):
            x=i*50; yy=y+math.sin(i*.7+ph)*amp
            pts.append((x,yy))
        top='M'+' L'.join(f'{f(x)} {f(yy)}' for x,yy in pts)
        bot=' L'.join(f'{f(x)} {f(yy+h+math.sin(i*1.3+ph)*18)}' for i,(x,yy) in reversed(list(enumerate(pts))))
        return f'<path d="{top} L{bot} Z" fill="url(#{grad})"/>'
    d.append('<g filter="url(#soft)">'+ribbon(120,60,190,'a1',0)+ribbon(210,45,160,'a2',1.8)+ribbon(60,35,140,'a2',3.1)+'</g>')
    # curtain rays
    rays=''.join(f'<rect x="{f(x)}" y="{f(R.uniform(80,160))}" width="{f(R.uniform(3,8))}" height="{f(R.uniform(140,260))}" fill="#6ee7b7" opacity="{f(R.uniform(.06,.16))}"/>' for x in [R.uniform(0,800) for _ in range(60)])
    d.append(f'<g filter="url(#soft2)">{rays}</g>')
    # mountains
    d.append('<path d="M0 620 L90 540 L150 580 L250 470 L330 560 L400 510 L470 575 L560 455 L650 560 L720 520 L800 580 L800 800 L0 800Z" fill="url(#rock)"/>')
    d.append('<path d="M250 470 L275 500 L262 498 L250 510 L238 497 L226 500Z M560 455 L588 490 L573 487 L560 500 L546 486 L532 490Z M400 510 L418 530 L400 528 L384 532Z M90 540 L108 560 L90 558 L74 562Z" fill="url(#snow)"/>')
    d.append('<path d="M0 690 Q200 640 400 680 T800 670 L800 800 L0 800Z" fill="#1e3a5f" opacity=".95"/><path d="M0 690 Q200 640 400 680 T800 670 L800 684 Q600 690 400 694 T0 704Z" fill="#7dd3fc" opacity=".35"/>')
    d.append('<path d="M0 720 Q220 690 420 715 T800 705 L800 800 L0 800Z" fill="url(#nightsnow)"/>')
    trees=[]
    for x in list(range(10,260,28))+list(range(560,800,28)):
        h=R.uniform(55,95); y=R.uniform(700,735)
        trees.append(f'<path d="M{x} {f(y-h)} L{f(x+h*.22)} {f(y)} L{f(x-h*.22)} {f(y)}Z" fill="#06231c"/><path d="M{x} {f(y-h)} L{f(x+h*.12)} {f(y-h*.55)} L{f(x-h*.12)} {f(y-h*.55)}Z" fill="#f0f9ff" opacity=".8"/>')
    d.append(''.join(trees))
    return HEAD+''.join(d)+'</svg>'

# ---------- Deep Space ----------
def space():
    d=['<defs>',
       '<radialGradient id="bg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#01020a"/></radialGradient>',
       '<radialGradient id="n1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c026d3" stop-opacity=".55"/><stop offset="1" stop-color="#c026d3" stop-opacity="0"/></radialGradient>',
       '<radialGradient id="n2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2563eb" stop-opacity=".55"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></radialGradient>',
       '<radialGradient id="n3" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#14b8a6" stop-opacity=".4"/><stop offset="1" stop-color="#14b8a6" stop-opacity="0"/></radialGradient>',
       '<radialGradient id="planet" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fde68a"/><stop offset=".45" stop-color="#f59e0b"/><stop offset="1" stop-color="#7c2d12"/></radialGradient>',
       '<radialGradient id="core" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fef3c7" stop-opacity=".8"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient>',
       '<filter id="cloud" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>',
       '</defs>','<rect width="800" height="800" fill="url(#bg)"/>']
    d.append('<g filter="url(#cloud)"><ellipse cx="200" cy="230" rx="260" ry="150" fill="url(#n1)" transform="rotate(-20 200 230)"/><ellipse cx="610" cy="560" rx="280" ry="170" fill="url(#n2)" transform="rotate(25 610 560)"/><ellipse cx="420" cy="380" rx="220" ry="110" fill="url(#n3)" transform="rotate(-35 420 380)"/><ellipse cx="120" cy="640" rx="180" ry="90" fill="url(#n1)"/></g>')
    d.append(stars(420, 0, 800, ['#fff','#e0e7ff','#fde68a','#bae6fd'], 1.4))
    bright=''.join(f'<g transform="translate({f(x)} {f(y)})"><circle r="2.2" fill="#fff"/><path d="M-9 0H9M0 -9V9" stroke="#fff" stroke-width=".8" opacity=".7"/></g>' for x,y in [(R.uniform(40,760),R.uniform(40,760)) for _ in range(9)])
    d.append(bright)
    # spiral galaxy (upper right)
    arms=[]
    for arm in range(2):
        for i in range(90):
            t=i/90; a=arm*math.pi+t*3.4*math.pi; r=6+t*70
            x=500+math.cos(a)*r; y=150+math.sin(a)*r*.45
            arms.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(1.6-t)}" fill="#e0e7ff" opacity="{f(.9-.6*t)}"/>')
    d.append('<g transform="rotate(-18 500 150)">'+''.join(arms)+'<ellipse cx="500" cy="150" rx="26" ry="13" fill="url(#core)"/></g>')
    # ringed planet (lower left)
    d.append('<g transform="translate(140 20) rotate(-16 170 600)"><ellipse cx="170" cy="600" rx="150" ry="32" fill="none" stroke="#fde68a" stroke-width="7" opacity=".55"/>'
             '<circle cx="170" cy="600" r="82" fill="url(#planet)"/>'
             '<path d="M92 580 Q170 560 250 585" stroke="#7c2d12" stroke-width="6" fill="none" opacity=".35"/><path d="M96 625 Q170 610 246 630" stroke="#fef3c7" stroke-width="5" fill="none" opacity=".25"/>'
             '<path d="M20 600 A150 32 0 0 0 320 600" fill="none" stroke="#fef3c7" stroke-width="7" opacity=".85"/></g>')
    d.append('<circle cx="560" cy="720" r="18" fill="#94a3b8"/><circle cx="554" cy="714" r="18" fill="#cbd5e1" opacity=".35"/>')
    return HEAD+''.join(d)+'</svg>'

for name,fn in [('neon',neon),('aurora',aurora),('space',space)]:
    s=fn(); open(OUT+name+'.svg','w').write(s); print(name, len(s)//1024,'KB')
