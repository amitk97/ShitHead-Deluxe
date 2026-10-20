import numpy as np, random, colorsys
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
src = Image.open('/root/.claude/uploads/e6cf8966-43a2-5750-87a3-1dc2b22b7d54/3dfe7dde-image.jpg').convert('RGB')
a = np.asarray(src).astype(float)/255
# background = near-white connected to the border
white = (a.min(axis=2) > .93)
lab, n = ndi.label(white)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
bg = np.isin(lab, list(border))
fg = ~bg
# drop the heart and the floor shadow: keep the largest piece of the figure
lab2, n2 = ndi.label(ndi.binary_opening(fg, iterations=2))
sizes = ndi.sum(fg, lab2, range(1, n2+1)); keep = lab2 == (1+int(np.argmax(sizes)))
keep = ndi.binary_dilation(keep, iterations=3) & fg
keep = ndi.binary_fill_holes(keep)
# remove the tan floor shadow (below the feet, low saturation tan, wide ellipse)
hsv = np.zeros_like(a)
mx, mn = a.max(2), a.min(2); d = mx-mn
v = mx; s = np.where(mx>0, d/np.maximum(mx,1e-6), 0)
r,g,b = a[...,0],a[...,1],a[...,2]
h = np.zeros_like(v)
m = d>1e-6
h = np.where(m & (mx==r), ((g-b)/np.maximum(d,1e-6))%6, h)
h = np.where(m & (mx==g), (b-r)/np.maximum(d,1e-6)+2, h)
h = np.where(m & (mx==b), (r-g)/np.maximum(d,1e-6)+4, h)
h = h/6
# cold recolour: orange/cream -> icy blue-grey, keep dark outlines and dark pads
newh = np.full_like(h, 0.585)            # ~210 deg
news = np.clip(s*0.34, 0, 0.40)
newv = np.clip(v*0.98 + 0.03*(1-v), 0, 1)
dark = np.clip((0.34 - v)/0.18, 0, 1)    # 1 where outline-dark
news = news*(1-dark) + s*0.55*dark*0.7
newh = newh*(1-dark) + 0.62*dark
def hsv2rgb(h,s,v):
    i = np.floor(h*6).astype(int)%6; f = h*6-np.floor(h*6)
    p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    out = np.zeros(h.shape+(3,))
    for k,(R,G,B) in enumerate([(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]):
        mk = i==k; out[...,0][mk]=R[mk]; out[...,1][mk]=G[mk]; out[...,2][mk]=B[mk]
    return out
rgb = hsv2rgb(newh, news, newv)
# keep outlines warm-dark but cool-tinted slightly; cream bangs/tusk -> frosted white
cream = (s<0.28) & (v>0.85)
rgb[cream] = rgb[cream]*0.55 + np.array([0.93,0.97,1.0])*0.45
# darker, bluer fur body for contrast
fur = (~cream) & (v>0.34)
rgb[fur] = rgb[fur]*np.array([0.90,0.98,1.06])
rgb = np.clip(rgb,0,1)
# shadow: pixels in keep? drop shadow tan = low-sat, mid-v at bottom
yy = np.arange(a.shape[0])[:,None]*np.ones((1,a.shape[1]))
shadow = (yy>670) & (s<0.35) & (v>0.7) & (v<0.9)
keep &= ~shadow
alpha = ndi.gaussian_filter(keep.astype(float), 0.8)
alpha = np.clip((alpha-0.35)/0.4,0,1)
fig = np.dstack([rgb, alpha])
fig = Image.fromarray((fig*255).astype('uint8'), 'RGBA')
fig.save('figure.png')
# ---------- icy scene
W=800; rnd = random.Random(5)
bgimg = Image.new('RGB',(W,W))
px = np.zeros((W,W,3))
t = np.linspace(0,1,W)[:,None]
stops = [(0,(0x17,0x38,0x6b)),(.45,(0x4d,0x8f,0xc7)),(.78,(0xbf,0xe3,0xf5)),(1,(0xea,0xf7,0xff))]
for i in range(len(stops)-1):
    (t0,c0),(t1,c1)=stops[i],stops[i+1]
    m=((t>=t0)&(t<=t1)); f=(t-t0)/(t1-t0)
    for k in range(3): px[...,k]=np.where(np.broadcast_to(m,(W,W)), np.broadcast_to(c0[k]+(c1[k]-c0[k])*f,(W,W)), px[...,k])
bgimg = Image.fromarray(px.astype('uint8'))
glow = Image.new('L',(W,W),0); ImageDraw.Draw(glow).ellipse((100,60,700,660),fill=255)
glow = glow.filter(ImageFilter.GaussianBlur(120))
bgimg = Image.composite(Image.new('RGB',(W,W),(235,248,255)), bgimg, glow.point(lambda p:int(p*.6)))
dr = ImageDraw.Draw(bgimg,'RGBA')
dr.polygon([(0,580),(80,460),(140,524),(220,392),(300,524),(392,428),(472,516),(564,400),(644,504),(720,444),(800,500),(800,800),(0,800)],fill=(159,203,232,150))
dr.polygon([(0,640),(104,544),(192,612),(304,504),(408,612),(524,524),(644,608),(744,540),(800,584),(800,800),(0,800)],fill=(125,182,220,170))
# snow ground
dr.ellipse((-120,690,920,900),fill=(240,249,255,255))
dr.ellipse((-60,700,860,870),fill=(255,255,255,255))
# mammoth
S = 0.86
f2 = fig.resize((int(800*S),int(800*S)), Image.LANCZOS)
sh = Image.new('RGBA',(W,W),(0,0,0,0)); ImageDraw.Draw(sh).ellipse((170,690,640,745),fill=(90,130,175,120))
sh = sh.filter(ImageFilter.GaussianBlur(8))
bgimg = Image.alpha_composite(bgimg.convert('RGBA'), sh)
bgimg.alpha_composite(f2, (int((W-f2.width)/2), int(W-f2.height-8)))
dr = ImageDraw.Draw(bgimg,'RGBA')
for _ in range(120):
    x,y,r = rnd.uniform(0,W),rnd.uniform(0,760),rnd.uniform(1.5,5)
    dr.ellipse((x-r,y-r,x+r,y+r),fill=(255,255,255,int(rnd.uniform(110,235))))
bgimg.convert('RGB').save('cold-mammoth.png')
print('ok')
