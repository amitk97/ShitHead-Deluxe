"""Shared shapes for Season Pass 2027-01 (Ice Age): a woolly mammoth in side view
(facing left, local box 100 x 70) and a cave-painting hand print."""
MAMMOTH = ("M22 30C22 14 34 5 44 8C48 9 52 12 56 11C66 4 82 10 90 26C94 34 94 44 90 52L90 66L82 66L80 56"
           "L76 56L74 61L70 57L66 62L62 58L58 62L54 57L52 66L44 66L42 55C38 53 34 50 32 46"
           "C28 48 22 52 20 58C19 62 14 64 12 60C14 58 15 56 16 54C18 46 20 40 22 30Z")
TUSK = "M27 39C15 44 4 46 4 33"

def mammoth(x, y, s=1.0, flip=False, fill="#222", tusk="#eee", eye=None):
    sx = -s if flip else s
    t = f'translate({x + (100 * s if flip else 0):.1f} {y:.1f}) scale({sx:.3f} {s:.3f})'
    out = f'<g transform="{t}"><path d="M58 52L59 66L67 66L67 52ZM70 52L71 66L78 66L77 52Z" fill="{fill}" opacity=".55"/><path d="M90 38C96 42 97 52 93 60" fill="none" stroke="{fill}" stroke-width="2.2" stroke-linecap="round"/><path d="{MAMMOTH}" fill="{fill}"/>'
    out += f'<path d="{TUSK}" fill="none" stroke="{tusk}" stroke-width="2.4" stroke-linecap="round"/>'
    if eye: out += f'<circle cx="29" cy="30" r="1.1" fill="{eye}"/>'
    return out + '</g>'

HAND = ("M0 22C-9 20 -12 8 -11 -4L-9 -4C-9 2 -8 6 -6 8L-8 -22C-8 -25 -4 -25 -4 -22L-3 -6L-2 -28C-2 -31 2 -31 2 -28L2 -6L4 -26C4 -29 8 -29 8 -26L7 -4L11 -20C12 -23 16 -22 15 -19L10 6C12 4 14 0 17 -2C19 -3 20 0 18 2C14 10 12 16 8 20C6 22 3 22 0 22Z")
def hand(x, y, s=1.0, rot=0, fill="#c0561f", op=.9):
    return f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot}) scale({s:.3f})" opacity="{op}"><path d="{HAND}" fill="{fill}"/></g>'
