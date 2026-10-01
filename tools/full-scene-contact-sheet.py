from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
import os
ROOT=Path(__file__).resolve().parents[1]
SRC=Path(os.environ.get('SH_TABLE_OUT',ROOT/'docs/table-review-v270'))
OUT=Path(os.environ.get('SH_REVIEW_OUT',SRC/'review'));OUT.mkdir(parents=True,exist_ok=True)
config=[('candyfloss','Candyfloss'),('desert','Desert'),('jungle','Jungle'),('devilish','Devilish'),('angelic','Angelic'),('neon','Neon City'),('aurora','Northern Lights'),('space','Deep Space'),('lunar','Lantern Festival'),('valentine','Candlelit Dinner'),('ramadan','Crescent Night'),('easter','Spring Meadow'),('summer','Beach Day'),('halloween','Haunted Graveyard'),('diwali','Rangoli'),('christmas','Fireside'),('newyear','Midnight Skyline'),('casino','Casino'),('winter','Winter'),('midnight','Midnight'),('royal','Royal'),('wood','Oak Wood'),('felt','Classic Felt')]
sizes=[(390,844),(360,640),(768,1024),(1366,768),(1920,1080),(3840,2160)]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',26);small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20);title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',35)
cols=[(20,225),(265,255),(540,355),(920,520),(1460,590),(2070,730)]
W,ROW,TOP=2820,580,145
im=Image.new('RGB',(W,TOP+23*ROW+25),'#070e1b');d=ImageDraw.Draw(im)
d.text((20,20),'FULL-SCENE TABLES · REPLACEMENT DRAFT · NOT PUBLISHED',font=title,fill='#f1d695')
d.text((20,75),'23 unchanged tables · all six requested sizes · real Vs Bots game in progress · v269 rejected',font=font,fill='#c7d1df')
for n,(key,name) in enumerate(config):
 y=TOP+n*ROW;d.line((20,y-10,W-20,y-10),fill='#334155');d.text((20,y),f'{n+1:02d}  {name}',font=font,fill='#f7e8bd')
 for (x,maxw),(w,h) in zip(cols,sizes):
  f=SRC/f'table-{key}-{w}x{h}-z1.jpg';shot=Image.open(f).convert('RGB');assert shot.size==(w,h);shot.thumbnail((maxw,490),Image.Resampling.LANCZOS)
  d.text((x,y+40),f'{w} × {h}',font=small,fill='#9aaac2');im.paste(shot,(x+(maxw-shot.width)//2,y+74))
im.save(OUT/'full-scene-table-contact-sheet.jpg',quality=95)
for page in range(8):
 a=page*3;b=min(23,a+3);qa=Image.new('RGB',(W,TOP+(b-a)*ROW),'#070e1b');qa.paste(im.crop((0,0,W,TOP)),(0,0));qa.paste(im.crop((0,TOP+a*ROW,W,TOP+b*ROW)),(0,TOP));qa.save(OUT/f'qa-{page+1:02d}.jpg',quality=96)
# Close look at the owner's two reference themes, plus the two cropping fixes.
for key in ('devilish','desert','angelic','diwali'):
 Image.open(SRC/f'table-{key}-390x844-z1.jpg').save(OUT/f'{key}-phone.jpg',quality=96)
print(OUT)
