import random, math
from PIL import Image, ImageDraw, ImageFilter, ImageChops
rnd = random.Random(3)
W,H = 500,700
fig = Image.open('figure.png')
bb = fig.getbbox(); fig = fig.crop(bb)
# card base: icy gradient
base = Image.new('RGB',(W,H))
d = ImageDraw.Draw(base)
for y in range(H):
    t=y/H; c=(int(23+(190-23)*t**1.2), int(56+(226-56)*t**1.0), int(107+(245-107)*t**.9)); d.line([(0,y),(W,y)],fill=c)
base = base.convert('RGBA')
dr = ImageDraw.Draw(base,'RGBA')
# faint snowflake lattice
def flake(cx,cy,r,col):
    for a in range(0,360,60):
        x=cx+r*math.cos(math.radians(a)); y=cy+r*math.sin(math.radians(a))
        dr.line([(cx,cy),(x,y)],fill=col,width=2)
        for k in (.55,):
            bx=cx+r*k*math.cos(math.radians(a)); by=cy+r*k*math.sin(math.radians(a))
            for s in (-40,40):
                ex=bx+r*.28*math.cos(math.radians(a+s)); ey=by+r*.28*math.sin(math.radians(a+s))
                dr.line([(bx,by),(ex,ey)],fill=col,width=2)
for gy in range(0,H+60,70):
    for gx in range(0,W+60,70):
        flake(gx+(35 if (gy//70)%2 else 0), gy, 14, (255,255,255,40))
# medallion
cx,cy,R = W//2, 330, 190
glow = Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(glow).ellipse((cx-R-30,cy-R-30,cx+R+30,cy+R+30),fill=(220,242,255,150))
base = Image.alpha_composite(base, glow.filter(ImageFilter.GaussianBlur(26)))
med = Image.new('RGBA',(2*R,2*R),(0,0,0,0))
md = ImageDraw.Draw(med)
for y in range(2*R):
    t=y/(2*R); md.line([(0,y),(2*R,y)],fill=(int(40+150*t),int(90+130*t),int(160+80*t),255))
md.polygon([(0,2*R*0.62),(60,2*R*.48),(110,2*R*.58),(170,2*R*.42),(230,2*R*.56),(300,2*R*.46),(380,2*R*.6),(2*R,2*R*.55),(2*R,2*R),(0,2*R)],fill=(200,230,248,255))
md.ellipse((-60,2*R*.74,2*R+60,2*R+80),fill=(255,255,255,255))
f = fig.copy(); sc = (2*R*0.92)/max(f.size); f = f.resize((int(f.width*sc),int(f.height*sc)),Image.LANCZOS)
med.alpha_composite(f,((2*R-f.width)//2, 2*R-f.height-6))
for _ in range(40):
    x,y,r=rnd.uniform(0,2*R),rnd.uniform(0,2*R*.8),rnd.uniform(1.2,3.6); md.ellipse((x-r,y-r,x+r,y+r),fill=(255,255,255,220))
mask = Image.new('L',(2*R,2*R),0); ImageDraw.Draw(mask).ellipse((0,0,2*R-1,2*R-1),fill=255)
med.putalpha(ImageChops.multiply(med.getchannel('A'),mask))
base.alpha_composite(med,(cx-R,cy-R))
dr = ImageDraw.Draw(base,'RGBA')
for w,col in ((12,(30,60,110,255)),(6,(190,230,250,255)),(2,(255,255,255,255))):
    dr.ellipse((cx-R-(12-w)//2*0,cy-R,cx+R,cy+R),outline=col,width=w) if False else None
dr.ellipse((cx-R-4,cy-R-4,cx+R+4,cy+R+4),outline=(30,60,110,255),width=8)
dr.ellipse((cx-R-12,cy-R-12,cx+R+12,cy+R+12),outline=(200,235,252,255),width=5)
# corner snow drifts + icicles along top
dr.ellipse((-120,610,260,760),fill=(255,255,255,255)); dr.ellipse((240,630,620,770),fill=(244,251,255,255))
for i in range(14):
    x=14+i*36+rnd.uniform(-5,5); ln=rnd.uniform(24,62)
    dr.polygon([(x-9,0),(x,ln),(x+9,0)],fill=(215,240,252,235),outline=(120,175,215,255))
# small flakes in corners
for (x,y) in [(52,92),(448,92),(52,608),(448,608)]: flake(x,y,22,(255,255,255,230))
for _ in range(60):
    x,y,r=rnd.uniform(0,W),rnd.uniform(0,H),rnd.uniform(1,3); dr.ellipse((x-r,y-r,x+r,y+r),fill=(255,255,255,int(rnd.uniform(90,220))))
# frame
dr.rounded_rectangle((6,6,W-7,H-7),radius=28,outline=(25,52,98,255),width=9)
dr.rounded_rectangle((18,18,W-19,H-19),radius=22,outline=(225,244,255,255),width=4)
mask = Image.new('L',(W,H),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,W-1,H-1),radius=32,fill=255)
base.putalpha(mask)
base.save('back-cold.png')
bg = Image.new('RGB',(W+40,H+40),(40,44,52)); bg.paste(base,(20,20),base); bg.save('back-prev.png')
