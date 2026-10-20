#!/usr/bin/env python3
"""Season Pass 2027-01 (Ice Age): avatar "Baby Mammoth" (400x400, drawn edge to
edge; the game adds its own rounded tile and rim). Writes art/avatars/ss2701-mammoth.svg.
Cute sitting woolly mammoth calf, chilly: frosted fur, snow cap, icicles, steaming breath."""
import math, random, sys
rnd = random.Random(8)
o = []; A = o.append
OUT = '#35241f'
A('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">')
A('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17386b"/><stop offset=".45" stop-color="#4d8fc7"/><stop offset=".78" stop-color="#bfe3f5"/><stop offset="1" stop-color="#eaf7ff"/></linearGradient>
<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".4" stop-color="#e8f6ff" stop-opacity=".55"/><stop offset="1" stop-color="#e8f6ff" stop-opacity="0"/></radialGradient>
<linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b08a6e"/><stop offset=".6" stop-color="#9a7762"/><stop offset="1" stop-color="#7c6270"/></linearGradient>
<linearGradient id="furD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a58"/><stop offset="1" stop-color="#5f5370"/></linearGradient>
<linearGradient id="bang" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e3f1fb"/><stop offset="1" stop-color="#bcd8ee"/></linearGradient>
<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6feff"/><stop offset=".5" stop-color="#a6dcf4"/><stop offset="1" stop-color="#4f9fd0"/></linearGradient>
<linearGradient id="snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9e4f5"/></linearGradient>
<radialGradient id="eye" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5a3a2c"/><stop offset=".6" stop-color="#2a1612"/><stop offset="1" stop-color="#150b09"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".65" stop-color="#06142e" stop-opacity="0"/><stop offset="1" stop-color="#06142e" stop-opacity=".5"/></radialGradient>
<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
</defs>''')
# ---------------- background: icy dusk, glaciers, snow
A('<rect width="400" height="400" fill="url(#sky)"/>')
A('<circle cx="200" cy="150" r="190" fill="url(#sun)"/>')
A('<path d="M0 290L40 230L70 262L110 196L150 262L196 214L236 258L282 200L322 252L360 222L400 250V400H0Z" fill="#9fcbe8" opacity=".55"/>')
A('<path d="M0 320L52 272L96 306L152 252L204 306L262 262L322 304L372 270L400 292V400H0Z" fill="#7db6dc" opacity=".6"/>')
for _ in range(70):
    x, y, r = rnd.uniform(0, 400), rnd.uniform(0, 330), rnd.uniform(.8, 2.6)
    A(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="#fff" opacity="{rnd.uniform(.35,.9):.2f}"/>')
# snow mound + ground shadow
A('<path d="M-10 372C60 338 140 346 200 352C270 346 340 336 410 366V410H-10Z" fill="url(#snow)"/>')
A('<ellipse cx="205" cy="362" rx="150" ry="14" fill="#7aa4c6" opacity=".45"/>')

A('<g transform="translate(-8 10) scale(.52)" stroke-linejoin="round" stroke-linecap="round">')
def P(d, fill, sw=9, extra=''):
    A(f'<path d="{d}" fill="{fill}" stroke="{OUT}" stroke-width="{sw}" {extra}/>')
# tail
P('M610 610C650 600 690 612 680 650C670 678 640 670 612 664Z', 'url(#furD)')
# body
P('M255 470C225 560 240 650 300 705L565 708C632 702 660 640 645 560C636 505 600 465 560 440L335 432Z', 'url(#fur)')
# fur tufts on the back / side
for (x, y, s) in [(600, 470, 1), (630, 520, 1.1), (640, 585, 1), (352, 600, .9), (470, 590, .9), (410, 520, .8)]:
    A(f'<path d="M{x} {y}l{22*s} {10*s}l{-8*s} {16*s}l{18*s} {14*s}" fill="none" stroke="#6a5163" stroke-width="7" opacity=".75"/>')
# rear foot (right) and front-left foot
P('M470 640C470 590 530 580 580 600C640 620 650 700 590 718C530 728 470 710 470 640Z', 'url(#fur)')
A(f'<ellipse cx="548" cy="676" rx="42" ry="40" fill="#6d5558" stroke="{OUT}" stroke-width="8"/>')
for x in (500, 535, 570): A(f'<path d="M{x-14} 612Q{x} 590 {x+14} 612Z" fill="#e8f4fb" stroke="{OUT}" stroke-width="6"/>')
P('M150 630C150 585 215 570 262 600C285 625 282 690 232 712C180 722 150 690 150 630Z', 'url(#fur)')
A(f'<ellipse cx="202" cy="664" rx="40" ry="38" fill="#6d5558" stroke="{OUT}" stroke-width="8"/>')
for x in (175, 208, 240): A(f'<path d="M{x-12} 602Q{x} 584 {x+12} 602Z" fill="#e8f4fb" stroke="{OUT}" stroke-width="6"/>')
# front legs with toes
P('M268 600C262 650 275 700 320 716L402 716C412 690 405 640 390 585Z', 'url(#fur)')
P('M388 590C392 640 400 690 420 716L500 716C506 690 496 640 470 590Z', 'url(#fur)')
for x in (292, 328, 432, 472): A(f'<path d="M{x-14} 716Q{x} 690 {x+14} 716Z" fill="#e8f4fb" stroke="{OUT}" stroke-width="6"/>')
A('<path d="M335 650Q350 668 362 650M455 640Q470 658 484 640" fill="none" stroke="#6a5163" stroke-width="6"/>')
# ears
P('M205 258C150 250 110 305 120 370C128 420 175 440 215 410Z', 'url(#fur)')
A('<path d="M200 292C168 292 150 330 156 366C160 392 182 402 205 386Z" fill="#7d6272" opacity=".9"/>')
P('M570 262C640 236 700 290 692 360C686 420 640 445 586 410Z', 'url(#fur)')
A('<path d="M582 296C634 282 664 320 658 358C654 388 626 402 592 380Z" fill="#7d6272" opacity=".9"/>')
# head
P('M188 340C180 250 262 232 392 238C520 232 596 258 588 352C592 432 520 492 398 492C268 492 192 430 188 340Z', 'url(#fur)', 10)
# chilly cheeks (blue-ish tint) and fur flicks at the sides
A('<ellipse cx="238" cy="430" rx="34" ry="22" fill="#6aa0d8" opacity=".25"/><ellipse cx="548" cy="428" rx="34" ry="22" fill="#6aa0d8" opacity=".25"/>')
A(f'<path d="M190 420l30 12l-14 18l26 12M586 420l-30 12l14 18l-26 12" fill="none" stroke="{OUT}" stroke-width="7"/>')
# bangs (scalloped) with frost
A(f'<path d="M200 250C206 170 300 140 400 160C500 140 586 176 590 250C572 262 538 246 516 270C490 258 462 244 438 268C414 252 388 250 366 268C340 246 312 258 286 270C262 250 222 262 185 232Z" fill="url(#bang)" stroke="{OUT}" stroke-width="10"/>')
A(f'<path d="M340 160C356 120 384 116 400 160C416 112 448 118 462 156" fill="url(#bang)" stroke="{OUT}" stroke-width="9"/>')
for (x, y, w, h) in [(250, 200, 60, 18), (340, 176, 70, 16), (450, 184, 60, 18), (528, 214, 40, 14)]:
    A(f'<path d="M{x} {y}q{w*.5} {-h} {w} 0" fill="none" stroke="#fff" stroke-width="9" opacity=".9"/>')
# locks line under bangs
A(f'<path d="M296 262C294 238 310 226 326 238M398 262C396 238 412 226 428 238M498 262C496 238 512 226 528 238" fill="none" stroke="{OUT}" stroke-width="6" opacity=".55"/>')
# snow cap sprinkles on the bangs
for _ in range(34):
    x, y = rnd.uniform(220, 570), rnd.uniform(130, 240)
    A(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(2.4,5.4):.1f}" fill="#fff"/>')
# eyes
for ex, ey, rx in ((272, 372, 36), (474, 366, 38)):
    A(f'<ellipse cx="{ex}" cy="{ey}" rx="{rx+10}" ry="{rx+16}" fill="#f4fbff" stroke="{OUT}" stroke-width="8"/>')
    A(f'<ellipse cx="{ex+2}" cy="{ey+4}" rx="{rx}" ry="{rx+8}" fill="url(#eye)"/>')
    A(f'<circle cx="{ex-10}" cy="{ey-14}" r="11" fill="#fff"/><circle cx="{ex+14}" cy="{ey+18}" r="5.5" fill="#fff" opacity=".9"/>')
A(f'<path d="M250 308Q272 296 296 308M452 304Q474 292 498 304" fill="none" stroke="{OUT}" stroke-width="6"/>')
# frosty lashes of ice on brows
for x in (254, 270, 286, 456, 472, 488):
    A(f'<path d="M{x} 300l3 -13l3 13Z" fill="#e8f7ff" stroke="#8cc6e8" stroke-width="1.5"/>')
# trunk (curling up on the left)
P('M338 402C410 384 468 420 448 470C426 514 300 548 214 548C150 548 102 508 100 444C98 408 112 392 142 394C168 400 152 432 166 456C188 488 268 484 330 448C366 428 400 424 420 438Z', 'url(#fur)', 10)
A('<path d="M336 408C388 396 430 420 438 446" fill="none" stroke="#5f4a55" stroke-width="5" opacity=".6"/>')
for i in range(6):
    A(f'<path d="M{190+i*30} {520-i*5}Q{196+i*30} {500-i*5} {206+i*30} {486-i*3}" fill="none" stroke="#6a5163" stroke-width="5" opacity=".55"/>')
A(f'<ellipse cx="124" cy="406" rx="20" ry="10" fill="#7d6272" stroke="{OUT}" stroke-width="6" transform="rotate(-24 124 406)"/>')
# tusk with an icicle
P('M426 470C446 450 470 450 468 474C464 498 440 506 424 500Z', '#fbf4e0', 8)
A('<path d="M441 464l-3 30l9 -4z" fill="#d9c8a0" opacity=".6"/>')
A(f'<path d="M436 506l8 44l8 -46Z" fill="url(#ice)" stroke="#6aaed8" stroke-width="3"/>')
# nose frost + breath cloud from the trunk tip
for (x, y, r) in [(80, 380, 22), (52, 352, 26), (84, 330, 20), (46, 316, 14)]:
    A(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity=".78" stroke="#bcdcf0" stroke-width="3"/>')
A('<path d="M104 380Q92 384 80 380" fill="none" stroke="#bcdcf0" stroke-width="3"/>')
# snow on head ears and back, frost crust
A('<path d="M214 262C170 252 130 292 126 330C150 304 186 292 214 292Z" fill="#fff" opacity=".85"/>')
A('<path d="M572 266C632 244 690 290 690 330C660 300 620 288 572 296Z" fill="#fff" opacity=".85"/>')
A('<path d="M520 456C560 452 600 470 618 500C590 484 554 480 520 484Z" fill="#fff" opacity=".7"/>')
A('<path d="M352 440C400 432 470 436 500 450C470 452 400 456 352 462Z" fill="#fff" opacity=".6"/>')
A('</g>')
# falling snow in front + frost corners + icicles
for _ in range(46):
    x, y, r = rnd.uniform(0, 400), rnd.uniform(0, 380), rnd.uniform(1, 3.2)
    A(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="#fff" opacity="{rnd.uniform(.5,.95):.2f}"/>')
for (x, y, s) in [(34, 60, 1), (350, 46, .9), (366, 150, .7), (24, 190, .7)]:
    A(f'<g transform="translate({x} {y}) scale({s})" stroke="#f4feff" stroke-width="2" stroke-linecap="round" fill="none">' + ''.join(f'<path d="M0 0L{14*math.cos(math.radians(a)):.1f} {14*math.sin(math.radians(a)):.1f}M{8*math.cos(math.radians(a)):.1f} {8*math.sin(math.radians(a)):.1f}l{4*math.cos(math.radians(a+55)):.1f} {4*math.sin(math.radians(a+55)):.1f}M{8*math.cos(math.radians(a)):.1f} {8*math.sin(math.radians(a)):.1f}l{4*math.cos(math.radians(a-55)):.1f} {4*math.sin(math.radians(a-55)):.1f}' for a in range(0, 360, 60)) + '</g>')
for i in range(15):
    x = 4 + i * 27 + rnd.uniform(-4, 4); ln = rnd.uniform(10, 26)
    A(f'<path d="M{x-4:.1f} 0L{x:.1f} {ln:.1f}L{x+4:.1f} 0Z" fill="url(#ice)" opacity=".85"/>')
A('<rect width="400" height="400" fill="url(#vig)"/>')
A('</svg>')
open(sys.argv[1] if len(sys.argv) > 1 else "../../art/avatars/ss2701-mammoth.svg", "w").write("".join(o))
print("ok")
